import { Chain, PublicClient, Transport, WalletClient } from "viem";
import type { Address } from "abitype";

export class CreatePaymasterParameters<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
> {
  readonly version: string;

  readonly walletClient: WalletClient<TTransport, TChain>;

  readonly baseUrl: string;
}
