// SolvencyProof API Constants
// Architecture: backend → Algorand adapter → Algorand Testnet registry → frontend visibility

export const API_BASE_URL = 'https://solvency-proof-production.up.railway.app';

/** Default entity ID for production deployment */
export const DEFAULT_ENTITY_ID = 'compliledger-entity-01';

export const API_ENDPOINTS = {
    // Health
    HEALTH: '/health',

    // Epoch state (backend-computed, Algorand-anchored)
    EPOCH_LATEST: '/api/epoch/latest',
    EPOCH_BY_ID: '/api/epoch',
    EPOCH_HISTORY: '/api/epoch/history',
    EPOCH_HEALTH: '/api/epoch/health',
    EPOCH_VERIFY_STORED: '/api/epoch/verify-stored',

    // Liabilities
    LIABILITIES: '/api/liabilities',
    BUILD_MERKLE: '/api/liabilities/build',
    VERIFY_INCLUSION: '/api/liabilities/verify',
};

/** Algorand Testnet explorer (Pera Wallet). */
export const ALGORAND_EXPLORER_BASE_URL = 'https://explorer.perawallet.app';

/** Algorand Testnet Indexer base URL. */
export const ALGORAND_INDEXER_URL = 'https://testnet-idx.algonode.cloud';

export function getAlgorandTxUrl(txId: string): string {
    return `${ALGORAND_EXPLORER_BASE_URL}/tx/${txId}`;
}

export function getAlgorandAppUrl(appId: string): string {
    return `${ALGORAND_EXPLORER_BASE_URL}/application/${appId}`;
}

export function getAlgorandAddressUrl(address: string): string {
    return `${ALGORAND_EXPLORER_BASE_URL}/address/${address}`;
}

// ---------------------------------------------------------------------------
// Legacy shims — kept for backward compatibility with older portal pages.
// These now resolve to Algorand explorer URLs instead of Etherscan.
// New code must use the Algorand helpers above.
// ---------------------------------------------------------------------------

/** @deprecated The registry is now on Algorand. Use getAlgorandAppUrl instead. */
export const CONTRACTS = {
    REGISTRY: '',
    VERIFIER: '',
} as const;

/** @deprecated Use getAlgorandTxUrl instead. */
export function getEtherscanTxUrl(_txHash: string): string {
    return ALGORAND_EXPLORER_BASE_URL;
}

/** @deprecated Use getAlgorandAddressUrl instead. */
export function getEtherscanAddressUrl(_address: string): string {
    return ALGORAND_EXPLORER_BASE_URL;
}

/** @deprecated Use getAlgorandAppUrl instead. */
export function getEtherscanBlockUrl(_blockNumber: number): string {
    return ALGORAND_EXPLORER_BASE_URL;
}