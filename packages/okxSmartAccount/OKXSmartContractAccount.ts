import {BaseSmartContractAccount, DeploymentState,} from "./BaseSmartContractAccount";
import {IPaymasterClient} from "../okxPaymaster/interfaces/IPaymaster";
import {IBundlerClient} from "../okxBundler/interfaces/IBundler";
import {
  BuildUserOpParams,
  ExecuteCallDataArgs,
  ExecutionModeOverrides,
  OKXSmartContractAccountConstructorParams,
  OKXSmartContractAccountCreationParams,
  PaymasterMode,
  SigType,
  UopAndPaymasterOverrides,
  UserOperationOverrides,
} from "./types";
import {BundlerClient} from "../okxBundler/bundler";
import {PaymasterClient} from "../okxPaymaster/paymaster";
import {
  Address,
  createPublicClient,
  encodeAbiParameters,
  encodeFunctionData,
  encodePacked,
  fromHex,
  Hash,
  Hex,
  hexToBigInt,
  http,
  isHex,
  keccak256,
  padHex,
  RpcTransactionRequest,
  toHex,
  zeroAddress,
  zeroHash,
} from "viem";
import {bigIntMax, cleanup, compileMode, getSigTime, predictDeterministicAddress,} from "../common/utils";
import {smartAccountV3ABI} from "../../abis/smartAccountV3.abi";
import {authenticationManagerABI} from "../../abis/authenticationManager.abi";
import {ENTRYPOINT_ADDRESS_V07, getPackedUserOperation} from "permissionless";
import {initializeAccountABI} from "../../abis/initializeAccount.abi";
import {accountFactoryV3ABI} from "../../abis/accountFactoryV3.abi";
import {UserOperation} from "permissionless/types/userOperation";
import {getChainId} from "viem/actions";
import {AUTHENTICATION_MANAGER_TEMPLATE, DEFAULT_SMART_ACCOUNT_TEMPLATE, FACTORY_ADDRESS,} from "../common/constants";
import {Chain, mainnet} from "viem/chains";
import {randomBytes} from "node:crypto";
import {BaseError} from "../common/error";

export class OKXSmartContractAccount extends BaseSmartContractAccount {
  name: string;
  version: string;

  bundlerClient: IBundlerClient;
  paymasterClient?: IPaymasterClient;
  authenticationManagerAddress: Address;
  authenticationManagerTemplateAddress: Address;
  smartAccountTemplate: Address;
  validatorAddress: Address;

