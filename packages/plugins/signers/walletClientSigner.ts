import {
  getAddress,
  isHex,
  type Hex,
  type WalletClient,
  SignTypedDataParameters,
  PublicClient,
  publicActions,
  Address,
  domainSeparator,
} from "viem";
import type { ERC4337SmartAccountSigner, UserOperation0_7 } from "../types";
import { BaseSmartAccountError } from "../../error/constants";
import { configuration } from "../../../configuration";
import { UserOperation } from "permissionless/types/userOperation";

export class WalletClientSigner
  implements ERC4337SmartAccountSigner<WalletClient>
{
  // reserved for next version
  signerType: string;
  signer: WalletClient;
  publicClient: PublicClient;
  template: Address;

  constructor(signer: WalletClient, signerType: string, template?: Address) {
    this.signer = signer;
    if (!signerType) {
      throw new BaseSmartAccountError(
        "BaseSmartAccountError",
        "Valid signerType param is required.",
      );
    }
    this.signerType = signerType;
    this.publicClient = this.signer.extend(publicActions) as PublicClient;
    this.template =
      template ?? configuration.v3.ECDSA_VALIDATOR_TEMPLATE_ADDRESS;
  }

  async getSubject(): Promise<Address> {
    const addresses = await this.signer.getAddresses();
    return getAddress(addresses[0]);
  }

  async signMessage(message: Uint8Array | string | Hex): Promise<Hex> {
    const account = this.signer.account ?? (await this.getSubject());

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

  async signTypedData(args: SignTypedDataParameters): Promise<Hex> {
    return this.signer.signTypedData(args);
  }
}
