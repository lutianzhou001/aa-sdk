import { Chain, PublicClient, Transport, WalletClient } from "viem";
import type { Address } from "abitype";

export class createPaymasterParams<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
> {
  readonly walletClient: WalletClient<TTransport, TChain>;

  readonly entryPointAddress: Address;

  readonly baseUrl: string;
}
