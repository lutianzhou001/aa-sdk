import { Address, Hex, PublicClient, SignTypedDataParameters } from "viem";

export type OKXSmartAccountSigner = {
  signerType: string;
  signerTemplate: Address;
  publicClient: PublicClient;
  getSubject: () => Promise<Address>;
  signMessage: (msg: Uint8Array | Hex | string) => Promise<Hex>;
  signTypedData: (args: SignTypedDataParameters) => Promise<Hex>;
  getDummySignature: () => Promise<Hex>;
};
