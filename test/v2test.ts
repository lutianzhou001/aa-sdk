import { privateKeyToAccount } from "viem/accounts";
import {
  createWalletClient,
  http,
  WalletClient,
  publicActions,
  zeroAddress,
  Hex,
} from "viem";
import { arbitrum } from "viem/chains";
import { OKXSmartAccountClient } from "../packages/okxSmartAccount/okxSmartAccountClient";
import { walletClientToOKXSmartAccountSigner } from "../packages/plugins/signers/walletClientToSmartAccountSigner";
import { paymasterActions } from "../packages/okxSmartAccount/usePaymaster";
import { createOKXSmartAccount } from "../packages/okxSmartAccount/createOKXSmartAccount";
import { configuration } from "../configuration";

async function smokeTest() {
  const walletClient: WalletClient = createWalletClient({
    account: privateKeyToAccount(process.env.WALLET_CLIENT_PRIVATE_KEY as Hex),
    chain: arbitrum,
    transport: http(
      "https://arb-mainnet.g.alchemy.com/v2/47SxM1HQgXWeKVL9rYVS6A4LZ8B_Ktk0",
    ),
  }).extend(publicActions);

  // STEP2: create an ERC4337SmartContractAccount with the publicClient and owner
  const smartAccount = await createOKXSmartAccount(
    await walletClientToOKXSmartAccountSigner(walletClient),
    "SmartAccount",
    "3.0.3",
    21n,
  );

  const smartAccountClient = new OKXSmartAccountClient(smartAccount);

  try {
    const encoded = await smartAccountClient
      .encodeExecute([
        {
          to: zeroAddress,
          value: BigInt(1),
          data: "0x",
        },
        { to: zeroAddress, value: BigInt(2), data: "0x" },
      ])
      .extend(paymasterActions)
      .usePaymaster({
        paymasterAddress: "0x505BBF2e6F7FC45c2D42C54a2578e541bab676A7",
        mode: 0,
        bizId: 9007199254740991,
      })
      .proposeTx("EIP712");

    const signed = await encoded.signAndPack();
    const hash = await signed.send();
    console.log(hash);
    // wait for some time
    const receipt = await smartAccountClient.bundlerClient.getUserOperationReceipt(hash);
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

smokeTest();
