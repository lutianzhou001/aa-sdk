import type { Hex } from "viem";
import type { Address } from "abitype";
import {
  Account,
  AccountV2,
  AccountV3,
  SmartAccountTransactionReceipt,
} from "../types";

export interface IAccountManager {
  createNewAccount(index: bigint, executions: Hex[]): Promise<Account>;
  batchCreateNewAccount(amount: number, executions: Hex[]): Promise<Account[]>;

  getAccount(indexOrAddress: number | Address): Account;
  getAccounts(): Account[];

  refreshAccount(indexOrAddress: number | Address): Promise<Account>;
  refreshAccounts(): Promise<Account[]>;

  getNonce(
    accountAddress: Address,
    role: Hex,
    validatorAddress?: Address,
  ): Promise<bigint>;

  getFactoryAddress(): Address;
  getEntryPointAddress(): Address;

  isExist(indexOrAddress: number | Address): boolean;

  getAccountTransactionReceipts(
    sender: Address,
  ): SmartAccountTransactionReceipt[];

  refreshAccountTransactionReceipts(
    sender: Address,
  ): Promise<SmartAccountTransactionReceipt[]>;
}
