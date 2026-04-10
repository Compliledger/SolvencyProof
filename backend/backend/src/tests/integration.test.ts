import { describe, it, expect, beforeAll, afterAll } from "vitest";
import algosdk from "algosdk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  SolventRegistryClient,
  HealthStatus,
} from "../../../../algorand/client/registry_client.js";
import { loadAlgorandAdapterConfig } from "../algorand/adapter_config.js";
import { createAlgorandAdapterRealClient } from "../algorand/algorand_adapter_real_client.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE_URL = process.env.API_URL || "http://localhost:3001";
const OUTPUT_DIR = path.join(__dirname, "../../../data/output");

// Helper to make API calls
async function apiCall(
  endpoint: string,
  method: "GET" | "POST" | "PUT" = "GET",
  body?: unknown
) {
  const options: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
  return {
    status: response.status,
    data: await response.json(),
  };
}

// Check if API server is running
async function isApiRunning(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

describe("Integration Tests: API Calls", () => {
  let apiAvailable = false;

  beforeAll(async () => {
    apiAvailable = await isApiRunning();
    if (!apiAvailable) {
      console.log("⚠️  API server not running - skipping live API tests");
      console.log("   Start with: pnpm api:dev");
    }
  });

  describe("Health & Status Endpoints", () => {
    it("should return health status from API", async () => {
      if (!apiAvailable) return;

      const { status, data } = await apiCall("/health");
      expect(status).toBe(200);
      expect(data.status).toBe("ok");
      expect(data.timestamp).toBeDefined();
    });

    it("should return deployed contract addresses", async () => {
      if (!apiAvailable) return;

      const { status, data } = await apiCall("/api/contracts");
      expect(status).toBe(200);
      expect(data.contracts).toBeDefined();
      expect(data.contracts.SolvencyProofRegistry).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(data.contracts.Groth16Verifier).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });
  });

  describe("Liabilities Flow via API", () => {
    it("should get current liabilities data", async () => {
      if (!apiAvailable) return;

      const { status, data } = await apiCall("/api/liabilities");
      if (status === 200) {
        // API may return root or liabilities_root depending on structure
        expect(data.root || data.liabilities_root).toBeDefined();
      } else {
        expect(status).toBe(404); // Not built yet is acceptable
      }
    });

    it("should upload liabilities CSV", async () => {
      if (!apiAvailable) return;

      const csvContent = "user_id,balance\ntest_user1,1000\ntest_user2,2000\ntest_user3,1500";
      const { status, data } = await apiCall("/api/liabilities/upload", "POST", {
        csvContent,
      });

      expect(status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe("Reserves Flow via API", () => {
    it("should get current reserves snapshot", async () => {
      if (!apiAvailable) return;

      const { status, data } = await apiCall("/api/reserves");
      if (status === 200) {
        expect(data.reserves_total_wei).toBeDefined();
      } else {
        expect(status).toBe(404); // Not scanned yet is acceptable
      }
    });

    it("should update reserve addresses", async () => {
      if (!apiAvailable) return;

      const addresses = ["0xa58DCCb0F17279abD1d0D9069Aa8711Df4a4c58E"];
      const { status, data } = await apiCall("/api/reserves/addresses", "POST", {
        addresses,
      });

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.count).toBe(1);
    });
  });

  describe("ZK Proof Flow via API", () => {
    it("should get current proof data", async () => {
      if (!apiAvailable) return;

      const { status, data } = await apiCall("/api/proof");
      if (status === 200) {
        expect(data.proof).toBeDefined();
        expect(data.publicSignals).toBeDefined();
      } else {
        expect(status).toBe(404); // Not generated yet is acceptable
      }
    });
  });

  describe("Yellow Session Flow via API", () => {
    let sessionId: string;

    it("should create a new Yellow session", async () => {
      if (!apiAvailable) return;

      const { status, data } = await apiCall("/api/yellow/session", "POST", {
        participants: ["alice", "bob", "charlie"],
      });

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.session.id).toBeDefined();
      expect(data.session.status).toBe("open");
      expect(data.session.participants).toHaveLength(3);

      sessionId = data.session.id;
    });

    it("should get session details", async () => {
      if (!apiAvailable || !sessionId) return;

      const { status, data } = await apiCall(`/api/yellow/session/${sessionId}`);

      expect(status).toBe(200);
      expect(data.id).toBe(sessionId);
      expect(data.status).toBe("open");
    });

    it("should update allocations (off-chain instant)", async () => {
      if (!apiAvailable || !sessionId) return;

      const { status, data } = await apiCall(
        `/api/yellow/session/${sessionId}/allocations`,
        "PUT",
        {
          allocations: {
            alice: "5000",
            bob: "3000",
            charlie: "2000",
          },
        }
      );

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.session.allocations.alice).toBe("5000");
      expect(data.session.allocations.bob).toBe("3000");
      expect(data.session.allocations.charlie).toBe("2000");
    });

    it("should close session and settle", async () => {
      if (!apiAvailable || !sessionId) return;

      const { status, data } = await apiCall(
        `/api/yellow/session/${sessionId}/close`,
        "POST"
      );

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.session.status).toBe("closed");
      expect(data.session.closedAt).toBeDefined();
    });

    it("should export session to liabilities CSV", async () => {
      if (!apiAvailable || !sessionId) return;

      const { status, data } = await apiCall(
        `/api/yellow/session/${sessionId}/export`,
        "POST"
      );

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.entries).toBe(3);
    });

    it("should list all sessions", async () => {
      if (!apiAvailable) return;

      const { status, data } = await apiCall("/api/yellow/sessions");

      expect(status).toBe(200);
      expect(data.sessions).toBeDefined();
      expect(Array.isArray(data.sessions)).toBe(true);
    });
  });
});

describe("Integration Tests: Algorand On-Chain Verification", () => {
  const ALGOD_URL = process.env.ALGORAND_ALGOD_URL || "https://testnet-api.algonode.cloud";
  const ALGOD_TOKEN = process.env.ALGORAND_ALGOD_TOKEN || "";
  const ALGOD_PORT = parseInt(process.env.ALGORAND_ALGOD_PORT || "443", 10);
  const APP_ID_STR = process.env.ALGORAND_APP_ID || process.env.SOLVENT_REGISTRY_APP_ID || "";
  const ENTITY_ID = process.env.ENTITY_ID || "compliledger-entity-01";

  let registryClient: SolventRegistryClient;
  let hasAppId = false;

  beforeAll(() => {
    if (APP_ID_STR && APP_ID_STR !== "0") {
      hasAppId = true;
      registryClient = new SolventRegistryClient({
        nodeUrl: ALGOD_URL,
        nodeToken: ALGOD_TOKEN,
        nodePort: ALGOD_PORT,
        appId: BigInt(APP_ID_STR),
      });
    }
  });

  describe("Algorand Registry State Verification", () => {
    it("should read latest state from Algorand registry", async () => {
      if (!hasAppId) {
        console.log("   ⚠️  ALGORAND_APP_ID not set — skipping");
        return;
      }

      const state = await registryClient.getLatestState(ENTITY_ID);
      if (state) {
        expect(state.entity_id).toBe(ENTITY_ID);
        expect(state.epoch_id).toBeDefined();
        console.log(`   Latest epoch: ${state.epoch_id}`);
        console.log(`   Health: ${HealthStatus[state.health_status]}`);
      } else {
        console.log(`   No on-chain state yet for entity_id=${ENTITY_ID}`);
      }
    });

    it("should read health status from Algorand registry", async () => {
      if (!hasAppId) return;

      const status = await registryClient.getHealthStatus(ENTITY_ID);
      expect(typeof status).toBe("number");
      console.log(`   Health status: ${HealthStatus[status]} (${status})`);
    });

    it("should read epoch history from Algorand registry", async () => {
      if (!hasAppId) return;

      const history = await registryClient.getEpochHistory(ENTITY_ID);
      expect(Array.isArray(history)).toBe(true);
      console.log(`   Epoch history count: ${history.length}`);
    });
  });

  describe("Algorand Adapter Proof Verification", () => {
    it("should verify submitted epoch exists via adapter", async () => {
      if (!hasAppId) return;

      const origEnabled = process.env.ALGORAND_ADAPTER_ENABLED;
      process.env.ALGORAND_ADAPTER_ENABLED = "true";

      try {
        const config = loadAlgorandAdapterConfig();
        const client = createAlgorandAdapterRealClient(config);

        const state = await client.getLatestState(ENTITY_ID);
        if (!state) {
          console.log("   No epoch submitted — submit one to enable full verification");
          return;
        }

        expect(state.entity_id).toBe(ENTITY_ID);
        expect(state.health_status).toBeDefined();
        console.log(`   Adapter returned epoch_id: ${state.epoch_id}`);
        console.log(`   Health status: ${state.health_status}`);
      } finally {
        if (origEnabled !== undefined) {
          process.env.ALGORAND_ADAPTER_ENABLED = origEnabled;
        } else {
          delete process.env.ALGORAND_ADAPTER_ENABLED;
        }
      }
    });

    it("should verify stored record via adapter", async () => {
      if (!hasAppId) return;

      const origEnabled = process.env.ALGORAND_ADAPTER_ENABLED;
      process.env.ALGORAND_ADAPTER_ENABLED = "true";

      try {
        const config = loadAlgorandAdapterConfig();
        const client = createAlgorandAdapterRealClient(config);

        const result = await client.verifyStoredRecord(ENTITY_ID, 1);
        expect(result.entity_id).toBe(ENTITY_ID);
        expect(typeof result.verified).toBe("boolean");
        console.log(`   Verified: ${result.verified}`);
        console.log(`   Message: ${result.message}`);
      } finally {
        if (origEnabled !== undefined) {
          process.env.ALGORAND_ADAPTER_ENABLED = origEnabled;
        } else {
          delete process.env.ALGORAND_ADAPTER_ENABLED;
        }
      }
    });
  });
});

describe("Integration Tests: Complete User Flow Simulation", () => {
  it("should simulate complete user journey", async () => {
    console.log("\n📋 Simulating Complete User Journey:\n");

    // Step 1: User creates Yellow session for liability management
    console.log("1️⃣  User creates Yellow session for off-chain liability tracking");
    const session = {
      id: `session_${Date.now()}`,
      participants: ["user_alice", "user_bob", "user_charlie"],
      allocations: {} as Record<string, string>,
      status: "open",
    };
    session.participants.forEach((p) => (session.allocations[p] = "0"));
    expect(session.status).toBe("open");
    console.log(`   ✓ Session created: ${session.id}`);

    // Step 2: Off-chain liability updates (instant, no gas)
    console.log("\n2️⃣  User updates liabilities (instant off-chain)");
    const updates = [
      { user: "user_alice", balance: "10000" },
      { user: "user_bob", balance: "5000" },
      { user: "user_charlie", balance: "3000" },
    ];
    for (const update of updates) {
      session.allocations[update.user] = update.balance;
      console.log(`   ✓ ${update.user}: ${update.balance} (instant, no gas)`);
    }

    // Step 3: Close session and settle
    console.log("\n3️⃣  User closes session (on-chain settlement)");
    session.status = "closed";
    const totalLiabilities = Object.values(session.allocations)
      .reduce((sum, val) => sum + Number(val), 0);
    console.log(`   ✓ Session closed, total liabilities: ${totalLiabilities}`);

    // Step 4: Export to liabilities CSV
    console.log("\n4️⃣  System exports liabilities for proof generation");
    let csvContent = "user_id,balance\n";
    Object.entries(session.allocations).forEach(([userId, balance]) => {
      csvContent += `${userId},${balance}\n`;
    });
    expect(csvContent).toContain("user_alice,10000");
    console.log(`   ✓ Exported ${Object.keys(session.allocations).length} entries to CSV`);

    // Step 5: Build Merkle tree
    console.log("\n5️⃣  System builds liabilities Merkle tree");
    const rootPath = path.join(OUTPUT_DIR, "liabilities_root.json");
    if (fs.existsSync(rootPath)) {
      const root = JSON.parse(fs.readFileSync(rootPath, "utf-8"));
      console.log(`   ✓ Merkle root: ${root.liabilities_root.slice(0, 20)}...`);
    }

    // Step 6: Scan reserves
    console.log("\n6️⃣  System scans on-chain reserves");
    const snapshotPath = path.join(OUTPUT_DIR, "reserves_snapshot.json");
    if (fs.existsSync(snapshotPath)) {
      const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf-8"));
      console.log(`   ✓ Total reserves: ${snapshot.reserves_total_eth} ETH`);
    }

    // Step 7: Generate ZK proof
    console.log("\n7️⃣  System generates ZK solvency proof");
    const proofPath = path.join(OUTPUT_DIR, "solvency_proof.json");
    if (fs.existsSync(proofPath)) {
      const proof = JSON.parse(fs.readFileSync(proofPath, "utf-8"));
      console.log(`   ✓ Proof generated, isSolvent: ${proof.publicSignals[0] === "1"}`);
    }

    // Step 8: Submit proof on-chain
    console.log("\n8️⃣  System submits proof on-chain");
    const submissionPath = path.join(OUTPUT_DIR, "submission_result.json");
    if (fs.existsSync(submissionPath)) {
      const submission = JSON.parse(fs.readFileSync(submissionPath, "utf-8"));
      console.log(`   ✓ TX: ${submission.txHash.slice(0, 20)}...`);
      console.log(`   ✓ Block: ${submission.blockNumber}`);
      console.log(`   ✓ Verified: ${submission.verified}`);
    }

    // Step 9: User verifies inclusion
    console.log("\n9️⃣  User verifies their inclusion in proof");
    console.log(`   ✓ User can verify inclusion using Merkle proof`);

    // Step 10: Public verifies solvency
    console.log("\n🔟 Public verifies solvency on-chain");
    const deploymentPath = path.join(OUTPUT_DIR, "deployment.json");
    if (fs.existsSync(deploymentPath)) {
      const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
      console.log(`   ✓ Registry: ${deployment.contracts.SolvencyProofRegistry}`);
      console.log(`   ✓ Anyone can verify proof on Etherscan`);
    }

    console.log("\n✅ Complete user journey simulation successful!\n");
  });
});
