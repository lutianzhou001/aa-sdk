import {
  Address,
  Chain,
  Client,
  encodePacked,
  PublicClient,
  Transport,
  WalletClient,
} from "viem";
import {
  ERC4337SmartAccountSigner,
  UserOperation0_7,
} from "../../plugins/types";
import { Account, SupportedPayMaster } from "../types";
import { IPaymasterManager } from "./IPaymasterManager.interface";
import { CreatePaymasterParameters } from "./createPaymasterManager.dto";
import { getChainId } from "viem/actions";
import axios from "axios";
import { UserOperation } from "permissionless/types/userOperation";
import { GeneratePaymasterSignatureType } from "../dto/generateUserOperationAndPackedParams.dto";
import { configuration } from "../../../configuration";

export class PaymasterManager<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
  TOwner extends ERC4337SmartAccountSigner = ERC4337SmartAccountSigner,
> implements IPaymasterManager
{
  protected entryPointAddress: Address;
  protected walletClient: WalletClient;
  protected baseUrl: string;
  protected version: string;
  constructor(args: CreatePaymasterParameters<TTransport, TChain>) {
    this.entryPointAddress = args.entryPointAddress;
    this.walletClient = args.walletClient as WalletClient;
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
        String(await getChainId(this.walletClient as Client)),
      headers: {
        "Content-Type": "application/json",
        Cookie: "locale=en-US",
      },
    };

    return (await axios.request(config)).data.result;
  }

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
          String(await getChainId(this.walletClient as Client)) +
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
      // gen free gas mode pm data
      // encodePacked(["address", "uint128", "uint128", "uint8", "uint64", "uint256"],[configuration.paymaster.policyPaymaster as Address, 500000n, 500000n, 0n, 0n, await this.getSigTime()],
      // we use our private key to sign that.
      throw new Error("Unsupported version");
    }
  }
}

// function signPmData(
//     uint256 bundlerKey,
//     PackedUserOperation memory userOp,
//     address paymaster,
//     bytes memory additionalData
// ) public view
// returns (PackedUserOperation memory)
// {
//   // Generate hash for the PackedUserOperation
//   bytes32 hash = getHash(userOp, userOp.sender, paymaster, additionalData);
//   bytes32 ethSignedHash = hash.toEthSignedMessageHash();
//
//   // Sign the hash
//   (uint8 v, bytes32 r, bytes32 s) = vm.sign(bundlerKey, ethSignedHash);
//   userOp.paymasterAndData = abi.encodePacked(userOp.paymasterAndData, r, s, v);
//
//   return userOp;
// }
