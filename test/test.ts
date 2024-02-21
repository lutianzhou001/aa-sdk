import { privateKeyToAccount } from "viem/accounts";
import {
  createPublicClient,
  createWalletClient,
  Hex,
  http,
  PublicClient,
  WalletClient,
  parseEther,
} from "viem";
import { hardhat, polygon } from "viem/chains";
import { walletClientSigner } from "../packages/plugins/signers/walletClientSigner";
import { OKXSmartContractAccount } from "../packages/accounts/OKXSmartAccount";
import { toBigInt } from "ethers";
import { Address } from "abitype";
import { UserOperation } from "permissionless/types/userOperation";

async function smokeTest() {
  // STEP1: create an account from privateKey
  const account = privateKeyToAccount(
    "0x731fe28849e538f333fd9e95d9b88441f7eac0c277edb6848fe04600eb03ce45"
  );

  // STEP2: create a walletClient with rpc and chain specified.
  const walletClient: WalletClient = createWalletClient({
    account,
    chain: polygon,
    transport: http(
      "https://polygon-mainnet.g.alchemy.com/v2/DB0JapVSxzovPY3RaQSydinyWXPlpzi-"
    ),
  });

  // STEP3: get the walletAddress(EOS address)
  const [walletAddress] = await walletClient.getAddresses();

  // STEP4: create a publicClient with rpc and chain specified.
  // @ts-ignore
  const publicClient: PublicClient = createPublicClient({
    chain: polygon,
    transport: http(
      "https://polygon-mainnet.g.alchemy.com/v2/DB0JapVSxzovPY3RaQSydinyWXPlpzi-"
    ),
  });

  // STEP5: convert the client to the validator
  const owner = new walletClientSigner(walletClient, "SUDO");

  // STEP6: create a OKXSmartContractAccount with the publicClient and owner
  // @ts-ignore
  const smartAccount = new OKXSmartContractAccount({
    publicClient: publicClient,
    owner: owner,
    version: "2.0.0",
  });

  // STEP7: create a new account with index specified. You can use any number you like.
  // now we only get the new account information without deploy it on chain.
  await smartAccount.createNewAccountInfoV2(toBigInt(0));

  // STEP8: when we want to do a transaction, say, transfer some token to other people, we then deploy this smart account.
  const simpleTransferCalldata = await smartAccount.encodeExecute({
    to: "0x0000000000000000000000000000000000000001" as Address,
    value: BigInt(1000),
    data: "0x",
    callType: "call",
  });

  // STEP9: generate a userOperation and packed it.
  const preparedUserOperation: UserOperation =
    await smartAccount.generateUserOperationAndPacked(
      "EIP191",
      // this is a ROLE message, will be useful in the smart-account v4
      "0xDEADBEEF" as Hex,
      {
        sender: smartAccount.getAccountInfos()[0].accountAddress,
        callData: simpleTransferCalldata,
      }
    );

  // transfer 0.1ETH to the address
  // await smartAccount
  //   .getOwner()
  //   .getWalletClient()
  //   .sendTransaction({
  //     to: preparedUserOperation.sender,
  //     value: parseEther("0.1"),
  //     account: walletAddress,
  //     data: "0x",
  //     chain: hardhat,
  //   });

  const userOperationSimulationResponse =
    await smartAccount.sendUserOperationSimulationByAPI(preparedUserOperation);

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
