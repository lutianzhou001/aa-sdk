import {
  Chain,
  createPublicClient,
  type Hex,
  http,
  SignTypedDataParameters,
} from "viem";
import { ERC4337SmartAccountSigner } from "../types";
import { configuration } from "../../../configuration";

export async function remoteSignerToSmartAccountSigner(
  subject: Hex,
  chain: Chain,
): Promise<ERC4337SmartAccountSigner> {
  return {
    signerType: "remoteSigner",
    signerTemplate: configuration.v3.JWT_VALIDATOR_TEMPLATE_ADDRESS,
    publicClient: createPublicClient({
      chain: chain,
      transport: http(),
    }),
    async getSubject(): Promise<Hex> {
      return subject;
    },
    async signMessage(message: Uint8Array | string | Hex): Promise<Hex> {
      return message as Hex;
    },
    async signTypedData(args: SignTypedDataParameters): Promise<Hex> {
      throw new Error("not impl");
    },
  };
}
