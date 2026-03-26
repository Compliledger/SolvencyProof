import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { yellowNetwork as yellowClearNode } from "../services/yellow-network.js";
import { createAlgorandAdapterClient } from "../algorand/adapter_client.js";
import type { AlgorandAdapterPayload } from "../algorand/adapter_types.js";
import type { UniversalProofArtifact } from "../types/proof_artifact.js";
import type { HealthStatus } from "../types/health.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../../.env") });

// RPC URLs for Sepolia (with fallbacks)
const RPC_URLS = [
  process.env.SEPOLIA_RPC_URL,
  "https://ethereum-sepolia-rpc.publicnode.com",
  "https://rpc.sepolia.org",
  "https://1rpc.io/sepolia",
].filter(Boolean) as string[];

// Helper to create public client with fallback RPCs
async function createPublicClientWithFallback() {
  const { createPublicClient, http } = await import("viem");
  const { sepolia } = await import("viem/chains");
  
  for (const rpcUrl of RPC_URLS) {
    try {
      const client = createPublicClient({
        chain: sepolia,
        transport: http(rpcUrl, { timeout: 15000 }),
      });
      // Test the connection
      await client.getBlockNumber();
      return client;
    } catch {
      console.log(`RPC ${rpcUrl.slice(0, 30)}... failed, trying next...`);
    }
  }
  throw new Error("All RPC endpoints failed");
}

const app = express();
const PORT = process.env.PORT || process.env.API_PORT || 3001;

// ============================================
// Rate Limiting
// ============================================

// Global limiter: applied to all routes
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? "", 10) || 15 * 60 * 1000, // default 15 min
  max: parseInt(process.env.RATE_LIMIT_MAX ?? "", 10) || 100, // default 100 req / window
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      error: "Too Many Requests",
      message: "You have exceeded the request rate limit. Please try again later.",
      retryAfter: res.getHeader("Retry-After"),
    });
  },
});

// Strict limiter for verify-stored (on-chain RPC call – expensive)
const verifyStoredLimiter = rateLimit({
  windowMs: parseInt(process.env.VERIFY_STORED_RATE_LIMIT_WINDOW_MS ?? "", 10) || 15 * 60 * 1000, // default 15 min
  max: parseInt(process.env.VERIFY_STORED_RATE_LIMIT_MAX ?? "", 10) || 10, // default 10 req / window
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      error: "Too Many Requests",
      message: "You have exceeded the rate limit for on-chain verification. Please try again later.",
      retryAfter: res.getHeader("Retry-After"),
    });
  },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(globalLimiter);

// Data directories
const DATA_DIR = path.join(__dirname, "../../../data");
const OUTPUT_DIR = path.join(DATA_DIR, "output");

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ============================================
// Health Check
// ============================================
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ============================================
// Liabilities Endpoints
// ============================================

// GET /api/liabilities - Get current liabilities data
app.get("/api/liabilities", (_req: Request, res: Response) => {
  try {
    const rootPath = path.join(OUTPUT_DIR, "liabilities_root.json");
    const totalPath = path.join(OUTPUT_DIR, "liabilities_total.json");
    const treePath = path.join(OUTPUT_DIR, "liabilities_tree.json");

    if (!fs.existsSync(rootPath)) {
      return res.status(404).json({ error: "Liabilities not built yet" });
    }

    const root = JSON.parse(fs.readFileSync(rootPath, "utf-8"));
    const total = JSON.parse(fs.readFileSync(totalPath, "utf-8"));
    const tree = fs.existsSync(treePath)
      ? JSON.parse(fs.readFileSync(treePath, "utf-8"))
      : null;

    res.json({
      root: root.liabilities_root,
      total: total.total_liabilities,
      epochId: root.epoch_id,
      leafCount: root.leaf_count,
      timestamp: root.timestamp,
      tree: tree ? { leafCount: tree.leaves?.length || 0 } : null,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to read liabilities data" });
  }
});

// POST /api/liabilities/build - Build liabilities Merkle tree
app.post("/api/liabilities/build", async (_req: Request, res: Response) => {
  try {
    const { execSync } = await import("child_process");
    const result = execSync("npx tsx src/liabilities-builder.ts", {
      cwd: path.join(__dirname, "../.."),
      encoding: "utf-8",
    });

    const rootPath = path.join(OUTPUT_DIR, "liabilities_root.json");
    const root = JSON.parse(fs.readFileSync(rootPath, "utf-8"));

    res.json({
      success: true,
      message: "Liabilities tree built successfully",
      data: root,
      output: result,
    });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: "Failed to build liabilities", details: error.message });
  }
});

// POST /api/liabilities/upload - Upload liabilities CSV
app.post("/api/liabilities/upload", (req: Request, res: Response) => {
  try {
    const { csvContent } = req.body;
    if (!csvContent) {
      return res.status(400).json({ error: "csvContent is required" });
    }

    const csvPath = path.join(DATA_DIR, "liabilities.csv");
    fs.writeFileSync(csvPath, csvContent);

    res.json({ success: true, message: "Liabilities CSV uploaded" });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: "Failed to upload CSV", details: error.message });
  }
});

// GET /api/liabilities/verify/:userId - Verify user inclusion
app.get("/api/liabilities/verify/:userId", async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;
    const { execSync } = await import("child_process");

    const result = execSync(`npx tsx src/verify-inclusion.ts ${userId}`, {
      cwd: path.join(__dirname, "../.."),
      encoding: "utf-8",
    });

    res.json({
      success: true,
      userId,
      output: result,
    });
  } catch (err: unknown) {
    const error = err as Error;
    // Return 404 if proof not found for user
    if (error.message.includes("not found") || error.message.includes("Inclusion proof not found")) {
      res.status(404).json({ error: "User not found", details: `No inclusion proof exists for user: ${req.params.userId}` });
    } else {
      res.status(500).json({ error: "Verification failed", details: error.message });
    }
  }
});

// ============================================
// Reserves Endpoints
// ============================================

// GET /api/reserves - Get current reserves snapshot
app.get("/api/reserves", (_req: Request, res: Response) => {
  try {
    const snapshotPath = path.join(OUTPUT_DIR, "reserves_snapshot.json");

    if (!fs.existsSync(snapshotPath)) {
      return res.status(404).json({ error: "Reserves not scanned yet" });
    }

    const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf-8"));
    res.json(snapshot);
  } catch (err) {
    res.status(500).json({ error: "Failed to read reserves data" });
  }
});

