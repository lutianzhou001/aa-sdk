import { privateKeyToAccount } from "viem/accounts";
import {
  createPublicClient,
  createWalletClient,
  Hex,
  http,
  publicActions,
  toHex,
  WalletClient,
  zeroAddress,
} from "viem";
import { polygon } from "viem/chains";
import { walletClientAASigner } from "../packages/plugins/signers/walletClientAASigner";
import { OKXSmartContractAccount } from "../packages/okxSmartAccount/OKXSmartContractAccount";

async function createSingleTransaction() {
  const walletClient: WalletClient = createWalletClient({
    account: privateKeyToAccount(process.env.WALLET_CLIENT_PRIVATE_KEY as Hex),
    chain: polygon,
    transport: http(),
  }).extend(publicActions);

  const okxSmartContractAccount = await OKXSmartContractAccount.create({
    rpcProvider: createPublicClient({
      chain: polygon,
      transport: http(),
    }),
    signer: new walletClientAASigner(walletClient),
    index: 4n,

    bundlerClientConfig: {
      bundlerUrl: "https://beta.okex.org",
    },
  });

  console.log(
    "the smart account address is ",
    okxSmartContractAccount.getOKXSmartAccountAddress(),
  );

  const hash = await okxSmartContractAccount.sendTransactions([
    {
      to: zeroAddress,
      data: "0x",
      value: toHex(1),
      from: okxSmartContractAccount.getOKXSmartAccountAddress(),
    },
    {
      to: zeroAddress,
      data: "0x",
      value: toHex(2),
      from: okxSmartContractAccount.getOKXSmartAccountAddress(),
    },
  ]);

  // wait for confirmation
  const res = await okxSmartContractAccount.bundlerClient.waitForConfirm(hash);
  console.log("successfully get the hash", res);
}

createSingleTransaction().then(() =>
  console.log("successfully make a smoke test"),
);
