import { Address, Chain, Client, Hex, publicActions, Transport } from "viem";
import { UserOperation } from "permissionless/types/userOperation";
import { smartAccountV3ABI } from "../../../abis/smartAccountV3.abi";
import { createSimulatorParams } from "./createSimulatorParams.dto";
import { EntryPointABI } from "../../../abis/EntryPoint.abi";
import { networkConfigurations } from "../../../configuration";
import { getChainId } from "viem/actions";
import { ERC4337SmartAccountSigner } from "../../plugins/types";
import { ISimulator } from "./ISimulator.interface";
import axios from "axios";
import { SendUserOperationSimulationByERC4337Bundler } from "../../error/constants";
import { UserOperationSimulationResponse } from "../types";

export class Simulator<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
  TOwner extends ERC4337SmartAccountSigner = ERC4337SmartAccountSigner,
> implements ISimulator
{
  protected owner: TOwner;
  protected entryPointAddress: Address;
  constructor(args: createSimulatorParams<TTransport, TChain, TOwner>) {
    this.owner = args.owner as TOwner;
    this.entryPointAddress = args.entryPointAddress;
  }

  async sendFromEOASimulationByPublicClient(
    account: Address,
    to: Address,
    value: bigint,
    data: Hex,
  ): Promise<any> {
    const sender = await this.owner.getAddress();
    return await this.owner
      .getWalletClient()
      .extend(publicActions)
      .simulateContract({
        account: sender,
        address: account,
        abi: smartAccountV3ABI,
        functionName: "executeFromEOA",
        args: [to, value, data],
      });
  }

  async sendUserOperationSimulation(
    userOperation: UserOperation,
    bundler?: Address,
  ): Promise<UserOperationSimulationResponse> {
    if (bundler) {
      return await this.sendUserOperationSimulationByPublicClient(
        userOperation,
        bundler,
      );
    } else {
      return await this.sendUserOperationSimulationByERC4337Bundler(
        userOperation,
      );
    }
  }

  private async sendUserOperationSimulationByPublicClient(
    userOperation: UserOperation,
    bundler: Address,
  ): Promise<UserOperationSimulationResponse> {
    return {
      success: true,
      message: await this.owner
        .getWalletClient()
        .extend(publicActions)
        .simulateContract({
          account: bundler,
          address: this.entryPointAddress,
          abi: EntryPointABI,
          functionName: "handleOps",
          args: [[userOperation], await this.owner.getAddress()],
        }),
    };
  }

  private async sendUserOperationSimulationByERC4337Bundler(
    userOperation: UserOperation,
  ): Promise<UserOperationSimulationResponse> {
    const req = {
      method: "post",
      maxBodyLength: Infinity,
      url:
        networkConfigurations.base_url +
        "mp/" +
        String(await getChainId(this.owner.getWalletClient() as Client)) +
        "/eth_simulateUserOperation",
      headers: {
        "Content-Type": "application/json",
        Cookie: "locale=en-US",
      },
      data: JSON.stringify({
        id: 1,
        jsonrpc: "2.0",
        method: "eth_simulateUserOperation",
        params: [userOperation, this.entryPointAddress],
      }),
    };

    const res = await axios.request(req);
    if (res.data.error) {
      throw new SendUserOperationSimulationByERC4337Bundler(
        "sendUserOperationSimulationByERC4337Bundler",
        res.data.error.message,
      );
    } else {
      return {
        success: true,
        message: res.data.result,
      };
    }
  }
}
