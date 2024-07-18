import {createPublicClient, Hex, hexToBigInt, http,} from "viem";
import {arbitrum} from "viem/chains";
import {ERC4337SmartAccount} from "../packages/erc4337SmartAccount/ERC4337SmartAccount";
import {ExternalSigner} from "../packages/plugins/signers/externalSigner";
import {JWT_VALIDATOR_TEMPLATE} from "../dist/packages/common/constants";

async function remoteSignerTest() {
  console.log("this is the begin of a test")
  const client = createPublicClient({
    chain: arbitrum,
    transport: http(),
  })

  const owner = new ExternalSigner("signer", client as any, "0x313031323432353730323934353239343330393038", JWT_VALIDATOR_TEMPLATE)

  const smartAccount = new ERC4337SmartAccount({
    owner,
    // accounts: (!user && !address) ? [] : _.cloneDeep(_.concat(accounts, importedAccounts)),
    baseUrl: 'https://www.okx.com/priapi/v5/wallet/smart-account/',
    version: "3.0.0",
  })

  const v = await smartAccount.accountManager.createNewAccount(0n, []);

  const generated = await smartAccount.generateUserOperation({sigType : "EIP712", uop: {sender: "0x8e3d83375ACD5a96C7d5B53F73210651C79504a5", callData: "0x"}, _sigTime: hexToBigInt("0x69696969" as Hex)});
  console.log(generated);
}

remoteSignerTest().then(r => console.log("tested"));
