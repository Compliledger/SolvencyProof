// Canonical shared types for SolvencyProof frontend
// The frontend is a visibility + verification + operator console layer.
// All solvency/liquidity logic lives in the backend; the frontend consumes
// these canonical objects from backend / Algorand registry APIs.

export type HealthStatus =
    | "HEALTHY"
    | "LIQUIDITY_STRESSED"
    | "UNDERCOLLATERALIZED"
    | "CRITICAL"
    | "EXPIRED";

export interface SolvencyEpochState {
    entity_id: string;
    epoch_id: number;
    liability_root: string;
    reserve_root?: string;
    reserve_snapshot_hash?: string;
    proof_hash: string;
    reserves_total: number | string;
    total_liabilities?: number | string;
    near_term_liabilities_total: number | string;
    liquid_assets_total: number | string;
    capital_backed: boolean;
    liquidity_ready: boolean;
    health_status: HealthStatus;
    /** Unix timestamp (seconds) when this epoch was recorded */
    timestamp: number;
    /** Unix timestamp (seconds) after which this epoch state is considered expired */
    valid_until: number;
    /** Unix timestamp (seconds) when this state was anchored on-chain (Algorand). */
    anchored_at?: number;
    adapter_version?: string;
    source_type?: string;
}

export type EpochHistoryItem = SolvencyEpochState;

/**
 * Result of verifying that an on-chain (Algorand registry) record matches the
 * backend-computed epoch state.
 */
export interface VerificationResult {
    /** Whether any on-chain record was found for the given entity + epoch. */
    exists: boolean;
    /** Whether the on-chain record matches the backend-computed record exactly. */
    matches: boolean;
    /** List of field names whose values differ between on-chain and backend records. */
    mismatches: string[];
    /** The epoch state returned by the registry, or null when no record exists. */
    record: SolvencyEpochState | null;
}

export interface UserInclusionResult {
    entity_id: string;
    epoch_id: number;
    liability_root: string;
    included: boolean;
    /** Unix timestamp (seconds) when the inclusion check was performed */
    checked_at: number;
}
