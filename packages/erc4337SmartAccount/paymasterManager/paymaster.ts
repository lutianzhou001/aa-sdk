import {
  Address,
  Chain,
  Client,
  encodeAbiParameters,
  Hex,
  keccak256,
  padHex,
  PublicClient,
  toHex,
  Transport,
  WalletClient,
} from "viem";
import { UserOperation0_7 } from "../../plugins/types";
import { SupportedPayMaster } from "../types";
import { IPaymasterManager } from "./IPaymasterManager.interface";
import { CreatePaymasterParameters } from "./createPaymasterManager.dto";
import { getChainId } from "viem/actions";
import axios from "axios";
import { UserOperation } from "permissionless/types/userOperation";
import { GeneratePaymasterSignatureType } from "../dto/generateUserOperationAndPackedParams.dto";
import { configuration } from "../../../configuration";
import { getSigTime } from "../../common/utils";
import { paymasterWalletConnectSigner } from "../../../test/testHelper";

export class PaymasterManager<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
> implements IPaymasterManager
{
  protected entryPointAddress: Address;
  protected publicClient: PublicClient<TTransport, TChain>;
  protected baseUrl: string;
  protected version: string;
  constructor(args: CreatePaymasterParameters<TTransport, TChain>) {
    this.entryPointAddress = args.entryPointAddress;
    this.publicClient = args.publicClient;
    this.baseUrl = args.baseUrl;
    this.version = args.version;
  }

  async getSupportedPaymasters(): Promise<SupportedPayMaster[]> {
    const config = {
      method: "get",
      maxBodyLength: Infinity,
      url:
        this.baseUrl +
        "pm/supportedPaymasters?chainBizId=" +
        String(await getChainId(this.publicClient)),
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
  async generatePaymasterSignature(
    userOperation: UserOperation<"v0.6"> | UserOperation0_7,
    paymaster: GeneratePaymasterSignatureType,
  ): Promise<UserOperation<"v0.6"> | UserOperation0_7> {
    // query paymasterAndDataFrom the endpoint.
    if (this.version == "2.0.0") {
      const config = {
        method: "post",
        maxBodyLength: Infinity,
        url:
          this.baseUrl +
          "pm/" +
          String(await getChainId(this.publicClient)) +
          "/getPaymasterSignature",
        headers: {
          "Content-Type": "application/json",
          Cookie: "locale=en-US",
        },
        data: JSON.stringify({
          entryPoint: this.entryPointAddress,
          token: paymaster.token,
          paymaster: paymaster.paymaster,
          uop: userOperation,
        }),
      };
      const res = await axios.request(config);
      userOperation.paymasterAndData = res.data.result;
      return userOperation;
    } else {
      const userOperation_0_7 = userOperation as UserOperation0_7;
      const sigTime = BigInt(
        "0x000000000000ffffffffffff0000000000000000000000000000000000000000",
      );
      let additionalData: Hex;
      if (paymaster.token) {
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
              token: paymaster.token,
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
          userOperation_0_7.sender,
          userOperation_0_7.nonce,
          keccak256(userOperation_0_7.initCode),
          keccak256(userOperation_0_7.callData),
          BigInt(userOperation_0_7.accountGasLimits),
          userOperation_0_7.preVerificationGas,
          BigInt(userOperation_0_7.gasFees),
          BigInt(await getChainId(this.publicClient)),
          <Address>configuration.paymaster.policyPaymaster,
          additionalData,
        ],
      );
      const pmSignature = await paymasterWalletConnectSigner.signMessage(
        keccak256(encodedData),
      );
      userOperation.paymasterAndData = ((configuration.paymaster
        .policyPaymaster as Address) +
        padHex(
          toHex(
            paymaster.paymasterVerificationGasLimit ??
              configuration.paymaster.paymasterVerificationGasLimit,
          ),
          { size: 16 },
        ).slice(2) +
        padHex(
          toHex(
            paymaster.paymasterPostOpGasLimit ??
              configuration.paymaster.paymasterPostOpGasLimit,
          ),
          { size: 16 },
        ).slice(2) +
        padHex(toHex(paymaster.token ? 1 : 0), { size: 1 }).slice(2) +
        padHex(toHex(0), { size: 8 }).slice(2) +
        padHex(toHex(sigTime), { size: 32 }).slice(2) +
        (paymaster.token
          ? ((paymaster.token?.slice(2) +
              padHex(toHex(configuration.paymaster.tokenExchange), {
                size: 32,
              }).slice(2) +
              pmSignature.slice(2)) as Hex)
          : (pmSignature.slice(2) as Hex))) as Hex;
      return userOperation;
    }
  }
}
