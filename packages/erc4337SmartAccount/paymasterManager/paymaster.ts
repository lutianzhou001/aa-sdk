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
import { Account, Runtime, SupportedPayMaster } from "../types";
import axios from "axios";
import { configuration, networkConfigurations } from "../../../configuration";
import { paymasterClient } from "../../../test/testHelper";
import { getChainId } from "viem/actions";
import { walletClientToERC4337SmartAccountSigner } from "../../plugins/signers/walletClientSigner";
import { PackedUserOperation } from "permissionless/types";
import { ERC4337SmartAccount } from "../ERC4337SmartAccount";
import { run } from "node:test";

export function paymasterActions<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
  TSigner extends ERC4337SmartAccountSigner = ERC4337SmartAccountSigner,
>(smartAccount: ERC4337SmartAccount<TTransport, TChain, TSigner>) {
  return {
    usePaymaster: (paymasterParams: UsePaymasterParams) =>
      usePaymaster(smartAccount),
    getSupportedPaymasters: () => getSupportedPaymasters(smartAccount),
  };
}

export type UsePaymasterParams = {
  paymasterAddress: Address;
  tokenAddress?: Address;
  paymasterVerificationGasLimit?: Hex;
  paymasterPostOpGasLimit?: Hex;
};

export async function usePaymaster<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
  TSigner extends ERC4337SmartAccountSigner = ERC4337SmartAccountSigner,
>(
  smartAccount: ERC4337SmartAccount<TTransport, TChain, TSigner>,
): Promise<SupportedPayMaster> {
  // some logic here
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

// freeGasPaymaster
// paymaster + paymasterVerificationGasLimit + postOpGasLimit + mod + businessId + sigTime + signature;
// tokenPaymaster
// paymaster + paymasterVerificationGasLimit + postOpGasLimit + mod + businessId + sigTime + token + exchangeRate + signature;
export async function generatePaymasterSignature<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
  TSigner extends ERC4337SmartAccountSigner = ERC4337SmartAccountSigner,
>(runtime: Runtime<TTransport, TChain, TSigner>): Promise<void> {
  // query paymasterAndDataFrom the endpoint.
  if (!runtime.account) {
    throw new Error("no account specified");
  }
  if (!runtime.rawPaymaster) {
    throw new Error("no paymaster specified");
  }
  const sigTime = BigInt(
    "0x000000000000ffffffffffff0000000000000000000000000000000000000000",
  );
  let additionalData: Hex;
  if (runtime.rawPaymaster?.paymasterToken) {
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
          token: runtime.rawPaymaster.paymasterToken,
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
      { name: "additionalData", type: "bytes" },
    ],
    [
      runtime.packedUserOperation.sender,
      runtime.packedUserOperation.nonce,
      keccak256(runtime.packedUserOperation.initCode),
      keccak256(runtime.packedUserOperation.callData),
      BigInt(runtime.packedUserOperation.accountGasLimits),
      runtime.packedUserOperation.preVerificationGas,
      BigInt(runtime.packedUserOperation.gasFees),
      BigInt(await getChainId(runtime.account.signer.publicClient)),
      <Address>configuration.paymaster.policyPaymaster,
      additionalData,
    ],
  );
  const paymasterWalletConnectSigner =
    await walletClientToERC4337SmartAccountSigner(paymasterClient);
  const pmSignature = await paymasterWalletConnectSigner.signMessage(
    keccak256(encodedData),
  );
  runtime.userOperation.paymasterData = ((configuration.paymaster
    .policyPaymaster as Address) +
    padHex(
      toHex(
        runtime?.rawPaymaster?.paymasterVerificationGasLimit ??
          configuration.paymaster.paymasterVerificationGasLimit,
      ),
      { size: 16 },
    ).slice(2) +
    padHex(
      toHex(
        runtime?.rawPaymaster?.paymasterPostOpGasLimit ??
          configuration.paymaster.paymasterPostOpGasLimit,
      ),
      { size: 16 },
    ).slice(2) +
    padHex(toHex(runtime.rawPaymaster?.paymasterToken ? 1 : 0), {
      size: 1,
    }).slice(2) +
    padHex(toHex(0), { size: 8 }).slice(2) +
    padHex(toHex(sigTime), { size: 32 }).slice(2) +
    (runtime.rawPaymaster?.paymasterToken
      ? ((runtime.rawPaymaster.paymasterToken.slice(2) +
          padHex(toHex(configuration.paymaster.tokenExchange), {
            size: 32,
          }).slice(2) +
          pmSignature.slice(2)) as Hex)
      : (pmSignature.slice(2) as Hex))) as Hex;
}
