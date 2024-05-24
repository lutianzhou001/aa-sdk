import type { Hex } from "viem";
import type { Address } from "abitype";
import { Account, SmartAccountTransactionReceipt } from "../types";
import { ERC4337SmartAccountSigner } from "../../plugins/types";

export interface IAccountManager<
  TSigner extends ERC4337SmartAccountSigner = ERC4337SmartAccountSigner,
> {
  createNewAccount(
    owner: TSigner,
    name: string,
    version: string,
    index: bigint,
    executions: Hex[],
  ): Promise<Account<TSigner>>;

  getAccounts(): Account<TSigner>[];
  getAccountCreationCodeHash(account: Account<TSigner>): Promise<Hex>;
  refreshAccounts(accounts: Account<TSigner>[]): Promise<void>;
  getNonce(
    account: Account<TSigner>,
    validatorAddress?: Address,
  ): Promise<bigint>;
}
