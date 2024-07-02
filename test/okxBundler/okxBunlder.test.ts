import { walletClientAASigner } from "../../packages/plugins/signers/walletClientAASigner";
import {
  Chain,
  createWalletClient,
  Hex,
  http,
  publicActions,
  toHex,
  WalletClient,
  zeroAddress,
  zeroHash,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { polygon } from "viem/chains";
import { describe, expect, it } from "vitest";
import { delay, givenConnectedProvider } from "../utils";
import { getConfig } from "../../packages/common/utils";

describe("OKX Smart Account EntryPoint v7 Tests", () => {
  const walletClient: WalletClient = createWalletClient({
    account: privateKeyToAccount(process.env.WALLET_CLIENT_PRIVATE_KEY as Hex),
    chain: polygon,
    transport: http(),
    // "https://arb-mainnet.g.alchemy.com/v2/47SxM1HQgXWeKVL9rYVS6A4LZ8B_Ktk0",
  }).extend(publicActions);

  const chain: Chain = polygon;
  const signer = new walletClientAASigner(walletClient);

  it("should successfully get nonce", async () => {
    const provider = await givenConnectedProvider({ signer, chain, index: 0n });
    expect(await provider.getAddress()).toMatchInlineSnapshot(
      `"0xfc386Ff841DeB3879446808A90307Ca0511B8676"`,
    );

    const getOwnerRes = provider.bundlerClient.getNonce(
      "0xfc386Ff841DeB3879446808A90307Ca0511B8676",
      "0x9BB14d03BC35E60e4D848c9f18c73fA159F959d5",
      getConfig("3.0.2").smartContractAccountTemplate,
    );
    await expect(getOwnerRes).resolves.not.toThrowError();
  });

  it("should simulate uop successfully", async () => {
    const provider = await givenConnectedProvider({ signer, chain, index: 0n });
    const uop = await provider.buildUserOpAndSign({
      args: { to: zeroAddress, value: 1n, data: "0x" },
    });
    const result = provider.bundlerClient.simulateUserOperation(uop);
    expect(result).resolves.not.toThrowError;
  });

  it("should get the receipt successfully", async () => {
    const provider = await givenConnectedProvider({ signer, chain, index: 4n });
    const sent = await provider.sendTransaction({
      from: await provider.getAddress(),
      to: await provider.getAddress(),
      value: toHex(1),
      data: "0x",
    });
    // a 30s delay
    await delay(30000);
    const receipt = provider.bundlerClient.getUserOperationReceipt(sent);
    expect(receipt).resolves.not.toThrowError;
  }, 60000);

  it("should get the receipt error when the hash is not correct", async () => {
    const provider = await givenConnectedProvider({ signer, chain, index: 0n });
    const receipt = provider.bundlerClient.getUserOperationReceipt(zeroHash);
    expect(receipt).resolves.toThrowError;
  });
});
