import { Chain, createPublicClient, http, PublicClient } from "viem";
import { callClient, convertToHex } from "../common/utils";
import { IPaymasterClient } from "./interfaces/IPaymaster";
import { UserOperation } from "permissionless/types/userOperation";
import { ENTRYPOINT_ADDRESS_V07 } from "permissionless";
import { getChainId } from "viem/actions";
import { PaymasterError } from "../common/error";

/**
 * This class implements IBundler interface.
 * Implementation sends UserOperation to a bundler URL as per ERC4337 standard.
 * Checkout the proposal for more details on Bundlers.
 */
export class PaymasterClient implements IPaymasterClient {
  private provider: PublicClient;
  private readonly paymasterUrl: string;

  constructor(paymasterUrl: string, chain: Chain) {
    this.provider = createPublicClient({
      chain: chain,
      transport: http(),
    });
    this.paymasterUrl = paymasterUrl;
  }

  public getPaymasterUrl(): string {
    return `${this.paymasterUrl}`;
  }

  /**
   * @description This function will fetch the supported paymasters
   */
  async getSupportedPaymasters(): Promise<any> {
    const chainId = await getChainId(this.provider);
    const payload = JSON.stringify({
      entryPoint: ENTRYPOINT_ADDRESS_V07,
      chainBizId: chainId,
    });
    const getSupportedPaymasters = await callClient(
      `${this.paymasterUrl}/priapi/v5/wallet/smart-account/pm/${String(chainId)}/getSupportedPaymasters`,
      payload,
    );
    return null;
  }

  /**
   * @description This function will fetch the paymasterAndData
   * @param userOp the userOperation
   */
  async getPaymasterData(uop: UserOperation<"v0.7">): Promise<any> {
    const chainId = await getChainId(this.provider);
    // TODO: TO MAKE IT BETTER WITH BACKEND TEAM
    const payload = JSON.stringify({
      entryPoint: ENTRYPOINT_ADDRESS_V07,
      paymaster: uop.paymaster,
      uop: convertToHex(uop),
    });
    const getPaymasterSignatureRes = await callClient(
      `${this.paymasterUrl}/priapi/v5/wallet/smart-account/pm/${String(chainId)}/getPaymasterSignature`,
      payload,
    );
    if (getPaymasterSignatureRes.data.error) {
      throw new PaymasterError(
        "GET_PAYMASTER_SIGNATURE_ERROR",
        getPaymasterSignatureRes.data.error.message,
      );
    }
    return getPaymasterSignatureRes;
  }
}
