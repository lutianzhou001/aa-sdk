import {
  BaseSmartContractAccount,
  DeploymentState,
} from "./BaseSmartContractAccount";
import { IBundlerClient } from "../okxBundler/interfaces/IBundler";
import {
  BuildUserOpParams,
  ExecuteCallDataArgs,
  ExecutionModeOverrides,
  OKXSmartContractAccountConstructorParams,
  OKXSmartContractAccountCreationFromSDKParams,
  OKXSmartContractAccountCreationParams,
  OKXSmartContractAccountSDKParams,
  PaymasterMode,
  SigType,
  UopAndPaymasterOverrides,
  UserOperationOverrides,
} from "./types";
import { BundlerClient } from "../okxBundler/bundler";
import { PaymasterClient } from "../okxPaymaster/paymaster";
import {
  Address,
  createPublicClient,
  encodeAbiParameters,
  encodeFunctionData,
  encodePacked,
  fromHex,
  Hex,
  hexToBigInt,
  http,
  isHex,
  keccak256,
  PublicClient,
  RpcTransactionRequest,
  toHex,
  zeroAddress,
  zeroHash,
} from "viem";
import {
  bigIntMax,
  cleanup,
  compileMode,
  getConfig,
  getSigTime,
  predictDeterministicAddress,
} from "../common/utils";
import {
  accountFactoryV3Abi,
  authenticationManagerAbi,
  initializeAccountAbi,
  smartAccountV3Abi,
  validatorAbi,
} from "../../abis";
import { ENTRYPOINT_ADDRESS_V07, getPackedUserOperation } from "permissionless";
import { UserOperation } from "permissionless/types/userOperation";
import { getChainId } from "viem/actions";
import { Chain, mainnet } from "viem/chains";
import { BaseError, PaymasterError } from "../common/error";
import { supportedChains } from "../common/constants";
import { IPaymasterClient } from "../okxPaymaster/interfaces/IPaymaster";

export class OKXSmartAccountSDK {
  bundlerClientUrl: string;
  paymasterClientUrl?: string;
  mainnetClientUrl?: string;
  rpcUrl?: string;
  constructor(params: OKXSmartContractAccountSDKParams) {
    this.bundlerClientUrl = params.bundlerClientUrl;
    this.paymasterClientUrl = params.paymasterClientUrl;
    this.mainnetClientUrl = params.mainnetClientUrl;
    this.rpcUrl = params.rpcUrl;
  }
  async createOKXSmartContractAccount(
    params: OKXSmartContractAccountCreationFromSDKParams,
  ) {
    return await OKXSmartContractAccount.create({
      signer: params.signer,
      chain: params.chain,
      index: params.index,
      smartAccountAddress: params.smartAccountAddress,
      version: params.version,
      factoryAddress: params.factoryAddress,
      smartAccountTemplate: params.smartAccountTemplate,
      authenticationManagerTemplate: params.authenticationManagerTemplate,
      mainnetClientRpcUrl: this.mainnetClientUrl,
      bundlerClient: this.bundlerClientUrl,
      paymasterClient: this.paymasterClientUrl,
      rpcUrl: this.rpcUrl,
    });
  }
}

export class OKXSmartContractAccount extends BaseSmartContractAccount {
  version: string;

  bundlerClient: IBundlerClient;
  paymasterClient?: IPaymasterClient;
  authenticationManagerAddress: Address;
  authenticationManagerTemplateAddress: Address;
  smartAccountTemplate: Address;
  validatorAddress: Address;

  mainnetRpcProvider?: PublicClient;

  constructor(params: OKXSmartContractAccountConstructorParams) {
    super(params);

    this.authenticationManagerAddress = params.authenticationManagerAddress;
    this.validatorAddress = params.validatorAddress;
    this.bundlerClient = params.bundlerClient;
    this.paymasterClient = params.paymasterClient;

    this.authenticationManagerTemplateAddress =
      params.authenticationManagerTemplate;
    this.smartAccountTemplate = params.smartAccountTemplate;

    this.version = params.version ?? "3.0.2";

    this.mainnetRpcProvider = params.mainnetRpcProvider;
  }

