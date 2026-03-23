export const SOLVENCY_REGISTRY_ABI = [
  {
    inputs: [{ name: "_verifier", type: "address" }],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "epochId", type: "bytes32" },
      { indexed: false, name: "liabilitiesRoot", type: "bytes32" },
      { indexed: false, name: "reservesTotal", type: "uint256" },
      { indexed: false, name: "timestamp", type: "uint256" },
      { indexed: true, name: "submitter", type: "address" },
    ],
    name: "SolvencyProved",
    type: "event",
  },
  {
    inputs: [{ name: "epochId", type: "bytes32" }],
    name: "getProof",
    outputs: [
      {
        components: [
          { name: "epochId", type: "bytes32" },
          { name: "liabilitiesRoot", type: "bytes32" },
          { name: "reservesTotal", type: "uint256" },
          { name: "timestamp", type: "uint256" },
          { name: "submitter", type: "address" },
          { name: "verified", type: "bool" },
        ],
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getEpochCount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getLatestEpoch",
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "", type: "uint256" }],
    name: "epochIds",
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "epochId", type: "bytes32" }],
    name: "isEpochVerified",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "epochId", type: "bytes32" },
      { name: "liabilitiesRoot", type: "bytes32" },
      { name: "reservesTotal", type: "uint256" },
      { name: "_pA", type: "uint256[2]" },
      { name: "_pB", type: "uint256[2][2]" },
      { name: "_pC", type: "uint256[2]" },
    ],
    name: "submitProof",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// Deployed contract addresses on Sepolia
export const DEPLOYED_ADDRESSES = {
  Groth16Verifier: "0x9e2f50145E2f5299857a33ed937f77DCeD61FBB6",
  SolvencyProofRegistry: "0xC392C0e603f9d86A0Bd2Ab2B46CC1fffcA83E6f4",
  chainId: 11155111,
};

export const MOCK_VERIFIER_ABI = [
  {
    inputs: [{ name: "_alwaysValid", type: "bool" }],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [
      { name: "", type: "uint256[2]" },
      { name: "", type: "uint256[2][2]" },
      { name: "", type: "uint256[2]" },
      { name: "", type: "uint256[3]" },
    ],
    name: "verifyProof",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
] as const;
