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

/**
 * On-chain anchor details populated after successful submission to the
 * Algorand registry (SolventRegistry contract on Algorand Testnet).
 */
export interface AnchorMetadata {
    /** Algorand transaction ID of the confirmed on-chain submission */
    tx_id?: string;
    /** On-chain application ID (SolventRegistry contract) */
    app_id?: string;
    /** Network identifier, e.g. "testnet" or "mainnet" */
    network?: string;
    /** Unix timestamp (seconds) when the epoch was confirmed on-chain */
    anchored_at?: number;
}

/**
 * Numeric inputs used by the backend to reach the decision_result.
 * All monetary amounts are in their native units (same as the backend).
 */
export interface EvaluationContext {
    reserves_total: number;
    total_liabilities: number;
    liquid_assets_total: number;
    near_term_liabilities_total: number;
    capital_backed: boolean;
    liquidity_ready: boolean;
}

export interface SolvencyEpochState {
    entity_id: string;
    epoch_id: number;
    liability_root: string;
    reserve_root?: string;
    reserve_snapshot_hash?: string;
    /** Combined proof hash (legacy field — see also bundle_hash) */
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

    // -----------------------------------------------------------------------
    // Proof artifact fields (from UniversalProofArtifact)
    // These are populated when the epoch state is enriched with proof-artifact
    // data from the backend, giving a full picture of the solvency evaluation.
    // -----------------------------------------------------------------------

    /** Module identifier — always "solvency" when present */
    module?: "solvency";
    /** Adapter/rule version used to produce this artifact */
    rule_version_used?: string;
    /** Health decision result string (same as health_status, kept for artifact traceability) */
    decision_result?: string;
    /** Numeric inputs used in the financial evaluation */
    evaluation_context?: EvaluationContext;
    /** Machine-readable reason codes explaining the decision (e.g. CAPITAL_BACKED, NOT_LIQUIDITY_READY) */
    reason_codes?: string[];
    /** Deterministic SHA-256 commitment hash linking the epoch fields (alias: proof_hash) */
    bundle_hash?: string;
    /** On-chain anchor metadata populated after submission to the Algorand registry */
    anchor_metadata?: AnchorMetadata;
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

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/**
 * Returns true when `unixSeconds` is a valid, positive Unix timestamp.
 * Used by display components to guard against missing or zero-value timestamps.
 */
export function hasValidTimestamp(unixSeconds: number | undefined): unixSeconds is number {
    return typeof unixSeconds === 'number' && unixSeconds > 0;
}

/**
 * Builds a minimal AnchorMetadata object for display when only `anchored_at`
 * is available (i.e. the full anchor_metadata field is absent from the response).
 *
 * Returns `null` when there is no valid anchor timestamp.
 */
export function buildAnchorFallback(anchored_at: number | undefined): AnchorMetadata | null {
    if (!hasValidTimestamp(anchored_at)) return null;
    return { anchored_at, network: 'testnet' };
}
