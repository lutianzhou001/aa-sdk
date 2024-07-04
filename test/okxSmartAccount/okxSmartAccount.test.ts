import { walletClientAASigner } from "../../packages/plugins";
import {
  Chain,
  createWalletClient,
  Hex,
  http,
  publicActions,
  WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { optimismGoerli, polygon } from "viem/chains";
import { describe, expect, it } from "vitest";
import { givenConnectedProvider } from "../utils";

describe("OKX Smart Account Tests", () => {
  const walletClient: WalletClient = createWalletClient({
    account: privateKeyToAccount(process.env.WALLET_CLIENT_PRIVATE_KEY as Hex),
    chain: polygon,
    transport: http(),
    // "https://arb-mainnet.g.alchemy.com/v2/47SxM1HQgXWeKVL9rYVS6A4LZ8B_Ktk0",
  }).extend(publicActions);

  const chain: Chain = optimismGoerli;
  const signer = new walletClientAASigner(walletClient);

  it("should throw an error if the chain is not supported", async () => {
    const provider = givenConnectedProvider({ index: 0n, signer, chain });
    await expect(provider).rejects.toThrow();
  });
});
