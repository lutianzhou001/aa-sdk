import { Chain, PublicClient, Transport, WalletClient } from "viem";
import { OKXSmartAccountSigner } from "../plugins/types";
import type { Address } from "abitype";
import { AccountInfo } from "./types";

export class createOKXSmartAccountParams<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
  TSigner extends OKXSmartAccountSigner = OKXSmartAccountSigner
> {
  readonly publicClient: PublicClient<TTransport, TChain>;

  // readonly walletClient: WalletClient<TTransport, TChain>;

  readonly name?: string;

  readonly version: Version;

  readonly owner: TSigner;

  readonly factoryAddress?: Address;

  readonly accountInfos?: AccountInfo[];

  readonly entryPointAddress?: Address;
}

export type Version = "2.0.0" | "3.0.0";
