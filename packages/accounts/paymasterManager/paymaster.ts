import { Address, Chain, Client, PublicClient, Transport } from "viem";
import {
  GeneratePaymasterSignatureType,
  OKXSmartAccountSigner,
} from "../../plugins/types";
import { AccountInfo, SupportedPayMaster } from "../types";
import { IPaymasterManager } from "./IPaymasterManager.interface";
import { createPaymasterParams } from "./createPaymasterManager.dto";
import { getChainId } from "viem/actions";
import axios from "axios";
import { UserOperation } from "permissionless/types/userOperation";

export class PaymasterManager<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
  TOwner extends OKXSmartAccountSigner = OKXSmartAccountSigner
> implements IPaymasterManager
{
  protected entryPointAddress: Address;
  protected publicClient: PublicClient<TTransport, TChain>;
  constructor(params: createPaymasterParams<TTransport, TChain>) {
    this.publicClient = params.publicClient;
    this.entryPointAddress = params.entryPointAddress;
  }

  async getSupportedPaymasters(): Promise<SupportedPayMaster[]> {
    const config = {
      method: "get",
      maxBodyLength: Infinity,
      url:
        "https://www.okx.com/priapi/v5/wallet/smart-account/pm/supportedPaymasters?chainBizId=" +
        String(await getChainId(this.publicClient as Client)),
      headers: {
        "Content-Type": "application/json",
        Cookie: "locale=en-US",
      },
    };

    return (await axios.request(config)).data.result;
  }

  async generatePaymasterSignature(
    userOperation: UserOperation,
    paymaster: GeneratePaymasterSignatureType
  ): Promise<UserOperation> {
    // query paymasterAndDataFrom the endpoint.
    const config = {
      method: "post",
      maxBodyLength: Infinity,
      url:
        "https://www.okx.com/priapi/v5/wallet/smart-account/pm/" +
        String(await getChainId(this.publicClient as Client)) +
        "/getPaymasterSignature",
      headers: {
        "Content-Type": "application/json",
        Cookie: "locale=en-US",
      },
      data: JSON.stringify({
        entryPoint: this.entryPointAddress,
        token: paymaster.token,
        paymaster: paymaster.paymaster,
        uop: userOperation,
      }),
    };

    const res = await axios.request(config);
    userOperation.paymasterAndData = res.data.result;
    return userOperation;
  }
}
