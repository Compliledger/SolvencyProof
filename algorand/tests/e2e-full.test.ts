/**
 * algorand/tests/e2e-full.test.ts
 *
 * Comprehensive E2E test suite for the Algorand SolventRegistry integration.
 *
 * Coverage:
 *   - Types: HealthStatus enum, AMOUNT_SCALE, string maps, box key constants
 *   - Client: encodeState / decodeState round-trip with all scenarios
 *   - Client: toAlgorandSolventRegistryPayload — field mapping & edge cases
 *   - Client: SolventRegistryClient mock-based tests for all read methods
 *   - Box key helpers: makeLatestBoxKey, makeEpochBoxKey
 *   - Flag derivation: insolvency_flag, liquidity_stress_flag
 *   - Boundary conditions: zero amounts, max uint64, empty strings, long strings
 *   - Health status expiry: valid_until boundary conditions
 *   - Full pipeline: canonical epoch → payload → encode → decode
 *   - Error handling: submitEpoch without signer, missing boxes
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  HealthStatus,
  AMOUNT_SCALE,
  HEALTH_STATUS_STRING_MAP,
  makeLatestBoxKey,
  makeEpochBoxKey,
  BOX_KEY_ENTITY_PREFIX,
  BOX_KEY_LATEST_SUFFIX,
  BOX_KEY_EPOCH_INFIX,
} from "../types/registry.js";
import type { CanonicalEpochObject, AlgorandRegistryPayload } from "../types/registry.js";
import {
  toAlgorandSolventRegistryPayload,
  encodeState,
  decodeState,
  SolventRegistryClient,
} from "../client/registry_client.js";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const SAMPLE_TS = BigInt(Math.floor(new Date("2026-06-15T12:00:00Z").getTime() / 1000));
const SAMPLE_VU = BigInt(Math.floor(new Date("2026-06-16T12:00:00Z").getTime() / 1000));
const FAR_FUTURE = BigInt(Math.floor(new Date("2099-01-01T00:00:00Z").getTime() / 1000));

function makeCanonicalEpoch(overrides: Partial<CanonicalEpochObject> = {}): CanonicalEpochObject {
  return {
    entity_id: "entity-e2e-test",
    epoch_id: "epoch-2026-06-15T12:00:00Z",
    liability_root: "0xaaaa1111bbbb2222cccc3333dddd4444eeee5555ffff6666aaaa1111bbbb2222",
    reserve_root: "0xbbbb2222cccc3333dddd4444eeee5555ffff6666aaaa1111bbbb2222cccc3333",
    reserve_snapshot_hash: "0xcccc3333dddd4444eeee5555ffff6666aaaa1111bbbb2222cccc3333dddd4444",
    proof_hash: "0xdddd4444eeee5555ffff6666aaaa1111bbbb2222cccc3333dddd4444eeee5555",
    reserves_total: 10_000_000.0,
    total_liabilities: 8_000_000.0,
    near_term_liabilities_total: 2_000_000.0,
    liquid_assets_total: 3_000_000.0,
    capital_backed: true,
    liquidity_ready: true,
    health_status: "HEALTHY",
    timestamp: "2026-06-15T12:00:00Z",
    valid_until: "2026-06-16T12:00:00Z",
    adapter_version: "algorand-adapter@0.1.0",
    source_type: "csv+json",
    ...overrides,
  };
}

function makePayload(overrides: Partial<AlgorandRegistryPayload> = {}): AlgorandRegistryPayload {
  return {
    entity_id: "entity-e2e-test",
    epoch_id: "epoch-e2e",
    liability_root: "0xabc",
    reserve_root: "0xdef",
    reserve_snapshot_hash: "0x123",
    proof_hash: "0x456",
    reserves_total: 10_000_000_000_000n,
    liquid_assets_total: 3_000_000_000_000n,
    near_term_liabilities_total: 2_000_000_000_000n,
    capital_backed: true,
    liquidity_ready: true,
    health_status: HealthStatus.HEALTHY,
    timestamp: SAMPLE_TS,
    valid_until: SAMPLE_VU,
    ...overrides,
  };
}

function makeMockAlgod(boxValue?: Uint8Array) {
  const mockGetBoxByName = vi.fn();
  if (boxValue) {
    mockGetBoxByName.mockReturnValue({
      do: () => Promise.resolve({ value: boxValue }),
    });
  } else {
    mockGetBoxByName.mockReturnValue({
      do: () => Promise.reject(new Error("Box not found")),
    });
  }
  return {
    getApplicationBoxByName: mockGetBoxByName,
    getTransactionParams: vi.fn().mockReturnValue({ do: () => Promise.resolve({}) }),
  };
}

function buildClient(algod: ReturnType<typeof makeMockAlgod>, appId = 99999n) {
  const client = new SolventRegistryClient({ nodeUrl: "https://testnet-api.algonode.cloud", appId });
  (client as unknown as { algodClient: unknown }).algodClient = algod;
  return client;
}

// ============================================================================
// 1. HEALTH STATUS ENUM — COMPLETE COVERAGE
// ============================================================================

describe("HealthStatus Enum", () => {
  it("UNKNOWN = 0", () => expect(HealthStatus.UNKNOWN).toBe(0));
  it("HEALTHY = 1", () => expect(HealthStatus.HEALTHY).toBe(1));
  it("LIQUIDITY_STRESSED = 2", () => expect(HealthStatus.LIQUIDITY_STRESSED).toBe(2));
  it("UNDERCOLLATERALIZED = 3", () => expect(HealthStatus.UNDERCOLLATERALIZED).toBe(3));
  it("CRITICAL = 4", () => expect(HealthStatus.CRITICAL).toBe(4));
  it("EXPIRED = 5", () => expect(HealthStatus.EXPIRED).toBe(5));

  it("enum has exactly 6 values", () => {
    const numericValues = Object.values(HealthStatus).filter(v => typeof v === "number");
    expect(numericValues).toHaveLength(6);
  });
});

describe("HEALTH_STATUS_STRING_MAP", () => {
  it("maps all 6 string keys correctly", () => {
    expect(HEALTH_STATUS_STRING_MAP["UNKNOWN"]).toBe(0);
    expect(HEALTH_STATUS_STRING_MAP["HEALTHY"]).toBe(1);
    expect(HEALTH_STATUS_STRING_MAP["LIQUIDITY_STRESSED"]).toBe(2);
    expect(HEALTH_STATUS_STRING_MAP["UNDERCOLLATERALIZED"]).toBe(3);
    expect(HEALTH_STATUS_STRING_MAP["CRITICAL"]).toBe(4);
    expect(HEALTH_STATUS_STRING_MAP["EXPIRED"]).toBe(5);
  });
});

describe("AMOUNT_SCALE", () => {
  it("is a positive bigint", () => {
    expect(typeof AMOUNT_SCALE).toBe("bigint");
    expect(AMOUNT_SCALE > 0n).toBe(true);
  });
});

// ============================================================================
// 2. BOX KEY HELPERS
// ============================================================================

describe("Box Key Helpers", () => {
  const dec = new TextDecoder();

  it("makeLatestBoxKey produces entity:{id}:latest", () => {
    const key = makeLatestBoxKey("entity-001");
    expect(dec.decode(key)).toBe("entity:entity-001:latest");
  });

  it("makeEpochBoxKey produces entity:{id}:epoch:{epochId}", () => {
    const key = makeEpochBoxKey("entity-001", "epoch-42");
    expect(dec.decode(key)).toBe("entity:entity-001:epoch:epoch-42");
  });

  it("handles empty entity_id gracefully", () => {
    const key = makeLatestBoxKey("");
    expect(dec.decode(key)).toBe("entity::latest");
  });

  it("handles special characters in entity_id", () => {
    const key = makeLatestBoxKey("org/unit-01@v2");
    expect(dec.decode(key)).toBe("entity:org/unit-01@v2:latest");
  });

  it("handles long entity_id values", () => {
    const longId = "a".repeat(200);
    const key = makeLatestBoxKey(longId);
    expect(dec.decode(key)).toBe(`entity:${longId}:latest`);
  });

  it("BOX_KEY constants match generated keys", () => {
    const entityId = "test-entity";
    const epochId = "epoch-1";
    const manual = `${BOX_KEY_ENTITY_PREFIX}${entityId}${BOX_KEY_LATEST_SUFFIX}`;
    expect(manual).toBe(`entity:${entityId}:latest`);
    const manualEpoch = `${BOX_KEY_ENTITY_PREFIX}${entityId}${BOX_KEY_EPOCH_INFIX}${epochId}`;
    expect(manualEpoch).toBe(`entity:${entityId}:epoch:${epochId}`);
  });

  it("different entity IDs produce different keys", () => {
    const a = dec.decode(makeLatestBoxKey("a"));
    const b = dec.decode(makeLatestBoxKey("b"));
    expect(a).not.toBe(b);
  });

  it("different epoch IDs produce different epoch keys", () => {
    const a = dec.decode(makeEpochBoxKey("e", "epoch-1"));
    const b = dec.decode(makeEpochBoxKey("e", "epoch-2"));
    expect(a).not.toBe(b);
  });
});

// ============================================================================
// 3. toAlgorandSolventRegistryPayload — FIELD MAPPING
// ============================================================================

describe("toAlgorandSolventRegistryPayload", () => {
  it("preserves entity_id and epoch_id", () => {
    const p = toAlgorandSolventRegistryPayload(makeCanonicalEpoch());
    expect(p.entity_id).toBe("entity-e2e-test");
    expect(p.epoch_id).toBe("epoch-2026-06-15T12:00:00Z");
  });

  it("preserves all hash strings", () => {
    const epoch = makeCanonicalEpoch();
    const p = toAlgorandSolventRegistryPayload(epoch);
    expect(p.liability_root).toBe(epoch.liability_root);
    expect(p.reserve_root).toBe(epoch.reserve_root);
    expect(p.reserve_snapshot_hash).toBe(epoch.reserve_snapshot_hash);
    expect(p.proof_hash).toBe(epoch.proof_hash);
  });

  it("converts reserves_total float to bigint micro-units", () => {
    const p = toAlgorandSolventRegistryPayload(makeCanonicalEpoch({ reserves_total: 5_000_000.0 }));
    const expected = BigInt(Math.round(5_000_000.0 * Number(AMOUNT_SCALE)));
    expect(p.reserves_total).toBe(expected);
  });

  it("converts liquid_assets_total float to bigint", () => {
    const p = toAlgorandSolventRegistryPayload(makeCanonicalEpoch({ liquid_assets_total: 1_500_000.0 }));
    const expected = BigInt(Math.round(1_500_000.0 * Number(AMOUNT_SCALE)));
    expect(p.liquid_assets_total).toBe(expected);
  });

  it("converts near_term_liabilities_total float to bigint", () => {
    const p = toAlgorandSolventRegistryPayload(makeCanonicalEpoch({ near_term_liabilities_total: 750_000.0 }));
    const expected = BigInt(Math.round(750_000.0 * Number(AMOUNT_SCALE)));
    expect(p.near_term_liabilities_total).toBe(expected);
  });

  it("converts ISO timestamp to unix seconds bigint", () => {
    const p = toAlgorandSolventRegistryPayload(makeCanonicalEpoch());
    expect(p.timestamp).toBe(SAMPLE_TS);
  });

  it("converts valid_until ISO to unix seconds bigint", () => {
    const p = toAlgorandSolventRegistryPayload(makeCanonicalEpoch());
    expect(p.valid_until).toBe(SAMPLE_VU);
  });

  it("preserves capital_backed and liquidity_ready booleans", () => {
    const p = toAlgorandSolventRegistryPayload(makeCanonicalEpoch({ capital_backed: false, liquidity_ready: false }));
    expect(p.capital_backed).toBe(false);
    expect(p.liquidity_ready).toBe(false);
  });

  it("maps all health_status strings correctly", () => {
    const statuses: Array<[string, number]> = [
      ["HEALTHY", HealthStatus.HEALTHY],
      ["LIQUIDITY_STRESSED", HealthStatus.LIQUIDITY_STRESSED],
      ["UNDERCOLLATERALIZED", HealthStatus.UNDERCOLLATERALIZED],
      ["CRITICAL", HealthStatus.CRITICAL],
      ["EXPIRED", HealthStatus.EXPIRED],
    ];

    for (const [str, num] of statuses) {
      const p = toAlgorandSolventRegistryPayload(makeCanonicalEpoch({ health_status: str }));
      expect(p.health_status).toBe(num);
    }
  });

  it("defaults to UNKNOWN for unrecognised health_status", () => {
    const p = toAlgorandSolventRegistryPayload(makeCanonicalEpoch({ health_status: "INVALID_STATUS" }));
    expect(p.health_status).toBe(HealthStatus.UNKNOWN);
  });

  it("handles zero reserves_total", () => {
    const p = toAlgorandSolventRegistryPayload(makeCanonicalEpoch({ reserves_total: 0 }));
    expect(p.reserves_total).toBe(0n);
  });

  it("handles very large reserves_total", () => {
    const p = toAlgorandSolventRegistryPayload(makeCanonicalEpoch({ reserves_total: 999_999_999_999.99 }));
    expect(p.reserves_total).toBeGreaterThan(0n);
  });
});

// ============================================================================
// 4. encodeState / decodeState ROUND-TRIPS
// ============================================================================

describe("encodeState / decodeState Round-Trip", () => {
  it("round-trips a healthy state without data loss", () => {
    const payload = makePayload();
    const encoded = encodeState(payload, false, false);
    const decoded = decodeState(encoded);

    expect(decoded.entity_id).toBe(payload.entity_id);
    expect(decoded.epoch_id).toBe(payload.epoch_id);
    expect(decoded.liability_root).toBe(payload.liability_root);
    expect(decoded.reserve_root).toBe(payload.reserve_root);
    expect(decoded.reserve_snapshot_hash).toBe(payload.reserve_snapshot_hash);
    expect(decoded.proof_hash).toBe(payload.proof_hash);
    expect(decoded.reserves_total).toBe(payload.reserves_total);
    expect(decoded.liquid_assets_total).toBe(payload.liquid_assets_total);
    expect(decoded.near_term_liabilities_total).toBe(payload.near_term_liabilities_total);
    expect(decoded.capital_backed).toBe(true);
    expect(decoded.liquidity_ready).toBe(true);
    expect(decoded.health_status).toBe(HealthStatus.HEALTHY);
    expect(decoded.timestamp).toBe(payload.timestamp);
    expect(decoded.valid_until).toBe(payload.valid_until);
    expect(decoded.insolvency_flag).toBe(false);
    expect(decoded.liquidity_stress_flag).toBe(false);
  });

  it("round-trips zero amounts", () => {
    const payload = makePayload({
      reserves_total: 0n,
      liquid_assets_total: 0n,
      near_term_liabilities_total: 0n,
    });
    const decoded = decodeState(encodeState(payload, false, false));
    expect(decoded.reserves_total).toBe(0n);
    expect(decoded.liquid_assets_total).toBe(0n);
    expect(decoded.near_term_liabilities_total).toBe(0n);
  });

  it("round-trips max-range amounts", () => {
    const maxUint64 = (1n << 64n) - 1n;
    const payload = makePayload({
      reserves_total: maxUint64,
      liquid_assets_total: maxUint64,
      near_term_liabilities_total: maxUint64,
    });
    const decoded = decodeState(encodeState(payload, false, false));
    expect(decoded.reserves_total).toBe(maxUint64);
  });

  it("produces deterministic output", () => {
    const payload = makePayload();
    const a = encodeState(payload, false, false);
    const b = encodeState(payload, false, false);
    expect(a).toEqual(b);
  });

  it("different epoch_ids produce different encodings", () => {
    const a = encodeState(makePayload({ epoch_id: "epoch-a" }), false, false);
    const b = encodeState(makePayload({ epoch_id: "epoch-b" }), false, false);
    expect(a).not.toEqual(b);
  });

  it("different entity_ids produce different encodings", () => {
    const a = encodeState(makePayload({ entity_id: "entity-a" }), false, false);
    const b = encodeState(makePayload({ entity_id: "entity-b" }), false, false);
    expect(a).not.toEqual(b);
  });

  it("handles empty string fields", () => {
    const payload = makePayload({
      entity_id: "",
      epoch_id: "",
      liability_root: "",
      reserve_root: "",
      reserve_snapshot_hash: "",
      proof_hash: "",
    });
    const decoded = decodeState(encodeState(payload, false, false));
    expect(decoded.entity_id).toBe("");
    expect(decoded.epoch_id).toBe("");
  });

  it("handles long string fields", () => {
    const longStr = "x".repeat(500);
    const payload = makePayload({ entity_id: longStr, epoch_id: longStr });
    const decoded = decodeState(encodeState(payload, false, false));
    expect(decoded.entity_id).toBe(longStr);
    expect(decoded.epoch_id).toBe(longStr);
  });

  it("round-trips all health status values", () => {
    const statuses = [
      HealthStatus.UNKNOWN,
      HealthStatus.HEALTHY,
      HealthStatus.LIQUIDITY_STRESSED,
      HealthStatus.UNDERCOLLATERALIZED,
      HealthStatus.CRITICAL,
      HealthStatus.EXPIRED,
    ];

    for (const hs of statuses) {
      const payload = makePayload({ health_status: hs });
      const decoded = decodeState(encodeState(payload, false, false));
      expect(decoded.health_status).toBe(hs);
    }
  });
});

// ============================================================================
// 5. FLAG DERIVATION
// ============================================================================

describe("Flag Derivation", () => {
  it("insolvency_flag = false when capital_backed = true", () => {
    const decoded = decodeState(encodeState(makePayload({ capital_backed: true }), false, false));
    expect(decoded.insolvency_flag).toBe(false);
  });

  it("insolvency_flag = true when capital_backed = false", () => {
    const decoded = decodeState(encodeState(makePayload({ capital_backed: false }), true, false));
    expect(decoded.insolvency_flag).toBe(true);
  });

  it("liquidity_stress_flag = false when liquidity_ready = true", () => {
    const decoded = decodeState(encodeState(makePayload({ liquidity_ready: true }), false, false));
    expect(decoded.liquidity_stress_flag).toBe(false);
  });

  it("liquidity_stress_flag = true when liquidity_ready = false", () => {
    const decoded = decodeState(encodeState(makePayload({ liquidity_ready: false }), false, true));
    expect(decoded.liquidity_stress_flag).toBe(true);
  });

  it("both flags true for CRITICAL state", () => {
    const decoded = decodeState(
      encodeState(makePayload({ capital_backed: false, liquidity_ready: false }), true, true)
    );
    expect(decoded.insolvency_flag).toBe(true);
    expect(decoded.liquidity_stress_flag).toBe(true);
  });

  it("both flags false for HEALTHY state", () => {
    const decoded = decodeState(
      encodeState(makePayload({ capital_backed: true, liquidity_ready: true }), false, false)
    );
    expect(decoded.insolvency_flag).toBe(false);
    expect(decoded.liquidity_stress_flag).toBe(false);
  });
});

// ============================================================================
// 6. SolventRegistryClient — READ METHODS (mocked algosdk)
// ============================================================================

describe("SolventRegistryClient", () => {
  const freshPayload = makePayload({ valid_until: FAR_FUTURE });
  const freshEncoded = encodeState(freshPayload, false, false);

  describe("getLatestState", () => {
    it("returns null when box does not exist", async () => {
      const client = buildClient(makeMockAlgod());
      expect(await client.getLatestState("entity-x")).toBeNull();
    });

    it("returns decoded state when box exists", async () => {
      const client = buildClient(makeMockAlgod(freshEncoded));
      const result = await client.getLatestState("entity-e2e-test");
      expect(result).not.toBeNull();
      expect(result!.entity_id).toBe("entity-e2e-test");
      expect(result!.health_status).toBe(HealthStatus.HEALTHY);
      expect(result!.capital_backed).toBe(true);
      expect(result!.liquidity_ready).toBe(true);
    });
  });

  describe("getEpochRecord", () => {
    it("returns null when box does not exist", async () => {
      const client = buildClient(makeMockAlgod());
      expect(await client.getEpochRecord("entity-x", "epoch-1")).toBeNull();
    });

    it("returns decoded record when box exists", async () => {
      const client = buildClient(makeMockAlgod(freshEncoded));
      const result = await client.getEpochRecord("entity-e2e-test", "epoch-e2e");
      expect(result).not.toBeNull();
      expect(result!.epoch_id).toBe("epoch-e2e");
    });
  });

  describe("isHealthy", () => {
    it("returns false when no state exists", async () => {
      const client = buildClient(makeMockAlgod());
      expect(await client.isHealthy("entity-x")).toBe(false);
    });

    it("returns true for healthy, non-expired state", async () => {
      const client = buildClient(makeMockAlgod(freshEncoded));
      expect(await client.isHealthy("entity-e2e-test")).toBe(true);
    });

    it("returns false when health_status != HEALTHY", async () => {
      const criticalPayload = makePayload({
        health_status: HealthStatus.CRITICAL,
        valid_until: FAR_FUTURE,
      });
      const encoded = encodeState(criticalPayload, true, true);
      const client = buildClient(makeMockAlgod(encoded));
      expect(await client.isHealthy("entity-e2e-test")).toBe(false);
    });

    it("returns false when state is LIQUIDITY_STRESSED", async () => {
      const payload = makePayload({
        health_status: HealthStatus.LIQUIDITY_STRESSED,
        valid_until: FAR_FUTURE,
      });
      const encoded = encodeState(payload, false, true);
      const client = buildClient(makeMockAlgod(encoded));
      expect(await client.isHealthy("entity-e2e-test")).toBe(false);
    });

    it("returns false when state is UNDERCOLLATERALIZED", async () => {
      const payload = makePayload({
        health_status: HealthStatus.UNDERCOLLATERALIZED,
        valid_until: FAR_FUTURE,
      });
      const encoded = encodeState(payload, true, false);
      const client = buildClient(makeMockAlgod(encoded));
      expect(await client.isHealthy("entity-e2e-test")).toBe(false);
    });
  });

  describe("getHealthStatus", () => {
    it("returns UNKNOWN when no state exists", async () => {
      const client = buildClient(makeMockAlgod());
      expect(await client.getHealthStatus("entity-x")).toBe(HealthStatus.UNKNOWN);
    });

    it("returns HEALTHY for fresh healthy state", async () => {
      const client = buildClient(makeMockAlgod(freshEncoded));
      expect(await client.getHealthStatus("entity-e2e-test")).toBe(HealthStatus.HEALTHY);
    });

    it("returns EXPIRED for state past valid_until", async () => {
      const expiredPayload = makePayload({ valid_until: 1n }); // Unix second 1 = way past
      const encoded = encodeState(expiredPayload, false, false);
      const client = buildClient(makeMockAlgod(encoded));
      expect(await client.getHealthStatus("entity-e2e-test")).toBe(HealthStatus.EXPIRED);
    });

    it("returns CRITICAL for critical state", async () => {
      const payload = makePayload({
        health_status: HealthStatus.CRITICAL,
        valid_until: FAR_FUTURE,
      });
      const encoded = encodeState(payload, true, true);
      const client = buildClient(makeMockAlgod(encoded));
      expect(await client.getHealthStatus("entity-e2e-test")).toBe(HealthStatus.CRITICAL);
    });

    it("returns LIQUIDITY_STRESSED for stressed state", async () => {
      const payload = makePayload({
        health_status: HealthStatus.LIQUIDITY_STRESSED,
        valid_until: FAR_FUTURE,
      });
      const encoded = encodeState(payload, false, true);
      const client = buildClient(makeMockAlgod(encoded));
      expect(await client.getHealthStatus("entity-e2e-test")).toBe(HealthStatus.LIQUIDITY_STRESSED);
    });
  });

  describe("submitEpoch", () => {
    it("throws when signer is not configured", async () => {
      const client = buildClient(makeMockAlgod());
      await expect(client.submitEpoch(makePayload())).rejects.toThrow(
        /signer|senderAddress/i
      );
    });
  });
});

// ============================================================================
// 7. FULL PIPELINE — canonical epoch → payload → encode → decode
// ============================================================================

describe("Full Pipeline: canonical epoch → payload → encode → decode", () => {
  it("preserves all fields through the full pipeline (HEALTHY)", () => {
    const epoch = makeCanonicalEpoch();
    const payload = toAlgorandSolventRegistryPayload(epoch);
    const insolvencyFlag = !payload.capital_backed;
    const liquidityStressFlag = !payload.liquidity_ready;
    const encoded = encodeState(payload, insolvencyFlag, liquidityStressFlag);
    const decoded = decodeState(encoded);

    expect(decoded.entity_id).toBe(epoch.entity_id);
    expect(decoded.epoch_id).toBe(epoch.epoch_id);
    expect(decoded.liability_root).toBe(epoch.liability_root);
    expect(decoded.reserve_root).toBe(epoch.reserve_root);
    expect(decoded.reserve_snapshot_hash).toBe(epoch.reserve_snapshot_hash);
    expect(decoded.proof_hash).toBe(epoch.proof_hash);
    expect(decoded.health_status).toBe(HealthStatus.HEALTHY);
    expect(decoded.capital_backed).toBe(true);
    expect(decoded.liquidity_ready).toBe(true);
    expect(decoded.insolvency_flag).toBe(false);
    expect(decoded.liquidity_stress_flag).toBe(false);
    expect(decoded.timestamp).toBe(SAMPLE_TS);
    expect(decoded.valid_until).toBe(SAMPLE_VU);
  });

  it("preserves fields for CRITICAL state through pipeline", () => {
    const epoch = makeCanonicalEpoch({
      capital_backed: false,
      liquidity_ready: false,
      health_status: "CRITICAL",
    });
    const payload = toAlgorandSolventRegistryPayload(epoch);
    const decoded = decodeState(encodeState(payload, true, true));

    expect(decoded.health_status).toBe(HealthStatus.CRITICAL);
    expect(decoded.capital_backed).toBe(false);
    expect(decoded.liquidity_ready).toBe(false);
    expect(decoded.insolvency_flag).toBe(true);
    expect(decoded.liquidity_stress_flag).toBe(true);
  });

  it("preserves fields for LIQUIDITY_STRESSED state through pipeline", () => {
    const epoch = makeCanonicalEpoch({
      capital_backed: true,
      liquidity_ready: false,
      health_status: "LIQUIDITY_STRESSED",
    });
    const payload = toAlgorandSolventRegistryPayload(epoch);
    const decoded = decodeState(encodeState(payload, false, true));

    expect(decoded.health_status).toBe(HealthStatus.LIQUIDITY_STRESSED);
    expect(decoded.capital_backed).toBe(true);
    expect(decoded.liquidity_ready).toBe(false);
    expect(decoded.insolvency_flag).toBe(false);
    expect(decoded.liquidity_stress_flag).toBe(true);
  });

  it("preserves fields for UNDERCOLLATERALIZED state through pipeline", () => {
    const epoch = makeCanonicalEpoch({
      capital_backed: false,
      liquidity_ready: true,
      health_status: "UNDERCOLLATERALIZED",
    });
    const payload = toAlgorandSolventRegistryPayload(epoch);
    const decoded = decodeState(encodeState(payload, true, false));

    expect(decoded.health_status).toBe(HealthStatus.UNDERCOLLATERALIZED);
    expect(decoded.capital_backed).toBe(false);
    expect(decoded.liquidity_ready).toBe(true);
    expect(decoded.insolvency_flag).toBe(true);
    expect(decoded.liquidity_stress_flag).toBe(false);
  });
});

// ============================================================================
// 8. EDGE CASES & BOUNDARY CONDITIONS
// ============================================================================

describe("Edge Cases & Boundary Conditions", () => {
  it("valid_until = 0 is treated as expired", async () => {
    const payload = makePayload({ valid_until: 0n, health_status: HealthStatus.HEALTHY });
    const encoded = encodeState(payload, false, false);
    const client = buildClient(makeMockAlgod(encoded));
    expect(await client.getHealthStatus("entity-e2e-test")).toBe(HealthStatus.EXPIRED);
  });

  it("valid_until = current time boundary", () => {
    const now = BigInt(Math.floor(Date.now() / 1000));
    const payload = makePayload({ valid_until: now + 86400n }); // 24h from now
    const decoded = decodeState(encodeState(payload, false, false));
    expect(decoded.valid_until).toBe(now + 86400n);
  });

  it("timestamp = 0 is preserved", () => {
    const payload = makePayload({ timestamp: 0n });
    const decoded = decodeState(encodeState(payload, false, false));
    expect(decoded.timestamp).toBe(0n);
  });

  it("all health statuses can be serialised and deserialised", () => {
    for (let i = 0; i <= 5; i++) {
      const payload = makePayload({ health_status: i as HealthStatus });
      const decoded = decodeState(encodeState(payload, false, false));
      expect(decoded.health_status).toBe(i);
    }
  });

  it("unicode characters in entity_id are preserved", () => {
    const payload = makePayload({ entity_id: "entity-日本語-test" });
    const decoded = decodeState(encodeState(payload, false, false));
    expect(decoded.entity_id).toBe("entity-日本語-test");
  });

  it("hex strings with mixed case are preserved", () => {
    const payload = makePayload({ liability_root: "0xAaBbCcDdEeFf" });
    const decoded = decodeState(encodeState(payload, false, false));
    expect(decoded.liability_root).toBe("0xAaBbCcDdEeFf");
  });
});

// ============================================================================
// 9. CONSISTENCY CHECKS
// ============================================================================

describe("Consistency Checks", () => {
  it("makeLatestBoxKey and makeEpochBoxKey produce different keys for same entity", () => {
    const dec = new TextDecoder();
    const latest = dec.decode(makeLatestBoxKey("entity-1"));
    const epoch = dec.decode(makeEpochBoxKey("entity-1", "epoch-1"));
    expect(latest).not.toBe(epoch);
  });

  it("AMOUNT_SCALE is consistent (1_000_000)", () => {
    // Verify the scale factor is 10^6 (micro-units)
    expect(AMOUNT_SCALE).toBe(1_000_000n);
  });

  it("encoding size varies with field length", () => {
    const short = encodeState(makePayload({ entity_id: "a" }), false, false);
    const long = encodeState(makePayload({ entity_id: "a".repeat(100) }), false, false);
    expect(long.length).toBeGreaterThan(short.length);
  });
});
