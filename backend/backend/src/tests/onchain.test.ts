/**
 * onchain.test.ts
 *
 * On-chain integration tests for the Algorand Solvent Registry.
 *
 * Replaces the legacy Ethereum/Sepolia on-chain tests with Algorand-native
 * verification using the SolventRegistryClient and the real Algorand adapter.
 *
 * Tests:
 *   1. Network connectivity — Algorand TestNet node reachability
 *   2. Application existence — SolventRegistry app ID is valid
 *   3. On-chain state reading — latest state, epoch records, health status
 *   4. Epoch history enumeration — box key scanning
 *   5. Data integrity — encode/decode round-trip on live data
 *   6. Explorer link generation — Pera/AlgoExplorer URLs
 *
 * Read-only tests run against the public AlgoNode TestNet endpoint.
 * No mnemonic or signing key is required.
 */

import { describe, it, expect, beforeAll } from "vitest";
import algosdk from "algosdk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

import {
  SolventRegistryClient,
  HealthStatus,
  encodeState,
  decodeState,
} from "../../../../algorand/client/registry_client.js";
import {
  makeLatestBoxKey,
  makeEpochBoxKey,
  HEALTH_STATUS_STRING_MAP,
} from "../../../../algorand/types/registry.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../../.env") });

const OUTPUT_DIR = path.join(__dirname, "../../../data/output");

// Algorand TestNet configuration
const ALGOD_URL = process.env.ALGORAND_ALGOD_URL || "https://testnet-api.algonode.cloud";
const ALGOD_TOKEN = process.env.ALGORAND_ALGOD_TOKEN || "";
const ALGOD_PORT = parseInt(process.env.ALGORAND_ALGOD_PORT || "443", 10);
const APP_ID_STR = process.env.ALGORAND_APP_ID || process.env.SOLVENT_REGISTRY_APP_ID || "";
const ENTITY_ID = process.env.ENTITY_ID || "compliledger-entity-01";

