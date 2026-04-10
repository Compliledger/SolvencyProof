/**
 * live-transaction.test.ts
 *
 * LIVE Algorand blockchain transaction tests.
 *
 * Replaces the legacy Ethereum/Sepolia live transaction tests with
 * Algorand-native interactions using the SolventRegistryClient and
 * the real Algorand adapter.
 *
 * Tests:
 *   1. Pre-transaction checks — node connectivity, app existence, account
 *   2. LIVE epoch submission (requires ALGO_MNEMONIC + RUN_LIVE_TX=true)
 *   3. LIVE read-only calls — box reads, health status (no gas required)
 *   4. LIVE proof verification — verify stored epoch via adapter
 *   5. Full submit proof flow — end-to-end via API
 */

import { describe, it, expect, beforeAll } from "vitest";
import algosdk from "algosdk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

import {
  SolventRegistryClient,
  createTestnetClientFromMnemonic,
  HealthStatus,
  AMOUNT_SCALE,
} from "../../../../algorand/client/registry_client.js";
import {
  HEALTH_STATUS_STRING_MAP,
} from "../../../../algorand/types/registry.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../../.env") });

const OUTPUT_DIR = path.join(__dirname, "../../../data/output");

// Algorand configuration
const ALGOD_URL = process.env.ALGORAND_ALGOD_URL || "https://testnet-api.algonode.cloud";
const ALGOD_TOKEN = process.env.ALGORAND_ALGOD_TOKEN || "";
const ALGOD_PORT = parseInt(process.env.ALGORAND_ALGOD_PORT || "443", 10);
const APP_ID_STR = process.env.ALGORAND_APP_ID || process.env.SOLVENT_REGISTRY_APP_ID || "";
const ALGO_MNEMONIC = process.env.ALGO_MNEMONIC || "";
const ENTITY_ID = process.env.ENTITY_ID || "compliledger-entity-01";

// Skip live transaction tests by default - set to true to run
const RUN_LIVE_TX = process.env.RUN_LIVE_TX === "true";

