import { Address, Chain, Client, Hex, publicActions, Transport } from "viem";
import { UserOperation } from "permissionless/types/userOperation";
import { smartAccountV3ABI } from "../../../abis/smartAccountV3.abi";
import { CreateSimulatorParams } from "./createSimulatorParams.dto";
import { EntryPointABI } from "../../../abis/EntryPoint.abi";
import { configuration, networkConfigurations } from "../../../configuration";
import { getChainId } from "viem/actions";
import {
  ERC4337SmartAccountSigner,
  UserOperation0_7,
} from "../../plugins/types";
import { ISimulator } from "./ISimulator.interface";
import axios from "axios";
import { SendUserOperationSimulationByERC4337Bundler } from "../../error/constants";
import {Account, UserOperationSimulationResponse} from "../types";
import { getConfiguration } from "../../common/utils";
import { IManager } from "../moduleManager/IManager.interface";

export class SimulatorManager<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TOwner extends ERC4337SmartAccountSigner = ERC4337SmartAccountSigner,
  >
  implements ISimulator, IManager
{
  constructor(args: CreateSimulatorParams<TTransport, TChain, TOwner>) {}

  onInstall(initialization: any): void {
    throw new Error("Method not implemented.");
  }
  onUninstall(uninstallation: any): void {
    throw new Error("Method not implemented.");
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
      account:Account<TOwner>,
    userOperation: UserOperation<"v0.6"> | UserOperation0_7,
    overrideBundler?: Address,
  ): Promise<UserOperationSimulationResponse> {
    if (account.getVersion()== "3.0.0") {
      return await this.sendUserOperationSimulationByPublicClient(account, userOperation);
    }
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
    userOperation: UserOperation<"v0.6">,
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
    userOperation: UserOperation<"v0.6"> | UserOperation0_7,
  ): Promise<UserOperationSimulationResponse> {
    const req = {
      method: "post",
      maxBodyLength: Infinity,
      url:
        networkConfigurations.base_url +
        "mp/" +
        String(await getChainId(owner.getWalletClient() as Client)) +
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
