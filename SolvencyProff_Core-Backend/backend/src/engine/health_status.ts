import { evaluateCapitalBacking } from "./solvency_evaluator.js";
import { evaluateLiquidityReadiness } from "./liquidity_evaluator.js";
import type { HealthEvaluation, HealthInput } from "../types/health.js";

/**
 * Maps the four combinations of capital_backed × liquidity_ready to a typed
 * health status string.
 *
 * | capital_backed | liquidity_ready | HealthStatus           |
 * |----------------|-----------------|------------------------|
 * | true           | true            | HEALTHY                |
 * | true           | false           | LIQUIDITY_STRESSED     |
 * | false          | true            | UNDERCOLLATERALIZED    |
 * | false          | false           | CRITICAL               |
 */
export function evaluateFinancialHealth(input: HealthInput): HealthEvaluation {
  const capital_backed = evaluateCapitalBacking(
    input.reserves_total,
    input.total_liabilities
  );
  const liquidity_ready = evaluateLiquidityReadiness(
    input.liquid_assets_total,
    input.near_term_liabilities_total
  );

  let health_status: HealthEvaluation["health_status"];
  if (capital_backed && liquidity_ready) {
    health_status = "HEALTHY";
  } else if (capital_backed && !liquidity_ready) {
    health_status = "LIQUIDITY_STRESSED";
  } else if (!capital_backed && liquidity_ready) {
    health_status = "UNDERCOLLATERALIZED";
  } else {
    health_status = "CRITICAL";
  }

  return { capital_backed, liquidity_ready, health_status };
}
