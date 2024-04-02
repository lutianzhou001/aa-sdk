import { privateKeyToAccount } from "viem/accounts";
import {
  createWalletClient,
  http,
  WalletClient,
  parseEther,
  publicActions,
} from "viem";
import { hardhat, polygon } from "viem/chains";
import { ERC4337SmartContractAccount } from "../packages/erc4337SmartAccount/ERC4337SmartAccount";
import { Address } from "abitype";
import { UserOperation } from "permissionless/types/userOperation";
import {
  approveCalldata,
  transferCalldata,
} from "../packages/actions/erc20/erc20Calldata";
import { encodeUpgrade } from "../packages/actions/upgrades/upgradeCalldata";
import { UserOperation0_7 } from "../packages/plugins/types";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const tokenBase: WalletClient = createWalletClient({
  account: privateKeyToAccount(
      // hardhat public private key
    "",
  ),
  chain: hardhat,
  transport: http(),
});

const bundlerClient: WalletClient = createWalletClient({
  account: privateKeyToAccount(
    // ur private key as a bundler
    "",
  ),
  chain: polygon,
  transport: http(),
});

async function smokeTest() {
  // STEP1: create a walletClient with rpc and chain specified.
  const walletClient: WalletClient = createWalletClient({
    account: privateKeyToAccount(
      // NOTION, this privateKey is PUBLIC, ONLY FOR TESTING, DO NOT USE IT IN PRODUCTION, your private key as a EOA
      "",
    ),
    chain: polygon,
    transport: http(),
  }).extend(publicActions);

  // STEP2: create a ERC4337SmartContractAccount with the publicClient and owner
  const smartAccount = new ERC4337SmartContractAccount({
    walletClient: walletClient,
    version: "3.0.0",
    // specify your baseUrl here. baseUrl : "https://www.okx.com/priapi/v5/wallet/smart-account/"
  });

  // STEP3: create a new account with index specified. You can use any number you like.
  await smartAccount.accountManager.createNewAccount(0n, []);
  smartAccount.accountManager.getAccount(0);

  if (walletClient.chain == hardhat) {
    tokenBase.sendTransaction({
      to: smartAccount.accountManager.getAccounts()[0].accountAddress,
      value: parseEther("1"),
      chain: hardhat,
      account: tokenBase?.account?.address as Address,
    });
    console.log(
      "smartAccountAddress",
      smartAccount.accountManager.getAccounts()[0].accountAddress,
    );
    console.log(
      await tokenBase.extend(publicActions).getBalance({
        address: smartAccount.accountManager.getAccounts()[0].accountAddress,
      }),
    );
  } else {
    console.log(
      "smartAccountAddress",
      smartAccount.accountManager.getAccounts()[0].accountAddress,
    );
    console.log(
      await bundlerClient.extend(publicActions).getBalance({
        address: smartAccount.accountManager.getAccounts()[0].accountAddress,
      }),
    );
  }

  // make the callType default = call
  // STEP4: when we want to do a transaction, say, transfer some token to other people, we then deploy this smart account.
  const simpleTransferNativeTokenCallData = await smartAccount.encodeExecute({
    execRawData: {
      to: "0xbf135a074c1f2e2049b06b1d6eaf0f4a8ad58cde" as Address,
      value: BigInt(1000),
      data: "0x",
    },
    execMode: {
      callType: "single",
      try: false,
      allowFailedExecution: false,
    },
  });

  // OR
  const simpleApprovalERC20CallData = await smartAccount.encodeExecute({
    execRawData: {
      to: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f" as Address,
      data: approveCalldata(
        "0xfb4f3f12258976395b34304e2bfd76d15e0af44a",
        parseEther("100"),
      ),
      value: BigInt(0),
    },
    execMode: {
      callType: "single",
      try: false,
      allowFailedExecution: false,
    },
  });

  // OR
  const simpleTransferERC20CallData = await smartAccount.encodeExecute({
    execRawData: {
      to: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f" as Address,
      data: transferCalldata(
        "0xbf135a074c1f2e2049b06b1d6eaf0f4a8ad58cde",
        BigInt(100000),
      ),
      value: BigInt(0),
    },
    execMode: {
      callType: "single",
      try: false,
      allowFailedExecution: false,
    },
  });

  // OR
  const upgradeCalldata = await smartAccount.encodeExecute({
    execRawData: {
      to: smartAccount.accountManager.getAccounts()[0].accountAddress,
      data: encodeUpgrade("0x5147CE3947a407c95687131Be01A2b8d55FD0A40"),
      value: BigInt(0),
    },
    execMode: {
      callType: "single",
      try: false,
      allowFailedExecution: false,
    },
  });

  // STEP5: generate a userOperation and packed it.
  const preparedUserOperation: UserOperation<"v0.6"> | UserOperation0_7 =
    await smartAccount.generateUserOperationAndPacked({
      uop: {
        sender: smartAccount.accountManager.getAccounts()[0].accountAddress,
        callData: simpleTransferNativeTokenCallData,
      },
      // paymaster: {
      //   paymaster: "0xfb4f3f12258976395b34304e2bfd76d15e0af44a",
      //   token: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
      // },
    });
  console.log("preparedUserOperation", preparedUserOperation);

  // if bundler exists, it means to use a specified bundler, else, use the okx bundler.
  // const userOperationSimulationResponse: UserOperationSimulationResponse =
  //   await smartAccount.simulator.sendUserOperationSimulation(
  //     preparedUserOperation as UserOperation<"v0.6">,
  //   );

  // const sp = await smartAccount.paymasterManager.getSupportedPaymasters();

  // try to send some ether to the aa
  // await bundlerClient.sendTransaction({
  //   to: smartAccount.accountManager.getAccounts()[0].accountAddress,
  //   value: parseEther("1"),
  //   account: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
  //   chain: hardhat
  // });
  // console.log(await getBalance(bundlerClient.extend(publicActions), {address: smartAccount.accountManager.getAccounts()[0].accountAddress}));

  const userOperationRes = await smartAccount.sendUserOperationByERC4337Bundler(
    preparedUserOperation as UserOperation<"v0.6">,
    bundlerClient,
  );

  // smartAccount.getVersion()
  // await smartAccount.getImplHash()

  // const receipt = await smartAccount.accountManager.refreshAccountTransactionReceipts(preparedUserOperation.sender);

  // await delay(20000);

  // const updatedReceipt =
  //   await smartAccount.accountManager.refreshAccountTransactionReceipts(
  //     preparedUserOperation.sender,
  //   );
  //
  // console.log("Updated Receipt", updatedReceipt);
}

smokeTest();
