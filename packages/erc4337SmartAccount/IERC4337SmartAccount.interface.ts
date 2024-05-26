import { ERC4337SmartAccountSigner } from "../plugins/types";
import type { Hash, Hex, SignTypedDataParameters, WalletClient } from "viem";
import {
  ExecuteCallDataArgs,
  PackTxMiddlewareOverride,
  SmartAccountTransactionReceipt,
} from "./types";

export interface IERC4337SmartAccount<
  TSigner extends ERC4337SmartAccountSigner = ERC4337SmartAccountSigner,
> {
  send(overrideBundler?: WalletClient): Promise<SmartAccountTransactionReceipt>;

  encodeExecute(args: ExecuteCallDataArgs): this;

  extend: <R>(extendFn: (self: this) => R) => this & R;
}
