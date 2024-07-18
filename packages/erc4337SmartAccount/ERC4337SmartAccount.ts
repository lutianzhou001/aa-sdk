import type { Address } from "abitype";
import {
  type Chain,
  createPublicClient,
  encodeAbiParameters,
  encodeFunctionData,
  encodePacked,
  type Hash,
  type Hex,
  hexToBigInt,
  hexToBytes,
  http,
  publicActions,
  SignTypedDataParameters,
  toHex,
  type Transport,
  WalletClient,
  zeroAddress,
} from "viem";
import {
  Account,
  ExecuteCallDataArgs,
  ISmartContractAccount,
  SigType,
  SmartAccountTransactionReceipt,
} from "./types.js";
import {
  ERC4337SmartAccountSigner,
  UserOperation0_7,
  UserOperationDraft,
} from "../plugins/types";
import { configuration, networkConfigurations } from "../../configuration";
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
import {
  BaseSmartAccountError,
  GasEstimationError,
  SendUopError,
} from "../error/constants";
import { mainnet } from "viem/chains";
import { EntryPointV0_7ABI } from "../../abis/EntryPointV0_7.abi";
import { compileBigInt, compileMode, getSigTime } from "../common/utils";
import { authenticationManagerABI } from "../../abis/authenticationManager.abi";

