import { SupportedPayMaster } from "../types";
import { UserOperation } from "permissionless/types/userOperation";
import { GeneratePaymasterSignatureType } from "../dto/generateUserOperationAndPackedParams.dto";
import { UserOperation0_7 } from "../../plugins/types";

export interface IPaymasterManager {
  generatePaymasterSignature(
    userOperation: UserOperation<"v0.6"> | UserOperation0_7,
    paymaster: GeneratePaymasterSignatureType,
  ): Promise<UserOperation<"v0.6"> | UserOperation0_7>;

  getSupportedPaymasters(): Promise<SupportedPayMaster[]>;
}
