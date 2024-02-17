import { maxUint256, erc20Abi, encodeFunctionData, Address } from "viem";

function approveCalldata(to: Address, amount: bigint = maxUint256) {
  return encodeFunctionData({
    abi: erc20Abi,
    functionName: "approve",
    args: [to, amount],
  });
}

function transferCalldata(to: Address, amount: bigint = BigInt(0)) {
  return encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [to, amount],
  });
}
