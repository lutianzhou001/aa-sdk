import { Address, Chain, Client, Hex, PublicClient, Transport } from "viem";
import { UserOperation } from "permissionless/types/userOperation";
import { smartAccountV3ABI } from "../../../abis/smartAccountV3.abi";
import { createSimulatorParams } from "./createSimulatorParams.dto";
import { EntryPointABI } from "../../../abis/EntryPoint.abi";
import { networkConfigurations } from "../../../configuration";
import { getChainId } from "viem/actions";
import { OKXSmartAccountSigner } from "../../plugins/types";
import { ISimulator } from "./ISimulator.interface";
import axios from "axios";

export class Simulator<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
  TOwner extends OKXSmartAccountSigner = OKXSmartAccountSigner
> implements ISimulator
{
  protected publicClient: PublicClient<TTransport, TChain>;
  protected owner: TOwner;
  protected entryPointAddress: Address;
  constructor(params: createSimulatorParams<TTransport, TChain, TOwner>) {
    this.publicClient = params.publicClient;
    this.owner = params.owner as TOwner;
    this.entryPointAddress = params.entryPointAddress;
  }

  async sendFromEOASimulationByPublicClient(
    account: Address,
    to: Address,
    value: bigint,
    data: Hex
  ): Promise<any> {
    const sender = await this.owner.getAddress();
    return await this.publicClient.simulateContract({
      account: sender,
      address: account,
      abi: smartAccountV3ABI,
      functionName: "executeFromEOA",
      args: [to, value, data],
    });
  }

  async sendUserOperationSimulationByPublicClient(
    userOperation: UserOperation
  ): Promise<any> {
    const sender = await this.owner.getAddress();
    return await this.publicClient.simulateContract({
      account: sender,
      address: this.entryPointAddress,
      abi: EntryPointABI,
      functionName: "handleOps",
      args: [[userOperation], sender],
    });
  }

  sendUserOperationByAPI(userOperation: UserOperation): Promise<void> {
    return Promise.resolve(undefined);
  }

  async sendUserOperationSimulationByAPI(
    userOperation: UserOperation
  ): Promise<any> {
    const req = {
      method: "post",
      maxBodyLength: Infinity,
      url:
        networkConfigurations.base_url +
        "priapi/v5/wallet/smart-account/mp/" +
        String(await getChainId(this.publicClient as Client)) +
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

    return (await axios.request(req)).data.result;
  }
}
