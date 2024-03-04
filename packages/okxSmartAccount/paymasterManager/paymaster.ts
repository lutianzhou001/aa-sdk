import {
  Address,
  Chain,
  Client,
  PublicClient,
  Transport,
  WalletClient,
} from "viem";
import { OKXSmartAccountSigner } from "../../plugins/types";
import { Account, SupportedPayMaster } from "../types";
import { IPaymasterManager } from "./IPaymasterManager.interface";
import { createPaymasterParams } from "./createPaymasterManager.dto";
import { getChainId } from "viem/actions";
import axios from "axios";
import { UserOperation } from "permissionless/types/userOperation";
import { GeneratePaymasterSignatureType } from "../dto/generateUserOperationAndPackedParams.dto";

export class PaymasterManager<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
  TOwner extends OKXSmartAccountSigner = OKXSmartAccountSigner,
> implements IPaymasterManager
{
  protected entryPointAddress: Address;
  protected walletClient: WalletClient;
  protected baseUrl: string;
  constructor(params: createPaymasterParams<TTransport, TChain>) {
    this.entryPointAddress = params.entryPointAddress;
    this.walletClient = params.walletClient as WalletClient;
    this.baseUrl = params.baseUrl;
  }

  async getSupportedPaymasters(): Promise<SupportedPayMaster[]> {
    const config = {
      method: "get",
      maxBodyLength: Infinity,
      url:
        this.baseUrl +
        "pm/supportedPaymasters?chainBizId=" +
        String(await getChainId(this.walletClient as Client)),
      headers: {
        "Content-Type": "application/json",
        Cookie: "locale=en-US",
      },
    };

    return (await axios.request(config)).data.result;
  }

  async generatePaymasterSignature(
    userOperation: UserOperation,
    paymaster: GeneratePaymasterSignatureType,
  ): Promise<UserOperation> {
    // query paymasterAndDataFrom the endpoint.
    const config = {
      method: "post",
      maxBodyLength: Infinity,
      url:
        this.baseUrl +
        "pm/" +
        String(await getChainId(this.walletClient as Client)) +
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
