import { Address } from "viem";
import { OKXSmartContractAccountConfig } from "../okxSmartAccount/types";
import {
  arbitrum,
  arbitrumSepolia,
  avalanche,
  bsc,
  linea,
  mainnet,
  okc,
  optimism,
  polygon,
  sepolia,
  xLayer,
  xLayerTestnet,
} from "viem/chains";

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

export const supportedChains = [
  { chain: polygon, isEIP1559: true },
  {
    chain: arbitrumSepolia,
    isEIP1559: false,
  },
  {
    chain: xLayer,
    isEIP1559: false,
  },
  {
    chain: xLayerTestnet,
    isEIP1559: false,
  },
  {
    chain: sepolia,
    isEIP1559: true,
  },
  {
    chain: bsc,
    isEIP1559: false,
  },
  {
    chain: okc,
    isEIP1559: false,
  },
  {
    chain: linea,
    isEIP1559: true,
  },
  {
    chain: avalanche,
    isEIP1559: true,
  },
  {
    chain: optimism,
    isEIP1559: true,
  },
  {
    chain: mainnet,
    isEIP1559: true,
  },
  {
    chain: arbitrum,
    isEIP1559: false,
  },
];

export const ECDSA_VALIDATOR_TEMPLATE: Address =
  "0x3C35C20CD5C03dcBCA1d0527164205288ca70B93";

export const JWT_VALIDATOR_TEMPLATE: Address =
  "0xBC8cdFfd57017bF466a6b8a25B053bDfb69287dB";
