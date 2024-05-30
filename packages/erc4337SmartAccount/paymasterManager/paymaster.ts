import {
  Address,
  Chain,
  encodeAbiParameters,
  Hex,
  keccak256,
  padHex,
  toHex,
  Transport,
} from "viem";
import { ERC4337SmartAccountSigner } from "../../plugins/types";
import { Account, RawPaymaster, Runtime, SupportedPayMaster } from "../types";
import axios from "axios";
import { configuration, networkConfigurations } from "../../../configuration";
import { ERC4337SmartAccount } from "../ERC4337SmartAccount";
import { callClient, convertToHex } from "../../common/utils";
import { ENTRYPOINT_ADDRESS_V07 } from "permissionless";
import { getChainId } from "viem/actions";
import { paymasterSigner } from "../../../test/testHelper";
import { walletClientToERC4337SmartAccountSigner } from "../../plugins/signers/walletClientToSmartAccountSigner";

export function paymasterActions<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
  TSigner extends ERC4337SmartAccountSigner = ERC4337SmartAccountSigner,
>(smartAccount: ERC4337SmartAccount<TTransport, TChain, TSigner>) {
  return {
    usePaymaster: (usePaymasterParams: UsePaymasterParams) =>
      usePaymaster(smartAccount, usePaymasterParams),
    getSupportedPaymasters: () => getSupportedPaymasters(smartAccount),
  };
}

export type UsePaymasterParams = {
  paymasterAddress: Address;
  tokenAddress?: Address;
  paymasterVerificationGasLimit?: bigint;
  paymasterPostOpGasLimit?: bigint;
};

export function usePaymaster<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
  TSigner extends ERC4337SmartAccountSigner = ERC4337SmartAccountSigner,
>(
  smartAccount: ERC4337SmartAccount<TTransport, TChain, TSigner>,
  usePaymasterParams: UsePaymasterParams,
): ERC4337SmartAccount<TTransport, TChain, TSigner> {
  // some logic here
  smartAccount.runtime.rawPaymaster = {
    paymasterAddress: usePaymasterParams.paymasterAddress,
    paymasterToken: usePaymasterParams.tokenAddress,
    paymasterVerificationGasLimit:
      usePaymasterParams.paymasterVerificationGasLimit,
    paymasterPostOpGasLimit: usePaymasterParams.paymasterPostOpGasLimit,
  };
  return smartAccount;
}

export async function getSupportedPaymasters<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
  TSigner extends ERC4337SmartAccountSigner = ERC4337SmartAccountSigner,
>(
  smartAccount: ERC4337SmartAccount<TTransport, TChain, TSigner>,
): Promise<SupportedPayMaster[]> {
  const config = {
    method: "get",
    maxBodyLength: Infinity,
    url: smartAccount.paymasterUrl,
    headers: {
      "Content-Type": "application/json",
      Cookie: "locale=en-US",
    },
  };
  return (await axios.request(config)).data.result;
}

export async function generatePaymasterSignature<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
  TSigner extends ERC4337SmartAccountSigner = ERC4337SmartAccountSigner,
