import { Address, Chain, Client, Hex, publicActions, Transport } from "viem";
import { UserOperation } from "permissionless/types/userOperation";
import { smartAccountV3ABI } from "../../../abis/smartAccountV3.abi";
import { EntryPointABI } from "../../../abis/EntryPoint.abi";
import { networkConfigurations } from "../../../configuration";
import { getChainId } from "viem/actions";
import {
  ERC4337SmartAccountSigner,
  UserOperation0_7,
} from "../../plugins/types";
import { ISimulator } from "./ISimulator.interface";
import axios from "axios";
import { SendUserOperationSimulationByERC4337Bundler } from "../../error/constants";
import { Account, UserOperationSimulationResponse } from "../types";
import { IManager } from "../moduleManager/IManager.interface";
import { getConfiguration } from "../../common/utils";

export class SimulatorManager<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TSigner extends ERC4337SmartAccountSigner = ERC4337SmartAccountSigner,
  >
  implements ISimulator, IManager
{
  constructor() {}

  onInstall(initialization: any): void {
    throw new Error("Method not implemented.");
  }
  onUninstall(uninstallation: any): void {
    throw new Error("Method not implemented.");
  }

  async sendUserOperationSimulation(
    account: Account<TSigner>,
    userOperation: UserOperation<"v0.6">,
    overrideBundler?: Address,
  ): Promise<UserOperationSimulationResponse> {
    if (overrideBundler) {
      return await this.sendUserOperationSimulationByPublicClient(
        account,
        userOperation as UserOperation<"v0.6">,
        overrideBundler,
      );
    } else {
      return await this.sendUserOperationSimulationByERC4337Bundler(
        account,
        userOperation,
      );
    }
  }

  private async sendUserOperationSimulationByPublicClient(
    account: Account<TSigner>,
    userOperation: UserOperation<"v0.6">,
    bundler: Address,
  ): Promise<UserOperationSimulationResponse> {
    return {
      success: true,
      message: await account.signer.publicClient.simulateContract({
        account: bundler,
        address: getConfiguration(account.getVersion()).entryPointAddress,
        abi: EntryPointABI,
        functionName: "handleOps",
        args: [[userOperation], await account.signer.getSubject()],
      }),
    };
  }

  private async sendUserOperationSimulationByERC4337Bundler(
    account: Account<TSigner>,
    userOperation: UserOperation<"v0.6"> | UserOperation0_7,
  ): Promise<UserOperationSimulationResponse> {
    const req = {
      method: "post",
      maxBodyLength: Infinity,
      url:
        networkConfigurations.base_url +
        "mp/" +
        String(await getChainId(account.signer.publicClient)) +
        "/eth_simulateUserOperation",
      headers: {
        "Content-Type": "application/json",
        Cookie: "locale=en-US",
      },
      data: JSON.stringify({
        id: 1,
        jsonrpc: "2.0",
        method: "eth_simulateUserOperation",
        params: [
          userOperation,
          getConfiguration(account.getVersion()).entryPointAddress,
        ],
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
