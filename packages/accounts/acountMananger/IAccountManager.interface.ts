import type { Hex } from "viem";
import type { Address } from "abitype";
import { AccountInfo, AccountInfoV2, AccountInfoV3 } from "../types";

export interface IAccountManager {
  createNewAccountInfoV2(index: bigint): Promise<AccountInfoV2>;
  batchCreateNewAccountInfoV2(amount: number): Promise<AccountInfoV2[]>;

  createNewAccountInfoV3(
    index: bigint,
    executions: Hex[]
  ): Promise<AccountInfoV3>;

  batchCreateNewAccountInfoV3(
    amount: number,
    executions: Hex[]
  ): Promise<AccountInfoV3[]>;

  getAccountInfo(accountAddress: Address, index: bigint): AccountInfo;
  getAccountInfos(): AccountInfo[];

  getNonce(
    accountAddress: Address,
    role: Hex,
    validatorAddress?: Address
  ): Promise<bigint>;

  getFactoryAddress(): Address;
  getEntryPointAddress(): Address;
}
