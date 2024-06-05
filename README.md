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
  // first create a signer(ECDSA signer/JWT singer...)
  const walletClient: WalletClient = createWalletClient({
    account: privateKeyToAccount(configuration.walletClientPrivateKey as Hex),
    chain: arbitrum,
    transport: http(),
  }).extend(publicActions);

  // 2. convert the signer to make a smartAccount
  const smartAccount = await createOKXSmartAccount(
    await walletClientToERC4337SmartAccountSigner(walletClient),
    // smartAccount name
    "SmartAccount",
    // smartAccount version
    "3.0.3",
    // index, from 0,1,2...
    0n,
  );

  // 3. make the smartAccount to a smartAccountClient
  const smartAccountClient = new OKXSmartAccountClient(smartAccount, {
    bundlerUrl: "bundlerUrl if you want to specify",
  });

  // 4. then we use it!
  const encoded = await smartAccountClient
      // it is a batch transaction
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
      // or "EIP712"
    .proposeTx("EIP191");

  const signed = await encoded.signAndPack();
  const hash = await signed.send();
  console.log(hash);
  // wait for some time
  const receipt = await smartAccountClient.getUserOperationReceipt(hash);
```

