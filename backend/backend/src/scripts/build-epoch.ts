/**
 * build-epoch.ts — End-to-end CLI entrypoint for SolvencyProof backend.
 *
 * Usage:
 *   pnpm run build:epoch
 *
 * Behavior:
 *  1. Loads liabilities.csv
 *  2. Loads reserves.json
 *  3. Computes liability state (Merkle root + totals)
 *  4. Computes reserve state  (Merkle root + snapshot hash + totals)
 *  5. Evaluates capital backing and liquidity readiness
 *  6. Generates epoch metadata (epoch_id, timestamp, valid_until)
 *  7. Builds canonical epoch object
 *  8. Computes proof_hash (deterministic SHA-256 commitment)
 *  9. Builds Algorand-ready payload
 * 10. Writes payload to data/output/latest_epoch.json
 * 11. Prints a human-readable summary
 */
import path from "path";
import { fileURLToPath } from "url";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { buildSolvencyEpochObject } from "../engine/epoch_builder.js";
import {
  toAlgorandSolventRegistryPayload,
  writeAlgorandPayload,
} from "../algorand/adapter_payload.js";
import { toUniversalProofArtifact } from "../types/proof_artifact.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, "../../../data");
const OUTPUT_DIR = path.join(DATA_DIR, "output");

async function main(): Promise<void> {
  console.log("══════════════════════════════════════════════════");
  console.log("  SolvencyProof — Backend Epoch Builder");
  console.log("══════════════════════════════════════════════════\n");

  const liabilitiesPath = path.join(DATA_DIR, "liabilities.csv");
  const reservesPath = path.join(DATA_DIR, "reserves.json");

  console.log(`📄 Loading liabilities: ${liabilitiesPath}`);
  console.log(`📦 Loading reserves:    ${reservesPath}\n`);

  const epoch = buildSolvencyEpochObject({
    liabilitiesPath,
    reservesPath,
  });

  const payload = toAlgorandSolventRegistryPayload(epoch);

  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  writeAlgorandPayload(payload, OUTPUT_DIR);

  // Build and write the universal proof artifact
  const proofArtifact = toUniversalProofArtifact(epoch);
  writeFileSync(
    path.join(OUTPUT_DIR, "proof_artifact.json"),
    JSON.stringify(proofArtifact, null, 2),
    "utf-8"
  );

  // Also write full epoch object for debugging / future use
  writeFileSync(
    path.join(OUTPUT_DIR, "latest_epoch_full.json"),
    JSON.stringify(epoch, null, 2),
    "utf-8"
  );

  console.log("══════════════════════════════════════════════════");
  console.log("  EPOCH SUMMARY");
  console.log("══════════════════════════════════════════════════");
  console.log(`  Entity ID:                  ${epoch.entity_id}`);
  console.log(`  Epoch ID:                   ${epoch.epoch_id}`);
  console.log(`  Timestamp:                  ${new Date(epoch.timestamp * 1000).toISOString()}`);
  console.log(`  Valid Until:                ${new Date(epoch.valid_until * 1000).toISOString()}`);
  console.log("──────────────────────────────────────────────────");
  console.log(`  MarketProof Status:         ${epoch.marketproof_status ?? "ADMITTED"}`);
  if (epoch.marketproof_reason_codes && epoch.marketproof_reason_codes.length > 0) {
    console.log(`  MarketProof Codes:          ${epoch.marketproof_reason_codes.join(", ")}`);
  }
  console.log("──────────────────────────────────────────────────");
  console.log(`  Reserves Total:             ${epoch.reserves_total.toLocaleString()}`);
  console.log(`  Total Liabilities:          ${epoch.total_liabilities.toLocaleString()}`);
  console.log(`  Liquid Assets Total:        ${epoch.liquid_assets_total.toLocaleString()}`);
  console.log(`  Near-Term Liabilities:      ${epoch.near_term_liabilities_total.toLocaleString()}`);
  console.log("──────────────────────────────────────────────────");
  console.log(`  Capital Backed:             ${epoch.capital_backed ? "✅ YES" : "❌ NO"}`);
  console.log(`  Liquidity Ready:            ${epoch.liquidity_ready ? "✅ YES" : "❌ NO"}`);
  console.log(`  Health Status:              ${epoch.health_status}`);
  console.log("──────────────────────────────────────────────────");
  console.log(`  Liability Root:             ${epoch.liability_root}`);
  console.log(`  Reserve Root:               ${epoch.reserve_root}`);
  console.log(`  Reserve Snapshot Hash:      ${epoch.reserve_snapshot_hash}`);
  console.log(`  Proof Hash:                 ${epoch.proof_hash}`);
  console.log("══════════════════════════════════════════════════\n");
  console.log(`✅ Payload written to: ${path.join(OUTPUT_DIR, "latest_epoch.json")}`);
  console.log(`✅ Full epoch written to: ${path.join(OUTPUT_DIR, "latest_epoch_full.json")}`);
  console.log(`✅ Proof artifact written to: ${path.join(OUTPUT_DIR, "proof_artifact.json")}`);
}

main().catch((err: Error) => {
  console.error("❌ Fatal error:", err.message);
  process.exit(1);
});
