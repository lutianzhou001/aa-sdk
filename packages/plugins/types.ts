import { Address, Hex, SignTypedDataParameters, WalletClient } from "viem";

export interface OKXSmartAccountSigner<TSinger = any> {
  signerType: string;
  signer: TSinger;
  // validatorTemplate: Address;

  getAddress: () => Promise<Address>;

  getWalletClient: () => WalletClient;

  signMessage: (msg: Uint8Array | Hex | string) => Promise<Hex>;

  signTypedData: (params: SignTypedDataParameters) => Promise<Hex>;
}

export type GeneratePaymasterSignatureType = {
  paymaster: Address;
  token: Address;
};

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
};
