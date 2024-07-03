import { OKXAASigner } from "../packages/plugins/interfaces/OKXAASigner";
import { Chain, createPublicClient, http, PublicClient } from "viem";
import { OKXSmartContractAccount } from "../packages/okxSmartAccount/OKXSmartContractAccount";

export const givenConnectedProvider = async ({
  signer,
  chain,
  index,
}: {
  signer: OKXAASigner;
  chain: Chain;
  index: bigint;
}) => {
  return await OKXSmartContractAccount.create({
    chain: chain,
    signer: signer,
    version: "3.0.2",
    index: index,

    bundlerClient: "https://beta.okex.org",
  });
};

export const givenConnectedProviderWithPaymaster = async ({
  signer,
  chain,
  index,
}: {
  signer: OKXAASigner;
  chain: Chain;
  index: bigint;
}) => {
  const publicClient: PublicClient = createPublicClient({
    chain: chain,
    transport: http(),
  });
  return await OKXSmartContractAccount.create({
    chain: chain,
    signer: signer,
    version: "3.0.2",
    index: index,

    bundlerClient: "https://beta.okex.org",
    paymasterClient: "https://beta.okex.org",
  });
};

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
