import type { Hex } from "viem";
import type { Address } from "abitype";
import { Account, SmartAccountTransactionReceipt } from "../types";
import { ERC4337SmartAccountSigner } from "../../plugins/types";

export interface IAccountManager<
  TSigner extends ERC4337SmartAccountSigner = ERC4337SmartAccountSigner,
> {
  createNewAccount(
    owner: TSigner,
    index: bigint,
    version: string,
    executions: Hex[],
  ): Promise<Account<TSigner>>;

  batchCreateNewAccount(
    owner: TSigner,
    amount: number,
    version: string,
    executions: Hex[],
  ): Promise<void>;

  getAccounts(): Account<TSigner>[];
  getAccountCreationCodeHash(account: Account<TSigner>): Promise<Hex>;
  refreshAccounts(accounts: Account<TSigner>[]): Promise<void>;
  getNonce(
    account: Account<TSigner>,
    validatorAddress?: Address,
  ): Promise<bigint>;
}
