import {
  http,
  Hex,
  type WalletClient,
  createWalletClient,
  keccak256,
  encodePacked,
} from "viem";
import { type Account, privateKeyToAccount } from "viem/accounts";
import { type Chain, goerli } from "viem/chains";
import * as allChains from "viem/chains";
import { Address } from "abitype";
import { BaseSmartAccountError } from "../error/constants";

export async function getEoaWalletClient(): Promise<WalletClient> {
  const rpcUrl = process.env.RPC_URL;
  if (!rpcUrl) {
    throw new BaseSmartAccountError(
      "BaseSmartAccountError",
      "RPC_URL environment variable not set",
    );
  }

  return createWalletClient({
    account: await getPrivateKeyAccount(),
    chain: getTestingChain(),
    transport: http(rpcUrl),
  });
}

export async function getPrivateKeyAccount(): Promise<Account> {
  const privateKey = process.env.TEST_PRIVATE_KEY;
  if (!privateKey) {
    throw new BaseSmartAccountError(
      "BaseSmartAccountError",
      "TEST_PRIVATE_KEY environment variable not set",
    );
  }
  return privateKeyToAccount(privateKey as Hex);
}

export function getTestingChain(): Chain {
  const testChainId = process.env.TEST_CHAIN_ID;
  const chainId = testChainId ? parseInt(testChainId, 10) : goerli.id;
  const chain = Object.values(allChains).find((c) => c.id === chainId);
  if (!chain) {
    throw new BaseSmartAccountError(
      "BaseSmartAccountError",
      `Chain with id ${chainId} not found`,
    );
  }
  return chain;
}

/**
 * Computes the address of a clone deployed using @openzeppelin/contracts/proxy/Clones.sol
 *
 * @param implementation the address of the master contract
 * @param salt integer or string value of salt
 * @param deployer the address of the factory contract
 */
export function predictDeterministicAddress(
  implementation: Address,
  salt: Hex,
  deployer: Address,
): Address {
  let assembly = `3d602d80600a3d3981f3363d3d373d3d3d363d73${implementation
    .toLowerCase()
    .slice(2)}5af43d82803e903d91602b57fd5bf3ff${deployer
    .toLowerCase()
    .slice(2)}${String(salt).slice(2) as Hex}`;
  assembly += keccak256(
    encodePacked(["bytes"], [("0x" + assembly.slice(0, 110)) as Hex]),
  ).slice(2);
  const address = keccak256(
    encodePacked(["bytes"], [("0x" + assembly.slice(110, 280)) as Hex]),
  ).slice(-40);
  return ("0x" + address) as Address;
}
