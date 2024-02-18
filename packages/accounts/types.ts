import type { Address } from "abitype";
import type { Hash, Hex, SignTypedDataParameters, Transport } from "viem";
import { OKXSmartAccountSigner, UserOperationDraft } from "../plugins/types";
import { UserOperation } from "permissionless/types/userOperation";

export type CallType = "call" | "delegatecall";

export type SignType = "EIP712" | "EIP191";

export type ExecuteCallDataArgs =
  | {
      to: Address;
      value: bigint;
      data: Hex;
      callType: CallType | undefined;
    }
  | {
      to: Address;
      value: bigint;
      data: Hex;
      callType: CallType | undefined;
    }[];

export type AccountInfo = {
  initializeAccountData: Hex;
  initCode: Hex;
  index: bigint;
  accountAddress: Address;
  isDeployed: boolean;
  authenticationManagerAddress: Address;
  defaultECDSAValidator: Address;
};

export interface ISmartContractAccount<
  TTransport extends Transport = Transport,
  TOwner extends OKXSmartAccountSigner | undefined =
    | OKXSmartAccountSigner
    | undefined
> {
  getAccountInfos(): AccountInfo[];

  getAccountInfo(accountAddress: Address, index: bigint): AccountInfo;

  generateNewAccountInfo(
    index: bigint,
    executions: Hex[]
  ): Promise<AccountInfo>;

  batchGenerateNewAccountInfo(
    amount: number,
    executions: Hex[]
  ): Promise<AccountInfo[]>;

  encodeExecute(args: ExecuteCallDataArgs): Promise<Hex>;

  generateUserOperation(
    role: Hex,
    accountAddress: Address,
    validatorAddress: Address,
    userOperationDraft: UserOperationDraft
  ): Promise<UserOperation>;

  generateUserOperationAndPacked(
    signType: SignType,
    accountAddress: Address,
    role: Hex,
    userOperationDraft: UserOperationDraft,
    _sigTime?: bigint,
    validatorAddress?: Address
  ): Promise<UserOperation>;

  sendUserOperationSimulation(userOperation: UserOperation): Promise<any>;

  sendFromEOASimulation(
    account: Address,
    to: Address,
    value: bigint,
    data: Hex
  ): Promise<any>;

  execute(request: any): Promise<any>;

  getNonce(
    accountAddress: Address,
    role: Hex,
    validatorAddress?: Address
  ): Promise<bigint>;

  signUserOperationHash(uopHash: Hash): Promise<Hash>;

  signMessage(msg: string | Uint8Array | Hex): Promise<Hex>;

  signTypedData(params: SignTypedDataParameters): Promise<Hash>;

  getOwner(): TOwner;

  getFactoryAddress(): Address;

  getEntryPointAddress(): Address;

  extend: <R>(extendFn: (self: this) => R) => this & R;

  encodeUpgradeToAndCall: (
    upgradeToImplAddress: Address,
    upgradeToInitData: Hex
  ) => Promise<Hex>;
}