// POST /api/reserves/scan - Scan reserve addresses
app.post("/api/reserves/scan", async (_req: Request, res: Response) => {
  try {
    const { execSync } = await import("child_process");
    const result = execSync("npx tsx src/reserves-scanner.ts", {
      cwd: path.join(__dirname, "../.."),
      encoding: "utf-8",
      timeout: 60000,
    });

    const snapshotPath = path.join(OUTPUT_DIR, "reserves_snapshot.json");
    const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf-8"));

    res.json({
      success: true,
      message: "Reserves scanned successfully",
      data: snapshot,
      output: result,
    });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: "Failed to scan reserves", details: error.message });
  }
});

// POST /api/reserves/addresses - Update reserve addresses
app.post("/api/reserves/addresses", (req: Request, res: Response) => {
  try {
    const { addresses } = req.body;
    if (!addresses || !Array.isArray(addresses)) {
      return res.status(400).json({ error: "addresses array is required" });
    }

    const reservesPath = path.join(DATA_DIR, "reserves.json");
    fs.writeFileSync(reservesPath, JSON.stringify({ addresses }, null, 2));

    res.json({ success: true, message: "Reserve addresses updated", count: addresses.length });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: "Failed to update addresses", details: error.message });
  }
});

// ============================================
// ZK Proof Endpoints
// ============================================

// GET /api/proof - Get current proof data
app.get("/api/proof", (_req: Request, res: Response) => {
  try {
    const proofPath = path.join(OUTPUT_DIR, "solvency_proof.json");

    if (!fs.existsSync(proofPath)) {
      return res.status(404).json({ error: "Proof not generated yet" });
    }

    const proof = JSON.parse(fs.readFileSync(proofPath, "utf-8"));
    res.json(proof);
  } catch (err) {
    res.status(500).json({ error: "Failed to read proof data" });
  }
});

// POST /api/proof/generate - Generate ZK solvency proof
app.post("/api/proof/generate", async (_req: Request, res: Response) => {
  try {
    const { execSync } = await import("child_process");
    const result = execSync("npx tsx src/solvency-prover.ts", {
      cwd: path.join(__dirname, "../.."),
      encoding: "utf-8",
      timeout: 120000,
    });

    const proofPath = path.join(OUTPUT_DIR, "solvency_proof.json");
    const proof = JSON.parse(fs.readFileSync(proofPath, "utf-8"));

    res.json({
      success: true,
      message: "Proof generated successfully",
      data: {
        verified: proof.verified,
        epochId: proof.epochId,
        reservesTotal: proof.reservesTotal,
        liabilitiesRoot: proof.liabilitiesRoot,
      },
      output: result,
    });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: "Failed to generate proof", details: error.message });
  }
});

// POST /api/proof/submit - Submit proof on-chain
app.post("/api/proof/submit", async (_req: Request, res: Response) => {
  try {
    const { execSync } = await import("child_process");
    const result = execSync("npx tsx src/submit-proof.ts", {
      cwd: path.join(__dirname, "../.."),
      encoding: "utf-8",
      timeout: 120000,
    });

    const submissionPath = path.join(OUTPUT_DIR, "submission_result.json");
    if (fs.existsSync(submissionPath)) {
      const submission = JSON.parse(fs.readFileSync(submissionPath, "utf-8"));
      res.json({
        success: true,
        message: "Proof submitted on-chain",
        data: submission,
        output: result,
      });
    } else {
      res.json({
        success: true,
        message: "Proof submitted",
        output: result,
      });
    }
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: "Failed to submit proof", details: error.message });
  }
});

// ============================================
// Contract Endpoints
// ============================================

// GET /api/contracts - Get deployed contract addresses
app.get("/api/contracts", (_req: Request, res: Response) => {
  try {
    const deploymentPath = path.join(OUTPUT_DIR, "deployment.json");

    if (!fs.existsSync(deploymentPath)) {
      return res.status(404).json({ error: "Contracts not deployed yet" });
    }

    const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
    res.json(deployment);
  } catch (err) {
    res.status(500).json({ error: "Failed to read deployment data" });
  }
});

// GET /api/contracts/proof/:epochId - Get on-chain proof by epoch
app.get("/api/contracts/proof/:epochId", async (req: Request, res: Response) => {
  try {
    const epochId = req.params.epochId as string;
    const { parseAbi } = await import("viem");

    const deploymentPath = path.join(OUTPUT_DIR, "deployment.json");
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));

    const publicClient = await createPublicClientWithFallback();

    const abi = parseAbi([
      "function getProof(bytes32 epochId) external view returns (bytes32, bytes32, uint256, uint256, address, bool)",
    ]);

    // Pad epochId to bytes32
    const epochIdHex = ("0x" + BigInt(epochId).toString(16).padStart(64, "0")) as `0x${string}`;

    const proof = await publicClient.readContract({
      address: deployment.contracts.SolvencyProofRegistry as `0x${string}`,
      abi,
      functionName: "getProof",
      args: [epochIdHex],
    });

    res.json({
      epochId: proof[0],
      liabilitiesRoot: proof[1],
      reservesTotal: proof[2].toString(),
      timestamp: Number(proof[3]),
      submitter: proof[4],
      verified: proof[5],
    });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: "Failed to get on-chain proof", details: error.message });
  }
});

// GET /api/contracts/epoch-count - Get epoch count from contract
app.get("/api/contracts/epoch-count", async (_req: Request, res: Response) => {
  try {
    const { parseAbi } = await import("viem");

    const deploymentPath = path.join(OUTPUT_DIR, "deployment.json");
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));

    const publicClient = await createPublicClientWithFallback();

    const abi = parseAbi(["function getEpochCount() external view returns (uint256)"]);

    const count = await publicClient.readContract({
      address: deployment.contracts.SolvencyProofRegistry as `0x${string}`,
      abi,
      functionName: "getEpochCount",
    });

    res.json({ epochCount: Number(count) });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: "Failed to get epoch count", details: error.message });
  }
});

// ============================================
// Yellow Network Session Endpoints
// ============================================
// Real implementation using Nitrolite SDK with file-based persistence
// NO MOCKS - All sessions are persisted to disk with cryptographic state hashes

// POST /api/yellow/session - Create new Yellow session (state channel)
app.post("/api/yellow/session", async (req: Request, res: Response) => {
  try {
    const { participants } = req.body;
    if (!participants || !Array.isArray(participants)) {
      return res.status(400).json({ error: "participants array is required" });
    }

    const session = await yellowClearNode.createSession(participants);

    res.json({
      success: true,
      message: "Yellow session created (state channel opened)",
      session: {
        id: session.id,
        channelId: session.channelId,
        participants: session.participants,
        allocations: session.allocations,
        status: session.status,
        stateHash: session.stateHash,
        nonce: session.nonce,
        createdAt: session.createdAt,
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: "Failed to create session", details: error.message });
  }
});

// GET /api/yellow/session/:sessionId - Get session details
app.get("/api/yellow/session/:sessionId", (req: Request, res: Response) => {
  try {
    const sessionId = req.params.sessionId as string;
    const session = yellowClearNode.getSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    res.json(session);
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: "Failed to get session", details: error.message });
  }
});