export class ERC4337SmartAccount<
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
    this.owner = args.owner;
    this.entryPointAddress =
      args.entryPointAddress ??
      (args.version == "2.0.0"
        ? configuration.entryPoint.v0_6_0
        : configuration.entryPoint.v0_7_0);
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
      version: this.version,
    });
    this.accountManager = new AccountManager({
      owner: this.owner,
      entryPointAddress: this.entryPointAddress,
      version: this.version,
      factoryAddress: this.factoryAddress,
      baseUrl: this.baseUrl,
      accounts: this.accounts,
    });
    this.paymasterManager = new PaymasterManager({
      publicClient: this.owner.publicClient,
      entryPointAddress: this.entryPointAddress,
      baseUrl: this.baseUrl,
      version: this.version,
    });
  }

  encodeExecute(args: ExecuteCallDataArgs): Hex {
    if (args.execMode.callType == "delegatecall") {
      throw new Error("delegateCall not impl");
    }
    if (
      args.execMode.callType == "batch" &&
      Array.isArray(args.execRawData) == false
    ) {
      throw new Error("batchCall must be an array");
    }
    if (Array.isArray(args.execRawData) && this.version.slice(0, 1) == "3") {
      const mode = compileMode(args.execMode);
      const calldata = encodeAbiParameters(
        [
          {
            name: "executions",
            type: "tuple[]",
            components: [
              { name: "to", type: "address" },
              { name: "value", type: "uint256" },
              { name: "data", type: "bytes" },
            ],
          },
        ],
        [args.execRawData],
      );
      return encodeFunctionData({
        abi: smartAccountV3ABI,
        functionName: "execute",
        args: [mode, calldata],
      });
    } else if (
      Array.isArray(args.execRawData) &&
      this.version.slice(0, 1) == "2"
    ) {
      throw new Error("n.i");
    }
    if (!Array.isArray(args.execRawData) && this.version.slice(0, 1) == "2") {
      // 2.0.0 single encode
      return encodeFunctionData({
        abi: smartAccountV2ABI,
        functionName: "execTransactionFromEntrypoint",
        args: [
          args.execRawData.to,
          args.execRawData.value,
          args.execRawData.data,
        ],
      });
    } else if (
      !Array.isArray(args.execRawData) &&
      this.version.slice(0, 1) == "3"
    ) {
      const mode = compileMode(args.execMode);
      const calldata = encodePacked(
        ["address", "uint256", "bytes"],
        [args.execRawData.to, args.execRawData.value, args.execRawData.data],
      );
      return encodeFunctionData({
        abi: smartAccountV3ABI,
        functionName: "execute",
        args: [mode, calldata],
      });
    } else {
      throw new Error("invalid version");
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

  async getUOPHash(
    signType: SigType,
    userOperation: UserOperation<"v0.6"> | UserOperation0_7,
  ): Promise<Hex> {
    const account = this.accountManager.getAccount(userOperation.sender);
    // @ts-ignore
    return await this.owner.publicClient.readContract({
      address: account.isDeployed
        ? account.authenticationManager
        : configuration.v3.AUTHENTICATION_MANAGER_TEMPLATE,
      abi: authenticationManagerABI,
      functionName: "getUOPHash",
      args: [
        signType == "EIP712" ? 0 : 1,
        configuration.entryPoint.v0_7_0,
        userOperation,
      ],
    });
  }

  async getUOPSignedHash(
    signType: SigType,
    userOperation: UserOperation<"v0.6"> | UserOperation0_7,
  ): Promise<Hex> {
    const account = this.accountManager.getAccount(userOperation.sender);
    // @ts-ignore
    return await this.owner.publicClient.readContract({
      address: account.isDeployed
        ? account.authenticationManager
        : configuration.v3.AUTHENTICATION_MANAGER_TEMPLATE,
      abi: authenticationManagerABI,
      functionName: "getUOPSignedHash",
      args: [
        signType == "EIP712" ? 0 : 1,
        configuration.entryPoint.v0_7_0,
        userOperation,
      ],
    });
  }

  async signAndPack(
    sigType: SigType,
    sigTime: bigint,
    userOperation: UserOperation<"v0.6"> | UserOperation0_7,
    userOperationHash: Hex,
  ): Promise<UserOperation<"v0.6"> | UserOperation0_7> {
    if (sigType == "EIP712") {
      const account = this.accountManager.getAccount(userOperation.sender);
      const domain = {
        name: this.name,
        version: this.version,
        chainId: await getChainId(this.owner.publicClient),
        verifyingContract: configuration.v3.AUTHENTICATION_MANAGER_TEMPLATE,
      };
      // keccak256("SignMessage(address sender,uint256 nonce,bytes initCode,bytes callData,bytes32 accountGasLimits,uint256 preVerificationGas,bytes32 gasFees,bytes paymasterAndData,address EntryPoint,uint256 sigTime)")
      let types = {
        SignMessage: [
          { name: "sender", type: "address" },
          { name: "nonce", type: "uint256" },
          { name: "initCode", type: "bytes" },
          { name: "callData", type: "bytes" },
          { name: "accountGasLimits", type: "bytes32" },
          { name: "preVerificationGas", type: "uint256" },
          { name: "gasFees", type: "bytes32" },
          { name: "paymasterAndData", type: "bytes" },
          { name: "EntryPoint", type: "address" },
          { name: "sigTime", type: "uint256" },
        ],
      };
      let value = {
        sender: userOperation.sender as Address,
        nonce: BigInt(userOperation.nonce),
        initCode: userOperation.initCode,
        callData: userOperation.callData,
        accountGasLimits: (userOperation as UserOperation0_7).accountGasLimits,
        preVerificationGas: BigInt(
          (userOperation as UserOperation0_7).preVerificationGas,
        ),
        gasFees: (userOperation as UserOperation0_7).gasFees,
        paymasterAndData: userOperation.paymasterAndData,
        EntryPoint: this.entryPointAddress,
        sigTime: sigTime,
      };
      const signature = await this.owner.signer.account.signTypedData({
        domain: domain,
        types: types,
        message: value,
        primaryType: "SignMessage",
      });
      userOperation.signature = encodePacked(
        ["uint8", "uint256", "bytes"],
        [0, sigTime, signature],
      );
      return userOperation;
    } else {
      userOperation.signature = encodePacked(
        ["uint8", "uint256", "bytes"],
        [1, sigTime, await this.owner.signMessage(userOperationHash)],
      );
    }
    return userOperation;
  }

  async generateUserOperation(
    args: GenerateUserOperationAndPackedParams,
  ): Promise<{
    userOperation: UserOperation<"v0.6"> | UserOperation0_7;
    userOperationHash: Hex;
    sigTime: bigint;
  }> {
    const account = this.accountManager.getAccount(args.uop.sender);
    // to avoid send with init code, we should update the isDeployed status;
    await this.accountManager.updateDeployment(
      this.owner.publicClient,
      account.accountAddress,
    );
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
    const sigTime =
      args._sigTime ?? (await getSigTime(this.owner.publicClient));
    userOperation.signature = encodePacked(
      ["uint8", "uint256"],
      [args.sigType == "EIP712" ? 0 : 1, sigTime],
    );
    if (this.version.slice(0, 1) == "2") {
      throw new Error("not impl");
    } else {
      return {
        userOperationHash: await this.getUOPHash(args.sigType, userOperation),
        userOperation: userOperation,
        sigTime: sigTime,
      };
    }
  }

  async sendUserOperationByERC4337Bundler(
    userOperation: UserOperation<"v0.6">,
    walletClient?: WalletClient,
  ): Promise<SmartAccountTransactionReceipt> {
    if (this.version.slice(0, 1) == "2") {
      const req = {
        method: "post",
        maxBodyLength: Infinity,
        url:
          this.baseUrl +
          "mp/" +
          String(await getChainId(this.owner.publicClient)) +
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
        throw new SendUopError(
          "sendUserOperationError",
          res.data.error.message,
        );
      } else {
        return this.accountManager.pushAccountTransaction(
          userOperation.sender,
          res.data.result,
        );
      }
    } else {
      if (!walletClient) {
        throw new Error("wallet client must specified");
      } else {
        const { request } = await walletClient
          .extend(publicActions)
          .simulateContract({
            address: configuration.entryPoint.v0_7_0,
            abi: EntryPointV0_7ABI,
            functionName: "handleOps",
            args: [[userOperation], walletClient.account?.address],
          });
        // @ts-ignore
        const res = (await walletClient.writeContract(request)) as Hex;
        return this.accountManager.pushAccountTransaction(
          userOperation.sender,
          res,
        );
      }
    }
  }

  async generateUserOperationWithGasEstimation(
    userOperationDraft: UserOperationDraft,
    role: Hex,
    paymaster?: GeneratePaymasterSignatureType,
  ): Promise<UserOperation<"v0.6"> | UserOperation0_7> {
    const account: Account = this.accountManager.getAccount(
      userOperationDraft.sender,
    );
    let nonce: bigint;
    if (account.isDeployed) {
      if (this.version.slice(0, 1) == "2") {
        nonce = userOperationDraft.nonce
          ? userOperationDraft.nonce
          : await this.accountManager.getNonce(
              account.accountAddress,
              role,
              zeroAddress,
            );
      } else {
        nonce = userOperationDraft.nonce
          ? userOperationDraft.nonce
          : await this.accountManager.getNonce(
              account.accountAddress,
              role,
              account.defaultValidator,
            );
      }
    } else {
      nonce =
        this.version.slice(0, 1) == "2"
          ? BigInt(0)
          : BigInt(account.defaultValidator + "0000000000000000");
    }
    if (this.version.slice(0, 1) == "3") {
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
        accountGasLimits: compileBigInt(
          userOperationDraft.verificationGasLimit ??
            configuration.defaultGasConfig.VERIFICATION_GAS_LIMIT,
          userOperationDraft.callGasLimit ??
            configuration.defaultGasConfig.CALL_GAS_LIMIT,
        ),
        gasFees: compileBigInt(
          userOperationDraft.maxPriorityFeePerGas ??
            configuration.defaultGasConfig.MAX_PRIORITY_FEE_PER_GAS,
          userOperationDraft.maxFeePerGas ??
            configuration.defaultGasConfig.MAX_FEE_PER_GAS,
        ),
        preVerificationGas: toHex(
          configuration.defaultGasConfig.PREVERIFICATION_GAS,
        ) as any,
      } as UserOperation0_7;
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
              paymaster.token ?? zeroAddress,
              BigInt(1),
            )
          : "0x",
        // a FAKE signature
        signature:
          "0x000000000000000000000000000000000000000000000000000000000065ec8c6cd0677cf78f473ccf0cdf26925f84e7e07b345fd050b014bb436c73b6cba2ca3228faab7a9563284421515609f49bc03f20990c2bfa455e52e839ac4c311a57c01c",
      },
      this.entryPointAddress,
    ];

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
        String(await getChainId(this.owner.publicClient)) +
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

    const baseGasPrice = await this.owner.publicClient.getGasPrice();
    const maxPriorityFeePerGas =
      await this.owner.publicClient.estimateMaxPriorityFeePerGas();
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
    if (this.version.slice(0, 1) == "2") {
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

  extend = <R>(fn: (self: this) => R): this & R => {
    const extended = fn(this) as any;
    // this should make it so extensions can't overwrite the base methods
    for (const key in this) {
      delete extended[key];
    }
    return Object.assign(this, extended);
  };

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
}
