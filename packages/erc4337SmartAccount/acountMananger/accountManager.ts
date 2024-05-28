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
  toHex,
  Transport,
  zeroAddress,
  zeroHash,
} from "viem";
import { smartAccountV3ABI } from "../../../abis/smartAccountV3.abi";
import { configuration } from "../../../configuration";
import { ERC4337SmartAccountSigner } from "../../plugins/types";
import { IAccountManager } from "./IAccountManager.interface";
import { Account, SmartAccountTransactionReceipt } from "../types";
import { initializeAccountABI } from "../../../abis/initializeAccount.abi";
import { accountFactoryV3ABI } from "../../../abis/accountFactoryV3.abi";
import {
  getConfiguration,
  predictDeterministicAddress,
} from "../../common/utils";
import { EntryPointV0_7ABI } from "../../../abis/EntryPointV0_7.abi";
import { IManager } from "../moduleManager/IManager.interface";
import { ENTRYPOINT_ADDRESS_V07, isSmartAccountDeployed } from "permissionless";

export class AccountManager<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TSigner extends ERC4337SmartAccountSigner = ERC4337SmartAccountSigner,
  >
  implements IAccountManager, IManager
{
  protected accounts: Account<TSigner>[] = [];

  constructor() {}

  async getAccountCreationCodeHash(account: Account<TSigner>): Promise<Hex> {
    const byteCode = await account.signer.publicClient.getBytecode({
      address: account.accountAddress,
    });
    return byteCode == undefined ? zeroHash : keccak256(byteCode);
  }

  pushAccountTransaction(
    account: Account<TSigner>,
    userOperationHash: Hex,
  ): SmartAccountTransactionReceipt {
    const receipt: SmartAccountTransactionReceipt = {
      userOperationHash: userOperationHash,
      txHash: undefined,
      success: undefined,
    };
    account.receipts.push(receipt);
    return receipt;
  }
  //
  // getAccountTransactionReceipts(
  //   sender: Address,
  // ): SmartAccountTransactionReceipt[] {
  //   const currentAccount = this.getAccount(sender);
  //   return currentAccount.receipts;
  // }
  //
  // async refreshAccountTransactionReceipts(
  //   account: Account<TSigner>,
  //   sender: Address,
  // ): Promise<SmartAccountTransactionReceipt[]> {
  //   const currentAccount = this.getAccount(sender);
  //   const receipts = currentAccount.receipts;
  //   let receiptsToUpdate: SmartAccountTransactionReceipt[] = [];
  //   for (const receipt of receipts) {
  //     if (receipt.success == undefined) {
  //       const res = await this.getERC4337BundlerReceipt(
  //         account,
  //         receipt.userOperationHash,
  //       );
  //       receipt.success = res.success;
  //       receipt.txHash = res.txHash;
  //     }
  //     receiptsToUpdate.push({
  //       userOperationHash: receipt.userOperationHash,
  //       txHash: receipt.txHash,
  //       success: receipt.success,
  //     });
  //   }
  //   return receiptsToUpdate;
  // }
  //
  // private async getERC4337BundlerReceipt(
  //   account: Account<TSigner>,
  //   userOperationHash: Hex,
  // ): Promise<SmartAccountTransactionReceipt> {
  //   const req = {
  //     method: "post",
  //     maxBodyLength: Infinity,
  //     url:
  //       networkConfigurations.base_url +
  //       "mp/" +
  //       String(await getChainId(account.signer.publicClient)) +
  //       "/eth_getUserOperationReceipt",
  //     headers: {
  //       "Content-Type": "application/json",
  //       Cookie: "locale=en-US",
  //     },
  //     data: JSON.stringify({
  //       id: 1,
  //       jsonrpc: "2.0",
  //       method: "eth_getUserOperationReceipt",
  //       params: [userOperationHash],
  //     }),
  //   };
  //   const res = await axios.request(req);
  //   if (res.data.error) {
  //     throw new GetERC4337BundlerReceipt(
  //       "getERC4337BundlerReceiptError",
  //       res.data.error.message,
  //     );
  //   } else {
  //     return res.data.result;
  //   }
  // }

  public async createNewAccount(
    signer: TSigner,
    name: string,
    version: string,
    index: bigint = BigInt(0),
    executions: Hex[] = [],
  ): Promise<Account<TSigner>> {
    const initializeData = encodeAbiParameters(initializeAccountABI[0].inputs, [
      await signer.getSubject(),
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
        getConfiguration(version).factoryAddress,
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

    const accountAddress: Address = (await signer.publicClient.readContract({
      address: configuration.v3.FACTORY_ADDRESS,
      abi: accountFactoryV3ABI,
      functionName: "computeAddress",
      args: [zeroAddress, initializeAccountData, index],
    })) as Address;

    const authenticationManagerAddress: Address = predictDeterministicAddress(
      configuration.v3.AUTHENTICATION_MANAGER_TEMPLATE,
      configuration.v3.VERSION_HASH,
      accountAddress,
    );

    const defaultValidator: Address = predictDeterministicAddress(
      signer.signerTemplate,
      keccak256(encodePacked(["bytes"], [await signer.getSubject()])),
      authenticationManagerAddress,
    );

    // TODO: need to check why the response takes too long time
    // const nameHash = await signer.publicClient.readContract({
    //   address: configuration.v3.AUTHENTICATION_MANAGER_TEMPLATE,
    //   abi: authenticationManagerABI,
    //   functionName: "HASH_NAME",
    //   args: [],
    // });
    //
    // const versionHash = await signer.publicClient.readContract({
    //   address: configuration.v3.AUTHENTICATION_MANAGER_TEMPLATE,
    //   abi: authenticationManagerABI,
    //   functionName: "HASH_VERSION",
    //   args: [],
    // });

    // if (
    //   keccak256(toHex(name)) != nameHash ||
    //   keccak256(toHex(version)) != versionHash
    // ) {
    //   throw new Error(
    //     "name or version hash not match onchain version, pls check",
    //   );
    // }

    const _account: Account<TSigner> = {
      signer: signer,
      accountAddress: accountAddress,
      isDeployed: await isSmartAccountDeployed(
        signer.publicClient,
        accountAddress,
      ),
      nonceKey: defaultValidator as Hex,
      authenticationManagerAddress: authenticationManagerAddress,
      receipts: [],
      initCode: initCode,
      version: version,
      name: name,
    };
    await this.refreshAccounts([_account]);
    return _account;
  }

  getAccounts(): Account<TSigner>[] {
    return this.accounts;
  }

  async refreshAccounts(accounts: Account<TSigner>[]): Promise<void> {
    for (const account of this.accounts) {
      account.isDeployed = await isSmartAccountDeployed(
        account.signer.publicClient,
        account.accountAddress,
      );
    }
  }

  async getNonce(account: Account<TSigner>): Promise<bigint> {
    // @ts-ignore
    return await account.signer.publicClient.readContract({
      address: ENTRYPOINT_ADDRESS_V07,
      abi: EntryPointV0_7ABI,
      functionName: "getNonce",
      args: [account.accountAddress, BigInt(account.nonceKey)],
    });
  }

  onInstall(initialization: any) {}

  onUninstall(uninstallation: any) {}
}
