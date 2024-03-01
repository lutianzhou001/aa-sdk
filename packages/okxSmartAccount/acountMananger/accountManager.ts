import {
  Address,
  Chain,
  Client,
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
import { configuration, networkConfigurations } from "../../../configuration";
import { OKXSmartAccountSigner } from "../../plugins/types";
import { IAccountManager } from "./IAccountManager.interface";
import {
  Account,
  AccountV2,
  AccountV3,
  SmartAccountTransactionReceipt,
} from "../types";
import { accountFactoryV2ABI } from "../../../abis/accountFactoryV2.abi";
import { initializeAccountABI } from "../../../abis/initializeAccount.abi";
import { accountFactoryV3ABI } from "../../../abis/accountFactoryV3.abi";
import { predictDeterministicAddress } from "../../common/utils";
import { createAccountManagerParams } from "./createAccountManagerParams.dto";
import { EntryPointABI } from "../../../abis/EntryPoint.abi";
import { getChainId } from "viem/actions";
import axios from "axios";

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

  pushAccountTransaction(
    sender: Address,
    userOperationHash: Hex
  ): SmartAccountTransactionReceipt {
    const currentAccount = this.getAccount(sender);
    const receipt: SmartAccountTransactionReceipt = {
      userOperationHash: userOperationHash,
      txHash: undefined,
      success: undefined,
    };
    currentAccount.receipts.push(receipt);
    return receipt;
  }

  getAccountTransactionReceipts(
    sender: Address
  ): SmartAccountTransactionReceipt[] {
    const currentAccount = this.getAccount(sender);
    return currentAccount.receipts;
  }

  async updateAccountTransactionReceipts(
    sender: Address
  ): Promise<SmartAccountTransactionReceipt[]> {
    const currentAccount = this.getAccount(sender);
    const receipts = currentAccount.receipts;
    let receiptsToUpdate: SmartAccountTransactionReceipt[] = [];
    for (const receipt of receipts) {
      if (receipt.success == undefined) {
        const res = await this.getOKXBundlerReceipt(receipt.userOperationHash);
        receipt.success = res.success;
        receipt.txHash = res.txHash;
      }
      receiptsToUpdate.push({
        userOperationHash: receipt.userOperationHash,
        txHash: receipt.txHash,
        success: receipt.success,
      });
    }
    return receiptsToUpdate;
  }

  private async getOKXBundlerReceipt(
    userOperationHash: Hex
  ): Promise<SmartAccountTransactionReceipt> {
    const req = {
      method: "post",
      maxBodyLength: Infinity,
      url:
        networkConfigurations.base_url + "mp/" +
        String(await getChainId(this.owner.getWalletClient() as Client)) +
        "/eth_getUserOperationReceipt",
      headers: {
        "Content-Type": "application/json",
        Cookie: "locale=en-US",
      },
      data: JSON.stringify({
        id: 1,
        jsonrpc: "2.0",
        method: "eth_getUserOperationReceipt",
        params: [userOperationHash],
      }),
    };
    const res = await axios.request(req);
    if (res.data.error) {
      throw new Error(res.data.error.message);
    } else {
      return res.data.result;
    }
  }

  async createNewAccount(
    index: bigint = BigInt(0),
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
    let accounts: AccountV2[] = [];

    const maxAccountIndex = this.getMaxAccountIndex();
    if (maxAccountIndex == undefined) {
      for (let i = BigInt(0); i < BigInt(amount); i++) {
        accounts.push(await this.createNewAccountV2(i));
      }
    } else {
      for (
          let i = maxAccountIndex + BigInt(1);
          i < maxAccountIndex + BigInt(1) + BigInt(amount);
          i++
      ) {
        accounts.push(await this.createNewAccountV2(BigInt(i)));
      }
    }
    return accounts;
  }

  async createNewAccountV2(index: bigint = BigInt(0)): Promise<AccountV2> {
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
      receipts: [],
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
    let accounts: AccountV3[] = [];

    const maxAccountIndex = this.getMaxAccountIndex();
    if (maxAccountIndex == undefined) {
      for (let i = BigInt(0); i < BigInt(amount); i++) {
        accounts.push(await this.createNewAccountV3(i, executions));
      }
    } else {
      for (
          let i = maxAccountIndex + BigInt(1);
          i < maxAccountIndex + BigInt(1) + BigInt(amount);
          i++
      ) {
        accounts.push(await this.createNewAccountV3(BigInt(i),  executions));
      }
    }
    return accounts;
  }

  async createNewAccountV3(
    index: bigint = BigInt(0),
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
      receipts: [],
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

  private getMaxAccountIndex(): bigint | undefined {
    let maxIndex = BigInt(0);
    if (this.accounts.length == 0 ) {
      return undefined
    }
    for (const account of this.accounts) {
      if (account.index > maxIndex) {
        maxIndex = account.index;
      }
    }
    return maxIndex;
  }

  getAccount(indexOrAddress: number | Address): Account {
    if (typeof indexOrAddress === "number") {
      for (const account of this.accounts) {
        if (account.index === BigInt(indexOrAddress)) {
          return account;
        }
      }
    } else {
      for (const account of this.accounts) {
        if (account.accountAddress === indexOrAddress) {
          return account;
        }
      }
    }
    throw new Error("Account not found");
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
          this.version == "2.0.0" ? BigInt(0) : BigInt(validatorAddress),
        ],
      });
  }

  isExist(indexOrAddress: number | Address) {
    if (typeof indexOrAddress === "number") {
      for (const account of this.accounts) {
        if (account.index === BigInt(indexOrAddress)) {
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
