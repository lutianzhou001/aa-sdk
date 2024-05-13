import { Account, SupportedPayMaster } from "../types";
import { UserOperation } from "permissionless/types/userOperation";
import { GeneratePaymasterSignatureType } from "../dto/generateUserOperationAndPackedParams.dto";
import {
  ERC4337SmartAccountSigner,
  UserOperation0_7,
} from "../../plugins/types";

export interface IPaymasterManager<
  TSigner extends ERC4337SmartAccountSigner = ERC4337SmartAccountSigner,
> {
  generatePaymasterSignature(
    account: Account<TSigner>,
    userOperation: UserOperation<"v0.6"> | UserOperation0_7,
    paymaster: GeneratePaymasterSignatureType,
  ): Promise<UserOperation<"v0.6"> | UserOperation0_7>;

  getSupportedPaymasters(
    account: Account<TSigner>,
  ): Promise<SupportedPayMaster[]>;
}
