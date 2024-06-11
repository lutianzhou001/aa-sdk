import type { Address } from "abitype";
import type { Chain, Hash, Hex, Transport } from "viem";
import { OKXAASigner } from "../plugins/types";
import { UserOperation } from "permissionless/types/userOperation";
import { PackedUserOperation } from "permissionless/types";

export enum SigType {
  EIP712 = "EIP712",
  EIP191 = "EIP191",
}

export type ExecutionMode = {
  try?: boolean;
  allowFailedExecution?: boolean;
  modeParams?: string;
};

export type GasEstimationOverride = {
  callGasLimit?: bigint;
  preVerificationGas?: bigint;
  verificationGasLimit?: bigint;
};

export type FeeDataOverride = {
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
};

export type PackTxMiddlewareOverride = {
  gasEstimationOverride?: GasEstimationOverride;
  feeDataOverride?: FeeDataOverride;
  sigTimeOverride?: bigint;
};

interface BaseExecuteCallData {
  to: Address;
  value: bigint;
  data: Hex;
}

interface ExecuteCallDataWithAllowFailed extends BaseExecuteCallData {
  allowFailed?: boolean;
}

export type ExecuteCallDataArgs =
  | ExecuteCallDataWithAllowFailed
  | ExecuteCallDataWithAllowFailed[];

export type SupportedPayMaster = {
  entryPoint: string;
  paymaster: Address;
  status: number;
  tokens: Address[];
  type: number;
};

export type Runtime<TSigner extends OKXAASigner = OKXAASigner> = {
  okxSmartAccount: OKXSmartAccount<TSigner>;
  userOperation: UserOperation<"v0.7">;
  packedUserOperation: PackedUserOperation;
  userOperationHash: Hex;
  rawPaymaster?: RawPaymaster;
  sigType?: SigType;
  sigTime?: bigint;
};

export type RawPaymaster = {
  paymasterAddress: Address;
  paymasterToken?: Address;
  paymasterVerificationGasLimit?: bigint;
  paymasterPostOpGasLimit?: bigint;
};

export type OKXSmartAccount<TSigner extends OKXAASigner = OKXAASigner> = {
  signer: TSigner;
  accountAddress: Address;
  nonceKey: Hex;
  isDeployed: boolean;
  authenticationManagerAddress: Address;
  initCode: Hex;
  version: string;
  name: string;
};
