import { walletClientAASigner } from "../../packages/plugins/signers/walletClientAASigner";
import {
  Address,
  Chain,
  createPublicClient,
  createWalletClient,
  Hex,
  http,
  isAddress,
  publicActions,
  PublicClient,
  WalletClient,
  zeroAddress,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { polygon } from "viem/chains";
import { describe, expect, it } from "vitest";
import { LocalAccountAASigner } from "../../packages/plugins/signers/localAccountAASigner";
import { generatePrivateKey } from "viem/accounts";
import {
  givenConnectedProvider,
  givenConnectedProviderWithPaymaster,
} from "../utils";

describe("OKX Smart Account EntryPoint v7 Tests", () => {
  const walletClient: WalletClient = createWalletClient({
    account: privateKeyToAccount(process.env.WALLET_CLIENT_PRIVATE_KEY as Hex),
    chain: polygon,
    transport: http(),
    // "https://arb-mainnet.g.alchemy.com/v2/47SxM1HQgXWeKVL9rYVS6A4LZ8B_Ktk0",
  }).extend(publicActions);

  const chain: Chain = polygon;
  const signer = new walletClientAASigner(walletClient);

  it("should successfully get counterfactual address", async () => {
    const provider = await givenConnectedProvider({ signer, chain });
    expect(await provider.getAddress()).toMatchInlineSnapshot(
      `"0xfc386Ff841DeB3879446808A90307Ca0511B8676"`,
    );
  });

  it("should encode successfully", async () => {
    const provider = await givenConnectedProvider({ signer, chain });
    expect(
      await provider.encodeExecute({ to: zeroAddress, value: 1n, data: "0x" }),
    ).toMatchInlineSnapshot(
      `"0xe9ae5c5300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000003400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000"`,
    );
  });

  it("should encode batch successfully", async () => {
    const provider = await givenConnectedProvider({ signer, chain });
    expect(
      await provider.encodeExecute([
        { to: zeroAddress, value: 1n, data: "0x" },
        { to: zeroAddress, value: 2n, data: "0x" },
      ]),
    ).toMatchInlineSnapshot(
      `"0xe9ae5c5301000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000000"`,
    );
  });

  it("should build uop successfully(base)", async () => {
    const provider = await givenConnectedProvider({ signer, chain });
    const buildObj = await provider.buildUserOp({
      args: { to: zeroAddress, value: 1n, data: "0x" },
    });
    expect(Number(buildObj.callGasLimit)).gte(0);
    expect(Number(buildObj.nonce)).gte(0);
    expect(buildObj.callData).equal(
      "0xe9ae5c5300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000003400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000",
    );
    expect(Number(buildObj.verificationGasLimit)).gte(0);
    expect(Number(buildObj.maxFeePerGas)).gte(0);
    expect(Number(buildObj.maxPriorityFeePerGas)).gte(0);
    expect(buildObj.paymaster === undefined);
    expect(buildObj.paymasterVerificationGasLimit === undefined);
    expect(buildObj.paymasterData === undefined);
  });

  it("should override uop with some features", async () => {
    const provider = await givenConnectedProvider({ signer, chain });
    const buildObj = await provider.buildUserOp({
      args: { to: zeroAddress, value: 1n, data: "0x" },
      uopAndPaymasterOverrides: {
        callGasLimit: 100000n,
        verificationGasLimit: 100000n,
        preVerificationGas: 50000n,
        maxFeePerGas: 100000000000n,
        maxPriorityFeePerGas: 10000000000n,
      },
    });
    expect(Number(buildObj.callGasLimit)).equal(100000);
    expect(Number(buildObj.verificationGasLimit)).equal(100000);
    expect(Number(buildObj.preVerificationGas)).equal(50000);
    expect(Number(buildObj.maxFeePerGas)).equal(100000000000);
    expect(Number(buildObj.maxPriorityFeePerGas)).equal(10000000000);
  });

  it("should successfully override with the paymasters", async () => {
    const policyPaymasterAddress = "0x505bbf2e6f7fc45c2d42c54a2578e541bab676a7";
    const provider = await givenConnectedProviderWithPaymaster({
      signer,
      chain,
    });
    const buildObj = await provider.buildUserOp({
      args: { to: zeroAddress, value: 1n, data: "0x" },
      uopAndPaymasterOverrides: {
        paymasterAddress: policyPaymasterAddress,
        paymasterVerificationGasLimit: 100000n,
      },
    });
    expect(buildObj.paymaster).equal(policyPaymasterAddress);
    expect(Number(buildObj.paymasterVerificationGasLimit)).equal(100000);
  });

  it("should execute successfully", async () => {
    const provider = await givenConnectedProvider({ signer, chain });
    const result = await provider.sendTransaction({
      from: await provider.getAddress(),
      to: await provider.getAddress(),
      data: "0x",
    });
    expect(String(result).slice(0, 2)).equal("0x");
  }, 60000);

  it("should fail to execute if account address is not deployed and not correct", async () => {
    const accountAddress = zeroAddress;
    const provider = await givenConnectedProvider({
      signer,
      chain,
    });

    const uop = await provider.buildUserOpFromTx({
      from: await provider.getAddress(),
      to: await provider.getAddress(),
      data: "0x",
    });

    uop.sender = accountAddress;
    await expect(provider.sendUserOp(uop)).rejects.toThrowError();
  });

  it("should get counterfactual for undeployed account", async () => {
    const signer =
      LocalAccountAASigner.privateKeyToAccountSigner(generatePrivateKey());
    const provider = await givenConnectedProvider({ signer, chain });

    const address = await provider.getAddress();
    expect(isAddress(address)).toBe(true);
  });

  //
  // it("should correctly handle multiplier overrides for buildUserOperation", async () => {
  //     const provider = await givenConnectedProvider({
  //         signer,
  //         chain,
  //     });
  //
  //     const structPromise = provider.buildUserOperation({
  //         uo: {
  //             target: provider.getAddress(),
  //             data: "0x",
  //         },
  //     });
  //
  //     await expect(structPromise).resolves.not.toThrowError();
  //
  //     const providerWithFeeOptions = await givenConnectedProvider({
  //         signer,
  //         chain,
  //         feeOptions: {
  //             preVerificationGas: { multiplier: 2 },
  //         },
  //     });
  //
  //     const structWithFeeOptionsPromise =
  //         providerWithFeeOptions.buildUserOperation({
  //             uo: {
  //                 target: provider.getAddress(),
  //                 data: "0x",
  //             },
  //         });
  //     await expect(structWithFeeOptionsPromise).resolves.not.toThrowError();
  //
  //     const [struct, structWithFeeOptions] = await Promise.all([
  //         structPromise,
  //         structWithFeeOptionsPromise,
  //     ]);
  //
  //     const preVerificationGas =
  //         typeof struct.preVerificationGas === "string"
  //             ? fromHex(struct.preVerificationGas as Hex, "bigint")
  //             : struct.preVerificationGas;
  //     const preVerificationGasWithFeeOptions =
  //         typeof structWithFeeOptions.preVerificationGas === "string"
  //             ? fromHex(structWithFeeOptions.preVerificationGas as Hex, "bigint")
  //             : structWithFeeOptions.preVerificationGas;
  //
  //     expect(preVerificationGasWithFeeOptions).toBeGreaterThan(
  //         preVerificationGas!
  //     );
  // }, 60000);
  //
});
