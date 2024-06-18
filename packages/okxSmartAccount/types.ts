import type { Address } from "abitype";
import type { Chain, Hash, Hex, PublicClient, Transport } from "viem";
import { OKXAASigner } from "../plugins/types";
import { UserOperation } from "permissionless/types/userOperation";
import { PackedUserOperation } from "permissionless/types";
import { PaymasterClient } from "../okxPaymaster/paymaster";
import { IPaymasterClient } from "../okxPaymaster/interfaces/IPaymaster";
import { IBundlerClient } from "../okxBundler/interfaces/IBundler";
import { DeploymentState } from "./BaseSmartContractAccount";

export enum SigType {
  EIP712 = "EIP712",
  EIP191 = "EIP191",
}

export enum PaymasterMode {
  FREE_GAS_MODE = "0x00",
  TOKEN_MODE = "0x01",
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
  paymasterVerificationGasLimit?: bigint;
  postVerificationGasLimit?: bigint;
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

export type DeployCallData = "0x";

export type ExecuteCallDataArgs =
  | ExecuteCallDataWithAllowFailed
  | ExecuteCallDataWithAllowFailed[]
  | DeployCallData;

export type SupportedPayMaster = {
  entryPoint: string;
  paymaster: Address;
  status: number;
  tokens: Address[];
  type: number;
};

export type PaymasterRawData = {
  paymasterMode: PaymasterMode;
  paymasterAddress: Address;
  paymasterToken?: Address;
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

export type BaseSmartContractAccountConstructParams<
  TSigner extends OKXAASigner = OKXAASigner,
> = {
  factoryAddress: Address;
  signer: TSigner;
  rpcProvider: PublicClient;

  // optionals
  entryPointAddress?: Address;
  initCode?: Hex;
  accountAddress?: Address;
};

export type OKXSmartContractAccountConstructorParams<
  TSigner extends OKXAASigner = OKXAASigner,
> = BaseSmartContractAccountConstructParams<TSigner> & {
  authenticationManagerAddress: Address;
  validatorAddress: Address;
  bundlerClient: IBundlerClient;
  paymasterClient?: IPaymasterClient;

  name: string;
  version: string;

  authenticationManagerTemplate: Address;
};

export type OKXSmartContractAccountCreationParams<
  TSigner extends OKXAASigner = OKXAASigner,
> = {
  rpcProvider: PublicClient;
  signer: TSigner;
  name: string;
  version: string;

  bundlerClientConfig: BundlerClientConfig;
  paymasterClientConfig?: PaymasterClientConfig;

  factoryAddress?: Address;
  smartAccountTemplate?: Address;
  authenticationManagerTemplate?: Address;
  index?: bigint;
};

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<
  T,
  Exclude<keyof T, Keys>
> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys];

export type BundlerClientConfig = RequireAtLeastOne<
  {
    bundlerClient: IBundlerClient;
    bundlerUrl: string;
  },
  "bundlerClient" | "bundlerUrl"
>;

export type PaymasterClientConfig = RequireAtLeastOne<
  {
    paymasterClient: IPaymasterClient;
    paymasterUrl: string;
  },
  "paymasterClient" | "paymasterUrl"
>;

export type BuildUserOpParams = {
  args: ExecuteCallDataArgs;
  execMode?: ExecutionMode;
  sigType?: SigType;
  sigTime?: bigint;
  paymasterRawData?: PaymasterRawData;
  packTxMiddlewareOverrider?: PackTxMiddlewareOverride;
};
