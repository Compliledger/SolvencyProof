import type { SolvencyEpochObject } from "../types/epoch.js";

/**
 * The ordered list of fields included in the proof_hash computation.
 * Field order is intentionally fixed and documented here so changes are
 * explicit and traceable.
 *
 * proof_hash is excluded to avoid circularity.
 * source_type is excluded because it is a constant.
 * adapter_version is excluded because it identifies tooling, not state.
 */
export const PROOF_HASH_FIELDS: ReadonlyArray<keyof SolvencyEpochObject> = [
  "entity_id",
  "epoch_id",
  "liability_root",
  "reserve_root",
  "reserve_snapshot_hash",
  "reserves_total",
  "total_liabilities",
  "near_term_liabilities_total",
  "liquid_assets_total",
  "capital_backed",
  "liquidity_ready",
  "health_status",
  "timestamp",
  "valid_until",
] as const;

/**
 * Returns the subset of epoch object fields used for hashing, in canonical order.
 */
export function extractHashableFields(
  epoch: SolvencyEpochObject
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of PROOF_HASH_FIELDS) {
    result[field] = epoch[field];
  }
  return result;
}