// PUT /api/yellow/session/:sessionId/allocations - Update allocations (off-chain instant)
app.put("/api/yellow/session/:sessionId/allocations", async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.sessionId as string;
    const { allocations } = req.body;

    if (!allocations || typeof allocations !== "object") {
      return res.status(400).json({ error: "allocations object is required" });
    }

    const session = await yellowClearNode.updateAllocations(sessionId, allocations);

    res.json({
      success: true,
      message: `Allocations updated off-chain (nonce: ${session.nonce})`,
      session: {
        id: session.id,
        allocations: session.allocations,
        nonce: session.nonce,
        stateHash: session.stateHash,
        status: session.status,
        updatedAt: session.updatedAt,
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: "Failed to update allocations", details: error.message });
  }
});

// POST /api/yellow/session/:sessionId/close - Close session and prepare settlement
app.post("/api/yellow/session/:sessionId/close", async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.sessionId as string;
    const session = await yellowClearNode.closeSession(sessionId);

    res.json({
      success: true,
      message: "Session closed - ready for on-chain settlement",
      session: {
        id: session.id,
        channelId: session.channelId,
        allocations: session.allocations,
        nonce: session.nonce,
        stateHash: session.stateHash,
        status: session.status,
        closedAt: session.closedAt,
        totalUpdates: session.nonce,
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: "Failed to close session", details: error.message });
  }
});

// POST /api/yellow/session/:sessionId/export - Export session to liabilities CSV
app.post("/api/yellow/session/:sessionId/export", (req: Request, res: Response) => {
  try {
    const sessionId = req.params.sessionId as string;
    const csvPath = yellowClearNode.exportToLiabilities(sessionId);
    const session = yellowClearNode.getSession(sessionId);

    res.json({
      success: true,
      message: "Session exported to liabilities.csv",
      csvPath,
      entries: session ? Object.keys(session.allocations).length : 0,
      stateHash: session?.stateHash,
    });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: "Failed to export session", details: error.message });
  }
});

// GET /api/yellow/sessions - List all sessions
app.get("/api/yellow/sessions", (_req: Request, res: Response) => {
  try {
    const sessions = yellowClearNode.listSessions();
    const totalLiabilities = yellowClearNode.getTotalLiabilities();
    
    res.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        channelId: s.channelId,
        status: s.status,
        participantCount: s.participants.length,
        nonce: s.nonce,
        createdAt: s.createdAt,
        closedAt: s.closedAt,
      })),
      count: sessions.length,
      totalOpenLiabilities: totalLiabilities.toString(),
    });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: "Failed to list sessions", details: error.message });
  }
});

// GET /api/yellow/session/:sessionId/history - Get session state history
app.get("/api/yellow/session/:sessionId/history", (req: Request, res: Response) => {
  try {
    const sessionId = req.params.sessionId as string;
    const history = yellowClearNode.getSessionHistory(sessionId);
    
    res.json({
      sessionId,
      history,
      totalTransitions: history.length,
    });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: "Failed to get history", details: error.message });
  }
});

// POST /api/yellow/connect - Connect to Yellow ClearNode
app.post("/api/yellow/connect", async (_req: Request, res: Response) => {
  try {
    await yellowClearNode.connect();
    
    res.json({
      success: true,
      message: "Connected to Yellow ClearNode",
      connected: yellowClearNode.isConnected(),
    });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: "Failed to connect to ClearNode", details: error.message });
  }
});

// POST /api/yellow/authenticate - Authenticate with Yellow ClearNode
app.post("/api/yellow/authenticate", async (_req: Request, res: Response) => {
  try {
    await yellowClearNode.authenticate();
    
    res.json({
      success: true,
      message: "Authenticated with Yellow ClearNode",
      authenticated: yellowClearNode.isAuthenticated(),
    });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: "Failed to authenticate", details: error.message });
  }
});

// GET /api/yellow/status - Get Yellow ClearNode connection status
app.get("/api/yellow/status", (_req: Request, res: Response) => {
  res.json({
    connected: yellowClearNode.isConnected(),
    authenticated: yellowClearNode.isAuthenticated(),
    sessionsCount: yellowClearNode.listSessions().length,
    totalOpenLiabilities: yellowClearNode.getTotalLiabilities().toString(),
  });
});

