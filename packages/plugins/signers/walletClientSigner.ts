import {
  getAddress,
  isHex,
  type Hex,
  type WalletClient,
  SignTypedDataParameters,
  zeroAddress,
} from "viem";
import type { ERC4337SmartAccountSigner } from "../types";
import { configuration } from "../../../configuration";
import { Address } from "abitype";
import { BaseSmartAccountError } from "../../error/constants";

export class WalletClientSigner
  implements ERC4337SmartAccountSigner<WalletClient>
{
  signerType: string;
  signer: WalletClient;
  // validatorTemplate: Address;

  constructor(signer: WalletClient, signerType: string) {
    this.signer = signer;
    if (!signerType) {
      throw new BaseSmartAccountError(
        "BaseSmartAccountError",
        "Valid signerType param is required.",
      );
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
    args: Omit<SignTypedDataParameters, "account">,
  ): Promise<Hex> {
    const account = this.signer.account ?? (await this.getAddress());

    // override the account
    return this.signer.signTypedData({
      account,
      ...args,
    });
  }
}
