import {
  getAddress,
  type Hex,
  isHex,
  publicActions,
  PublicClient,
  SignTypedDataParameters,
  type WalletClient,
} from "viem";
import type { ERC4337SmartAccountSigner } from "../types";
import { configuration } from "../../../configuration";

export async function walletClientToERC4337SmartAccountSigner(
  walletClient: WalletClient,
): Promise<ERC4337SmartAccountSigner> {
  return {
    signerType: "walletClientSigner",
    signerTemplate: configuration.v3.ECDSA_VALIDATOR_TEMPLATE_ADDRESS,
    publicClient: walletClient.extend(publicActions) as PublicClient,
    async getSubject() {
      const addresses = await walletClient.getAddresses();
      return getAddress(addresses[0]);
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
      return walletClient.signTypedData(args);
    },
  };
}
