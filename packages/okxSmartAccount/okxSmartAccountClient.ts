import {
  type Chain,
  createPublicClient,
  encodeAbiParameters,
  encodeFunctionData,
  encodePacked,
  type Hex,
  hexToBigInt,
  http,
  type Transport,
  zeroHash,
} from "viem";
import {
  ExecuteCallDataArgs,
  ExecutionMode,
  OKXSmartAccount,
  PackTxMiddlewareOverride,
  Runtime,
  SigType,
} from "./types.js";
import { OKXSmartAccountSigner } from "../plugins/types";
import { smartAccountV3ABI } from "../../abis/smartAccountV3.abi";
import { UserOperation } from "permissionless/types/userOperation";
import { BundlerError, LocalError } from "../common/error";
import { compileBigInt, compileMode, getSigTime } from "../common/utils";
import { authenticationManagerABI } from "../../abis/authenticationManager.abi";
import { getChainId } from "viem/actions";
import type { Address } from "abitype";
import { PackedUserOperation } from "permissionless/types";
import { ENTRYPOINT_ADDRESS_V07, isSmartAccountDeployed } from "permissionless";
import { mainnet } from "viem/chains";
import { getPaymasterAndData } from "./usePaymaster";
import { EntryPointV0_7ABI } from "../../abis/EntryPointV0_7.abi";
import { BundlerClient } from "../okxBundler/bundler";
import { PaymasterClient } from "../okxPaymaster/paymaster";

export class OKXSmartAccountClient<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
  TSigner extends OKXSmartAccountSigner = OKXSmartAccountSigner,
