import { Chain, Transport, WalletClient } from "viem";
import { ERC4337SmartAccountSigner } from "../../plugins/types";
import type { Address } from "abitype";
import { Account } from "../types";

export class CreateERC4337SmartAccountParams<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
  TSigner extends ERC4337SmartAccountSigner = ERC4337SmartAccountSigner,
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