describe("LIVE Transaction Tests: Algorand Blockchain", () => {
  let algodClient: algosdk.Algodv2;
  let registryClient: SolventRegistryClient;
  let signingClient: SolventRegistryClient | null = null;
  let appId: bigint;
  let hasAppId = false;
  let hasMnemonic = false;
  let senderAddress: string;

  beforeAll(() => {
    algodClient = new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_URL, ALGOD_PORT);

    if (APP_ID_STR && APP_ID_STR !== "0") {
      appId = BigInt(APP_ID_STR);
      hasAppId = true;
      registryClient = new SolventRegistryClient({
        nodeUrl: ALGOD_URL,
        nodeToken: ALGOD_TOKEN,
        nodePort: ALGOD_PORT,
        appId,
      });

      if (ALGO_MNEMONIC && ALGO_MNEMONIC.split(" ").length === 25) {
        hasMnemonic = true;
        signingClient = createTestnetClientFromMnemonic(appId, ALGO_MNEMONIC);
        const account = algosdk.mnemonicToSecretKey(ALGO_MNEMONIC);
        senderAddress = account.addr.toString();
      }
    }
  });

  describe("1. Pre-Transaction Checks", () => {
    it("should verify Algorand TestNet is reachable", async () => {
      const status = await algodClient.status().do();
      expect(status).toBeDefined();
      expect(status.lastRound).toBeGreaterThan(0n);
      console.log(`   Algorand TestNet round: ${status.lastRound}`);
    });

    it("should verify application ID is configured", () => {
      if (!hasAppId) {
        console.log("   ALGORAND_APP_ID not set — set it in .env");
        return;
      }
      expect(appId).toBeGreaterThan(0n);
      console.log(`   SolventRegistry App ID: ${appId}`);
    });

    it("should verify signing account has ALGO balance", async () => {
      if (!hasMnemonic) {
        console.log("   ALGO_MNEMONIC not set — set it in .env for write operations");
        return;
      }

      const accountInfo = await algodClient.accountInformation(senderAddress).do();
      const balance = Number(accountInfo.amount);

      console.log(`   Wallet: ${senderAddress}`);
      console.log(`   Balance: ${(balance / 1_000_000).toFixed(6)} ALGO`);

      // Need at least 0.5 ALGO for transactions + MBR
      expect(balance).toBeGreaterThan(500_000);
    });

    it("should get current on-chain state before new submission", async () => {
      if (!hasAppId) return;

      const state = await registryClient.getLatestState(ENTITY_ID);
      if (state) {
        console.log(`   Current epoch: ${state.epoch_id}`);
        console.log(`   Health: ${HealthStatus[state.health_status]}`);
      } else {
        console.log(`   No epochs submitted yet for entity=${ENTITY_ID}`);
      }
    });
  });

  describe("2. LIVE Epoch Submission (New Transaction)", () => {
    it("should submit a NEW epoch to Algorand RIGHT NOW", { timeout: 30000 }, async () => {
      if (!RUN_LIVE_TX) {
        console.log("\n   LIVE TX SKIPPED — Set RUN_LIVE_TX=true to enable");
        console.log("   Run with: RUN_LIVE_TX=true pnpm test\n");
        return;
      }

      if (!hasAppId || !hasMnemonic || !signingClient) {
        console.log("   Missing ALGORAND_APP_ID or ALGO_MNEMONIC");
        return;
      }

      const nowUnix = BigInt(Math.floor(Date.now() / 1000));
      const epochId = `live-test-${nowUnix}`;

      const payload = {
        entity_id: ENTITY_ID,
        epoch_id: epochId,
        liability_root: "0xdeadbeef" + nowUnix.toString(16).padStart(56, "0"),
        reserve_root: "0xcafebabe" + nowUnix.toString(16).padStart(56, "0"),
        reserve_snapshot_hash: "0x" + "ab".repeat(32),
        proof_hash: "0x" + "cd".repeat(32),
        reserves_total: 1_000_000n * AMOUNT_SCALE,
        liquid_assets_total: 800_000n * AMOUNT_SCALE,
        near_term_liabilities_total: 500_000n * AMOUNT_SCALE,
        capital_backed: true,
        liquidity_ready: true,
        health_status: HealthStatus.HEALTHY,
        timestamp: nowUnix,
        valid_until: nowUnix + 86400n, // 24 hours
      };

      console.log("\n   SUBMITTING NEW EPOCH TO ALGORAND TESTNET...");
      console.log(`   Epoch ID: ${epochId}`);
      console.log(`   Entity: ${ENTITY_ID}`);
      console.log(`   Timestamp: ${new Date().toISOString()}\n`);

      const txId = await signingClient.submitEpoch(payload);

      expect(txId).toBeDefined();
      expect(txId.length).toBeGreaterThan(0);

      console.log(`   Transaction ID: ${txId}`);
      console.log(`   Explorer: https://explorer.perawallet.app/tx/${txId}/`);
      console.log("   LIVE EPOCH SUBMISSION COMPLETE!\n");
    });
  });

  describe("3. LIVE Read-Only Calls (No Gas Required)", () => {
    it("should make LIVE box reads from Algorand RIGHT NOW", async () => {
      if (!hasAppId) return;

      const startTime = Date.now();
      console.log("\n   Making LIVE Algorand box reads...\n");

      // Read latest state
      const state = await registryClient.getLatestState(ENTITY_ID);
      if (state) {
        console.log(`   getLatestState() => epoch=${state.epoch_id}`);
        console.log(`   health=${HealthStatus[state.health_status]}`);
        console.log(`   capital_backed=${state.capital_backed}`);
      } else {
        console.log(`   getLatestState() => null (no submissions yet)`);
      }

      // Read health status
      const healthStatus = await registryClient.getHealthStatus(ENTITY_ID);
      console.log(`   getHealthStatus() => ${HealthStatus[healthStatus]}`);

      // Read isHealthy
      const healthy = await registryClient.isHealthy(ENTITY_ID);
      console.log(`   isHealthy() => ${healthy}`);

      // Read epoch history
      const history = await registryClient.getEpochHistory(ENTITY_ID);
      console.log(`   getEpochHistory() => ${history.length} records`);

      const endTime = Date.now();
      console.log(`\n   Total time: ${endTime - startTime}ms (LIVE Algorand calls)`);
    });

    it("should get LIVE Algorand node data", async () => {
      console.log("\n   Getting LIVE Algorand node data...\n");

      const status = await algodClient.status().do();
      console.log(`   Latest Round: ${status.lastRound}`);
      console.log(`   Last Version: ${status.lastVersion}`);
      console.log(`   Time Since Last Round: ${status.timeSinceLastRound}ns`);
      console.log(`   Catchup Time: ${status.catchupTime}ns`);

      expect(status.lastRound).toBeGreaterThan(0n);
    });
  });

  describe("4. LIVE Proof Verification via Adapter", () => {
    it("should verify stored epoch data via adapter client", async () => {
      if (!hasAppId) return;

      const { loadAlgorandAdapterConfig } = await import("../algorand/adapter_config.js");
      const { createAlgorandAdapterRealClient } = await import("../algorand/algorand_adapter_real_client.js");

      const origEnabled = process.env.ALGORAND_ADAPTER_ENABLED;
      process.env.ALGORAND_ADAPTER_ENABLED = "true";

      try {
        const config = loadAlgorandAdapterConfig();
        const client = createAlgorandAdapterRealClient(config);

        console.log("\n   🔐 Verifying on-chain epoch data via Algorand adapter...\n");

        const startTime = Date.now();

        const state = await client.getLatestState(ENTITY_ID);
        if (state) {
          console.log(`   ✓ Epoch ID: ${state.epoch_id}`);
          console.log(`   ✓ Health: ${state.health_status}`);
          console.log(`   ✓ Capital Backed: ${state.capital_backed}`);
          console.log(`   ✓ Reserves: ${state.reserves_total}`);
        } else {
          console.log(`   ⚠️  No on-chain state for ${ENTITY_ID} — submit an epoch first`);
        }

        const healthStatus = await client.getHealthStatus(ENTITY_ID);
        if (healthStatus) {
          console.log(`   ✓ Adapter Health: ${healthStatus.health_status}`);
          console.log(`   ✓ Is Healthy: ${healthStatus.is_healthy}`);
          console.log(`   ✓ Is Fresh: ${healthStatus.is_fresh}`);
        }

        const endTime = Date.now();
        console.log(`\n   ⏱️  Verification time: ${endTime - startTime}ms\n`);
      } finally {
        if (origEnabled !== undefined) {
          process.env.ALGORAND_ADAPTER_ENABLED = origEnabled;
        } else {
          delete process.env.ALGORAND_ADAPTER_ENABLED;
        }
      }
    });
  });

  describe("5. Full Submit Proof Flow (LIVE)", () => {
    it("should run full proof submission via API", { timeout: 120000 }, async () => {
      if (!RUN_LIVE_TX) {
        console.log("\n   ⚠️  LIVE TX SKIPPED — Set RUN_LIVE_TX=true to enable");
        return;
      }

      console.log("\n   🚀 Running FULL proof submission flow...\n");

      // Check if API is available
      try {
        const healthRes = await fetch("http://localhost:3001/health");
        if (!healthRes.ok) {
          console.log("   ⚠️  API not running — start with: pnpm api:dev");
          return;
        }
      } catch {
        console.log("   ⚠️  API not running — start with: pnpm api:dev");
        return;
      }

      // Step 1: Build liabilities
      console.log("   1️⃣  Building liabilities...");
      const liabRes = await fetch("http://localhost:3001/api/liabilities/build", {
        method: "POST",
      });
      const liabData = await liabRes.json() as { message?: string };
      console.log(`      ✓ ${liabData.message || "Done"}`);

      // Step 2: Scan reserves
      console.log("   2️⃣  Scanning reserves...");
      const resRes = await fetch("http://localhost:3001/api/reserves/scan", {
        method: "POST",
      });
      const resData = await resRes.json() as { message?: string };
      console.log(`      ✓ ${resData.message || "Done"}`);

      // Step 3: Generate proof
      console.log("   3️⃣  Generating ZK proof...");
      const proofRes = await fetch("http://localhost:3001/api/proof/generate", {
        method: "POST",
      });
      const proofData = await proofRes.json() as { message?: string };
      console.log(`      ✓ ${proofData.message || "Done"}`);

      // Step 4: Submit on-chain (now uses Algorand adapter)
      console.log("   4️⃣  Submitting proof on-chain via Algorand adapter...");
      const submitRes = await fetch("http://localhost:3001/api/proof/submit", {
        method: "POST",
      });
      const submitData = await submitRes.json() as { success?: boolean; data?: { txId?: string }; error?: string };

      if (submitData.success) {
        console.log(`      ✓ TX ID: ${submitData.data?.txId}`);
        console.log("   \n   ✅ LIVE PROOF SUBMISSION COMPLETE!\n");
      } else {
        console.log(`      ⚠️  ${submitData.error || "Submission failed"}`);
      }
    });
  });
});
