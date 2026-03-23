/**
 * Four-state health status derived from capital backing and liquidity readiness.
 *
 * HEALTHY             – capital_backed && liquidity_ready
 * LIQUIDITY_STRESSED  – capital_backed && !liquidity_ready
 * UNDERCOLLATERALIZED – !capital_backed && liquidity_ready
 * CRITICAL            – !capital_backed && !liquidity_ready
 */
export type HealthStatus =
  | "HEALTHY"
  | "LIQUIDITY_STRESSED"
  | "UNDERCOLLATERALIZED"
  | "CRITICAL";

export interface HealthEvaluation {
  capital_backed: boolean;
  liquidity_ready: boolean;
  health_status: HealthStatus;
}

export interface HealthInput {
  reserves_total: number;
  total_liabilities: number;
  liquid_assets_total: number;
  near_term_liabilities_total: number;
}
