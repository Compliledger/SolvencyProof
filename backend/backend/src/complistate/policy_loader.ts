/**
 * policy_loader.ts
 *
 * CompliState — default policy definition and loader utility.
 *
 * The DEFAULT_POLICY represents a baseline GLOBAL ruleset at v1.0.0.
 * Call loadPolicy() to obtain a policy, optionally overriding individual
 * fields for testing or jurisdiction-specific deployments.
 */

import type { CompliPolicy } from "./policy_types.js";

// ============================================================
// DEFAULT POLICY
// ============================================================

/**
 * Baseline compliance policy applied when no override is provided.
 *
 * Rules:
 *  - Reserves must be ≥ 100 % of total liabilities  (reserve ratio 1.0)
 *  - Liquid assets must be ≥ 100 % of near-term liabilities  (liquidity ratio 1.0)
 *  - Capital ratio requirement is 8 %  (capital ratio 0.08)
 *  - Freshness window: 1 hour (3 600 000 ms)
 */
export const DEFAULT_POLICY: CompliPolicy = {
  policy_version: "1.0.0",
  jurisdiction: "GLOBAL",
  reserve_rules: {
    min_reserve_ratio: 1.0,
    description: "Reserves must fully cover total liabilities (100 % reserve ratio).",
  },
  liquidity_rules: {
    min_liquidity_ratio: 1.0,
    description: "Liquid assets must fully cover near-term liabilities (100 % liquidity ratio).",
  },
  capital_rules: {
    min_capital_ratio: 0.08,
    description: "Net capital must be at least 8 % of total risk-weighted liabilities.",
  },
  freshness_window_ms: 3_600_000, // 1 hour
};

// ============================================================
// LOADER
// ============================================================

/**
 * Returns the active CompliPolicy for an evaluation run.
 *
 * Starts from DEFAULT_POLICY and deep-merges any provided overrides so
 * callers can patch individual rule fields without replacing the full object.
 *
 * @param overrides - Partial policy fields to override.  Nested rule objects
 *                    are shallow-merged so partial rule updates work correctly.
 * @returns Resolved CompliPolicy ready for evaluation.
 */
export function loadPolicy(overrides?: Partial<CompliPolicy>): CompliPolicy {
  if (!overrides) {
    return { ...DEFAULT_POLICY };
  }

  return {
    ...DEFAULT_POLICY,
    ...overrides,
    reserve_rules: {
      ...DEFAULT_POLICY.reserve_rules,
      ...(overrides.reserve_rules ?? {}),
    },
    liquidity_rules: {
      ...DEFAULT_POLICY.liquidity_rules,
      ...(overrides.liquidity_rules ?? {}),
    },
    capital_rules: {
      ...DEFAULT_POLICY.capital_rules,
      ...(overrides.capital_rules ?? {}),
    },
  };
}
