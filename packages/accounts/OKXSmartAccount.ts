import type { Address } from "abitype";
import {
  type Chain,
  Client,
  encodeAbiParameters,
  encodeFunctionData,
  encodePacked,
  getCreate2Address,
  type Hash,
  type Hex,
  hexToBytes,
  keccak256,
  PublicClient,
  SignTypedDataParameters,
  type Transport,
  WalletClient,
} from "viem";
import { EntryPointABI } from "../abis/EntryPoint.abi";
import {
  AccountInfo,
  ExecuteCallDataArgs,
  ISmartContractAccount,
  SignType,
} from "./types.js";
import { OKXSmartAccountSigner, UserOperationDraft } from "../plugins/types";
import { configuration, defaultUserOperationParams } from "../../configuration";
import { smartAccountV3ABI } from "../abis/smartAccountV3.abi";
import { createOKXSmartAccountParams } from "./createOKXSmartAccount.dto";
import { toBigInt } from "ethers";
import { accountFactoryV3ABI } from "../abis/accountFactoryV3.abi";
import { initializeAccountABI } from "../abis/initializeAccount.abi";
import { UserOperation } from "permissionless/types/userOperation";
import { getChainId } from "viem/actions";
import { predictDeterministicAddress } from "../common/utils";

export class OKXSmartContractAccount<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
  TOwner extends OKXSmartAccountSigner = OKXSmartAccountSigner
