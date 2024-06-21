import { privateKeyToAccount } from "viem/accounts";
import {
  createPublicClient,
  createWalletClient,
  Hex,
  http,
  publicActions,
  PublicClient,
  toHex,
  WalletClient,
  zeroAddress,
} from "viem";
import { polygon } from "viem/chains";
import { walletClientAASigner } from "../packages/plugins/signers/walletClientAASigner";
import { OKXSmartContractAccount } from "../packages/okxSmartAccount/OKXSmartContractAccount";
import {delay} from "../test/utils";

async function smoke() {
  const publicClient: PublicClient = createPublicClient({
    chain: polygon,
    transport: http(),
    // "https://arb-mainnet.g.alchemy.com/v2/47SxM1HQgXWeKVL9rYVS6A4LZ8B_Ktk0",
  });

  const walletClient: WalletClient = createWalletClient({
    account: privateKeyToAccount(process.env.WALLET_CLIENT_PRIVATE_KEY as Hex),
    chain: polygon,
    transport: http(),
    // "https://arb-mainnet.g.alchemy.com/v2/47SxM1HQgXWeKVL9rYVS6A4LZ8B_Ktk0",
  }).extend(publicActions);

  const okxSmartContractAccount = await OKXSmartContractAccount.create({
    rpcProvider: publicClient,
    signer: new walletClientAASigner(walletClient),
    name: "SmartAccount",
    version: "3.0.2",
    index: 4n,

    bundlerClientConfig: {
      bundlerUrl: "https://beta.okex.org",
    },
    paymasterClientConfig: {
      paymasterUrl: "https://beta.okex.org",
    },
  });

  const hash = await okxSmartContractAccount.sendTransaction({
    to: zeroAddress,
    data: "0x",
    value: toHex(1),
    from: await okxSmartContractAccount.getAddress(),
  });

  const res = await okxSmartContractAccount.bundlerClient.waitForConfirm(hash);
  console.log("successfully get the hash", res);
}

smoke().then((r) => console.log("successfully make a smoke test"));


