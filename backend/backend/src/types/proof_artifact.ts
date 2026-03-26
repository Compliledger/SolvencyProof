/**
 * proof_artifact.ts
 *
 * Universal proof artifact — the canonical output object produced by
 * SolvencyProof before or during adapter submission.
 *
 * This is the portable, chain-agnostic representation of a solvency proof.
 * It is produced from a SolvencyEpochObject and enriched with anchor metadata
 * once the epoch has been submitted on-chain.
 *
 * Shape:
 *   module              – always "solvency"
 *   entity_id           – reporting entity identifier
 *   rule_version_used   – adapter_version from the epoch object
 *   marketproof_status  – ADMITTED / NOT_ADMITTED from the MarketProof check
 *   decision_result     – health_status string (HEALTHY / LIQUIDITY_STRESSED / …)
 *   evaluation_context  – numeric inputs used for the health decision
 *   reason_codes        – machine-readable reason codes (MarketProof + financial)
 *   timestamp           – Unix timestamp (seconds) of epoch generation
 *   bundle_hash         – proof_hash (deterministic SHA-256 commitment)
 *   anchor_metadata     – populated after on-chain submission
 */

import type { SolvencyEpochObject } from "./epoch.js";
import type { MarketProofStatus } from "./marketproof_status.js";

// ============================================================
// TYPES
// ============================================================

/** On-chain anchor details — populated after successful submission. */
export interface AnchorMetadata {
  /** Algorand transaction ID of the confirmed submission */
  tx_id?: string;
  /** On-chain application ID (SolventRegistry contract) */
  app_id?: string;
  /** Network identifier, e.g. "testnet" or "mainnet" */
  network?: string;
  /** Unix timestamp (seconds) when the epoch was confirmed on-chain */
  anchored_at?: number;
}

/**
 * Numeric inputs used to reach the decision_result.
 * All monetary amounts are in their native units (same as SolvencyEpochObject).
 */
export interface EvaluationContext {
  reserves_total: number;
  total_liabilities: number;
  liquid_assets_total: number;
  near_term_liabilities_total: number;
  capital_backed: boolean;
  liquidity_ready: boolean;
}

/**
 * Universal proof artifact — the portable canonical representation of a
 * SolvencyProof epoch, suitable for frontend display and chain-agnostic storage.
 */
export interface UniversalProofArtifact {
  /** Module identifier — always "solvency" */
  module: "solvency";
  /** Reporting entity identifier */
  entity_id: string;
  /** Adapter/rule version used to produce this artifact */
  rule_version_used: string;
  /**
   * MarketProof admission status — ADMITTED if all admission checks passed
   * before financial evaluation; NOT_ADMITTED if any check failed.
   */
  marketproof_status: MarketProofStatus;
  /** Health decision result (HEALTHY / LIQUIDITY_STRESSED / UNDERCOLLATERALIZED / CRITICAL) */
  decision_result: string;
  /** Numeric inputs used in the financial evaluation */
  evaluation_context: EvaluationContext;
  /**
   * Machine-readable reason codes explaining the decision.
   * MarketProof admission codes appear first, followed by financial reason codes.
   */
  reason_codes: string[];
  /** Unix timestamp (seconds) when the epoch was generated */
  timestamp: number;
  /** Deterministic SHA-256 commitment hash linking the epoch fields */
  bundle_hash: string;
  /** On-chain anchor metadata (populated after submission) */
  anchor_metadata: AnchorMetadata;
}

// ============================================================
// REASON CODE DERIVATION
// ============================================================

/**
 * Derives human-readable reason codes from the financial evaluation inputs.
 *
 * Positive codes indicate a condition is met; negative codes (prefixed NOT_)
 * indicate a failing condition.
 */
function deriveFinancialReasonCodes(
  capitalBacked: boolean,
  liquidityReady: boolean
): string[] {
  const codes: string[] = [];
  codes.push(capitalBacked ? "CAPITAL_BACKED" : "NOT_CAPITAL_BACKED");
  codes.push(liquidityReady ? "LIQUIDITY_READY" : "NOT_LIQUIDITY_READY");
  return codes;
}

// ============================================================
// MAPPER
// ============================================================

/**
 * Converts a canonical SolvencyEpochObject into a UniversalProofArtifact.
 *
 * MarketProof reason codes (from the admission check) are prepended to the
 * financial reason codes so the admission decision is always visible first.
 *
 * @param epoch         - Canonical epoch object produced by the backend engine
 * @param anchorMetadata - Optional on-chain anchor details (populated after submit)
 */
export function toUniversalProofArtifact(
  epoch: SolvencyEpochObject,
  anchorMetadata: AnchorMetadata = {}
): UniversalProofArtifact {
  // Merge MarketProof admission codes first, then financial reason codes.
  const marketproofCodes = epoch.marketproof_reason_codes ?? [];
  const financialCodes = deriveFinancialReasonCodes(epoch.capital_backed, epoch.liquidity_ready);

  return {
    module:             "solvency",
    entity_id:          epoch.entity_id,
    rule_version_used:  epoch.adapter_version,
    marketproof_status: epoch.marketproof_status ?? "ADMITTED",
    decision_result:    epoch.health_status,
    evaluation_context: {
      reserves_total:              epoch.reserves_total,
      total_liabilities:           epoch.total_liabilities,
      liquid_assets_total:         epoch.liquid_assets_total,
      near_term_liabilities_total: epoch.near_term_liabilities_total,
      capital_backed:              epoch.capital_backed,
      liquidity_ready:             epoch.liquidity_ready,
    },
    reason_codes:    [...marketproofCodes, ...financialCodes],
    timestamp:       epoch.timestamp,
    bundle_hash:     epoch.proof_hash,
    anchor_metadata: anchorMetadata,
  };
}
