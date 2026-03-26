/**
 * admission_types.ts
 *
 * Type definitions for MarketProof admission evaluation.
 *
 * MarketProof determines whether entity, reserves, and liabilities are
 * admissible before the financial evaluation pipeline runs.
 */

import type { ReserveEntry, LiabilityEntry } from "../types/inputs.js";

// ============================================================
// STATUS
// ============================================================

/** Admission status returned by the MarketProof evaluator. */
export type MarketProofStatus = "ADMITTED" | "NOT_ADMITTED";

// ============================================================
// INPUT
// ============================================================

/**
 * Inputs supplied to the MarketProof admission evaluator.
 * These are the pre-parsed data structures that will be evaluated for
 * admissibility before any financial computation takes place.
 */
export interface AdmissionInput {
  /** Reporting entity identifier. */
  entity_id: string;
  /** Pre-parsed reserve entries from the reserves data source. */
  reserve_entries: ReserveEntry[];
  /** Pre-parsed liability entries from the liabilities data source. */
  liability_entries: LiabilityEntry[];
}

// ============================================================
// RESULT
// ============================================================

/**
 * Result produced by the MarketProof admission evaluator.
 *
 * marketproof_status – ADMITTED if all checks pass; NOT_ADMITTED otherwise.
 * reason_codes       – One code per admission check (positive or NOT_-prefixed).
 */
export interface AdmissionResult {
  /** Overall admission status. */
  marketproof_status: MarketProofStatus;
  /** Machine-readable codes explaining each admission decision. */
  reason_codes: string[];
}
