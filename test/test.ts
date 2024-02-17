import { privateKeyToAccount } from "viem/accounts";
import {
  createPublicClient,
  createWalletClient,
  Hex,
  http,
  PublicClient,
  WalletClient,
} from "viem";
import { hardhat } from "viem/chains";
import { walletClientSigner } from "../packages/plugins/signers/walletClientSigner";
import { OKXSmartContractAccount } from "../packages/accounts/OKXSmartAccount";
import { toBigInt } from "ethers";
import { Address } from "abitype";
import { UserOperation } from "permissionless/types/userOperation";

async function smokeTest() {
  const account = privateKeyToAccount(
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
  );

  const walletClient: WalletClient = createWalletClient({
    account,
    chain: hardhat,
    transport: http("http://127.0.0.1:8545"),
  });

  // @ts-ignore
  const publicClient: PublicClient = createPublicClient({
    chain: hardhat,
    transport: http("http://127.0.0.1:8545"),
  });

  // first convert the client to the validator
  const owner = new walletClientSigner(walletClient, "SUDO");

  // now convert the client to the smart account
  // @ts-ignore
  const smartAccount = new OKXSmartContractAccount({
    publicClient: publicClient,
    owner: owner,
  });

  await smartAccount.generateNewAccountInfo(toBigInt(2));

  const simpleTransferCalldata = await smartAccount.encodeExecute({
    to: "0x0000000000000000000000000000000000000001" as Address,
    value: BigInt(1000),
    data: "0x",
    callType: "call",
  });

  // const u = await smartAccount.getNonce(
  //   "0x",
  //   smartAccount.getInitializationInfos()[0].accountAddress,
  //   smartAccount.getInitializationInfos()[0].accountAddress
  // );
  // console.log(u);

  const preparedUserOperation: UserOperation =
    await smartAccount.generateUserOperationAndPacked(
      "EIP191",
      smartAccount.getAccountInfos()[0].accountAddress,
      "0xDEADBEEF" as Hex,
      {
        callData: simpleTransferCalldata,
      }
    );

  const added = await smartAccount.batchGenerateNewAccountInfo(10, []);

  // only for test case, in real transaction, we don't deploy the samrt account unless the user has a real userop.
  // const accountFactory = getContract({
  //     abi: accountFactoryV3ABI,
  //     address: "0xC3fCA52FFec158948C8E88D43f59eAc0587dA7CB" as Address,
  //     client: walletClient as Client
  // });
  //
  // await accountFactory.write.createAccount([configuration.SMART_ACCOUNT_TEMPLATE_ADDRESS,u.initCode,u.index])
}

smokeTest();
