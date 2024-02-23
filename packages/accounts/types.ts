import type { Address } from "abitype";
import type { Hash, Hex, SignTypedDataParameters, Transport } from "viem";
import {
  GeneratePaymasterSignatureType,
  UserOperationDraft,
} from "../plugins/types";
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

export type AccountInfoV3 = AccountInfoV2 & {
  authenticationManagerAddress: Address;
};

export type SupportedPayMaster = {
  entryPoint: string;
  paymaster: Address;
  status: number;
  tokens: Address[];
  type: number;
};

export type AccountInfoV2 = {
  initializeAccountData: Hex;
  initCode: Hex;
  index: bigint;
  accountAddress: Address;
  isDeployed: boolean;
  defaultECDSAValidator: Address;
};

export type AccountInfo = AccountInfoV2 | AccountInfoV3;

export interface ISmartContractAccount {
  generateUserOperationWithGasEstimation(
    role: Hex,
    userOperationDraft: UserOperationDraft,
    paymaster?: GeneratePaymasterSignatureType
  ): Promise<UserOperation>;

  generateUserOperationAndPacked(
    signType: SignType,
    role: Hex,
    userOperationDraft: UserOperationDraft,
    _sigTime?: bigint,
    paymaster?: GeneratePaymasterSignatureType
  ): Promise<UserOperation>;

  sendUserOperationByAPI(userOperation: UserOperation): Promise<void>;

  execute(request: any): Promise<any>;

  signUserOperationHash(uopHash: Hash): Promise<Hash>;
  signMessage(msg: string | Uint8Array | Hex): Promise<Hex>;
  signTypedData(params: SignTypedDataParameters): Promise<Hash>;

  installValidator(
    accountAddress: Address,
    newValidatorAddress: Address,
    validateTemplate: Address
  ): Hex;
  // uninstallValidator(): Promise<Hex>;

  encodeExecute(args: ExecuteCallDataArgs): Promise<Hex>;

  extend: <R>(extendFn: (self: this) => R) => this & R;

  encodeUpgradeToAndCall: (
    upgradeToImplAddress: Address,
    upgradeToInitData: Hex
  ) => Promise<Hex>;

  // we get paymasterManager signature online.
  // generateUserOperationAndPackedWithFreeGasPayMaster(
  //   signType: SignType,
  //   role: Hex,
  //   userOperationDraft: Omit<UserOperationDraft, "paymasterAndData">,
  //   freeGasPayMaster: Address
  // ): Promise<UserOperation>;
  //
  // generateUserOperationAndPackedWithTokenPayMaster(
  //   signType: SignType,
  //   role: Hex,
  //   userOperationDraft: Omit<UserOperationDraft, "paymasterAndData">,
  //   tokenPayMaster: Address,
  //   tokenAddress: Address,
  //   exchangeRate: bigint
  // ): Promise<UserOperation>;
}
