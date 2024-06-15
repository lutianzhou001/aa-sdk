import {
  createWalletClient,
  encodePacked,
  Hex,
  http,
  keccak256,
  PublicClient,
  toHex,
  type WalletClient,
} from "viem";
import { type Account, privateKeyToAccount } from "viem/accounts";
import * as allChains from "viem/chains";
import { type Chain, goerli } from "viem/chains";
import { Address } from "abitype";
import { BaseError } from "./error";
import { ExecutionMode } from "../okxSmartAccount/utils/types";
import { configuration } from "../../configuration";
import axios from "axios";
import { ENTRYPOINT_ADDRESS_V07 } from "permissionless";

export function getConfiguration(version: string): {
  entryPointAddress: Address;
  factoryAddress: Address;
  name: string;
} {
  return {
    entryPointAddress: ENTRYPOINT_ADDRESS_V07,
    factoryAddress: process.env.FACTORY_ADDRESS as Address,
    name: process.env.NAME as string,
  };
}

export function compileBigInt(
  a: bigint,
  b: bigint,
): `0x${string & { length: 64 }}` {
  const res =
    "0x" +
    toHex(bigIntToBytes16(a)).slice(2, 34) +
    toHex(bigIntToBytes16(b)).slice(2, 34);
  if (res.slice(2).length != 64) {
    throw new Error(
      `Resulting string length must be 64, but got ${res.length - 2}`,
    );
  }
  return res as `0x${string & { length: 64 }}`;
}

export function bigIntToBytes16(bigInt: bigint): Uint8Array {
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[15 - i] = Number((bigInt >> (8n * BigInt(i))) & 0xffn);
  }
  return bytes;
}

export function convertToHex(value: object): any {
  const result: { [key: string]: any } = {};
  for (const [key, val] of Object.entries(value)) {
    if (typeof val == "bigint") {
      result[key] = toHex(val);
    } else {
      result[key] = val;
    }
  }
  return result;
}

export function compileMode(isBatch: boolean, mode: ExecutionMode) {
  const callType = isBatch ? "0x01" : "0x00";
  const execType = mode.try ? "01" : "00";
  const modeSelector = mode.allowFailedExecution
    ? keccak256(
        new TextEncoder().encode("default.mode.allow_failed_execution"),
      ).slice(2, 10)
    : "00000000";
  const modeParams =
    mode.modeParams ?? "00000000000000000000000000000000000000000000";
  return callType + execType + "00000000" + modeSelector + modeParams;
}

export async function getSigTime(publicClient: PublicClient) {
  const block = await publicClient.getBlock();
  // add 3 days.
  return BigInt(block.timestamp) + BigInt(86400 * 3);
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

export async function callClient(url: string, data: string) {
  const config = {
    method: "post",
    maxBodyLength: Infinity,
    url: url,
    headers: {
      "Content-Type": "application/json",
      Cookie: "locale=en-US",
    },
    data: data,
  };
  return await axios.request(config);
}