>(
  smartAccount: ERC4337SmartAccount<TTransport, TChain, TSigner>,
): Promise<void> {
  // query paymasterAndDataFrom the endpoint.
  if (!smartAccount.runtime.rawPaymaster) {
    throw new Error("raw paymaster not provided");
  }
  if (
    !smartAccount.runtime.packedUserOperation ||
    !smartAccount.runtime.userOperation
  ) {
    throw new Error("packedUserOperation not provided");
  }
  if (!smartAccount.runtime.account) {
    throw new Error("account not provided");
  }
  const sigTime = BigInt(
    "0x000000000000ffffffffffff0000000000000000000000000000000000000000",
  );
  let additionalData: Hex;
  if (smartAccount.runtime.rawPaymaster.paymasterToken) {
    // token paymaster
    additionalData = encodeAbiParameters(
      [
        {
          internalType: "uint256",
          name: "sigTime",
          type: "uint256",
        },
        {
          internalType: "uint64",
          name: "businessId",
          type: "uint64",
        },
        {
          components: [
            {
              internalType: "address",
              name: "token",
              type: "address",
            },
            {
              internalType: "uint256",
              name: "exchangeRate",
              type: "uint256",
            },
          ],
          internalType: "struct testabi.TokenData",
          name: "tokenData",
          type: "tuple",
        },
      ],
      [
        sigTime,
        0n,
        {
          token: smartAccount.runtime.rawPaymaster.paymasterToken,
          exchangeRate: configuration.paymaster.tokenExchange,
        },
      ],
    );
  } else {
    // free gas paymaster
    additionalData = encodeAbiParameters(
      [
        { name: "sigTime", type: "uint256" },
        { name: "businessId", type: "uint64" },
      ],
      [sigTime, 0n],
    );
  }
  const encodedData = encodeAbiParameters(
    [
      { name: "sender", type: "address" },
      { name: "nonce", type: "uint256" },
      { name: "initCodeHash", type: "bytes32" },
      { name: "callDataHash", type: "bytes32" },
      { name: "accountGasLimits", type: "uint256" },
      { name: "preVerificationGas", type: "uint256" },
      { name: "gasFees", type: "uint256" },
      { name: "chainId", type: "uint256" },
      { name: "caller", type: "address" },
      { name: "modeId", type: "uint8" },
      { name: "currentAddress", type: "address" },
      { name: "additionalData", type: "bytes" },
    ],
    [
      smartAccount.runtime.packedUserOperation.sender,
      smartAccount.runtime.packedUserOperation.nonce,
      keccak256(smartAccount.runtime.packedUserOperation.initCode),
      keccak256(smartAccount.runtime.packedUserOperation.callData),
      BigInt(smartAccount.runtime.packedUserOperation.accountGasLimits),
      smartAccount.runtime.packedUserOperation.preVerificationGas,
      BigInt(smartAccount.runtime.packedUserOperation.gasFees),
      BigInt(
        await getChainId(smartAccount.runtime.account.signer.publicClient),
      ),
      <Address>configuration.paymaster.policyPaymaster,
      0,
      <Address>configuration.paymaster.freeGasMode,
      additionalData,
    ],
  );
  const pmSignature = await (
    await walletClientToERC4337SmartAccountSigner(paymasterSigner)
  ).signMessage(keccak256(encodedData));
  // @ts-ignore
  const paymasterAndData = ((configuration.paymaster
    .policyPaymaster as Address) +
    padHex(
      toHex(
        smartAccount.runtime.rawPaymaster.paymasterVerificationGasLimit ??
          configuration.paymaster.paymasterVerificationGasLimit,
      ),
      { size: 16 },
    ).slice(2) +
    padHex(
      toHex(
        smartAccount.runtime.rawPaymaster.paymasterPostOpGasLimit ??
          configuration.paymaster.paymasterPostOpGasLimit,
      ),
      { size: 16 },
    ).slice(2) +
    padHex(toHex(smartAccount.runtime.rawPaymaster.paymasterToken ? 1 : 0), {
      size: 1,
    }).slice(2) +
    padHex(toHex(0), { size: 8 }).slice(2) +
    padHex(toHex(sigTime), { size: 32 }).slice(2) +
    (smartAccount.runtime.rawPaymaster.paymasterToken
      ? ((smartAccount.runtime.rawPaymaster.paymasterToken?.slice(2) +
          padHex(toHex(configuration.paymaster.tokenExchange), {
            size: 32,
          }).slice(2) +
          pmSignature.slice(2)) as Hex)
      : (pmSignature.slice(2) as Hex))) as Hex;
  smartAccount.runtime.userOperation.paymasterData = ("0x" +
    paymasterAndData.slice(106)) as Hex;
}

export async function getPaymasterAndData<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
  TSigner extends ERC4337SmartAccountSigner = ERC4337SmartAccountSigner,
>(
  smartAccount: ERC4337SmartAccount<TTransport, TChain, TSigner>,
): Promise<void> {
  if (
    !smartAccount.runtime.userOperation ||
    !smartAccount.runtime.packedUserOperation
  ) {
    throw new Error("uop not found");
  }
  // TODO: TO MAKE IT BETTER
  const payload = JSON.stringify({
    entryPoint: ENTRYPOINT_ADDRESS_V07,
    paymaster: smartAccount.runtime.userOperation.paymaster,
    uop: convertToHex(smartAccount.runtime.userOperation),
  });
  const gasEstimationRes = await callClient(
    networkConfigurations.base_url +
      "priapi/v5/wallet/smart-account/pm/42161/getPaymasterSignature",
    payload,
  );
  if (gasEstimationRes.data.error) {
    throw new Error(gasEstimationRes.data.error);
  }
  smartAccount.runtime.packedUserOperation.paymasterAndData = gasEstimationRes
    .data.result as Hex;
  smartAccount.runtime.userOperation.paymasterData = ("0x" +
    gasEstimationRes.data.result.slice(106)) as Hex;
}
