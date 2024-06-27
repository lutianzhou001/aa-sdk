import { Address, getAddress, type Hex, SignableMessage, SignTypedDataParameters, type WalletClient } from "viem";
import type { OKXAASigner } from "../interfaces/OKXAASigner";
import { ECDSA_VALIDATOR_TEMPLATE } from "../../common/constants";

export class walletClientAASigner<T extends WalletClient = WalletClient> implements OKXAASigner<T> {
  inner: T;

  signerType: string;
  signerTemplate: Address;

  constructor(inner: T, template?: Address) {
    this.inner = inner;
    this.signerType = inner.type;
    this.signerTemplate = template ?? (ECDSA_VALIDATOR_TEMPLATE as Address);
  }

  async getSubject(): Promise<Hex> {
    const addresses = await this.inner.getAddresses();
    return getAddress(addresses[0]);
  }

  async signMessage(message: SignableMessage): Promise<Hex> {
    const account = this.inner.account ?? (await this.getSubject());
    return this.inner.signMessage({
      account,
      message,
    });
  }

  async signTypedData(args: SignTypedDataParameters): Promise<Hex> {
    if (!this.inner.account) {
      throw new Error("not impl");
    }
    // @ts-ignore
    return this.inner.account.signTypedData(args);
  }
}
