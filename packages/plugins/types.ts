import { Address, Hex, SignTypedDataParameters, WalletClient } from "viem";

export interface ERC4337SmartAccountSigner<TSinger = any> {
  signerType: string;
  signer: TSinger;
  // validatorTemplate: Address;

  getAddress: () => Promise<Address>;

  getWalletClient: () => WalletClient;

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
};
