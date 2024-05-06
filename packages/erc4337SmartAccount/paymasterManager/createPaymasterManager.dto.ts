import { Chain, PublicClient, Transport, WalletClient } from "viem";
import type { Address } from "abitype";

export class CreatePaymasterParameters<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
> {
  readonly publicClient: PublicClient<TTransport, TChain>;

  readonly entryPointAddress: Address;

  readonly baseUrl: string;

  readonly version: string;
}
