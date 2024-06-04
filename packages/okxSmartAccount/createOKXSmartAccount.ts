import {
  Address,
  encodeAbiParameters,
  encodeFunctionData,
  encodePacked,
  type Hash,
  Hex,
  keccak256,
  toHex,
  zeroAddress,
} from "viem";
import { smartAccountV3ABI } from "../../abis/smartAccountV3.abi";
import { configuration } from "../../configuration";
import { ERC4337SmartAccountSigner } from "../plugins/types";
import { OKXSmartAccount } from "./types";
import { initializeAccountABI } from "../../abis/initializeAccount.abi";
import { accountFactoryV3ABI } from "../../abis/accountFactoryV3.abi";
import { getConfiguration, predictDeterministicAddress } from "../common/utils";
import { isSmartAccountDeployed } from "permissionless";
import { authenticationManagerABI } from "../../abis/authenticationManager.abi";

/**
 * create a okxSmartAccount
 *
 * @param signer the signer(ERC4337SmartAccountSigner) of the account
 * @param name the name of the account, if the name is not compatible with the onchain smart account template, it will throw a new error.
 * @param version the version of the account, if the version is not compatible with the onchain smart account template, it will throw a new error.
 * @param index the index of the account, in default, it will be 0
 * @param executions the executions of the account, in default, it will be []
 */
export async function createOKXSmartAccount<
  TSigner extends ERC4337SmartAccountSigner = ERC4337SmartAccountSigner,
>(
  signer: TSigner,
  name: string,
  version: string,
  index: bigint = BigInt(0),
  executions: Hex[] = [],
): Promise<OKXSmartAccount<TSigner>> {
  const initializeData = encodeAbiParameters(initializeAccountABI[0].inputs, [
    await signer.getSubject(),
    configuration.v3.ECDSA_VALIDATOR_TEMPLATE_ADDRESS,
    executions,
  ]);

  const initializeAccountData = encodeFunctionData({
    abi: smartAccountV3ABI,
    functionName: "initializeAccount",
    args: [initializeData],
  });

  const initCode = encodePacked(
    ["address", "bytes"],
    [
      getConfiguration(version).factoryAddress,
      encodeFunctionData({
        abi: accountFactoryV3ABI,
        functionName: "createAccount",
        args: [
          configuration.v3.SMART_ACCOUNT_TEMPLATE_ADDRESS,
          initializeAccountData,
          index,
        ],
      }),
    ],
  );

  const salt: Hash = keccak256(
    encodePacked(["bytes", "uint256"], [initializeAccountData, index]),
  );

  const accountAddress: Address = (await signer.publicClient.readContract({
    address: configuration.v3.FACTORY_ADDRESS,
    abi: accountFactoryV3ABI,
    functionName: "computeAddress",
    args: [zeroAddress, initializeAccountData, index],
  })) as Address;

  const authenticationManagerAddress: Address = predictDeterministicAddress(
    configuration.v3.AUTHENTICATION_MANAGER_TEMPLATE,
    configuration.v3.VERSION_HASH,
    accountAddress,
  );

  const defaultValidator: Address = predictDeterministicAddress(
    signer.signerTemplate,
    keccak256(encodePacked(["bytes"], [await signer.getSubject()])),
    authenticationManagerAddress,
  );

  const nameHash = await signer.publicClient.readContract({
    address: configuration.v3.AUTHENTICATION_MANAGER_TEMPLATE,
    abi: authenticationManagerABI,
    functionName: "HASH_NAME",
    args: [],
  });

  const versionHash = await signer.publicClient.readContract({
    address: configuration.v3.AUTHENTICATION_MANAGER_TEMPLATE,
    abi: authenticationManagerABI,
    functionName: "HASH_VERSION",
    args: [],
  });

  if (
    keccak256(toHex(name)) != nameHash ||
    keccak256(toHex(version)) != versionHash
  ) {
    throw new Error(
      "name or version hash not match onchain version, pls check",
    );
  }

  return {
    signer: signer,
    accountAddress: accountAddress,
    isDeployed: await isSmartAccountDeployed(
      signer.publicClient,
      accountAddress,
    ),
    nonceKey: defaultValidator as Hex,
    authenticationManagerAddress: authenticationManagerAddress,
    receipts: [],
    initCode: initCode,
    version: version,
    name: name,
  };
}
