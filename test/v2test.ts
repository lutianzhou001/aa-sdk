import { privateKeyToAccount, toAccount } from "viem/accounts";
import {
  createWalletClient,
  http,
  WalletClient,
  publicActions,
  Address,
} from "viem";
import { arbitrum } from "viem/chains";
import { ERC4337SmartAccount } from "../packages/erc4337SmartAccount/ERC4337SmartAccount";
import { walletClientToERC4337SmartAccountSigner } from "../packages/plugins/signers/walletClientToSmartAccountSigner";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const tokenBase: WalletClient = createWalletClient({
  account: privateKeyToAccount(
    // hardhat public private key
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  ),
  chain: arbitrum,
  transport: http(),
});

const bundlerClient: WalletClient = createWalletClient({
  account: privateKeyToAccount(
    // ur private key as a bundler
    "0xb68f1206ecdd591deac1f67c0e21181f6801933f0a49f5eb0df2e6aebb5d7b09",
  ),
  chain: arbitrum,
  transport: http(),
});

async function smokeTest() {
  const walletClient: WalletClient = createWalletClient({
    account: privateKeyToAccount(
      "0x54b4d875527874141f5f0ee69ba62c289dc138654ffa62ec5737d1c1644ef193",
    ),
    chain: arbitrum,
    transport: http(),
  }).extend(publicActions);

  // STEP2: create a ERC4337SmartContractAccount with the publicClient and owner
  const smartAccount = new ERC4337SmartAccount();
  const account = await smartAccount.accountManager.createNewAccount(
    await walletClientToERC4337SmartAccountSigner(walletClient),
    "SmartAccount",
    "3.0.0",
    0n,
    [],
  );

  smartAccount
    .connect(account)
    .encodeExecute({
      execRawData: {
        to: "0x9b4b4c715dd9b3b8f39b8da57fe1beee5da5e25e" as Address,
        value: BigInt(100000000),
        data: "0x",
      },
      execMode: {
        callType: "single",
        try: false,
        allowFailedExecution: false,
      },
    })
    .prepareTx("EIP191")
    .then((res) => res.signAndPack().then((res) => res.send()));
}
smokeTest();
