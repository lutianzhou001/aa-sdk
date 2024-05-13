import { Address, type Hex } from "viem";
import {
  ERC4337SmartAccountSigner,
  UserOperation0_7,
  UserOperationDraft,
} from "../../plugins/types";
import { Account, SignType } from "../types";
import { UserOperation } from "permissionless/types/userOperation";

export class PackTxParams {
  readonly signType?: SignType = "EIP191";

  readonly uop: UserOperationDraft;

  readonly _sigTime?: bigint;

  readonly paymaster?: GeneratePaymasterSignatureType;
}

export class SendTxParams<
  TSigner extends ERC4337SmartAccountSigner = ERC4337SmartAccountSigner,
> {
  readonly userOperation: UserOperation<"v0.6"> | UserOperation0_7;

  readonly account: Account<TSigner>;
}

export type GeneratePaymasterSignatureType = {
  paymaster: Address;
  token?: Address;
  paymasterVerificationGasLimit?: bigint;
  paymasterPostOpGasLimit?: bigint;
};

export type Version = "2.0.0" | "3.0.0";
