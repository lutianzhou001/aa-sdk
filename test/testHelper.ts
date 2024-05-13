import { createWalletClient, Hex, http, WalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hardhat } from "viem/chains";
import { configuration } from "../configuration";

export const paymasterClient: WalletClient = createWalletClient({
  account: privateKeyToAccount(<Hex>configuration.paymaster.privateKey),
  chain: hardhat,
  transport: http(),
});