  constructor(params: OKXSmartContractAccountConstructorParams) {
    super(params);

    this.authenticationManagerAddress = params.authenticationManagerAddress;
    this.validatorAddress = params.validatorAddress;
    this.bundlerClient = params.bundlerClient;
    this.paymasterClient = params.paymasterClient;

    this.authenticationManagerTemplateAddress =
      params.authenticationManagerTemplate;
    this.smartAccountTemplate = params.smartAccountTemplate;

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

    const smartAccountTemplate =
      params.smartAccountTemplate ??
      (DEFAULT_SMART_ACCOUNT_TEMPLATE as Address);

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
      smartAccountTemplate,
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
    executionModeOverrides?: ExecutionModeOverrides,
  ): Promise<Hex> {
    // execute call
    let callDataToEntryPoint: Hex;
    const mode = compileMode(
      Array.isArray(args),
      executionModeOverrides ?? { allowFailedExecution: false, try: false },
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
    } else if (isHex(args)) {
      callDataToEntryPoint = args;
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
   * @param sigType the type of the signature
   * @param userOperation the userOperation
   */
  async getUOPHash(
    sigType: SigType,
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
        sigType === SigType.EIP712 ? 0 : 1,
        ENTRYPOINT_ADDRESS_V07,
        getPackedUserOperation(userOperation),
      ],
    })) as Hex;
  }

  /**
   * get the uopSigned hash(not used currently)
   *
   * @param sigType the type of the signature
   * @param userOperation the userOperation
   */
  async getUOPSignedHash(
    sigType: SigType,
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
        sigType === SigType.EIP712 ? 0 : 1,
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
    uopAndPaymasterOverrides?: UopAndPaymasterOverrides,
  ): Promise<UserOperation<"v0.7">> {
    const baseFeePerPrice = await this.rpcProvider.getGasPrice();
    const maxPriorityFeePerGas =
      await this.rpcProvider.estimateMaxPriorityFeePerGas();

    const preEstimation = {
      ...userOperation,
      maxPriorityFeePerGas:
        uopAndPaymasterOverrides?.maxPriorityFeePerGas ?? maxPriorityFeePerGas,
      maxFeePerGas: uopAndPaymasterOverrides?.maxFeePerGas ?? baseFeePerPrice,
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
        uopAndPaymasterOverrides?.preVerificationGas ?? preVerificationGas,
      verificationGasLimit:
        uopAndPaymasterOverrides?.verificationGasLimit ??
        BigInt(result.verificationGasLimit),
      callGasLimit:
        uopAndPaymasterOverrides?.callGasLimit ?? BigInt(result.callGasLimit),
      paymasterVerificationGasLimit: userOperation.paymaster
        ? uopAndPaymasterOverrides?.paymasterVerificationGasLimit ??
          BigInt(result.paymasterVerificationGasLimit)
        : undefined,
      paymasterPostOpGasLimit: userOperation.paymaster
        ? uopAndPaymasterOverrides?.paymasterPostOpGasLimit ??
          BigInt(result.paymasterPostOpGasLimit)
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

  async buildUserOpFromTxs(
    requests: RpcTransactionRequest[],
    overrides?: UopAndPaymasterOverrides,
  ) {
    const batch = requests.map((request) => {
      if (!request.to) {
        throw new Error(
          "one transaction in the batch is missing a target address",
        );
      }

      return {
        to: request.to,
        data: request.data ?? "0x",
        value: request.value ? fromHex(request.value, "bigint") : 0n,
      };
    });

    const maxFeePerGasOverridesInTx = () =>
      requests
        .filter((x) => x.maxFeePerGas != null)
        .map((x) => fromHex(x.maxFeePerGas!, "bigint"));
    const maxFeePerGas =
      overrides?.maxFeePerGas != null
        ? overrides?.maxFeePerGas
        : maxFeePerGasOverridesInTx().length > 0
          ? bigIntMax(...maxFeePerGasOverridesInTx())
          : undefined;

    const maxPriorityFeePerGasOverridesInTx = () =>
      requests
        .filter((x) => x.maxPriorityFeePerGas != null)
        .map((x) => fromHex(x.maxPriorityFeePerGas!, "bigint"));
    const maxPriorityFeePerGas =
      overrides?.maxPriorityFeePerGas != null
        ? overrides?.maxPriorityFeePerGas
        : maxPriorityFeePerGasOverridesInTx().length > 0
          ? bigIntMax(...maxPriorityFeePerGasOverridesInTx())
          : undefined;

    const _overrides: UserOperationOverrides = {
      ...overrides,
      maxFeePerGas,
      maxPriorityFeePerGas,
    };

    return this.buildUserOp({
      args: batch,
      uopAndPaymasterOverrides: cleanup(_overrides),
    });
  }

  async buildUserOpFromTx(
    request: RpcTransactionRequest,
    overriders?: UopAndPaymasterOverrides,
  ) {
    if (!request.to) {
      throw new BaseError("BUILD_USER_OP_ERROR", "missing to address");
    }
    const _overrides: UopAndPaymasterOverrides = {
      ...overriders,
      maxFeePerGas:
        overriders?.maxFeePerGas != null
          ? overriders?.maxFeePerGas
          : request.maxFeePerGas
            ? fromHex(request.maxFeePerGas, "bigint")
            : undefined,
      maxPriorityFeePerGas:
        overriders?.maxPriorityFeePerGas != null
          ? overriders?.maxPriorityFeePerGas
          : request.maxPriorityFeePerGas
            ? fromHex(request.maxPriorityFeePerGas, "bigint")
            : undefined,
    };
    cleanup(_overrides);
    return this.buildUserOp({
      args: {
        to: request.to as Address,
        value: request.value ? fromHex(request.value, "bigint") : 0n,
        data: request.data ?? "0x",
      },
      uopAndPaymasterOverrides: cleanup(_overrides),
    });
  }

  async buildUserOp(params: BuildUserOpParams): Promise<UserOperation<"v0.7">> {
    this.checkBuildUserOpParams(params);
    await this.getDeploymentState();
    if (!this.accountAddress) {
      throw new BaseError("BUILD_USER_OP_ERROR", "ACCOUNT_ADDRESS_NOT_FOUND");
    }
    const factoryAndFactoryData =
      await this.parseFactoryAddressAndData();
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
      nonce: await this.getNonce(BigInt(this.validatorAddress)),
      callData: await this.encodeExecute(params.args, params.execModeOverrides),
      callGasLimit: 0n,
      verificationGasLimit: 0n,
      preVerificationGas: 0n,
      maxFeePerGas: 0n,
      maxPriorityFeePerGas: 0n,
      signature: zeroHash,
      paymaster: params.uopAndPaymasterOverrides?.paymasterAddress ?? undefined,
      paymasterVerificationGasLimit: params.uopAndPaymasterOverrides
        ?.paymasterAddress
        ? 0n
        : undefined,
      paymasterPostOpGasLimit: params.uopAndPaymasterOverrides?.paymasterAddress
        ? 0n
        : undefined,
      // TODO: "0000000000000000" is the bizId, may move the the paymaster url in the next version
      paymasterData: params.uopAndPaymasterOverrides?.paymasterAddress
        ? ((params.uopAndPaymasterOverrides?.paymasterToken
            ? "0x01"
            : "0x00" + "0000000000000000") as Hex)
        : undefined,
    };
    let uopToSign: UserOperation<"v0.7">;
    const gasEstimationRes = await this.gasEstimation(
      userOp,
      params.uopAndPaymasterOverrides,
    );
    if (params.uopAndPaymasterOverrides?.paymasterAddress) {
      const paymasterAddressAndData =
        await this.parsePaymasterAddressAndData(gasEstimationRes);
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

  async sendTransaction(
    request: RpcTransactionRequest,
    overrides?: UopAndPaymasterOverrides,
  ) {
    const builtUop = await this.buildUserOpFromTx(request, overrides);
    return await this.sendUserOp(builtUop);
  }

  async sendTransactions(
    requests: RpcTransactionRequest[],
    overrides?: UopAndPaymasterOverrides,
  ) {
    const builtUop = await this.buildUserOpFromTxs(requests, overrides);
    return await this.sendUserOp(builtUop);
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
      params.uopAndPaymasterOverrides?.paymasterMode ==
        PaymasterMode.TOKEN_MODE &&
      !params.uopAndPaymasterOverrides?.paymasterToken
    ) {
      throw new BaseError("CHECK_PARAMS_ERROR", "Token address is required");
    }
    if (params.uopAndPaymasterOverrides && !this.paymasterClient) {
      throw new BaseError("CHECK_PARAMS_ERROR", "Paymaster client is not set");
    }
  }
}
