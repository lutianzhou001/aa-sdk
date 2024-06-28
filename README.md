# Modular-Smart-Account-SDK

## Introduction

a generic smart account SDK that can be used to interact with erc4337 smart account v3 and later. Developed with viem.sh to minimize the package

✅️one-click to create a modular smart account  
✅️batch modular smart account creation  
✅️only focus on the calldata logic, will do everything for you to set the gas price, nonce, etc.  
✅local calculation instead of on chain querying

## install dependencies

```bash
yarn
```

## quick start

```typescript
async function smoke() {
  // this is a public client, it is necessary to have a public client to interact with the blockchain
  const publicClient: PublicClient = createPublicClient({
    chain: polygon,
    transport: http(),
    // "https://arb-mainnet.g.alchemy.com/v2/47SxM1HQgXWeKVL9rYVS6A4LZ8B_Ktk0",
  });

  // this is a signer, in this case, I use walletClient to act as a signer
  const walletClient: WalletClient = createWalletClient({
    account: privateKeyToAccount(process.env.WALLET_CLIENT_PRIVATE_KEY as Hex),
    chain: polygon,
    transport: http(),
    // "https://arb-mainnet.g.alchemy.com/v2/47SxM1HQgXWeKVL9rYVS6A4LZ8B_Ktk0",
  }).extend(publicActions);

  // now we create a instance which contains: a rpcProvider(publicClient), a signer(in this case, it is a walletClientSigner), the name and version of the smart account, and the index of it)
  const okxSmartContractAccount = await OKXSmartContractAccount.create({
    rpcProvider: publicClient,
    signer: new walletClientAASigner(walletClient),
    name: "SmartAccount",
    version: "3.0.2",
    index: 4n,

    // we need to config the bundlerClient and paymasterClient(optional unless you need a gas sponsor)
    bundlerClientConfig: {
      bundlerUrl: "https://beta.okex.org",
    },
    paymasterClientConfig: {
      paymasterUrl: "https://beta.okex.org",
    },
  });

  // act just like what you send transaction in ethers.js
  const hash = await okxSmartContractAccount.sendTransaction({
    to: zeroAddress,
    data: "0x",
    value: toHex(1),
    from: await okxSmartContractAccount.getAddress(),
  });

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
```
