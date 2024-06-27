export const authenticationManagerAbi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "_fallbackHandler",
        type: "address",
      },
      {
        internalType: "address",
        name: "_sessionTemplate",
        type: "address",
      },
      {
        internalType: "address",
        name: "_EOAValidatorTemplate",
        type: "address",
      },
      {
        internalType: "string",
        name: "_name",
        type: "string",
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
    name: "ADDRESS_ALREADY_EXISTS",
    type: "error",
  },
  {
    inputs: [],
    name: "ADDRESS_NOT_EXISTS",
    type: "error",
  },
  {
    inputs: [],
    name: "AuthenticationManagerBanned",
    type: "error",
  },
  {
    inputs: [],
    name: "CannotAddAdminAsRecoveryModule",
    type: "error",
  },
  {
    inputs: [],
    name: "CannotRemoveRecoveryModule",
    type: "error",
  },
  {
    inputs: [],
    name: "CannotRemoveSelf",
    type: "error",
  },
  {
    inputs: [],
    name: "DisallowRemoveValidator",
    type: "error",
  },
  {
    inputs: [],
    name: "EOAValidatorNotFoundOrNotValid",
    type: "error",
  },
  {
    inputs: [],
    name: "ERC1167FailedCreateClone",
    type: "error",
  },
  {
    inputs: [],
    name: "ExecutorPrivilegeNotFound",
    type: "error",
  },
  {
    inputs: [],
    name: "HookMustNotBeZeroAddress",
    type: "error",
  },
  {
    inputs: [],
    name: "INVALID_ADDRESS",
    type: "error",
  },
  {
    inputs: [],
    name: "InvalidInitialization",
    type: "error",
  },
  {
    inputs: [],
    name: "InvalidRecoverParams",
    type: "error",
  },
  {
    inputs: [],
    name: "ModuleNotEnabled",
    type: "error",
  },
  {
    inputs: [],
    name: "ModuleSessionCheckFailed",
    type: "error",
  },
  {
    inputs: [],
    name: "ModuleSessionNotFoundOrNotValid",
    type: "error",
  },
  {
    inputs: [],
    name: "NotInitializing",
    type: "error",
  },
  {
    inputs: [],
    name: "OnlyAdmin",
    type: "error",
  },
  {
    inputs: [],
    name: "OnlyRecover",
    type: "error",
  },
  {
    inputs: [],
    name: "OnlyRecoveryModule",
    type: "error",
  },
  {
    inputs: [],
    name: "OnlySmartAccount",
    type: "error",
  },
  {
    inputs: [],
    name: "PendingAdminValidatorExists",
    type: "error",
  },
  {
    inputs: [],
    name: "RecoveryModuleBanned",
    type: "error",
  },
  {
    inputs: [],
    name: "RecoveryModuleNotFound",
    type: "error",
  },
  {
    inputs: [],
    name: "SignatureLengthTooShort",
    type: "error",
  },
  {
    inputs: [],
    name: "SmartAccountBanned",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "hook",
        type: "address",
      },
      {
        internalType: "bytes",
        name: "data",
        type: "bytes",
      },
    ],
    name: "ValidationHooksCheckFailed",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint64",
        name: "version",
        type: "uint64",
      },
    ],
    name: "Initialized",
    type: "event",
  },
  {
    inputs: [],
    name: "AUTHENTICATION_MANAGER_TEMPLATE",
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
    name: "EOA_VALIDATOR_TEMPLATE",
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
    name: "FALLBACKHANDLER",
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
    name: "HASH_NAME",
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
    name: "HASH_VERSION",
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
    name: "SESSION_TEMPLATE",
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
    name: "SIG_VALIDATION_FAILED",
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
    inputs: [],
    name: "WAITING_PERIOD",
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
    inputs: [],
    name: "adminValidator",
    outputs: [
      {
        internalType: "contract IValidatorV3",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "cancelRecover",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes",
        name: "hookData",
        type: "bytes",
      },
    ],
    name: "checkPostExecutionHook",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "sender",
        type: "address",
      },
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
        name: "data",
        type: "bytes",
      },
      {
        internalType: "enum Enum.Operation",
        name: "operation",
        type: "uint8",
      },
    ],
    name: "checkPreExecutionHook",
    outputs: [
      {
        internalType: "bytes",
        name: "",
        type: "bytes",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "clearCurrentSession",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "validatorTemplate",
        type: "address",
      },
      {
        internalType: "bytes",
        name: "subject",
        type: "bytes",
      },
    ],
    name: "computeValidatorAddress",
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
    name: "currentSession",
    outputs: [
      {
        internalType: "contract ISession",
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
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "currentSessions",
    outputs: [
      {
        internalType: "contract ISession",
        name: "session",
        type: "address",
      },
      {
        internalType: "uint96",
        name: "timestamp",
        type: "uint96",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "defaultValidator",
    outputs: [
      {
        internalType: "contract IValidatorV3",
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
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "executors",
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
    inputs: [
      {
        internalType: "address",
        name: "module",
        type: "address",
      },
    ],
    name: "getExecutorSession",
    outputs: [
      {
        internalType: "contract ISession",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getFallbackHandler",
    outputs: [
      {
        internalType: "address",
        name: "fallbackHandler",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "enum Enum.SignatureType",
        name: "sigType",
        type: "uint8",
      },
      {
        internalType: "address",
        name: "EntryPoint",
        type: "address",
      },
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
    ],
    name: "getUOPHash",
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
    inputs: [
      {
        internalType: "enum Enum.SignatureType",
        name: "sigType",
        type: "uint8",
      },
      {
        internalType: "address",
        name: "EntryPoint",
        type: "address",
      },
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
    ],
    name: "getUOPSignedHash",
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
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "hooks",
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
    inputs: [
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
        name: "_session",
        type: "tuple",
      },
      {
        internalType: "address",
        name: "_validatorTemplate",
        type: "address",
      },
    ],
    name: "initialize",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "executor",
        type: "address",
      },
      {
        internalType: "bytes",
        name: "data",
        type: "bytes",
      },
    ],
    name: "installExecutor",
    outputs: [
      {
        internalType: "address",
        name: "hookAddress",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "handler",
        type: "address",
      },
      {
        internalType: "bytes",
        name: "data",
        type: "bytes",
      },
    ],
    name: "installFallback",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_hook",
        type: "address",
      },
      {
        internalType: "bytes",
        name: "_data",
        type: "bytes",
      },
    ],
    name: "installHook",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "recoveryModule",
        type: "address",
      },
      {
        internalType: "bytes",
        name: "data",
        type: "bytes",
      },
    ],
    name: "installRecoveryModule",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "validatorTemplate",
        type: "address",
      },
      {
        internalType: "bytes",
        name: "data",
        type: "bytes",
      },
    ],
    name: "installValidator",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "module",
        type: "address",
      },
    ],
    name: "isExecutorInstalled",
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
        internalType: "address",
        name: "fallbackHandler",
        type: "address",
      },
    ],
    name: "isFallbackInstalled",
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
        internalType: "address",
        name: "hook",
        type: "address",
      },
    ],
    name: "isHookInstalled",
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
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "isRecoveryModule",
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
        internalType: "address",
        name: "_sender",
        type: "address",
      },
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
    name: "isValidSignatureWithSender",
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
    name: "isValidatorInstalled",
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
    inputs: [],
    name: "pendingAdminValidator",
    outputs: [
      {
        internalType: "contract IValidatorV3",
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
        internalType: "address",
        name: "sender",
        type: "address",
      },
    ],
    name: "prepareFromEOAExecution",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "module",
        type: "address",
      },
    ],
    name: "prepareFromModuleExecution",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "privileges",
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
    inputs: [
      {
        internalType: "address",
        name: "recoveryModule",
        type: "address",
      },
      {
        internalType: "address",
        name: "newValidatorTemplate",
        type: "address",
      },
      {
        internalType: "bytes",
        name: "_subject",
        type: "bytes",
      },
    ],
    name: "recover",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "removeMyValidator",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "smartAccount",
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
    inputs: [
      {
        internalType: "address",
        name: "executor",
        type: "address",
      },
      {
        internalType: "bytes",
        name: "",
        type: "bytes",
      },
    ],
    name: "uninstallExecutor",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "handler",
        type: "address",
      },
      {
        internalType: "bytes",
        name: "data",
        type: "bytes",
      },
    ],
    name: "uninstallFallback",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
      {
        internalType: "bytes",
        name: "_data",
        type: "bytes",
      },
    ],
    name: "uninstallHook",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "recoveryModule",
        type: "address",
      },
    ],
    name: "uninstallRecoveryModule",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "validator",
        type: "address",
      },
      {
        internalType: "bytes",
        name: "data",
        type: "bytes",
      },
    ],
    name: "uninstallValidator",
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
        internalType: "address",
        name: "EntryPoint",
        type: "address",
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
    stateMutability: "nonpayable",
    type: "function",
  },
];
