import {
  Address,
  Hash,
  Hex,
  PublicClient,
  SignableMessage,
  SignTypedDataParameters,
} from "viem";
import { OKXAASigner } from "../../plugins/interfaces/OKXAASigner";
import { ExecuteCallDataArgs, ExecutionModeOverrides } from "../types";

export interface ISmartContractAccount<
  TSigner extends OKXAASigner = OKXAASigner,
> {
  /**
   * The RPC provider the account uses to make RPC calls
   */
  readonly rpcProvider: PublicClient;

  /**
   * @returns the init code for the account
   */
  getInitCode(): Promise<Hex>;

  /**
   * This is useful for estimating gas costs. It should return a signature that doesn't cause the account to revert
   * when validation is run during estimation.
   *
   * @returns a dummy signature that doesn't cause the account to revert during estimation
   */
  getDummySignature(): Hex;

  /**
   * Encodes a call to the account's execute function.
   *
   */
  encodeExecute(
    args: ExecuteCallDataArgs,
    execMode?: ExecutionModeOverrides,
  ): Promise<Hex>;

  /**
   * @returns the nonce of the account
   */
  getNonce(nonceKey: bigint): Promise<bigint>;

  /**
   * If your account handles 1271 signatures of personal_sign differently
   * than it does UserOperations, you can implement two different approaches to signing
   *
   * @param uopHash -- The hash of the UserOperation to sign
   * @returns the signature of the UserOperation
   */
  signUserOperationHash(uopHash: Hash): Promise<Hash>;

  /**
   * Returns a signed and prefixed message.
   *
   * @param msg - the message to sign
   * @returns the signature of the message
   */
  signMessage(msg: SignableMessage): Promise<Hex>;

  /**
   * Signs a typed data object as per ERC-712
   *
   * @param params - {@link SignTypedDataParams}
   * @returns the signed hash for the message passed
   */
  signTypedData(params: SignTypedDataParameters): Promise<Hex>;

  /**
   * @returns the address of the account
   */
  getAddress(): Promise<Address>;

  /**
   * @returns the current account signer instance that the smart account client
   * operations are being signed with.
   *
   * The signer is expected to be the owner or one of the owners of the account
   * for the signatures to be valid for the acting account.
   */
  getSigner(): TSigner;

  /**
   * @returns the address of the factory contract for the smart account
   */
  getFactoryAddress(): Address;

  /**
   * @returns the address of the entry point contract for the smart account
   */
  getEntryPointAddress(): Address;

  /**
   * Allows you to add additional functionality and utility methods to this account
   * via a decorator pattern.
   *
   * NOTE: this method does not allow you to override existing methods on the account.
   *
   * @example
   * ```ts
   * const account = new BaseSmartCobntractAccount(...).extend((account) => ({
   *  readAccountState: async (...args) => {
   *    return this.rpcProvider.readContract({
   *        address: await this.getAddress(),
   *        abi: ThisContractsAbi
   *        args: args
   *    });
   *  }
   * }));
   *
   * account.debugSendUserOperation(...);
   * ```
   *
   * @param extendFn -- this function gives you access to the created account instance and returns an object
   * with the extension methods
   * @returns -- the account with the extension methods added
   */
  extend: <R>(extendFn: (self: this) => R) => this & R;

  encodeUpgradeToAndCall: (
    upgradeToImplAddress: Address,
    upgradeToInitData: Hex,
  ) => Promise<Hex>;
}