  /**
   * Creates a OKXSmartContractClient with the params of OKXSmartContractAccountCreationParams.
   *
   * - Docs: TODO: to impl
   *
   * A OKXSmartContractClient is a client that can be used to interact with a blockchain with the standard of ERC4337
   *
   * @param params - OKXSmartContractAccountCreationParams
   * @returns A OKXSmartContractAccount
   *
   * @example
   * // JSON-RPC Account
   * const okxSmartContractAccount = await OKXSmartContractAccount.create({
   *   rpcProvider: publicClient,
   *   signer: new walletClientAASigner(walletClient),
   *   name: "SmartAccount",
   *   version: "3.0.2"
   *   // put any index you want. using index an owner can create multiply accounts as you like, if you miss this index, it will set default to 0.
   *   index: 4337n,
   *
   *   // You can specify your own bundler client with the impl in OKXBundler/IBundler.ts
   *   bundlerClientConfig: {
   *     bundlerUrl: "https://beta.okex.org",
   *   },
   *
   *   // paymasterClient is not a necessity unless you need a Sponsorship
   *   paymasterClientConfig: {
   *     paymasterUrl: "https://beta.okex.org",
   *   },
   * })
   */
  public static async create(
    params: OKXSmartContractAccountCreationParams,
  ): Promise<OKXSmartContractAccount> {
    let chain: Chain;
    const findChain =
      typeof params.chain === "number"
        ? supportedChains.find((item) => item.chainId === params.chain)
        : supportedChains.find((item) => item.chain === params.chain);

    if (findChain) {
      chain = findChain.chain;
    } else {
      throw new BaseError("CREATE_ACCOUNT_ERROR", "chain not supported");
    }

    const bundlerClient =
      typeof params.bundlerClient === "string"
        ? new BundlerClient(params.bundlerClient, chain)
        : params.bundlerClient;

    const initializeData = encodeAbiParameters(initializeAccountAbi[0].inputs, [
      await params.signer.getSubject(),
      params.signer.signerTemplate,
      [],
    ]);

    const initializeAccountData = encodeFunctionData({
      abi: smartAccountV3Abi,
      functionName: "initializeAccount",
      args: [initializeData],
    });

    const accountInitCode = encodePacked(
      ["address", "bytes"],
      [
        getConfig(params.version ?? "3.0.2").factoryAddress,
        encodeFunctionData({
          abi: accountFactoryV3Abi,
          functionName: "createAccount",
          args: [
            getConfig(params.version ?? "3.0.2").smartContractAccountTemplate,
            initializeAccountData,
            params.index ?? 0n,
          ],
        }),
      ],
    );

    const rpcProvider = createPublicClient({
      chain: chain,
      transport: http(params.rpcUrl ?? undefined),
    });

    const mainnetRpcProvider = createPublicClient({
      chain: mainnet,
      transport: http(params.mainnetClientRpcUrl ?? undefined),
    });

    const accountAddress: Address =
      params.smartAccountAddress ??
      ((await rpcProvider.readContract({
        address: getConfig(params.version ?? "3.0.2").factoryAddress,
        abi: accountFactoryV3Abi,
        functionName: "computeAddress",
        args: [zeroAddress, initializeAccountData, params.index ?? 0n],
      })) as Address);

    const authenticationManagerTemplate = getConfig(
      params.version ?? "3.0.2",
    ).authenticationManagerTemplate;

    const smartAccountTemplate = getConfig(
      params.version ?? "3.0.2",
    ).smartContractAccountTemplate;

    const authenticationManagerAddress: Address = predictDeterministicAddress(
      authenticationManagerTemplate,
      keccak256(toHex(params.version ?? "3.0.2")) as Hex,
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
      mainnetRpcProvider: mainnetRpcProvider,
      bundlerClient: bundlerClient,
      rpcProvider: rpcProvider,
      authenticationManagerAddress,
      smartAccountTemplate,
      validatorAddress,
      initCode: accountInitCode,
      factoryAddress: getConfig(params.version ?? "3.0.2").factoryAddress,
      authenticationManagerTemplate,
      version: params.version ?? "3.0.2",
    };

    if (params.paymasterClient) {
      const paymasterClient =
        typeof params.paymasterClient === "string"
          ? new PaymasterClient(params.paymasterClient as string, chain)
          : params.paymasterClient;
      return new OKXSmartContractAccount({
        ...commonParams,
        paymasterClient,
      });
    } else {
      return new OKXSmartContractAccount({
        ...commonParams,
        paymasterClient: undefined,
      });
    }
  }

