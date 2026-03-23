import { buildLiabilityState } from "./liability_tree.js";
import { buildReserveState } from "./reserve_snapshot.js";
import { evaluateFinancialHealth } from "./health_status.js";
import { buildEpochMetadata } from "./epoch_manager.js";
import { computeProofHash } from "../proofs/proof_hash.js";
import type { SolvencyEpochObject } from "../types/epoch.js";
import type { EpochConfig } from "../types/inputs.js";

const DEFAULT_ENTITY_ID = "compliledger-entity-01";
const DEFAULT_ADAPTER_VERSION = "algorand-adapter-v1";

interface BuildEpochOptions {
  entityId?: string;
  liabilitiesPath: string;
  reservesPath: string;
  config?: EpochConfig;
}

/**
 * Builds the canonical SolvencyProof epoch object end-to-end.
 *
 * Orchestrates:
 *  1. Liability state  (Merkle root + totals)
 *  2. Reserve state    (Merkle root + snapshot hash + totals)
 *  3. Health evaluation
 *  4. Epoch metadata   (epoch_id, timestamp, valid_until)
 *  5. Proof hash       (deterministic SHA-256 commitment)
 */
export function buildSolvencyEpochObject(opts: BuildEpochOptions): SolvencyEpochObject {
  const {
    entityId = DEFAULT_ENTITY_ID,
    liabilitiesPath,
    reservesPath,
    config,
  } = opts;

  const liabilityState = buildLiabilityState(liabilitiesPath);
  const reserveState = buildReserveState(reservesPath);
  const health = evaluateFinancialHealth({
    reserves_total: reserveState.reserves_total,
    total_liabilities: liabilityState.total_liabilities,
    liquid_assets_total: reserveState.liquid_assets_total,
    near_term_liabilities_total: liabilityState.near_term_liabilities_total,
  });
  const epochMeta = buildEpochMetadata(config);

  // Build the object without proof_hash first
  const partial: Omit<SolvencyEpochObject, "proof_hash"> = {
    entity_id: entityId,
    epoch_id: epochMeta.epoch_id,
    liability_root: liabilityState.liability_root,
    reserve_root: reserveState.reserve_root,
    reserve_snapshot_hash: reserveState.reserve_snapshot_hash,
    reserves_total: reserveState.reserves_total,
    total_liabilities: liabilityState.total_liabilities,
    near_term_liabilities_total: liabilityState.near_term_liabilities_total,
    liquid_assets_total: reserveState.liquid_assets_total,
    capital_backed: health.capital_backed,
    liquidity_ready: health.liquidity_ready,
    health_status: health.health_status,
    timestamp: epochMeta.timestamp,
    valid_until: epochMeta.valid_until,
    adapter_version: config?.adapter_version ?? DEFAULT_ADAPTER_VERSION,
    source_type: "backend",
  };

  const proof_hash = computeProofHash(partial as SolvencyEpochObject);

  return { ...partial, proof_hash };
}
