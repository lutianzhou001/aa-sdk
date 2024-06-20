import {
  Address,
  getAddress,
  type Hex,
  isHex,
  SignTypedDataParameters,
  type WalletClient,
} from "viem";
import type { OKXAASigner } from "../types";
import { ECDSA_VALIDATOR_TEMPLATE } from "../../common/constants";

export class walletClientAASigner<Inner> implements OKXAASigner<Inner> {
  signerType: string;
  signerTemplate: Address;

  walletClient: WalletClient;
  inner: Inner;
  constructor(walletClient: WalletClient, template?: Address) {
    this.signerType = "walletClientSigner";
    this.signerTemplate = template ?? (ECDSA_VALIDATOR_TEMPLATE as Address);
    this.walletClient = walletClient;
  }

  async getSubject(): Promise<Hex> {
    const addresses = await this.walletClient.getAddresses();
    return getAddress(addresses[0]);
  }

  async signMessage(message: Uint8Array | string | Hex): Promise<Hex> {
    const account =
      this.walletClient.account ?? await this.getSubject();
    if (typeof message === "string" && !isHex(message)) {
      return this.walletClient.signMessage({
        account,
        message,
      });
    } else {
      return this.walletClient.signMessage({
        account,
        message: { raw: message },
      });
    }
  }

  async signTypedData(args: SignTypedDataParameters): Promise<Hex> {
    if (!this.walletClient.account) {
      throw new Error("not impl");
    }
    // @ts-ignore
    return this.walletClient.account.signTypedData(args);
  }
}
