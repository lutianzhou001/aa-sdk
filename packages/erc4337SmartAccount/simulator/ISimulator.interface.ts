import { UserOperation } from "permissionless/types/userOperation";
import type { Address } from "abitype";
import { Account } from "../types";
import { ERC4337SmartAccountSigner } from "../../plugins/types";

export interface ISimulator<
  TSigner extends ERC4337SmartAccountSigner = ERC4337SmartAccountSigner,
> {
  sendUserOperationSimulation(
    account: Account<TSigner>,
    userOperation: UserOperation<"v0.6">,
    bundler?: Address,
  ): Promise<any>;
}
