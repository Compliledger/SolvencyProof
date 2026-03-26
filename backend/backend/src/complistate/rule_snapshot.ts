/**
 * rule_snapshot.ts
 *
 * CompliState — deterministic rule snapshot utility.
 *
 * A RuleSnapshot is a lightweight, verifiable summary of the CompliPolicy
 * that was active during a specific evaluation run.  It is embedded in every
 * UniversalProofArtifact so downstream verifiers can confirm exactly which
 * rules produced a given decision.
 *
 * Hash strategy (mirrors proof_hash.ts):
 *  - Algorithm : SHA-256
 *  - Input     : JSON.stringify of a canonically ordered subset of the policy
 *  - Output    : "0x" + hex digest
 *
 * Field ordering in the hash input is explicit and documented here so any
 * future change is intentional and traceable.
 */

import { createHash } from "crypto";
import type { CompliPolicy } from "./policy_types.js";

// ============================================================
// TYPES
// ============================================================

/**
 * Compact policy summary embedded in proof artifacts.
 */
export interface RuleSnapshot {
  /** policy_version from the active CompliPolicy. */
  policy_version: string;
  /**
   * Human-readable policy lineage string combining jurisdiction and version.
   * Format: "<jurisdiction>/<policy_version>" — e.g. "GLOBAL/1.0.0".
   */
  policy_lineage: string;
  /**
   * Deterministic SHA-256 commitment hash over the canonical policy fields.
   * Prefixed with "0x".
   */
  rule_snapshot_hash: string;
}

// ============================================================
// CANONICAL FIELD ORDER
// ============================================================

/**
 * Ordered list of top-level CompliPolicy fields included in the hash input.
 * Nested rule fields are included via dedicated entries below.
 *
 * Changing this order or the included fields constitutes a breaking schema change
 * and MUST be accompanied by a policy_version bump.
 */
const SNAPSHOT_HASH_FIELDS = [
  "policy_version",
  "jurisdiction",
  "freshness_window_ms",
] as const;

/** Ordered keys within reserve_rules included in the hash. */
const RESERVE_RULE_HASH_FIELDS = ["min_reserve_ratio"] as const;

/** Ordered keys within liquidity_rules included in the hash. */
const LIQUIDITY_RULE_HASH_FIELDS = ["min_liquidity_ratio"] as const;

/** Ordered keys within capital_rules included in the hash. */
const CAPITAL_RULE_HASH_FIELDS = ["min_capital_ratio"] as const;

// ============================================================
// HASH COMPUTATION
// ============================================================

/**
 * Builds a canonically ordered object from the policy fields that must be
 * stable across runs for an identical policy.
 *
 * Description fields are intentionally excluded — they are human annotations
 * and should not affect the rule commitment hash.
 */
function buildHashableSnapshot(policy: CompliPolicy): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const field of SNAPSHOT_HASH_FIELDS) {
    result[field] = policy[field];
  }

  const reserveRules: Record<string, unknown> = {};
  for (const key of RESERVE_RULE_HASH_FIELDS) {
    reserveRules[key] = policy.reserve_rules[key];
  }
  result["reserve_rules"] = reserveRules;

  const liquidityRules: Record<string, unknown> = {};
  for (const key of LIQUIDITY_RULE_HASH_FIELDS) {
    liquidityRules[key] = policy.liquidity_rules[key];
  }
  result["liquidity_rules"] = liquidityRules;

  const capitalRules: Record<string, unknown> = {};
  for (const key of CAPITAL_RULE_HASH_FIELDS) {
    capitalRules[key] = policy.capital_rules[key];
  }
  result["capital_rules"] = capitalRules;

  return result;
}

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Builds a RuleSnapshot from a CompliPolicy.
 *
 * @param policy - The active CompliPolicy for this evaluation run.
 * @returns RuleSnapshot containing policy_version, policy_lineage, and
 *          a deterministic rule_snapshot_hash.
 */
export function buildRuleSnapshot(policy: CompliPolicy): RuleSnapshot {
  const hashable = buildHashableSnapshot(policy);
  const canonical = JSON.stringify(hashable);
  const rule_snapshot_hash =
    "0x" + createHash("sha256").update(canonical, "utf8").digest("hex");

  return {
    policy_version: policy.policy_version,
    policy_lineage: `${policy.jurisdiction}/${policy.policy_version}`,
    rule_snapshot_hash,
  };
}
