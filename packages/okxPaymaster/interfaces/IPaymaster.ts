import { UserOperation } from "permissionless/types/userOperation";

export interface IPaymasterClient {
  getSupportedPaymasters(chainId: number): Promise<any>;
  getPaymasterData(userOp: UserOperation<"v0.7">): Promise<any>;
}
