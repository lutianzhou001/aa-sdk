// // Import the required modules.
// import { createBundlerClient } from "permissionless";
// import { sepolia } from "viem/chains";
// import { http } from "viem";
//
// async function main() {
//   // Create the required clients.
//   const bundlerClient = createBundlerClient({
//     chain: sepolia,
//     transport: http(
//       "https://www.okx.com/priapi/v5/wallet/smart-account/mp/137/"
//     ), // Use any bundler url
//   });
//
//   const u = await bundlerClient.getUserOperationByHash();
// }
//
// main();
