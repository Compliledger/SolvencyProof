/**
 * reason_codes.ts
 *
 * Canonical MarketProof reason code constants.
 *
 * Positive codes (e.g. ENTITY_ADMITTED) signal a passing check.
 * Negative codes (NOT_ prefix) signal a failing check.
 *
 * These codes appear in AdmissionResult.reason_codes and are merged into
 * the UniversalProofArtifact reason_codes array at the start of the list.
 */

export const REASON_CODES = {
  /** Entity identifier is non-empty and matches the expected format. */
  ENTITY_ADMITTED: "ENTITY_ADMITTED",
  /** Entity identifier is missing, empty, or contains invalid characters. */
  NOT_ENTITY_ADMITTED: "NOT_ENTITY_ADMITTED",

  /** Reserve sources are present and include at least one liquid entry. */
  RESERVE_SOURCES_ADMITTED: "RESERVE_SOURCES_ADMITTED",
  /** Reserve sources are absent or contain no liquid entry. */
  NOT_RESERVE_SOURCES_ADMITTED: "NOT_RESERVE_SOURCES_ADMITTED",

  /** Liability inputs are present and contain at least one positive balance. */
  LIABILITY_INPUTS_ADMITTED: "LIABILITY_INPUTS_ADMITTED",
  /** Liability inputs are absent or all balances are zero. */
  NOT_LIABILITY_INPUTS_ADMITTED: "NOT_LIABILITY_INPUTS_ADMITTED",
} as const;

/** Union of all valid MarketProof reason code strings. */
export type MarketProofReasonCode = (typeof REASON_CODES)[keyof typeof REASON_CODES];
