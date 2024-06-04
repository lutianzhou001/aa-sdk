import { Address, Chain, Hex, Transport } from "viem";
import { ERC4337SmartAccountSigner } from "../plugins/types";
import { SupportedPayMaster } from "./types";
import axios from "axios";
import { networkConfigurations } from "../../configuration";
import { OKXSmartAccountClient } from "./okxSmartAccountClient";
import { callClient, convertToHex } from "../common/utils";
import { ENTRYPOINT_ADDRESS_V07 } from "permissionless";
import { GetPaymasterSignatureError } from "../common/error";

export function paymasterActions<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
  TSigner extends ERC4337SmartAccountSigner = ERC4337SmartAccountSigner,
>(okxSmartAccountClient: OKXSmartAccountClient<TTransport, TChain, TSigner>) {
  return {
    usePaymaster: (usePaymasterParams: UsePaymasterParams) =>
      usePaymaster(okxSmartAccountClient, usePaymasterParams),
    getSupportedPaymasters: () => getSupportedPaymasters(okxSmartAccountClient),
  };
}

export type UsePaymasterParams = {
  paymasterAddress: Address;
  tokenAddress?: Address;
  paymasterVerificationGasLimit?: bigint;
  paymasterPostOpGasLimit?: bigint;
};

export function usePaymaster<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
  TSigner extends ERC4337SmartAccountSigner = ERC4337SmartAccountSigner,
>(
  okxSmartAccountClient: OKXSmartAccountClient<TTransport, TChain, TSigner>,
  usePaymasterParams: UsePaymasterParams,
): OKXSmartAccountClient<TTransport, TChain, TSigner> {
  // some logic here
  okxSmartAccountClient.runtime.rawPaymaster = {
    paymasterAddress: usePaymasterParams.paymasterAddress,
    paymasterToken: usePaymasterParams.tokenAddress,
    paymasterVerificationGasLimit:
      usePaymasterParams.paymasterVerificationGasLimit,
    paymasterPostOpGasLimit: usePaymasterParams.paymasterPostOpGasLimit,
  };
  return okxSmartAccountClient;
}

export async function getSupportedPaymasters<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
  TSigner extends ERC4337SmartAccountSigner = ERC4337SmartAccountSigner,
>(
  okxSmartAccountClient: OKXSmartAccountClient<TTransport, TChain, TSigner>,
): Promise<SupportedPayMaster[]> {
  const config = {
    method: "get",
    maxBodyLength: Infinity,
    url: okxSmartAccountClient.paymasterUrl,
    headers: {
      "Content-Type": "application/json",
      Cookie: "locale=en-US",
    },
  };
  return (await axios.request(config)).data.result;
}

export async function getPaymasterAndData<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
  TSigner extends ERC4337SmartAccountSigner = ERC4337SmartAccountSigner,
>(
  okxSmartAccountClient: OKXSmartAccountClient<TTransport, TChain, TSigner>,
): Promise<void> {
  // TODO: TO MAKE IT BETTER
  const payload = JSON.stringify({
    entryPoint: ENTRYPOINT_ADDRESS_V07,
    paymaster: okxSmartAccountClient.runtime.userOperation.paymaster,
    uop: convertToHex(okxSmartAccountClient.runtime.userOperation),
  });
  const getPaymasterSignatureRes = await callClient(
    networkConfigurations.base_url +
      "priapi/v5/wallet/smart-account/pm/42161/getPaymasterSignature",
    payload,
  );
  if (getPaymasterSignatureRes.data.error) {
    throw new GetPaymasterSignatureError(
      "GET_PAYMASTER_SIGNATURE_ERROR",
      getPaymasterSignatureRes.data.error.message,
    );
  }
  okxSmartAccountClient.runtime.packedUserOperation.paymasterAndData =
    getPaymasterSignatureRes.data.result as Hex;
  okxSmartAccountClient.runtime.userOperation.paymasterData = ("0x" +
    getPaymasterSignatureRes.data.result.slice(106)) as Hex;
}
