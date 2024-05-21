import {
  Address,
  Hex,
  PublicClient,
  SignTypedDataParameters,
  WalletClient,
} from "viem";
import { UserOperation } from "permissionless/types/userOperation";

export interface ERC4337SmartAccountSigner<TSinger = any> {
  signerType?: string;
  signer: TSinger;
  publicClient: PublicClient;
  template: Address;

  getSubject: () => Promise<Address>;

  signMessage: (msg: Uint8Array | Hex | string) => Promise<Hex>;

  signTypedData: (args: SignTypedDataParameters) => Promise<Hex>;
}

export type UserOperationDraft = {
  sender: Address;
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