// POST /api/yellow/stress-demo - Simulate Yellow Network liability streaming workflow
// This demonstrates Yellow's core value: instant off-chain updates → aggregated proof
app.post("/api/yellow/stress-demo", async (req: Request, res: Response) => {
  try {
    const { execSync } = await import("child_process");
    const startTime = Date.now();
    const events: Array<{ action: string; timestamp: number; details: string }> = [];

    // Configuration from request or use defaults
    const {
      numUpdates = 10,
      submitOnChain = false,
      participants = ["user_alice", "user_bob", "user_charlie"],
    } = req.body;

    events.push({ action: "start", timestamp: Date.now(), details: "Yellow stress demo initiated" });

    // Step 1: Create Yellow state channel session
    const session = await yellowClearNode.createSession(participants);
    events.push({ 
      action: "session_created", 
      timestamp: Date.now(), 
      details: `Channel ${session.channelId.slice(0, 16)}... opened with ${participants.length} participants` 
    });

    // Step 2: Simulate rapid off-chain liability updates (the core Yellow value)
    // These updates are INSTANT, require ZERO gas, and are cryptographically signed
    const updateLog: Array<{ user: string; oldBalance: string; newBalance: string; nonce: number }> = [];
    
    for (let i = 0; i < numUpdates; i++) {
      // Randomly select a user and update their balance
      const user = participants[Math.floor(Math.random() * participants.length)];
      const currentBalance = BigInt(session.allocations[user] || "0");
      // Simulate trading activity: add between 0.01 and 0.05 ETH per update
      const delta = BigInt(Math.floor(Math.random() * 40000000000000000) + 10000000000000000);
      const newBalance = currentBalance + delta;
      
      const oldBalanceStr = session.allocations[user] || "0";
      await yellowClearNode.updateAllocations(session.id, { [user]: newBalance.toString() });
      
      updateLog.push({
        user,
        oldBalance: oldBalanceStr,
        newBalance: newBalance.toString(),
        nonce: session.nonce + i + 1,
      });
    }
    
    events.push({ 
      action: "liability_updates", 
      timestamp: Date.now(), 
      details: `${numUpdates} off-chain state transitions completed (zero gas cost)` 
    });

    // Step 3: Export session to liabilities CSV (final state → Merkle tree input)
    const csvPath = yellowClearNode.exportToLiabilities(session.id);
    events.push({ 
      action: "export_liabilities", 
      timestamp: Date.now(), 
      details: `Session state exported to ${csvPath}` 
    });

    // Step 4: Build liabilities Merkle tree
    execSync("npx tsx src/liabilities-builder.ts", {
      cwd: path.join(__dirname, "../.."),
      encoding: "utf-8",
    });
    events.push({ 
      action: "merkle_built", 
      timestamp: Date.now(), 
      details: "Liabilities Merkle tree constructed" 
    });

    // Step 5: Scan reserves
    execSync("npx tsx src/reserves-scanner.ts", {
      cwd: path.join(__dirname, "../.."),
      encoding: "utf-8",
      timeout: 60000,
    });
    events.push({ 
      action: "reserves_scanned", 
      timestamp: Date.now(), 
      details: "On-chain reserve balances fetched" 
    });

    // Step 6: Generate ZK proof
    execSync("npx tsx src/solvency-prover.ts", {
      cwd: path.join(__dirname, "../.."),
      encoding: "utf-8",
      timeout: 120000,
    });
    events.push({ 
      action: "proof_generated", 
      timestamp: Date.now(), 
      details: "Groth16 ZK solvency proof created" 
    });

    // Load proof result
    const proofPath = path.join(OUTPUT_DIR, "solvency_proof.json");
    const proofData = fs.existsSync(proofPath)
      ? JSON.parse(fs.readFileSync(proofPath, "utf-8"))
      : null;

    // Step 7: Optionally submit on-chain
    let submissionResult = null;
    if (submitOnChain) {
      execSync("npx tsx src/submit-proof.ts", {
        cwd: path.join(__dirname, "../.."),
        encoding: "utf-8",
        timeout: 120000,
      });
      events.push({ 
        action: "proof_submitted", 
        timestamp: Date.now(), 
        details: "Proof verified and recorded on Sepolia" 
      });

      const submissionPath = path.join(OUTPUT_DIR, "submission_result.json");
      submissionResult = fs.existsSync(submissionPath)
        ? JSON.parse(fs.readFileSync(submissionPath, "utf-8"))
        : null;
    }

    // Load final state
    const liabilitiesPath = path.join(OUTPUT_DIR, "liabilities_total.json");
    const reservesPath = path.join(OUTPUT_DIR, "reserves_snapshot.json");
    const liabilities = fs.existsSync(liabilitiesPath)
      ? JSON.parse(fs.readFileSync(liabilitiesPath, "utf-8"))
      : null;
    const reserves = fs.existsSync(reservesPath)
      ? JSON.parse(fs.readFileSync(reservesPath, "utf-8"))
      : null;

    const totalTime = Date.now() - startTime;
    const finalSession = yellowClearNode.getSession(session.id);

    res.json({
      success: true,
      message: "Yellow Network stress demo completed",
      summary: {
        description: "Simulated high-frequency liability events via Yellow state channels",
        yellowValue: "All balance updates were INSTANT and ZERO-GAS via off-chain state channels",
        workflow: "Yellow sessions → Export → Merkle tree → ZK proof → On-chain verification",
      },
      session: {
        id: session.id,
        channelId: session.channelId,
        totalUpdates: finalSession?.nonce || numUpdates,
        finalAllocations: finalSession?.allocations,
        stateHash: finalSession?.stateHash,
      },
      solvency: {
        liabilitiesTotal: liabilities?.liabilities_total,
        reservesTotal: reserves?.reserves_total_wei,
        isSolvent: proofData?.solvencyResult?.isSolvent ?? 
          (BigInt(reserves?.reserves_total_wei || "0") >= BigInt(liabilities?.liabilities_total || "0")),
      },
      proof: proofData ? {
        generated: true,
        verifiedLocally: proofData.verified,
        epochId: proofData.calldata?.pubSignals?.[3],
      } : null,
      submission: submissionResult,
      performance: {
        totalTimeMs: totalTime,
        avgUpdateTimeMs: totalTime / numUpdates,
        events,
      },
      updateLog: updateLog.slice(0, 5), // Show first 5 updates as sample
    });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ 
      error: "Stress demo failed", 
      details: error.message,
      hint: "Ensure circuits are compiled and reserves wallet has funds"
    });
  }
});

// GET /api/yellow/session/:sessionId/settlement - Get settlement transaction details
app.get("/api/yellow/session/:sessionId/settlement", (req: Request, res: Response) => {
  try {
    const sessionId = req.params.sessionId as string;
    const session = yellowClearNode.getSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (!session.settlementTx) {
      return res.status(400).json({ 
        error: "Session not yet settled",
        status: session.status,
        hint: "Close the session first to trigger settlement"
      });
    }

    res.json({
      sessionId: session.id,
      status: session.status,
      settlementTx: session.settlementTx,
      settlementBlock: session.settlementBlock,
      etherscanUrl: `https://sepolia.etherscan.io/tx/${session.settlementTx}`,
      closedAt: session.closedAt,
      finalAllocations: session.allocations,
      totalLiabilities: Object.values(session.allocations).reduce(
        (sum, val) => sum + BigInt(val || "0"), 0n
      ).toString(),
    });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: "Failed to get settlement", details: error.message });
  }
});

// ============================================
// Full Workflow Endpoint
// ============================================

// POST /api/workflow/full - Run complete solvency proof workflow
app.post("/api/workflow/full", async (_req: Request, res: Response) => {
  try {
    const { execSync } = await import("child_process");
    const results: string[] = [];

    // Step 1: Build liabilities
    results.push("Building liabilities...");
    execSync("npx tsx src/liabilities-builder.ts", {
      cwd: path.join(__dirname, "../.."),
      encoding: "utf-8",
    });
    results.push("✓ Liabilities built");

    // Step 2: Scan reserves
    results.push("Scanning reserves...");
    execSync("npx tsx src/reserves-scanner.ts", {
      cwd: path.join(__dirname, "../.."),
      encoding: "utf-8",
      timeout: 60000,
    });
    results.push("✓ Reserves scanned");

    // Step 3: Generate proof
    results.push("Generating ZK proof...");
    execSync("npx tsx src/solvency-prover.ts", {
      cwd: path.join(__dirname, "../.."),
      encoding: "utf-8",
      timeout: 120000,
    });
    results.push("✓ Proof generated");

    // Step 4: Submit on-chain
    results.push("Submitting proof on-chain...");
    execSync("npx tsx src/submit-proof.ts", {
      cwd: path.join(__dirname, "../.."),
      encoding: "utf-8",
      timeout: 120000,
    });
    results.push("✓ Proof submitted on-chain");

    // Load final results
    const submissionPath = path.join(OUTPUT_DIR, "submission_result.json");
    const submission = fs.existsSync(submissionPath)
      ? JSON.parse(fs.readFileSync(submissionPath, "utf-8"))
      : null;

    res.json({
      success: true,
      message: "Full workflow completed",
      steps: results,
      submission,
    });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: "Workflow failed", details: error.message });
  }
});

