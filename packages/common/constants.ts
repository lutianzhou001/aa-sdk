import { Address } from "viem";
import { OKXSmartContractAccountConfig } from "../okxSmartAccount/types";

export const configs: OKXSmartContractAccountConfig[] = [
  {
    version: "3.0.2",
    name: "SmartAccount",
    smartContractAccountTemplate:
      "0xD7C0320f55EB3D933A799A6bfb8B8dBbA1A7d35F" as Address,
    authenticationManagerTemplate:
      "0x891F66C42D3826FcDf3732DB209f9e5DdC840ae5" as Address,
    factoryAddress: "0x31AEBC0dDA2D690A3913E95561AF313F911E9202" as Address,
  },
];

export const ECDSA_VALIDATOR_TEMPLATE: Address =
  "0x3C35C20CD5C03dcBCA1d0527164205288ca70B93";

export const JWT_VALIDATOR_TEMPLATE: Address =
  "0xBC8cdFfd57017bF466a6b8a25B053bDfb69287dB";
