export const smartAccountV3Abi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "_entryPoint",
        type: "address",
      },
      {
        internalType: "address",
        name: "_validations",
        type: "address",
      },
      {
        internalType: "address",
        name: "_authenticationManagerTemplate",
        type: "address",
      },
      {
        internalType: "string",
        name: "_version",
        type: "string",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [],
    name: "AuthenticationManagerNotAvailable",
    type: "error",
  },
  {
    inputs: [],
    name: "DelegateCallDisabled",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "index",
        type: "uint256",
      },
    ],
    name: "IndexTooBig",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "level",
        type: "uint256",
      },
    ],
    name: "LevelTooDeep",
    type: "error",
  },
  {
    inputs: [],
    name: "ModuleNotAvailable",
    type: "error",
  },
  {
    inputs: [],
    name: "NotFromEOA",
    type: "error",
  },
  {
    inputs: [],
    name: "NotFromEntryPoint",
    type: "error",
  },
  {
    inputs: [],
    name: "NotFromEntryPointOrSelf",
    type: "error",
  },
  {
    inputs: [],
    name: "NotFromSelf",
    type: "error",
  },
  {
    inputs: [],
    name: "OnlyAdmin",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "CallType",
        name: "callType",
        type: "bytes1",
      },
    ],
    name: "UnsupportedCallType",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "ExecType",
        name: "execType",
        type: "bytes1",
      },
    ],
    name: "UnsupportedExecType",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "moduleType",
        type: "uint256",
      },
    ],
    name: "UnsupportedModuleType",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
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
        indexed: false,
        internalType: "struct Execution",
        name: "execution",
        type: "tuple",
      },
      {
        indexed: false,
        internalType: "bytes",
        name: "reason",
        type: "bytes",
      },
    ],
    name: "BatchExeFailed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "implement",
        type: "address",
      },
    ],
    name: "ImplementUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint8",
        name: "version",
        type: "uint8",
      },
    ],
    name: "Initialized",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "moduleTypeId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "address",
        name: "module",
        type: "address",
      },
    ],
    name: "ModuleInstalled",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "moduleTypeId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "address",
        name: "module",
        type: "address",
      },
    ],
    name: "ModuleUninstalled",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "SafeReceived",
    type: "event",
  },
  {
    stateMutability: "nonpayable",
    type: "fallback",
  },
  {
    inputs: [],
    name: "AUTH_MANAGER_TEMPLATE",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "ENTRYPOINT",
    outputs: [
      {
        internalType: "contract IEntryPoint",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "VALIDATIONS",
    outputs: [
      {
        internalType: "contract IValidations",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "VERSION",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "accountId",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "ModeCode",
        name: "mode",
        type: "bytes32",
      },
      {
        internalType: "bytes",
        name: "executionCalldata",
        type: "bytes",
      },
    ],
    name: "execute",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "ModeCode",
        name: "mode",
        type: "bytes32",
      },
      {
        internalType: "bytes",
        name: "executionCalldata",
        type: "bytes",
      },
    ],
    name: "executeFromExecutor",
    outputs: [
      {
        internalType: "bytes[]",
        name: "returnData",
        type: "bytes[]",
      },
    ],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "getAuthenticationManager",
    outputs: [
      {
        internalType: "contract IAuthenticationManager",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes",
        name: "params",
        type: "bytes",
      },
    ],
    name: "initializeAccount",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "moduleType",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "module",
        type: "address",
      },
      {
        internalType: "bytes",
        name: "initData",
        type: "bytes",
      },
    ],
    name: "installModule",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "moduleType",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "module",
        type: "address",
      },
      {
        internalType: "bytes",
        name: "additionalContext",
        type: "bytes",
      },
    ],
    name: "isModuleInstalled",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "_hash",
        type: "bytes32",
      },
      {
        internalType: "bytes",
        name: "_signature",
        type: "bytes",
      },
    ],
    name: "isValidSignature",
    outputs: [
      {
        internalType: "bytes4",
        name: "",
        type: "bytes4",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "validator",
        type: "address",
      },
    ],
    name: "nonce",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "uint64",
            name: "validUntil",
            type: "uint64",
          },
          {
            internalType: "address",
            name: "validator",
            type: "address",
          },
        ],
        internalType: "struct IAuthenticationManager.StaleValidator",
        name: "staleValidator",
        type: "tuple",
      },
      {
        components: [
          {
            internalType: "uint64",
            name: "validFrom",
            type: "uint64",
          },
          {
            internalType: "uint64",
            name: "validUntil",
            type: "uint64",
          },
          {
            internalType: "bytes",
            name: "subject",
            type: "bytes",
          },
        ],
        internalType: "struct ISession.Session",
        name: "newValidator",
        type: "tuple",
      },
      {
        internalType: "address",
        name: "newValidatorTemplate",
        type: "address",
      },
    ],
    name: "recover",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "ModeCode",
        name: "mode",
        type: "bytes32",
      },
    ],
    name: "supportsAccountMode",
    outputs: [
      {
        internalType: "bool",
        name: "isSupported",
        type: "bool",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "moduleTypeId",
        type: "uint256",
      },
    ],
    name: "supportsModule",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "moduleType",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "module",
        type: "address",
      },
      {
        internalType: "bytes",
        name: "deInitData",
        type: "bytes",
      },
    ],
    name: "uninstallModule",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "implement",
        type: "address",
      },
    ],
    name: "updateImplement",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "implement",
        type: "address",
      },
      {
        internalType: "bytes",
        name: "data",
        type: "bytes",
      },
    ],
    name: "updateImplementAndCall",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "address",
            name: "sender",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "nonce",
            type: "uint256",
          },
          {
            internalType: "bytes",
            name: "initCode",
            type: "bytes",
          },
          {
            internalType: "bytes",
            name: "callData",
            type: "bytes",
          },
          {
            internalType: "bytes32",
            name: "accountGasLimits",
            type: "bytes32",
          },
          {
            internalType: "uint256",
            name: "preVerificationGas",
            type: "uint256",
          },
          {
            internalType: "bytes32",
            name: "gasFees",
            type: "bytes32",
          },
          {
            internalType: "bytes",
            name: "paymasterAndData",
            type: "bytes",
          },
          {
            internalType: "bytes",
            name: "signature",
            type: "bytes",
          },
        ],
        internalType: "struct PackedUserOperation",
        name: "userOp",
        type: "tuple",
      },
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
      {
        internalType: "uint256",
        name: "missingAccountFunds",
        type: "uint256",
      },
    ],
    name: "validateUserOp",
    outputs: [
      {
        internalType: "uint256",
        name: "validationData",
        type: "uint256",
      },
    ],
    stateMutability: "payable",
    type: "function",
  },
  {
    stateMutability: "payable",
    type: "receive",
  },
];
