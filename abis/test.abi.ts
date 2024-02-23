export const testABI = [
  {
    name: "staticStruct",
    inputs: [
      {
        components: [
          {
            name: "x",
            type: "uint256",
          },
          {
            name: "y",
            type: "bool",
          },
          {
            name: "z",
            type: "address",
          },
        ],
        name: "foo",
        type: "tuple",
      },
    ],
  },
] as const;
