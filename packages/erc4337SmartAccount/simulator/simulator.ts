import {
  Address,
  ByteArray,
  Chain,
  Client,
  Hex,
  publicActions,
  Transport,
} from "viem";
import { UserOperation } from "permissionless/types/userOperation";
import { smartAccountV3ABI } from "../../../abis/smartAccountV3.abi";
import { CreateSimulatorParams } from "./createSimulatorParams.dto";
import { EntryPointABI } from "../../../abis/EntryPoint.abi";
import { getChainId } from "viem/actions";
import {
  ERC4337SmartAccountSigner,
  UserOperation0_7,
} from "../../plugins/types";
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
  protected baseUrl: string;
  protected version: string;
  constructor(args: CreateSimulatorParams<TTransport, TChain, TOwner>) {
    this.owner = args.owner as TOwner;
    this.entryPointAddress = args.entryPointAddress;
    this.baseUrl = args.baseUrl;
    this.version = args.version;
  }

  async sendFromEOASimulationByPublicClient(
    account: Address,
    to: Address,
    value: bigint,
    data: Hex,
  ): Promise<any> {
    const sender = await this.owner.getSubject();
    return await this.owner.publicClient.simulateContract({
      account: sender,
      address: account,
      abi: smartAccountV3ABI,
      functionName: "executeFromEOA",
      args: [to, value, data],
    });
  }

  async sendUserOperationSimulation(
    userOperation: UserOperation<"v0.6">,
    bundler?: Address,
  ): Promise<UserOperationSimulationResponse> {
    if (this.version.slice(0, 1) == "3") {
      return {
        success: false,
        message: "Not supported",
      };
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
      message: await this.owner.publicClient.simulateContract({
        account: bundler,
        address: this.entryPointAddress,
        abi: EntryPointABI,
        functionName: "handleOps",
        args: [[userOperation], await this.owner.getSubject()],
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
        this.baseUrl +
        "mp/" +
        String(await getChainId(this.owner.publicClient)) +
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
