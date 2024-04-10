import { Address, Hex} from "viem";

export const configuration = {
  entryPoint: {
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
    ECDSA_VALIDATOR_TEMPLATE_ADDRESS: process.env.ECDSA_VALIDATOR_TEMPLATE_ADDRESS as Address ?? "0xAA1b181292123BED3cEEc891AC52f0BfdA63a87a" as Address,
    SMART_ACCOUNT_TEMPLATE_ADDRESS: process.env.SMART_ACCOUNT_TEMPLATE_ADDRESS as Address ?? "0xdd9A00eC5383D5eFcF6fADe549de0F7b1b183151" as Address,
    FACTORY_ADDRESS: process.env.FACTORY_ADDRESS as Address ?? "0x0d259Ed80A9BAEd3Bcbb4A4Be0f8E88Cb4C8A486" as Address,
    AUTHENTICATION_MANAGER_TEMPLATE: process.env.AUTHENTICATION_MANAGER_TEMPLATE as Address ?? "0xF04Dd2892D3723f98B2fC0E393847955aF3C56d7" as Address,
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
  },
  paymaster: {
    privateKey: "",
    address: "0xFeeCC911175C2B6D46BaE4fd357c995a4DC43C60",
    policyPaymaster: "0x2b6240b12C86Ac775509F903d6a631F53C36bA31",
  }
};

// test cases
// Compiled 1 Solidity file successfully (evm target: paris).
// successfully deployed deployContractDeployment 0x06786bCbc114bbfa670E30A1AC35dFd1310Be82f
// successfully deployed localhost Validations 0x3e053F60EA9D47eaB664b119a2594682218afd06
// successfully deployed localhost TestUtils 0x22bAAe4dE2421Ac4c726Bf0f5D885041938d0525
// successfully deployed localhost ECDSAValidator 0x9464A689D929c5d208C067a3A47597Da75885069
// successfully deployed localhost DefaultCallbackHandlerV3 0xaeABC8b3fb05b8782Ec21a36E3508Ef8359c29c5
// successfully deployed localhost BaseSession 0x9C994FCc4f7D2Ef96c01898bb6954DdE1E656EAA
// successfully deployed localhost MockModuleV3 0x4DDF9046c844BC546CE78613Da6a0B466fDDA9D4
// successfully deployed localhost AuthenticationManager 0x5fA184AB69c300ddBaBeD25E421710eFf934D3c1
// successfully deployed localhost SmartAccountV3 0x820664aE6673Bb1fe570Ce0B869fc5C3F38D5D8B
// successfully deployed localhost AddressPredictor 0xf681E3CfDCd683Ac243e734eF4bf850266bdE656
// proxyAdmin is: 0x6c383Ef7C9Bf496b5c847530eb9c49a3ED6E4C56
// AccountFactoryProxy address is:  0x2aA12f98795E7A65072950AfbA9d1E023D398241
// 0xd79ee474db25b9ca012942c54fc406cc938f4b051ae1493687a25ed3ee577b5e
// 0xb4032d79930e85b79cb85be315b489273b95a2afa78ce9e4acb81a089766fc42


// deployed 4/2
// successfully deployed deployContractDeployment 0xFaC897544659Fb136C064d5428947f5BC9cC1Fa2
// successfully deployed polygon Validations 0xeC537fF96dA41D242B7E16e080aA9c9FBAb6E682
// successfully deployed polygon TestUtils 0x782690A48cbdF715265B3FfC41fE8B0d2e302748
// successfully deployed polygon ECDSAValidator 0xAA1b181292123BED3cEEc891AC52f0BfdA63a87a
// successfully deployed polygon DefaultCallbackHandlerV3 0x60480fDbcE17ac570035dc29D5Ada1f9D2b59FF4
// successfully deployed polygon BaseSession 0x08d7a963ed4b7f4D9BE1F47f2e4F9A312D1d0681
// successfully deployed polygon MockModuleV3 0x9CDa0c83e2B74e9C8ad86BAae0137c651ee841E3
// successfully deployed polygon AuthenticationManager 0xF04Dd2892D3723f98B2fC0E393847955aF3C56d7
// successfully deployed polygon SmartAccountV3 0xdd9A00eC5383D5eFcF6fADe549de0F7b1b183151
// successfully deployed polygon AddressPredictor 0xf4FaB13C504757175b7A3339f714e6807dc2E521
// proxyAdmin is: 0x3C11E580cF43e3B8F13582F277fF59347Bb6b67B
// AccountFactoryProxy address is:  0x0d259Ed80A9BAEd3Bcbb4A4Be0f8E88Cb4C8A486
// 0x5303efad6b8620df322c6ed9349bb11b78e2a23877baf4da07e1c778ce22b79f
// 0x1a34384934d350a8fabcb6dac0f481b1edac5409841face9572968b77b5cc0ec

export const networkConfigurations = {
  base_url: "https://www.okx.com/priapi/v5/wallet/smart-account/",
};

export const defaultUserOperationParams = {};
