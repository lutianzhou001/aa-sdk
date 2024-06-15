import { Address, Hex, SignTypedDataParameters } from "viem";

export interface OKXAASigner<Inner = any> {
  signerType: string;
  signerTemplate: Address;

  inner: Inner;

  getSubject: () => Promise<Hex>;

  signMessage: (msg: Uint8Array | Hex | string) => Promise<Hex>;

  signTypedData: (args: SignTypedDataParameters) => Promise<Hex>;
}
