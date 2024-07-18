import { Address, Hex, hexToBigInt } from "viem";
import { arbitrum } from "viem/chains";
import { remoteSigner } from "../packages/plugins";
import { OKXSmartAccountSDK } from "../packages/okxSmartAccount/OKXSmartContractAccount";
import { JWT_VALIDATOR_TEMPLATE } from "../packages/common/constants";
import { convertToHex } from "../packages/common";
import { SigType } from "../packages/okxSmartAccount/types";

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
      signer: new remoteSigner(
        "0x313031323432353730323934353239343330393038",
        JWT_VALIDATOR_TEMPLATE as Address,
      ),
      index: 0n,
    });

  const v = await okxSmartContractAccount.buildUserOp({
    args: "0x",
    sigType: SigType.EIP712,
    sigTime: hexToBigInt("0x69696969" as Hex),
    uopAndPaymasterOverrides: {
      callGasLimit: 900000n,
      verificationGasLimit: 900000n,
      preVerificationGas: 900000n,
      maxFeePerGas: 10000000n,
      maxPriorityFeePerGas: 10000000n,
    },
  });
  console.log(convertToHex(v));

  const signedUOPHash = await okxSmartContractAccount.getUOPSignedHash(
    SigType.EIP712,
    v,
  );
  console.log(signedUOPHash);
}

smoke_remoteSigner().then(() =>
  console.log("successfully make a smoke_walletClient test"),
);
