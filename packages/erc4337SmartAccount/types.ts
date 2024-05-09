import type { Address } from "abitype";
import type {
  Hash,
  Hex,
  SignTypedDataParameters,
  Transport,
  WalletClient,
} from "viem";
import { UserOperation0_7, UserOperationDraft } from "../plugins/types";
import { UserOperation } from "permissionless/types/userOperation";
import {
  GeneratePaymasterSignatureType,
  GenerateUserOperationAndPackedParams,
} from "./dto/generateUserOperationAndPackedParams.dto";
import { mode } from "viem/chains";

export type CallType = "single" | "delegatecall" | "batch" | undefined;

export type SignType = "EIP712" | "EIP191";

export type ExecutionMode = {
  callType?: CallType;
  try?: boolean;
  allowFailedExecution?: boolean;
  modeParams?: string;
};

export type ExecuteCallDataArgs =
  | {
      execRawData: {
        to: Address;
        value: bigint;
        data: Hex;
      };
      execMode: ExecutionMode;
    }
  | {
      execRawData: {
        to: Address;
        value: bigint;
        data: Hex;
        allowFailed: boolean;
      }[];
      execMode: ExecutionMode;
    }
  | {
      execRawData: {
        to: Address;
        value: bigint;
        data: Hex;
      }[];
      execMode: ExecutionMode;
    };

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
  defaultValidator: Address;
  authenticationManager: Address;
  receipts: SmartAccountTransactionReceipt[];
  version: string;
  deploymentHash: string;
};

export type SmartAccountTransactionReceipt = {
  userOperationHash: Hex;
  txHash: Hex | undefined;
  success: Hex | undefined;
};

export type UserOperationSimulationResponse = {
  success: boolean;
  message: any;
};

export type Account = AccountV2 | AccountV3;

export interface ISmartContractAccount {
  generateUserOperationWithGasEstimation(
    userOperationDraft: UserOperationDraft,
    role: Hex,
    paymaster?: GeneratePaymasterSignatureType,
  ): Promise<UserOperation<"v0.6"> | UserOperation0_7>;

  signAndPack(
    userOperation: UserOperation<"v0.6"> | UserOperation0_7,
    userOperationHash: Hex,
    sigTime: bigint,
  ): Promise<UserOperation<"v0.6"> | UserOperation0_7>;

  generateUserOperation(args: GenerateUserOperationAndPackedParams): Promise<{
    userOperation: UserOperation<"v0.6"> | UserOperation0_7;
    userOperationHash: Hex;
    sigTime: bigint;
  }>;

  sendUserOperationByERC4337Bundler(
    userOperation: UserOperation<"v0.6"> | UserOperation0_7,
    walletClient: WalletClient,
  ): Promise<SmartAccountTransactionReceipt>;

  signUserOperationHash(uopHash: Hash): Promise<Hash>;
  signMessage(msg: string | Uint8Array | Hex): Promise<Hex>;
  signTypedData(args: SignTypedDataParameters): Promise<Hash>;

  installValidator(
    accountAddress: Address,
    newValidatorAddress: Address,
    validateTemplate: Address,
  ): Hex;
  // uninstallValidator(): Promise<Hex>;

  encodeExecute(args: ExecuteCallDataArgs): Promise<Hex>;

  extend: <R>(extendFn: (self: this) => R) => this & R;
}
