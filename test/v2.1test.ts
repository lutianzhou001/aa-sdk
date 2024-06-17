import { privateKeyToAccount } from "viem/accounts";
import {
  createPublicClient,
  createWalletClient,
  Hex,
  http,
  publicActions,
  PublicClient,
  WalletClient,
  zeroAddress,
} from "viem";
import { arbitrum } from "viem/chains";
import { walletClientAASigner } from "../packages/plugins/signers/walletClientAASigner";
import { OKXSmartContractAccount } from "../packages/okxSmartAccount/OKXSmartContractAccount";
import { SigType } from "../packages/okxSmartAccount/utils/types";

async function smokeTest() {
  const publicClient: PublicClient = createPublicClient({
    chain: arbitrum,
    transport: http(
      "https://arb-mainnet.g.alchemy.com/v2/47SxM1HQgXWeKVL9rYVS6A4LZ8B_Ktk0",
    ),
  });

  const walletClient: WalletClient = createWalletClient({
    account: privateKeyToAccount(process.env.WALLET_CLIENT_PRIVATE_KEY as Hex),
    chain: arbitrum,
    transport: http(
      "https://arb-mainnet.g.alchemy.com/v2/47SxM1HQgXWeKVL9rYVS6A4LZ8B_Ktk0",
    ),
  }).extend(publicActions);

  const signer = new walletClientAASigner(walletClient);

  const okxSmartContractAccount = await OKXSmartContractAccount.create({
    rpcProvider: publicClient,
    signer: new walletClientAASigner(walletClient),
    name: "SmartAccount",
    version: "3.0.3",
    index: 21n,

    bundlerClientConfig: {
      bundlerUrl: "https://beta.okex.org",
    },
    paymasterClientConfig: {
      paymasterUrl: "https://beta.okex.org",
    },
  });

  const signedUop = await okxSmartContractAccount.buildUserOp({
    args: {
      to: zeroAddress,
      value: BigInt(1),
      data: "0x",
    },
    sigType: SigType.EIP191,
    sigTime: 1807465398n,
    packTxMiddlewareOverrider: {
      gasEstimationOverride: {
        callGasLimit: 75000n,
        verificationGasLimit: 120000n,
        preVerificationGas: 3300000n,
      }
    }
    // paymasterRawData: {
    //   paymasterAddress: "0x505BBF2e6F7FC45c2D42C54a2578e541bab676A7",
    //   paymasterMode: PaymasterMode.FREE_GAS_MODE,
    // },
  });

  const res = await okxSmartContractAccount.sendUserOp(signedUop);
  console.log(res);

  // const smartAccountClient = new OKXSmartAccountClient(smartAccount);
  //
  // try {
  //     const encoded = await smartAccountClient
  //         .encodeExecute([
  //             {
  //                 to: zeroAddress,
  //                 value: BigInt(1),
  //                 data: "0x",
  //             },
  //             { to: zeroAddress, value: BigInt(2), data: "0x" },
  //         ])
  //         .extend(paymasterActions)
  //         .usePaymaster({
  //             paymasterAddress: "0x505BBF2e6F7FC45c2D42C54a2578e541bab676A7",
  //             mode: 0,
  //             bizId: 9007199254740991,
  //         })
  //         .proposeTx(SigType.EIP712);
  //
  //     const signed = await encoded.signAndPack();
  //     const hash = await signed.send();
  //     console.log(hash);
  //     // wait for some time
  //     const receipt =
  //         await smartAccountClient.bundlerClient.getUserOperationReceipt(hash);
  // } catch (error) {
  //     console.error("An error occurred:", error);
  // }
}

smokeTest();
