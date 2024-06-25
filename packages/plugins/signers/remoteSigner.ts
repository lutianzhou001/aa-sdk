import {
  type Hex,
  SignTypedDataParameters,
  Address,
  SignableMessage,
} from "viem";
import { OKXAASigner } from "../interfaces/OKXAASigner";
import { ECDSA_VALIDATOR_TEMPLATE } from "../../common/constants";

export class remoteSigner<T = any> implements OKXAASigner<T> {
  inner: T;
  subject: Hex;
  signerType: string;
  signerTemplate: Address;

  constructor(subject: Hex, template?: Address) {
    this.subject = subject;
    this.signerType = "remoteSigner"; //  type: "local"
    this.signerTemplate = template ?? (ECDSA_VALIDATOR_TEMPLATE as Address);
  }

  async signMessage(message: SignableMessage): Promise<Hex> {
    return message as Hex;
  }

  async signTypedData(args: SignTypedDataParameters): Promise<Hex> {
    throw new Error("not impl");
  }

  async getSubject(): Promise<Hex> {
    return this.subject;
  }
}
