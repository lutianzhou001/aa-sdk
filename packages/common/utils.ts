import { encodePacked, Hex, keccak256, PublicClient, toHex } from "viem";
import { Address } from "abitype";
import axios from "axios";
import { ExecutionModeOverrides } from "../okxSmartAccount/types";
import { configs } from "./constants";

export function bigIntToBytes16(bigInt: bigint): Uint8Array {
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[15 - i] = Number((bigInt >> (8n * BigInt(i))) & 0xffn);
  }
  return bytes;
}

export function convertToBigInt(value: object): any {
  const result: { [key: string]: any } = {};
  for (const [key, val] of Object.entries(value)) {
    if (
      typeof val == "string" &&
      val.startsWith("0x") &&
      [
        "nonce",
        "callGasLimit",
        "verificationGasLimit",
        "preVerificationGas",
        "maxFeePerGas",
        "maxPriorityFeePerGas",
        "paymasterVerificationGasLimit",
        "paymasterPostOpGasLimit",
      ].includes(key)
    ) {
      result[key] = BigInt(val);
    } else {
      result[key] = val;
    }
  }
  return result;
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

export function compileMode(isBatch: boolean, mode: ExecutionModeOverrides) {
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
    .slice(
      2,
    )}5af43d82803e903d91602b57fd5bf3ff${deployer.toLowerCase().slice(2)}${String(salt).slice(2) as Hex}`;
  assembly += keccak256(
    encodePacked(["bytes"], [("0x" + assembly.slice(0, 110)) as Hex]),
  ).slice(2);
  const address = keccak256(
    encodePacked(["bytes"], [("0x" + assembly.slice(110, 280)) as Hex]),
  ).slice(-40);
  return ("0x" + address) as Address;
}

export function cleanup(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map((item) => cleanup(item));
  } else if (typeof obj === "object" && obj !== null) {
    return Object.keys(obj).reduce((acc, key) => {
      const value = obj[key];
      if (value !== undefined) {
        acc[key] = cleanup(value);
      }
      return acc;
    }, {} as any);
  }
  return obj;
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
    data: JSON.stringify(JSON.parse(data)),
  };
  return await axios.request(config);
}

export const getConfig = (version: string) => {
  const config = configs.find((config) => config.version === version);
  if (!config) {
    throw new Error(`Configuration not found for version: ${version}`);
  }
  return config;
};

/**
 * Returns the max bigint in a list of bigints
 *
 * @param args a list of bigints to get the max of
 * @returns the max bigint in the list
 */
export const bigIntMax = (...args: bigint[]): bigint => {
  if (!args.length) {
    throw new Error("bigIntMax requires at least one argument");
  }

  return args.reduce((m, c) => (m > c ? m : c));
};
