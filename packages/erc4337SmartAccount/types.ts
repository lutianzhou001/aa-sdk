import type { Address } from "abitype";
import type { Chain, Hash, Hex, Transport } from "viem";
import {
  ERC4337SmartAccountSigner,
} from "../plugins/types";
import { UserOperation } from "permissionless/types/userOperation";
import { PackedUserOperation } from "permissionless/types";

export type CallType = "single" | "delegatecall" | "batch" | undefined;

export type SigType = "EIP712" | "EIP191";

export type ExecutionMode = {
  callType?: CallType;
  try?: boolean;
  allowFailedExecution?: boolean;
  modeParams?: string;
};

export type GasEstimationMiddleware = {
  callGasLimit: bigint;
  preVerificationGas: bigint;
  verificationGasLimit: bigint;
};

export type FeeDataMiddleware = {
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
};

export type PackTxMiddlewareOverride = {
  gasEstimationMiddleware: GasEstimationMiddleware;
  feeDataMiddleware: FeeDataMiddleware;
};

export type ClientsUrls = {
  bundlerUrl?: string;
  paymasterUrl?: string;
};

export type ExecuteCallDataArgs =
  | {
      execRawData: {
        to: Address;
        value: bigint;
        data: Hex;
      };
      execMode: ExecutionMode;
    }
  | {
      execRawData: {
        to: Address;
        value: bigint;
        data: Hex;
        allowFailed: boolean;
      }[];
      execMode: ExecutionMode;
    };

export type SupportedPayMaster = {
  entryPoint: string;
  paymaster: Address;
  status: number;
  tokens: Address[];
  type: number;
};

export type Runtime<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
  TSigner extends ERC4337SmartAccountSigner = ERC4337SmartAccountSigner,
> = {
  account: Account<TSigner> | undefined;
  userOperation: UserOperation<"v0.7">;
  packedUserOperation: PackedUserOperation;
  rawPaymaster?: RawPaymaster;
  userOperationHash?: Hex;
  sigType?: SigType;
  sigTime?: bigint;
};

export type RawPaymaster = {
  paymasterAddress: Address;
  paymasterToken?: Address;
  paymasterVerificationGasLimit?: bigint;
  paymasterPostOpGasLimit?: bigint;
};

export type Account<
  TSigner extends ERC4337SmartAccountSigner = ERC4337SmartAccountSigner,
> = {
  signer: TSigner;
  accountAddress: Address;
  nonceKey: Hex;
  isDeployed: boolean;
  authenticationManagerAddress: Address | undefined;
  receipts: SmartAccountTransactionReceipt[];
  initCode: Hex;
  version: string;
  name: string;
};

export type SmartAccountTransactionReceipt = {
  userOperationHash: Hex;
  txHash: Hex | undefined;
  success: Hex | undefined;
};

export type UserOperationSimulationResponse = {
  success: boolean;
  message: any;
};
