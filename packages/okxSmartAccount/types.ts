import type { Address } from "abitype";
import type { Hash, Hex, SignTypedDataParameters, Transport } from "viem";
import { UserOperationDraft } from "../plugins/types";
import { UserOperation } from "permissionless/types/userOperation";
import {
  GeneratePaymasterSignatureType,
  GenerateUserOperationAndPackedParams,
} from "./dto/generateUserOperationAndPackedParams.dto";

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

export type AccountV3 = AccountV2 & {
  authenticationManagerAddress: Address;
};

export type SupportedPayMaster = {
  entryPoint: string;
  paymaster: Address;
  status: number;
  tokens: Address[];
  type: number;
};

export type AccountV2 = {
  initializeAccountData: Hex;
  initCode: Hex;
  index: bigint;
  accountAddress: Address;
  isDeployed: boolean;
  defaultECDSAValidator: Address;
  receipts: SmartAccountTransactionReceipt[];
};

export type SmartAccountTransactionReceipt = {
  userOperationHash: Hex;
  txHash: Hex | undefined;
  success: Hex | undefined;
};

export type Account = AccountV2 | AccountV3;

export interface ISmartContractAccount {
  generateUserOperationWithGasEstimation(
    userOperationDraft: UserOperationDraft,
    role: Hex,
    paymaster?: GeneratePaymasterSignatureType,
  ): Promise<UserOperation>;

  generateUserOperationAndPacked(
    params: GenerateUserOperationAndPackedParams,
  ): Promise<UserOperation>;

  sendUserOperationByOKXBundler(
    userOperation: UserOperation,
  ): Promise<SmartAccountTransactionReceipt>;

  execute(request: any): Promise<any>;

  signUserOperationHash(uopHash: Hash): Promise<Hash>;
  signMessage(msg: string | Uint8Array | Hex): Promise<Hex>;
  signTypedData(params: SignTypedDataParameters): Promise<Hash>;

  installValidator(
    accountAddress: Address,
    newValidatorAddress: Address,
    validateTemplate: Address,
  ): Hex;
  // uninstallValidator(): Promise<Hex>;

  encodeExecute(args: ExecuteCallDataArgs): Promise<Hex>;

  extend: <R>(extendFn: (self: this) => R) => this & R;
}
