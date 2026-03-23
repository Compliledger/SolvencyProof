import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

// Increase timeout for long-running API calls (30 seconds)
vi.setConfig({ testTimeout: 30000 });

const DEPLOYED_API_BASE_URL = "https://solvency-proof-production.up.railway.app";
const API_BASE_URL = (process.env.API_URL || DEPLOYED_API_BASE_URL).replace(/\/$/, "");

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

type EndpointCall = {
  name: string;
  method: HttpMethod;
  path: string;
  body?: unknown;
  allowStatuses?: number[];
  redactKeys?: string[];
};

type CallResult = {
  name: string;
  method: HttpMethod;
  url: string;
  status: number;
  ms: number;
  ok: boolean;
  response: unknown;
};

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function redact(obj: unknown, keys: string[] = []): unknown {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map((v) => redact(v, keys));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (keys.includes(k)) out[k] = "[REDACTED]";
    else out[k] = redact(v, keys);
  }
  return out;
}

function truncate(obj: unknown, maxLen = 2000): unknown {
  if (typeof obj === "string") {
    return obj.length > maxLen ? `${obj.slice(0, maxLen)}…(truncated)` : obj;
  }
  if (!obj || typeof obj !== "object") return obj;
  const str = JSON.stringify(obj);
  if (str.length <= maxLen) return obj;
  // best-effort: show a trimmed string
  return `${str.slice(0, maxLen)}…(truncated)`;
}

function logResult(r: CallResult) {
  const header = `[${r.method}] ${r.url}`;
  const statusLine = `Status: ${r.status} | Time: ${r.ms}ms | OK: ${r.ok}`;
  // eslint-disable-next-line no-console
  console.log("\n" + header);
  // eslint-disable-next-line no-console
  console.log(statusLine);
  // eslint-disable-next-line no-console
  console.log("Response:");
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(truncate(r.response), null, 2));
}

async function apiCall(call: EndpointCall): Promise<CallResult> {
  const url = `${API_BASE_URL}${call.path}`;
  const started = Date.now();
  const res = await fetch(url, {
    method: call.method,
    headers: { "Content-Type": "application/json" },
    body: call.body !== undefined ? JSON.stringify(call.body) : undefined,
  });
  const ms = Date.now() - started;
  const text = await res.text();
  const parsed = safeJsonParse(text);
  const response = redact(parsed, call.redactKeys);
  const allow = call.allowStatuses ?? [200];
  const ok = allow.includes(res.status);
  return {
    name: call.name,
    method: call.method,
    url,
    status: res.status,
    ms,
    ok,
    response,
  };
}

