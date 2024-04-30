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
  parseAbiParameters,
  publicActions,
  Transport,
  WalletClient,
  zeroHash,
} from "viem";
import { smartAccountV3ABI } from "../../../abis/smartAccountV3.abi";
import { configuration, networkConfigurations } from "../../../configuration";
import { ERC4337SmartAccountSigner } from "../../plugins/types";
import { IAccountManager } from "./IAccountManager.interface";
import { Account, SmartAccountTransactionReceipt } from "../types";
import { accountFactoryV2ABI } from "../../../abis/accountFactoryV2.abi";
import { initializeAccountABI } from "../../../abis/initializeAccount.abi";
import { accountFactoryV3ABI } from "../../../abis/accountFactoryV3.abi";
import {
  getConfiguration,
  predictDeterministicAddress,
} from "../../common/utils";
import { CreateAccountManagerParameters } from "./createAccountManagerParams.dto";
import { EntryPointABI } from "../../../abis/EntryPoint.abi";
import { getChainId } from "viem/actions";
import axios from "axios";
import {
  BaseSmartAccountError,
  GetERC4337BundlerReceipt,
} from "../../error/constants";
import { EntryPointV0_7ABI } from "../../../abis/EntryPointV0_7.abi";
import { IManager } from "../moduleManager/IManager.interface";

