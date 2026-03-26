import type { HealthStatus } from "./health.js";
import type { MarketProofStatus } from "./marketproof_status.js";

/**
 * Canonical SolvencyProof epoch object.
 * This is the authoritative backend state payload that will later be submitted
 * through the shared compliledger-algorand-adapter.
 */
export interface SolvencyEpochObject {
  entity_id: string;
  epoch_id: number;
  liability_root: string;
  reserve_root: string;
  reserve_snapshot_hash: string;
  /** Deterministic commitment hash over the canonical fields — computed last. */
  proof_hash: string;
  reserves_total: number;
  total_liabilities: number;
  near_term_liabilities_total: number;
  liquid_assets_total: number;
  capital_backed: boolean;
  liquidity_ready: boolean;
  health_status: HealthStatus;
  /** Unix timestamp (seconds) when this epoch was generated. */
  timestamp: number;
  /** Unix timestamp (seconds) until which this epoch is considered fresh. */
  valid_until: number;
  adapter_version: string;
  source_type: "backend";
  /**
   * MarketProof admission status — set before financial evaluation.
   * ADMITTED: all admission checks passed and financial evaluation ran.
   * NOT_ADMITTED: one or more checks failed; financial evaluation was skipped.
   */
  marketproof_status?: MarketProofStatus;
  /** Reason codes produced by the MarketProof admission evaluator. */
  marketproof_reason_codes?: string[];
}

/**
 * Intermediate state holding computed liability data.
 */
export interface LiabilityState {
  liability_root: string;
  total_liabilities: number;
  near_term_liabilities_total: number;
  leaf_count: number;
}

/**
 * Intermediate state holding computed reserve data.
 */
export interface ReserveState {
  reserve_root: string;
  reserve_snapshot_hash: string;
  reserves_total: number;
  liquid_assets_total: number;
  reserve_count: number;
}

/**
 * Epoch metadata produced by the epoch manager.
 */
export interface EpochMetadata {
  epoch_id: number;
  timestamp: number;
  valid_until: number;
}
