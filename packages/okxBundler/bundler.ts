import { Chain, createPublicClient, http, PublicClient } from "viem";
import { UserOperation } from "permissionless/types/userOperation";
import { callClient, convertToHex } from "../common/utils";
import { ENTRYPOINT_ADDRESS_V07 } from "permissionless";
import { getChainId } from "viem/actions";
import { BundlerError } from "../common/error";
import { IBundlerClient } from "./interfaces/IBundler";

/**
 * This class implements IBundler interface.
 * Implementation sends UserOperation to a bundler URL as per ERC4337 standard.
 * Checkout the proposal for more details on Bundlers.
 */
export class BundlerClient implements IBundlerClient {
  private provider: PublicClient;
  private readonly bundlerUrl: string;

  constructor(bundlerUrl: string, chain: Chain) {
    this.provider = createPublicClient({
      chain: chain,
      transport: http(),
    });
    this.bundlerUrl = bundlerUrl;
  }

  public getBundlerUrl(): string {
    return `${this.bundlerUrl}`;
  }

  /**
   * @description This function will fetch gasPrices from bundler
   * @returns Promise<UserOpGasPricesResponse>
   * @param userOp
   */
  async estimateUserOperationGas(userOp: UserOperation<"v0.7">): Promise<any> {
    const chainId = await getChainId(this.provider);
    const payload = [convertToHex(userOp), ENTRYPOINT_ADDRESS_V07];
    const data = JSON.stringify({
      id: 1,
      jsonrpc: "2.0",
      method: "eth_estimateUserOperationGas",
      params: payload,
    });
    const gasEstimationRes = await callClient(
      `${this.bundlerUrl}/priapi/v5/wallet/smart-account/mp/${String(chainId)}/eth_estimateUserOperationGas`,
      data,
    );
    const { result, error } = gasEstimationRes.data;
    if (error) {
      throw new BundlerError("GAS_ESTIMATION_ERROR", error.message);
    }
    return result;
  }

  /**
   *
   * @param userOp
   * @description This function will send signed userOp to bundler to get mined on chain
   * @returns Promise<UserOpResponse>
   */
  async sendUserOperation(userOp: UserOperation<"v0.7">): Promise<any> {
    const chainId = await getChainId(this.provider);
    const payload = [convertToHex(userOp), ENTRYPOINT_ADDRESS_V07];
    const data = JSON.stringify({
      id: 1,
      jsonrpc: "2.0",
      method: "eth_sendUserOperation",
      params: payload,
    });
    const sendUserOperationRes = await callClient(
      `${this.bundlerUrl}/priapi/v5/wallet/smart-account/mp/${String(chainId)}/eth_sendUserOperation`,
      data,
    );
    const { result, error } = sendUserOperationRes.data;
    if (error) {
      throw new BundlerError("SEND_USER_OPERATION_ERROR", error.message);
    }
    return result;
  }

  /**
   *
   * @param userOp
   * @description This function will simulate a transaction using uop given.
   * @returns Promise<UserOpResponse>
   */
  async simulateUserOperation(userOp: UserOperation<"v0.7">): Promise<any> {
    const chainId = await getChainId(this.provider);
    const payload = [convertToHex(userOp), ENTRYPOINT_ADDRESS_V07];
    const data = JSON.stringify({
      id: 1,
      jsonrpc: "2.0",
      method: "eth_simulateUserOperation",
      params: payload,
    });
    const sendUserOperationRes = await callClient(
      `${this.bundlerUrl}/priapi/v5/wallet/smart-account/mp/${String(chainId)}/eth_simulateUserOperation`,
      data,
    );
    const { result, error } = sendUserOperationRes.data;
    if (error) {
      throw new BundlerError("SEND_USER_OPERATION_ERROR", error.message);
    }
    return result;
  }

  /**
   *
   * @param userOpHash
   * @description This function will return userOpReceipt for a given userOpHash
   * @returns Promise<UserOpReceipt>
   */
  async getUserOperationReceipt(userOpHash: string): Promise<any> {
    const chainId = await getChainId(this.provider);
    const data = JSON.stringify({
      id: 1,
      jsonrpc: "2.0",
      method: "eth_getUserOperationReceipt",
      params: [userOpHash],
    });
    const getUserOperationReceiptRes = await callClient(
      `${this.bundlerUrl}/priapi/v5/wallet/smart-account/mp/${String(chainId)}/eth_getUserOperationReceipt`,
      data,
    );
    const { result, error } = getUserOperationReceiptRes.data;
    if (error) {
      throw new BundlerError("GET_USER_OPERATION_RECEIPT_ERROR", error.message);
    }
    return result;
  }

  /**
   *
   * @param userOpHash
   * @description This function will return the userOperation with the given userOpHash
   * @returns Promise<UserOpReceipt>
   */
  async getUserOperationByHash(userOpHash: string): Promise<any> {
    const chainId = await getChainId(this.provider);
    const data = JSON.stringify({
      id: 1,
      jsonrpc: "2.0",
      method: "eth_getUserOperationByHash",
      params: [userOpHash],
    });
    const getUserOperationByHash = await callClient(
      `${this.bundlerUrl}/priapi/v5/wallet/smart-account/mp/${String(chainId)}/eth_getUserOperationByHash`,
      data,
    );
    const { result, error } = getUserOperationByHash.data;
    if (error) {
      throw new BundlerError("GET_USER_OPERATION_BY_HASH_ERROR", error.message);
    }
    return result;
  }
}
