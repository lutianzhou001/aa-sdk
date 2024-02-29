import type {Address} from "abitype";
import {encodeFunctionData, Hex} from "viem";
import {smartAccountV2ABI} from "../../../abis/smartAccountV2.abi";

export function encodeUpgrade(upgradeToImplAddress: Address): Hex{
    return encodeFunctionData({
        abi: smartAccountV2ABI,
        functionName: "updateImplement",
        args: [
            upgradeToImplAddress,
        ],
    });
}