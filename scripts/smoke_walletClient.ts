import { privateKeyToAccount } from "viem/accounts";
import {
  createWalletClient,
  Hex,
  http,
  publicActions,
  toHex,
  WalletClient,
  zeroAddress,
} from "viem";
import { arbitrum } from "viem/chains";
import { walletClientAASigner } from "../packages/plugins";
import { OKXSmartAccountSDK } from "../packages/okxSmartAccount/OKXSmartContractAccount";

async function smoke_walletClient() {
  // this is a signer, in this case, I use walletClient to act as a signer
  const walletClient: WalletClient = createWalletClient({
    account: privateKeyToAccount(process.env.WALLET_CLIENT_PRIVATE_KEY as Hex),
    chain: arbitrum,
    transport: http(),
    // "https://arb-mainnet.g.alchemy.com/v2/47SxM1HQgXWeKVL9rYVS6A4LZ8B_Ktk0",
  }).extend(publicActions);

  // now we create an instance which contains: a rpcProvider(publicClient), a signer(in this case, it is a walletClientSigner), the name and version of the smart account, and the index of it)
  const okxSmartContractAccountSDK = new OKXSmartAccountSDK({
    bundlerClientUrl: "https://beta.okex.org",
    paymasterClientUrl: "https://beta.okex.org",
    mainnetClientUrl:
      "https://eth-mainnet.g.alchemy.com/v2/DB0JapVSxzovPY3RaQSydinyWXPlpzi-",
    rpcUrl:
      "https://arb-mainnet.g.alchemy.com/v2/47SxM1HQgXWeKVL9rYVS6A4LZ8B_Ktk0",
  });

  const okxSmartContractAccount =
    await okxSmartContractAccountSDK.createOKXSmartContractAccount({
      chain: arbitrum,
      // chain: 421614,
      signer: new walletClientAASigner(walletClient),
      index: 40n,
    });

  // act just like what you send transaction in ethers.js
  const hash = await okxSmartContractAccount.sendTransaction(
    {
      to: zeroAddress,
      data: "0x",
      value: toHex(1),
      from: okxSmartContractAccount.getOKXSmartAccountAddress(),
    },
    // {
    //   paymasterAddress: "0x505BBF2e6F7FC45c2D42C54a2578e541bab676A7",
    //   paymasterMode: PaymasterMode.FREE_GAS_MODE,
    // },
  );

  // OR you can build a transaction and send it
  // const builtUop = await okxSmartContractAccount.buildUserOp({
  //   args: {
  //     to: zeroAddress,
  //     data: "0x",
  //     value: BigInt(1)
  //   },
  //   // you can specify what you want to override
  //   uopAndPaymasterOverrides: {
  //     preVerificationGas: BigInt(100000000),
  //     maxFeePerGas: BigInt(100000000000),
  //     maxPriorityFeePerGas: BigInt(100000000000),
  //     paymasterAddress: YOUR_PAYMASTER_ADDRESS
  //   }
  // })
  //
  // // then you can send this Uop
  // const sent = await okxSmartContractAccount.sendUserOp(builtUop);

  // wait for confirmation
  const res = await okxSmartContractAccount.bundlerClient.waitForConfirm(hash);
  console.log("successfully get the hash", res);
}

smoke_walletClient().then(() =>
  console.log("successfully make a smoke_walletClient test"),
);
