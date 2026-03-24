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

/**
 * Indicates where the epoch state originated.
 * - LIVE_REGISTRY  : read directly from the Algorand adapter / on-chain registry
 * - FALLBACK_LOCAL : served from a file-based or cached fallback store
 * - UNKNOWN        : source could not be determined
 */
export type DataSource = "LIVE_REGISTRY" | "FALLBACK_LOCAL" | "UNKNOWN";

/**
 * Freshness of an epoch record relative to the current time.
 * - FRESH   : valid_until is in the future
 * - EXPIRED : valid_until is in the past
 * - UNKNOWN : validity window could not be determined
 */
export type FreshnessState = "FRESH" | "EXPIRED" | "UNKNOWN";

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
    /**
     * Explicit data-source classification returned by the backend.
     * When present this supersedes any client-side inference.
     */
    data_source?: DataSource;
    /**
     * Whether this epoch record is currently within its validity window.
     * Provided by the backend; if absent the UI infers from valid_until.
     */
    is_fresh?: boolean | null;
    /**
     * Whether this epoch record has passed its valid_until timestamp.
     * Provided by the backend; if absent the UI infers from valid_until.
     */
    is_expired?: boolean | null;
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
