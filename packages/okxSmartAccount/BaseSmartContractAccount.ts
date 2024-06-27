import {
  type Address,
  getContract,
  type GetContractReturnType,
  type Hash,
  type Hex,
  type PublicClient,
  SignableMessage,
  SignTypedDataParameters,
} from "viem";
import { ENTRYPOINT_ADDRESS_V07, isSmartAccountDeployed } from "permissionless";
import { ISmartContractAccount } from "./interfaces/ISmartAccount";
import { entrypointV0_7Abi } from "../../abis";
import { OKXAASigner } from "../plugins/interfaces/OKXAASigner";
import { BaseSmartContractAccountConstructParams, ExecuteCallDataArgs, ExecutionModeOverrides, SigType } from "./types";
import { UserOperation } from "permissionless/types/userOperation";

export enum DeploymentState {
  UNDEFINED = "0x0",
  NOT_DEPLOYED = "0x1",
  DEPLOYED = "0x2",
}

export abstract class BaseSmartContractAccount<TSigner extends OKXAASigner = OKXAASigner> implements ISmartContractAccount<TSigner> {
  protected factoryAddress: Address;

  protected deploymentState: DeploymentState = DeploymentState.UNDEFINED;

  protected accountAddress?: Address;

  protected accountInitCode?: Hex;

  protected signer: TSigner;

  protected entryPoint: GetContractReturnType<typeof entrypointV0_7Abi, PublicClient>;

  protected entryPointAddress: Address;

  readonly rpcProvider: PublicClient;

  constructor(params: BaseSmartContractAccountConstructParams) {
    this.entryPointAddress = params.entryPointAddress ?? ENTRYPOINT_ADDRESS_V07;

    this.rpcProvider = params.rpcProvider;

    this.accountAddress = params.accountAddress;
    this.factoryAddress = params.factoryAddress;

    this.signer = params.signer as TSigner;
    this.accountInitCode = params.initCode;

    this.entryPoint = getContract({
      address: this.entryPointAddress,
      abi: entrypointV0_7Abi,
      client: this.rpcProvider as PublicClient,
    });
  }

  /**
   * This method should return a signature that will not `revert` during validation.
   * It does not have to pass validation, just not cause the contract to revert.
   * This is required for gas estimation so that the gas estimate are accurate.
   *
   */
  abstract getDummySignature(): Hex;

  /**
   * this method should return the abi encoded function data for a call to your contract's `execute` method
   *
   * @param execMode execute mode
   * @param args call args
   */
  abstract encodeExecute(args: ExecuteCallDataArgs, execMode?: ExecutionModeOverrides): Promise<Hex>;

  /**
   * this should return the init code that will be used to create an account if one does not exist.
   * This is the concatenation of the account's factory address and the abi encoded function data of the account factory's `createAccount` method.
   * https://github.com/eth-infinitism/account-abstraction/blob/abff2aca61a8f0934e533d0d352978055fddbd96/contracts/core/SenderCreator.sol#L12
   */
  protected abstract getAccountInitCode(): Promise<Hex>;

  protected abstract getPaymasterAndData(userOperation: UserOperation<"v0.7">): Promise<Hex>;

  /**
   * If your account handles 1271 signatures of personal_sign differently
   * than it does UserOperations, you can implement two different approaches to signing
   *
   * @param uoHash -- The hash of the UserOperation to sign
   * @returns the signature of the UserOperation
   */
  async signUserOperationHash(uoHash: Hash): Promise<Hex> {
    return this.signer.signMessage(uoHash);
  }

  /**
   * If your contract supports signing and verifying typed data,
   * you should implement this method.
   *
   * @param params -- Typed Data params to sign
   */
  async signTypedData(params: SignTypedDataParameters): Promise<Hex> {
    return this.signer.signTypedData(params);
  }

  /**
   * If your contract supports signing message
   * you should implement this method.
   *
   * @param msg -- Singable message
   */
  signMessage(msg: SignableMessage): Promise<Hex> {
    return this.signer.signMessage(msg);
  }

  public abstract signUserOperation(userOperation: UserOperation<"v0.7">, sigType: SigType, sigTime?: BigInt): Promise<Hex>;

