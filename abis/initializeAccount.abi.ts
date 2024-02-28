export const initializeAccountABI = [
  {
    inputs: [
      {
        internalType: "bytes",
        name: "_subject",
        type: "bytes",
      },
      {
        internalType: "address",
        name: "_validatorTemplate",
        type: "address",
      },
      {
        components: [
          {
            internalType: "address",
            name: "target",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "value",
            type: "uint256",
          },
          {
            internalType: "bytes",
            name: "callData",
            type: "bytes",
          },
        ],
        internalType: "struct Execution[]",
        name: "executions",
        type: "tuple[]",
      },
    ],
    name: "initializeAccount",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];
