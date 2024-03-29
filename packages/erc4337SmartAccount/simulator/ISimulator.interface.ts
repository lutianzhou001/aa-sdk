import type { Chain, Hex, Transport } from "viem";
import { UserOperation } from "permissionless/types/userOperation";
import type { Address } from "abitype";

export interface ISimulator {
  sendFromEOASimulationByPublicClient(
    account: Address,
    to: Address,
    value: bigint,
    data: Hex,
  ): Promise<any>;

  sendUserOperationSimulation(
    userOperation: UserOperation<"v0.6">,
    bundler?: Address,
  ): Promise<any>;
}
