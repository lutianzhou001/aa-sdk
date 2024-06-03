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
  ClientsUrls,
  ExecuteCallDataArgs,
  ExecutionMode,
  OKXSmartAccount,
  PackTxMiddlewareOverride,
  Runtime,
  SigType,
} from "./types.js";
import { ERC4337SmartAccountSigner } from "../plugins/types";
import { configuration, networkConfigurations } from "../../configuration";
import { smartAccountV3ABI } from "../../abis/smartAccountV3.abi";
import { UserOperation } from "permissionless/types/userOperation";
import { GasEstimationError } from "../error/constants";
import {
  callClient,
  compileBigInt,
  compileMode,
  convertToHex,
  getSigTime,
} from "../common/utils";
import { authenticationManagerABI } from "../../abis/authenticationManager.abi";
import { getChainId } from "viem/actions";
import type { Address } from "abitype";
import { PackedUserOperation } from "permissionless/types";
import { ENTRYPOINT_ADDRESS_V07, isSmartAccountDeployed } from "permissionless";
import { mainnet } from "viem/chains";
import { getPaymasterAndData } from "./usePaymaster";
import { EntryPointV0_7ABI } from "../../abis/EntryPointV0_7.abi";
import { smartAccountV2WithInscriptionSupportedABI } from "../../abis/smartAccountV2WithInscriptionSupported.abi";

export class OKXSmartAccountClient<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
  TSigner extends ERC4337SmartAccountSigner = ERC4337SmartAccountSigner,
