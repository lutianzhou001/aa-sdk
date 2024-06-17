import {
  BaseSmartContractAccount,
  DeploymentState,
} from "./BaseSmartContractAccount";
import { IPaymasterClient } from "../okxPaymaster/interfaces/IPaymaster";
import { IBundlerClient } from "../okxBundler/interfaces/IBundler";
import {
  BuildUserOpParams,
  ExecuteCallDataArgs,
  ExecutionMode,
  OKXSmartContractAccountConstructorParams,
  OKXSmartContractAccountCreationParams,
  PackTxMiddlewareOverride,
  PaymasterMode,
  SigType,
} from "./utils/types";
import { BundlerClient } from "../okxBundler/bundler";
import { PaymasterClient } from "../okxPaymaster/paymaster";
import {
  Address,
  createPublicClient,
  encodeAbiParameters,
  encodeFunctionData,
  encodePacked,
  Hash,
  Hex,
  hexToBigInt,
  http,
  keccak256,
  padHex,
  toHex,
  zeroAddress,
  zeroHash,
} from "viem";
import {
  cleanup,
  compileMode,
  getSigTime,
  predictDeterministicAddress,
} from "../common/utils";
import { smartAccountV3ABI } from "../../abis/smartAccountV3.abi";
import { authenticationManagerABI } from "../../abis/authenticationManager.abi";
import { ENTRYPOINT_ADDRESS_V07, getPackedUserOperation } from "permissionless";
import { initializeAccountABI } from "../../abis/initializeAccount.abi";
import { accountFactoryV3ABI } from "../../abis/accountFactoryV3.abi";
import { UserOperation } from "permissionless/types/userOperation";
import { getChainId } from "viem/actions";
import {
  AUTHENTICATION_MANAGER_TEMPLATE,
  DEFAULT_SMART_ACCOUNT_TEMPLATE,
  FACTORY_ADDRESS,
} from "./utils/constants";
import { Chain, mainnet } from "viem/chains";
import { randomBytes } from "node:crypto";
import { BaseError } from "../common/error";

export class OKXSmartContractAccount extends BaseSmartContractAccount {
  name: string;
  version: string;

  bundlerClient: IBundlerClient;
  paymasterClient?: IPaymasterClient;
  authenticationManagerAddress: Address;
  authenticationManagerTemplateAddress: Address;
  validatorAddress: Address;

  constructor(params: OKXSmartContractAccountConstructorParams) {
    super(params);

    this.authenticationManagerAddress = params.authenticationManagerAddress;
    this.validatorAddress = params.validatorAddress;
    this.bundlerClient = params.bundlerClient;
    this.paymasterClient = params.paymasterClient;

    this.authenticationManagerTemplateAddress =
      params.authenticationManagerTemplate;

    this.name = params.name;
    this.version = params.version;
  }

