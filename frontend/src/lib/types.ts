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
    adapter_version?: string;
    source_type?: string;
}

export type EpochHistoryItem = SolvencyEpochState;

export interface UserInclusionResult {
    entity_id: string;
    epoch_id: number;
    liability_root: string;
    included: boolean;
    /** Unix timestamp (seconds) when the inclusion check was performed */
    checked_at: number;
}
