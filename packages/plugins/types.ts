import {
  Address,
  Hex,
  PublicClient,
  SignTypedDataParameters,
  WalletClient,
} from "viem";
import type { EntryPoint } from "permissionless/types/entrypoint";

export type ERC4337SmartAccountSigner = {
  signerType: string;
  signerTemplate: Address;
  publicClient: PublicClient;
  getSubject: () => Promise<Address>;
  signMessage: (msg: Uint8Array | Hex | string) => Promise<Hex>;
  signTypedData: (args: SignTypedDataParameters) => Promise<Hex>;
};

export type UserOperationDraft = {
  sender?: Address;
  nonce?: bigint;
  initCode?: Hex;
  callData: Hex;
  paymasterAndData?: Hex;
  callGasLimit?: bigint;
  verificationGasLimit?: bigint;
  preVerificationGas?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  accountGasLimits?: bigint;
};

export type UserOperation0_7 = {
  sender: Address;
  nonce: bigint;
  initCode: Hex;
  callData: Hex;
  paymasterAndData: Hex;
  preVerificationGas: bigint;
  gasFees: Hex;
  accountGasLimits: Hex;
  signature: Hex;
};
