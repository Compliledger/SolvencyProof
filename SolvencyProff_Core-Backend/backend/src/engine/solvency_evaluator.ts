/**
 * Capital backing evaluation.
 *
 * An entity is capital-backed when its total reserves are sufficient to cover
 * all outstanding liabilities.
 */
export function evaluateCapitalBacking(
  reserves_total: number,
  total_liabilities: number
): boolean {
  return reserves_total >= total_liabilities;
}