  /**
   * get the smartAccountAddress, throw new error is not provided;
   *
   */
  getOKXSmartAccountAddress(): Address {
    if (!this.accountAddress) {
      throw new BaseError(
        "GET_ACCOUNT_ADDRESS_ERROR",
        "OKXSmartAccountAddress is not provided",
      );
    }
    return this.accountAddress;
  }

  async getAdminValidatorAndSubject(): Promise<{
    adminValidator: Address;
    subject: Hex;
  }> {
    let adminValidator: Address;
    let subject: Hex;
    if (this.deploymentState === DeploymentState.DEPLOYED) {
      adminValidator = (await this.rpcProvider.readContract({
        address: this.authenticationManagerAddress,
        abi: authenticationManagerAbi,
        functionName: "adminValidator",
        args: [],
      })) as Address;
      subject = (await this.rpcProvider.readContract({
        address: adminValidator,
        abi: validatorAbi,
        functionName: "subject",
        args: [],
      })) as Hex;
      return { adminValidator: adminValidator, subject: subject };
    } else {
      adminValidator = this.validatorAddress;
      subject = await this.signer.getSubject();
      return {
        adminValidator: adminValidator,
        subject: subject,
      };
    }
  }

  /**
   * Encode execute to the calldata with the params {to, value, data} or [{to, value,data},...]
   *
   * - Docs: TODO: to impl
   *
   * @param args - ExecuteCallDataArgs
   * @param executionModeOverrides - the mode you want to override.
   * @returns the compiled calldata
   *
   * @example
   * // JSON-RPC
   *  const encodedSingleCalldata = await okxSmartContractAccount.encodeExecute({
   *     to: zeroAddress,
   *     value: BigInt(1),
   *     data: "0x",
   *   });
   *
   *   const encodedbatchCalldata = await okxSmartContractAccount.encodeExecute([
   *     {
   *       to: zeroAddress,
   *       value: BigInt(1),
   *       data: "0x",
   *     },
   *     {
   *       to: zeroAddress,
   *       value: BigInt(2),
   *       data: "0x",
   *     },
   *   ]);
   */
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
        abi: smartAccountV3Abi,
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
        abi: smartAccountV3Abi,
        functionName: "execute",
        args: [mode, callData],
      });
    }
    return callDataToEntryPoint;
  }

  /**
   * get the uopHash onchain
   *
   * @param sigType the type of the signature, the enum of EIP712 or EIP191
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
      abi: authenticationManagerAbi,
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
   * @param sigType the type of the signature, the enum of EIP712 or EIP191
   * @param userOperation the userOperation
   */
  async getUOPSignedHash(
    sigType: SigType,
    userOperation: UserOperation<"v0.7">,
  ): Promise<Hex> {
    const packedUserOperation = getPackedUserOperation(cleanup(userOperation));
    const deploymentState: DeploymentState = await this.getDeploymentState();
    return (await this.rpcProvider.readContract({
      address:
        deploymentState == DeploymentState.DEPLOYED
          ? this.authenticationManagerAddress
          : this.authenticationManagerTemplateAddress,
      abi: authenticationManagerAbi,
      functionName: "getUOPSignedHash",
      args: [
        sigType === SigType.EIP712 ? 0 : 1,
        ENTRYPOINT_ADDRESS_V07,
        packedUserOperation,
      ],
    })) as Hex;
  }

  /**
   * get the paymasterAndData
   *
   * @param userOperation - the userOperation
   */
  override async getPaymasterAndData(
    userOperation: UserOperation<"v0.7">,
  ): Promise<Hex> {
    if (!this.paymasterClient) {
      throw new PaymasterError(
        "GET_PAYMASTER_AND_DATA_ERROR",
        "Paymaster client not set",
      );
    }
    const getPaymasterSignatureRes =
      await this.paymasterClient.getPaymasterData(userOperation);
    return getPaymasterSignatureRes.data.result;
  }

  /**
   * sign the uop with the signer you specified in the account.
   *
   * - Docs: TODO: to impl
   *
   * @param userOperation - the UserOperation
   * @param sigType - the sigType, enum of EIP712 and EIP191
   * @param sigTime - the sigTime, if you don't provide, it will get the sigTime on chain
   * @returns the signature of the UserOperation
   *
   * @example
   *  const signed = await okxSmartContractAccount.signUserOperation(
   *     myUop,
   *     SigType.EIP712,
   *   );
   *   const signed = await okxSmartContractAccount.signUserOperation(
   *     myUop,
   *     SigType.EIP191,
   *     1800000000n,
   *   );
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
        name: getConfig(this.version).name,
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

  /**
   * build a uop from txs
   *
   * - Docs: TODO: to impl
   *
   * @param requests -  the format meets RpcTransactionRequest[]
   * @param overrides - optional, uopOverrides and paymasterOverrides
   * @returns the uop built
   *
   * @example
   *  const builtUserOpFromTxsRes = await okxSmartContractAccount.buildUserOpFromTxs([
   *     {
   *       to: zeroAddress,
   *       data: "0x",
   *       value: toHex(1),
   *       from: await okxSmartContractAccount.getAddress(),
   *       maxFeePerGas: toHex(100000000000),
   *       maxPriorityFeePerGas: toHex(10000000000),
   *     },
   *     {
   *       to: zeroAddress,
   *       data: "0x",
   *       value: toHex(2),
   *       from: await okxSmartContractAccount.getAddress(),
   *       maxFeePerGas: toHex(120000000000),
   *       maxPriorityFeePerGas: toHex(12000000000),
   *     },
   *   ]);
   */
  async buildUserOpFromTxs(
    requests: RpcTransactionRequest[],
    overrides?: UopAndPaymasterOverrides,
  ) {
    const batch = requests.map((request) => {
      if (!request.to) {
        throw new BaseError(
          "BUILD_UOP_FROM_TXS_ERROR",
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

    return this.buildUserOpAndSign({
      args: batch,
      uopAndPaymasterOverrides: cleanup(_overrides),
    });
  }

  /**
   * build a uop from a single tx
   *
   * - Docs: TODO: to impl
   *
   * @param request -  the format meets RpcTransactionRequest
   * @param overrides - optional, uopOverrides and paymasterOverrides
   * @returns the uop built
   *
   * @example
   *  const builtUserOpFromTxRes = await okxSmartContractAccount.buildUserOpFromTx({
   *     to: zeroAddress,
   *     data: "0x",
   *     value: toHex(1),
   *     from: await okxSmartContractAccount.getAddress(),
   *     maxFeePerGas: toHex(100000000000),
   *     maxPriorityFeePerGas: toHex(10000000000),
   *   });
   */
  async buildUserOpFromTx(
    request: RpcTransactionRequest,
    overrides?: UopAndPaymasterOverrides,
  ) {
    if (!request.to) {
      throw new BaseError("BUILD_USER_OP_ERROR", "missing to address");
    }
    const _overrides: UopAndPaymasterOverrides = {
      ...overrides,
      maxFeePerGas:
        overrides?.maxFeePerGas != null
          ? overrides?.maxFeePerGas
          : request.maxFeePerGas
            ? fromHex(request.maxFeePerGas, "bigint")
            : undefined,
      maxPriorityFeePerGas:
        overrides?.maxPriorityFeePerGas != null
          ? overrides?.maxPriorityFeePerGas
          : request.maxPriorityFeePerGas
            ? fromHex(request.maxPriorityFeePerGas, "bigint")
            : undefined,
    };
    cleanup(_overrides);
    return this.buildUserOpAndSign({
      args: {
        to: request.to as Address,
        value: request.value ? fromHex(request.value, "bigint") : 0n,
        data: request.data ?? "0x",
      },
      uopAndPaymasterOverrides: cleanup(_overrides),
    });
  }

  /**
   * build a uop from params with the format of BuildUserOpParams
   *
   * - Docs: TODO: to impl
   *
   * @param params - BuildUserOpParams
   * @returns the uop built
   *
   * @example
   *  const builtOpRes = await okxSmartContractAccount.buildUserOp({
   *     args: {
   *         to: zeroAddress,
   *         value: BigInt(1),
   *         data: "0x",
   *         },
   *     uopAndPaymasterOverrides: {
   *       callGasLimit: 1000000n
   *       },
   *     })
   */
  async buildUserOp(params: BuildUserOpParams): Promise<UserOperation<"v0.7">> {
    this.checkBuildUserOpParams(params);
    await this.getDeploymentState();
    if (!this.accountAddress) {
      throw new BaseError("BUILD_USER_OP_ERROR", "ACCOUNT_ADDRESS_NOT_FOUND");
    }
    const factoryAndFactoryData = await this.parseFactoryAddressAndData();
    const userOperation: UserOperation<"v0.7"> = {
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
      userOperation,
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
    return uopToSign;
  }

  async buildUserOpAndSign(
    params: BuildUserOpParams,
  ): Promise<UserOperation<"v0.7">> {
    const uopToSign = await this.buildUserOp(params);
    return {
      ...uopToSign,
      signature: await this.signUserOperation(
        uopToSign,
        params.sigType ?? SigType.EIP191,
        params.sigTime,
      ),
    };
  }

  /**
   * send a uop with the userOperation defined by ERC4337
   *
   * - Docs: TODO: to impl
   *
   * @returns the uop built
   *
   * @example
   *  const sent = await okxSmartContractAccount.sendUserOp({
   *     factory: "0x",
   *     factoryData: "0x",
   *     sender: "0x61863678169fdDCB0E511e0e1c25B5Cc521467B3",
   *     nonce:
   *       14599995498740052113446274317130136592150631702945878649629730406410n,
   *     callData:
   *       "0xe9ae5c5300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000003400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000",
   *     callGasLimit: 71916n,
   *     verificationGasLimit: 93375n,
   *     preVerificationGas: 48567n,
   *     maxFeePerGas: 48714616830n,
   *     maxPriorityFeePerGas: 30000000000n,
   *     signature:
   *       "0x0000000000000000000000000000000000000000000000000000000000667680f3b06e863d4dd76e284e8cf29ae58a357a135c160098970e3a484c690b83c1e65a555c317655fadf14de7ac36626b957f92c521b717513aff9f668a1c07c9b80311b",
   *   });
   * @param userOperation
   */
  async sendUserOp(userOperation: UserOperation<"v0.7">): Promise<any> {
    const cleanedUop = cleanup(userOperation);
    await this.bundlerClient.simulateUserOperation(cleanedUop);
    return await this.bundlerClient.sendUserOperation(cleanedUop);
  }

  /**
   * send a transaction with RpcTransactionRequest and overrides.
   *
   * - Docs: TODO: to impl
   *
   * @param request - the request with tht format fo RpcTransactionRequest
   * @param overrides - the overrides with both paymaster and uop.
   * @returns the return hash.
   *
   * @example
   *  const sendTx = await okxSmartContractAccount.sendTransaction(
   *     {
   *       to: zeroAddress,
   *       data: "0x",
   *       value: toHex(1),
   *       from: await okxSmartContractAccount.getAddress(),
   *       maxFeePerGas: toHex(100000000000),
   *       maxPriorityFeePerGas: toHex(10000000000),
   *     },
   *     {
   *       callGasLimit: 1000000n,
   *     },
   *   );
   */
  async sendTransaction(
    request: RpcTransactionRequest,
    overrides?: UopAndPaymasterOverrides,
  ) {
    const builtUop = await this.buildUserOpFromTx(request, overrides);
    return await this.sendUserOp(builtUop);
  }

  /**
   * send a transactions hash with RpcTransactionRequest and overrides.
   *
   * - Docs: TODO: to impl
   *
   * @param requests - the requests which is an array of RpcTransactionRequest
   * @param overrides - the overrides with both paymaster and uop.
   * @returns the return hash.
   *
   * @example
   *  const sendTxs = await okxSmartContractAccount.sendTransactions(
   *     [
   *       {
   *         to: zeroAddress,
   *         data: "0x",
   *         value: toHex(1),
   *         from: await okxSmartContractAccount.getAddress(),
   *         maxFeePerGas: toHex(100000000000),
   *         maxPriorityFeePerGas: toHex(10000000000),
   *       },
   *       {
   *         to: zeroAddress,
   *         data: "0x",
   *         value: toHex(1),
   *         from: await okxSmartContractAccount.getAddress(),
   *         maxFeePerGas: toHex(120000000000),
   *         maxPriorityFeePerGas: toHex(12000000000),
   *       },
   *     ],
   *     {
   *       callGasLimit: 1000000n,
   *     },
   *   );
   */
  async sendTransactions(
    requests: RpcTransactionRequest[],
    overrides?: UopAndPaymasterOverrides,
  ) {
    const builtUop = await this.buildUserOpFromTxs(requests, overrides);
    return await this.sendUserOp(builtUop);
  }

  /**
   * get the initCode of this account.
   *
   * - Docs: TODO: to impl
   *
   * @returns the initCode in Hex
   *
   * @example
   *  const initCode = await okxSmartContractAccount.getInitCode();
   */
  override getAccountInitCode(): Promise<Hex> {
    if (!this.accountInitCode) {
      throw new BaseError("GET_ACCOUNT_INIT_CODE_ERROR", "NOT_FOUND");
    }
    return Promise.resolve(this.accountInitCode);
  }

  /**
   * get the dummy signature of the account.
   *
   * - Docs: TODO: to impl
   *
   * @returns the dummy signature which is a Hex
   *
   * @example
   *  const initCode = await okxSmartContractAccount.getDummySignature();
   */
  override getDummySignature(): Hex {
    return "0x0100000000000000000000000000000000000000000000000000000000ffffffff0000000000000000000000000000000000000000000000000000000000000000ad3621eabcece27d2605de9f24512c077b260e064bb4ada9341194ac2cfea29d00000000000000000000000000000000000000000000000000000000000000a0ad3621eabcece27d2605de9f24512c077b260e064bb4ada9341194ac2cfea29d00000000000000000000000000000000000000000000000000000000000000e000000000000000000000000000000000000000000000000000000000000000047465737400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001" as Hex;
  }

  private checkBuildUserOpParams(params: BuildUserOpParams) {
    if (
      params.uopAndPaymasterOverrides?.paymasterMode ==
        PaymasterMode.TOKEN_MODE &&
      !params.uopAndPaymasterOverrides?.paymasterToken
    ) {
      throw new BaseError("CHECK_PARAMS_ERROR", "Token address is required");
    }
    if (
      params.uopAndPaymasterOverrides?.paymasterAddress &&
      !this.paymasterClient
    ) {
      throw new BaseError("CHECK_PARAMS_ERROR", "Paymaster client is not set");
    }
  }

  private async gasEstimation(
    userOperation: UserOperation<"v0.7">,
    uopAndPaymasterOverrides?: UopAndPaymasterOverrides,
  ): Promise<UserOperation<"v0.7">> {
    const baseFeePerPrice = await this.rpcProvider.getGasPrice();

    const findChain = supportedChains.find(
      (item) => item.chain === this.rpcProvider.chain,
    );

    const maxPriorityFeePerGas =
      findChain?.isEIP1559 == true
        ? await this.rpcProvider.estimateMaxPriorityFeePerGas()
        : baseFeePerPrice;

    const preEstimation = {
      ...userOperation,
      maxPriorityFeePerGas:
        uopAndPaymasterOverrides?.maxPriorityFeePerGas ?? maxPriorityFeePerGas,
      maxFeePerGas: uopAndPaymasterOverrides?.maxFeePerGas ?? baseFeePerPrice,
      signature: this.getDummySignature(),
    };

    if (preEstimation.maxFeePerGas < preEstimation.maxPriorityFeePerGas) {
      preEstimation.maxFeePerGas = preEstimation.maxPriorityFeePerGas;
    }

    const result =
      await this.bundlerClient.estimateUserOperationGas(preEstimation);

    let preVerificationGas: bigint;
    // layer2 prediction
    if (result.l1GasLimit != "0x0") {
      if (!this.mainnetRpcProvider) {
        throw new BaseError(
          "GAS_ESTIMATION_ERROR",
          "in layer2, mainnet rpc provider must provided",
        );
      }
      const l1Fee = await this.mainnetRpcProvider.getGasPrice();
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
}
