import type { Chain, Hex, Transport } from "viem";
import { UserOperation } from "permissionless/types/userOperation";
import type { Address } from "abitype";

export interface ISimulator {
  sendUserOperationSimulationByOKXBundler(
    userOperation: UserOperation
  ): Promise<any>;

  sendFromEOASimulationByPublicClient(
    account: Address,
    to: Address,
    value: bigint,
    data: Hex
  ): Promise<any>;

  sendUserOperationSimulationByPublicClient(
    userOperation: UserOperation
  ): Promise<any>;
}
