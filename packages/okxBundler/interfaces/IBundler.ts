import { UserOperation } from "permissionless/types/userOperation";
import { Address, Hex } from "viem";

export interface IBundlerClient {
  sendUserOperation(userOp: UserOperation<"v0.7">): Promise<any>;
  simulateUserOperation(userOp: UserOperation<"v0.7">): Promise<any>;
  estimateUserOperationGas(userOp: UserOperation<"v0.7">): Promise<any>;
  getUserOperationByHash(userOpHash: string): Promise<any>;
  getUserOperationReceipt(userOpHash: string): Promise<any>;

  // getInitCode(
  //   chainId: number,
  //   factory: Address,
  //   salt: number,
  //   safeSingleton: Address,
  //   initializer: Address,
  //   validatorTemplate: Address,
  // ): Promise<Hex>;
  // getEntryPointBalance(sender: Address): Promise<bigint>;
  // getOwner(sender:Address, safeSingleton: Address): Promise<Address>;
  // getSingleton(sender:Address): Promise<Address>;
  // getSenderAddress(chainId: number, factory: Address, salt: number, safeSingleton: Address, initializer: Address, validatorTemplate: Address, createExtensionCreator?: Hex): Promise<Address>;
  getNonce(
    chainId: number,
    sender: Address,
    owner: Address,
    singleton: Address,
    key?: bigint,
  ): Promise<bigint>;
  // getUserOperationSignedHash(signTyep: number, userOp: UserOperation<"v0.7">): Promise<Hex>;
}
