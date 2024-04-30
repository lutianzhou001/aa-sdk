import type { Hex } from "viem";
import type { Address } from "abitype";
import { Account, SmartAccountTransactionReceipt } from "../types";
import { ERC4337SmartAccountSigner } from "../../plugins/types";

export interface IAccountManager<
  TOwner extends ERC4337SmartAccountSigner = ERC4337SmartAccountSigner,
> {
  createNewAccount(
    owner: TOwner,
    index: bigint,
    version: string,
    executions: Hex[],
  ): Promise<Account<TOwner>>;

  batchCreateNewAccount(
    owner: TOwner,
    amount: number,
    version: string,
    executions: Hex[],
  ): Promise<void>;

  getAccount(indexOrAddress: number | Address): Account<TOwner>;
  getAccounts(): Account<TOwner>[];

  refreshAccount(indexOrAddress: number | Address): Promise<Account<TOwner>>;
  refreshAccounts(): Promise<Account<TOwner>[]>;

  getNonce(
    accountAddress: Address,
    role: Hex,
    validatorAddress?: Address,
  ): Promise<bigint>;

  isExist(indexOrAddress: number | Address): boolean;

  getAccountTransactionReceipts(
    sender: Address,
  ): SmartAccountTransactionReceipt[];

  refreshAccountTransactionReceipts(
    account: Account<TOwner>,
    sender: Address,
  ): Promise<SmartAccountTransactionReceipt[]>;
}
