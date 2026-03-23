import { parseLiabilitiesCSV } from "../connectors/liabilities_csv.js";
import { buildMerkleTree } from "../utils/merkle.js";
import type { LiabilityState } from "../types/epoch.js";

/**
 * Builds the complete liability state from a CSV file.
 *
 * - Parses and validates all rows
 * - Computes total_liabilities
 * - Computes liability_root (Merkle root over user_id + balance leaves)
 * - Sets near_term_liabilities_total = total_liabilities
 *
 * Future: near_term_liabilities_total can be scoped to a maturity bucket
 * by adding a `maturity_date` column to the CSV and filtering rows here.
 */
export function buildLiabilityState(inputPath: string): LiabilityState {
  const entries = parseLiabilitiesCSV(inputPath);

  // Convert to the format expected by the existing Merkle utility
  const merkleEntries = entries.map((e) => ({
    userId: e.user_id,
    balance: BigInt(e.balance),
  }));

  const tree = buildMerkleTree(merkleEntries);

  const total_liabilities = entries.reduce((sum, e) => sum + e.balance, 0);

  return {
    liability_root: tree.root,
    total_liabilities,
    // Placeholder: equals total for now; replace with maturity-filtered sum later
    near_term_liabilities_total: total_liabilities,
    leaf_count: entries.length,
  };
}
