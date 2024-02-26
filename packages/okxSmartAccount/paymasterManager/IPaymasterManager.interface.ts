import { SupportedPayMaster } from "../types";
import { UserOperation } from "permissionless/types/userOperation";
import { GeneratePaymasterSignatureType } from "../../plugins/types";

export interface IPaymasterManager {
  generatePaymasterSignature(
    userOperation: UserOperation,
    paymaster: GeneratePaymasterSignatureType
  ): Promise<UserOperation>;

  getSupportedPaymasters(): Promise<SupportedPayMaster[]>;
}
