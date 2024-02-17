import { Chain, PublicClient, Transport } from "viem";
import { OKXSmartAccountSigner } from "../plugins/types";
import type { Address } from "abitype";
import { AccountInfo } from "./types";

export class createOKXSmartAccountParams<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
  TSigner extends OKXSmartAccountSigner = OKXSmartAccountSigner
> {
  readonly publicClient: PublicClient<TTransport, TChain>;

  readonly name?: string;

  readonly version?: string;

  // readonly walletClient: WalletClient<TTransport, TChain>;

  readonly owner: TSigner;

  readonly factoryAddress?: Address;

  readonly accountInfos?: AccountInfo[];

  readonly entryPointAddress?: Address;
}