// ============================================
// Epoch State Endpoints
// ============================================

// Module-level adapter client singleton — all epoch routes share this instance.
const epochAdapterClient = createAlgorandAdapterClient();

type EpochHealthStatus =
  | "HEALTHY"
  | "LIQUIDITY_STRESSED"
  | "UNDERCOLLATERALIZED"
  | "CRITICAL"
  | "EXPIRED";

interface AnchorMetadata {
  tx_id?: string;
  app_id?: string;
  network?: string;
  anchored_at?: number;
}

interface NormalizedEpochState {
  entity_id: string;
  epoch_id: number;
  liability_root: string;
  reserve_root?: string;
  reserve_snapshot_hash?: string;
  proof_hash: string;
  reserves_total: string;
  total_liabilities?: string;
  near_term_liabilities_total: string;
  liquid_assets_total: string;
  capital_backed: boolean;
  liquidity_ready: boolean;
  health_status: HealthStatus;
  timestamp: number;
  valid_until: number;
  anchored_at?: number;
  anchor_metadata?: AnchorMetadata;
  adapter_version?: string;
  /** Module identifier — always "solvency" */
  module: "solvency";
  /** Adapter/rule version used to produce this artifact */
  rule_version_used: string;
  /** Structured health decision result */
  decision_result: {
    capital_backed: boolean;
    liquidity_ready: boolean;
    health_status: HealthStatus;
  };
  /** Machine-readable reason codes explaining the decision */
  reason_codes: string[];
  /** Deterministic SHA-256 commitment hash (alias for proof_hash) */
  bundle_hash: string;
  /** On-chain anchor metadata — always structured */
  anchor_metadata: {
    anchored: boolean;
    network: string;
    application_id: string;
    transaction_id: string;
    anchored_at: number | null;
  };
}

/**
 * Normalises a raw epoch_id value to a plain integer.
 *
 * The older liabilities builder uses string identifiers such as "epoch_001",
 * while the newer engine writes plain numbers.  Both forms are handled:
 *   - number  → returned as-is
 *   - "42"    → parseInt → 42
 *   - "epoch_001" → strip non-digits → parseInt("001") → 1
 */
function parseEpochId(raw: unknown): number {
  if (typeof raw === "number") return raw;
  const s = String(raw ?? "0");
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  const digits = s.replace(/\D/g, "");
  return digits.length > 0 ? parseInt(digits, 10) : 0;
}

/**
 * Converts an AlgorandAdapterPayload into the NormalizedEpochState shape
 * expected by the frontend and epoch route handlers.
 *
 * anchored_at is taken directly from the adapter payload (on-chain anchor
 * timestamp) rather than from local file metadata.
 */
function normalizeAdapterPayload(payload: AlgorandAdapterPayload): NormalizedEpochState {
  const validStatuses: HealthStatus[] = [
    "HEALTHY",
    "LIQUIDITY_STRESSED",
    "UNDERCOLLATERALIZED",
    "CRITICAL",
    "EXPIRED",
  ];
  const healthStatus: HealthStatus = validStatuses.includes(
    payload.health_status as HealthStatus
  )
    ? (payload.health_status as HealthStatus)
    : "CRITICAL";

  const anchoredAt = payload.anchored_at ?? undefined;
  const anchorMetadata: AnchorMetadata | undefined =
    anchoredAt !== undefined
      ? {
          anchored_at: anchoredAt,
          ...(process.env.ALGORAND_APP_ID !== undefined && { app_id: process.env.ALGORAND_APP_ID }),
          network:     process.env.ALGORAND_NETWORK ?? "testnet",
        }
      : undefined;

  return {
    entity_id:                   payload.entity_id,
    epoch_id:                    payload.epoch_id,
    liability_root:              payload.liability_root,
    reserve_root:                payload.reserve_root,
    reserve_snapshot_hash:       payload.reserve_snapshot_hash,
    proof_hash:                  payload.proof_hash,
    reserves_total:              payload.reserves_total,
    // total_liabilities is optional — absent when the adapter omits it from the on-chain record
    total_liabilities:           payload.total_liabilities ?? undefined,
    near_term_liabilities_total: payload.near_term_liabilities_total,
    liquid_assets_total:         payload.liquid_assets_total,
    capital_backed:              payload.capital_backed,
    liquidity_ready:             payload.liquidity_ready,
    health_status:               healthStatus,
    timestamp:                   payload.timestamp,
    valid_until:                 payload.valid_until,
    // anchored_at is optional — absent when the epoch has not yet been submitted on-chain
    anchored_at:                 anchoredAt,
    anchor_metadata:             anchorMetadata,
    adapter_version:             payload.adapter_version,
    // Universal Proof Artifact Schema fields
    module:                      "solvency",
    rule_version_used:           payload.adapter_version ?? "",
    decision_result: {
      capital_backed:  payload.capital_backed,
      liquidity_ready: payload.liquidity_ready,
      health_status:   healthStatus,
    },
    reason_codes: [
      payload.capital_backed  ? "CAPITAL_BACKED"  : "NOT_CAPITAL_BACKED",
      payload.liquidity_ready ? "LIQUIDITY_READY" : "NOT_LIQUIDITY_READY",
    ],
    bundle_hash:     payload.proof_hash,
    anchor_metadata: {
      anchored:        payload.anchored_at != null,
      network:         "algorand",
      application_id:  "",
      transaction_id:  "",
      anchored_at:     payload.anchored_at ?? null,
    },
  };
}

/**
 * FALLBACK ONLY — Reads available output files and assembles a NormalizedEpochState
 * for the given entity.
 *
 * This function is used as a fallback when the Algorand adapter client is
 * unavailable or returns null. It is NOT the primary source of truth; the
 * adapter-backed path should be preferred at all times.
 *
 * Returns null when the mandatory liabilities_root.json has not been built yet.
 */
