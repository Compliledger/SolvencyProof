/**
 * Liquidity readiness evaluation.
 *
 * An entity is liquidity-ready when its liquid assets are sufficient to cover
 * near-term obligations.
 */
export function evaluateLiquidityReadiness(
  liquid_assets_total: number,
  near_term_liabilities_total: number
): boolean {
  return liquid_assets_total >= near_term_liabilities_total;
}
