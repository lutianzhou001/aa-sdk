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
import { OKXSmartAccountSigner } from "../plugins/types";
import { OKXSmartAccount } from "./types";
import { initializeAccountABI } from "../../abis/initializeAccount.abi";
import { accountFactoryV3ABI } from "../../abis/accountFactoryV3.abi";
import { getConfiguration, predictDeterministicAddress } from "../common/utils";
import { isSmartAccountDeployed } from "permissionless";

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
  TSigner extends OKXSmartAccountSigner = OKXSmartAccountSigner,
>(
  signer: TSigner,
  name: string,
  version: string,
  index: bigint = BigInt(0),
  executions: Hex[] = [],
): Promise<OKXSmartAccount<TSigner>> {
  const initializeData = encodeAbiParameters(initializeAccountABI[0].inputs, [
    await signer.getSubject(),
    process.env.ECDSA_VALIDATOR_TEMPLATE_ADDRESS,
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
          process.env.SMART_ACCOUNT_TEMPLATE_ADDRESS,
          initializeAccountData,
          index,
        ],
      }),
    ],
  );

  const accountAddress: Address = (await signer.publicClient.readContract({
    address: process.env.FACTORY_ADDRESS as Address,
    abi: accountFactoryV3ABI,
    functionName: "computeAddress",
    args: [zeroAddress, initializeAccountData, index],
  })) as Address;

  const authenticationManagerAddress: Address = predictDeterministicAddress(
    process.env.AUTHENTICATION_MANAGER_TEMPLATE as Address,
    keccak256(toHex(version)) as Hex,
    accountAddress,
  );

  const defaultValidator: Address = predictDeterministicAddress(
    signer.signerTemplate,
    keccak256(encodePacked(["bytes"], [await signer.getSubject()])),
    authenticationManagerAddress,
  );

  return {
    signer: signer,
    accountAddress: accountAddress,
    isDeployed: await isSmartAccountDeployed(
      signer.publicClient,
      accountAddress,
    ),
    nonceKey: defaultValidator as Hex,
    authenticationManagerAddress: authenticationManagerAddress,
    initCode: initCode,
    version: version,
    name: name,
  };
}