> {
  protected name: string;
  protected version: string;
  protected chainId: string;

  public runtime: Runtime<TTransport, TChain, TSigner>;

  public bundlerClient: BundlerClient;
  public paymasterClient: PaymasterClient;

  constructor(
    okxSmartAccount: OKXSmartAccount<TSigner>,
    bundlerClient?: BundlerClient,
    paymasterClient?: PaymasterClient,
  ) {
    this.bundlerClient =
      bundlerClient ??
      new BundlerClient(
        process.env.DEFAULT_BUNDLER_URL as string,
        okxSmartAccount.signer.publicClient.chain as Chain,
      );
    this.paymasterClient =
      paymasterClient ??
      new PaymasterClient(
        process.env.DEFAULT_PAYMASTER_URL as string,
        okxSmartAccount.signer.publicClient.chain as Chain,
      );
    this.runtime = this.initializeRuntime(okxSmartAccount);
  }

  /**
   * get the nonce with noncekey provided.
   */
  async getNonce(): Promise<bigint> {
    // @ts-ignore
    return await this.runtime.okxSmartAccount.signer.publicClient.readContract({
      address: ENTRYPOINT_ADDRESS_V07,
      abi: EntryPointV0_7ABI,
      functionName: "getNonce",
      args: [
        this.runtime.okxSmartAccount.accountAddress,
        BigInt(this.runtime.okxSmartAccount.nonceKey),
      ],
    });
  }

  /**
   * send the transaction with prepared tx in the proposeTx function
   */
  async send() {
    await this.bundlerClient.simulateUserOperation(this.runtime.userOperation);
    return await this.bundlerClient.sendUserOperation(
      this.runtime.userOperation,
    );
  }

  encodeExecute(args: ExecuteCallDataArgs, execMode?: ExecutionMode): this {
    let callDataToEntryPoint: Hex;
    const mode = compileMode(
      Array.isArray(args),
      execMode ?? { allowFailedExecution: false, try: false },
    );
    if (Array.isArray(args)) {
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
        [args],
      );
      callDataToEntryPoint = encodeFunctionData({
        abi: smartAccountV3ABI,
        functionName: "execute",
        args: [mode, calldata],
      });
    } else {
      const callData = encodePacked(
        ["address", "uint256", "bytes"],
        [args.to, args.value, args.data],
      );
      callDataToEntryPoint = encodeFunctionData({
        abi: smartAccountV3ABI,
        functionName: "execute",
        args: [mode, callData],
      });
    }
    this.runtime.userOperation.callData = callDataToEntryPoint;
    this.runtime.packedUserOperation.callData = callDataToEntryPoint;
    return this;
  }

  /**
   * get the uopHash onchain
   *
   * @param signType the type of the signature
   * @param userOperation the userOperation
   */
  async getUOPHash(
    signType: SigType,
    userOperation: PackedUserOperation,
  ): Promise<Hex> {
    return (await this.runtime.okxSmartAccount.signer.publicClient.readContract(
      {
        address: this.runtime.okxSmartAccount.isDeployed
          ? this.runtime.okxSmartAccount.authenticationManagerAddress
          : (process.env.AUTHENTICATION_MANAGER_TEMPLATE as Address),
        abi: authenticationManagerABI,
        functionName: "getUOPHash",
        args: [
          signType === "EIP712" ? 0 : 1,
          ENTRYPOINT_ADDRESS_V07,
          userOperation,
        ],
      },
    )) as Hex;
  }

  /**
   * get the uopSigned hash(not used currently)
   *
   * @param signType the type of the signature
   * @param userOperation the userOperation
   */
  async getUOPSignedHash(
    signType: SigType,
    userOperation: UserOperation<"v0.7">,
  ): Promise<Hex> {
    return (await this.runtime.okxSmartAccount.signer.publicClient.readContract(
      {
        address: this.runtime.okxSmartAccount.isDeployed
          ? this.runtime.okxSmartAccount.authenticationManagerAddress
          : (process.env.AUTHENTICATION_MANAGER_TEMPLATE as Address),
        abi: authenticationManagerABI,
        functionName: "getUOPSignedHash",
        args: [
          signType === "EIP712" ? 0 : 1,
          ENTRYPOINT_ADDRESS_V07,
          userOperation,
        ],
      },
    )) as Hex;
  }

  /**
   * get the uopSigned hash(not used currently)
   */
  async signAndPack(): Promise<this> {
    if (!this.runtime.sigType) {
      throw new LocalError("SIGN_PACK_ERROR", "sigType not provided");
    }
    if (!this.runtime.sigTime) {
      throw new LocalError("SIGN_PACK_ERROR", "sigTime not provided");
    }
    const signature =
      this.runtime.sigType === "EIP712"
        ? await this.getEIP712Signature()
        : await this.getEIP191Signature();
    this.runtime.userOperation.signature = encodePacked(
      ["uint8", "uint256", "bytes"],
      [
        this.runtime.sigType === "EIP712" ? 0 : 1,
        this.runtime.sigTime,
        signature,
      ],
    );
    return this;
  }

  /**
   * propose transaction for the user.
   */
  async proposeTx(
    sigType: SigType,
    packTxMiddlewareOverride?: PackTxMiddlewareOverride,
  ): Promise<this> {
    this.chainId = String(
      await getChainId(this.runtime.okxSmartAccount.signer.publicClient),
    );
    this.runtime.sigType = sigType;
    await this.prepareUserOperation();
    await this.gasEstimation(packTxMiddlewareOverride);
    await this.preparePackedUserOperation(packTxMiddlewareOverride);
    if (this.runtime.rawPaymaster) {
      await getPaymasterAndData(this);
    }
    this.runtime.sigTime =
      packTxMiddlewareOverride?.sigTimeOverride ??
      (await getSigTime(this.runtime.okxSmartAccount.signer.publicClient));
    this.runtime.packedUserOperation.signature = encodePacked(
      ["uint8", "uint256"],
      [this.runtime.sigType === "EIP712" ? 0 : 1, this.runtime.sigTime],
    );
    this.runtime.userOperationHash = await this.getUOPHash(
      sigType,
      this.runtime.packedUserOperation,
    );
    return this;
  }

  private async prepareUserOperation() {
    const isDeployed = await isSmartAccountDeployed(
      this.runtime.okxSmartAccount.signer.publicClient,
      this.runtime.okxSmartAccount.accountAddress,
    );
    this.runtime.userOperation.factory = isDeployed
      ? "0x"
      : (this.runtime.okxSmartAccount.initCode.slice(0, 42) as Hex);
    this.runtime.userOperation.factoryData = isDeployed
      ? "0x"
      : (("0x" + this.runtime.okxSmartAccount.initCode.slice(42)) as Hex);
    this.runtime.userOperation.nonce = await this.getNonce();
  }

  public async getUserOperationReceipt(hash: Hex) {
    return this.bundlerClient.getUserOperationByHash(hash);
  }

  extend = <R>(extendFn: (self: this) => R): this & R => {
    const extended = extendFn(this) as any;
    for (const key in this) {
      delete extended[key];
    }
    return Object.assign(this, extended);
  };

  // Private functions

  private async preparePackedUserOperation(
    packTxMiddlewareOverride?: PackTxMiddlewareOverride,
  ) {
    this.runtime.packedUserOperation.sender = this.runtime.userOperation.sender;
    this.runtime.packedUserOperation.nonce = this.runtime.userOperation.nonce;
    this.runtime.packedUserOperation.preVerificationGas =
      this.runtime.userOperation.preVerificationGas;
    this.runtime.packedUserOperation.callData =
      this.runtime.userOperation.callData;
    this.runtime.packedUserOperation.accountGasLimits = compileBigInt(
      packTxMiddlewareOverride?.gasEstimationOverride?.verificationGasLimit ??
        this.runtime.userOperation.verificationGasLimit,
      packTxMiddlewareOverride?.gasEstimationOverride?.callGasLimit ??
        this.runtime.userOperation.callGasLimit,
    );
    this.runtime.packedUserOperation.gasFees = compileBigInt(
      this.runtime.userOperation.maxPriorityFeePerGas,
      this.runtime.userOperation.maxFeePerGas,
    );
  }

  private async gasEstimation(
    packTxMiddlewareOverride?: PackTxMiddlewareOverride,
  ): Promise<void> {
    const baseFeePerPrice =
      await this.runtime.okxSmartAccount.signer.publicClient.getGasPrice();
    const maxPriorityFeePerGas =
      await this.runtime.okxSmartAccount.signer.publicClient.estimateMaxPriorityFeePerGas();
    this.runtime.userOperation.maxPriorityFeePerGas =
      packTxMiddlewareOverride?.feeDataOverride?.maxPriorityFeePerGas ??
      baseFeePerPrice + maxPriorityFeePerGas;
    this.runtime.userOperation.maxFeePerGas =
      packTxMiddlewareOverride?.feeDataOverride?.maxFeePerGas ??
      baseFeePerPrice;
    this.runtime.userOperation.signature =
      await this.runtime.okxSmartAccount.signer.getDummySignature();
    if (this.runtime.rawPaymaster?.paymasterAddress) {
      this.runtime.userOperation.paymaster =
        this.runtime.rawPaymaster.paymasterAddress;
      this.runtime.userOperation.paymasterVerificationGasLimit =
        this.runtime.rawPaymaster.paymasterVerificationGasLimit ?? 0n;
      this.runtime.userOperation.paymasterPostOpGasLimit =
        this.runtime.rawPaymaster.paymasterPostOpGasLimit ?? 0n;
      this.runtime.userOperation.paymasterData = "0x000000000000000000";
    }
    const result = await this.bundlerClient.estimateUserOperationGas(
      this.runtime.userOperation,
    );
    this.runtime.userOperation.verificationGasLimit =
      packTxMiddlewareOverride?.gasEstimationOverride?.verificationGasLimit ??
      BigInt(result.verificationGasLimit);
    this.runtime.userOperation.callGasLimit =
      packTxMiddlewareOverride?.gasEstimationOverride?.callGasLimit ??
      BigInt(result.callGasLimit);
    if (this.runtime.rawPaymaster?.paymasterAddress) {
      this.runtime.userOperation.paymasterVerificationGasLimit =
        this.runtime.rawPaymaster?.paymasterVerificationGasLimit ??
        BigInt(result.paymasterVerificationGasLimit);
      this.runtime.userOperation.paymasterPostOpGasLimit =
        this.runtime.rawPaymaster?.paymasterPostOpGasLimit ??
        BigInt(result.paymasterPostOpGasLimit);
    }

    let preVerificationGas: bigint;
    if (result.l1GasLimit) {
      const l1publicClient = createPublicClient({
        chain: mainnet,
        transport: http(
          "https://eth-mainnet.g.alchemy.com/v2/ioOONhdjE5oo2RlTAyVxkyu8lypwdlsY",
        ),
      });
      const l1Fee = await l1publicClient.getGasPrice();
      preVerificationGas =
        hexToBigInt(result.preVerificationGas) +
        (hexToBigInt(result.l1GasLimit) * l1Fee) /
          (baseFeePerPrice + maxPriorityFeePerGas);
    } else {
      preVerificationGas = BigInt(result.preVerificationGas);
    }

    this.runtime.userOperation.preVerificationGas =
      packTxMiddlewareOverride?.gasEstimationOverride?.preVerificationGas ??
      preVerificationGas;
  }

  private async getEIP712Signature(): Promise<Hex> {
    const domain = {
      name: this.runtime.okxSmartAccount.name,
      version: this.runtime.okxSmartAccount.version,
      chainId: await getChainId(
        this.runtime.okxSmartAccount.signer.publicClient,
      ),
      verifyingContract: process.env.AUTHENTICATION_MANAGER_TEMPLATE as Address,
    };
    const types = {
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
    const value = {
      sender: this.runtime.packedUserOperation.sender as Address,
      nonce: this.runtime.packedUserOperation.nonce as bigint,
      initCode: this.runtime.packedUserOperation.initCode,
      callData: this.runtime.packedUserOperation.callData,
      accountGasLimits: this.runtime.packedUserOperation.accountGasLimits,
      preVerificationGas: this.runtime.packedUserOperation.preVerificationGas,
      gasFees: this.runtime.packedUserOperation.gasFees,
      paymasterAndData: this.runtime.packedUserOperation.paymasterAndData,
      EntryPoint: ENTRYPOINT_ADDRESS_V07,
      sigTime: this.runtime.sigTime,
    };
    return await this.runtime.okxSmartAccount.signer.signTypedData({
      account: this.runtime.okxSmartAccount.accountAddress,
      domain: domain,
      types: types,
      message: value,
      primaryType: "SignMessage",
    });
  }

  private async getEIP191Signature(): Promise<Hex> {
    return await this.runtime.okxSmartAccount.signer.signMessage(
      this.runtime.userOperationHash,
    );
  }

  private createUserOperation(
    okxSmartAccount: OKXSmartAccount<TSigner>,
  ): UserOperation<"v0.7"> {
    return {
      sender: okxSmartAccount.accountAddress,
      nonce: 0n,
      callData: "0x",
      callGasLimit: 0n,
      verificationGasLimit: 0n,
      preVerificationGas: 0n,
      maxFeePerGas: 0n,
      maxPriorityFeePerGas: 0n,
      signature: zeroHash,
    };
  }

  private createPackedUserOperation(
    okxSmartAccount: OKXSmartAccount<TSigner>,
  ): PackedUserOperation {
    return {
      sender: okxSmartAccount.accountAddress,
      nonce: 0n,
      callData: "0x",
      initCode: okxSmartAccount.isDeployed ? "0x" : okxSmartAccount.initCode,
      accountGasLimits: zeroHash as `0x${string & { length: 64 }}`,
      preVerificationGas: 0n,
      gasFees: zeroHash as `0x${string & { length: 64 }}`,
      paymasterAndData: "0x",
      signature: zeroHash,
    };
  }

  private initializeRuntime(
    okxSmartAccount: OKXSmartAccount<TSigner>,
  ): Runtime<TTransport, TChain, TSigner> {
    return {
      okxSmartAccount: okxSmartAccount,
      userOperationHash: zeroHash,
      userOperation: this.createUserOperation(okxSmartAccount),
      packedUserOperation: this.createPackedUserOperation(okxSmartAccount),
    };
  }
}
