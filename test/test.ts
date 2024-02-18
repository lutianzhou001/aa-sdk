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
import { hardhat } from "viem/chains";
import { walletClientSigner } from "../packages/plugins/signers/walletClientSigner";
import { OKXSmartContractAccount } from "../packages/accounts/OKXSmartAccount";
import { toBigInt } from "ethers";
import { Address } from "abitype";
import { UserOperation } from "permissionless/types/userOperation";

async function smokeTest() {
  // STEP1: create a account from privateKey
  const account = privateKeyToAccount(
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
  );

  // STEP2: create a walletClient with rpc and chain specified.
  const walletClient: WalletClient = createWalletClient({
    account,
    chain: hardhat,
    transport: http("http://127.0.0.1:8545"),
  });

  // STEP3: get the walletAddress(EOS address)
  const [walletAddress] = await walletClient.getAddresses();

  // STEP4: create a publicClient with rpc and chain specified.
  // @ts-ignore
  const publicClient: PublicClient = createPublicClient({
    chain: hardhat,
    transport: http("http://127.0.0.1:8545"),
  });

  // STEP5: convert the client to the validator
  const owner = new walletClientSigner(walletClient, "SUDO");

  // STEP6: create a OKXSmartContractAccount with the publicClient and owner
  // @ts-ignore
  const smartAccount = new OKXSmartContractAccount({
    publicClient: publicClient,
    owner: owner,
  });

  // STEP7: create a new account with index specified. You can use any number you like.
  // now we only get the new account information without deploy it on chain.
  await smartAccount.generateNewAccountInfo(toBigInt(1325));

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
      smartAccount.getAccountInfos()[0].accountAddress,
      // this is a ROLE message, will be useful in the smart-account v4
      "0xDEADBEEF" as Hex,
      {
        callData: simpleTransferCalldata,
      }
    );

  // transfer 0.1ETH to the address
  await walletClient.sendTransaction({
    to: preparedUserOperation.sender,
    value: parseEther("0.1"),
    account: walletAddress,
    data: "0x",
    chain: hardhat,
  });

  const { request } = await smartAccount.sendUserOperationSimulation(
    walletAddress,
    preparedUserOperation
  );

  // check balance
  const balance = await publicClient.getBalance({
    address: "0x0000000000000000000000000000000000000001",
  });
  console.log(balance);

  // STEP10: execute.
  await walletClient.writeContract(request);

  // we support batch generate new account information.
  const batchNewInfos = await smartAccount.batchGenerateNewAccountInfo(10, []);
}

smokeTest();
