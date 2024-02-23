import {
  Address,
  Chain,
  encodeAbiParameters,
  encodeFunctionData,
  encodePacked,
  getCreate2Address,
  type Hash,
  Hex,
  keccak256,
  PublicClient,
  Transport,
} from "viem";
import { smartAccountV3ABI } from "../../../abis/smartAccountV3.abi";
import { configuration } from "../../../configuration";
import { OKXSmartAccountSigner } from "../../plugins/types";
import { IAccountManager } from "./IAccountManager.interface";
import { AccountInfo, AccountInfoV2, AccountInfoV3 } from "../types";
import { toBigInt } from "ethers";
import { accountFactoryV2ABI } from "../../../abis/accountFactoryV2.abi";
import { initializeAccountABI } from "../../../abis/initializeAccount.abi";
import { accountFactoryV3ABI } from "../../../abis/accountFactoryV3.abi";
import { predictDeterministicAddress } from "../../common/utils";
import { createAccountManagerParams } from "./createAccountManagerParams.dto";
import { EntryPointABI } from "../../../abis/EntryPoint.abi";

export class AccountManager<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
  TOwner extends OKXSmartAccountSigner = OKXSmartAccountSigner
> implements IAccountManager
{
  protected publicClient: PublicClient<TTransport, TChain>;
  protected owner: TOwner;
  protected entryPointAddress: Address;
  protected factoryAddress: Address;
  protected version: string;
  protected accountInfos: AccountInfo[] = [];
  constructor(params: createAccountManagerParams<TTransport, TChain, TOwner>) {
    this.publicClient = params.publicClient;
    this.owner = params.owner as TOwner;
    this.entryPointAddress = params.entryPointAddress;
    this.version = params.version;
    this.factoryAddress = params.factoryAddress;
  }

  async batchCreateNewAccountInfoV2(amount: number): Promise<AccountInfoV2[]> {
    const maxAccountIndex = this.getMaxAccountIndex();
    let accountInfos: AccountInfoV2[] = [];
    for (
      let i = maxAccountIndex + toBigInt(1);
      i < maxAccountIndex + toBigInt(1) + toBigInt(amount);
      i++
    ) {
      accountInfos.push(await this.createNewAccountInfoV2(toBigInt(i)));
    }
    return accountInfos;
  }

  async createNewAccountInfoV2(
    index: bigint = toBigInt(0)
  ): Promise<AccountInfoV2> {
    if (this.version == "3.0.0") {
      throw new Error("This function is not supported in version 3.0.0");
    }
    const initializeAccountData = encodeAbiParameters(
      [
        {
          name: "creator",
          type: "address",
        },
        { name: "init", type: "bytes" },
      ],
      [await this.owner.getAddress(), "0x"]
    );

    const salt = keccak256(
      encodePacked(
        ["address", "uint256"],
        [await this.owner.getAddress(), index]
      )
    );

    const accountAddress = getCreate2Address({
      from: this.factoryAddress,
      salt: salt,
      bytecodeHash: configuration.v2.CREATION_CODE,
    });

    const initCode = encodePacked(
      ["address", "bytes"],
      [
        this.factoryAddress,
        encodeFunctionData({
          abi: accountFactoryV2ABI,
          functionName: "createAccount",
          args: [
            configuration.v2.SMART_ACCOUNT_TEMPLATE_ADDRESS,
            initializeAccountData,
            index,
          ],
        }),
      ]
    );

    const isDeployed = await this.updateDeployment(
      this.publicClient,
      accountAddress
    );

    const _accountInfo: AccountInfoV2 = {
      initializeAccountData: initializeAccountData,
      accountAddress: accountAddress,
      index: index,
      defaultECDSAValidator: await this.owner.getAddress(),
      initCode: initCode,
      isDeployed: isDeployed,
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

  async batchCreateNewAccountInfoV3(
    amount: number,
    executions: Hex[]
  ): Promise<AccountInfoV3[]> {
    const maxAccountIndex = this.getMaxAccountIndex();
    let accountInfos: AccountInfoV3[] = [];
    for (
      let i = maxAccountIndex + toBigInt(1);
      i < maxAccountIndex + toBigInt(1) + toBigInt(amount);
      i++
    ) {
      accountInfos.push(
        await this.createNewAccountInfoV3(toBigInt(i), executions)
      );
    }
    return accountInfos;
  }

  async createNewAccountInfoV3(
    index: bigint = toBigInt(0),
    executions: Hex[] = []
  ): Promise<AccountInfoV3> {
    if (this.version == "2.0.0") {
      throw new Error("This function is not supported in version 2.0.0");
    }
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
            configuration.v3.SMART_ACCOUNT_TEMPLATE_ADDRESS,
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
      from: this.factoryAddress,
      salt: salt,
      bytecodeHash: keccak256(configuration.v3.SMART_ACCOUNT_PROXY_CODE),
    });

    const authenticationManagerAddress: Address = predictDeterministicAddress(
      configuration.v3.AUTHENTICATION_MANAGER_TEMPLATE,
      configuration.v3.VERSION_HASH,
      accountAddress
    );

    const defaultECDSAValidator: Address = predictDeterministicAddress(
      configuration.v3.ECDSA_VALIDATOR_TEMPLATE_ADDRESS,
      keccak256(encodePacked(["bytes"], [await this.owner.getAddress()])),
      authenticationManagerAddress
    );

    const isDeployed = await this.updateDeployment(
      this.publicClient,
      accountAddress
    );

    const _accountInfo: AccountInfoV3 = {
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

  public async updateDeployment(
    publicClient: PublicClient,
    accountAddress: Address
  ): Promise<boolean> {
    const contractCode =
      (await publicClient.getBytecode({
        address: accountAddress,
      })) ?? "0x";

    return contractCode.length > 2;
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

  getAccountInfo(accountAddress: Address): AccountInfo {
    for (const accountInfo of this.accountInfos) {
      if (accountInfo.accountAddress === accountAddress) {
        return accountInfo;
      }
    }
    throw new Error("no initialization info found");
  }

  getAccountInfos(): AccountInfo[] {
    return this.accountInfos;
  }

  async getNonce(
    accountAddress: Address,
    role: Hex, // for future use(v4)
    validatorAddress?: Address
  ): Promise<bigint> {
    const accountInfo = this.getAccountInfo(accountAddress);
    validatorAddress = validatorAddress ?? accountInfo.defaultECDSAValidator;
    return await this.publicClient.readContract({
      address: this.entryPointAddress,
      abi: EntryPointABI,
      functionName: "getNonce",
      // TODO: add Role into consideration in the next version
      args: [
        accountInfo.accountAddress,
        this.version == "2.0.0" ? toBigInt(0) : toBigInt(validatorAddress),
      ],
    });
  }

  getFactoryAddress(): Address {
    return this.factoryAddress;
  }

  getEntryPointAddress(): Address {
    return this.entryPointAddress;
  }
}
