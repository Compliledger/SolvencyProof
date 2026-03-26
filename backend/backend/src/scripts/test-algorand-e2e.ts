/**
 * test-algorand-e2e.ts — Algorand Testnet End-to-End Integration Script
 *
 * Proves the full SolvencyProof → Algorand testnet pipeline in one run:
 *
 *   1. Load input data (liabilities.csv + reserves.json)
 *   2. Build canonical SolvencyEpochObject
 *   3. Map to AlgorandAdapterPayload
 *   4. Submit epoch to Algorand testnet via the real adapter client
 *   5. Fetch latest on-chain state
 *   6. Fetch specific epoch record
 *   7. Verify the stored on-chain record
 *   8. Print health status and freshness
 *
 * Usage:
 *   pnpm run test:algorand:e2e
 *
 * Required env vars:
 *   ALGORAND_ADAPTER_ENABLED=true
 *   ALGORAND_APP_ID          — deployed SolventRegistry contract application ID
 *   ALGO_MNEMONIC            — 25-word Algorand mnemonic (funded testnet account)
 *
 * Optional env vars:
 *   ALGORAND_ALGOD_URL       — defaults to https://testnet-api.algonode.cloud
 *   ALGORAND_ALGOD_TOKEN     — defaults to "" (public node)
 *   ALGORAND_ALGOD_PORT      — defaults to 443
 *   ALGORAND_NETWORK         — defaults to "testnet"
 *   ENTITY_ID                — entity identifier (defaults to "compliledger-entity-01")
 *
 * Set READ_ONLY=true to skip submission and only test the read path.
 */

import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { buildSolvencyEpochObject } from "../engine/epoch_builder.js";
import { toAlgorandSolventRegistryPayload } from "../algorand/adapter_payload.js";
import { toUniversalProofArtifact } from "../types/proof_artifact.js";
import { loadAlgorandAdapterConfig } from "../algorand/adapter_config.js";
import { createAlgorandAdapterRealClient } from "../algorand/algorand_adapter_real_client.js";
import type { SubmitEpochResult } from "../algorand/adapter_types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../../.env") });

const DATA_DIR    = path.resolve(__dirname, "../../../../data");
const READ_ONLY   = process.env.READ_ONLY === "true";
const ENTITY_ID   = process.env.ENTITY_ID ?? "compliledger-entity-01";

// ============================================================
// HELPERS
// ============================================================

function banner(text: string): void {
  const line = "═".repeat(56);
  console.log(`\n╔${line}╗`);
  console.log(`║  ${text.padEnd(54)}║`);
  console.log(`╚${line}╝\n`);
}

function section(text: string): void {
  console.log(`\n── ${text} ${"─".repeat(Math.max(0, 52 - text.length))}`);
}

function kv(key: string, value: unknown): void {
  console.log(`  ${(key + ":").padEnd(30)} ${String(value)}`);
}

// ============================================================
// MAIN
// ============================================================

