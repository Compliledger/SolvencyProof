/**
 * admission_evaluator.ts
 *
 * MarketProof admission evaluator.
 *
 * Determines whether an entity, its reserve sources, and its liability inputs
 * are admissible before the financial evaluation pipeline executes.
 *
 * Flow:
 *   1. evaluateEntityAdmission       – entity_id format check
 *   2. evaluateReserveSourcesAdmission – reserve entries presence + liquidity check
 *   3. evaluateLiabilityInputsAdmission – liability entries presence + balance check
 *
 * All three checks must pass for marketproof_status to be ADMITTED.
 * If any check fails the financial evaluation pipeline is skipped.
 */

import type { ReserveEntry, LiabilityEntry } from "../types/inputs.js";
import type { AdmissionInput, AdmissionResult } from "./admission_types.js";
import { REASON_CODES } from "./reason_codes.js";

/**
 * Valid entity_id pattern.
 * Allows alphanumeric characters, hyphens, and underscores.
 * Examples: "compliledger-entity-01", "entity_A", "firm123"
 */
const ENTITY_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

// ============================================================
// INDIVIDUAL CHECK FUNCTIONS
// ============================================================

/**
 * Evaluates whether the entity_id is admissible.
 *
 * An entity is admitted when its identifier is non-empty and contains only
 * alphanumeric characters, hyphens, or underscores.
 */
export function evaluateEntityAdmission(entity_id: string): boolean {
  const trimmed = entity_id.trim();
  return trimmed.length > 0 && ENTITY_ID_PATTERN.test(trimmed);
}

/**
 * Evaluates whether the reserve sources are admissible.
 *
 * Reserve sources are admitted when:
 *  - At least one entry is present.
 *  - At least one entry is marked as liquid (required for liquidity evaluation).
 */
export function evaluateReserveSourcesAdmission(reserves: ReserveEntry[]): boolean {
  if (reserves.length === 0) return false;
  return reserves.some((r) => r.is_liquid);
}

/**
 * Evaluates whether the liability inputs are admissible.
 *
 * Liability inputs are admitted when:
 *  - At least one entry is present.
 *  - At least one entry has a positive balance.
 */
export function evaluateLiabilityInputsAdmission(liabilities: LiabilityEntry[]): boolean {
  if (liabilities.length === 0) return false;
  return liabilities.some((l) => l.balance > 0);
}

// ============================================================
// COMPOSITE EVALUATOR
// ============================================================

/**
 * Runs the full MarketProof admission evaluation for an epoch's inputs.
 *
 * Executes all three admission checks and aggregates results into a single
 * AdmissionResult. All three checks must pass for the entity to be ADMITTED.
 * Each failing check contributes a NOT_-prefixed reason code to the result.
 *
 * @param input - Parsed entity, reserve, and liability inputs.
 * @returns AdmissionResult with marketproof_status and reason_codes.
 */
export function evaluateAdmission(input: AdmissionInput): AdmissionResult {
  const entityAdmitted = evaluateEntityAdmission(input.entity_id);
  const reservesAdmitted = evaluateReserveSourcesAdmission(input.reserve_entries);
  const liabilitiesAdmitted = evaluateLiabilityInputsAdmission(input.liability_entries);

  const reason_codes: string[] = [
    entityAdmitted
      ? REASON_CODES.ENTITY_ADMITTED
      : REASON_CODES.NOT_ENTITY_ADMITTED,
    reservesAdmitted
      ? REASON_CODES.RESERVE_SOURCES_ADMITTED
      : REASON_CODES.NOT_RESERVE_SOURCES_ADMITTED,
    liabilitiesAdmitted
      ? REASON_CODES.LIABILITY_INPUTS_ADMITTED
      : REASON_CODES.NOT_LIABILITY_INPUTS_ADMITTED,
  ];

  const marketproof_status =
    entityAdmitted && reservesAdmitted && liabilitiesAdmitted
      ? "ADMITTED"
      : "NOT_ADMITTED";

  return { marketproof_status, reason_codes };
}
