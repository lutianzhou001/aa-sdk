import type { Hex } from "viem";
import type { Address } from "abitype";
import { Account, AccountV2, AccountV3 } from "../types";

export interface IAccountManager {
  createNewAccount(index: bigint, executions: Hex[]): Promise<Account>;
  batchCreateNewAccount(amount: number, executions: Hex[]): Promise<Account[]>;

  createNewAccountV2(index: bigint): Promise<AccountV2>;
  batchCreateNewAccountV2(amount: number): Promise<AccountV2[]>;

  createNewAccountV3(index: bigint, executions: Hex[]): Promise<AccountV3>;

  batchCreateNewAccountV3(
    amount: number,
    executions: Hex[]
  ): Promise<AccountV3[]>;

  getAccount(accountAddress: Address, index: bigint): Account;
  getAccounts(): Account[];

  getNonce(
    accountAddress: Address,
    role: Hex,
    validatorAddress?: Address
  ): Promise<bigint>;

  getFactoryAddress(): Address;
  getEntryPointAddress(): Address;

  isExist(indexOrAddress: number | Address): boolean;
}
