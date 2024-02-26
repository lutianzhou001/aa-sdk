import { privateKeyToAccount } from "viem/accounts";
import {
  createWalletClient,
  http,
  WalletClient,
  parseEther,
  publicActions,
  keccak256,
  Hex,
} from "viem";
import { polygon } from "viem/chains";
import { walletClientSigner } from "../packages/plugins/signers/walletClientSigner";
import { OKXSmartContractAccount } from "../packages/okxSmartAccount/OKXSmartAccount";
import { toBigInt } from "ethers";
import { Address } from "abitype";
import { UserOperation } from "permissionless/types/userOperation";
import {
  approveCalldata,
  transferCalldata,
} from "../packages/actions/erc20/erc20Calldata";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function smokeTest() {
  // STEP1: create a walletClient with rpc and chain specified.
  const walletClient: WalletClient = createWalletClient({
    account: privateKeyToAccount(
      "0x731fe28849e538f333fd9e95d9b88441f7eac0c277edb6848fe04600eb03ce45"
    ),
    chain: polygon,
    transport: http(
      "https://polygon-mainnet.g.alchemy.com/v2/DB0JapVSxzovPY3RaQSydinyWXPlpzi-"
    ),
  }).extend(publicActions);

  // OR we can create a walletClient with window.provider
  // const client = createWalletClient({
  //   chain: polygon,
  //   transport: custom(window.ethereum!),
  // }).extend(publicActions);

  // if you want to get the wallet address, use this.
  // const [walletAddress] = await walletClient.getAddresses();

  // STEP2: create a OKXSmartContractAccount with the publicClient and owner
  const smartAccount = new OKXSmartContractAccount({
    walletClient: walletClient,
    // ONLY 2.0.0 and 3.0.0 is supported
    version: "2.0.0",
  });

  // STEP3: create a new account with index specified. You can use any number you like.
  await smartAccount.accountManager.createNewAccount();

  // STEP3-1: query to get to know if the account exists
  smartAccount.accountManager.isExist(0);
  smartAccount.accountManager.isExist(
    "0xc2132d05d31c914a87c6611c10748aeb04b58e8f"
  );

  // make the callType default = call
  // STEP4: when we want to do a transaction, say, transfer some token to other people, we then deploy this smart account.
  const simpleTransferNativeTokenCallData = await smartAccount.encodeExecute({
    to: "0x0000000000000000000000000000000000000001" as Address,
    value: BigInt(1000),
    data: "0x",
    callType: "call",
  });

  // OR
  const simpleApprovalERC20CallData = await smartAccount.encodeExecute({
    to: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f" as Address,
    data: approveCalldata(
      "0xfb4f3f12258976395b34304e2bfd76d15e0af44a",
      parseEther("100")
    ),
    value: toBigInt(0),
    callType: "call",
  });

  // OR
  const simpleTransferERC20CallData = await smartAccount.encodeExecute({
    to: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f" as Address,
    data: transferCalldata(
      "0xbf135a074c1f2e2049b06b1d6eaf0f4a8ad58cde",
      toBigInt(100000)
    ),
    value: toBigInt(0),
    callType: "call",
  });

  // STEP5: generate a userOperation and packed it.
  const preparedUserOperation: UserOperation =
    await smartAccount.generateUserOperationAndPacked({
      uop: {
        sender: smartAccount.accountManager.getAccounts()[0].accountAddress,
        callData: simpleTransferNativeTokenCallData,
      },
      paymaster: {
        paymaster: "0xfb4f3f12258976395b34304e2bfd76d15e0af44a",
        token: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
      },
    });

  const userOperationSimulationResponse =
    await smartAccount.simulator.sendUserOperationSimulationByOKXBundler(
      preparedUserOperation
    );

  // by OKX bundler
  const userOperationRes = await smartAccount.sendUserOperationByOKXBundler(
    preparedUserOperation
  );

  await delay(20000);

  const receipt =
    await smartAccount.accountManager.updateAccountTransactionReceipts(
      preparedUserOperation.sender
    );

  console.log(
    smartAccount.accountManager.getAccount(preparedUserOperation.sender)
  );

  // estimateGase
  // await smartAccount.getEstimationGas(preparedUserOperation);
  //
  // // STEP10: execute.
  // await smartAccount.execute(userOperationSimulationResponse.request);
  //
  // // FOR EOA EXECUTION:
  // const userOperationFromEOAResponse = await smartAccount.sendFromEOASimulation(
  //   smartAccount.getAccountInfos()[0].accountAddress,
  //   "0x0000000000000000000000000000000000000001" as Address,
  //   BigInt(1000),
  //   "0x"
  // );
  // await smartAccount.execute(userOperationFromEOAResponse.request);
  //
  // // check balance
  // const balance = await publicClient.getBalance({
  //   address: "0x0000000000000000000000000000000000000001",
  // });
  // console.log(balance);
  //
  // // install a new validator
  // const newValidator = smartAccount.installValidator(
  //   smartAccount.getAccountInfos()[0].accountAddress,
  //   "0xc5062aA0a705c1eFd24C8A94B0Da026aF0022Db4"
  // );
  //
  // // prepareUop
  // const preparedUserOperationNewValidator: UserOperation =
  //   await smartAccount.generateUserOperationAndPacked(
  //     "EIP191",
  //     // this is a ROLE message, will be useful in the smart-account v4
  //     "0xDEADBEEF" as Hex,
  //     {
  //       sender: smartAccount.getAccountInfos()[0].accountAddress,
  //       callData: newValidator,
  //     }
  //   );
  //
  // const userOperationNewValidatorSimulationResponse =
  //   await smartAccount.sendUserOperationSimulation(
  //     preparedUserOperationNewValidator
  //   );
  //
  // await smartAccount.execute(
  //   userOperationNewValidatorSimulationResponse.request
  // );
  //
  // // we support batch generate new account information.
  // const batchNewInfos = await smartAccount.batchCreateNewAccountInfo(10, []);
}

smokeTest();
