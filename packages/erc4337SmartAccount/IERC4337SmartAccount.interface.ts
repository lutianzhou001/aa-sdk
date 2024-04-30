import {
  ERC4337SmartAccountSigner,
  UserOperation0_7,
  UserOperationDraft,
} from "../plugins/types";
import type { Hash, Hex, SignTypedDataParameters, WalletClient } from "viem";
import {
  GeneratePaymasterSignatureType,
  PackTxParams,
  SendTxParams,
} from "./dto/generateUserOperationAndPackedParams.dto";
import { UserOperation } from "permissionless/types/userOperation";
import type { Address } from "abitype";
import {
  Account,
  ExecuteCallDataArgs,
  SmartAccountTransactionReceipt,
} from "./types";

export interface IERC4337SmartAccount<
  TOwner extends ERC4337SmartAccountSigner = ERC4337SmartAccountSigner,
> {
  generateUserOperationWithGasEstimation<TOwner>(
    userOperationDraft: UserOperationDraft,
    role: Hex,
    paymaster?: GeneratePaymasterSignatureType,
  ): Promise<UserOperation<"v0.6"> | UserOperation0_7>;

  packTx(args: PackTxParams): Promise<{
    account: Account<TOwner>;
    userOperation: UserOperation<"v0.6"> | UserOperation0_7;
  }>;

  send(overrideBundler?: WalletClient): Promise<SmartAccountTransactionReceipt>;

  execute(request: any): Promise<any>;

  signUserOperationHash(uopHash: Hash): Promise<Hash>;
  signMessage(msg: string | Uint8Array | Hex): Promise<Hex>;
  signTypedData(args: SignTypedDataParameters): Promise<Hash>;

  installValidator(
    accountAddress: Address,
    newValidatorAddress: Address,
    validateTemplate: Address,
  ): Hex;

  encodeExecute(args: ExecuteCallDataArgs): Promise<Hex>;

  extend: <R>(extendFn: (self: this) => R) => this & R;
}
