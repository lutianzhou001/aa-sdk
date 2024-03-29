import { Address, Hex} from "viem";

export const configuration = {
  bundler: {
    testBundler: "0x9b4b4c715dd9b3b8f39b8da57fe1beee5da5e25e" as Address
  },
  entryPoint: {
    localhost: "0x5c8b393F683C87267871e218a40a35e61dd90a60" as Address,
    v0_6_0: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789" as Address,
    v0_7_0: "0x0000000071727De22E5E9d8BAf0edAc6f37da032" as Address,
    test: "0x0000000071727De22E5E9d8BAf0edAc6f37da032" as Address
  },
  v3: {
    NAME: "SmartAccount",
    VERSION: "3.0.0",
    VERSION_HASH:
      "0xd7a1ce683065975771bedf401ecab037f4f4c62cc51fefdc8b39dd246ff0343a" as Hex,
    SMART_ACCOUNT_PROXY_CODE_HASH: "0x6cc6baf8bd20144fe3e263f264c64f2fa94217cd19a7db1f707225f2616d4506" as Hex,
    ECDSA_VALIDATOR_TEMPLATE_ADDRESS: process.env.ECDSA_VALIDATOR_TEMPLATE_ADDRESS as Address ?? "0xB661dF5d3f7Dfb728784dABA14c055a026502a5D" as Address,
    SMART_ACCOUNT_TEMPLATE_ADDRESS: process.env.SMART_ACCOUNT_TEMPLATE_ADDRESS as Address ?? "0xe6604f547C6f31839802393E5C066a9017df7bEd" as Address,
    FACTORY_ADDRESS: process.env.FACTORY_ADDRESS as Address ?? "0xcAa350921D949f30BB9C21dcf34A9Fd486Ba537D" as Address,
    AUTHENTICATION_MANAGER_TEMPLATE: process.env.AUTHENTICATION_MANAGER_TEMPLATE as Address ?? "0x7d6C4C5e75edb708ad19c3cC4F7d426f4791328e" as Address,
  },
  v2: {
    NAME: "SmartAccount",
    VERSION: "2.0.0",
    FACTORY_ADDRESS: "0x22ff1dc5998258faa1ea45a776b57484f8ab80a2" as Address,
    SMART_ACCOUNT_TEMPLATE_ADDRESS:
      "0x5147ce3947a407c95687131be01a2b8d55fd0a40" as Address,
    CREATION_CODE:
      "0x9c4cedc00b97e591edf9428d046a759d306679aa78aaf995f5fc8847365b5808" as Hex,
  },
  defaultGasConfig: {
    CALL_GAS_LIMIT: BigInt(900000),
    VERIFICATION_GAS_LIMIT: BigInt(900000),
    PREVERIFICATION_GAS: BigInt(900000),
    MAX_FEE_PER_GAS: BigInt(300000000000), //300 gwei
    MAX_PRIORITY_FEE_PER_GAS: BigInt(300000000000),
  }
};

export const networkConfigurations = {
  base_url: "https://www.okx.com/priapi/v5/wallet/smart-account/",
};

export const defaultUserOperationParams = {};
