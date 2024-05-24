import {
  type Chain,
  encodeFunctionData,
  encodePacked,
  type Hex,
  type Transport,
} from "viem";
import {
  Account,
  ClientsUrls,
  ExecuteCallDataArgs,
  PackTxMiddlewareOverride,
  Runtime,
  SigType,
  SmartAccountTransactionReceipt,
} from "./types.js";
import { ERC4337SmartAccountSigner, UserOperation0_7 } from "../plugins/types";
import { configuration } from "../../configuration";
import { smartAccountV3ABI } from "../../abis/smartAccountV3.abi";
import { UserOperation } from "permissionless/types/userOperation";
import { GasEstimationError } from "../error/constants";
import {
  callClient,
  compileBigInt,
  compileMode,
  getSigTime,
} from "../common/utils";
import { IERC4337SmartAccount } from "./IERC4337SmartAccount.interface";
import { AccountManager } from "./acountMananger/accountManager";
import { generatePaymasterSignature } from "./paymasterManager/paymaster";
import { authenticationManagerABI } from "../../abis/authenticationManager.abi";
import { getChainId } from "viem/actions";
import type { Address } from "abitype";
import { PackedUserOperation } from "permissionless/types";
import { ENTRYPOINT_ADDRESS_V07 } from "permissionless";

export class ERC4337SmartAccount<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
  TSigner extends ERC4337SmartAccountSigner = ERC4337SmartAccountSigner,