  public static async create(
    params: OKXSmartContractAccountCreationParams,
  ): Promise<OKXSmartContractAccount> {
    const bundlerClient =
      params.bundlerClientConfig.bundlerClient ??
      new BundlerClient(
        params.bundlerClientConfig.bundlerUrl as string,
        params.rpcProvider.chain as Chain,
      );

    const initializeData = encodeAbiParameters(initializeAccountABI[0].inputs, [
      await params.signer.getSubject(),
      params.signer.signerTemplate,
      [],
    ]);

    const initializeAccountData = encodeFunctionData({
      abi: smartAccountV3ABI,
      functionName: "initializeAccount",
      args: [initializeData],
    });

    const accountInitCode = encodePacked(
      ["address", "bytes"],
      [
        params.factoryAddress ?? FACTORY_ADDRESS,
        encodeFunctionData({
          abi: accountFactoryV3ABI,
          functionName: "createAccount",
          args: [
            params.smartAccountTemplate ?? DEFAULT_SMART_ACCOUNT_TEMPLATE,
            initializeAccountData,
            params.index ?? 0n,
          ],
        }),
      ],
    );

    // const initCode = await bundlerClient.getInitCode(
    //   137,
    //   params.factoryAddress ?? FACTORY_ADDRESS,
    //   Number(params.index) ?? 0,
    //   params.smartAccountTemplate ?? DEFAULT_SMART_ACCOUNT_TEMPLATE,
    //   await params.signer.getSubject(),
    //   params.signer.signerTemplate ?? ECDSA_VALIDATOR_TEMPLATE,
    // );

    const accountAddress: Address = (await params.rpcProvider.readContract({
      address: params.factoryAddress ?? (FACTORY_ADDRESS as Address),
      abi: accountFactoryV3ABI,
      functionName: "computeAddress",
      args: [zeroAddress, initializeAccountData, params.index ?? 0n],
    })) as Address;

    const authenticationManagerTemplate =
      params.authenticationManagerTemplate ??
      (AUTHENTICATION_MANAGER_TEMPLATE as Address);

    const authenticationManagerAddress: Address = predictDeterministicAddress(
      authenticationManagerTemplate,
      keccak256(toHex(params.version)) as Hex,
      accountAddress,
    );

    const validatorAddress: Address = predictDeterministicAddress(
      params.signer.signerTemplate,
      keccak256(encodePacked(["bytes"], [await params.signer.getSubject()])),
      authenticationManagerAddress,
    );

    const commonParams = {
      ...params,
      accountAddress,
      bundlerClient,
      authenticationManagerAddress,
      validatorAddress,
      initCode: accountInitCode,
      factoryAddress: params.factoryAddress ?? FACTORY_ADDRESS,
      authenticationManagerTemplate,
      name: params.name,
      version: params.version,
    };

    if (params.paymasterClientConfig) {
      const paymasterClient =
        params.paymasterClientConfig.paymasterClient ??
        new PaymasterClient(
          params.paymasterClientConfig.paymasterUrl as string,
          params.rpcProvider.chain as Chain,
        );

      return new OKXSmartContractAccount({
        ...commonParams,
        paymasterClient,
      });
    } else {
      return new OKXSmartContractAccount(commonParams);
    }
  }

  override async encodeExecute(
    args: ExecuteCallDataArgs,
    execMode?: ExecutionMode,
  ): Promise<Hex> {
    // execute call
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
    } else if (args == "0x") {
      callDataToEntryPoint = "0x";
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
    return callDataToEntryPoint;
  }

  /**
   * get the uopHash onchain
   *
   * @param signType the type of the signature
   * @param userOperation the userOperation
   */
  async getUOPHash(
    signType: SigType,
    userOperation: UserOperation<"v0.7">,
  ): Promise<Hex> {
    const deploymentState: DeploymentState = await this.getDeploymentState();
    return (await this.rpcProvider.readContract({
      address:
        deploymentState == DeploymentState.DEPLOYED
          ? this.authenticationManagerAddress
          : this.authenticationManagerTemplateAddress,
      abi: authenticationManagerABI,
      functionName: "getUOPHash",
      args: [
        signType === "EIP712" ? 0 : 1,
        ENTRYPOINT_ADDRESS_V07,
        getPackedUserOperation(userOperation),
      ],
    })) as Hex;
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
    const deploymentState: DeploymentState = await this.getDeploymentState();
    return (await this.rpcProvider.readContract({
      address:
        deploymentState == DeploymentState.DEPLOYED
          ? this.authenticationManagerAddress
          : this.authenticationManagerTemplateAddress,
      abi: authenticationManagerABI,
      functionName: "getUOPSignedHash",
      args: [
        signType === "EIP712" ? 0 : 1,
        ENTRYPOINT_ADDRESS_V07,
        userOperation,
      ],
    })) as Hex;
  }

  override async getPaymasterAndData(
    userOp: UserOperation<"v0.7">,
  ): Promise<Hex> {
    if (!this.paymasterClient) {
      throw new Error("Paymaster client not set");
    }
    const getPaymasterSignatureRes =
      await this.paymasterClient.getPaymasterData(userOp);
    return getPaymasterSignatureRes.data.result;
  }

