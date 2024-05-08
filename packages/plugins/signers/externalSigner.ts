import {
  type Hex,
  SignTypedDataParameters,
  createPublicClient,
  http,
  PublicClient,
  Address,
} from "viem";
import type { ERC4337SmartAccountSigner } from "../types";
import { configuration } from "../../../configuration";

export class ExternalSigner
  implements ERC4337SmartAccountSigner<any>
{
  signer: any;
  publicClient: PublicClient;
  signerType: string;
  template: Address;

  constructor(
    signer: any,
    publicClient: PublicClient,
    template?: Address,
  ) {
    this.signer = signer;
    this.publicClient = publicClient;
    this.template = template ?? configuration.v3.JWT_VALIDATOR_TEMPLATE_ADDRESS;
  }

  async signMessage(message: Uint8Array | string | Hex): Promise<Hex> {
    return message as Hex;
  }

  async signTypedData(args: SignTypedDataParameters): Promise<Hex> {
    throw new Error("not impl");
  }

  async getSubject(): Promise<Address> {
    return this.signer.getSubject();
  }
}