> implements IERC4337SmartAccount
{
  protected name: string;
  protected accounts: Account<TSigner>[];
  public runtime: Runtime<TTransport, TChain, TSigner>;
  public accountManager: AccountManager<TTransport, TChain, TSigner>;

  public bundlerUrl: string;
  public paymasterUrl: string;

  constructor(
    args: {
      accountManager?: AccountManager<TTransport, TChain, TSigner>;
    },
    clientsUrls?: ClientsUrls,
  ) {
    this.accountManager =
      args.accountManager ?? new AccountManager<TTransport, TChain, TSigner>();
    this.bundlerUrl = clientsUrls?.bundlerUrl ?? configuration.okx.bundlerUrl;
    this.paymasterUrl =
      clientsUrls?.bundlerUrl ?? configuration.okx.paymasterUrl;
  }

  async send(): Promise<SmartAccountTransactionReceipt> {
    if (this.runtime.account && this.runtime.userOperation) {
      throw new Error("insufficient params");
    }
    if (!this.runtime.account) {
      throw new Error("account not specified");
    }
    const simulateUserOperationReq = JSON.stringify({
      id: 1,
      jsonrpc: "2.0",
      method: "eth_simulateUserOperation",
      params: [this.runtime.userOperation, ENTRYPOINT_ADDRESS_V07],
    });
    const simulateUserOperationRes = await callClient(
      simulateUserOperationReq,
      this.bundlerUrl,
    );
    if (simulateUserOperationRes.data.error) {
      throw new Error("SIMULATION_ERROR");
    } else {
      const sendUserOperationReq = JSON.stringify({
        id: 1,
        jsonrpc: "2.0",
        method: "eth_sendUserOperation",
        params: [this.runtime.userOperation, ENTRYPOINT_ADDRESS_V07],
      });
      const sendUserOperationRes = await callClient(
        sendUserOperationReq,
        this.bundlerUrl,
      );
      if (sendUserOperationRes.data.error) {
        throw new Error("Send userOperationError");
      }
      return this.accountManager.pushAccountTransaction(
        this.runtime.account,
        sendUserOperationRes.data.result,
      );
    }
  }

  private getCurrentAccount(): Account<TSigner> {
    if (this.accounts.length === 0) {
      throw new Error("no account specified");
    } else if (!this.runtime.account) {
      throw new Error("no account linked");
    }
    return this.runtime.account;
  }

  connect(account: Account<TSigner>): this {
    this.runtime.account = account;
    return this;
  }

  encodeExecute(args: ExecuteCallDataArgs): this {
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
    if (!this.runtime.account) {
      throw new Error("No account specified.");
    }
    const mode = compileMode(args.execMode);
    const callData = encodePacked(
      ["address", "uint256", "bytes"],
      [args.execRawData.to, args.execRawData.value, args.execRawData.data],
    );
    this.runtime.userOperation.callData = encodeFunctionData({
      abi: smartAccountV3ABI,
      functionName: "execute",
      args: [mode, callData],
    });
    return this;
  }

  async getUOPHash(
    account: Account,
    signType: SigType,
    userOperation: PackedUserOperation,
  ): Promise<Hex> {
    // @ts-ignore
    return await this.owner.publicClient.readContract({
      address: account.isDeployed
        ? account.authenticationManagerAddress
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
    account: Account,
    signType: SigType,
    userOperation:
      | UserOperation<"v0.6">
      | UserOperation0_7
      | UserOperation<"v0.7">,
  ): Promise<Hex> {
    // @ts-ignore
    return await this.owner.publicClient.readContract({
      address: account.isDeployed
        ? account.authenticationManagerAddress
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

  async signAndPack(): Promise<this> {
    if (!this.runtime.account) {
      throw new Error("no account connected");
    }
    if (!this.runtime.sigType) {
      throw new Error("sigType not specified");
    }
    if (!this.runtime.sigTime) {
      throw new Error("sigTime not specified");
    }
    if (!this.runtime.userOperationHash) {
      throw new Error("uop has not specified");
    }
    if (this.runtime.sigType == "EIP712") {
      const domain = {
        name: this.runtime.account?.name,
        version: this.runtime.account?.version,
        chainId: await getChainId(this.runtime.account.signer.publicClient),
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
        sender: this.runtime.packedUserOperation.sender as Address,
        nonce: BigInt(this.runtime.packedUserOperation.nonce),
        initCode: this.runtime.packedUserOperation.initCode,
        callData: this.runtime.packedUserOperation.callData,
        accountGasLimits: this.runtime.packedUserOperation.accountGasLimits,
        preVerificationGas: BigInt(
          this.runtime.packedUserOperation.preVerificationGas,
        ),
        gasFees: this.runtime.packedUserOperation.gasFees,
        paymasterAndData: this.runtime.packedUserOperation.paymasterAndData,
        EntryPoint: ENTRYPOINT_ADDRESS_V07,
        sigTime: this.runtime.sigTime,
      };
      const signature = await this.runtime.account.signer.signTypedData({
        domain: domain,
        types: types,
        message: value,
        primaryType: "SignMessage",
      });
      this.runtime.packedUserOperation.signature = encodePacked(
        ["uint8", "uint256", "bytes"],
        [0, this.runtime.sigTime, signature],
      );
    } else {
      this.runtime.packedUserOperation.signature = encodePacked(
        ["uint8", "uint256", "bytes"],
        [
          1,
          this.runtime.sigTime,
          await this.runtime.account.signer.signMessage(
            this.runtime.userOperationHash,
          ),
        ],
      );
    }
    return this;
  }

  // overrides some gaslimits and gas estimation
  async prepareTx(
    sigType: SigType,
    packTxMiddlewareOverride?: PackTxMiddlewareOverride,
  ): Promise<this> {
    if (!this.runtime.userOperation.callData) {
      throw new Error("callData is not provided");
    }
    if (!this.runtime.account) {
      throw new Error("account has to be specified");
    }
    await this.accountManager.refreshAccounts([this.getCurrentAccount()]);
    this.runtime.userOperation.nonce = await this.accountManager.getNonce(
      this.runtime.account,
    );
    await this.gasEstimation(
      this.runtime.userOperation,
      packTxMiddlewareOverride,
    );
    this.runtime.packedUserOperation.sender = this.runtime.userOperation.sender;
    this.runtime.packedUserOperation.nonce = this.runtime.userOperation.nonce;
    this.runtime.packedUserOperation.callData =
      this.runtime.userOperation.callData;
    this.runtime.packedUserOperation.initCode = this.runtime.account?.isDeployed
      ? "0x"
      : this.runtime.account.initCode;
    this.runtime.packedUserOperation.accountGasLimits = compileBigInt(
      packTxMiddlewareOverride?.gasEstimationMiddleware.callGasLimit ??
        this.runtime.userOperation.callGasLimit,
      packTxMiddlewareOverride?.gasEstimationMiddleware.verificationGasLimit ??
        this.runtime.userOperation.verificationGasLimit,
    );
    this.runtime.packedUserOperation.gasFees = compileBigInt(
      packTxMiddlewareOverride?.feeDataMiddleware.maxFeePerGas ??
        this.runtime.userOperation.maxFeePerGas,
      packTxMiddlewareOverride?.feeDataMiddleware.maxPriorityFeePerGas ??
        this.runtime.userOperation.maxPriorityFeePerGas,
    );
    this.runtime.packedUserOperation.preVerificationGas =
      packTxMiddlewareOverride?.gasEstimationMiddleware.preVerificationGas ??
      this.runtime.userOperation.preVerificationGas;
    await generatePaymasterSignature(this.runtime);
    const sigTime = await getSigTime(
      this.getCurrentAccount().signer.publicClient,
    );
    if (!this.runtime.account) {
      throw new Error("no account specified");
    }
    this.runtime.userOperationHash = await this.getUOPHash(
      this.runtime.account,
      sigType,
      this.runtime.packedUserOperation,
    );
    this.runtime.sigTime = sigTime;
    return this;
  }

  async gasEstimation(
    userOperation: UserOperation<"v0.7">,
    packTxMiddlewareOverride?: PackTxMiddlewareOverride,
  ): Promise<void> {
    const data = JSON.stringify({
      id: 1,
      jsonrpc: "2.0",
      method: "eth_estimateUserOperationGas",
      params: [this.runtime.userOperation, ENTRYPOINT_ADDRESS_V07],
    });
    const gasEstimationRes = await callClient(data, this.bundlerUrl);
    if (gasEstimationRes.data.error) {
      throw new GasEstimationError(
        "GAS_ESTIMATION_ERROR",
        gasEstimationRes.data.error.message,
      );
    }
    userOperation.preVerificationGas =
      packTxMiddlewareOverride?.gasEstimationMiddleware.preVerificationGas ??
      gasEstimationRes.data.result.preVerificationGas;
    userOperation.verificationGasLimit =
      packTxMiddlewareOverride?.gasEstimationMiddleware.verificationGasLimit ??
      gasEstimationRes.data.result.verificationGasLimit;
    userOperation.callGasLimit =
      packTxMiddlewareOverride?.gasEstimationMiddleware.callGasLimit ??
      gasEstimationRes.data.result.callGasLimit;

    userOperation.paymasterVerificationGasLimit =
      this.runtime.rawPaymaster?.paymasterVerificationGasLimit ??
      gasEstimationRes.data.result.paymasterVerificationGasLimit;
    userOperation.paymasterPostOpGasLimit =
      this.runtime.rawPaymaster?.paymasterPostOpGasLimit ??
      gasEstimationRes.data.result.paymasterPostOpGasLimit;
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

  extend = <R>(extendFn: (self: this) => R): this & R => {
    const extended = extendFn(this) as any;
    // this should make it so extensions can't overwrite the base methods
    for (const key in this) {
      delete extended[key];
    }
    return Object.assign(this, extended);
  };
}
