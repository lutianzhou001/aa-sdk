import { Address, Chain, Hex, Transport } from "viem";
import { ERC4337SmartAccountSigner } from "../../plugins/types";
import { SupportedPayMaster } from "../types";
import axios from "axios";
import { networkConfigurations } from "../../../configuration";
import { ERC4337SmartAccount } from "../ERC4337SmartAccount";
import { callClient, convertToHex } from "../../common/utils";
import { ENTRYPOINT_ADDRESS_V07 } from "permissionless";

export function paymasterActions<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
  TSigner extends ERC4337SmartAccountSigner = ERC4337SmartAccountSigner,
>(smartAccount: ERC4337SmartAccount<TTransport, TChain, TSigner>) {
  return {
    usePaymaster: (usePaymasterParams: UsePaymasterParams) =>
      usePaymaster(smartAccount, usePaymasterParams),
    getSupportedPaymasters: () => getSupportedPaymasters(smartAccount),
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
  smartAccount: ERC4337SmartAccount<TTransport, TChain, TSigner>,
  usePaymasterParams: UsePaymasterParams,
): ERC4337SmartAccount<TTransport, TChain, TSigner> {
  // some logic here
  smartAccount.runtime.rawPaymaster = {
    paymasterAddress: usePaymasterParams.paymasterAddress,
    paymasterToken: usePaymasterParams.tokenAddress,
    paymasterVerificationGasLimit:
      usePaymasterParams.paymasterVerificationGasLimit,
    paymasterPostOpGasLimit: usePaymasterParams.paymasterPostOpGasLimit,
  };
  return smartAccount;
}

export async function getSupportedPaymasters<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
  TSigner extends ERC4337SmartAccountSigner = ERC4337SmartAccountSigner,
>(
  smartAccount: ERC4337SmartAccount<TTransport, TChain, TSigner>,
): Promise<SupportedPayMaster[]> {
  const config = {
    method: "get",
    maxBodyLength: Infinity,
    url: smartAccount.paymasterUrl,
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
  smartAccount: ERC4337SmartAccount<TTransport, TChain, TSigner>,
): Promise<void> {
  if (
    !smartAccount.runtime.userOperation ||
    !smartAccount.runtime.packedUserOperation
  ) {
    throw new Error("uop not found");
  }
  // TODO: TO MAKE IT BETTER
  const payload = JSON.stringify({
    entryPoint: ENTRYPOINT_ADDRESS_V07,
    paymaster: smartAccount.runtime.userOperation.paymaster,
    uop: convertToHex(smartAccount.runtime.userOperation),
  });
  const gasEstimationRes = await callClient(
    networkConfigurations.base_url +
      "priapi/v5/wallet/smart-account/pm/42161/getPaymasterSignature",
    payload,
  );
  if (gasEstimationRes.data.error) {
    throw new Error(gasEstimationRes.data.error);
  }
  smartAccount.runtime.packedUserOperation.paymasterAndData = gasEstimationRes
    .data.result as Hex;
  smartAccount.runtime.userOperation.paymasterData = ("0x" +
    gasEstimationRes.data.result.slice(106)) as Hex;
}
