# Modular-Smart-Account-SDK

## Introduction
a generic smart account SDK that can be used to interact with okx smart account v3 and later. Developed with viem.sh to minimize the package

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
  // first convert the client to the validator
  const owner = new walletClientSigner(walletClient, "SUDO");

  // now convert the client to the smart account
  const smartAccount = new OKXSmartContractAccount({
    publicClient: publicClient,
    owner: owner,
  });
```

## Usage
feel free to use this smartAccount class
