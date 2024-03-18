import { Chain, PublicClient, Transport, WalletClient } from "viem";
import type { Address } from "abitype";
import { ERC4337SmartAccountSigner } from "../../plugins/types";

export class CreateAccountManagerParameters<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
  TSigner extends ERC4337SmartAccountSigner = ERC4337SmartAccountSigner,
> {
  readonly entryPointAddress: Address;

  readonly owner: TSigner;

  readonly version: string;

  readonly factoryAddress: Address;

  readonly baseUrl: string;
}
