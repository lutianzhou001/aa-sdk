import {
  type Hex,
  SignTypedDataParameters,
  Address,
  SignableMessage,
  zeroHash,
} from "viem";
import { OKXAASigner } from "../interfaces/OKXAASigner";
import { JWT_VALIDATOR_TEMPLATE } from "../../common/constants";

export class remoteSigner<T = any> implements OKXAASigner<T> {
  inner: T;
  subject: Hex;
  signerType: string;
  signerTemplate: Address;

  constructor(subject: Hex, template?: Address) {
    this.subject = subject;
    this.signerType = "remoteSigner"; //  type: "local"
    this.signerTemplate = template ?? (JWT_VALIDATOR_TEMPLATE as Address);
  }

  async signMessage(message: SignableMessage): Promise<Hex> {
    return zeroHash;
  }

  async signTypedData(args: SignTypedDataParameters): Promise<Hex> {
    throw new Error("not impl");
  }

  async getSubject(): Promise<Hex> {
    return this.subject;
  }
}