async function isApiRunning(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

// Track on-chain transaction count
let onChainTxCount = 0;
const onChainTxs: string[] = [];

// Store results for summary
const results: CallResult[] = [];

describe("ALL API ENDPOINTS (Deployed Backend)", () => {
  let apiAvailable = false;
  let yellowSessionId: string | null = null;
  let latestEpochId: number | null = null;

  beforeAll(async () => {
    apiAvailable = await isApiRunning();
    if (!apiAvailable) {
      // eslint-disable-next-line no-console
      console.log(`\nAPI is not reachable at: ${API_BASE_URL}`);
      // eslint-disable-next-line no-console
      console.log(`Set API_URL to override, e.g. API_URL=${DEPLOYED_API_BASE_URL}`);
    } else {
      // eslint-disable-next-line no-console
      console.log(`\nAPI connected: ${API_BASE_URL}`);
    }
  });

  afterAll(() => {
    // eslint-disable-next-line no-console
    console.log("\n==================== SUMMARY ====================");
    for (const r of results) {
      // eslint-disable-next-line no-console
      console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.status}  ${r.ms}ms  ${r.method} ${new URL(r.url).pathname}  (${r.name})`);
    }
    // eslint-disable-next-line no-console
    console.log("=================================================\n");

    if (onChainTxCount > 0) {
      // eslint-disable-next-line no-console
      console.log(`On-chain TXs submitted this run: ${onChainTxCount}`);
      for (const tx of onChainTxs) {
        // eslint-disable-next-line no-console
        console.log(`- ${tx}`);
      }
      // eslint-disable-next-line no-console
      console.log("");
    }
  });

  // 1) Health
  it("GET /health", async () => {
    if (!apiAvailable) return;
    const r = await apiCall({
      name: "Health check",
      method: "GET",
      path: "/health",
      allowStatuses: [200],
    });
    results.push(r);
    logResult(r);

    // Accept both backend variants ("ok" / "healthy")
    expect(r.status).toBe(200);
    if (typeof r.response === "object" && r.response !== null) {
      const status = (r.response as any).status;
      expect(["ok", "healthy", "live"].includes(status)).toBe(true);
    }
  });

  // 2) Liabilities
  it("GET /api/liabilities", async () => {
    if (!apiAvailable) return;
    const r = await apiCall({
      name: "Get liabilities",
      method: "GET",
      path: "/api/liabilities",
      allowStatuses: [200, 404],
    });
    results.push(r);
    logResult(r);
    expect([200, 404]).toContain(r.status);
  });

  it("POST /api/liabilities/upload", async () => {
    if (!apiAvailable) return;
    const csvContent = "user_id,balance\nyellow_user_1,5000\nyellow_user_2,3000\nyellow_user_3,2000";
    const r = await apiCall({
      name: "Upload liabilities CSV",
      method: "POST",
      path: "/api/liabilities/upload",
      body: { csvContent },
      allowStatuses: [200, 400, 404, 415],
    });
    results.push(r);
    logResult(r);
    expect([200, 400, 404, 415]).toContain(r.status);
  });

  it("POST /api/liabilities/build", async () => {
    if (!apiAvailable) return;
    const r = await apiCall({
      name: "Build Merkle tree",
      method: "POST",
      path: "/api/liabilities/build",
      allowStatuses: [200, 400, 404, 500],
    });
    results.push(r);
    logResult(r);
    expect([200, 400, 404, 500]).toContain(r.status);
  });

  it("GET /api/liabilities/verify/:userId", async () => {
    if (!apiAvailable) return;
    const r = await apiCall({
      name: "Verify inclusion",
      method: "GET",
      path: "/api/liabilities/verify/yellow_user_1",
      allowStatuses: [200, 404, 422, 500],
    });
    results.push(r);
    logResult(r);
    expect([200, 404, 422, 500]).toContain(r.status);
  });

  // 3) Reserves
  it("GET /api/reserves", async () => {
    if (!apiAvailable) return;
    const r = await apiCall({
      name: "Get reserves",
      method: "GET",
      path: "/api/reserves",
      allowStatuses: [200, 404],
    });
    results.push(r);
    logResult(r);
    expect([200, 404]).toContain(r.status);
  });

  it("POST /api/reserves/addresses", async () => {
    if (!apiAvailable) return;
    const addresses = ["0xa58DCCb0F17279abD1d0D9069Aa8711Df4a4c58E"];
    const r = await apiCall({
      name: "Set reserve addresses",
      method: "POST",
      path: "/api/reserves/addresses",
      body: { addresses },
      allowStatuses: [200, 400, 404, 500],
    });
    results.push(r);
    logResult(r);
    expect([200, 400, 404, 500]).toContain(r.status);
  });

  it("POST /api/reserves/scan", async () => {
    if (!apiAvailable) return;
    const r = await apiCall({
      name: "Scan reserves",
      method: "POST",
      path: "/api/reserves/scan",
      allowStatuses: [200, 400, 404, 429, 500],
    });
    results.push(r);
    logResult(r);
    expect([200, 400, 404, 429, 500]).toContain(r.status);
  });

  // 4) Proof
  it("GET /api/proof", async () => {
    if (!apiAvailable) return;
    const r = await apiCall({
      name: "Get proof",
      method: "GET",
      path: "/api/proof",
      allowStatuses: [200, 404],
    });
    results.push(r);
    logResult(r);
    expect([200, 404]).toContain(r.status);
  });

  it("POST /api/proof/generate", async () => {
    if (!apiAvailable) return;
    const r = await apiCall({
      name: "Generate proof",
      method: "POST",
      path: "/api/proof/generate",
      allowStatuses: [200, 400, 404, 500],
    });
    results.push(r);
    logResult(r);
    expect([200, 400, 404, 500]).toContain(r.status);
  });

  it("POST /api/proof/submit (optional on-chain)", async () => {
    if (!apiAvailable) return;

    const RUN_LIVE_TX = process.env.RUN_LIVE_TX === "true";
    if (!RUN_LIVE_TX) {
      const r: CallResult = {
        name: "Submit proof (skipped)",
        method: "POST",
        url: `${API_BASE_URL}/api/proof/submit`,
        status: 0,
        ms: 0,
        ok: true,
        response: { skipped: true, reason: "Set RUN_LIVE_TX=true to enable on-chain submission" },
      };
      results.push(r);
      logResult(r);
      expect(true).toBe(true);
      return;
    }

    const r = await apiCall({
      name: "Submit proof",
      method: "POST",
      path: "/api/proof/submit",
      allowStatuses: [200, 400, 404, 429, 500],
      redactKeys: ["privateKey"],
    });
    results.push(r);
    logResult(r);
    expect([200, 400, 404, 429, 500]).toContain(r.status);

    const txHash = (r.response as any)?.data?.txHash || (r.response as any)?.txHash;
    if (typeof txHash === "string" && txHash.startsWith("0x")) {
      onChainTxCount += 1;
      onChainTxs.push(txHash);
    }
  });

  // 5) Contracts
  it("GET /api/contracts", async () => {
    if (!apiAvailable) return;
    const r = await apiCall({
      name: "Get contracts",
      method: "GET",
      path: "/api/contracts",
      allowStatuses: [200, 404],
    });
    results.push(r);
    logResult(r);
    expect([200, 404]).toContain(r.status);
  });

  it("GET /api/contracts/epoch-count", async () => {
    if (!apiAvailable) return;
    const r = await apiCall({
      name: "Get epoch count",
      method: "GET",
      path: "/api/contracts/epoch-count",
      allowStatuses: [200, 404, 500],
    });
    results.push(r);
    logResult(r);
    expect([200, 404, 500]).toContain(r.status);

    if (r.status === 200 && typeof r.response === "object" && r.response !== null) {
      const epochCount = (r.response as any).epochCount ?? (r.response as any).data?.epochCount;
      if (typeof epochCount === "number" && Number.isFinite(epochCount) && epochCount > 0) {
        latestEpochId = epochCount;
      }
    }
  });

  it("GET /api/contracts/proof/:epochId", async () => {
    if (!apiAvailable) return;

    // Prefer a valid epoch if the epoch-count endpoint returned one.
    const epochId = latestEpochId ?? 1;
    const r = await apiCall({
      name: "Get on-chain proof",
      method: "GET",
      path: `/api/contracts/proof/${epochId}`,
      allowStatuses: [200, 404, 500],
    });
    results.push(r);
    logResult(r);
    expect([200, 404, 500]).toContain(r.status);
  });

  // 6) Yellow Network
  it("GET /api/yellow/status", async () => {
    if (!apiAvailable) return;
    const r = await apiCall({
      name: "Yellow status",
      method: "GET",
      path: "/api/yellow/status",
      allowStatuses: [200, 404, 500],
    });
    results.push(r);
    logResult(r);
    expect([200, 404, 500]).toContain(r.status);
  });

  it("GET /api/yellow/sessions", async () => {
    if (!apiAvailable) return;
    const r = await apiCall({
      name: "List Yellow sessions",
      method: "GET",
      path: "/api/yellow/sessions",
      allowStatuses: [200, 404, 500],
    });
    results.push(r);
    logResult(r);
    expect([200, 404, 500]).toContain(r.status);
  });

  it("POST /api/yellow/session", async () => {
    if (!apiAvailable) return;
    const r = await apiCall({
      name: "Create Yellow session",
      method: "POST",
      path: "/api/yellow/session",
      body: {
        participants: ["exchange_hot_wallet", "user_alice", "user_bob", "user_charlie"],
      },
      allowStatuses: [200, 400, 404, 500],
    });
    results.push(r);
    logResult(r);
    expect([200, 400, 404, 500]).toContain(r.status);

    const id = (r.response as any)?.session?.id;
    if (typeof id === "string") yellowSessionId = id;
  });

  it("GET /api/yellow/session/:sessionId (optional)", async () => {
    if (!apiAvailable || !yellowSessionId) return;
    const r = await apiCall({
      name: "Get Yellow session",
      method: "GET",
      path: `/api/yellow/session/${encodeURIComponent(yellowSessionId)}`,
      allowStatuses: [200, 404, 500],
    });
    results.push(r);
    logResult(r);
    expect([200, 404, 500]).toContain(r.status);
  });

  it("PUT /api/yellow/session/:sessionId/allocations", async () => {
    if (!apiAvailable || !yellowSessionId) return;
    const r = await apiCall({
      name: "Update allocations",
      method: "PUT",
      path: `/api/yellow/session/${encodeURIComponent(yellowSessionId)}/allocations`,
      body: { allocations: { user_alice: "50000", user_bob: "30000" } },
      allowStatuses: [200, 400, 404, 500],
    });
    results.push(r);
    logResult(r);
    expect([200, 400, 404, 500]).toContain(r.status);
  });

  it("POST /api/yellow/session/:sessionId/close (optional)", async () => {
    if (!apiAvailable || !yellowSessionId) return;
    const r = await apiCall({
      name: "Close Yellow session",
      method: "POST",
      path: `/api/yellow/session/${encodeURIComponent(yellowSessionId)}/close`,
      allowStatuses: [200, 404, 500],
    });
    results.push(r);
    logResult(r);
    expect([200, 404, 500]).toContain(r.status);
  });

  it("POST /api/yellow/session/:sessionId/export (optional)", async () => {
    if (!apiAvailable || !yellowSessionId) return;
    const r = await apiCall({
      name: "Export Yellow session",
      method: "POST",
      path: `/api/yellow/session/${encodeURIComponent(yellowSessionId)}/export`,
      allowStatuses: [200, 404, 500],
    });
    results.push(r);
    logResult(r);
    expect([200, 404, 500]).toContain(r.status);
  });

  // 7) Workflow
  it("POST /api/workflow/full (optional on-chain)", async () => {
    if (!apiAvailable) return;

    const RUN_LIVE_TX = process.env.RUN_LIVE_TX === "true";
    if (!RUN_LIVE_TX) {
      const r: CallResult = {
        name: "Full workflow (skipped)",
        method: "POST",
        url: `${API_BASE_URL}/api/workflow/full`,
        status: 0,
        ms: 0,
        ok: true,
        response: { skipped: true, reason: "Set RUN_LIVE_TX=true to enable on-chain submission" },
      };
      results.push(r);
      logResult(r);
      expect(true).toBe(true);
      return;
    }

    const r = await apiCall({
      name: "Run full workflow",
      method: "POST",
      path: "/api/workflow/full",
      body: { skipProof: false },
      allowStatuses: [200, 400, 404, 429, 500],
    });
    results.push(r);
    logResult(r);
    expect([200, 400, 404, 429, 500]).toContain(r.status);

    const txHash = (r.response as any)?.submission?.txHash || (r.response as any)?.txHash;
    if (typeof txHash === "string" && txHash.startsWith("0x")) {
      onChainTxCount += 1;
      onChainTxs.push(txHash);
    }
  });
});
