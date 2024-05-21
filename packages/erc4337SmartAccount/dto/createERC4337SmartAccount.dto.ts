import { Chain, Transport, WalletClient } from "viem";
import { ERC4337SmartAccountSigner } from "../../plugins/types";
import type { Address } from "abitype";
import { Account } from "../types";

export class CreateERC4337SmartAccountParams<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
  TOwner extends ERC4337SmartAccountSigner = ERC4337SmartAccountSigner,
> {
  readonly owner: TOwner;

  readonly version: string;

  readonly name?: string;

  readonly factoryAddress?: Address;

  readonly accounts?: Account[];

  readonly entryPointAddress?: Address;

  readonly baseUrl?: string;
}
