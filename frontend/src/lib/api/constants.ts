// SolvencyProof API Constants

export const API_BASE_URL = 'https://solvency-proof-production.up.railway.app';

export const ETHERSCAN_BASE_URL = 'https://sepolia.etherscan.io';

export const CONTRACTS = {
    REGISTRY: '0x7a9f15BCD95FDD20cf31A480f37CAA9b708aB33d',
    VERIFIER: '0x5e22F8cB0CfbC0df5F2251009674E1266E1D2DD6',
};

export const API_ENDPOINTS = {
    // Health
    HEALTH: '/health',

    // Liabilities
    LIABILITIES: '/api/liabilities',
    BUILD_MERKLE: '/api/liabilities/build',
    VERIFY_INCLUSION: '/api/liabilities/verify',

    // Reserves
    RESERVES: '/api/reserves',
    SCAN_RESERVES: '/api/reserves/scan',
    RESERVE_ADDRESSES: '/api/reserves/addresses',

    // Proof
    PROOF: '/api/proof',
    GENERATE_PROOF: '/api/proof/generate',
    SUBMIT_PROOF: '/api/proof/submit',

    // Contracts
    CONTRACTS: '/api/contracts',
    EPOCH_COUNT: '/api/contracts/epoch-count',
    ON_CHAIN_PROOF: '/api/contracts/proof',

    // Yellow Network
    YELLOW_STATUS: '/api/yellow/status',
    YELLOW_SESSIONS: '/api/yellow/sessions',
    YELLOW_SESSION: '/api/yellow/session',

    // Workflow
    FULL_WORKFLOW: '/api/workflow/full',
};

// Helper functions
export function getEtherscanTxUrl(txHash: string): string {
    return `${ETHERSCAN_BASE_URL}/tx/${txHash}`;
}

export function getEtherscanAddressUrl(address: string): string {
    return `${ETHERSCAN_BASE_URL}/address/${address}`;
}

export function getEtherscanBlockUrl(blockNumber: number): string {
    return `${ETHERSCAN_BASE_URL}/block/${blockNumber}`;
}
