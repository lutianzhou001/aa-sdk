import { Chain, PublicClient, Transport, WalletClient } from "viem";
import type { Address } from "abitype";
import { OKXSmartAccountSigner } from "../../plugins/types";

export class createSimulatorParams<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
  TSigner extends OKXSmartAccountSigner = OKXSmartAccountSigner,
> {
  readonly entryPointAddress: Address;

  readonly owner: TSigner;
}
