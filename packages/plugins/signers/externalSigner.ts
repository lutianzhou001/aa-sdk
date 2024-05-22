import {
  type Hex,
  SignTypedDataParameters,
  createPublicClient,
  http,
  PublicClient,
  Address,
  zeroAddress,
} from "viem";
import type { ERC4337SmartAccountSigner } from "../types";
import { configuration } from "../../../configuration";
import { subtle } from "node:crypto";

export class ExternalSigner implements ERC4337SmartAccountSigner<any> {
  signer: any;
  publicClient: PublicClient;
  signerType: string;
  template: Address;
  subject: Hex;

  constructor(
    signer: any,
    publicClient: PublicClient,
    subject: Hex,
    template?: Address,
  ) {
    this.signer = signer;
    this.publicClient = publicClient;
    this.template = template ?? configuration.v3.JWT_VALIDATOR_TEMPLATE_ADDRESS;
    this.subject = subject;
  }

  async signMessage(message: Uint8Array | string | Hex): Promise<Hex> {
    return message as Hex;
  }

  async signTypedData(args: SignTypedDataParameters): Promise<Hex> {
    throw new Error("not impl");
  }

  async getSubject(): Promise<Hex> {
    return this.subject;
  }
}
