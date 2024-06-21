import {
  Address,
  Chain,
  createPublicClient,
  Hash,
  Hex,
  http,
  PublicClient,
} from "viem";
import { UserOperation } from "permissionless/types/userOperation";
import { callClient, convertToHex } from "../common/utils";
import {
  ENTRYPOINT_ADDRESS_V07,
  getUserOperationReceipt,
} from "permissionless";
import { getChainId } from "viem/actions";
import { BundlerError } from "../common/error";
import { IBundlerClient } from "./interfaces/IBundler";
import { formatAbiItemWithArgs } from "viem/utils";
import { delay } from "../../test/utils";

/**
 * This class implements IBundler interface.
 * Implementation sends UserOperation to a bundler URL as per ERC4337 standard.
 * Checkout the proposal for more details on Bundlers.
 */
export class BundlerClient implements IBundlerClient {
  private readonly provider: PublicClient;
  private readonly bundlerUrl: string;

  constructor(bundlerUrl: string, chain: Chain) {
    this.provider = createPublicClient({
      chain: chain,
      transport: http(),
    });
    this.bundlerUrl = bundlerUrl;
  }

  async waitForConfirm(uopHash: Hash) {
    // 30s(15times)
    let n = 0;
    while (n < 15) {
      try {
        return await this.getUserOperationReceipt(uopHash);
      } catch (e) {}
      await delay(2000);
      n = n + 1;
    }
    throw new BundlerError("WAIT_FOR_CONFIRM_ERROR", "bundler timeout.");
  }

  async getNonce(
    sender: Address,
    owner: Address,
    singleton: Address,
    key?: bigint,
  ): Promise<bigint> {
    const chainBizId = await getChainId(this.provider);
    const data = JSON.stringify({
      chainBizId: chainBizId,
      entryPoint: ENTRYPOINT_ADDRESS_V07,
      sender: sender,
      owner: owner,
      singleton: singleton,
      key: key ?? 0,
    });
    const getNonceRes = await callClient(
      `${this.bundlerUrl}/priapi/v5/wallet/smart-account/ac/${String(chainBizId)}/getNonce`,
      data,
    );
    const { result, error } = getNonceRes.data;
    if (error) {
      throw new BundlerError("GET_NONCE_ERROR", error.message);
    }
    return BigInt(result);
  }

  async getInitCode(
    chainId: number,
    factory: Address,
    salt: number,
    safeSingleton: Address,
    initializer: Address,
    validatorTemplate: Address,
  ): Promise<Hex> {
    const data = JSON.stringify({
      chainBizId: chainId,
      entryPoint: ENTRYPOINT_ADDRESS_V07,
      factory: factory,
      salt: salt,
      safeSingleton: safeSingleton,
      initializer: initializer,
      validatorTemplate: validatorTemplate,
    });
    const getInitCodeRes = await callClient(
      `${this.bundlerUrl}/priapi/v5/wallet/smart-account/ac/${String(chainId)}/getInitCode`,
      data,
    );
    const { result, error } = getInitCodeRes.data;
    if (error) {
      throw new BundlerError("GET_INIT_CODE_ERROR", error.message);
    }
    return result;
  }

  /**
   * @description This function will fetch gasPrices from bundler
   * @returns Promise<UserOpGasPricesResponse>
   * @param userOperation
   */
  async estimateUserOperationGas(
    userOperation: UserOperation<"v0.7">,
  ): Promise<any> {
    const chainId = await getChainId(this.provider);
    const payload = [convertToHex(userOperation), ENTRYPOINT_ADDRESS_V07];
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
   * @param userOperation
   * @description This function will send signed userOperation to bundler to get mined on chain
   * @returns Promise<UserOpResponse>
   */
  async sendUserOperation(userOperation: UserOperation<"v0.7">): Promise<any> {
    const chainId = await getChainId(this.provider);
    const payload = [convertToHex(userOperation), ENTRYPOINT_ADDRESS_V07];
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
   * @param userOperation
   * @description This function will simulate a transaction using uop given.
   * @returns Promise<UserOpResponse>
   */
  async simulateUserOperation(
    userOperation: UserOperation<"v0.7">,
  ): Promise<any> {
    const chainId = await getChainId(this.provider);
    const payload = [convertToHex(userOperation), ENTRYPOINT_ADDRESS_V07];
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
      throw new BundlerError("SIMULATE_USER_OPERATION_ERROR", error.message);
    }
    return result;
  }

  /**
   *
   * @param userOpHash
   * @description This function will return userOpReceipt for a given userOpHash
   * @returns Promise<UserOpReceipt>
   */
  async getUserOperationReceipt(userOpHash: Hash): Promise<any> {
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
  async getUserOperationByHash(userOpHash: Hash): Promise<any> {
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
