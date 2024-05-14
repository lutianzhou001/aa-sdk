import { Address, type Hex } from "viem";
import { UserOperationDraft } from "../../plugins/types";
import { SigType } from "../types";

export class GenerateUserOperationAndPackedParams {
  readonly sigType: SigType;

  readonly role?: Hex = "0x00000000";

  readonly uop: UserOperationDraft;

  readonly _sigTime?: bigint;

  readonly paymaster?: GeneratePaymasterSignatureType;
}

export type GeneratePaymasterSignatureType = {
  paymaster: Address;
  token?: Address;
  paymasterVerificationGasLimit?: bigint;
  paymasterPostOpGasLimit?: bigint;
};

export type Version = "2.0.0" | "3.0.0";
