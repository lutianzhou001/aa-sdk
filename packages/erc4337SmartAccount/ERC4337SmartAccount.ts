import type { Address } from "abitype";
import {
  type Chain,
  Client,
  createPublicClient,
  encodeAbiParameters,
  encodeFunctionData,
  encodePacked,
  type Hash,
  type Hex,
  hexToBigInt,
  hexToBytes,
  http,
  keccak256,
  publicActions,
  SignTypedDataParameters,
  toHex,
  type Transport,
  WalletClient,
  zeroAddress, zeroHash,
} from "viem";
import {
  Account,
  AccountV2,
  AccountV3,
  ExecuteCallDataArgs,
  ISmartContractAccount,
  SmartAccountTransactionReceipt,
} from "./types.js";
import {
  ERC4337SmartAccountSigner,
  UserOperationDraft,
} from "../plugins/types";
import {
  configuration,
  defaultUserOperationParams,
  networkConfigurations,
} from "../../configuration";
import { smartAccountV3ABI } from "../../abis/smartAccountV3.abi";
import { UserOperation } from "permissionless/types/userOperation";
import { getChainId } from "viem/actions";
import { smartAccountV2ABI } from "../../abis/smartAccountV2.abi";
import axios from "axios";
import { Simulator } from "./simulator/simulator";
import { AccountManager } from "./acountMananger/accountManager";
import { PaymasterManager } from "./paymasterManager/paymaster";
import {
  GeneratePaymasterSignatureType,
  GenerateUserOperationAndPackedParams,
} from "./dto/generateUserOperationAndPackedParams.dto";
import { CreateERC4337SmartAccountParams } from "./dto/createERC4337SmartAccount.dto";
import { WalletClientSigner } from "../plugins/signers/walletClientSigner";
import {
  BaseSmartAccountError,
  GasEstimationError,
  SendUopError,
} from "../error/constants";
import { mainnet } from "viem/chains";

export class ERC4337SmartContractAccount<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
  TOwner extends ERC4337SmartAccountSigner = ERC4337SmartAccountSigner,
