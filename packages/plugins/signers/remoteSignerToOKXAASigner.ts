import {
  Address,
  Chain,
  createPublicClient,
  type Hex,
  http,
  padHex,
  SignTypedDataParameters,
  toHex,
} from "viem";
import { OKXAASigner } from "../types";
import { randomBytes } from "node:crypto";

export async function remoteSignerToOKXAASigner(
  subject: Hex,
  chain: Chain,
): Promise<OKXAASigner> {
  return {
    signerType: "remoteSigner",
    signerTemplate: process.env.JWT_VALIDATOR_TEMPLATE_ADDRESS as Address,
    publicClient: createPublicClient({
      chain: chain,
      transport: http(),
    }),
    async getSubject(): Promise<Hex> {
      return subject;
    },
    async getDummySignature(): Promise<Hex> {
      return ("0x01" +
        padHex("0xffffffff").slice(2) +
        toHex(randomBytes(65)).slice(2)) as Hex;
    },
    async signMessage(message: Uint8Array | string | Hex): Promise<Hex> {
      return message as Hex;
    },
    async signTypedData(args: SignTypedDataParameters): Promise<Hex> {
      throw new Error("not impl");
    },
  };
}