> {
  protected name: string;
  protected version: string;

  public runtime: Runtime<TTransport, TChain, TSigner>;
  public bundlerUrl: string;
  public paymasterUrl: string;

  constructor(
    okxSmartAccount: OKXSmartAccount<TSigner>,
    clientsUrls?: ClientsUrls,
  ) {
    this.bundlerUrl = clientsUrls?.bundlerUrl ?? configuration.bundlerUrl.okx;
    this.paymasterUrl =
      clientsUrls?.bundlerUrl ?? configuration.paymasterUrl.okx;
    this.runtime = {
      okxSmartAccount: okxSmartAccount,
      userOperationHash: zeroHash,
      userOperation: {
        sender: okxSmartAccount.accountAddress,
        nonce: 0n,
        callData: "0x",
        callGasLimit: 0n,
        verificationGasLimit: 0n,
        preVerificationGas: 0n,
        maxFeePerGas: 0n,
        maxPriorityFeePerGas: 0n,
        signature:
          // a mock signature
          "0x010000000000000000000000000000000000000000000000000000000065f80f5137565d2eb25e3508f7d322d9cf2265ec95ac218945a4eb64fc3d9efe216850dc7e26066839e71d048d3667fd367f5f0532b21075e060a9e4cb0c159c00bf6c121b",
      },
      packedUserOperation: {
        sender: okxSmartAccount.accountAddress,
        nonce: 0n,
        callData: "0x",
        initCode: okxSmartAccount.isDeployed ? "0x" : okxSmartAccount.initCode,
        accountGasLimits: zeroHash as `0x${string & { length: 64 }}`,
        preVerificationGas: 0n,
        gasFees: zeroHash as `0x${string & { length: 64 }}`,
        paymasterAndData: "0x",
        signature: zeroHash,
      },
    };
  }

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

  async send() {
    const simulateUserOperationReq = JSON.stringify({
      id: 1,
      jsonrpc: "2.0",
      method: "eth_simulateUserOperation",
      params: [
        convertToHex(this.runtime.userOperation),
        ENTRYPOINT_ADDRESS_V07,
      ],
    });
    const simulateUserOperationRes = await callClient(
      networkConfigurations.base_url +
        "priapi/v5/wallet/smart-account/mp/42161/eth_simulateUserOperation",
      simulateUserOperationReq,
    );
    if (simulateUserOperationRes.data.error) {
      throw new Error();
    } else {
      const sendUserOperationReq = JSON.stringify({
        id: 1,
        jsonrpc: "2.0",
        method: "eth_sendUserOperation",
        params: [
          convertToHex(this.runtime.userOperation),
          ENTRYPOINT_ADDRESS_V07,
        ],
      });
      const sendUserOperationRes = await callClient(
        networkConfigurations.base_url +
          "priapi/v5/wallet/smart-account/mp/42161/eth_sendUserOperation",
        sendUserOperationReq,
      );
      if (sendUserOperationRes.data.error) {
        throw new Error(String(sendUserOperationRes.data.error.message));
      }
      return sendUserOperationRes.data.result;
    }
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

  async getUOPHash(
    signType: SigType,
    userOperation: PackedUserOperation,
  ): Promise<Hex> {
    // @ts-ignore
    return await this.runtime.okxSmartAccount.signer.publicClient.readContract({
      address: this.runtime.okxSmartAccount.isDeployed
        ? this.runtime.okxSmartAccount.authenticationManagerAddress
        : configuration.v3.AUTHENTICATION_MANAGER_TEMPLATE,
      abi: authenticationManagerABI,
      functionName: "getUOPHash",
      args: [
        signType == "EIP712" ? 0 : 1,
        ENTRYPOINT_ADDRESS_V07,
        userOperation,
      ],
    });
  }

  async getUOPSignedHash(
    signType: SigType,
    userOperation: UserOperation<"v0.6"> | UserOperation<"v0.7">,
  ): Promise<Hex> {
    // @ts-ignore
    return await this.runtime.okxSmartAccount.signer.publicClient.readContract({
      address: this.runtime.okxSmartAccount.isDeployed
        ? this.runtime.okxSmartAccount.authenticationManagerAddress
        : configuration.v3.AUTHENTICATION_MANAGER_TEMPLATE,
      abi: authenticationManagerABI,
      functionName: "getUOPSignedHash",
      args: [
        signType == "EIP712" ? 0 : 1,
        ENTRYPOINT_ADDRESS_V07,
        userOperation,
      ],
    });
  }

  async signAndPack(): Promise<this> {
    if (!this.runtime.sigType) {
      throw new Error("sigType not specified");
    }
    if (!this.runtime.sigTime) {
      throw new Error("sigTime not specified");
    }
    if (this.runtime.sigType == "EIP712") {
      const domain = {
        name: this.runtime.okxSmartAccount.name,
        version: this.runtime.okxSmartAccount.version,
        chainId: await getChainId(
          this.runtime.okxSmartAccount.signer.publicClient,
        ),
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
        sender: this.runtime?.packedUserOperation?.sender as Address,
        nonce: this.runtime?.packedUserOperation?.nonce as bigint,
        initCode: this.runtime?.packedUserOperation?.initCode,
        callData: this.runtime?.packedUserOperation?.callData,
        accountGasLimits: this.runtime?.packedUserOperation?.accountGasLimits,
        preVerificationGas:
          this.runtime?.packedUserOperation?.preVerificationGas,
        gasFees: this.runtime?.packedUserOperation?.gasFees,
        paymasterAndData: this.runtime?.packedUserOperation?.paymasterAndData,
        EntryPoint: ENTRYPOINT_ADDRESS_V07,
        sigTime: this.runtime.sigTime,
      };
      const signature = await this.runtime.okxSmartAccount.signer.signTypedData(
        {
          account: this.runtime.okxSmartAccount.accountAddress,
          domain: domain,
          types: types,
          message: value,
          primaryType: "SignMessage",
        },
      );
      this.runtime.packedUserOperation.signature = encodePacked(
        ["uint8", "uint256", "bytes"],
        [0, this.runtime.sigTime, signature],
      );
    } else {
      if (!this.runtime.userOperation) {
        throw new Error("UserOperation not provided");
      }
      this.runtime.userOperation.signature = encodePacked(
        ["uint8", "uint256", "bytes"],
        [
          1,
          this.runtime.sigTime,
          await this.runtime.okxSmartAccount.signer.signMessage(
            this.runtime.userOperationHash,
          ),
        ],
      );
    }
    return this;
  }

  // overrides some gaslimits and gas estimation
  async proposeTx(
    sigType: SigType,
    packTxMiddlewareOverride?: PackTxMiddlewareOverride,
  ): Promise<this> {
    this.runtime.sigType = sigType;
    if (!this.runtime.userOperation.callData) {
      throw new Error("callData is not provided");
    }
    this.runtime.userOperation.factory = (
      (await isSmartAccountDeployed(
        this.runtime.okxSmartAccount.signer.publicClient,
        this.runtime.okxSmartAccount.accountAddress,
      ))
        ? "0x"
        : this.runtime.okxSmartAccount.initCode.slice(0, 42)
    ) as Hex;
    this.runtime.userOperation.factoryData = (
      (await isSmartAccountDeployed(
        this.runtime.okxSmartAccount.signer.publicClient,
        this.runtime.okxSmartAccount.accountAddress,
      ))
        ? "0x"
        : "0x" + this.runtime.okxSmartAccount.initCode.slice(42)
    ) as Hex;
    this.runtime.userOperation.nonce = await this.getNonce();
    await this.gasEstimation(
      this.runtime.userOperation,
      packTxMiddlewareOverride,
    );
    this.runtime.packedUserOperation.sender = this.runtime.userOperation.sender;
    this.runtime.packedUserOperation.nonce = this.runtime.userOperation.nonce;
    this.runtime.packedUserOperation.preVerificationGas =
      this.runtime.userOperation.preVerificationGas;
    this.runtime.packedUserOperation.callData =
      this.runtime.userOperation.callData;
    // verificationGasLimit high 128, callGasLimit low 128
    this.runtime.packedUserOperation.accountGasLimits = compileBigInt(
      packTxMiddlewareOverride?.gasEstimationOverride?.verificationGasLimit ??
        this.runtime.userOperation.verificationGasLimit,
      packTxMiddlewareOverride?.gasEstimationOverride?.callGasLimit ??
        this.runtime.userOperation.callGasLimit,
    );
    // maxPriorityFee high 128, maxFeePerGas low 128
    this.runtime.packedUserOperation.gasFees = compileBigInt(
      this.runtime.userOperation.maxPriorityFeePerGas,
      this.runtime.userOperation.maxFeePerGas,
    );
    if (this.runtime.rawPaymaster) {
      await getPaymasterAndData(this);
    }
    const sigTime =
      packTxMiddlewareOverride?.sigTimeOverride ??
      (await getSigTime(this.runtime.okxSmartAccount.signer.publicClient));
    this.runtime.packedUserOperation.signature = encodePacked(
      ["uint8", "uint256"],
      [sigType == "EIP712" ? 0 : 1, sigTime],
    );
    this.runtime.userOperationHash = await this.getUOPHash(
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
    const baseFeePerPrice =
      await this.runtime.okxSmartAccount.signer.publicClient.getGasPrice();
    const maxPriorityFeePerGas =
      await this.runtime.okxSmartAccount.signer.publicClient.estimateMaxPriorityFeePerGas();
    const defaultGasFeeCap = baseFeePerPrice + maxPriorityFeePerGas;
    this.runtime.userOperation.maxPriorityFeePerGas =
      packTxMiddlewareOverride?.feeDataOverride?.maxPriorityFeePerGas ??
      defaultGasFeeCap;
    this.runtime.userOperation.maxFeePerGas =
      packTxMiddlewareOverride?.feeDataOverride?.maxFeePerGas ??
      defaultGasFeeCap;
    if (this.runtime.rawPaymaster?.paymasterAddress) {
      this.runtime.userOperation.paymaster =
        this.runtime.rawPaymaster.paymasterAddress;
      this.runtime.userOperation.paymasterVerificationGasLimit =
        this.runtime.rawPaymaster.paymasterVerificationGasLimit ?? 0n;
      this.runtime.userOperation.paymasterPostOpGasLimit =
        this.runtime.rawPaymaster.paymasterPostOpGasLimit ?? 0n;
      // mod(uint8) + bizId(uint64)
      this.runtime.userOperation.paymasterData = "0x000000000000000000";
      // @ts-ignore
      // this.runtime.userOperation.paymasterAndData = this.runtime.rawPaymaster.paymasterAddress + "0000"
    }
    const payload = [
      convertToHex(this.runtime.userOperation),
      ENTRYPOINT_ADDRESS_V07,
    ];
    const data = JSON.stringify({
      id: 1,
      jsonrpc: "2.0",
      method: "eth_estimateUserOperationGas",
      params: payload,
    });
    const gasEstimationRes = await callClient(
      networkConfigurations.base_url +
        "priapi/v5/wallet/smart-account/mp/42161/eth_estimateUserOperationGas",
      data,
    );
    if (gasEstimationRes.data.error) {
      throw new GasEstimationError(
        "GAS_ESTIMATION_ERROR",
        gasEstimationRes.data.error.message,
      );
    }
    userOperation.preVerificationGas =
      packTxMiddlewareOverride?.gasEstimationOverride?.preVerificationGas ??
      BigInt(gasEstimationRes.data.result.preVerificationGas);
    userOperation.verificationGasLimit =
      packTxMiddlewareOverride?.gasEstimationOverride?.verificationGasLimit ??
      BigInt(gasEstimationRes.data.result.verificationGasLimit);
    userOperation.callGasLimit =
      packTxMiddlewareOverride?.gasEstimationOverride?.callGasLimit ??
      BigInt(gasEstimationRes.data.result.callGasLimit);
    if (this.runtime.rawPaymaster?.paymasterAddress) {
      userOperation.paymasterVerificationGasLimit =
        this.runtime.rawPaymaster?.paymasterVerificationGasLimit ??
        BigInt(gasEstimationRes.data.result.paymasterVerificationGasLimit);
      userOperation.paymasterPostOpGasLimit =
        this.runtime.rawPaymaster?.paymasterPostOpGasLimit ??
        BigInt(gasEstimationRes.data.result.paymasterPostOpGasLimit);
    }
    // if the layer2
    // TODO: layer scenario
    let preVerificationGas: bigint;
    if (
      gasEstimationRes.data.result &&
      gasEstimationRes.data.result.l1GasLimit
    ) {
      const l1publicClient = createPublicClient({
        chain: mainnet,
        transport: http("https://eth.llamarpc.com"),
      });
      const l1Fee = await l1publicClient.getGasPrice();
      preVerificationGas =
        this.runtime.userOperation.preVerificationGas ??
        hexToBigInt(gasEstimationRes.data.result.preVerificationGas) +
          (hexToBigInt(gasEstimationRes.data.result.l1GasLimit) * l1Fee) /
            defaultGasFeeCap;
    } else {
      preVerificationGas = BigInt(
        gasEstimationRes.data.result.preVerificationGas,
      );
    }
    userOperation.preVerificationGas =
      packTxMiddlewareOverride?.gasEstimationOverride?.preVerificationGas ??
      configuration.defaultGasConfig.PREVERIFICATION_GAS;
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
