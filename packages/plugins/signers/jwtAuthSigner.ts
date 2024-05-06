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

export class JWTAuthSigner
  implements ERC4337SmartAccountSigner<GoogleAuthSigner>
{
  signer: GoogleAuthSigner;
  publicClient: PublicClient;
  signerType: string;
  template: Address;

  constructor(
    signer: GoogleAuthSigner,
    publicClient: PublicClient,
    template?: Address,
  ) {
    this.signer = signer;
    this.publicClient = publicClient;
    this.template = template ?? configuration.v3.JWT_VALIDATOR_TEMPLATE_ADDRESS;
  }

  async signMessage(message: Uint8Array | string | Hex): Promise<Hex> {
    return await this.signer.signMessage(message);
  }

  async signTypedData(args: SignTypedDataParameters): Promise<Hex> {
    return this.signer.signTypedData(args);
  }

  async getSubject(): Promise<Address> {
    return this.signer.getSubject();
  }
}

export interface GoogleAuthSigner {
  getSubject(): Promise<Address>;
  signMessage(message: Uint8Array | string | Hex): Promise<Hex>;
  signTypedData(args: SignTypedDataParameters): Promise<Hex>;
}
