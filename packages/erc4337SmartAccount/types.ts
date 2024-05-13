import type { Address } from "abitype";
import type { Chain, Hash, Hex, Transport } from "viem";
import { AccountManager } from "./acountMananger/accountManager";
import { PaymasterManager } from "./paymasterManager/paymaster";
import { ERC4337SmartAccountSigner } from "../plugins/types";
import { SimulatorManager } from "./simulator/simulator";

export type CallType = "single" | "delegatecall" | "batch" | undefined;

export type SignType = "EIP712" | "EIP191";

export type ExecutionMode = {
  callType?: CallType;
  try?: boolean;
  allowFailedExecution?: boolean;
  modeParams?: string;
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

export type ManagerController<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
  TSigner extends ERC4337SmartAccountSigner = ERC4337SmartAccountSigner,
> = {
  accountManager: AccountManager<TTransport, TChain, TSigner>;
  paymasterManager: PaymasterManager<TTransport, TChain, TSigner>;
  simulatorManager: SimulatorManager<TTransport, TChain, TSigner>;
  // simulatorManager: SimulatorManager;
  // receiptManager: ReceiptManager;
  // bundlerManager: BundlerManager;
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
  getVersion(): string;
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