  public async gasEstimation(
    userOperation: UserOperation<"v0.7">,
    packTxMiddlewareOverride?: PackTxMiddlewareOverride,
  ): Promise<UserOperation<"v0.7">> {
    const baseFeePerPrice = await this.rpcProvider.getGasPrice();
    const maxPriorityFeePerGas =
      await this.rpcProvider.estimateMaxPriorityFeePerGas();

    const preEstimation = {
      ...userOperation,
      maxPriorityFeePerGas:
        packTxMiddlewareOverride?.feeDataOverride?.maxPriorityFeePerGas ??
        baseFeePerPrice + maxPriorityFeePerGas,
      maxFeePerGas:
        packTxMiddlewareOverride?.feeDataOverride?.maxFeePerGas ??
        baseFeePerPrice,
      signature: this.getDummySignature(),
    };

    const result =
      await this.bundlerClient.estimateUserOperationGas(preEstimation);

    let preVerificationGas: bigint;
    // layer2 prediction
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

    return {
      ...preEstimation,
      preVerificationGas:
        packTxMiddlewareOverride?.gasEstimationOverride?.preVerificationGas ??
        preVerificationGas,
      verificationGasLimit:
        packTxMiddlewareOverride?.gasEstimationOverride?.verificationGasLimit ??
        BigInt(result.verificationGasLimit),
      callGasLimit:
        packTxMiddlewareOverride?.gasEstimationOverride?.callGasLimit ??
        BigInt(result.callGasLimit),
      paymasterVerificationGasLimit: userOperation.paymaster
        ? packTxMiddlewareOverride?.gasEstimationOverride
            ?.paymasterVerificationGasLimit ??
          BigInt(result.paymasterVerificationGasLimit)
        : undefined,
      paymasterPostOpGasLimit: userOperation.paymaster
        ? packTxMiddlewareOverride?.gasEstimationOverride
            ?.postVerificationGasLimit ?? BigInt(result.paymasterPostOpGasLimit)
        : undefined,
    };
  }

  /**
   * get the uopSigned hash(not used currently)
   */
  override async signUserOperation(
    userOperation: UserOperation<"v0.7">,
    sigType: SigType,
    sigTime?: bigint,
  ): Promise<Hex> {
    if (!this.accountAddress) {
      throw new BaseError("SIGN_UOP_ERROR", "ACCOUNT_ADDRESS_NOT_FOUND");
    }
    const _sigTime = sigTime ?? (await getSigTime(this.rpcProvider));
    let signatureFromSigner: Hex;
    if (sigType === SigType.EIP712) {
      const packedUserOperation = getPackedUserOperation(
        cleanup(userOperation),
      );
      const domain = {
        name: this.name,
        version: this.version,
        chainId: await getChainId(this.rpcProvider),
        verifyingContract: this.authenticationManagerTemplateAddress as Address,
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
        sender: packedUserOperation.sender as Address,
        nonce: packedUserOperation.nonce as bigint,
        initCode: packedUserOperation.initCode,
        callData: packedUserOperation.callData,
        accountGasLimits: packedUserOperation.accountGasLimits,
        preVerificationGas: packedUserOperation.preVerificationGas,
        gasFees: packedUserOperation.gasFees,
        paymasterAndData: packedUserOperation.paymasterAndData,
        EntryPoint: ENTRYPOINT_ADDRESS_V07,
        sigTime: _sigTime,
      };
      signatureFromSigner = (await this.signTypedData({
        account: this.accountAddress,
        domain: domain,
        types: types,
        message: value,
        primaryType: "SignMessage",
      })) as Hex;
    } else {
      signatureFromSigner = await this.signUserOperationHash(
        await this.getUOPHash(sigType, {
          ...cleanup(userOperation),
          signature: encodePacked(
            ["uint8", "uint256"],
            // @ts-ignore
            [sigType === SigType.EIP712 ? 0 : 1, _sigTime],
          ),
        }),
      );
    }
    return encodePacked(
      ["uint8", "uint256", "bytes"],
      [sigType === SigType.EIP712 ? 0 : 1, _sigTime, signatureFromSigner],
    );
  }