function buildEpochStateFromFiles(entityId: string): NormalizedEpochState | null {
  const liabRootPath  = path.join(OUTPUT_DIR, "liabilities_root.json");
  const liabTotalPath = path.join(OUTPUT_DIR, "liabilities_total.json");
  const reservesPath  = path.join(OUTPUT_DIR, "reserves_snapshot.json");
  const proofPath     = path.join(OUTPUT_DIR, "solvency_proof.json");
  const submissionPath = path.join(OUTPUT_DIR, "submission_result.json");

  if (!fs.existsSync(liabRootPath)) return null;

  const liabRoot  = JSON.parse(fs.readFileSync(liabRootPath,  "utf-8"));
  const liabTotal = fs.existsSync(liabTotalPath) ? JSON.parse(fs.readFileSync(liabTotalPath, "utf-8")) : null;
  const reserves  = fs.existsSync(reservesPath)  ? JSON.parse(fs.readFileSync(reservesPath,  "utf-8")) : null;
  const proof     = fs.existsSync(proofPath)     ? JSON.parse(fs.readFileSync(proofPath,     "utf-8")) : null;
  const submission = fs.existsSync(submissionPath) ? JSON.parse(fs.readFileSync(submissionPath, "utf-8")) : null;

  // Normalise epoch_id — handles number, "42", and "epoch_001" formats
  const numericId = parseEpochId(liabRoot.epoch_id);

  // Monetary amounts — reserves_snapshot uses wei strings; liabilities use raw strings
  const reservesTotalWei: string  = reserves?.reserves_total_wei  ?? "0";
  const totalLiabilities: string  = liabTotal?.liabilities_total  ?? "0";
  // Near-term = total liabilities (worst-case; no bucket data available yet)
  const nearTermLiabilities: string = totalLiabilities;
  // All on-chain reserves counted as liquid (no illiquid-asset data yet)
  const liquidAssetsTotal: string = reservesTotalWei;

  let capitalBacked  = false;
  let liquidityReady = false;
  try {
    capitalBacked  = BigInt(reservesTotalWei) >= BigInt(totalLiabilities);
    liquidityReady = BigInt(liquidAssetsTotal) >= BigInt(nearTermLiabilities);
  } catch {
    // Non-parseable amounts — remain false
  }

  let healthStatus: HealthStatus;
  if      (capitalBacked  && liquidityReady)  healthStatus = "HEALTHY";
  else if (capitalBacked  && !liquidityReady) healthStatus = "LIQUIDITY_STRESSED";
  else if (!capitalBacked && liquidityReady)  healthStatus = "UNDERCOLLATERALIZED";
  else                                        healthStatus = "CRITICAL";

  // liabilities_root.json stores timestamp in milliseconds (Date.now())
  const rawTs: number = liabRoot.timestamp ?? Date.now();
  const timestamp = rawTs > 1e10 ? Math.floor(rawTs / 1000) : rawTs;
  const validUntil = timestamp + 86400; // 24-hour validity window

  // Mark expired if current time is past valid_until
  const now = Math.floor(Date.now() / 1000);
  if (now > validUntil) healthStatus = "EXPIRED";

  // proof_hash: prefer publicSignals from the proof file, else use liability root
  const proofHash: string =
    (proof?.publicSignals && Array.isArray(proof.publicSignals) && proof.publicSignals.length >= 2)
      ? String(proof.publicSignals[1])   // publicSignals[1] = liabilitiesRoot (see solvency-prover.ts)
      : (liabRoot.liabilities_root ?? "0x0");

  // anchored_at is set if a submission result exists (on-chain tx was recorded)
  const anchoredAt: number | undefined = submission?.timestamp
    ? (submission.timestamp > 1e10 ? Math.floor(submission.timestamp / 1000) : submission.timestamp)
    : undefined;

  return {
    entity_id:                   entityId,
    epoch_id:                    numericId,
    liability_root:              liabRoot.liabilities_root ?? "",
    proof_hash:                  proofHash,
    reserves_total:              reservesTotalWei,
    total_liabilities:           totalLiabilities,
    near_term_liabilities_total: nearTermLiabilities,
    liquid_assets_total:         liquidAssetsTotal,
    capital_backed:              capitalBacked,
    liquidity_ready:             liquidityReady,
    health_status:               healthStatus,
    timestamp,
    valid_until:                 validUntil,
    anchored_at:                 anchoredAt,
    // Universal Proof Artifact Schema fields
    module:                      "solvency",
    rule_version_used:           "backend-v1",
    decision_result: {
      capital_backed:  capitalBacked,
      liquidity_ready: liquidityReady,
      health_status:   healthStatus,
    },
    reason_codes: [
      capitalBacked  ? "CAPITAL_BACKED"  : "NOT_CAPITAL_BACKED",
      liquidityReady ? "LIQUIDITY_READY" : "NOT_LIQUIDITY_READY",
    ],
    bundle_hash:     proofHash,
    anchor_metadata: {
      anchored:        anchoredAt != null,
      network:         "algorand",
      application_id:  "",
      transaction_id:  submission?.txId ?? "",
      anchored_at:     anchoredAt ?? null,
    },
  };
}

// ----------------------------------------------------------------
// NOTE: specific routes must be declared BEFORE /:entityId to avoid
// Express matching "health" or "verify-stored" as an entity ID.
// ----------------------------------------------------------------

// GET /api/epoch/artifact?entity_id=<entityId>
// Returns the latest UniversalProofArtifact for the entity.
// Primary source: proof_artifact.json written by build-epoch (file-based).
// Falls back to constructing an artifact from the epoch state when the
// dedicated file is not present.
app.get("/api/epoch/artifact", async (req: Request, res: Response) => {
  const entityId = (req.query.entity_id as string | undefined) ?? "default";
  try {
    // Primary: return the pre-built proof_artifact.json file when available
    const artifactPath = path.join(OUTPUT_DIR, "proof_artifact.json");
    if (fs.existsSync(artifactPath)) {
      const artifact: UniversalProofArtifact = JSON.parse(
        fs.readFileSync(artifactPath, "utf-8")
      );
      return res.json(artifact);
    }

    // Fallback: construct artifact from the current epoch state
    const state = buildEpochStateFromFiles(entityId);
    if (!state) {
      return res.status(404).json({
        error: "No proof artifact available — run the full workflow first",
      });
    }

    const artifact: UniversalProofArtifact = {
      module:            "solvency",
      entity_id:         state.entity_id,
      rule_version_used: state.rule_version_used,
      decision_result:   state.decision_result,
      evaluation_context: {
        reserves_total:              Number(state.reserves_total),
        total_liabilities:           Number(state.total_liabilities ?? "0"),
        liquid_assets_total:         Number(state.liquid_assets_total),
        near_term_liabilities_total: Number(state.near_term_liabilities_total),
        capital_backed:              state.capital_backed,
        liquidity_ready:             state.liquidity_ready,
        jurisdiction:                "",
        epoch_id:                    state.epoch_id,
        marketproof_status:          "UNKNOWN",
      },
      reason_codes:    state.reason_codes,
      timestamp:       state.timestamp,
      bundle_hash:     state.bundle_hash,
      anchor_metadata: state.anchor_metadata,
    };
    return res.json(artifact);
  } catch (err: unknown) {
    const error = err as Error;
    return res.status(500).json({ error: "Failed to read proof artifact", details: error.message });
  }
});

