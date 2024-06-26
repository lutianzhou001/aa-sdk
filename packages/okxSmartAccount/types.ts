import type { Address } from "abitype";
import type { Hex, PublicClient } from "viem";
import { OKXAASigner } from "../plugins/interfaces/OKXAASigner";
import { UserOperation } from "permissionless/types/userOperation";
import { IPaymasterClient } from "../okxPaymaster/interfaces/IPaymaster";
import { IBundlerClient } from "../okxBundler/interfaces/IBundler";

export enum SigType {
  EIP712 = "EIP712",
  EIP191 = "EIP191",
}

export enum PaymasterMode {
  FREE_GAS_MODE = "0x00",
  TOKEN_MODE = "0x01",
}

export type ExecutionModeOverrides = Partial<{
  try?: boolean;
  allowFailedExecution?: boolean;
  modeParams?: string;
}>;

export type BaseExecuteCallData = {
  to: Address;
  value: bigint;
  data: Hex;
};

export type ExecuteCallDataWithAllowFailed = BaseExecuteCallData & {
  allowFailed?: boolean;
};

export type ExecuteCallDataArgs =
  | ExecuteCallDataWithAllowFailed
  | ExecuteCallDataWithAllowFailed[]
  | Hex;

export type SupportedPayMaster = {
  entryPoint: string;
  paymaster: Address;
  status: number;
  tokens: Address[];
  type: number;
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

  version: string;

  authenticationManagerTemplate: Address;
  smartAccountTemplate: Address;

  // for layer2(s), need to get mainnet gasFee to make gas estimation
  mainnetRpcProvider?: PublicClient;
};

export type OKXSmartContractAccountCreationParams<
  TSigner extends OKXAASigner = OKXAASigner,
> = {
  rpcProvider: PublicClient;
  // for layer2(s)
  mainnetRpcProvider?: PublicClient;

  signer: TSigner;
  version: string;

  bundlerClientConfig: BundlerClientConfig;
  paymasterClientConfig?: PaymasterClientConfig;

  smartAccountAddress?: Address;

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

export type UserOperationOverrides = Partial<{
  callGasLimit: UserOperation<"v0.7">["callGasLimit"];
  maxFeePerGas: UserOperation<"v0.7">["maxFeePerGas"];
  maxPriorityFeePerGas: UserOperation<"v0.7">["maxPriorityFeePerGas"];

  preVerificationGas: UserOperation<"v0.7">["preVerificationGas"];
  verificationGasLimit: UserOperation<"v0.7">["verificationGasLimit"];
}>;

export type PaymasterOverrides = Partial<{
  paymasterMode: PaymasterMode;
  paymasterAddress: Address;
  paymasterToken?: Address;
  paymasterVerificationGasLimit?: bigint;
  paymasterPostOpGasLimit?: bigint;
}>;

export type UopAndPaymasterOverrides = UserOperationOverrides &
  PaymasterOverrides;

export type BuildUserOpParams = {
  args: ExecuteCallDataArgs;
  execModeOverrides?: ExecutionModeOverrides;
  uopAndPaymasterOverrides?: UopAndPaymasterOverrides;
  sigType?: SigType;
  sigTime?: bigint;
};

export type OKXSmartContractAccountConfig = {
  version: string;
  name: string;
  factoryAddress: Address;
  smartContractAccountTemplate: Address;
  authenticationManagerTemplate: Address;
};
