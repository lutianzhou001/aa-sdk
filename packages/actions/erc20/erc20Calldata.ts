import { maxUint256, erc20Abi, encodeFunctionData, Address, Hex } from "viem";

export function approveCalldata(to: Address, amount: bigint = maxUint256): Hex {
  return encodeFunctionData({
    abi: erc20Abi,
    functionName: "approve",
    args: [to, amount],
  });
}

export function transferCalldata(to: Address, amount: bigint = BigInt(0)): Hex {
  return encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [to, amount],
  });
}
