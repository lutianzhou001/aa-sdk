import { Address, Hex, SignableMessage, SignTypedDataParameters } from "viem";

export interface OKXAASigner<Inner = any> {
  signerType: string;
  signerTemplate: Address;

  inner: Inner;

  getSubject: () => Promise<Hex>;

  signMessage: (message: SignableMessage) => Promise<Hex>;

  signTypedData: (args: SignTypedDataParameters) => Promise<Hex>;
}
