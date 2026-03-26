// Shared solvency types — frontend is a state consumer, not a logic driver.
// Backend computes state; Algorand Testnet is the public registry; frontend displays & verifies.
//
// These types are used by the older solvency service layer (services/solvencyService.ts)
// and legacy page components. New code should prefer the canonical types in @/lib/types.

export type HealthStatus =
    | 'HEALTHY'
    | 'LIQUIDITY_STRESSED'
    | 'UNDERCOLLATERALIZED'
    | 'CRITICAL'
    | 'EXPIRED';

/** A single epoch's solvency state as computed by the backend and anchored on Algorand Testnet. */
export interface EpochState {
    entity_id: string;
    epoch_id: string;
    liability_root: string;
    reserve_root: string;
    /** Hash of the raw reserve snapshot used to produce reserve_root. */
    reserve_snapshot_hash: string;
    /** Combined bundle hash anchored on Algorand (alias: proof_hash). */
    bundle_hash: string;
    /** Legacy alias for bundle_hash. */
    proof_hash: string;
    reserves_total: number;
    total_liabilities: number;
    near_term_liabilities_total: number;
    liquid_assets_total: number;
    capital_backed: boolean;
    liquidity_ready: boolean;
    health_status: HealthStatus;
    /** Unix timestamp (seconds) when this epoch was computed. */
    timestamp: number;
    /** Unix timestamp (seconds) after which this epoch is considered EXPIRED. */
    valid_until: number;
    /** Unix timestamp (seconds) when anchored on Algorand Testnet. */
    anchored_at?: number;
    /** Adapter/rule version used to produce this state. */
    rule_version_used?: string;
    /** Machine-readable reason codes (e.g. CAPITAL_BACKED, NOT_LIQUIDITY_READY). */
    reason_codes?: string[];
}

/** Summary card shown in the public dashboard. */
export interface EpochSummary {
    entity_id: string;
    epoch_id: string;
    health_status: HealthStatus;
    /** Bundle hash anchored on Algorand. */
    bundle_hash: string;
    /** Legacy alias for bundle_hash. */
    proof_hash: string;
    /** Unix timestamp (seconds) of epoch generation. */
    timestamp: number;
    /** Unix timestamp (seconds) after which the epoch is EXPIRED. */
    valid_until: number;
    capital_backed: boolean;
    liquidity_ready: boolean;
    /** Unix timestamp (seconds) when anchored on Algorand Testnet. */
    anchored_at?: number;
}

/** Algorand anchor metadata for a submitted epoch. */
export interface AnchorMetadata {
    /** Whether the epoch has been anchored on-chain */
    anchored: boolean;
    /** Network identifier, e.g. "testnet" or "mainnet" */
    network: string;
    /** On-chain application ID (SolventRegistry contract) */
    application_id: string;
    /** Algorand transaction ID of the confirmed on-chain submission */
    transaction_id: string;
    /** Unix timestamp (seconds) when the epoch was confirmed on-chain, or null */
    anchored_at: number | null;
}

/** Result of a user inclusion verification against a specific epoch's liability_root. */
export interface InclusionResult {
    success: boolean;
    user_id: string;
    epoch_id: string;
    liability_root: string;
    balance?: number;
    proof?: string[];
    error?: string;
}

/** Backend health response. */
export interface BackendHealth {
    status: string;
    timestamp: string;
}