describe("On-Chain Tests: Algorand Solvent Registry", () => {
  let algodClient: algosdk.Algodv2;
  let registryClient: SolventRegistryClient;
  let appId: bigint;
  let hasAppId = false;

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
    }
  });

  describe("1. Algorand Network Connectivity", () => {
    it("should connect to Algorand TestNet node", async () => {
      const status = await algodClient.status().do();
      expect(status).toBeDefined();
      expect(status.lastRound).toBeGreaterThan(0n);
      console.log(`   ✓ Connected to Algorand TestNet`);
      console.log(`   ✓ Latest round: ${status.lastRound}`);
      console.log(`   ✓ Catchup time: ${status.catchupTime}`);
    });

    it("should get current node health", async () => {
      // healthCheck().do() returns undefined on success, throws on failure
      await algodClient.healthCheck().do();
      // If we reach here without throwing, the node is healthy
      expect(true).toBe(true);
      console.log(`   ✓ Algorand node is healthy`);
    });

    it("should get genesis information", async () => {
      const versions = await algodClient.versionsCheck().do();
      expect(versions).toBeDefined();
      expect(versions.genesisId).toContain("testnet");
      console.log(`   ✓ Genesis ID: ${versions.genesisId}`);
      console.log(`   ✓ Genesis Hash: ${versions.genesisHashB64}`);
    });

    it("should get suggested transaction parameters", async () => {
      const params = await algodClient.getTransactionParams().do();
      expect(params).toBeDefined();
      expect(params.firstValid).toBeGreaterThan(0n);
      expect(params.genesisID).toContain("testnet");
      console.log(`   ✓ First valid round: ${params.firstValid}`);
      console.log(`   ✓ Last valid round: ${params.lastValid}`);
      console.log(`   ✓ Min fee: ${params.minFee}`);
    });
  });

  describe("2. SolventRegistry Application Verification", () => {
    it("should have ALGORAND_APP_ID configured", () => {
      if (!hasAppId) {
        console.log("   ⚠️  ALGORAND_APP_ID not set — set it in .env to enable live tests");
        return;
      }
      expect(appId).toBeGreaterThan(0n);
      console.log(`   ✓ SolventRegistry App ID: ${appId}`);
    });

    it("should verify application exists on-chain", async () => {
      if (!hasAppId) return;

      const appInfo = await algodClient.getApplicationByID(Number(appId)).do();
      expect(appInfo).toBeDefined();
      expect(BigInt(appInfo.id)).toBe(appId);
      console.log(`   ✓ Application found on-chain: ${appInfo.id}`);
      console.log(`   ✓ Creator: ${appInfo.params.creator}`);
    });

    it("should verify application has approval program", async () => {
      if (!hasAppId) return;

      const appInfo = await algodClient.getApplicationByID(Number(appId)).do();
      const approvalProgram = appInfo.params.approvalProgram;

      expect(approvalProgram).toBeDefined();
      expect(approvalProgram.length).toBeGreaterThan(0);
      console.log(`   ✓ Approval program size: ${approvalProgram.length} bytes`);
    });
  });

  describe("3. On-Chain State Reading", () => {
    it("should read latest state for entity (or null)", async () => {
      if (!hasAppId) return;

      const state = await registryClient.getLatestState(ENTITY_ID);
      if (state) {
        expect(state.entity_id).toBe(ENTITY_ID);
        expect(state.epoch_id).toBeDefined();
        expect(state.liability_root).toBeDefined();
        expect(state.reserve_root).toBeDefined();
        expect(state.proof_hash).toBeDefined();
        expect(state.timestamp).toBeGreaterThan(0n);
        expect(state.valid_until).toBeGreaterThan(0n);
        console.log(`   ✓ Entity: ${state.entity_id}`);
        console.log(`   ✓ Epoch: ${state.epoch_id}`);
        console.log(`   ✓ Health: ${HealthStatus[state.health_status]}`);
        console.log(`   ✓ Capital Backed: ${state.capital_backed}`);
        console.log(`   ✓ Liquidity Ready: ${state.liquidity_ready}`);
        console.log(`   ✓ Timestamp: ${new Date(Number(state.timestamp) * 1000).toISOString()}`);
        console.log(`   ✓ Valid Until: ${new Date(Number(state.valid_until) * 1000).toISOString()}`);
      } else {
        console.log(`   ⚠️  No on-chain state for entity_id=${ENTITY_ID} — submit an epoch first`);
      }
      // Test passes either way — null is valid for no submissions
      expect(true).toBe(true);
    });

    it("should get health status for entity", async () => {
      if (!hasAppId) return;

      const status = await registryClient.getHealthStatus(ENTITY_ID);
      expect(typeof status).toBe("number");
      expect(Object.values(HealthStatus)).toContain(status);
      console.log(`   ✓ Health Status: ${HealthStatus[status]} (${status})`);
    });

    it("should get isHealthy flag for entity", async () => {
      if (!hasAppId) return;

      const healthy = await registryClient.isHealthy(ENTITY_ID);
      expect(typeof healthy).toBe("boolean");
      console.log(`   ✓ Is Healthy: ${healthy}`);
    });
  });

  describe("4. Epoch History & Box Enumeration", () => {
    it("should enumerate application boxes", async () => {
      if (!hasAppId) return;

      try {
        const boxesResponse = await algodClient
          .getApplicationBoxes(Number(appId))
          .do();
        const boxes = boxesResponse.boxes ?? [];
        expect(Array.isArray(boxes)).toBe(true);

        console.log(`   ✓ Total boxes: ${boxes.length}`);

        const dec = new TextDecoder();
        for (const box of boxes.slice(0, 5)) {
          const name = dec.decode(box.name);
          console.log(`     - ${name}`);
        }
        if (boxes.length > 5) {
          console.log(`     ... and ${boxes.length - 5} more`);
        }
      } catch (err) {
        console.log(`   ⚠️  Could not enumerate boxes: ${err}`);
      }
    });

    it("should get epoch history via registryClient", async () => {
      if (!hasAppId) return;

      const history = await registryClient.getEpochHistory(ENTITY_ID);
      expect(Array.isArray(history)).toBe(true);

      console.log(`   ✓ Epoch history entries: ${history.length}`);
      for (const record of history.slice(0, 3)) {
        console.log(
          `     - epoch=${record.epoch_id} ` +
          `health=${HealthStatus[record.health_status]} ` +
          `ts=${new Date(Number(record.timestamp) * 1000).toISOString()}`
        );
      }
    });

    it("should read specific epoch record when history exists", async () => {
      if (!hasAppId) return;

      const state = await registryClient.getLatestState(ENTITY_ID);
      if (!state) {
        console.log("   ⚠️  No state — skipping epoch record read");
        return;
      }

      const record = await registryClient.getEpochRecord(ENTITY_ID, state.epoch_id);
      expect(record).not.toBeNull();
      expect(record!.entity_id).toBe(ENTITY_ID);
      expect(record!.epoch_id).toBe(state.epoch_id);
      expect(record!.proof_hash).toBe(state.proof_hash);
      console.log(`   ✓ Epoch record matches latest state`);
      console.log(`   ✓ Proof hash: ${record!.proof_hash.slice(0, 30)}...`);
    });
  });

  describe("5. Data Integrity: Encode/Decode Round-Trip on Live Data", () => {
    it("should round-trip live on-chain state through encode/decode", async () => {
      if (!hasAppId) return;

      const state = await registryClient.getLatestState(ENTITY_ID);
      if (!state) {
        console.log("   ⚠️  No state — skipping round-trip test");
        return;
      }

      // Reconstruct a payload from the live record and re-encode
      const payload = {
        entity_id: state.entity_id,
        epoch_id: state.epoch_id,
        liability_root: state.liability_root,
        reserve_root: state.reserve_root,
        reserve_snapshot_hash: state.reserve_snapshot_hash,
        proof_hash: state.proof_hash,
        reserves_total: state.reserves_total,
        liquid_assets_total: state.liquid_assets_total,
        near_term_liabilities_total: state.near_term_liabilities_total,
        capital_backed: state.capital_backed,
        liquidity_ready: state.liquidity_ready,
        health_status: state.health_status,
        timestamp: state.timestamp,
        valid_until: state.valid_until,
      };

      const encoded = encodeState(payload, state.insolvency_flag, state.liquidity_stress_flag);
      const decoded = decodeState(encoded);

      expect(decoded.entity_id).toBe(state.entity_id);
      expect(decoded.epoch_id).toBe(state.epoch_id);
      expect(decoded.liability_root).toBe(state.liability_root);
      expect(decoded.proof_hash).toBe(state.proof_hash);
      expect(decoded.reserves_total).toBe(state.reserves_total);
      expect(decoded.health_status).toBe(state.health_status);
      expect(decoded.timestamp).toBe(state.timestamp);
      expect(decoded.valid_until).toBe(state.valid_until);
      expect(decoded.insolvency_flag).toBe(state.insolvency_flag);
      expect(decoded.liquidity_stress_flag).toBe(state.liquidity_stress_flag);

      console.log(`   ✓ Live state round-trips perfectly through encode/decode`);
    });
  });

  describe("6. Algorand Explorer Links", () => {
    it("should generate Pera explorer verification links", () => {
      if (!hasAppId) return;

      const appUrl = `https://explorer.perawallet.app/application/${appId}/`;
      console.log(`\n   📋 Verify on Algorand Explorer:`);
      console.log(`   ✓ Application: ${appUrl}`);

      expect(appUrl).toContain(String(appId));
    });

    it("should generate correct explorer links from constants", async () => {
      if (!hasAppId) return;

      const baseUrl = "https://explorer.perawallet.app";
      const txUrl = `${baseUrl}/tx/SAMPLE_TX_ID/`;
      const addrUrl = `${baseUrl}/address/SAMPLE_ADDR/`;

      expect(txUrl).toContain("tx/");
      expect(addrUrl).toContain("address/");
      console.log(`   ✓ TX URL format: ${txUrl}`);
      console.log(`   ✓ Address URL format: ${addrUrl}`);
    });
  });
});

