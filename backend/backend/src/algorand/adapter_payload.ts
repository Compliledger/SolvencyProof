import { writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import type { SolvencyEpochObject } from "../types/epoch.js";

/**
 * Normalized payload shape for the shared compliledger-algorand-adapter.
 * Fields are serialized as strings where on-chain ABI requires it.
 *
 * Note: on-chain submission is out of scope for Phase 2 MVP.
 * This payload is written to disk and will later be picked up by the adapter.
 */
export interface AlgorandSolvencyPayload {
  entity_id: string;
  epoch_id: number;
  liability_root: string;
  reserve_root: string;
  reserve_snapshot_hash: string;
  proof_hash: string;
  reserves_total: string;
  liquid_assets_total: string;
  near_term_liabilities_total: string;
  capital_backed: boolean;
  liquidity_ready: boolean;
  health_status: string;
  timestamp: number;
  valid_until: number;
  adapter_version: string;
}

/**
 * Builds the normalized Algorand payload from a canonical SolvencyEpochObject.
 *
 * Numeric totals are coerced to strings to accommodate ABI encoding constraints
 * for large integers.
 */
export function toAlgorandSolvencyRegistryPayload(
  epoch: SolvencyEpochObject
): AlgorandSolvencyPayload {
  return {
    entity_id: epoch.entity_id,
    epoch_id: epoch.epoch_id,
    liability_root: epoch.liability_root,
    reserve_root: epoch.reserve_root,
    reserve_snapshot_hash: epoch.reserve_snapshot_hash,
    proof_hash: epoch.proof_hash,
    reserves_total: String(epoch.reserves_total),
    liquid_assets_total: String(epoch.liquid_assets_total),
    near_term_liabilities_total: String(epoch.near_term_liabilities_total),
    capital_backed: epoch.capital_backed,
    liquidity_ready: epoch.liquidity_ready,
    health_status: epoch.health_status,
    timestamp: epoch.timestamp,
    valid_until: epoch.valid_until,
    adapter_version: epoch.adapter_version,
  };
}

/**
 * Writes the Algorand payload to `data/output/latest_epoch.json`.
 */
export function writeAlgorandPayload(
  payload: AlgorandSolvencyPayload,
  outputDir: string
): void {
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  const dest = path.join(outputDir, "latest_epoch.json");
  writeFileSync(dest, JSON.stringify(payload, null, 2), "utf-8");
}
