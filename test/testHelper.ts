import {createWalletClient, Hex, http, WalletClient} from "viem";
import {privateKeyToAccount} from "viem/accounts";
import {hardhat} from "viem/chains";
import {WalletClientSigner} from "../packages/plugins/signers/walletClientSigner";
import {configuration} from "../configuration";

export const paymasterSigner: WalletClient = createWalletClient({
    account: privateKeyToAccount(<Hex>configuration.paymaster.privateKey),
    chain: hardhat,
    transport: http(),
})

export const paymasterWalletConnectSigner= new WalletClientSigner(paymasterSigner, "admin")