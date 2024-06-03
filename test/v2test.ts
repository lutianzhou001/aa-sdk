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
import { walletClientToERC4337SmartAccountSigner } from "../packages/plugins/signers/walletClientToSmartAccountSigner";
import { paymasterActions } from "../packages/okxSmartAccount/usePaymaster";
import { createOKXSmartAccount } from "../packages/okxSmartAccount/createOKXSmartAccount";
import { configuration } from "../configuration";

async function smokeTest() {
  const walletClient: WalletClient = createWalletClient({
    account: privateKeyToAccount(configuration.walletClientPrivateKey as Hex),
    chain: arbitrum,
    transport: http(),
  }).extend(publicActions);

  // STEP2: create an ERC4337SmartContractAccount with the publicClient and owner
  const smartAccount = await createOKXSmartAccount(
    await walletClientToERC4337SmartAccountSigner(walletClient),
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
      })
      .proposeTx("EIP191");

    const signed = await encoded.signAndPack();
    const u = await signed.send();
    console.log(u);
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

smokeTest();
