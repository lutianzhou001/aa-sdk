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
  publicActions,
  PublicClient,
  Transport,
  WalletClient,
} from "viem";
import { smartAccountV3ABI } from "../../../abis/smartAccountV3.abi";
import { configuration } from "../../../configuration";
import { OKXSmartAccountSigner } from "../../plugins/types";
import { IAccountManager } from "./IAccountManager.interface";
import { Account, AccountV2, AccountV3 } from "../types";
import { toBigInt, Wallet } from "ethers";
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
  protected owner: TOwner;
  protected entryPointAddress: Address;
  protected factoryAddress: Address;
  protected version: string;
  protected accounts: Account[] = [];
  constructor(params: createAccountManagerParams<TTransport, TChain, TOwner>) {
    this.owner = params.owner;
    this.entryPointAddress = params.entryPointAddress;
    this.version = params.version;
    this.factoryAddress = params.factoryAddress;
  }

  async createNewAccount(
    index: bigint = toBigInt(0),
    executions: Hex[] = []
  ): Promise<Account> {
    if (this.version == "2.0.0") {
      return await this.createNewAccountV2(index);
    } else {
      return await this.createNewAccountV3(index, executions);
    }
  }

  async batchCreateNewAccount(
    amount: number,
    executions: Hex[] = []
  ): Promise<Account[]> {
    if (this.version == "2.0.0") {
      return await this.batchCreateNewAccountV2(amount);
    } else {
      return await this.batchCreateNewAccountV3(amount, executions);
    }
  }

  async batchCreateNewAccountV2(amount: number): Promise<AccountV2[]> {
    const maxAccountIndex = this.getMaxAccountIndex();
    let accounts: AccountV2[] = [];
    for (
      let i = maxAccountIndex + toBigInt(1);
      i < maxAccountIndex + toBigInt(1) + toBigInt(amount);
      i++
    ) {
      accounts.push(await this.createNewAccountV2(toBigInt(i)));
    }
    return accounts;
  }

  async createNewAccountV2(index: bigint = toBigInt(0)): Promise<AccountV2> {
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
      this.owner.getWalletClient(),
      accountAddress
    );

    const _account: AccountV2 = {
      initializeAccountData: initializeAccountData,
      accountAddress: accountAddress,
      index: index,
      defaultECDSAValidator: await this.owner.getAddress(),
      initCode: initCode,
      isDeployed: isDeployed,
    };

    for (const account of this.accounts) {
      if (account.index === index) {
        account.accountAddress = _account.accountAddress;
        account.initCode = _account.initCode;
        account.initializeAccountData = _account.initializeAccountData;
        account.isDeployed = _account.isDeployed;
      }
    }

    this.accounts.push(_account);

    return _account;
  }

  async batchCreateNewAccountV3(
    amount: number,
    executions: Hex[] = []
  ): Promise<AccountV3[]> {
    const maxAccountIndex = this.getMaxAccountIndex();
    let accounts: AccountV3[] = [];
    for (
      let i = maxAccountIndex + toBigInt(1);
      i < maxAccountIndex + toBigInt(1) + toBigInt(amount);
      i++
    ) {
      accounts.push(await this.createNewAccountV3(toBigInt(i), executions));
    }
    return accounts;
  }

  async createNewAccountV3(
    index: bigint = toBigInt(0),
    executions: Hex[] = []
  ): Promise<AccountV3> {
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
      this.owner.getWalletClient(),
      accountAddress
    );

    const _account: AccountV3 = {
      initializeAccountData,
      initCode,
      index,
      accountAddress,
      isDeployed,
      authenticationManagerAddress,
      defaultECDSAValidator: defaultECDSAValidator,
    };

    for (const account of this.accounts) {
      if (account.index === index) {
        account.accountAddress = _account.accountAddress;
        account.initCode = _account.initCode;
        account.initializeAccountData = _account.initializeAccountData;
        account.isDeployed = _account.isDeployed;
      }
    }
    this.accounts.push(_account);

    return _account;
  }

  public async updateDeployment(
    walletClient: WalletClient,
    accountAddress: Address
  ): Promise<boolean> {
    const contractCode =
      (await walletClient.extend(publicActions).getBytecode({
        address: accountAddress,
      })) ?? "0x";

    return contractCode.length > 2;
  }

  private getMaxAccountIndex(): bigint {
    let maxIndex = toBigInt(0);
    for (const account of this.accounts) {
      if (account.index > maxIndex) {
        maxIndex = account.index;
      }
    }
    return maxIndex;
  }

  getAccount(accountAddress: Address): Account {
    for (const account of this.accounts) {
      if (account.accountAddress === accountAddress) {
        return account;
      }
    }
    throw new Error("account not found");
  }

  getAccounts(): Account[] {
    return this.accounts;
  }

  async getNonce(
    accountAddress: Address,
    role: Hex, // for future use(v4)
    validatorAddress?: Address
  ): Promise<bigint> {
    const account = this.getAccount(accountAddress);
    validatorAddress = validatorAddress ?? account.defaultECDSAValidator;
    return await this.owner
      .getWalletClient()
      .extend(publicActions)
      .readContract({
        address: this.entryPointAddress,
        abi: EntryPointABI,
        functionName: "getNonce",
        // TODO: add Role into consideration in the next version
        args: [
          account.accountAddress,
          this.version == "2.0.0" ? toBigInt(0) : toBigInt(validatorAddress),
        ],
      });
  }

  isExist(indexOrAddress: number | Address) {
    if (typeof indexOrAddress === "number") {
      for (const account of this.accounts) {
        if (account.index === toBigInt(indexOrAddress)) {
          return true;
        }
      }
    } else {
      for (const account of this.accounts) {
        if (account.accountAddress === indexOrAddress) {
          return true;
        }
      }
    }
    return false;
  }

  getFactoryAddress(): Address {
    return this.factoryAddress;
  }

  getEntryPointAddress(): Address {
    return this.entryPointAddress;
  }
}
