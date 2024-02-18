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
import { boolean } from "hardhat/internal/core/params/argumentTypes";

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
    // this.walletClient = params.walletClient;
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

  async generateUserOperationAndPacked(
    signType: SignType,
    accountAddress: Address,
    role: Hex,
    userOperationDraft: UserOperationDraft,
    _sigTime: bigint = toBigInt(0),
    validatorAddress?: Address
  ): Promise<UserOperation> {
    const accountInfo = this.getAccountInfo(accountAddress);
    validatorAddress = validatorAddress ?? accountInfo.defaultECDSAValidator;
    const userOperation = await this.generateUserOperation(
      role,
      accountAddress,
      validatorAddress,
      userOperationDraft
    );
    const sigTime =
      _sigTime == toBigInt(0)
        ? await this.getSigTime(userOperationDraft.paymasterAndData == "0x")
        : _sigTime;
    // TODO: 712 impl
    // if (signType == "EIP712") {
    //     let domain = {
    //         name: this.name,
    //         version: this.version,
    //         chainId: await getChainId(this.publicClient as Client),
    //         verifyingContract: authenticationManager.target,
    //     };
    //
    //     let types = {
    //         SignMessage: [
    //             {name: "sender", type: "address"},
    //             {name: "nonce", type: "uint256"},
    //             {name: "initCode", type: "bytes"},
    //             {name: "callData", type: "bytes"},
    //             {name: "callGasLimit", type: "uint256"},
    //             {name: "verificationGasLimit", type: "uint256"},
    //             {name: "preVerificationGas", type: "uint256"},
    //             {name: "maxFeePerGas", type: "uint256"},
    //             {name: "maxPriorityFeePerGas", type: "uint256"},
    //             {name: "paymasterAndData", type: "bytes"},
    //             {name: "EntryPoint", type: "address"},
    //             {name: "sigTime", type: "uint256"},
    //         ],
    //     };
    //     const value = {
    //         ...userOperation,
    //         EntryPoint: configuration.ENTRYPOINT_ADDRESS,
    //         sigTime: sigTime
    //     };
    // } else {
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

  async sendUserOperationSimulation(
    account: Address,
    userOperation: UserOperation
  ): Promise<any> {
    return await this.publicClient.simulateContract({
      account: account,
      address: this.entryPointAddress,
      abi: EntryPointABI,
      functionName: "handleOps",
      args: [[userOperation], account],
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
    accountAddress: Address,
    validatorAddress: Address,
    userOperationDraft: UserOperationDraft
  ): Promise<UserOperation> {
    const accountInfo: AccountInfo = this.getAccountInfo(accountAddress);
    const isDeployed: boolean = await this.updateDeployment(
      this.publicClient,
      accountAddress
    );
    const nonce = await this.getNonce(accountAddress, role, validatorAddress);
    return {
      sender: accountAddress,
      nonce: nonce,
      initCode: isDeployed ? "0x" : accountInfo.initCode,
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

  async batchGenerateNewAccountInfo(
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
        await this.generateNewAccountInfo(toBigInt(i), executions)
      );
    }
    return accountInfos;
  }

  async generateNewAccountInfo(
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
