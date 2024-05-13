import { Chain, Transport, WalletClient } from "viem";
import { ERC4337SmartAccountSigner } from "../../plugins/types";
import { Account, ManagerController } from "../types";

export class CreateERC4337SmartAccountParams<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
  TSigner extends ERC4337SmartAccountSigner = ERC4337SmartAccountSigner,
> {
  readonly managerController: ManagerController<TTransport, TChain, TSigner>;
}