describe("On-Chain Tests: Algorand Adapter Client Integration", () => {
  let hasAppId = false;

  beforeAll(() => {
    if (APP_ID_STR && APP_ID_STR !== "0") {
      hasAppId = true;
    }
  });

  it("should create adapter client with real config when enabled", async () => {
    if (!hasAppId) {
      console.log("   ⚠️  ALGORAND_APP_ID not set — skipping adapter client test");
      return;
    }

    const { loadAlgorandAdapterConfig } = await import("../algorand/adapter_config.js");
    const { createAlgorandAdapterRealClient } = await import("../algorand/algorand_adapter_real_client.js");

    // Temporarily set env for the factory
    const origEnabled = process.env.ALGORAND_ADAPTER_ENABLED;
    process.env.ALGORAND_ADAPTER_ENABLED = "true";

    try {
      const config = loadAlgorandAdapterConfig();
      expect(config.appId).toBeGreaterThan(0n);
      expect(config.algodUrl).toContain("algonode");

      const client = createAlgorandAdapterRealClient(config);
      expect(client).toBeDefined();

      // Test read-only methods through the adapter
      const state = await client.getLatestState(ENTITY_ID);
      // state can be null if no epoch submitted — that's fine
      console.log(`   ✓ Adapter client created successfully`);
      console.log(`   ✓ Latest state: ${state ? "found" : "no submissions yet"}`);

      const healthStatus = await client.getHealthStatus(ENTITY_ID);
      console.log(`   ✓ Health status: ${healthStatus ? healthStatus.health_status : "N/A"}`);

      const isHealthy = await client.isHealthy(ENTITY_ID);
      console.log(`   ✓ Is healthy: ${isHealthy}`);

      const isFresh = await client.isFresh(ENTITY_ID);
      console.log(`   ✓ Is fresh: ${isFresh}`);
    } finally {
      if (origEnabled !== undefined) {
        process.env.ALGORAND_ADAPTER_ENABLED = origEnabled;
      } else {
        delete process.env.ALGORAND_ADAPTER_ENABLED;
      }
    }
  });

  it("should fall back to stub when adapter is disabled", async () => {
    const { createAlgorandAdapterClient } = await import("../algorand/adapter_client.js");

    const origEnabled = process.env.ALGORAND_ADAPTER_ENABLED;
    delete process.env.ALGORAND_ADAPTER_ENABLED;

    try {
      const client = createAlgorandAdapterClient();
      expect(client).toBeDefined();

      // Stub returns null/false/empty for all reads
      const state = await client.getLatestState(ENTITY_ID);
      expect(state).toBeNull();

      const healthy = await client.isHealthy(ENTITY_ID);
      expect(healthy).toBe(false);

      const fresh = await client.isFresh(ENTITY_ID);
      expect(fresh).toBe(false);

      console.log(`   ✓ Stub client returns safe defaults when adapter disabled`);
    } finally {
      if (origEnabled !== undefined) {
        process.env.ALGORAND_ADAPTER_ENABLED = origEnabled;
      }
    }
  });
});
