import { Address, Chain, Hex, pad, toHex, Transport } from "viem";
import { OKXSmartAccountSigner } from "../plugins/types";
import { SupportedPayMaster } from "./types";
import { OKXSmartAccountClient } from "./okxSmartAccountClient";

export function paymasterActions<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
  TSigner extends OKXSmartAccountSigner = OKXSmartAccountSigner,
>(okxSmartAccountClient: OKXSmartAccountClient<TTransport, TChain, TSigner>) {
  return {
    usePaymaster: (usePaymasterParams: UsePaymasterParams) =>
      usePaymaster(okxSmartAccountClient, usePaymasterParams),
    getSupportedPaymasters: () => getSupportedPaymasters(okxSmartAccountClient),
  };
}

export type UsePaymasterParams = {
  paymasterAddress: Address;
  mode: number;
  bizId: number;
  tokenAddress?: Address;
  paymasterVerificationGasLimit?: bigint;
  paymasterPostOpGasLimit?: bigint;
};

export function usePaymaster<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
  TSigner extends OKXSmartAccountSigner = OKXSmartAccountSigner,
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
  if (usePaymasterParams.mode < 0 || usePaymasterParams.mode > 16 ** 2) {
    throw new Error("mode must be between 0 and 16 ** 2");
  }
  if (usePaymasterParams.bizId < 0 || usePaymasterParams.bizId > 16 ** 16) {
    throw new Error("bizId must be between 0 and 16 ** 16");
  }
  okxSmartAccountClient.runtime.userOperation.paymasterData = (pad(
    toHex(usePaymasterParams.mode),
    { size: 1 },
  ) + pad(toHex(usePaymasterParams.bizId), { size: 8 }).slice(2)) as Hex;
  return okxSmartAccountClient;
}

export async function getSupportedPaymasters<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
  TSigner extends OKXSmartAccountSigner = OKXSmartAccountSigner,
>(
  okxSmartAccountClient: OKXSmartAccountClient<TTransport, TChain, TSigner>,
): Promise<SupportedPayMaster[]> {
  return okxSmartAccountClient.paymasterClient?.getSupportedPaymasters();
}

export async function getPaymasterAndData<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
  TSigner extends OKXSmartAccountSigner = OKXSmartAccountSigner,
>(
  okxSmartAccountClient: OKXSmartAccountClient<TTransport, TChain, TSigner>,
): Promise<void> {
  const getPaymasterSignatureRes =
    await okxSmartAccountClient.paymasterClient?.getPaymasterData(
      okxSmartAccountClient.runtime.userOperation,
    );
  okxSmartAccountClient.runtime.packedUserOperation.paymasterAndData =
    getPaymasterSignatureRes.data.result as Hex;
  okxSmartAccountClient.runtime.userOperation.paymasterData = ("0x" +
    getPaymasterSignatureRes.data.result.slice(106)) as Hex;
}