  async buildUserOp(params: BuildUserOpParams): Promise<UserOperation<"v0.7">> {
    this.checkBuildUserOpParams(params);
    await this.getDeploymentState();
    if (!this.accountAddress) {
      throw new BaseError("BUILD_USER_OP_ERROR", "ACCOUNT_ADDRESS_NOT_FOUND");
    }
    const factoryAndFactoryData =
      await this.parseFactoryAddressFromAccountInitCode();
    const userOp: UserOperation<"v0.7"> = {
      factory:
        this.deploymentState === DeploymentState.DEPLOYED
          ? "0x"
          : factoryAndFactoryData[0],
      factoryData:
        this.deploymentState === DeploymentState.DEPLOYED
          ? "0x"
          : factoryAndFactoryData[1],
      sender: this.accountAddress,
      nonce: await this.getNonce(
        BigInt(String(this.validatorAddress) + "0000000000000000"),
      ),
      callData: await this.encodeExecute(params.args, params.execMode),
      callGasLimit: 0n,
      verificationGasLimit: 0n,
      preVerificationGas: 0n,
      maxFeePerGas: 0n,
      maxPriorityFeePerGas: 0n,
      signature: zeroHash,
      paymaster: params.paymasterRawData?.paymasterAddress ?? undefined,
      paymasterVerificationGasLimit: params.paymasterRawData?.paymasterAddress
        ? 0n
        : undefined,
      paymasterPostOpGasLimit: params.paymasterRawData?.paymasterAddress
        ? 0n
        : undefined,
      paymasterData: params.paymasterRawData?.paymasterAddress
        ? ((params.paymasterRawData?.paymasterToken
            ? "0x01"
            : "0x00" + "0000000000000000") as Hex)
        : undefined,
    };
    let uopToSign: UserOperation<"v0.7">;
    const gasEstimationRes = await this.gasEstimation(
      userOp,
      params.packTxMiddlewareOverrider,
    );
    if (params.paymasterRawData?.paymasterAddress) {
      const paymasterAddressAndData =
        await this.parsePaymasterAddressFromPaymasterAndData(gasEstimationRes);
      uopToSign = {
        ...gasEstimationRes,
        paymaster: paymasterAddressAndData[0],
        paymasterData: paymasterAddressAndData[1],
      };
    } else {
      uopToSign = gasEstimationRes;
    }
    return {
      ...uopToSign,
      signature: await this.signUserOperation(
        uopToSign,
        params.sigType ?? SigType.EIP712,
        params.sigTime,
      ),
    };
  }

  async sendUserOp(userOperation: UserOperation<"v0.7">): Promise<any> {
    const cleanedUop = cleanup(userOperation);
    await this.bundlerClient.simulateUserOperation(cleanedUop);
    return await this.bundlerClient.sendUserOperation(cleanedUop);
  }

  override getAccountInitCode(): Promise<Hex> {
    if (!this.accountInitCode) {
      throw new BaseError("GET_ACCOUNT_INIT_CODE_ERROR", "NOT_FOUND");
    }
    return Promise.resolve(this.accountInitCode);
  }

  override getDummySignature(): Hash {
    return ("0x01" +
      padHex("0xffffffff").slice(2) +
      toHex(randomBytes(65)).slice(2)) as Hex;
  }

  private checkBuildUserOpParams(params: BuildUserOpParams) {
    if (
      params.paymasterRawData?.paymasterMode == PaymasterMode.TOKEN_MODE &&
      !params.paymasterRawData?.paymasterToken
    ) {
      throw new BaseError("CHECK_PARAMS_ERROR", "Token address is required");
    }
    if (params.paymasterRawData && !this.paymasterClient) {
      throw new BaseError("CHECK_PARAMS_ERROR", "Paymaster client is not set");
    }
  }
}