> implements ISmartContractAccount<TTransport, TOwner>
{
  protected name: string;
  protected version: string;
  protected publicClient: PublicClient<TTransport, TChain>;
  // protected walletClient: WalletClient<TTransport, TChain>;
  protected factoryAddress: Address;
  protected accountInfos: AccountInfo[];
  protected owner: TOwner;
  protected entryPointAddress: Address;

  constructor(params: createOKXSmartAccountParams<TTransport, TChain, TOwner>) {
    this.owner = params.owner as TOwner;
    this.publicClient = params.publicClient;
    this.entryPointAddress =
      params.entryPointAddress ?? configuration.ENTRYPOINT_ADDRESS;
    this.factoryAddress =
      params.factoryAddress ?? configuration.FACTORY_ADDRESS;
    this.accountInfos = params.accountInfos ?? [];
    this.name = params.name ?? configuration.NAME;
    this.version = params.name ?? configuration.VERSION;
  }

  async encodeExecute(args: ExecuteCallDataArgs): Promise<Hex> {
    if (Array.isArray(args)) {
      return encodeFunctionData({
        abi: smartAccountV3ABI,
        functionName: "executeBatch",
        args: [
          args.map((txn) => {
            if (txn.callType === "delegatecall") {
              throw new Error("Cannot batch delegatecall");
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
        return encodeFunctionData({
          abi: smartAccountV3ABI,
          functionName: "execute",
          args: [args.to, args.value, args.data],
        });
      } else {
        throw new Error("delegatecall not impl");
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

  async signTypedData(params: SignTypedDataParameters): Promise<Hex> {
    throw new Error("signTypedData not supported");
  }

  encodeUpgradeToAndCall = async (
    _upgradeToImplAddress: Address,
    _upgradeToInitData: Hex
  ): Promise<Hex> => {
    throw new Error("encodeUpgradeToAndCall not supported");
  };

  async getNonce(
    accountAddress: Address,
    role: Hex,
    validatorAddress?: Address
  ): Promise<bigint> {
    const accountInfo = this.getAccountInfo(accountAddress);
    validatorAddress = validatorAddress ?? accountInfo.defaultECDSAValidator;
    return await this.publicClient.readContract({
      address: this.entryPointAddress,
      abi: EntryPointABI,
      functionName: "getNonce",
      // TODO: add Role into consideration in the next version
      args: [accountInfo.accountAddress, toBigInt(validatorAddress)],
    });
  }

  async generateUserOperationAndPackedWithFreeGasPayMaster(
    signType: SignType,
    role: Hex,
    userOperationDraft: Omit<UserOperationDraft, "paymasterAndData">,
    freeGasPayMaster: Address
  ): Promise<UserOperation> {
    const userOperation = await this.generateUserOperation(
      role,
      userOperationDraft
    );
    const sigTime = toBigInt(
      "0x000000000000ffffffffffff0000000000000000000000000000000000000000"
    );
    const encodedUserOperationDataWithFreeGasPayMaster = encodeAbiParameters(
      [
        { name: "sender", type: "address" },
        { name: "nonce", type: "uint256" },
        { name: "initCodeHash", type: "bytes32" },
        { name: "callDataHash", type: "bytes32" },
        { name: "callGasLimit", type: "uint256" },
        { name: "verificationGasLimit", type: "uint256" },
        { name: "preVerificationGas", type: "uint256" },
        { name: "maxFeePerGas", type: "uint256" },
        { name: "maxPriorityFeePerGas", type: "uint256" },
        { name: "chainId", type: "uint256" },
        { name: "freeGasPayMaster", type: "address" },
        { name: "sigTime", type: "uint256" },
      ],
      [
        userOperation.sender,
        userOperation.nonce,
        keccak256(userOperation.initCode),
        keccak256(userOperation.callData),
        userOperation.callGasLimit,
        userOperation.verificationGasLimit,
        userOperation.preVerificationGas,
        userOperation.maxFeePerGas,
        userOperation.maxPriorityFeePerGas,
        toBigInt(await getChainId(this.publicClient as Client)),
        freeGasPayMaster,
        sigTime,
      ]
    );
    const userOperationHashInFreeGasPayMaster = keccak256(
      encodedUserOperationDataWithFreeGasPayMaster
    );

    userOperation.paymasterAndData = encodePacked(
      ["address", "uint256", "bytes"],
      [
        freeGasPayMaster,
        sigTime,
        await this.owner.signMessage(userOperationHashInFreeGasPayMaster),
      ]
    );
    return this.generateUserOperationAndPacked(
      signType,
      role,
      userOperation,
      sigTime
    );
  }

  async generateUserOperationAndPackedWithTokenPayMaster(
    signType: SignType,
    role: Hex,
    userOperationDraft: Omit<UserOperationDraft, "paymasterAndData">,
    tokenPayMaster: Address,
    tokenAddress: Address,
    exchangeRate: bigint
  ): Promise<UserOperation> {
    const userOperation = await this.generateUserOperation(
      role,
      userOperationDraft
    );
    const sigTime = toBigInt(
      "0x000000000000ffffffffffff0000000000000000000000000000000000000000"
    );
    const additionHashData = encodeAbiParameters(
      [
        { name: "token", type: "address" },
        { name: "exchangeRate", type: "uint256" },
        { name: "sigTime", type: "uint256" },
      ],
      [tokenAddress, exchangeRate, sigTime]
    );

    const encodedUserOperationDataWithTokenPayMaster = encodeAbiParameters(
      [
        { name: "sender", type: "address" },
        { name: "nonce", type: "uint256" },
        { name: "initCodeHash", type: "bytes32" },
        { name: "callDataHash", type: "bytes32" },
        { name: "callGasLimit", type: "uint256" },
        { name: "verificationGasLimit", type: "uint256" },
        { name: "preVerificationGas", type: "uint256" },
        { name: "maxFeePerGas", type: "uint256" },
        { name: "maxPriorityFeePerGas", type: "uint256" },
        { name: "chainId", type: "uint256" },
        { name: "tokenPayMaster", type: "address" },
        { name: "additionHashData", type: "bytes" },
      ],
      [
        userOperation.sender,
        userOperation.nonce,
        keccak256(userOperation.initCode),
        keccak256(userOperation.callData),
        userOperation.callGasLimit,
        userOperation.verificationGasLimit,
        userOperation.preVerificationGas,
        userOperation.maxFeePerGas,
        userOperation.maxPriorityFeePerGas,
        toBigInt(await getChainId(this.publicClient as Client)),
        tokenPayMaster,
        additionHashData,
      ]
    );
    const userOperationHashInTokenPayMaster = keccak256(
      encodedUserOperationDataWithTokenPayMaster
    );

    userOperation.paymasterAndData = encodePacked(
      ["address", "address", "uint256", "uint256", "bytes"],
      [
        tokenPayMaster,
        tokenAddress,
        exchangeRate,
        sigTime,
        await this.owner.signMessage(userOperationHashInTokenPayMaster),
      ]
    );
    return this.generateUserOperationAndPacked(
      signType,
      role,
      userOperation,
      sigTime
    );
  }

  async generateUserOperationAndPacked(
    signType: SignType,
    role: Hex,
    userOperationDraft: UserOperationDraft,
    _sigTime: bigint = toBigInt(0)
  ): Promise<UserOperation> {
    const accountInfo = this.getAccountInfo(userOperationDraft.sender);
    const userOperation = await this.generateUserOperation(
      role,
      userOperationDraft
    );
    const sigTime =
      _sigTime == toBigInt(0)
        ? await this.getSigTime(userOperationDraft.paymasterAndData == "0x")
        : _sigTime;
    if (signType == "EIP712") {
      let domain = {
        name: this.name,
        version: this.version,
        chainId: await getChainId(this.publicClient as Client),
        verifyingContract: accountInfo.authenticationManagerAddress,
      };
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
        EntryPoint: configuration.ENTRYPOINT_ADDRESS,
        sigTime: sigTime,
      };
      const signature = this.owner.signer.signTypedData({
        domain: domain,
        types: types,
        message: value,
      });
      userOperation.signature = encodePacked(
        ["uint8", "uint256", "bytes"],
        [0, sigTime, signature]
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
          toBigInt(await getChainId(this.publicClient as Client)),
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
          configuration.ENTRYPOINT_ADDRESS,
          sigTime,
        ]
      );
      const userOperationHash = keccak256(encodedUserOperationData);
      userOperation.signature = encodePacked(
        ["uint8", "uint256", "bytes"],
        [1, sigTime, await this.owner.signMessage(userOperationHash)]
      );
      return userOperation;
    }
  }

  async execute(request: any): Promise<any> {
    await this.owner.getWalletClient().writeContract(request);
  }

  async sendUserOperationSimulation(
    userOperation: UserOperation
  ): Promise<any> {
    const account = await this.owner.getAddress();
    return await this.publicClient.simulateContract({
      account: account,
      address: this.entryPointAddress,
      abi: EntryPointABI,
      functionName: "handleOps",
      args: [[userOperation], account],
    });
  }

  async sendFromEOASimulation(
    account: Address,
    to: Address,
    value: bigint,
    data: Hex
  ): Promise<any> {
    const sender = await this.owner.getAddress();
    return await this.publicClient.simulateContract({
      account: sender,
      address: account,
      abi: smartAccountV3ABI,
      functionName: "executeFromEOA",
      args: [to, value, data],
    });
  }

  private async getSigTime(isPaymaster: boolean) {
    if (isPaymaster) {
      // sigTime = sigTime * (BigInt("2") ** BigInt(160));
      return toBigInt(
        "0x000000000000ffffffffffff0000000000000000000000000000000000000000"
      );
    } else {
      const block = await this.publicClient.getBlock();
      return toBigInt(block.timestamp) + toBigInt(100000);
    }
  }

  private async updateDeployment(
    publicClient: PublicClient,
    accountAddress: Address
  ): Promise<boolean> {
    const contractCode =
      (await publicClient.getBytecode({
        address: accountAddress,
      })) ?? "0x";

    return contractCode.length > 2;
  }

  async generateUserOperation(
    role: Hex,
    userOperationDraft: UserOperationDraft
  ): Promise<UserOperation> {
    const accountInfo: AccountInfo = this.getAccountInfo(
      userOperationDraft.sender
    );
    const isDeployed: boolean = await this.updateDeployment(
      this.publicClient,
      accountInfo.accountAddress
    );
    return {
      sender: accountInfo.accountAddress,
      nonce: userOperationDraft.nonce
        ? userOperationDraft.nonce
        : await this.getNonce(
            accountInfo.accountAddress,
            role,
            accountInfo.defaultECDSAValidator
          ),
      initCode: userOperationDraft.initCode
        ? userOperationDraft.initCode
        : isDeployed
        ? "0x"
        : accountInfo.initCode,
      callData: userOperationDraft.callData
        ? userOperationDraft.callData
        : "0x",
      paymasterAndData: userOperationDraft.paymasterAndData
        ? userOperationDraft.paymasterAndData
        : "0x",
      signature: "0x",
      callGasLimit: userOperationDraft.callGasLimit
        ? userOperationDraft.callGasLimit
        : defaultUserOperationParams.CALL_GAS_LIMIT,
      verificationGasLimit: userOperationDraft.verificationGasLimit
        ? userOperationDraft.verificationGasLimit
        : defaultUserOperationParams.VERIFICATION_GAS_LIMIT,
      preVerificationGas: userOperationDraft.preVerificationGas
        ? userOperationDraft.preVerificationGas
        : defaultUserOperationParams.PREVERIFICATION_GAS,
      maxFeePerGas: userOperationDraft.maxFeePerGas
        ? userOperationDraft.maxFeePerGas
        : defaultUserOperationParams.MAX_FEE_PER_GAS,
      maxPriorityFeePerGas: userOperationDraft.maxPriorityFeePerGas
        ? userOperationDraft.maxPriorityFeePerGas
        : defaultUserOperationParams.MAX_PRIORITY_FEE_PER_GAS,
    };
  }

  getAccountInfos(): AccountInfo[] {
    return this.accountInfos;
  }

  getAccountInfo(accountAddress: Address): AccountInfo {
    for (const accountInfo of this.accountInfos) {
      if (accountInfo.accountAddress === accountAddress) {
        return accountInfo;
      }
    }
    throw new Error("no initialization info found");
  }

  private getMaxAccountIndex(): bigint {
    let maxIndex = toBigInt(0);
    for (const accountInfo of this.accountInfos) {
      if (accountInfo.index > maxIndex) {
        maxIndex = accountInfo.index;
      }
    }
    return maxIndex;
  }

  async batchCreateNewAccountInfo(
    amount: number,
    executions: Hex[]
  ): Promise<AccountInfo[]> {
    const maxAccountIndex = this.getMaxAccountIndex();
    let accountInfos: AccountInfo[] = [];
    for (
      let i = maxAccountIndex + toBigInt(1);
      i < maxAccountIndex + toBigInt(1) + toBigInt(amount);
      i++
    ) {
      accountInfos.push(
        await this.createNewAccountInfo(toBigInt(i), executions)
      );
    }
    return accountInfos;
  }

  async createNewAccountInfo(
    index: bigint = toBigInt(0),
    executions: Hex[] = []
  ): Promise<AccountInfo> {
    // @ts-ignore
    const initializeData = encodeAbiParameters(initializeAccountABI[0].inputs, [
      // @ts-ignore
      await this.owner.getAddress(),
      // @ts-ignore
      configuration.ECDSA_VALIDATOR_TEMPLATE_ADDRESS,
      // @ts-ignore
      executions,
    ]);

    const initializeAccountData = encodeFunctionData({
      abi: smartAccountV3ABI,
      functionName: "initializeAccount",
      args: [initializeData],
    });

    const initCode = encodePacked(
      ["address", "bytes"],
      [
        this.factoryAddress,
        encodeFunctionData({
          abi: accountFactoryV3ABI,
          functionName: "createAccount",
          args: [
            configuration.SMART_ACCOUNT_TEMPLATE_ADDRESS,
            initializeAccountData,
            index,
          ],
        }),
      ]
    );

    const salt: Hash = keccak256(
      encodePacked(["bytes", "uint256"], [initializeAccountData, index])
    );

    const accountAddress = getCreate2Address({
      from: configuration.FACTORY_ADDRESS,
      salt: salt,
      bytecodeHash: keccak256(configuration.SMART_ACCOUNT_PROXY_CODE),
    });

    const authenticationManagerAddress: Address = predictDeterministicAddress(
      configuration.AUTHENTICATION_MANAGER_TEMPLATE,
      configuration.VERSION_HASH,
      accountAddress
    );

    const defaultECDSAValidator: Address = predictDeterministicAddress(
      configuration.ECDSA_VALIDATOR_TEMPLATE_ADDRESS,
      keccak256(encodePacked(["bytes"], [await this.owner.getAddress()])),
      authenticationManagerAddress
    );

    const isDeployed = await this.updateDeployment(
      this.publicClient,
      accountAddress
    );

    const _accountInfo: AccountInfo = {
      initializeAccountData,
      initCode,
      index,
      accountAddress,
      isDeployed,
      authenticationManagerAddress,
      defaultECDSAValidator: defaultECDSAValidator,
    };

    for (const accountInfo of this.accountInfos) {
      if (accountInfo.index === index) {
        accountInfo.accountAddress = _accountInfo.accountAddress;
        accountInfo.initCode = _accountInfo.initCode;
        accountInfo.initializeAccountData = _accountInfo.initializeAccountData;
        accountInfo.isDeployed = _accountInfo.isDeployed;
      }
    }
    this.accountInfos.push(_accountInfo);

    return _accountInfo;
  }

  installValidator(
    accountAddress: Address,
    newValidatorAddress: Address,
    validatorTemplate: Address = configuration.ECDSA_VALIDATOR_TEMPLATE_ADDRESS
  ): Hex {
    // encode the installation data;
    const installation: Hex = encodeAbiParameters(
      [
        { name: "validFrom", type: "uint256" },
        { name: "validUntil", type: "uint256" },
        { name: "credential", type: "bytes" },
      ],
      [toBigInt(0), toBigInt(10000000000), newValidatorAddress]
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

  getOwner(): TOwner {
    return this.owner;
  }

  getFactoryAddress(): Address {
    return this.factoryAddress;
  }

  getEntryPointAddress(): Address {
    return this.entryPointAddress;
  }
}
