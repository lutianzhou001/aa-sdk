import {
  ERC4337SmartAccountSigner,
} from "../plugins/types";
import type { Hash, Hex, SignTypedDataParameters, WalletClient } from "viem";
import {
  ExecuteCallDataArgs,
  PackTxMiddlewareOverride,
  SmartAccountTransactionReceipt,
} from "./types";

export interface IERC4337SmartAccount<
  TSigner extends ERC4337SmartAccountSigner = ERC4337SmartAccountSigner,
> {
  packTx(packTxMiddlewareOverride: PackTxMiddlewareOverride): Promise<this>;

  send(overrideBundler?: WalletClient): Promise<SmartAccountTransactionReceipt>;

  signUserOperationHash(uopHash: Hash): Promise<Hash>;
  signMessage(msg: string | Uint8Array | Hex): Promise<Hex>;
  signTypedData(args: SignTypedDataParameters): Promise<Hash>;

  encodeExecute(args: ExecuteCallDataArgs): this;

  extend: <R>(extendFn: (self: this) => R) => this & R;
}
