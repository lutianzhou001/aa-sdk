import { Address, zeroAddress } from "viem";
import { arbitrum } from "viem/chains";
import { remoteSigner } from "../packages/plugins";
import { OKXSmartAccountSDK } from "../packages/okxSmartAccount/OKXSmartContractAccount";
import { JWT_VALIDATOR_TEMPLATE } from "../packages/common/constants";

async function smoke_remoteSigner() {
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
      signer: new remoteSigner(zeroAddress, JWT_VALIDATOR_TEMPLATE as Address),
      index: 40n,
    });
}

smoke_remoteSigner().then(() =>
  console.log("successfully make a smoke_walletClient test"),
);