// GET /api/epoch/health?entity_id=<entityId>
app.get("/api/epoch/health", async (req: Request, res: Response) => {
  const entityId = req.query.entity_id as string | undefined;
  if (!entityId) {
    return res.status(400).json({ error: "entity_id query parameter is required" });
  }

  try {
    // Primary: retrieve health status from the Algorand adapter (on-chain source of truth)
    try {
      const adapterHealth = await epochAdapterClient.getHealthStatus(entityId);
      if (adapterHealth) {
        console.info(
          `[ADAPTER_SUCCESS] [epoch/health] entity=${entityId} health_status=${adapterHealth.health_status}`
        );
        return res.json({
          entity_id:     adapterHealth.entity_id,
          health_status: adapterHealth.health_status,
          is_healthy:    adapterHealth.is_healthy,
          is_fresh:      adapterHealth.is_fresh,
          valid_until:   adapterHealth.valid_until,
          timestamp:     adapterHealth.timestamp,
          source_type:   "algorand-adapter",
        });
      }
    } catch (adapterErr) {
      console.error(
        `[ADAPTER_ERROR] [epoch/health] entity=${entityId}:`,
        adapterErr
      );
    }

    // FALLBACK: read from local output files when adapter is unavailable or returned null
    console.info(`[FALLBACK_USED] [epoch/health] entity=${entityId}`);
    const state = buildEpochStateFromFiles(entityId);
    if (!state) {
      return res.status(404).json({ error: "No epoch state found for entity", entity_id: entityId });
    }

    const now = Math.floor(Date.now() / 1000);
    return res.json({
      entity_id:     state.entity_id,
      health_status: state.health_status,
      is_healthy:    state.health_status === "HEALTHY",
      is_fresh:      now <= state.valid_until,
      valid_until:   state.valid_until,
      timestamp:     state.timestamp,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return res.status(500).json({ error: "Failed to read epoch health", details: error.message });
  }
});

// GET /api/epoch/verify-stored?entity_id=<entityId>&epoch_id=<epochId>
app.get("/api/epoch/verify-stored", verifyStoredLimiter, async (req: Request, res: Response) => {
  const entityId = req.query.entity_id as string | undefined;
  const rawEpochId = req.query.epoch_id as string | undefined;

  if (!entityId) {
    return res.status(400).json({ error: "entity_id query parameter is required" });
  }
  if (!rawEpochId) {
    return res.status(400).json({ error: "epoch_id query parameter is required" });
  }
  const epochId = parseInt(rawEpochId, 10);
  if (Number.isNaN(epochId)) {
    return res.status(400).json({ error: "epoch_id must be a valid integer" });
  }

  try {
    // Primary: call the Algorand adapter to verify on-chain record
    try {
      const adapterResult = await epochAdapterClient.verifyStoredRecord(entityId, epochId);
      console.info(
        `[ADAPTER_SUCCESS] [epoch/verify-stored] entity=${entityId} epoch=${epochId} verified=${adapterResult.verified}`
      );

      // When verified, retrieve the full on-chain record to populate the response
      let record: NormalizedEpochState | null = null;
      if (adapterResult.verified) {
        try {
          const adapterRecord = await epochAdapterClient.getEpochRecord(entityId, epochId);
          if (adapterRecord) {
            record = normalizeAdapterPayload(adapterRecord);
          }
        } catch (recordErr) {
          console.error(
            `[ADAPTER_ERROR] [epoch/verify-stored] getEpochRecord failed for entity=${entityId} epoch=${epochId}:`,
            recordErr
          );
        }
      }

      return res.json({
        exists:     adapterResult.verified,
        matches:    adapterResult.verified,
        mismatches: adapterResult.verified ? [] : [adapterResult.message],
        record,
      });
    } catch (adapterErr) {
      console.error(
        `[ADAPTER_ERROR] [epoch/verify-stored] entity=${entityId} epoch=${epochId}:`,
        adapterErr
      );
    }

    // FALLBACK: check local file state when adapter is unavailable
    console.info(`[FALLBACK_USED] [epoch/verify-stored] entity=${entityId} epoch=${epochId}`);
    const state = buildEpochStateFromFiles(entityId);

    if (!state) {
      return res.status(404).json({
        exists:     false,
        matches:    false,
        mismatches: [],
        record:     null,
      });
    }

    const exists = state.epoch_id === epochId;
    return res.json({
      exists,
      matches:    false, // on-chain verification unavailable
      mismatches: exists ? ["on-chain verification unavailable - adapter unreachable"] : [],
      record:     exists ? state : null,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return res.status(500).json({ error: "Failed to verify stored record", details: error.message });
  }
});

// GET /api/epoch/latest?entity_id=<entityId>
app.get("/api/epoch/latest", async (req: Request, res: Response) => {
  const entityId = (req.query.entity_id as string | undefined) ?? "default";
  try {
    // Primary: retrieve latest state from the Algorand adapter (on-chain source of truth)
    try {
      const adapterState = await epochAdapterClient.getLatestState(entityId);
      if (adapterState) {
        console.info(
          `[ADAPTER_SUCCESS] [epoch/latest] entity=${entityId} epoch=${adapterState.epoch_id}`
        );
        return res.json(normalizeAdapterPayload(adapterState));
      }
    } catch (adapterErr) {
      console.error(
        `[ADAPTER_ERROR] [epoch/latest] entity=${entityId}:`,
        adapterErr
      );
    }

    // FALLBACK: read from local output files when adapter is unavailable or returned null
    console.info(`[FALLBACK_USED] [epoch/latest] entity=${entityId}`);
    const state = buildEpochStateFromFiles(entityId);
    if (!state) {
      return res.status(404).json({ error: "No epoch state found — run the full workflow first" });
    }
    return res.json(state);
  } catch (err: unknown) {
    const error = err as Error;
    return res.status(500).json({ error: "Failed to read epoch state", details: error.message });
  }
});

// GET /api/epoch/history?entity_id=<entityId>
app.get("/api/epoch/history", async (req: Request, res: Response) => {
  const entityId = (req.query.entity_id as string | undefined) ?? "default";
  try {
    // Primary: retrieve epoch history from the Algorand adapter (on-chain source of truth)
    try {
      const adapterHistory = await epochAdapterClient.getEpochHistory(entityId);
      if (adapterHistory.length > 0) {
        console.info(
          `[ADAPTER_SUCCESS] [epoch/history] entity=${entityId} count=${adapterHistory.length}`
        );
        return res.json(adapterHistory);
      }
    } catch (adapterErr) {
      console.error(
        `[ADAPTER_ERROR] [epoch/history] entity=${entityId}:`,
        adapterErr
      );
    }

    // FALLBACK: read from local output files when adapter is unavailable or returned empty
    // Only the latest epoch is persisted to disk; returns a single-element array.
    console.info(`[FALLBACK_USED] [epoch/history] entity=${entityId}`);
    const state = buildEpochStateFromFiles(entityId);
    if (!state) {
      return res.json([]);
    }
    return res.json([state]);
  } catch (err: unknown) {
    const error = err as Error;
    return res.status(500).json({ error: "Failed to read epoch history", details: error.message });
  }
});

// GET /api/epoch/:entityId               → latest state for entity
// GET /api/epoch/:entityId?epochId=<n>   → specific epoch record for entity
app.get("/api/epoch/:entityId", async (req: Request, res: Response) => {
  const entityId   = req.params.entityId as string;
  const rawEpochId = req.query.epochId as string | undefined;

  try {
    // When a specific epochId is requested, use getEpochRecord() on the adapter
    if (rawEpochId !== undefined) {
      const epochId = parseInt(rawEpochId, 10);
      if (Number.isNaN(epochId)) {
        return res.status(400).json({ error: "epochId must be a valid integer" });
      }

      // Primary: retrieve specific epoch record from the adapter
      try {
        const adapterRecord = await epochAdapterClient.getEpochRecord(entityId, epochId);
        if (adapterRecord) {
          console.info(
            `[ADAPTER_SUCCESS] [epoch/:entityId] entity=${entityId} epoch=${epochId}`
          );
          return res.json(normalizeAdapterPayload(adapterRecord));
        }
      } catch (adapterErr) {
        console.error(
          `[ADAPTER_ERROR] [epoch/:entityId] getEpochRecord entity=${entityId} epoch=${epochId}:`,
          adapterErr
        );
      }

      // FALLBACK: check file-based state for the requested epochId
      console.info(
        `[FALLBACK_USED] [epoch/:entityId] entity=${entityId} epoch=${epochId}`
      );
      const fileState = buildEpochStateFromFiles(entityId);
      if (!fileState || fileState.epoch_id !== epochId) {
        return res.status(404).json({
          error:     "Epoch not found",
          entity_id: entityId,
          epoch_id:  epochId,
        });
      }
      return res.json(fileState);
    }

    // No specific epochId — return the latest state for the entity
    // Primary: retrieve latest state from the adapter
    try {
      const adapterState = await epochAdapterClient.getLatestState(entityId);
      if (adapterState) {
        console.info(
          `[ADAPTER_SUCCESS] [epoch/:entityId] entity=${entityId} epoch=${adapterState.epoch_id}`
        );
        return res.json(normalizeAdapterPayload(adapterState));
      }
    } catch (adapterErr) {
      console.error(
        `[ADAPTER_ERROR] [epoch/:entityId] getLatestState entity=${entityId}:`,
        adapterErr
      );
    }

    // FALLBACK: read from local output files
    console.info(`[FALLBACK_USED] [epoch/:entityId] entity=${entityId}`);
    const state = buildEpochStateFromFiles(entityId);
    if (!state) {
      return res.status(404).json({
        error:     "No epoch state found for entity — run the full workflow first",
        entity_id: entityId,
      });
    }
    return res.json(state);
  } catch (err: unknown) {
    const error = err as Error;
    return res.status(500).json({ error: "Failed to read epoch state", details: error.message });
  }
});

// ============================================
// Error Handler
// ============================================
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("API Error:", err);
  res.status(500).json({ error: "Internal server error", details: err.message });
});

// ============================================
// Start Server
// ============================================
const HOST = "0.0.0.0";
app.listen(Number(PORT), HOST, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           SolvencyProof API Server                            ║
╠═══════════════════════════════════════════════════════════════╣
║  Running on: http://${HOST}:${PORT}                              ║
╠═══════════════════════════════════════════════════════════════╣
║  Endpoints:                                                   ║
║  ─────────────────────────────────────────────────────────────║
║  GET  /health                    - Health check               ║
║  ─────────────────────────────────────────────────────────────║
║  GET  /api/liabilities           - Get liabilities data       ║
║  POST /api/liabilities/build     - Build Merkle tree          ║
║  POST /api/liabilities/upload    - Upload CSV                 ║
║  GET  /api/liabilities/verify/:id - Verify inclusion          ║
║  ─────────────────────────────────────────────────────────────║
║  GET  /api/reserves              - Get reserves snapshot      ║
║  POST /api/reserves/scan         - Scan reserve addresses     ║
║  POST /api/reserves/addresses    - Update addresses           ║
║  ─────────────────────────────────────────────────────────────║
║  GET  /api/proof                 - Get proof data             ║
║  POST /api/proof/generate        - Generate ZK proof          ║
║  POST /api/proof/submit          - Submit on-chain            ║
║  ─────────────────────────────────────────────────────────────║
║  GET  /api/contracts             - Get deployed addresses     ║
║  GET  /api/contracts/proof/:id   - Get on-chain proof         ║
║  GET  /api/contracts/epoch-count - Get epoch count            ║
║  ─────────────────────────────────────────────────────────────║
║  POST /api/yellow/session        - Create Yellow session      ║
║  GET  /api/yellow/session/:id    - Get session details        ║
║  PUT  /api/yellow/session/:id/allocations - Update balances   ║
║  POST /api/yellow/session/:id/close - Close & settle          ║
║  POST /api/yellow/session/:id/export - Export to CSV          ║
║  GET  /api/yellow/sessions       - List all sessions          ║
║  POST /api/yellow/stress-demo    - Yellow stress demo         ║
║  ─────────────────────────────────────────────────────────────║
║  POST /api/workflow/full         - Run complete workflow      ║
║  ─────────────────────────────────────────────────────────────║
║  GET  /api/epoch/artifact        - Universal proof artifact    ║
║  GET  /api/epoch/health          - Entity health status       ║
║  GET  /api/epoch/verify-stored   - Verify on-chain record     ║
║  GET  /api/epoch/latest          - Latest epoch state         ║
║  GET  /api/epoch/history         - Epoch history              ║
║  GET  /api/epoch/:entityId       - Entity epoch (+ ?epochId)  ║
╚═══════════════════════════════════════════════════════════════╝
`);
});

export default app;
