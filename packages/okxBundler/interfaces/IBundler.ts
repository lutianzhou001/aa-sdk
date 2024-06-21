import { UserOperation } from "permissionless/types/userOperation";
import { Address, Hash } from "viem";

export interface IBundlerClient {
  sendUserOperation(userOperation: UserOperation<"v0.7">): Promise<any>;
  simulateUserOperation(userOperation: UserOperation<"v0.7">): Promise<any>;
  estimateUserOperationGas(userOperation: UserOperation<"v0.7">): Promise<any>;
  getUserOperationByHash(userOpHash: Hash): Promise<any>;
  getUserOperationReceipt(userOpHash: Hash): Promise<any>;

  waitForConfirm(userOpHash: Hash): Promise<any>;

  // TODO: to impl
  // getEntryPointBalance(sender: Address): Promise<bigint>;
  // getOwner(sender:Address, safeSingleton: Address): Promise<Address>;
  // getSingleton(sender:Address): Promise<Address>;
  // getSenderAddress(chainId: number, factory: Address, salt: number, safeSingleton: Address, initializer: Address, validatorTemplate: Address, createExtensionCreator?: Hex): Promise<Address>;
  // getUserOperationSignedHash(signTyep: number, userOperation: UserOperation<"v0.7">): Promise<Hex>;

  getNonce(
    sender: Address,
    owner: Address,
    singleton: Address,
    key?: bigint,
  ): Promise<bigint>;
}
