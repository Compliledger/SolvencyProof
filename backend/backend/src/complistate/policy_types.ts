/**
 * policy_types.ts
 *
 * CompliState — type definitions for the governance policy that governs
 * SolvencyProof evaluations.
 *
 * A CompliPolicy is a versioned, jurisdiction-scoped ruleset.  It is loaded
 * once per evaluation run and its deterministic hash is embedded in every
 * proof artifact so verifiers can reproduce the exact rule set that produced
 * a given decision.
 */

// ============================================================
// RULE INTERFACES
// ============================================================

/** Reserve adequacy rule — entity reserves must cover total liabilities by at least this ratio. */
export interface ReserveRule {
  /** Minimum ratio of reserves to total liabilities (e.g. 1.0 = 100 %). */
  min_reserve_ratio: number;
  description?: string;
}

/** Near-term liquidity rule — liquid assets must cover near-term liabilities. */
export interface LiquidityRule {
  /** Minimum ratio of liquid assets to near-term liabilities (e.g. 1.0 = 100 %). */
  min_liquidity_ratio: number;
  description?: string;
}

/** Capital adequacy rule — capital buffer requirement. */
export interface CapitalRule {
  /** Minimum ratio of net capital to total risk-weighted liabilities (e.g. 0.08 = 8 %). */
  min_capital_ratio: number;
  description?: string;
}

// ============================================================
// POLICY
// ============================================================

/**
 * Versioned, jurisdiction-scoped compliance policy.
 *
 * This object is the single source of truth for the ruleset applied
 * during a SolvencyProof evaluation.  Its content is hashed deterministically
 * so downstream verifiers can confirm which rules were in effect.
 */
export interface CompliPolicy {
  /** Semver-style policy version identifier (e.g. "1.0.0"). */
  policy_version: string;
  /**
   * Jurisdiction code this policy applies to (e.g. "GLOBAL", "EU-MiCA", "US-NY").
   * Used as part of the policy lineage string embedded in proof artifacts.
   */
  jurisdiction: string;
  /** Reserve adequacy rules. */
  reserve_rules: ReserveRule;
  /** Liquidity readiness rules. */
  liquidity_rules: LiquidityRule;
  /** Capital adequacy rules. */
  capital_rules: CapitalRule;
  /**
   * How long (milliseconds) a generated epoch is considered fresh.
   * Mirrors EpochConfig.freshness_window_ms and drives valid_until computation.
   */
  freshness_window_ms: number;
}
