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

// test cases
// successfully deployed deployContractDeployment 0xE401FBb0d6828e9f25481efDc9dd18Da9E500983
// successfully deployed localhost Validations 0x6B36a321c9984a07fa99C7BF65C22DBfd003270c
// successfully deployed localhost TestUtils 0xFC5B2cb820b17b04f0321cb7fd192960Cf550cE1
// successfully deployed localhost ECDSAValidator 0xecC4744dACc9a6e2bdb2BEA9F020942359D135BA
// successfully deployed localhost DefaultCallbackHandlerV3 0xdEDDBdDC26a3278fE1eAabD03BC3c3948423c128
// successfully deployed localhost BaseSession 0x6F0c976B671a583035F64bCF8FD27C0496a6cB6E
// successfully deployed localhost MockModuleV3 0xb5AF7372751f9B2A89954821810AA4F24469ed23
// successfully deployed localhost AuthenticationManager 0xaAf900089Bd00813b9e3f62A638D48ac4d1E2c0B
// successfully deployed localhost SmartAccountV3 0x98150FcbaA20b9aa6E1910C7B414934cFe179151
// successfully deployed localhost AddressPredictor 0x9150E16f298d2860326133A72f357f317065243B
// proxyAdmin is: 0xCA87833e830652C2ab07E1e03eBa4F2c246D3b58
// AccountFactoryProxy address is:  0x7A5EC257391817ef241ef8451642cC6b222d4f8C
// 0x71c944dfa65d340f2a9b28662439475f17f8e02141446d2f82098920474673df
// 0x6047bf82775cca64a7c5999a75d2b767b0fe2f0c9276996dff4cb7753b8f7bca

// polygon
// successfully deployed polygon Validations 0x10E1380D2d577f7b9a9336C8B5d44c5E2013dA2a
// successfully deployed polygon TestUtils 0xBfbD9D682950D79C32ee9a120f5646C069C70430
// successfully deployed polygon ECDSAValidator 0xB661dF5d3f7Dfb728784dABA14c055a026502a5D
// successfully deployed polygon DefaultCallbackHandlerV3 0x5eD9A96b5226F893f0ce4A5475c01DE6303A8C78
// successfully deployed polygon BaseSession 0xbD9e550329b842413f542C6AF1F4f24d6CB44486
// successfully deployed polygon MockModuleV3 0x987f359a4f7Aef1AEbe018C9FBA86AeAB9FF0BAE
// successfully deployed polygon AuthenticationManager 0x7d6C4C5e75edb708ad19c3cC4F7d426f4791328e
// successfully deployed polygon SmartAccountV3 0xe6604f547C6f31839802393E5C066a9017df7bEd
// successfully deployed polygon AddressPredictor 0x7c109B19A0C9579e8CBaD3325A8cff56d8D29f68
// proxyAdmin is: 0xC8b32b5058E0e51b9756897b3FcCCFc0f4CD87CE
// AccountFactoryProxy address is:  0xcAa350921D949f30BB9C21dcf34A9Fd486Ba537D
// 0xa283f2f94359420b48e77fec703f9112e07351f779ca02d2caa19de167bba6aa
// 0x675f3e3d2dcd38939d2bde490ca8f2dcfedc5d3dca20cb79432a1546cb40e21d
// crate address: 0xC400f5876AB562cE8fd0495E1ca167842eF01dC4

export const networkConfigurations = {
  base_url: "https://www.okx.com/priapi/v5/wallet/smart-account/",
};

export const defaultUserOperationParams = {};
