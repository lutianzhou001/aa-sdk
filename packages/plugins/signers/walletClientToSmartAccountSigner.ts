import {
  Address,
  getAddress,
  type Hex,
  isHex,
  padHex,
  publicActions,
  PublicClient,
  SignTypedDataParameters,
  toHex,
  type WalletClient,
} from "viem";
import type { ERC4337SmartAccountSigner } from "../types";
import { randomBytes } from "node:crypto";

export async function walletClientToERC4337SmartAccountSigner(
  walletClient: WalletClient,
): Promise<ERC4337SmartAccountSigner> {
  return {
    signerType: "walletClientSigner",
    signerTemplate: process.env.ECDSA_VALIDATOR_TEMPLATE_ADDRESS as Address,
    publicClient: walletClient.extend(publicActions) as PublicClient,
    async getSubject() {
      const addresses = await walletClient.getAddresses();
      return getAddress(addresses[0]);
    },
    async getDummySignature(): Promise<Hex> {
      return ("0x01" +
        padHex("0xffffffff").slice(2) +
        toHex(randomBytes(65)).slice(2)) as Hex;
    },
    async signMessage(message: Uint8Array | string | Hex): Promise<Hex> {
      const account =
        walletClient.account ??
        getAddress((await walletClient.getAddresses())[0]);
      if (typeof message === "string" && !isHex(message)) {
        return walletClient.signMessage({
          account,
          message,
        });
      } else {
        return walletClient.signMessage({
          account,
          message: { raw: message },
        });
      }
    },
    async signTypedData(args: SignTypedDataParameters): Promise<Hex> {
      if (!walletClient.account) {
        throw new Error("not impl");
      }
      // @ts-ignore
      return walletClient.account.signTypedData(args);
    },
  };
}
