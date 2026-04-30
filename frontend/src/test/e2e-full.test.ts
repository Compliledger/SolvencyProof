/**
 * e2e-full.test.ts
 *
 * Comprehensive E2E test suite for the SolvencyProof Frontend.
 *
 * Coverage:
 *   - Service layer (solvencyService.ts) — fetch helpers, cache, normalisation
 *   - API layer (lib/api/backend.ts) — endpoint wiring
 *   - API constants & URL builders
 *   - Type guards and utility helpers (lib/types.ts)
 *   - Type correctness for all shared interfaces
 *   - Frontend routing sanity
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ============================================================================
// 1. API CONSTANTS & URL BUILDERS
// ============================================================================

describe("API Constants & URL Builders", () => {
  it("API_BASE_URL is a valid HTTPS URL", async () => {
    const { API_BASE_URL } = await import("@/lib/api/constants");
    expect(API_BASE_URL).toMatch(/^https?:\/\//);
  });

  it("API_ENDPOINTS has all required keys", async () => {
    const { API_ENDPOINTS } = await import("@/lib/api/constants");
    expect(API_ENDPOINTS.HEALTH).toBe("/health");
    expect(API_ENDPOINTS.EPOCH_LATEST).toBe("/api/epoch/latest");
    expect(API_ENDPOINTS.EPOCH_BY_ID).toBe("/api/epoch");
    expect(API_ENDPOINTS.EPOCH_HISTORY).toBe("/api/epoch/history");
    expect(API_ENDPOINTS.EPOCH_HEALTH).toBe("/api/epoch/health");
    expect(API_ENDPOINTS.EPOCH_VERIFY_STORED).toBe("/api/epoch/verify-stored");
    expect(API_ENDPOINTS.LIABILITIES).toBe("/api/liabilities");
    expect(API_ENDPOINTS.BUILD_MERKLE).toBe("/api/liabilities/build");
    expect(API_ENDPOINTS.VERIFY_INCLUSION).toBe("/api/liabilities/verify");
  });

  it("getAlgorandTxUrl builds correct explorer URL", async () => {
    const { getAlgorandTxUrl } = await import("@/lib/api/constants");
    const url = getAlgorandTxUrl("ABCDEF123456");
    expect(url).toContain("ABCDEF123456");
    expect(url).toContain("tx/");
  });

  it("getAlgorandAppUrl builds correct app URL", async () => {
    const { getAlgorandAppUrl } = await import("@/lib/api/constants");
    const url = getAlgorandAppUrl("12345");
    expect(url).toContain("12345");
    expect(url).toContain("application/");
  });

  it("getAlgorandAddressUrl builds correct address URL", async () => {
    const { getAlgorandAddressUrl } = await import("@/lib/api/constants");
    const url = getAlgorandAddressUrl("ALGO_ADDR_ABC");
    expect(url).toContain("ALGO_ADDR_ABC");
    expect(url).toContain("address/");
  });

  it("ALGORAND_EXPLORER_BASE_URL points to Pera wallet", async () => {
    const { ALGORAND_EXPLORER_BASE_URL } = await import("@/lib/api/constants");
    expect(ALGORAND_EXPLORER_BASE_URL).toContain("perawallet");
  });

  it("ALGORAND_INDEXER_URL points to algonode testnet", async () => {
    const { ALGORAND_INDEXER_URL } = await import("@/lib/api/constants");
    expect(ALGORAND_INDEXER_URL).toContain("testnet");
    expect(ALGORAND_INDEXER_URL).toContain("algonode");
  });

  it("deprecated shims exist for backward compatibility", async () => {
    const { CONTRACTS, getEtherscanTxUrl, getEtherscanAddressUrl, getEtherscanBlockUrl } =
      await import("@/lib/api/constants");
    expect(CONTRACTS).toBeDefined();
    expect(typeof getEtherscanTxUrl).toBe("function");
    expect(typeof getEtherscanAddressUrl).toBe("function");
    expect(typeof getEtherscanBlockUrl).toBe("function");
  });
});

// ============================================================================
// 2. SHARED TYPES & UTILITY HELPERS (lib/types.ts)
// ============================================================================

describe("Shared Types & Utilities (lib/types.ts)", () => {
  it("hasValidTimestamp returns true for valid positive timestamps", async () => {
    const { hasValidTimestamp } = await import("@/lib/types");
    expect(hasValidTimestamp(1700000000)).toBe(true);
    expect(hasValidTimestamp(1)).toBe(true);
  });

  it("hasValidTimestamp returns false for zero, null, undefined", async () => {
    const { hasValidTimestamp } = await import("@/lib/types");
    expect(hasValidTimestamp(0)).toBe(false);
    expect(hasValidTimestamp(null)).toBe(false);
    expect(hasValidTimestamp(undefined)).toBe(false);
  });

  it("buildAnchorFallback returns valid AnchorMetadata for valid timestamp", async () => {
    const { buildAnchorFallback } = await import("@/lib/types");
    const result = buildAnchorFallback(1700000000);
    expect(result).not.toBeNull();
    expect(result!.anchored).toBe(true);
    expect(result!.network).toBe("testnet");
    expect(result!.anchored_at).toBe(1700000000);
    expect(result!.application_id).toBe("");
    expect(result!.transaction_id).toBe("");
  });

  it("buildAnchorFallback returns null for undefined/zero timestamp", async () => {
    const { buildAnchorFallback } = await import("@/lib/types");
    expect(buildAnchorFallback(undefined)).toBeNull();
    expect(buildAnchorFallback(0)).toBeNull();
  });

  it("HealthStatus type accepts all valid values", async () => {
    // Type-level check — just verify the strings are valid
    const validStatuses: Array<import("@/lib/types").HealthStatus> = [
      "HEALTHY",
      "LIQUIDITY_STRESSED",
      "UNDERCOLLATERALIZED",
      "CRITICAL",
      "EXPIRED",
    ];
    expect(validStatuses).toHaveLength(5);
  });

  it("DataSource type accepts all valid values", async () => {
    const validSources: Array<import("@/lib/types").DataSource> = [
      "LIVE_REGISTRY",
      "FALLBACK_LOCAL",
      "UNKNOWN",
    ];
    expect(validSources).toHaveLength(3);
  });

  it("FreshnessState type accepts all valid values", async () => {
    const validStates: Array<import("@/lib/types").FreshnessState> = [
      "FRESH",
      "EXPIRED",
      "UNKNOWN",
    ];
    expect(validStates).toHaveLength(3);
  });
});

// ============================================================================
// 3. SOLVENCY SERVICE — NORMALISATION HELPERS
// ============================================================================

describe("Solvency Service — fetch & normalisation", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    localStorage.clear();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    localStorage.clear();
  });

  it("clearSolvencyServiceCache removes prefixed keys", async () => {
    const { clearSolvencyServiceCache } = await import("@/services/solvencyService");
    localStorage.setItem("sp_svc_health", JSON.stringify({ data: {}, ts: Date.now() }));
    localStorage.setItem("unrelated_key", "keep");

    clearSolvencyServiceCache();

    expect(localStorage.getItem("sp_svc_health")).toBeNull();
    expect(localStorage.getItem("unrelated_key")).toBe("keep");
  });

  it("fetchBackendHealth calls /health endpoint", async () => {
    const mockResponse = { status: "ok", timestamp: new Date().toISOString() };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { fetchBackendHealth } = await import("@/services/solvencyService");
    const result = await fetchBackendHealth();

    expect(result.status).toBe("ok");
    expect(result.timestamp).toBeDefined();
  });

  it("fetchLatestEpochState normalises backend response", async () => {
    const mockBackendResponse = {
      entity_id: "test-entity",
      epoch_id: 42,
      liability_root: "0xabc",
      reserve_root: "0xdef",
      reserve_snapshot_hash: "0x123",
      proof_hash: "0x456",
      reserves_total: "1000000",
      total_liabilities: "900000",
      near_term_liabilities_total: "900000",
      liquid_assets_total: "300000",
      capital_backed: true,
      liquidity_ready: false,
      health_status: "LIQUIDITY_STRESSED",
      timestamp: 1700000000,
      valid_until: 1700086400,
      module: "solvency",
      reason_codes: ["CAPITAL_BACKED", "NOT_LIQUIDITY_READY"],
      bundle_hash: "0x789",
      anchor_metadata: {
        anchored: false,
        network: "",
        application_id: "",
        transaction_id: "",
        anchored_at: null,
      },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockBackendResponse),
    });

    const { fetchLatestEpochState } = await import("@/services/solvencyService");
    const result = await fetchLatestEpochState("test-entity");

    expect(result.entity_id).toBe("test-entity");
    expect(result.epoch_id).toBe("42");
    expect(result.health_status).toBe("LIQUIDITY_STRESSED");
    expect(result.capital_backed).toBe(true);
    expect(result.liquidity_ready).toBe(false);
    expect(result.liability_root).toBe("0xabc");
    expect(result.bundle_hash).toBe("0x789");
    expect(result.reason_codes).toEqual(["CAPITAL_BACKED", "NOT_LIQUIDITY_READY"]);
  });

  it("fetchEpochHistory normalises array responses", async () => {
    const mockHistory = [
      {
        entity_id: "entity-1",
        epoch_id: 2,
        health_status: "HEALTHY",
        proof_hash: "0xaaa",
        timestamp: 1700000000,
        valid_until: 1700086400,
        capital_backed: true,
        liquidity_ready: true,
      },
      {
        entity_id: "entity-1",
        epoch_id: 1,
        health_status: "EXPIRED",
        proof_hash: "0xbbb",
        timestamp: 1699900000,
        valid_until: 1699986400,
        capital_backed: true,
        liquidity_ready: true,
      },
    ];

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockHistory),
    });

    const { fetchEpochHistory } = await import("@/services/solvencyService");
    const result = await fetchEpochHistory("entity-1", 10);

    expect(result).toHaveLength(2);
    expect(result[0].epoch_id).toBe("2");
    expect(result[0].health_status).toBe("HEALTHY");
    expect(result[1].epoch_id).toBe("1");
    expect(result[1].health_status).toBe("EXPIRED");
  });

  it("verifyUserInclusion returns success false on network error", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const { verifyUserInclusion } = await import("@/services/solvencyService");
    const result = await verifyUserInclusion("user123");

    expect(result.success).toBe(false);
    expect(result.user_id).toBe("user123");
    expect(result.error).toContain("Network error");
  });

  it("verifyUserInclusion returns success true on valid response", async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // First call: verify inclusion
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              userId: "user123",
              balance: 1000,
              root: "0xabc",
              proof: ["0x1", "0x2"],
            }),
        });
      }
      // Second call: getLatestEpoch (for epoch metadata)
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            entity_id: "entity-1",
            epoch_id: 5,
            liability_root: "0xabc",
            health_status: "HEALTHY",
            timestamp: 1700000000,
            valid_until: 1700086400,
          }),
      });
    });

    const { verifyUserInclusion } = await import("@/services/solvencyService");
    const result = await verifyUserInclusion("user123");

    expect(result.success).toBe(true);
    expect(result.user_id).toBe("user123");
  });

  it("handles HTTP error responses gracefully", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "Internal Server Error" }),
    });

    const { fetchBackendHealth } = await import("@/services/solvencyService");
    await expect(fetchBackendHealth()).rejects.toThrow("Internal Server Error");
  });

  it("health status normalisation handles unknown values", async () => {
    const mockResponse = {
      entity_id: "test",
      epoch_id: 1,
      health_status: "BOGUS_STATUS",
      timestamp: 1700000000,
      valid_until: 1700086400,
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { fetchLatestEpochState } = await import("@/services/solvencyService");
    const result = await fetchLatestEpochState();

    // Unknown status should default to EXPIRED
    expect(result.health_status).toBe("EXPIRED");
  });
});

// ============================================================================
// 4. API BACKEND SERVICE (lib/api/backend.ts) — with mocked fetch
// ============================================================================

describe("API Backend Service (lib/api/backend.ts)", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("getLatestEpoch calls /api/epoch/latest", async () => {
    const mockState = {
      entity_id: "entity-1",
      epoch_id: 10,
      liability_root: "0xabc",
      health_status: "HEALTHY",
      timestamp: 1700000000,
      valid_until: 1700086400,
      capital_backed: true,
      liquidity_ready: true,
      proof_hash: "0x456",
      reserves_total: 1000000,
      near_term_liabilities_total: 900000,
      liquid_assets_total: 1000000,
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockState),
    });

    const { getLatestEpoch } = await import("@/lib/api/backend");
    const result = await getLatestEpoch("entity-1");

    expect(result.entity_id).toBe("entity-1");
    expect(result.epoch_id).toBe(10);
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining("/api/epoch/latest?entity_id=entity-1"),
      expect.anything()
    );
  });

  it("getLatestEpoch calls without entity_id when omitted", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ epoch_id: 1, health_status: "HEALTHY", timestamp: 0, valid_until: 0 }),
    });

    const { getLatestEpoch } = await import("@/lib/api/backend");
    await getLatestEpoch();

    const url = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(url).toContain("/api/epoch/latest");
    expect(url).not.toContain("entity_id");
  });

  it("getEpochHistory calls /api/epoch/history with params", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    const { getEpochHistory } = await import("@/lib/api/backend");
    await getEpochHistory("entity-1", 5);

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining("entity_id=entity-1"),
      expect.anything()
    );
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining("limit=5"),
      expect.anything()
    );
  });

  it("verifyUserInclusion calls /api/liabilities/verify/:userId", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          userId: "alice",
          balance: 500,
          root: "0xroot",
        }),
    });

    const { verifyUserInclusion } = await import("@/lib/api/backend");
    const result = await verifyUserInclusion("alice");

    const url = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(url).toContain("/api/liabilities/verify/alice");
    expect(result.included).toBe(true);
  });

  it("getHealthStatus calls /api/epoch/health with entity_id", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          entity_id: "entity-1",
          health_status: "HEALTHY",
          is_healthy: true,
          is_fresh: true,
          timestamp: 1700000000,
          valid_until: 1700086400,
        }),
    });

    const { getHealthStatus } = await import("@/lib/api/backend");
    const result = await getHealthStatus("entity-1");

    expect(result.health_status).toBe("HEALTHY");
    expect(result.is_healthy).toBe(true);
  });

  it("getEpochRecord calls /api/epoch/:entityId?epochId=N", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          entity_id: "entity-1",
          epoch_id: 42,
          health_status: "HEALTHY",
          timestamp: 1700000000,
          valid_until: 1700086400,
        }),
    });

    const { getEpochRecord } = await import("@/lib/api/backend");
    await getEpochRecord("entity-1", 42);

    const url = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(url).toContain("/api/epoch/entity-1");
    expect(url).toContain("epochId=42");
  });

  it("verifyStoredRecord calls /api/epoch/verify-stored", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          exists: true,
          matches: true,
          mismatches: [],
          record: null,
        }),
    });

    const { verifyStoredRecord } = await import("@/lib/api/backend");
    const result = await verifyStoredRecord("entity-1", 42);

    const url = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(url).toContain("entity_id=entity-1");
    expect(url).toContain("epoch_id=42");
    expect(result.exists).toBe(true);
    expect(result.matches).toBe(true);
  });

  it("triggerRefresh calls POST /api/workflow/full", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const { triggerRefresh } = await import("@/lib/api/backend");
    const result = await triggerRefresh();

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining("/api/workflow/full"),
      expect.objectContaining({ method: "POST" })
    );
    expect(result.success).toBe(true);
  });

  it("submitToRegistry calls POST /api/proof/submit", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ success: true, txHash: "0xabc", blockNumber: 123 }),
    });

    const { submitToRegistry } = await import("@/lib/api/backend");
    const result = await submitToRegistry();

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining("/api/proof/submit"),
      expect.objectContaining({ method: "POST" })
    );
    expect(result.success).toBe(true);
    expect(result.txHash).toBe("0xabc");
  });
});

// ============================================================================
// 5. SOLVENCY TYPE CONTRACTS (types/solvency.ts)
// ============================================================================

describe("Solvency Types (types/solvency.ts)", () => {
  it("EpochState interface has all required fields", async () => {
    // Type-level verification via construction
    const epoch: import("@/types/solvency").EpochState = {
      entity_id: "test",
      epoch_id: "1",
      liability_root: "0x",
      reserve_root: "0x",
      reserve_snapshot_hash: "0x",
      bundle_hash: "0x",
      proof_hash: "0x",
      reserves_total: 100,
      total_liabilities: 50,
      near_term_liabilities_total: 25,
      liquid_assets_total: 100,
      capital_backed: true,
      liquidity_ready: true,
      health_status: "HEALTHY",
      timestamp: 1700000000,
      valid_until: 1700086400,
    };
    expect(epoch.entity_id).toBe("test");
    expect(epoch.capital_backed).toBe(true);
  });

  it("EpochSummary interface has required fields", async () => {
    const summary: import("@/types/solvency").EpochSummary = {
      entity_id: "test",
      epoch_id: "1",
      health_status: "HEALTHY",
      bundle_hash: "0x",
      proof_hash: "0x",
      timestamp: 1700000000,
      valid_until: 1700086400,
      capital_backed: true,
      liquidity_ready: true,
    };
    expect(summary.health_status).toBe("HEALTHY");
  });

  it("InclusionResult interface handles both success and failure", async () => {
    const success: import("@/types/solvency").InclusionResult = {
      success: true,
      user_id: "u1",
      epoch_id: "1",
      liability_root: "0x",
      balance: 1000,
      proof: ["0x1", "0x2"],
    };
    expect(success.success).toBe(true);

    const failure: import("@/types/solvency").InclusionResult = {
      success: false,
      user_id: "u2",
      epoch_id: "1",
      liability_root: "",
      error: "Not found",
    };
    expect(failure.success).toBe(false);
    expect(failure.error).toBe("Not found");
  });

  it("AnchorMetadata interface has all fields", async () => {
    const meta: import("@/types/solvency").AnchorMetadata = {
      anchored: true,
      network: "testnet",
      application_id: "12345",
      transaction_id: "TXID_ABC",
      anchored_at: 1700000000,
    };
    expect(meta.anchored).toBe(true);
    expect(meta.network).toBe("testnet");
  });

  it("BackendHealth interface", async () => {
    const health: import("@/types/solvency").BackendHealth = {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
    expect(health.status).toBe("ok");
  });

  it("DecisionResult interface", async () => {
    const decision: import("@/types/solvency").DecisionResult = {
      capital_backed: true,
      liquidity_ready: false,
      health_status: "LIQUIDITY_STRESSED",
    };
    expect(decision.health_status).toBe("LIQUIDITY_STRESSED");
  });

  it("EvaluationContext interface", async () => {
    const ctx: import("@/types/solvency").EvaluationContext = {
      reserves_total: 1000000,
      total_liabilities: 900000,
      liquid_assets_total: 300000,
      near_term_liabilities_total: 900000,
      capital_backed: true,
      liquidity_ready: false,
      jurisdiction: "US",
      epoch_id: 42,
      marketproof_status: "UNKNOWN",
    };
    expect(ctx.capital_backed).toBe(true);
    expect(ctx.marketproof_status).toBe("UNKNOWN");
  });
});

// ============================================================================
// 6. MOCK API LAYER
// ============================================================================

describe("Mock API Layer", () => {
  it("mock.ts exports are importable", async () => {
    const mockApi = await import("@/lib/api/mock");
    expect(mockApi).toBeDefined();
  });
});

// ============================================================================
// 7. FRONTEND ROUTING STRUCTURE
// ============================================================================

describe("Frontend Routing Structure", () => {
  it("App component is importable", async () => {
    const { default: App } = await import("@/App");
    expect(App).toBeDefined();
    expect(typeof App).toBe("function");
  });

  it("All page components are importable", async () => {
    const pages = [
      () => import("@/pages/Index"),
      () => import("@/pages/Product"),
      () => import("@/pages/HowItWorks"),
      () => import("@/pages/NotFound"),
      () => import("@/pages/app/Login"),
      () => import("@/pages/app/Dashboard"),
      () => import("@/pages/app/AdminDashboard"),
      () => import("@/pages/app/PublicDashboard"),
      () => import("@/pages/app/UserVerification"),
      () => import("@/pages/app/ReportsList"),
      () => import("@/pages/app/ReportDetail"),
      () => import("@/pages/app/InclusionCheck"),
      () => import("@/pages/app/YellowSessions"),
      () => import("@/pages/app/Liabilities"),
      () => import("@/pages/app/Reserves"),
      () => import("@/pages/app/ProofGenerator"),
      () => import("@/pages/app/Summary"),
    ];

    for (const loadPage of pages) {
      const mod = await loadPage();
      expect(mod.default).toBeDefined();
    }
  });
});

// ============================================================================
// 8. CACHE BEHAVIOR
// ============================================================================

describe("Solvency Service Cache Behavior", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    localStorage.clear();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    localStorage.clear();
  });

  it("caches GET responses in localStorage", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "ok", timestamp: "2026-01-01T00:00:00Z" }),
    });

    const { fetchBackendHealth } = await import("@/services/solvencyService");

    // First call — hits network
    await fetchBackendHealth();
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);

    // Check that something was cached
    const cacheKey = "sp_svc_health";
    const cached = localStorage.getItem(cacheKey);
    expect(cached).not.toBeNull();

    const parsed = JSON.parse(cached!);
    expect(parsed.data.status).toBe("ok");
    expect(parsed.ts).toBeDefined();
  });

  it("clearSolvencyServiceCache clears all sp_svc_ keys", async () => {
    localStorage.setItem("sp_svc_a", "data1");
    localStorage.setItem("sp_svc_b", "data2");
    localStorage.setItem("other_key", "keep");

    const { clearSolvencyServiceCache } = await import("@/services/solvencyService");
    clearSolvencyServiceCache();

    expect(localStorage.getItem("sp_svc_a")).toBeNull();
    expect(localStorage.getItem("sp_svc_b")).toBeNull();
    expect(localStorage.getItem("other_key")).toBe("keep");
  });
});

// ============================================================================
// 9. FORMAT UTILITIES
// ============================================================================

describe("Format Utilities", () => {
  it("format.ts exports are importable", async () => {
    const fmt = await import("@/lib/format");
    expect(fmt).toBeDefined();
  });
});

// ============================================================================
// 10. REGISTRY API
// ============================================================================

describe("Registry API (lib/api/registry.ts)", () => {
  it("registry.ts exports are importable", async () => {
    const reg = await import("@/lib/api/registry");
    expect(reg).toBeDefined();
  });
});