export class AccountManager<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TOwner extends ERC4337SmartAccountSigner = ERC4337SmartAccountSigner,
  >
  implements IAccountManager, IManager
{
  protected accounts: Account<TOwner>[] = [];

  constructor(
    args: CreateAccountManagerParameters<TTransport, TChain, TOwner>,
  ) {}

  private async getCreationCodeHash(owner: TOwner, address: Hex): Promise<Hex> {
    const byteCode = await owner
      .getWalletClient()
      .extend(publicActions)
      .getBytecode({
        address: address,
      });
    return byteCode == undefined ? zeroHash : keccak256(byteCode);
  }

  pushAccountTransaction(
    sender: Address,
    userOperationHash: Hex,
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
    sender: Address,
  ): SmartAccountTransactionReceipt[] {
    const currentAccount = this.getAccount(sender);
    return currentAccount.receipts;
  }

  async refreshAccountTransactionReceipts(
    account: Account<TOwner>,
    sender: Address,
  ): Promise<SmartAccountTransactionReceipt[]> {
    const currentAccount = this.getAccount(sender);
    const receipts = currentAccount.receipts;
    let receiptsToUpdate: SmartAccountTransactionReceipt[] = [];
    for (const receipt of receipts) {
      if (receipt.success == undefined) {
        const res = await this.getERC4337BundlerReceipt(
          account,
          receipt.userOperationHash,
        );
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

  private async getERC4337BundlerReceipt(
    account: Account<TOwner>,
    userOperationHash: Hex,
  ): Promise<SmartAccountTransactionReceipt> {
    const req = {
      method: "post",
      maxBodyLength: Infinity,
      url:
        networkConfigurations.base_url +
        "mp/" +
        String(await getChainId(account.owner.getWalletClient())) +
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
      throw new GetERC4337BundlerReceipt(
        "getERC4337BundlerReceiptError",
        res.data.error.message,
      );
    } else {
      return res.data.result;
    }
  }

  async createNewAccount(
    owner: TOwner,
    index: bigint = BigInt(0),
    version: string,
    executions: Hex[] = [],
  ): Promise<Account<TOwner>> {
    return version === "2.0.0"
      ? await this.createNewAccountV2(owner, index)
      : await this.createNewAccountV3(owner, index, executions);
  }

  async batchCreateNewAccount(
    owner: TOwner,
    amount: number,
    version: string,
    executions: Hex[] = [],
  ): Promise<void> {
    if (amount <= 0) {
      throw new Error("invalid amount");
    }
    const index = this.accounts.filter(
      (account) => account.getVersion() === version,
    ).length;
    for (let i = index; i < index + amount; i++) {
      version === "2.0.0"
        ? await this.createNewAccountV2(owner, BigInt(i))
        : await this.createNewAccountV3(owner, BigInt(i), executions);
    }
  }

  private async createNewAccountV2(
    owner: TOwner,
    index: bigint = BigInt(0),
  ): Promise<Account<TOwner>> {
    const initializeAccountData = encodeAbiParameters(
      parseAbiParameters("address creator, bytes init"),
      [await owner.getAddress(), "0x"],
    );

    const salt = keccak256(
      encodePacked(["address", "uint256"], [await owner.getAddress(), index]),
    );

    const accountAddress = getCreate2Address({
      from: getConfiguration("2.0.0").factoryAddress,
      salt: salt,
      bytecodeHash: configuration.v2.CREATION_CODE,
    });

    const initCode = encodePacked(
      ["address", "bytes"],
      [
        getConfiguration("2.0.0").factoryAddress,
        encodeFunctionData({
          abi: accountFactoryV2ABI,
          functionName: "createAccount",
          args: [
            configuration.v2.SMART_ACCOUNT_TEMPLATE_ADDRESS,
            initializeAccountData,
            index,
          ],
        }),
      ],
    );

    const isDeployed = await this.updateDeployment(
      owner.getWalletClient(),
      accountAddress,
    );

    const _account: Account<TOwner> = {
      owner: owner,
      index: index,
      accountAddress: accountAddress,
      isDeployed: isDeployed,
      defaultECDSAValidator: await owner.getAddress(),
      authenticationManagerAddress: undefined,
      receipts: [],
      initCode: initCode,

      getVersion(): string {
        return "2.0.0";
      },
      getCreationCodeHash: () => {
        return this.getCreationCodeHash(owner, accountAddress);
      },
    };

    checkDuplicateAccount(_account, this.accounts);
    return _account;
  }

  private async createNewAccountV3(
    owner: TOwner,
    index: bigint = BigInt(0),
    executions: Hex[] = [],
  ): Promise<Account<TOwner>> {
    const initializeData = encodeAbiParameters(initializeAccountABI[0].inputs, [
      await owner.getAddress(),
      configuration.v3.ECDSA_VALIDATOR_TEMPLATE_ADDRESS,
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
        getConfiguration("3.0.0").factoryAddress,
        encodeFunctionData({
          abi: accountFactoryV3ABI,
          functionName: "createAccount",
          args: [
            configuration.v3.SMART_ACCOUNT_TEMPLATE_ADDRESS,
            initializeAccountData,
            index,
          ],
        }),
      ],
    );

    const salt: Hash = keccak256(
      encodePacked(["bytes", "uint256"], [initializeAccountData, index]),
    );

    const accountAddress = getCreate2Address({
      from: getConfiguration("3.0.0").factoryAddress,
      salt: salt,
      bytecodeHash: configuration.v3.SMART_ACCOUNT_PROXY_CODE_HASH,
    });

    const authenticationManagerAddress: Address = predictDeterministicAddress(
      configuration.v3.AUTHENTICATION_MANAGER_TEMPLATE,
      configuration.v3.VERSION_HASH,
      accountAddress,
    );

    const defaultECDSAValidator: Address = predictDeterministicAddress(
      configuration.v3.ECDSA_VALIDATOR_TEMPLATE_ADDRESS,
      keccak256(encodePacked(["bytes"], [await owner.getAddress()])),
      authenticationManagerAddress,
    );

    const isDeployed = await this.updateDeployment(
      owner.getWalletClient(),
      accountAddress,
    );

    const _account: Account<TOwner> = {
      owner: owner,
      index: index,
      accountAddress: accountAddress,
      isDeployed: isDeployed,
      defaultECDSAValidator: defaultECDSAValidator,
      authenticationManagerAddress: authenticationManagerAddress,
      receipts: [],
      initCode: initCode,

      getVersion(): string {
        return "3.0.0";
      },
      getCreationCodeHash: () => {
        return this.getCreationCodeHash(owner, accountAddress);
      },
    };
    checkDuplicateAccount(_account, this.accounts);
    return _account;
  }

  public async updateDeployment(
    walletClient: WalletClient,
    accountAddress: Address,
  ): Promise<boolean> {
    const contractCode =
      (await walletClient.extend(publicActions).getBytecode({
        address: accountAddress,
      })) ?? "0x";

    return contractCode.length > 2;
  }

  getAccount(indexOrAddress: number | Address): Account<TOwner> {
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
    throw new BaseSmartAccountError(
      "BaseSmartAccountError",
      "Account not found",
    );
  }

  getAccounts(): Account<TOwner>[] {
    return this.accounts;
  }

  async refreshAccount(
    indexOrAddress: number | Address,
  ): Promise<Account<TOwner>> {
    if (typeof indexOrAddress === "number") {
      for (const account of this.accounts) {
        if (account.index === BigInt(indexOrAddress)) {
          return {
            ...account,
            isDeployed: account.isDeployed
              ? true
              : await this.updateDeployment(
                  account.owner.getWalletClient(),
                  account.accountAddress,
                ),
          };
        }
      }
    } else {
      for (const account of this.accounts) {
        if (account.accountAddress === indexOrAddress) {
          return {
            ...account,
            isDeployed: account.isDeployed
              ? true
              : await this.updateDeployment(
                  account.owner.getWalletClient(),
                  account.accountAddress,
                ),
          };
        }
      }
    }
    throw new BaseSmartAccountError(
      "BaseSmartAccountError",
      "Account not found",
    );
  }
  async refreshAccounts(): Promise<Account<TOwner>[]> {
    for (const account of this.accounts) {
      account.isDeployed = await this.updateDeployment(
        account.owner.getWalletClient(),
        account.accountAddress,
      );
    }
    return this.accounts;
  }

  async getNonce(
    accountAddress: Address,
    role: Hex, // for future use(v4)
    validatorAddress?: Address,
  ): Promise<bigint> {
    const account = this.getAccount(accountAddress);
    validatorAddress = validatorAddress ?? account.defaultECDSAValidator;
    if (account.getVersion() == "2.0.0") {
      return await account.owner
        .getWalletClient()
        .extend(publicActions)
        .readContract({
          address: getConfiguration(account.getVersion()).entryPointAddress,
          abi: EntryPointABI,
          functionName: "getNonce",
          args: [account.accountAddress, BigInt(0)],
        });
    } else {
      // @ts-ignore
      return await this.owner
        .getWalletClient()
        .extend(publicActions)
        .readContract({
          address: getConfiguration(account.getVersion()).entryPointAddress,
          abi: EntryPointV0_7ABI,
          functionName: "getNonce",
          args: [account.accountAddress, BigInt(validatorAddress)],
        });
    }
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

  onInstall(initialization: any) {}

  onUninstall(uninstallation: any) {}
}

function checkDuplicateAccount<
  TOwner extends ERC4337SmartAccountSigner = ERC4337SmartAccountSigner,
>(_account: Account<TOwner>, accounts: Account<TOwner>[]): void {
  const duplicate = accounts.find(
    (account) =>
      account.index === _account.index &&
      account.getVersion() === _account.getVersion(),
  );

  if (duplicate) {
    duplicate.accountAddress = _account.accountAddress;
    duplicate.initCode = _account.initCode;
    duplicate.isDeployed = _account.isDeployed;
  } else {
    accounts.push(_account);
  }
}
