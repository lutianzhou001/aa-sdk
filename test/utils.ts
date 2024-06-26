import { OKXAASigner } from "../packages/plugins/interfaces/OKXAASigner";
import { Chain, createPublicClient, http, PublicClient } from "viem";
import { OKXSmartContractAccount } from "../packages/okxSmartAccount/OKXSmartContractAccount";

export const givenConnectedProvider = async ({
  signer,
  chain,
}: {
  signer: OKXAASigner;
  chain: Chain;
}) => {
  const publicClient: PublicClient = createPublicClient({
    chain: chain,
    transport: http(),
  });
  return await OKXSmartContractAccount.create({
    rpcProvider: publicClient,
    signer: signer,
    version: "3.0.2",
    index: 0n,

    bundlerClientConfig: {
      bundlerUrl: "https://beta.okex.org",
    },
  });
};

export const givenConnectedProviderWithPaymaster = async ({
  signer,
  chain,
}: {
  signer: OKXAASigner;
  chain: Chain;
}) => {
  const publicClient: PublicClient = createPublicClient({
    chain: chain,
    transport: http(),
  });
  return await OKXSmartContractAccount.create({
    rpcProvider: publicClient,
    signer: signer,
    version: "3.0.2",
    index: 0n,

    bundlerClientConfig: {
      bundlerUrl: "https://beta.okex.org",
    },
    paymasterClientConfig: {
      paymasterUrl: "https://beta.okex.org",
    },
  });
};

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
