import { Chain, Transport, WalletClient } from "viem";
import { OKXSmartAccountSigner } from "../../plugins/types";
import type { Address } from "abitype";
import { Account } from "../types";

export class CreateOKXSmartAccountParams<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
  TSigner extends OKXSmartAccountSigner = OKXSmartAccountSigner
> {
  readonly walletClient: WalletClient<TTransport, TChain>;

  readonly version: Version;

  readonly name?: string;

  readonly factoryAddress?: Address;

  readonly accounts?: Account[];

  readonly entryPointAddress?: Address;

  readonly baseUrl?: string;
}

export type Version = "2.0.0" | "3.0.0";
