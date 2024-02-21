import {
  getAddress,
  isHex,
  type Hex,
  type WalletClient,
  SignTypedDataParameters,
  zeroAddress,
} from "viem";
import type { OKXSmartAccountSigner } from "../types";
import { configuration } from "../../../configuration";
import { Address } from "abitype";

export class walletClientSigner implements OKXSmartAccountSigner<WalletClient> {
  signerType: string;
  signer: WalletClient;
  // validatorTemplate: Address;

  constructor(signer: WalletClient, signerType: string) {
    this.signer = signer;
    if (!signerType) {
      throw new Error("Valid signerType param is required.");
    }
    this.signerType = signerType;
  }

  getWalletClient(): WalletClient {
    return this.signer;
  }

  async getAddress(): Promise<Hex> {
    const addresses = await this.signer.getAddresses();
    return getAddress(addresses[0]);
  }

  async signMessage(message: Uint8Array | string | Hex): Promise<Hex> {
    const account = this.signer.account ?? (await this.getAddress());

    if (typeof message === "string" && !isHex(message)) {
      return this.signer.signMessage({
        account,
        message,
      });
    } else {
      return this.signer.signMessage({
        account,
        message: { raw: message },
      });
    }
  }

  async signTypedData(
    params: Omit<SignTypedDataParameters, "account">
  ): Promise<Hex> {
    const account = this.signer.account ?? (await this.getAddress());

    // override the account
    return this.signer.signTypedData({
      account,
      ...params,
    });
  }
}
