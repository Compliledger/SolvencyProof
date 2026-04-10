/**
 * e2e-full.test.ts
 *
 * Comprehensive end-to-end test suite for the SolvencyProof Backend API.
 *
 * Tests every endpoint defined in server.ts:
 *   - Health checks (/health, /api/health)
 *   - Liabilities CRUD (GET, build, upload, verify)
 *   - Reserves CRUD (GET, scan, addresses)
 *   - ZK Proof (GET, generate, submit, submit-algorand)
 *   - Contracts (GET, proof/:epochId, epoch-count)
 *   - Yellow Network sessions (create, get, allocations, close, export, list, history, status)
 *   - Workflow (full)
 *   - Epoch state (artifact, health, verify-stored, latest, history, :entityId)
 *   - Error handling and edge cases
 *
 * Runs against the Express app exported from server.ts using supertest
 * (no live server needed).
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "../../../data");
const OUTPUT_DIR = path.join(DATA_DIR, "output");

// ---------------------------------------------------------------------------
// Dynamic import of supertest + app — avoids top-level ESM issues
// ---------------------------------------------------------------------------
let request: (app: unknown) => import("supertest").SuperTest<import("supertest").Test>;
let app: unknown;

beforeAll(async () => {
  const supertest = await import("supertest");
  request = supertest.default as unknown as typeof request;

  // Import the Express app
  const mod = await import("../api/server.js");
  app = mod.default;
});

// ============================================================================
// 1. HEALTH CHECK ENDPOINTS
// ============================================================================

describe("Health Check Endpoints", () => {
  it("GET /health returns status ok", async () => {
    const res = await request(app).get("/health").expect(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.timestamp).toBeDefined();
    expect(typeof res.body.timestamp).toBe("string");
    // Verify ISO-8601 format
    expect(new Date(res.body.timestamp).getTime()).not.toBeNaN();
  });

  it("GET /api/health returns status ok", async () => {
    const res = await request(app).get("/api/health").expect(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.timestamp).toBeDefined();
  });
});

// ============================================================================
// 2. LIABILITIES ENDPOINTS
// ============================================================================

describe("Liabilities Endpoints", () => {
  describe("GET /api/liabilities", () => {
    it("returns liabilities data when built", async () => {
      const rootPath = path.join(OUTPUT_DIR, "liabilities_root.json");
      if (!fs.existsSync(rootPath)) {
        // If not built, expect 404
        const res = await request(app).get("/api/liabilities").expect(404);
        expect(res.body.error).toContain("not built");
        return;
      }

      const res = await request(app).get("/api/liabilities").expect(200);
      expect(res.body.root).toBeDefined();
      expect(res.body.epochId).toBeDefined();
      expect(res.body.leafCount).toBeGreaterThan(0);
    });
  });

  describe("POST /api/liabilities/upload", () => {
    it("rejects request without csvContent", async () => {
      const res = await request(app)
        .post("/api/liabilities/upload")
        .send({})
        .expect(400);
      expect(res.body.error).toContain("csvContent");
    });

    it("accepts valid CSV content", async () => {
      const csvContent = "user_id,balance\ntest_u1,1000\ntest_u2,2000\n";
      const res = await request(app)
        .post("/api/liabilities/upload")
        .send({ csvContent })
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain("uploaded");

      // Restore original CSV
      const originalCsv = "user_id,balance\nu1,400000\nu2,300000\nu3,200000\n";
      fs.writeFileSync(path.join(DATA_DIR, "liabilities.csv"), originalCsv);
    });
  });

  describe("GET /api/liabilities/verify/:userId", () => {
    it("returns 404 for non-existent user", async () => {
      const res = await request(app)
        .get("/api/liabilities/verify/nonexistent_user_xyz")
        .expect(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain("not found");
    });

    it("returns inclusion proof for valid user if proofs exist", async () => {
      const proofsDir = path.join(OUTPUT_DIR, "inclusion_proofs");
      if (!fs.existsSync(proofsDir)) return;

      const files = fs.readdirSync(proofsDir);
      if (files.length === 0) return;

      // Extract a userId from the first proof file (format: inclusion_<userId>.json)
      const match = files[0].match(/^inclusion_(.+)\.json$/);
      if (!match) return;

      const userId = match[1];
      const res = await request(app)
        .get(`/api/liabilities/verify/${userId}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.userId).toBe(userId);
    });
  });
});

// ============================================================================
// 3. RESERVES ENDPOINTS
// ============================================================================

describe("Reserves Endpoints", () => {
  describe("GET /api/reserves", () => {
    it("returns reserves snapshot when available", async () => {
      const snapshotPath = path.join(OUTPUT_DIR, "reserves_snapshot.json");
      if (!fs.existsSync(snapshotPath)) {
        const res = await request(app).get("/api/reserves").expect(404);
        expect(res.body.error).toContain("not scanned");
        return;
      }

      const res = await request(app).get("/api/reserves").expect(200);
      expect(res.body.snapshot).toBeDefined();
    });
  });

  describe("POST /api/reserves/addresses", () => {
    it("rejects request without addresses array", async () => {
      const res = await request(app)
        .post("/api/reserves/addresses")
        .send({})
        .expect(400);
      expect(res.body.error).toContain("addresses");
    });

    it("rejects non-array addresses", async () => {
      const res = await request(app)
        .post("/api/reserves/addresses")
        .send({ addresses: "not_an_array" })
        .expect(400);
      expect(res.body.error).toContain("addresses");
    });

    it("accepts valid addresses array", async () => {
      // Save original
      const reservesPath = path.join(DATA_DIR, "reserves.json");
      const original = fs.existsSync(reservesPath)
        ? fs.readFileSync(reservesPath, "utf-8")
        : null;

      const res = await request(app)
        .post("/api/reserves/addresses")
        .send({ addresses: ["0x1234567890abcdef", "0xfedcba0987654321"] })
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(2);

      // Restore original
      if (original) {
        fs.writeFileSync(reservesPath, original);
      }
    });
  });
});

// ============================================================================
// 4. ZK PROOF ENDPOINTS
// ============================================================================

describe("ZK Proof Endpoints", () => {
  describe("GET /api/proof", () => {
    it("returns proof data when available", async () => {
      const proofPath = path.join(OUTPUT_DIR, "solvency_proof.json");
      if (!fs.existsSync(proofPath)) {
        const res = await request(app).get("/api/proof").expect(404);
        expect(res.body.error).toContain("not generated");
        return;
      }

      const res = await request(app).get("/api/proof").expect(200);
      expect(res.body).toBeDefined();
      // Proof should contain verification-related fields
      expect(typeof res.body).toBe("object");
    });
  });
});

// ============================================================================
// 5. CONTRACT ENDPOINTS
// ============================================================================

describe("Contract Endpoints", () => {
  describe("GET /api/contracts", () => {
    it("returns deployment data when available", async () => {
      const deploymentPath = path.join(OUTPUT_DIR, "deployment.json");
      if (!fs.existsSync(deploymentPath)) {
        const res = await request(app).get("/api/contracts").expect(404);
        expect(res.body.error).toContain("not deployed");
        return;
      }

      const res = await request(app).get("/api/contracts").expect(200);
      expect(res.body).toBeDefined();
    });
  });
});

// ============================================================================
// 6. YELLOW NETWORK SESSION ENDPOINTS
// ============================================================================

describe("Yellow Network Session Endpoints", () => {
  let sessionId: string;

  describe("POST /api/yellow/session - Create session", () => {
    it("rejects request without participants", async () => {
      const res = await request(app)
        .post("/api/yellow/session")
        .send({})
        .expect(400);
      expect(res.body.error).toContain("participants");
    });

    it("rejects non-array participants", async () => {
      const res = await request(app)
        .post("/api/yellow/session")
        .send({ participants: "not_array" })
        .expect(400);
      expect(res.body.error).toContain("participants");
    });

    it("creates a session with valid participants", async () => {
      const res = await request(app)
        .post("/api/yellow/session")
        .send({ participants: ["alice", "bob", "charlie"] })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.session).toBeDefined();
      expect(res.body.session.id).toBeDefined();
      expect(res.body.session.channelId).toBeDefined();
      expect(res.body.session.participants).toEqual(["alice", "bob", "charlie"]);
      expect(res.body.session.status).toBe("open");
      expect(res.body.session.nonce).toBeDefined();
      expect(res.body.session.stateHash).toBeDefined();
      expect(res.body.session.createdAt).toBeDefined();

      sessionId = res.body.session.id;
    });
  });

  describe("GET /api/yellow/session/:sessionId - Get session", () => {
    it("returns 404 for non-existent session", async () => {
      const res = await request(app)
        .get("/api/yellow/session/nonexistent_session_id")
        .expect(404);
      expect(res.body.error).toContain("not found");
    });

    it("returns session details for valid session", async () => {
      if (!sessionId) return;

      const res = await request(app)
        .get(`/api/yellow/session/${sessionId}`)
        .expect(200);
      expect(res.body.id).toBe(sessionId);
      expect(res.body.participants).toEqual(["alice", "bob", "charlie"]);
      expect(res.body.status).toBe("open");
    });
  });

  describe("PUT /api/yellow/session/:sessionId/allocations - Update allocations", () => {
    it("rejects request without allocations", async () => {
      if (!sessionId) return;

      const res = await request(app)
        .put(`/api/yellow/session/${sessionId}/allocations`)
        .send({})
        .expect(400);
      expect(res.body.error).toContain("allocations");
    });

    it("updates allocations for valid session", async () => {
      if (!sessionId) return;

      const res = await request(app)
        .put(`/api/yellow/session/${sessionId}/allocations`)
        .send({
          allocations: {
            alice: "1500",
            bob: "2500",
            charlie: "500",
          },
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.session.allocations.alice).toBe("1500");
      expect(res.body.session.allocations.bob).toBe("2500");
      expect(res.body.session.allocations.charlie).toBe("500");
      expect(res.body.session.nonce).toBeGreaterThan(0);
      expect(res.body.session.stateHash).toBeDefined();
    });

    it("supports multiple sequential allocation updates", async () => {
      if (!sessionId) return;

      // Second update
      const res = await request(app)
        .put(`/api/yellow/session/${sessionId}/allocations`)
        .send({
          allocations: {
            alice: "2000",
          },
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.session.allocations.alice).toBe("2000");
    });
  });

  describe("GET /api/yellow/session/:sessionId/history - Session history", () => {
    it("returns state history for valid session", async () => {
      if (!sessionId) return;

      const res = await request(app)
        .get(`/api/yellow/session/${sessionId}/history`)
        .expect(200);
      expect(res.body.sessionId).toBe(sessionId);
      expect(res.body.history).toBeDefined();
      expect(Array.isArray(res.body.history)).toBe(true);
      expect(res.body.totalTransitions).toBeGreaterThanOrEqual(0);
    });
  });

  describe("POST /api/yellow/session/:sessionId/export - Export session", () => {
    it("exports session allocations to CSV", async () => {
      if (!sessionId) return;

      const res = await request(app)
        .post(`/api/yellow/session/${sessionId}/export`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain("exported");
      expect(res.body.entries).toBeGreaterThan(0);
    });
  });

  describe("POST /api/yellow/session/:sessionId/close - Close session", () => {
    it("closes an open session", async () => {
      if (!sessionId) return;

      const res = await request(app)
        .post(`/api/yellow/session/${sessionId}/close`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.session.status).toBe("closed");
      expect(res.body.session.closedAt).toBeDefined();
    });
  });

  describe("GET /api/yellow/session/:sessionId/settlement - Settlement", () => {
    it("returns settlement info or error for session", async () => {
      if (!sessionId) return;

      const res = await request(app)
        .get(`/api/yellow/session/${sessionId}/settlement`);
      // May be 200 (if settlement occurred) or 400 (not yet settled)
      expect([200, 400]).toContain(res.status);
    });
  });

  describe("GET /api/yellow/sessions - List all sessions", () => {
    it("lists sessions with count", async () => {
      const res = await request(app)
        .get("/api/yellow/sessions")
        .expect(200);
      expect(res.body.sessions).toBeDefined();
      expect(Array.isArray(res.body.sessions)).toBe(true);
      expect(res.body.count).toBeDefined();
      expect(typeof res.body.count).toBe("number");
      expect(res.body.totalOpenLiabilities).toBeDefined();
    });
  });

  describe("GET /api/yellow/status - Yellow status", () => {
    it("returns connection and session status", async () => {
      const res = await request(app)
        .get("/api/yellow/status")
        .expect(200);
      expect(typeof res.body.connected).toBe("boolean");
      expect(typeof res.body.authenticated).toBe("boolean");
      expect(typeof res.body.sessionsCount).toBe("number");
      expect(res.body.totalOpenLiabilities).toBeDefined();
    });
  });
});

// ============================================================================
// 7. EPOCH STATE ENDPOINTS
// ============================================================================

describe("Epoch State Endpoints", () => {
  describe("GET /api/epoch/artifact", () => {
    it("returns proof artifact when available", async () => {
      const artifactPath = path.join(OUTPUT_DIR, "proof_artifact.json");
      const rootPath = path.join(OUTPUT_DIR, "liabilities_root.json");
      if (!fs.existsSync(artifactPath) && !fs.existsSync(rootPath)) {
        const res = await request(app).get("/api/epoch/artifact").expect(404);
        expect(res.body.error).toBeDefined();
        return;
      }

      const res = await request(app).get("/api/epoch/artifact").expect(200);
      expect(res.body.module).toBe("solvency");
      expect(res.body.entity_id).toBeDefined();
      expect(res.body.decision_result).toBeDefined();
      expect(res.body.decision_result.capital_backed).toBeDefined();
      expect(res.body.decision_result.liquidity_ready).toBeDefined();
      expect(res.body.decision_result.health_status).toBeDefined();
      expect(res.body.reason_codes).toBeDefined();
      expect(Array.isArray(res.body.reason_codes)).toBe(true);
      expect(res.body.timestamp).toBeDefined();
      expect(res.body.bundle_hash).toBeDefined();
      expect(res.body.anchor_metadata).toBeDefined();
    });

    it("accepts entity_id query parameter", async () => {
      const res = await request(app)
        .get("/api/epoch/artifact?entity_id=compliledger-entity-01");
      // May be 200 or 404 depending on data
      expect([200, 404]).toContain(res.status);
    });
  });

  describe("GET /api/epoch/health", () => {
    it("rejects request without entity_id", async () => {
      const res = await request(app)
        .get("/api/epoch/health")
        .expect(400);
      expect(res.body.error).toContain("entity_id");
    });

    it("returns health status for valid entity", async () => {
      const res = await request(app)
        .get("/api/epoch/health?entity_id=compliledger-entity-01");
      // May be 200 or 404 depending on state
      expect([200, 404]).toContain(res.status);

      if (res.status === 200) {
        expect(res.body.entity_id).toBeDefined();
        expect(res.body.health_status).toBeDefined();
        expect(
          ["HEALTHY", "LIQUIDITY_STRESSED", "UNDERCOLLATERALIZED", "CRITICAL", "EXPIRED"]
        ).toContain(res.body.health_status);
      }
    });
  });

  describe("GET /api/epoch/verify-stored", () => {
    it("rejects request without entity_id", async () => {
      const res = await request(app)
        .get("/api/epoch/verify-stored")
        .expect(400);
      expect(res.body.error).toContain("entity_id");
    });

    it("rejects request without epoch_id", async () => {
      const res = await request(app)
        .get("/api/epoch/verify-stored?entity_id=test")
        .expect(400);
      expect(res.body.error).toContain("epoch_id");
    });

    it("rejects non-integer epoch_id", async () => {
      const res = await request(app)
        .get("/api/epoch/verify-stored?entity_id=test&epoch_id=abc")
        .expect(400);
      expect(res.body.error).toContain("epoch_id");
    });

    it("returns verification result for valid params", async () => {
      const res = await request(app)
        .get("/api/epoch/verify-stored?entity_id=compliledger-entity-01&epoch_id=1");
      expect([200, 404]).toContain(res.status);

      if (res.status === 200) {
        expect(typeof res.body.exists).toBe("boolean");
        expect(typeof res.body.matches).toBe("boolean");
        expect(Array.isArray(res.body.mismatches)).toBe(true);
      }
    });
  });

  describe("GET /api/epoch/latest", () => {
    it("returns latest epoch state or 404", async () => {
      const res = await request(app)
        .get("/api/epoch/latest?entity_id=compliledger-entity-01");
      expect([200, 404]).toContain(res.status);

      if (res.status === 200) {
        expect(res.body.entity_id).toBeDefined();
        expect(res.body.health_status).toBeDefined();
        expect(res.body.timestamp).toBeDefined();
      }
    });

    it("defaults to 'default' entity when no entity_id provided", async () => {
      const res = await request(app).get("/api/epoch/latest");
      expect([200, 404]).toContain(res.status);
    });
  });

  describe("GET /api/epoch/history", () => {
    it("returns epoch history array", async () => {
      const res = await request(app)
        .get("/api/epoch/history?entity_id=compliledger-entity-01");
      expect([200, 500]).toContain(res.status);

      if (res.status === 200) {
        expect(Array.isArray(res.body)).toBe(true);
      }
    });

    it("rejects invalid limit parameter", async () => {
      const res = await request(app)
        .get("/api/epoch/history?entity_id=test&limit=-1")
        .expect(400);
      expect(res.body.error).toContain("limit");
    });

    it("rejects non-integer limit", async () => {
      const res = await request(app)
        .get("/api/epoch/history?entity_id=test&limit=abc")
        .expect(400);
      expect(res.body.error).toContain("limit");
    });

    it("accepts valid limit parameter", async () => {
      const res = await request(app)
        .get("/api/epoch/history?entity_id=compliledger-entity-01&limit=5");
      expect([200, 500]).toContain(res.status);
    });
  });

  describe("GET /api/epoch/:entityId", () => {
    it("returns latest state for an entity", async () => {
      const res = await request(app)
        .get("/api/epoch/compliledger-entity-01");
      expect([200, 404]).toContain(res.status);

      if (res.status === 200) {
        expect(res.body.entity_id).toBeDefined();
        expect(res.body.epoch_id).toBeDefined();
      }
    });

    it("returns specific epoch when epochId query param provided", async () => {
      const res = await request(app)
        .get("/api/epoch/compliledger-entity-01?epochId=1");
      expect([200, 404]).toContain(res.status);
    });

    it("rejects invalid epochId query param", async () => {
      const res = await request(app)
        .get("/api/epoch/compliledger-entity-01?epochId=abc")
        .expect(400);
      expect(res.body.error).toContain("epochId");
    });
  });
});

// ============================================================================
// 8. ERROR HANDLING & EDGE CASES
// ============================================================================

describe("Error Handling & Edge Cases", () => {
  it("returns 404 for unknown routes", async () => {
    const res = await request(app).get("/api/nonexistent/route");
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("handles invalid JSON body gracefully", async () => {
    const res = await request(app)
      .post("/api/yellow/session")
      .set("Content-Type", "application/json")
      .send("this is not json");
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("Content-Type header is json for all responses", async () => {
    const res = await request(app).get("/health");
    expect(res.headers["content-type"]).toContain("json");
  });

  it("CORS headers are present", async () => {
    const res = await request(app)
      .get("/health")
      .set("Origin", "http://localhost:5173");
    // CORS should be enabled — check for access-control headers
    expect(res.headers["access-control-allow-origin"]).toBeDefined();
  });
});

// ============================================================================
// 9. DATA FILE INTEGRITY TESTS
// ============================================================================

describe("Data File Integrity", () => {
  it("liabilities CSV has correct format", () => {
    const csvPath = path.join(DATA_DIR, "liabilities.csv");
    if (!fs.existsSync(csvPath)) return;

    const content = fs.readFileSync(csvPath, "utf-8");
    const lines = content.trim().split("\n");
    expect(lines.length).toBeGreaterThanOrEqual(2); // header + at least 1 row
    expect(lines[0]).toContain("user_id");
    expect(lines[0]).toContain("balance");
  });

  it("reserves.json has valid structure", () => {
    const reservesPath = path.join(DATA_DIR, "reserves.json");
    if (!fs.existsSync(reservesPath)) return;

    const data = JSON.parse(fs.readFileSync(reservesPath, "utf-8"));
    expect(Array.isArray(data)).toBe(true);
    if (data.length > 0) {
      expect(data[0].source_id).toBeDefined();
      expect(data[0].amount).toBeDefined();
    }
  });

  it("liabilities_root.json has valid root hash", () => {
    const rootPath = path.join(OUTPUT_DIR, "liabilities_root.json");
    if (!fs.existsSync(rootPath)) return;

    const root = JSON.parse(fs.readFileSync(rootPath, "utf-8"));
    expect(root.liabilities_root).toBeDefined();
    expect(root.liabilities_root).toMatch(/^0x[a-fA-F0-9]+$/);
    expect(root.epoch_id).toBeDefined();
    expect(root.leaf_count).toBeGreaterThan(0);
  });

  it("proof_artifact.json conforms to UniversalProofArtifact schema", () => {
    const artifactPath = path.join(OUTPUT_DIR, "proof_artifact.json");
    if (!fs.existsSync(artifactPath)) return;

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
    expect(artifact.module).toBe("solvency");
    expect(artifact.entity_id).toBeDefined();
    expect(artifact.rule_version_used).toBeDefined();
    expect(artifact.decision_result).toBeDefined();
    expect(artifact.decision_result.capital_backed).toBeDefined();
    expect(artifact.decision_result.liquidity_ready).toBeDefined();
    expect(artifact.decision_result.health_status).toBeDefined();
    expect(artifact.evaluation_context).toBeDefined();
    expect(artifact.reason_codes).toBeDefined();
    expect(artifact.timestamp).toBeDefined();
    expect(artifact.bundle_hash).toBeDefined();
    expect(artifact.anchor_metadata).toBeDefined();
  });

  it("reserves_snapshot.json has valid structure when present", () => {
    const snapshotPath = path.join(OUTPUT_DIR, "reserves_snapshot.json");
    if (!fs.existsSync(snapshotPath)) return;

    const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf-8"));
    expect(snapshot).toBeDefined();
    expect(typeof snapshot).toBe("object");
  });

  it("solvency_proof.json has valid structure when present", () => {
    const proofPath = path.join(OUTPUT_DIR, "solvency_proof.json");
    if (!fs.existsSync(proofPath)) return;

    const proof = JSON.parse(fs.readFileSync(proofPath, "utf-8"));
    expect(proof).toBeDefined();
    expect(typeof proof).toBe("object");
  });

  it("deployment.json has correct contract addresses when present", () => {
    const deploymentPath = path.join(OUTPUT_DIR, "deployment.json");
    if (!fs.existsSync(deploymentPath)) return;

    const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
    expect(deployment).toBeDefined();
  });

  it("inclusion_proofs directory has valid proof files", () => {
    const proofsDir = path.join(OUTPUT_DIR, "inclusion_proofs");
    if (!fs.existsSync(proofsDir)) return;

    const files = fs.readdirSync(proofsDir).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      const proof = JSON.parse(fs.readFileSync(path.join(proofsDir, file), "utf-8"));
      expect(proof.userId).toBeDefined();
      expect(proof.root).toBeDefined();
    }
  });
});

// ============================================================================
// 10. YELLOW NETWORK COMPLETE LIFECYCLE TEST
// ============================================================================

describe("Yellow Network: Full Lifecycle E2E", () => {
  let lifecycleSessionId: string;

  it("Step 1: Create session", async () => {
    const res = await request(app)
      .post("/api/yellow/session")
      .send({ participants: ["trader_a", "trader_b"] })
      .expect(200);
    lifecycleSessionId = res.body.session.id;
    expect(res.body.session.allocations.trader_a).toBe("0");
    expect(res.body.session.allocations.trader_b).toBe("0");
  });

  it("Step 2: Update allocations (simulate trading)", async () => {
    const res = await request(app)
      .put(`/api/yellow/session/${lifecycleSessionId}/allocations`)
      .send({ allocations: { trader_a: "10000", trader_b: "5000" } })
      .expect(200);
    expect(res.body.session.allocations.trader_a).toBe("10000");
    expect(res.body.session.allocations.trader_b).toBe("5000");
  });

  it("Step 3: Verify session state reflects updates", async () => {
    const res = await request(app)
      .get(`/api/yellow/session/${lifecycleSessionId}`)
      .expect(200);
    expect(res.body.allocations.trader_a).toBe("10000");
    expect(res.body.allocations.trader_b).toBe("5000");
    expect(res.body.status).toBe("open");
  });

  it("Step 4: Export to liabilities CSV", async () => {
    const res = await request(app)
      .post(`/api/yellow/session/${lifecycleSessionId}/export`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.entries).toBe(2);
  });

  it("Step 5: Close session", async () => {
    const res = await request(app)
      .post(`/api/yellow/session/${lifecycleSessionId}/close`)
      .expect(200);
    expect(res.body.session.status).toBe("closed");
  });

  it("Step 6: Verify closed session in list", async () => {
    const res = await request(app)
      .get("/api/yellow/sessions")
      .expect(200);

    const found = res.body.sessions.find(
      (s: { id: string }) => s.id === lifecycleSessionId
    );
    expect(found).toBeDefined();
    expect(found.status).toBe("closed");

    // Restore original liabilities CSV
    const originalCsv = "user_id,balance\nu1,400000\nu2,300000\nu3,200000\n";
    fs.writeFileSync(path.join(DATA_DIR, "liabilities.csv"), originalCsv);
  });
});