> implements ISmartContractAccount
{
  public accountManager: AccountManager;
  public simulator: Simulator;
  public paymasterManager: PaymasterManager;
  protected name: string;
  protected version: string;
  protected owner: TOwner;
  protected factoryAddress: Address;
  protected accounts: Account[];
  protected entryPointAddress: Address;
  protected baseUrl: string;

  constructor(
    args: CreateERC4337SmartAccountParams<TTransport, TChain, TOwner>,
  ) {
    if (!args.version) {
      throw new BaseSmartAccountError(
        "BaseSmartAccountError",
        "version is required",
      );
    }
    this.owner = new WalletClientSigner(
      args.walletClient as WalletClient,
      "admin",
    ) as TOwner;
    this.entryPointAddress =
      args.entryPointAddress ?? configuration.entryPoint.v0_6_0;
    this.factoryAddress =
      args.factoryAddress ??
      (args.version == "2.0.0"
        ? configuration.v2.FACTORY_ADDRESS
        : configuration.v3.FACTORY_ADDRESS);
    this.accounts = args.accounts ?? [];
    this.name =
      args.name ??
      (args.version == "2.0.0" ? configuration.v2.NAME : configuration.v3.NAME);
    this.version =
      args.name ??
      (args.version == "2.0.0"
        ? configuration.v2.VERSION
        : configuration.v3.VERSION);
    this.baseUrl = args.baseUrl ?? networkConfigurations.base_url;
    this.simulator = new Simulator({
      entryPointAddress: this.entryPointAddress,
      owner: this.owner,
      baseUrl: this.baseUrl,
    });
    this.accountManager = new AccountManager({
      owner: this.owner,
      entryPointAddress: this.entryPointAddress,
      version: this.version,
      factoryAddress: this.factoryAddress,
      baseUrl: this.baseUrl,
    });
    this.paymasterManager = new PaymasterManager({
      walletClient: this.owner.getWalletClient(),
      entryPointAddress: this.entryPointAddress,
      baseUrl: this.baseUrl,
    });
  }

  async encodeExecute(args: ExecuteCallDataArgs): Promise<Hex> {
    if (Array.isArray(args)) {
      return encodeFunctionData({
        abi: smartAccountV3ABI,
        functionName: "executeBatch",
        args: [
          args.map((txn) => {
            if (txn.callType === "delegatecall") {
              throw new BaseSmartAccountError(
                "BaseSmartAccountError",
                "Cannot batch delegatecall",
              );
            }
            return {
              to: txn.to,
              value: txn.value,
              data: txn.data,
            };
          }),
        ],
      });
    } else {
      if (args.callType === "call") {
        return this.version == "2.0.0"
          ? encodeFunctionData({
              abi: smartAccountV2ABI,
              functionName: "execTransactionFromEntrypoint",
              args: [args.to, args.value, args.data],
            })
          : encodeFunctionData({
              abi: smartAccountV3ABI,
              functionName: "execute",
              args: [args.to, args.value, args.data],
            });
      } else {
        throw new BaseSmartAccountError(
          "BaseSmartAccountError",
          "delegatecall not impl",
        );
      }
    }
  }

  async signUserOperationHash(uopHash: Hash): Promise<Hash> {
    return this.signMessage(uopHash);
  }

  signMessage(msg: Uint8Array | string): Promise<Hex> {
    if (typeof msg === "string" && msg.startsWith("0x")) {
      msg = hexToBytes(msg as Hex);
    } else if (typeof msg === "string") {
      msg = new TextEncoder().encode(msg);
    }

    return this.owner.signMessage(msg);
  }

  async signTypedData(args: SignTypedDataParameters): Promise<Hex> {
    throw new BaseSmartAccountError(
      "BaseSmartAccountError",
      "signTypedData not supported",
    );
  }

  async generateUserOperationAndPacked(
    args: GenerateUserOperationAndPackedParams,
  ): Promise<UserOperation> {
    const account = this.accountManager.getAccount(args.uop.sender);
    // to avoid send with init code, we should update the isDeployed status;
    await this.accountManager.updateDeployment(this.owner.getWalletClient(), account.accountAddress);
    const userOperationWithGasEstimated =
      await this.generateUserOperationWithGasEstimation(
        args.uop,
        args.role as Hex,
        args.paymaster,
      );
    const userOperation = args.paymaster
      ? await this.paymasterManager.generatePaymasterSignature(
          userOperationWithGasEstimated,
          args.paymaster,
        )
      : userOperationWithGasEstimated;
    const sigTime = args._sigTime ?? (await this.getSigTime());
    if (args.signType == "EIP712") {
      let domain: any;
      if (this.version == "2.0.0") {
        const accountV2 = account as AccountV2;
        domain = {
          version: this.version,
          chainId: await getChainId(this.owner.getWalletClient() as Client),
          verifyingContract: accountV2.accountAddress,
        };
      } else {
        const accountV3 = account as AccountV3;
        domain = {
          name: this.name,
          version: this.version,
          chainId: await getChainId(this.owner.getWalletClient() as Client),
          verifyingContract: accountV3.authenticationManagerAddress,
        };
      }
      const types = {
        SignMessage: [
          { name: "sender", type: "address" },
          { name: "nonce", type: "uint256" },
          { name: "initCode", type: "bytes" },
          { name: "callData", type: "bytes" },
          { name: "callGasLimit", type: "uint256" },
          { name: "verificationGasLimit", type: "uint256" },
          { name: "preVerificationGas", type: "uint256" },
          { name: "maxFeePerGas", type: "uint256" },
          { name: "maxPriorityFeePerGas", type: "uint256" },
          { name: "paymasterAndData", type: "bytes" },
          { name: "EntryPoint", type: "address" },
          { name: "sigTime", type: "uint256" },
        ],
      };
      const value = {
        ...userOperation,
        EntryPoint: this.entryPointAddress,
        sigTime: sigTime,
      };
      const signature = await this.owner.signer.signTypedData({
        domain: domain,
        types: types,
        message: value,
      });
      userOperation.signature = encodePacked(
        ["uint8", "uint256", "bytes"],
        [0, sigTime, signature],
      );
      return userOperation;
    } else {
      const encodedUserOperationData = encodeAbiParameters(
        [
          { name: "chainId", type: "uint256" },
          { name: "sender", type: "address" },
          { name: "nonce", type: "uint256" },
          { name: "initCodeHash", type: "bytes32" },
          { name: "callDataHash", type: "bytes32" },
          { name: "callGasLimit", type: "uint256" },
          { name: "verificationGasLimit", type: "uint256" },
          { name: "preVerificationGas", type: "uint256" },
          { name: "maxFeePerGas", type: "uint256" },
          { name: "maxPriorityFeePerGas", type: "uint256" },
          { name: "paymasterAndDataHash", type: "bytes32" },
          { name: "EntryPoint", type: "address" },
          { name: "sigTime", type: "uint256" },
        ],
        [
          BigInt(await getChainId(this.owner.getWalletClient() as Client)),
          userOperation.sender,
          userOperation.nonce,
          keccak256(userOperation.initCode),
          keccak256(userOperation.callData),
          userOperation.callGasLimit,
          userOperation.verificationGasLimit,
          userOperation.preVerificationGas,
          userOperation.maxFeePerGas,
          userOperation.maxPriorityFeePerGas,
          keccak256(userOperation.paymasterAndData),
          this.entryPointAddress,
          sigTime,
        ],
      );
      const userOperationHash = keccak256(encodedUserOperationData);
      userOperation.signature = encodePacked(
        ["uint8", "uint256", "bytes"],
        [1, sigTime, await this.owner.signMessage(userOperationHash)],
      );
      return userOperation;
    }
  }

  async execute(request: any): Promise<any> {
    await this.owner.getWalletClient().writeContract(request);
  }

  async sendUserOperationByERC4337Bundler(
    userOperation: UserOperation,
  ): Promise<SmartAccountTransactionReceipt> {
    const req = {
      method: "post",
      maxBodyLength: Infinity,
      url:
        this.baseUrl +
        "mp/" +
        String(await getChainId(this.owner.getWalletClient() as Client)) +
        "/eth_sendUserOperation",
      headers: {
        "Content-Type": "application/json",
        Cookie: "locale=en-US",
      },
      data: JSON.stringify({
        id: 1,
        jsonrpc: "2.0",
        method: "eth_sendUserOperation",
        params: [userOperation, this.entryPointAddress],
      }),
    };

    const res = await axios.request(req);
    if (res.data.error) {
      throw new SendUopError("sendUserOperationError", res.data.error.message);
    } else {
      return this.accountManager.pushAccountTransaction(
        userOperation.sender,
        res.data.result,
      );
    }
  }

  private async getSigTime() {
    const block = await this.owner
      .getWalletClient()
      .extend(publicActions)
      .getBlock();
    // make the signature validate in 72h
    return BigInt(block.timestamp) + BigInt(86400 * 3);
  }

  async generateUserOperationWithGasEstimation(
    userOperationDraft: UserOperationDraft,
    role: Hex,
    paymaster?: GeneratePaymasterSignatureType,
  ): Promise<UserOperation> {
    const account: Account = this.accountManager.getAccount(
      userOperationDraft.sender,
    );
    let nonce: bigint;
    if (account.isDeployed) {
      if (this.version == "2.0.0") {
        const accountV2 = account as AccountV2;
        nonce = userOperationDraft.nonce
          ? userOperationDraft.nonce
          : await this.accountManager.getNonce(
              accountV2.accountAddress,
              role,
              zeroAddress,
            );
      } else {
        const accountV3 = account as AccountV3;
        nonce = userOperationDraft.nonce
          ? userOperationDraft.nonce
          : await this.accountManager.getNonce(
              accountV3.accountAddress,
              role,
              accountV3.defaultECDSAValidator,
            );
      }
    } else {
      nonce = BigInt(0);
    }

    const userOperationForEstimationGas = [
      {
        sender: account.accountAddress,
        nonce: toHex(nonce),
        initCode:
          userOperationDraft.initCode ??
          (account.isDeployed ? "0x" : account.initCode),
        callData: userOperationDraft.callData ?? "0x",
        callGasLimit: "0x0",
        verificationGasLimit: "0x0",
        preVerificationGas: "0x0",
        maxFeePerGas: "0x0",
        maxPriorityFeePerGas: "0x0",
        // mock here
        paymasterAndData: paymaster
          ? await this.mockUserOperationPackedWithTokenPayMaster(
              paymaster.paymaster,
              paymaster.token,
              BigInt(1),
            )
          : "0x",
        // a FAKE signature
        signature: "0x000000000000000000000000000000000000000000000000000000000065ec8c6cd0677cf78f473ccf0cdf26925f84e7e07b345fd050b014bb436c73b6cba2ca3228faab7a9563284421515609f49bc03f20990c2bfa455e52e839ac4c311a57c01c"
      },
      this.entryPointAddress,
    ];

    console.log(userOperationForEstimationGas);

    let data = JSON.stringify({
      id: 1,
      jsonrpc: "2.0",
      method: "eth_estimateUserOperationGas",
      params: userOperationForEstimationGas,
    });

    const config = {
      method: "post",
      maxBodyLength: Infinity,
      url:
        this.baseUrl +
        "mp/" +
        String(await getChainId(this.owner.getWalletClient() as Client)) +
        "/eth_estimateUserOperationGas",
      headers: {
        "Content-Type": "application/json",
        Cookie: "locale=en-US",
      },
      data: data,
    };

    const res = await axios.request(config);
    if (
      res.data.error &&
      !(
        userOperationDraft.callGasLimit &&
        userOperationDraft.verificationGasLimit &&
        userOperationDraft.preVerificationGas
      )
    ) {
      throw new GasEstimationError(
        "GAS_ESTIMATION_ERROR",
        res.data.error.message,
      );
    }

    const baseGasPrice = await this.owner
      .getWalletClient()
      .extend(publicActions)
      .getGasPrice();
    const maxPriorityFeePerGas = await this.owner
      .getWalletClient()
      .extend(publicActions)
      .estimateMaxPriorityFeePerGas();
    const preVerificationGas =
      userOperationDraft.preVerificationGas ??
      res.data.result.preVerificationGas;

    // if the layer2
    let preVerificationGas_: bigint;
    if (res.data.result && res.data.result.l1GasLimit) {
      const l1publicClient = createPublicClient({
        chain: mainnet,
        transport: http("https://eth.llamarpc.com"),
      });
      const l1Fee = await l1publicClient.getGasPrice();
      preVerificationGas_ =
        userOperationDraft.preVerificationGas ??
        hexToBigInt(preVerificationGas) +
          (hexToBigInt(res.data.result.l1GasLimit) * l1Fee) /
            (baseGasPrice + maxPriorityFeePerGas);
    } else {
      preVerificationGas_ = preVerificationGas;
    }
    const defaultMaxFeePerGas = baseGasPrice + maxPriorityFeePerGas;

    return {
      sender: account.accountAddress,
      nonce: toHex(nonce) as any, //nonce,
      initCode:
        userOperationDraft.initCode ??
        (account.isDeployed ? "0x" : account.initCode),
      callData: userOperationDraft.callData ?? "0x",
      paymasterAndData: userOperationDraft.paymasterAndData
        ? userOperationDraft.paymasterAndData
        : "0x",
      signature: "0x",
      callGasLimit:
        userOperationDraft.callGasLimit ?? res.data.result.callGasLimit,
      verificationGasLimit:
        userOperationDraft.verificationGasLimit ??
        res.data.result.verificationGasLimit,
      preVerificationGas: toHex(preVerificationGas_) as any,
      maxFeePerGas: toHex(
        userOperationDraft.maxFeePerGas
          ? userOperationDraft.maxFeePerGas
          : defaultMaxFeePerGas,
      ) as any,
      maxPriorityFeePerGas: toHex(
        userOperationDraft.maxPriorityFeePerGas
          ? userOperationDraft.maxPriorityFeePerGas
          : defaultMaxFeePerGas,
      ) as any,
    };
  }

  installValidator(
    accountAddress: Address,
    newValidatorAddress: Address,
    validatorTemplate: Address = configuration.v3
      .ECDSA_VALIDATOR_TEMPLATE_ADDRESS,
  ): Hex {
    if (this.version == "2.0.0") {
      throw new BaseSmartAccountError(
        "BaseSmartAccountError",
        "This function is not supported in version 2.0.0",
      );
    }
    // encode the installation data;
    const installation: Hex = encodeAbiParameters(
      [
        { name: "validFrom", type: "uint256" },
        { name: "validUntil", type: "uint256" },
        { name: "credential", type: "bytes" },
      ],
      [BigInt(0), BigInt(10000000000), newValidatorAddress],
    );

    const installValidator = encodeFunctionData({
      abi: smartAccountV3ABI,
      functionName: "installValidator",
      args: [validatorTemplate, installation],
    });

    return encodeFunctionData({
      abi: smartAccountV3ABI,
      functionName: "execute",
      args: [accountAddress, 0, installValidator],
    });
  }

  getVersion(): string {
    return this.version;
  }

  async getImplHash(): Promise<Hex> {
     const byteCodeHash =  await this.owner.getWalletClient().extend(publicActions).getBytecode({address: this.accountManager.getAccounts()[0].accountAddress});
     return (byteCodeHash == undefined) ? zeroHash : keccak256(byteCodeHash);
  }

  private async mockUserOperationPackedWithTokenPayMaster(
    tokenPayMaster: Address,
    tokenAddress: Address,
    exchangeRate: bigint,
  ): Promise<Hex> {
    return encodePacked(
      ["address", "address", "uint256", "uint256", "bytes"],
      [
        tokenPayMaster,
        tokenAddress,
        exchangeRate,
        BigInt(
          "0x000000000000ffffffffffff0000000000000000000000000000000000000000",
        ),
        await this.owner.signMessage("MOCK MESSAGE"),
      ],
    );
  }

  extend = <R>(fn: (self: this) => R): this & R => {
    const extended = fn(this) as any;
    // this should make it so extensions can't overwrite the base methods
    for (const key in this) {
      delete extended[key];
    }
    return Object.assign(this, extended);
  };
}
