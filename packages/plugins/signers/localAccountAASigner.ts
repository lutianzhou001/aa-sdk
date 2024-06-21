import {
  Address,
  type HDAccount,
  type HDOptions,
  type Hex,
  type LocalAccount,
  type PrivateKeyAccount,
  type SignableMessage,
  SignTypedDataParameters,
} from "viem";
import { mnemonicToAccount, privateKeyToAccount } from "viem/accounts";
import { OKXAASigner } from "../types";
import { ECDSA_VALIDATOR_TEMPLATE } from "../../common/constants";

export class LocalAccountAASigner<
  T extends HDAccount | PrivateKeyAccount | LocalAccount,
> implements OKXAASigner<T>
{
  inner: T;

  signerType: string;
  signerTemplate: Address;

  constructor(inner: T, template?: Address) {
    this.inner = inner;
    this.signerType = inner.type; //  type: "local"
    this.signerTemplate = template ?? (ECDSA_VALIDATOR_TEMPLATE as Address);
  }

  async signMessage(message: SignableMessage): Promise<Hex> {
    return this.inner.signMessage({
      message,
    });
  }

  async signTypedData(args: SignTypedDataParameters): Promise<Hex> {
    return this.inner.signTypedData(args);
  }

  async getSubject(): Promise<Hex> {
    return this.inner.address;
  }

  static mnemonicToAccountSigner(
    key: string,
    opts?: HDOptions,
  ): LocalAccountAASigner<HDAccount> {
    const signer = mnemonicToAccount(key, opts);
    return new LocalAccountAASigner(signer);
  }

  static privateKeyToAccountSigner(
    key: Hex,
  ): LocalAccountAASigner<PrivateKeyAccount> {
    const signer = privateKeyToAccount(key);
    return new LocalAccountAASigner(signer);
  }
}
