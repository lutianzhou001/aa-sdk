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

  getNonce(
    accountAddress: Address,
    role: Hex,
    validatorAddress?: Address,
  ): Promise<bigint>;

  getFactoryAddress(): Address;
  getEntryPointAddress(): Address;

  isExist(indexOrAddress: number | Address): boolean;

  pushAccountTransaction(
    sender: Address,
    userOperationHash: Hex,
  ): SmartAccountTransactionReceipt;

  getAccountTransactionReceipts(
    sender: Address,
  ): SmartAccountTransactionReceipt[];

  updateAccountTransactionReceipts(
    sender: Address,
  ): Promise<SmartAccountTransactionReceipt[]>;
}
