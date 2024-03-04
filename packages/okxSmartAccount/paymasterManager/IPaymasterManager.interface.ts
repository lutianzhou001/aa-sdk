import { SupportedPayMaster } from "../types";
import { UserOperation } from "permissionless/types/userOperation";
import { GeneratePaymasterSignatureType } from "../dto/generateUserOperationAndPackedParams.dto";

export interface IPaymasterManager {
  generatePaymasterSignature(
    userOperation: UserOperation,
    paymaster: GeneratePaymasterSignatureType,
  ): Promise<UserOperation>;

  getSupportedPaymasters(): Promise<SupportedPayMaster[]>;
}