  /**
   * If your contract supports UUPS, you can implement this method which can be
   * used to upgrade the implementation of the account.
   *
   * @param _upgradeToImplAddress
   * @param _upgradeToInitData
   */
  encodeUpgradeToAndCall = async (_upgradeToImplAddress: Address, _upgradeToInitData: Hex): Promise<Hex> => {
    throw new Error("Upgrade ToAndCall Not Supported");
  };
  //#endregion optional-methods

  // Extra implementations
  async getNonce(nonceKey: bigint): Promise<bigint> {
    const address = await this.getAddress();
    // @ts-ignore
    return await this.entryPoint.read.getNonce([address, nonceKey]);
  }

  async getInitCode(): Promise<Hex> {
    if (this.deploymentState === DeploymentState.DEPLOYED) {
      return "0x";
    }

    const contractCode = await this.rpcProvider.getBytecode({
      address: await this.getAddress(),
    });

    if ((contractCode?.length ?? 0) > 2) {
      this.deploymentState = DeploymentState.DEPLOYED;
      return "0x";
    }

    this.deploymentState = DeploymentState.NOT_DEPLOYED;

    return this._getAccountInitCode();
  }

  async getAddress(): Promise<Address> {
    if (!this.accountAddress) {
      const initCode = await this._getAccountInitCode();
      try {
        await this.entryPoint.simulate.getSenderAddress([initCode]);
      } catch (err: any) {
        if (err.cause?.data?.errorName === "SenderAddressResult") {
          this.accountAddress = err.cause.data.args[0] as Address;
          return this.accountAddress;
        }

        if (err.details === "Invalid URL") {
          throw new Error("Invalid URL");
        }
      }

      throw new Error("Failed to get counterfactual account address");
    }
    return this.accountAddress;
  }

  extend = <R>(fn: (self: this) => R): this & R => {
    const extended = fn(this) as any;
    // this should make it so extensions can't overwrite the base methods
    for (const key in this) {
      delete extended[key];
    }
    return Object.assign(this, extended);
  };

  getSigner(): TSigner {
    return this.signer;
  }

  getFactoryAddress(): Address {
    return this.factoryAddress;
  }

  getEntryPointAddress(): Address {
    return this.entryPointAddress;
  }

  async isAccountDeployed(): Promise<boolean> {
    return (await this.getDeploymentState()) === DeploymentState.DEPLOYED;
  }

  async getDeploymentState(): Promise<DeploymentState> {
    if (this.deploymentState !== DeploymentState.DEPLOYED) {
      const isDeployed = await isSmartAccountDeployed(this.rpcProvider, await this.getAddress());
      this.deploymentState = isDeployed ? DeploymentState.DEPLOYED : DeploymentState.NOT_DEPLOYED;
    }
    return this.deploymentState;
  }

  /**
   * https://eips.ethereum.org/EIPS/eip-4337#first-time-account-creation
   * The initCode field (if non-zero length) is parsed as a 20-byte address,
   * followed by calldata to pass to this address.
   * The factory address is the first 40 char after the 0x, and the callData is the rest.
   */
  protected async parseFactoryAddressAndData(): Promise<[Address, Hex]> {
    const initCode = await this._getAccountInitCode();
    const factoryAddress = `0x${initCode.substring(2, 42)}` as Address;
    const factoryCalldata = `0x${initCode.substring(42)}` as Hex;
    return [factoryAddress, factoryCalldata];
  }

  /**
   * https://eips.ethereum.org/EIPS/eip-4337#first-time-account-creation
   * The initCode field (if non-zero length) is parsed as a 20-byte address,
   * followed by calldata to pass to this address.
   * The factory address is the first 40 char after the 0x, and the callData is the rest.
   */
  protected async parsePaymasterAddressAndData(uop: UserOperation<"v0.7">): Promise<[Address, Hex]> {
    const initCode = await this._getPaymasterAndData(uop);
    const paymasterAddress = `0x${initCode.substring(2, 42)}` as Address;
    // some paymaster info is provided by the backend team.
    const paymasterData = `0x${initCode.substring(106)}` as Hex;
    return [paymasterAddress, paymasterData];
  }

  private async _getAccountInitCode(): Promise<Hex> {
    return this.accountInitCode ?? this.getAccountInitCode();
  }

  private async _getPaymasterAndData(uop: UserOperation<"v0.7">): Promise<Hex> {
    return this.getPaymasterAndData(uop);
  }
}
