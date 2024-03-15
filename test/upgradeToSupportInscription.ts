import {
    createWalletClient,
    encodeFunctionData, hexToBigInt,
    http, keccak256,
    publicActions,
    WalletClient, zeroAddress
} from "viem";
import {privateKeyToAccount} from "viem/accounts";
import {arbitrum} from "viem/chains";
import {OKXSmartContractAccount} from "../packages/okxSmartAccount/OKXSmartAccount";
import {encodeUpgrade} from "../packages/actions/upgrades/upgradeCalldata";
import {UserOperation} from "permissionless/types/userOperation";
import {UserOperationSimulationResponse} from "../packages/okxSmartAccount/types";
import {smartAccountV2WithInscriptionSupportedABI} from "../abis/smartAccountV2WithInscriptionSupported.abi";
import {configuration} from "../configuration";
import {EntryPointABI} from "../abis/EntryPoint.abi";

async function transferEthsTest() {
    const walletClient: WalletClient = createWalletClient({
        account: privateKeyToAccount(
            // NOTION, this privateKey is ONLY FOR TESTING, DO NOT USE IT IN PRODUCTION
            "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
        ),
        chain: arbitrum,
        transport: http(),
    }).extend(publicActions);

    const smartAccount = new OKXSmartContractAccount({
        walletClient: walletClient,
        version: "2.0.0",
        // specify your baseUrl here. baseUrl : "https://www.okx.com/priapi/v5/wallet/smart-account/"
    });

    await smartAccount.accountManager.createNewAccount(0n, []);

    // const upgradeCalldata = await smartAccount.encodeExecute({
    //     to: (await smartAccount.accountManager.getAccounts())[0].accountAddress,
    //     data: encodeUpgrade("0x549b747173CaBbA10cDfD2F5B5355EDBF0fE627f"),
    //     value: BigInt(0),
    //     callType: "call",
    // });
    //
    // const preparedUserOperation: UserOperation =
    //     await smartAccount.generateUserOperationAndPacked({
    //         uop: {
    //             sender: (await smartAccount.accountManager.getAccounts())[0].accountAddress,
    //             callData: upgradeCalldata,
    //         },
    //         // paymaster: {
    //         //     paymaster: "0xfb4f3f12258976395b34304e2bfd76d15e0af44a",
    //         //     token: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
    //         // },
    //     });
    //
    // const userOperationSimulationResponse: UserOperationSimulationResponse = await smartAccount.simulator.sendUserOperationSimulation(
    //     preparedUserOperation
    // );
    //
    // const userOperationRes = await smartAccount.sendUserOperationByOKXBundler(
    //     preparedUserOperation
    // );

    const transferEthsInscription = encodeFunctionData({
        abi: smartAccountV2WithInscriptionSupportedABI,
        functionName: "ethsInscriptionTransfer",
        args: [zeroAddress, keccak256("0x1")],
    });

    const transferCalldata = encodeFunctionData({
        abi: smartAccountV2WithInscriptionSupportedABI,
        functionName: "execTransactionFromEntrypoint",
        args: [(await smartAccount.accountManager.getAccounts())[0].accountAddress, 0, transferEthsInscription],
    });

    const preparedUserOperation2: UserOperation =
        await smartAccount.generateUserOperationAndPacked({
            uop: {
                sender: (await smartAccount.accountManager.getAccounts())[0].accountAddress,
                callData: transferCalldata,
                callGasLimit: "0xbbbb" as any,
                verificationGasLimit: "0xcccc" as any,
                preVerificationGas: hexToBigInt("0x666666"),
            },
        });

    const acc = privateKeyToAccount(
        // NOTION, this privateKey is ONLY FOR TESTING, DO NOT USE IT IN PRODUCTION
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
    )

    await smartAccount.simulator.sendUserOperationSimulation(preparedUserOperation2, acc.address);

    await walletClient.writeContract({
        address: configuration.entryPoint.v0_6_0,
        abi: EntryPointABI,
        functionName: 'handleOps',
        args: [[preparedUserOperation2], acc.address],
        account: acc,
        chain: arbitrum
    })
}

transferEthsTest();

