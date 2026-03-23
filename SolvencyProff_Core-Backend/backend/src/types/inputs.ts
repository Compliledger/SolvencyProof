/**
 * Raw row parsed from liabilities.csv.
 * Future extension: add `maturity_bucket?: string` for time-bucketed liabilities.
 */
export interface LiabilityRow {
  user_id: string;
  balance: string;
}

/**
 * Validated, numeric liability entry used by the engine.
 */
export interface LiabilityEntry {
  user_id: string;
  balance: number;
}

/**
 * Single reserve source parsed from reserves.json.
 * is_liquid indicates whether this asset counts toward near-term liquidity.
 */
export interface ReserveEntry {
  source_id: string;
  amount: number;
  is_liquid: boolean;
}

/**
 * Configuration for epoch generation.
 */
export interface EpochConfig {
  /** Bucket size in milliseconds. Defaults to 3_600_000 (1 hour). */
  granularity_ms?: number;
  /** How long an epoch remains valid in milliseconds. Defaults to 3_600_000 (1 hour). */
  freshness_window_ms?: number;
  /** Identifier for the entity being evaluated. */
  entity_id?: string;
  /** Algorand adapter version string. */
  adapter_version?: string;
}
