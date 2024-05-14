export const addressPredictorABI =  [
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "_template",
                "type": "address"
            },
            {
                "internalType": "address",
                "name": "_EOA_validator_template",
                "type": "address"
            },
            {
                "internalType": "string",
                "name": "_version",
                "type": "string"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "wallet",
                "type": "address"
            },
            {
                "internalType": "bytes",
                "name": "subject",
                "type": "bytes"
            }
        ],
        "name": "predict",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            },
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
]