import { buildLiabilityState } from "./liability_tree.js";
import { buildReserveState } from "./reserve_snapshot.js";
import { evaluateFinancialHealth } from "./health_status.js";
import { buildEpochMetadata } from "./epoch_manager.js";
import { computeProofHash } from "../proofs/proof_hash.js";
import { parseLiabilitiesCSV } from "../connectors/liabilities_csv.js";
import { parseReservesJSON } from "../connectors/reserves_json.js";
import { evaluateAdmission } from "../marketproof/admission_evaluator.js";
import type { SolvencyEpochObject } from "../types/epoch.js";
import type { EpochConfig } from "../types/inputs.js";
import type { HealthEvaluation } from "../types/health.js";

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
 *  1. MarketProof admission check (entity, reserves, liabilities)
 *  2. Liability state  (Merkle root + totals)
 *  3. Reserve state    (Merkle root + snapshot hash + totals)
 *  4. Health evaluation  — skipped when MarketProof returns NOT_ADMITTED
 *  5. Epoch metadata   (epoch_id, timestamp, valid_until)
 *  6. Proof hash       (deterministic SHA-256 commitment)
 */
export function buildSolvencyEpochObject(opts: BuildEpochOptions): SolvencyEpochObject {
  const {
    entityId = DEFAULT_ENTITY_ID,
    liabilitiesPath,
    reservesPath,
    config,
  } = opts;

  // ── Step 1: MarketProof admission check ────────────────────────────────────
  // Parse raw data so the admission evaluator can inspect the entries.
  const liabilityEntries = parseLiabilitiesCSV(liabilitiesPath);
  const reserveEntries = parseReservesJSON(reservesPath);

  const admission = evaluateAdmission({
    entity_id: entityId,
    reserve_entries: reserveEntries,
    liability_entries: liabilityEntries,
  });

  // ── Step 2 & 3: Build intermediate states ─────────────────────────────────
  const liabilityState = buildLiabilityState(liabilitiesPath);
  const reserveState = buildReserveState(reservesPath);

  // ── Step 4: Financial evaluation — only when admitted ─────────────────────
  let health: HealthEvaluation;
  if (admission.marketproof_status === "ADMITTED") {
    health = evaluateFinancialHealth({
      reserves_total: reserveState.reserves_total,
      total_liabilities: liabilityState.total_liabilities,
      liquid_assets_total: reserveState.liquid_assets_total,
      near_term_liabilities_total: liabilityState.near_term_liabilities_total,
    });
  } else {
    // Financial checks skipped; default to the most conservative state.
    health = { capital_backed: false, liquidity_ready: false, health_status: "CRITICAL" };
  }

  const epochMeta = buildEpochMetadata(config);

  // ── Step 5: Assemble canonical epoch object ────────────────────────────────
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
    marketproof_status: admission.marketproof_status,
    marketproof_reason_codes: admission.reason_codes,
  };

  // ── Step 6: Compute proof hash ─────────────────────────────────────────────
  const proof_hash = computeProofHash(partial as SolvencyEpochObject);

  return { ...partial, proof_hash };
}
