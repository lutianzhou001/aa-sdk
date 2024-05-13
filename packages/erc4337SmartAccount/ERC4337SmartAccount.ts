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
  keccak256,
  publicActions,
  PublicClient,
  SignTypedDataParameters,
  toHex,
  type Transport,
  WalletClient,
  zeroAddress,
} from "viem";
import {
  Account,
  ExecuteCallDataArgs,
  ManagerController,
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
import {
  GeneratePaymasterSignatureType,
  PackTxParams,
  SendTxParams,
} from "./dto/generateUserOperationAndPackedParams.dto";
import {
  BaseSmartAccountError,
  GasEstimationError,
  SendUopError,
} from "../error/constants";
import { mainnet } from "viem/chains";
import { EntryPointV0_7ABI } from "../../abis/EntryPointV0_7.abi";
import {
  compileBigInt,
  compileMode,
  getConfiguration,
  getSigTime,
} from "../common/utils";
import { IERC4337SmartAccount } from "./IERC4337SmartAccount.interface";
import { AccountManager } from "./acountMananger/accountManager";
import { PaymasterManager } from "./paymasterManager/paymaster";
import { SimulatorManager } from "./simulator/simulator";
import * as domain from "domain";
import { types } from "node:util";

export class ERC4337SmartAccount<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
  TSigner extends ERC4337SmartAccountSigner = ERC4337SmartAccountSigner,
> implements IERC4337SmartAccount
{
  protected name: string;
  protected accounts: Account<TSigner>[];
  protected currentAccount: Account<TSigner>;
  protected currentUserOperation: UserOperation<"v0.6"> | UserOperation0_7;
  public managerController: ManagerController<TTransport, TChain, TSigner>;

  constructor(args: {
    accountManager: AccountManager<TTransport, TChain, TSigner>;
    paymasterManager: PaymasterManager<TTransport, TChain, TSigner>;
    simulatorManager: SimulatorManager<TTransport, TChain, TSigner>;
  }) {
    console.log(this.managerController);
    console.log(this.managerController.accountManager);
    console.log(args.accountManager);
    this.managerController.accountManager = args.accountManager;
    this.managerController.paymasterManager = args.paymasterManager;
    this.managerController.simulatorManager = args.simulatorManager;
  }

  async send(
    overrideBundler?: WalletClient,
  ): Promise<SmartAccountTransactionReceipt> {
    if (this.currentAccount && this.currentUserOperation) {
      throw new Error("insufficient params");
    }
    if (this.getCurrentAccount().getVersion() == "2.0.0") {
      await this.managerController.simulatorManager.sendUserOperationSimulation(
        this.currentAccount,
        this.currentUserOperation as UserOperation<"v0.6">,
      );
      const req = {
        method: "post",
        maxBodyLength: Infinity,
        url:
          networkConfigurations.base_url +
          "mp/" +
          String(
            await getChainId(this.getCurrentAccount().signer.publicClient),
          ) +
          "/eth_sendUserOperation",
        headers: {
          "Content-Type": "application/json",
          Cookie: "locale=en-US",
        },
        data: JSON.stringify({
          id: 1,
          jsonrpc: "2.0",
          method: "eth_sendUserOperation",
          params: [
            this.currentUserOperation,
            getConfiguration(this.getCurrentAccount().getVersion())
              .entryPointAddress,
          ],
        }),
      };
      const res = await axios.request(req);
      if (res.data.error) {
        throw new SendUopError(
          "sendUserOperationError",
          res.data.error.message,
        );
      } else {
        return this.managerController.accountManager.pushAccountTransaction(
          this.currentAccount,
          res.data.result,
        );
      }
    } else {
      if (!overrideBundler) {
        throw new Error("in v3, due to not online, client must specified");
      } else {
        const { request } = await overrideBundler
          .extend(publicActions)
          .simulateContract({
            address: configuration.entryPoint.v0_7_0,
            abi: EntryPointV0_7ABI,
            functionName: "handleOps",
            args: [
              [this.currentUserOperation],
              overrideBundler.account?.address,
            ],
          });
        // @ts-ignore
        await walletClient.writeContract(request);
        return this.managerController.accountManager.pushAccountTransaction(
          this.currentAccount,
          "0x" as Hex,
        );
      }
    }
  }

  private getCurrentAccount(): Account<TSigner> {
    if (this.accounts.length === 0) {
      throw new Error("no account specified");
    }
    return this.currentAccount ?? this.accounts[0];
  }

  connect(account: Account<TSigner>): this {
    this.currentAccount = account;
    return this;
  }

  async encodeExecute(args: ExecuteCallDataArgs): Promise<Hex> {
    if (args.execMode.callType == "delegatecall") {
      throw new Error("delegateCall not impl");
    }
    if (
      args.execMode.callType == "batch" &&
      Array.isArray(args.execRawData) == false
    ) {
      throw new Error("batchCall must be an array");
    }
    if (Array.isArray(args.execRawData)) {
      throw new Error("batchCall will be supported soon");
    }
    if (!this.currentAccount && this.accounts.length == 0) {
      throw new Error("No account specified.");
    }
    if (this.getCurrentAccount().getVersion() == "2.0.0") {
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
    } else if (this.currentAccount.getVersion() == "3.0.0") {
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
      throw new Error("unknown version");
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
    return this.getCurrentAccount().signer.signMessage(msg);
  }

  async signTypedData(args: SignTypedDataParameters): Promise<Hex> {
    throw new BaseSmartAccountError(
      "BaseSmartAccountError",
      "signTypedData not supported",
    );
  }

  async packTx(args: PackTxParams): Promise<{
    account: Account<TSigner>;
    userOperation: UserOperation<"v0.6"> | UserOperation0_7;
    context: ERC4337SmartAccount;
  }> {
    const chainId = await getChainId(this.currentAccount.signer.publicClient);
    await this.managerController.accountManager.refreshAccounts([
      this.getCurrentAccount(),
    ]);
    const userOperationWithGasEstimated =
      await this.generateUserOperationWithGasEstimation(
        this.getCurrentAccount(),
        args.uop,
        args.paymaster,
      );
    const userOperation = args.paymaster
      ? await this.managerController.paymasterManager.generatePaymasterSignature(
          this.getCurrentAccount(),
          userOperationWithGasEstimated,
          args.paymaster,
        )
      : userOperationWithGasEstimated;
    const sigTime =
      args._sigTime ??
      (await getSigTime(this.getCurrentAccount().signer.publicClient));
    if (args.signType == "EIP712") {
      let domain: any;
      if (this.getCurrentAccount().getVersion() == "2.0.0") {
        domain = {
          version: this.getCurrentAccount().getVersion(),
          chainId: chainId,
          verifyingContract: this.getCurrentAccount().accountAddress,
        };
      } else {
        domain = {
          name: this.name,
          version: this.getCurrentAccount().getVersion(),
          chainId: chainId,
          verifyingContract:
            this.getCurrentAccount().authenticationManagerAddress,
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
        EntryPoint: getConfiguration(this.currentAccount.getVersion()),
        sigTime: sigTime,
      };
      const signature = "0x";
      // const signature = await this.getCurrentAccount().signer.signTypedData({
      //   domain: domain,
      //   types: types,
      //   message: value
      // });
      userOperation.signature = encodePacked(
        ["uint8", "uint256", "bytes"],
        [0, sigTime, signature],
      );
      this.currentUserOperation = userOperation;
      return {
        account: this.getCurrentAccount(),
        userOperation: userOperation,
        context: this,
      };
    } else {
      let encodedUserOperationData: Hex;
      if (this.getCurrentAccount().getVersion() == "2.0.0") {
        const userOperation_0_6_0 =
          userOperation as unknown as UserOperation<"v0.6">;
        encodedUserOperationData = encodeAbiParameters(
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
            BigInt(chainId),
            userOperation_0_6_0.sender,
            userOperation_0_6_0.nonce,
            keccak256(userOperation_0_6_0.initCode),
            keccak256(userOperation_0_6_0.callData),
            userOperation_0_6_0.callGasLimit,
            userOperation_0_6_0.verificationGasLimit,
            userOperation_0_6_0.preVerificationGas,
            userOperation_0_6_0.maxFeePerGas,
            userOperation_0_6_0.maxPriorityFeePerGas,
            keccak256(userOperation.paymasterAndData),
            getConfiguration(this.getCurrentAccount().getVersion())
              .entryPointAddress,
            sigTime,
          ],
        );
      } else {
        // 3.0.0 supports V0.7
        const userOperation_0_7_0 =
          userOperation as unknown as UserOperation0_7;
        encodedUserOperationData = encodeAbiParameters(
          [
            { name: "chainId", type: "uint256" },
            { name: "sender", type: "address" },
            { name: "nonce", type: "uint256" },
            { name: "initCodeHash", type: "bytes32" },
            { name: "callDataHash", type: "bytes32" },
            { name: "accountsGasLimits", type: "bytes32" },
            { name: "preVerificationGas", type: "uint256" },
            { name: "gasFees", type: "bytes32" },
            { name: "paymasterAndDataHash", type: "bytes32" },
            { name: "EntryPoint", type: "address" },
            { name: "sigTime", type: "uint256" },
          ],
          [
            BigInt(chainId),
            userOperation_0_7_0.sender,
            userOperation_0_7_0.nonce,
            keccak256(userOperation_0_7_0.initCode),
            keccak256(userOperation_0_7_0.callData),
            userOperation_0_7_0.accountGasLimits,
            userOperation_0_7_0.preVerificationGas,
            userOperation_0_7_0.gasFees,
            keccak256(userOperation_0_7_0.paymasterAndData),
            getConfiguration(this.getCurrentAccount().getVersion())
              .entryPointAddress,
            sigTime,
          ],
        );
      }
      const userOperationHash = keccak256(encodedUserOperationData);
      userOperation.signature = encodePacked(
        ["uint8", "uint256", "bytes"],
        [
          1,
          sigTime,
          await this.getCurrentAccount().signer.signMessage(userOperationHash),
        ],
      );
      this.currentUserOperation = userOperation;
      return {
        account: this.getCurrentAccount(),
        userOperation: userOperation,
        context: this,
      };
    }
  }

  async generateUserOperationWithGasEstimation(
    account: Account<TSigner>,
    userOperationDraft: UserOperationDraft,
    paymaster?: GeneratePaymasterSignatureType,
  ): Promise<UserOperation<"v0.6"> | UserOperation0_7> {
    const nonce = userOperationDraft.nonce
      ? userOperationDraft.nonce
      : await this.managerController.accountManager.getNonce(account);
    if (this.getCurrentAccount().getVersion() == "3.0.0") {
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
          userOperationDraft.callGasLimit ??
            configuration.defaultGasConfig.CALL_GAS_LIMIT,
          userOperationDraft.verificationGasLimit ??
            configuration.defaultGasConfig.VERIFICATION_GAS_LIMIT,
        ),
        gasFees: compileBigInt(
          userOperationDraft.maxFeePerGas ??
            configuration.defaultGasConfig.MAX_FEE_PER_GAS,
          userOperationDraft.maxPriorityFeePerGas ??
            configuration.defaultGasConfig.MAX_PRIORITY_FEE_PER_GAS,
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
      getConfiguration(this.getCurrentAccount().getVersion()).entryPointAddress,
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
        networkConfigurations.base_url +
        "mp/" +
        String(await getChainId(this.getCurrentAccount().signer.publicClient)) +
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

    const baseGasPrice =
      await this.getCurrentAccount().signer.publicClient.getGasPrice();
    const maxPriorityFeePerGas = await this.getCurrentAccount()
      .signer.publicClient.extend(publicActions)
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
    if (this.getCurrentAccount().getVersion() == "2.0.0") {
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
        await this.getCurrentAccount().signer.signMessage("MOCK MESSAGE"),
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
