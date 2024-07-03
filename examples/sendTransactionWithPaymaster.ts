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
import { walletClientAASigner } from "../packages/plugins";
import { OKXSmartContractAccount } from "../packages/okxSmartAccount/OKXSmartContractAccount";
import { PaymasterMode } from "../packages/okxSmartAccount/types";

async function sendTransactionWithPaymaster() {
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
    paymasterClientConfig: {
      paymasterUrl: "https://beta.okex.org",
    },
  });

  console.log(
    "the smart account address is ",
    okxSmartContractAccount.getOKXSmartAccountAddress(),
  );

  const hash = await okxSmartContractAccount.sendTransaction(
    {
      to: zeroAddress,
      data: "0x",
      value: toHex(1),
      from: okxSmartContractAccount.getOKXSmartAccountAddress(),
    },
    {
      paymasterAddress: "0x505BBF2e6F7FC45c2D42C54a2578e541bab676A7",
      paymasterMode: PaymasterMode.FREE_GAS_MODE,
    },
  );

  // wait for confirmation
  const res = await okxSmartContractAccount.bundlerClient.waitForConfirm(hash);
  console.log("successfully get the hash", res);
}

sendTransactionWithPaymaster().then(() =>
  console.log("successfully make a smoke test"),
);