async function main(): Promise<void> {
  banner("SolvencyProof — Algorand Testnet E2E");

  // ── Step 0: Validate env ──────────────────────────────────
  section("Step 0: Validate environment");

  if (process.env.ALGORAND_ADAPTER_ENABLED !== "true") {
    console.error(
      "❌  ALGORAND_ADAPTER_ENABLED is not set to 'true'.\n" +
        "    Set the following env vars before running this script:\n" +
        "      ALGORAND_ADAPTER_ENABLED=true\n" +
        "      ALGORAND_APP_ID=<deployed app id>\n" +
        "      ALGO_MNEMONIC=<25-word mnemonic>"
    );
    process.exit(1);
  }

  const config = loadAlgorandAdapterConfig();

  kv("Network",         config.network);
  kv("Algod URL",       config.algodUrl);
  kv("App ID",          config.appId.toString());
  kv("Entity ID",       ENTITY_ID);
  kv("Has signer",      config.mnemonic ? "YES" : "NO (read-only)");
  kv("Read-only mode",  READ_ONLY ? "YES (submission skipped)" : "NO");

  if (!READ_ONLY && !config.mnemonic) {
    console.error(
      "\n❌  ALGO_MNEMONIC is required for submission (or set READ_ONLY=true)."
    );
    process.exit(1);
  }

  const adapterClient = createAlgorandAdapterRealClient(config);

  // ── Step 1: Build epoch ───────────────────────────────────
  section("Step 1: Build epoch from local input data");

  const liabilitiesPath = path.join(DATA_DIR, "liabilities.csv");
  const reservesPath    = path.join(DATA_DIR, "reserves.json");

  kv("Liabilities", liabilitiesPath);
  kv("Reserves",    reservesPath);

  const epoch = buildSolvencyEpochObject({
    entityId: ENTITY_ID,
    liabilitiesPath,
    reservesPath,
  });

  kv("Epoch ID",          epoch.epoch_id);
  kv("Health Status",     epoch.health_status);
  kv("Capital Backed",    epoch.capital_backed ? "✅ YES" : "❌ NO");
  kv("Liquidity Ready",   epoch.liquidity_ready ? "✅ YES" : "❌ NO");
  kv("Proof Hash",        epoch.proof_hash);

  // ── Step 2: Build universal proof artifact ────────────────
  section("Step 2: Build universal proof artifact");

  const proofArtifact = toUniversalProofArtifact(epoch);
  kv("Module",            proofArtifact.module);
  kv("Decision Result",   `health_status=${proofArtifact.decision_result.health_status} capital_backed=${proofArtifact.decision_result.capital_backed} liquidity_ready=${proofArtifact.decision_result.liquidity_ready}`);
  kv("Reason Codes",      proofArtifact.reason_codes.join(", "));
  kv("Bundle Hash",       proofArtifact.bundle_hash);

  // ── Step 3: Map to adapter payload ───────────────────────
  section("Step 3: Map to Algorand adapter payload");

  const adapterPayload = toAlgorandSolventRegistryPayload(epoch);
  kv("Entity ID",         adapterPayload.entity_id);
  kv("Epoch ID",          adapterPayload.epoch_id);
  kv("Reserves Total",    adapterPayload.reserves_total);
  kv("Health Status",     adapterPayload.health_status);
  kv("Adapter Version",   adapterPayload.adapter_version);

  // ── Step 4: Submit to Algorand testnet ────────────────────
  let submitReceipt: SubmitEpochResult | null = null;

  if (!READ_ONLY) {
    section("Step 4: Submit epoch to Algorand testnet");

    console.log("  ⏳ Submitting epoch…");
    submitReceipt = await adapterClient.submitEpoch(adapterPayload);

    kv("✅ Tx ID",         submitReceipt.txId);
    kv("Epoch ID",         submitReceipt.epoch_id);
    kv("Confirmed At",     submitReceipt.confirmed_at);
    kv("App ID",           config.appId.toString());
    kv("Network",          config.network);
  } else {
    section("Step 4: SKIPPED (READ_ONLY=true)");
    console.log("  Submission skipped — using existing on-chain state for reads.");
  }

  // ── Step 5: Fetch latest state ────────────────────────────
  section("Step 5: Fetch latest on-chain state");

  const latestState = await adapterClient.getLatestState(ENTITY_ID);

  if (!latestState) {
    console.log(
      "  ℹ️  No on-chain state found for entity. " +
        "This is expected on first run or if no epoch has been submitted yet."
    );
  } else {
    kv("Entity ID",       latestState.entity_id);
    kv("Epoch ID",        latestState.epoch_id);
    kv("Health Status",   latestState.health_status);
    kv("Timestamp",       new Date(latestState.timestamp * 1000).toISOString());
    kv("Valid Until",     new Date(latestState.valid_until * 1000).toISOString());
    kv("Anchored At",     latestState.anchored_at
        ? new Date(latestState.anchored_at * 1000).toISOString()
        : "(not set)");
    kv("Proof Hash",      latestState.proof_hash);
  }

  // ── Step 6: Fetch specific epoch record ───────────────────
  section("Step 6: Fetch specific epoch record");

  const targetEpochId = submitReceipt?.epoch_id ?? epoch.epoch_id;
  const epochRecord = await adapterClient.getEpochRecord(ENTITY_ID, targetEpochId);

  if (!epochRecord) {
    console.log(`  ℹ️  No on-chain record for epoch_id=${targetEpochId}.`);
  } else {
    kv("Entity ID",       epochRecord.entity_id);
    kv("Epoch ID",        epochRecord.epoch_id);
    kv("Health Status",   epochRecord.health_status);
    kv("Liability Root",  epochRecord.liability_root);
    kv("Reserve Root",    epochRecord.reserve_root);
    kv("Proof Hash",      epochRecord.proof_hash);
  }

  // ── Step 7: Verify stored record ─────────────────────────
  section("Step 7: Verify stored on-chain record");

  const verifyResult = await adapterClient.verifyStoredRecord(ENTITY_ID, targetEpochId);

  kv("Verified",    verifyResult.verified ? "✅ YES" : "❌ NO");
  kv("Entity ID",   verifyResult.entity_id);
  kv("Epoch ID",    verifyResult.epoch_id);
  kv("Message",     verifyResult.message);

  // ── Step 8: Health and freshness ─────────────────────────
  section("Step 8: Health status and freshness");

  const healthStatus = await adapterClient.getHealthStatus(ENTITY_ID);
  const isHealthy    = await adapterClient.isHealthy(ENTITY_ID);
  const isFresh      = await adapterClient.isFresh(ENTITY_ID);

  if (!healthStatus) {
    console.log("  ℹ️  No on-chain health status — entity has not been submitted yet.");
  } else {
    kv("Health Status",  healthStatus.health_status);
    kv("Is Healthy",     isHealthy ? "✅ YES" : "❌ NO");
    kv("Is Fresh",       isFresh   ? "✅ YES" : "❌ NO");
    kv("Valid Until",    new Date(healthStatus.valid_until * 1000).toISOString());
  }

  // ── Summary ───────────────────────────────────────────────
  banner("E2E Summary");

  kv("Entity ID",        ENTITY_ID);
  kv("Epoch ID",         targetEpochId);
  kv("Tx ID",            submitReceipt?.txId ?? "(not submitted)");
  kv("App ID",           config.appId.toString());
  kv("Anchored At",      submitReceipt?.confirmed_at ?? "(not submitted)");
  kv("Health Status",    healthStatus?.health_status ?? latestState?.health_status ?? "UNKNOWN");
  kv("Is Healthy",       String(isHealthy));
  kv("Verify Result",    verifyResult.verified ? "✅ VERIFIED" : "❌ NOT VERIFIED");

  console.log("\n✅ E2E complete.\n");
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\n❌ E2E failed: ${message}`);
  if (err instanceof Error && err.stack) {
    console.error(err.stack);
  }
  process.exit(1);
});
