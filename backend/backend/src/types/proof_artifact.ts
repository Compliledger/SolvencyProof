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
 * Shape (CompliLedger Universal Proof Artifact Schema):
 *   module              – always "solvency"
 *   entity_id           – reporting entity identifier
 *   rule_version_used   – adapter_version from the epoch object
 *   decision_result     – { capital_backed, liquidity_ready, health_status }
 *   evaluation_context  – numeric inputs + context used for the health decision
 *   reason_codes        – machine-readable reason codes derived from the evaluation
 *   timestamp           – Unix timestamp (seconds) of epoch generation
 *   bundle_hash         – proof_hash (deterministic SHA-256 commitment)
 *   anchor_metadata     – { anchored, network, application_id, transaction_id, anchored_at }
 */

import type { SolvencyEpochObject } from "./epoch.js";
import type { HealthStatus } from "./health.js";

// ============================================================
// TYPES
// ============================================================

/**
 * Structured health decision result.
 * Replaces the legacy plain-string decision_result field.
 */
export interface DecisionResult {
  /** Whether total reserves cover total liabilities */
  capital_backed: boolean;
  /** Whether liquid assets cover near-term liabilities */
  liquidity_ready: boolean;
  /** Composite health status derived from the two boolean flags */
  health_status: HealthStatus;
}

/**
 * On-chain anchor details — always present, with boolean `anchored` indicating
 * whether the epoch has been confirmed on-chain.
 */
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

/**
 * Numeric inputs and contextual metadata used to reach the decision_result.
 * All monetary amounts are in their native units (same as SolvencyEpochObject).
 */
export interface EvaluationContext {
  reserves_total: number;
  total_liabilities: number;
  liquid_assets_total: number;
  near_term_liabilities_total: number;
  capital_backed: boolean;
  liquidity_ready: boolean;
  /** Regulatory jurisdiction of the reporting entity (empty string when not set) */
  jurisdiction: string;
  /** Epoch identifier associated with this evaluation */
  epoch_id: number;
  /** Market-proof integration status (e.g. "VERIFIED", "PENDING", "UNKNOWN") */
  marketproof_status: string;
}

/**
 * Universal proof artifact — the portable canonical representation of a
 * SolvencyProof epoch, suitable for frontend display and chain-agnostic storage.
 *
 * Conforms to the CompliLedger Universal Proof Artifact Schema.
 */
export interface UniversalProofArtifact {
  /** Module identifier — always "solvency" */
  module: "solvency";
  /** Reporting entity identifier */
  entity_id: string;
  /** Adapter/rule version used to produce this artifact */
  rule_version_used: string;
  /** Structured health decision result */
  decision_result: DecisionResult;
  /** Numeric inputs and context used in the financial evaluation */
  evaluation_context: EvaluationContext;
  /** Machine-readable reason codes explaining the decision */
  reason_codes: string[];
  /** Unix timestamp (seconds) when the epoch was generated */
  timestamp: number;
  /** Deterministic SHA-256 commitment hash linking the epoch fields */
  bundle_hash: string;
  /** On-chain anchor metadata — always structured, anchored=false before submission */
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
function deriveReasonCodes(
  capitalBacked: boolean,
  liquidityReady: boolean
): string[] {
  const codes: string[] = [];
  codes.push(capitalBacked ? "CAPITAL_BACKED" : "NOT_CAPITAL_BACKED");
  codes.push(liquidityReady ? "LIQUIDITY_READY" : "NOT_LIQUIDITY_READY");
  return codes;
}

// ============================================================
// ANCHOR METADATA BUILDER
// ============================================================

/**
 * Options for on-chain anchor details passed to toUniversalProofArtifact.
 * All fields are optional — defaults to an unanchored state.
 */
export interface AnchorMetadataInput {
  transaction_id?: string;
  application_id?: string;
  network?: string;
  anchored_at?: number | null;
}

/**
 * Builds a canonical AnchorMetadata object from optional input fields.
 * Ensures the required schema shape is always present.
 */
function buildAnchorMetadata(input: AnchorMetadataInput = {}): AnchorMetadata {
  const anchoredAt = input.anchored_at ?? null;
  return {
    anchored:       anchoredAt !== null,
    network:        input.network        ?? "",
    application_id: input.application_id ?? "",
    transaction_id: input.transaction_id ?? "",
    anchored_at:    anchoredAt,
  };
}

// ============================================================
// MAPPER
// ============================================================

/**
 * Converts a canonical SolvencyEpochObject into a UniversalProofArtifact.
 *
 * @param epoch       - Canonical epoch object produced by the backend engine
 * @param anchorInput - Optional on-chain anchor details (populated after submit)
 * @param jurisdiction      - Regulatory jurisdiction of the entity (default: "")
 * @param marketproofStatus - Market-proof integration status (default: "UNKNOWN")
 */
export function toUniversalProofArtifact(
  epoch: SolvencyEpochObject,
  anchorInput: AnchorMetadataInput = {},
  jurisdiction = "",
  marketproofStatus = "UNKNOWN"
): UniversalProofArtifact {
  return {
    module:            "solvency",
    entity_id:         epoch.entity_id,
    rule_version_used: epoch.adapter_version,
    decision_result: {
      capital_backed:  epoch.capital_backed,
      liquidity_ready: epoch.liquidity_ready,
      health_status:   epoch.health_status,
    },
    evaluation_context: {
      reserves_total:              epoch.reserves_total,
      total_liabilities:           epoch.total_liabilities,
      liquid_assets_total:         epoch.liquid_assets_total,
      near_term_liabilities_total: epoch.near_term_liabilities_total,
      capital_backed:              epoch.capital_backed,
      liquidity_ready:             epoch.liquidity_ready,
      jurisdiction,
      epoch_id:                    epoch.epoch_id,
      marketproof_status:          marketproofStatus,
    },
    reason_codes:    deriveReasonCodes(epoch.capital_backed, epoch.liquidity_ready),
    timestamp:       epoch.timestamp,
    bundle_hash:     epoch.proof_hash,
    anchor_metadata: buildAnchorMetadata(anchorInput),
  };
}
