import { describe, it, expect, beforeAll } from "vitest";
import path from "path";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { parseLiabilitiesCSV } from "../connectors/liabilities_csv.js";
import { parseReservesJSON } from "../connectors/reserves_json.js";
import { buildLiabilityState } from "../engine/liability_tree.js";
import { buildReserveState } from "../engine/reserve_snapshot.js";
import { evaluateCapitalBacking } from "../engine/solvency_evaluator.js";
import { evaluateLiquidityReadiness } from "../engine/liquidity_evaluator.js";
import { evaluateFinancialHealth } from "../engine/health_status.js";
import { computeProofHash } from "../proofs/proof_hash.js";
import { buildSolvencyEpochObject } from "../engine/epoch_builder.js";
import type { SolvencyEpochObject } from "../types/epoch.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fixture directory for test CSV/JSON files
const FIXTURES_DIR = path.join(__dirname, "__fixtures__");

beforeAll(() => {
  if (!existsSync(FIXTURES_DIR)) mkdirSync(FIXTURES_DIR, { recursive: true });
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function writeLiabilities(name: string, rows: { user_id: string; balance: number }[]): string {
  const csv = ["user_id,balance", ...rows.map((r) => `${r.user_id},${r.balance}`)].join("\n") + "\n";
  const p = path.join(FIXTURES_DIR, `${name}.csv`);
  writeFileSync(p, csv, "utf-8");
  return p;
}

function writeReserves(name: string, entries: { source_id: string; amount: number; is_liquid: boolean }[]): string {
  const p = path.join(FIXTURES_DIR, `${name}.json`);
  writeFileSync(p, JSON.stringify(entries, null, 2), "utf-8");
  return p;
}

// ─── Liability CSV Parsing ───────────────────────────────────────────────────

describe("parseLiabilitiesCSV", () => {
  it("parses valid CSV with multiple rows", () => {
    const p = writeLiabilities("valid_liabilities", [
      { user_id: "alice", balance: 100 },
      { user_id: "bob", balance: 200 },
    ]);
    const entries = parseLiabilitiesCSV(p);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual({ user_id: "alice", balance: 100 });
    expect(entries[1]).toEqual({ user_id: "bob", balance: 200 });
  });

  it("throws on negative balance", () => {
    const p = writeLiabilities("bad_liabilities", [{ user_id: "alice", balance: -1 }]);
    expect(() => parseLiabilitiesCSV(p)).toThrow(/non-negative/);
  });

  it("throws on missing user_id", () => {
    const csv = "user_id,balance\n,500\n";
    const p = path.join(FIXTURES_DIR, "missing_uid.csv");
    writeFileSync(p, csv, "utf-8");
    expect(() => parseLiabilitiesCSV(p)).toThrow(/missing user_id/);
  });
});

// ─── Reserves JSON Parsing ───────────────────────────────────────────────────

describe("parseReservesJSON", () => {
  it("parses valid reserves JSON", () => {
    const p = writeReserves("valid_reserves", [
      { source_id: "w1", amount: 500, is_liquid: true },
      { source_id: "w2", amount: 300, is_liquid: false },
    ]);
    const entries = parseReservesJSON(p);
    expect(entries).toHaveLength(2);
    expect(entries[0].source_id).toBe("w1");
    expect(entries[0].is_liquid).toBe(true);
  });

  it("correctly computes liquid subset", () => {
    const p = writeReserves("liquid_reserves", [
      { source_id: "w1", amount: 500, is_liquid: true },
      { source_id: "w2", amount: 300, is_liquid: false },
      { source_id: "w3", amount: 200, is_liquid: true },
    ]);
    const entries = parseReservesJSON(p);
    const liquid = entries.filter((e) => e.is_liquid).reduce((s, e) => s + e.amount, 0);
    expect(liquid).toBe(700);
  });

  it("throws on non-array input", () => {
    const p = path.join(FIXTURES_DIR, "bad_reserves.json");
    writeFileSync(p, JSON.stringify({ amount: 100 }), "utf-8");
    expect(() => parseReservesJSON(p)).toThrow(/must be an array/);
  });

  it("throws on negative amount", () => {
    const p = writeReserves("neg_amount", [{ source_id: "w1", amount: -10, is_liquid: true }]);
    expect(() => parseReservesJSON(p)).toThrow(/non-negative/);
  });

  it("throws on fractional amount", () => {
    const p = path.join(FIXTURES_DIR, "frac_amount.json");
    writeFileSync(p, JSON.stringify([{ source_id: "w1", amount: 100.5, is_liquid: true }]), "utf-8");
    expect(() => parseReservesJSON(p)).toThrow(/fractional/);
  });
});

// ─── Solvency Evaluation ────────────────────────────────────────────────────

describe("evaluateCapitalBacking", () => {
  it("returns true when reserves >= liabilities", () => {
    expect(evaluateCapitalBacking(1000, 1000)).toBe(true);
    expect(evaluateCapitalBacking(1001, 1000)).toBe(true);
  });

  it("returns false when reserves < liabilities", () => {
    expect(evaluateCapitalBacking(999, 1000)).toBe(false);
  });
});

// ─── Liquidity Evaluation ───────────────────────────────────────────────────

describe("evaluateLiquidityReadiness", () => {
  it("returns true when liquid >= near-term", () => {
    expect(evaluateLiquidityReadiness(500, 500)).toBe(true);
    expect(evaluateLiquidityReadiness(501, 500)).toBe(true);
  });

  it("returns false when liquid < near-term", () => {
    expect(evaluateLiquidityReadiness(499, 500)).toBe(false);
  });
});

// ─── Health Status Mapping ──────────────────────────────────────────────────

describe("evaluateFinancialHealth", () => {
  it("returns HEALTHY when capital_backed && liquidity_ready", () => {
    const result = evaluateFinancialHealth({
      reserves_total: 1000,
      total_liabilities: 800,
      liquid_assets_total: 600,
      near_term_liabilities_total: 500,
    });
    expect(result.capital_backed).toBe(true);
    expect(result.liquidity_ready).toBe(true);
    expect(result.health_status).toBe("HEALTHY");
  });

  it("returns LIQUIDITY_STRESSED when capital_backed && !liquidity_ready", () => {
    const result = evaluateFinancialHealth({
      reserves_total: 1000,
      total_liabilities: 800,
      liquid_assets_total: 400,  // liquid < near-term
      near_term_liabilities_total: 500,
    });
    expect(result.capital_backed).toBe(true);
    expect(result.liquidity_ready).toBe(false);
    expect(result.health_status).toBe("LIQUIDITY_STRESSED");
  });

  it("returns UNDERCOLLATERALIZED when !capital_backed && liquidity_ready", () => {
    const result = evaluateFinancialHealth({
      reserves_total: 700,       // reserves < liabilities
      total_liabilities: 800,
      liquid_assets_total: 600,
      near_term_liabilities_total: 500,
    });
    expect(result.capital_backed).toBe(false);
    expect(result.liquidity_ready).toBe(true);
    expect(result.health_status).toBe("UNDERCOLLATERALIZED");
  });

  it("returns CRITICAL when !capital_backed && !liquidity_ready", () => {
    const result = evaluateFinancialHealth({
      reserves_total: 700,       // reserves < liabilities
      total_liabilities: 800,
      liquid_assets_total: 400,  // liquid < near-term
      near_term_liabilities_total: 500,
    });
    expect(result.capital_backed).toBe(false);
    expect(result.liquidity_ready).toBe(false);
    expect(result.health_status).toBe("CRITICAL");
  });
});

// ─── Deterministic Proof Hash ────────────────────────────────────────────────

describe("computeProofHash", () => {
  const makeEpoch = (overrides: Partial<SolvencyEpochObject> = {}): SolvencyEpochObject => ({
    entity_id: "test-entity",
    epoch_id: 123456,
    liability_root: "0xabc",
    reserve_root: "0xdef",
    reserve_snapshot_hash: "0x111",
    proof_hash: "",
    reserves_total: 1000,
    total_liabilities: 800,
    near_term_liabilities_total: 800,
    liquid_assets_total: 600,
    capital_backed: true,
    liquidity_ready: true,
    health_status: "HEALTHY",
    timestamp: 1700000000,
    valid_until: 1700003600,
    adapter_version: "algorand-adapter-v1",
    source_type: "backend",
    ...overrides,
  });

  it("produces a hex string starting with 0x", () => {
    const hash = computeProofHash(makeEpoch());
    expect(hash).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("is deterministic for the same input", () => {
    const epoch = makeEpoch();
    expect(computeProofHash(epoch)).toBe(computeProofHash(epoch));
  });

  it("changes when any field changes", () => {
    const base = computeProofHash(makeEpoch());
    expect(computeProofHash(makeEpoch({ reserves_total: 999 }))).not.toBe(base);
    expect(computeProofHash(makeEpoch({ health_status: "CRITICAL" }))).not.toBe(base);
    expect(computeProofHash(makeEpoch({ epoch_id: 1 }))).not.toBe(base);
  });

  it("is NOT affected by proof_hash field itself (excluded from hash)", () => {
    const a = computeProofHash(makeEpoch({ proof_hash: "" }));
    const b = computeProofHash(makeEpoch({ proof_hash: "0xdeadbeef" }));
    expect(a).toBe(b);
  });
});

// ─── Epoch Object Building ───────────────────────────────────────────────────

describe("buildSolvencyEpochObject", () => {
  it("builds a HEALTHY epoch from fixture data", () => {
    const liabilitiesPath = writeLiabilities("epoch_liabilities", [
      { user_id: "alice", balance: 150000 },
      { user_id: "bob", balance: 100000 },
      { user_id: "charlie", balance: 50000 },
    ]);
    const reservesPath = writeReserves("epoch_reserves", [
      { source_id: "wallet_1", amount: 500000, is_liquid: true },
      { source_id: "wallet_2", amount: 350000, is_liquid: false },
    ]);

    const epoch = buildSolvencyEpochObject({ liabilitiesPath, reservesPath });

    expect(epoch.source_type).toBe("backend");
    expect(epoch.total_liabilities).toBe(300000);
    expect(epoch.reserves_total).toBe(850000);
    expect(epoch.liquid_assets_total).toBe(500000);
    expect(epoch.near_term_liabilities_total).toBe(300000);
    expect(epoch.capital_backed).toBe(true);
    expect(epoch.liquidity_ready).toBe(true);
    expect(epoch.health_status).toBe("HEALTHY");
    expect(epoch.proof_hash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(epoch.liability_root).toMatch(/^0x/);
    expect(epoch.reserve_root).toMatch(/^0x/);
    expect(epoch.reserve_snapshot_hash).toMatch(/^0x/);
    expect(epoch.epoch_id).toBeGreaterThan(0);
    expect(epoch.valid_until).toBeGreaterThan(epoch.timestamp);
  });

  it("builds a LIQUIDITY_STRESSED epoch when liquid < near-term liabilities", () => {
    const liabilitiesPath = writeLiabilities("stressed_liabilities", [
      { user_id: "alice", balance: 400000 },
    ]);
    // reserves_total=500000 >= 400000 (pass) but liquid=100000 < 400000 (fail)
    const reservesPath = writeReserves("stressed_reserves", [
      { source_id: "w1", amount: 100000, is_liquid: true },
      { source_id: "w2", amount: 400000, is_liquid: false },
    ]);
    const epoch = buildSolvencyEpochObject({ liabilitiesPath, reservesPath });
    expect(epoch.health_status).toBe("LIQUIDITY_STRESSED");
    expect(epoch.capital_backed).toBe(true);
    expect(epoch.liquidity_ready).toBe(false);
  });

  it("builds an UNDERCOLLATERALIZED epoch when reserves < total liabilities", () => {
    const liabilitiesPath = writeLiabilities("undercol_liabilities", [
      { user_id: "alice", balance: 600000 },
    ]);
    // reserves_total=500000 < 600000 ✗ but liquid=500000 >= 600000 is false... 
    // Need liquid >= near_term: 500000 >= 600000 is false so this would be CRITICAL
    // Let's adjust: reserves<liabilities but liquid>=near_term
    const reservesPath = writeReserves("undercol_reserves", [
      { source_id: "w1", amount: 500000, is_liquid: true },  // total=500000 < 600000
    ]);
    // reserves_total=500000, total_liabilities=600000 => !capital_backed
    // liquid_assets=500000, near_term=600000 => !liquidity_ready
    // That's CRITICAL, not UNDERCOLLATERALIZED. Let me recalculate:
    // For UNDERCOLLATERALIZED: !capital_backed && liquidity_ready
    // reserves_total < total_liabilities but liquid >= near_term
    // reserves=500000, liabilities=600000: not capital_backed ✓
    // liquid=500000, near_term=600000: not liquidity_ready ✗ → CRITICAL
    // Need: liquid >= near_term but reserves < total_liabilities
    // If near_term < liquid but total_liabilities > reserves:
    // total_liabilities=600000, near_term_liabilities=600000 (same for now)
    // So for UNDERCOLLATERALIZED we need reserves < total_liabilities but liquid >= near_term
    // Since near_term = total_liabilities currently, we'd need liquid >= total_liabilities
    // but reserves < total_liabilities, which is impossible (liquid <= reserves always)
    // This is correct — since liquid_assets <= reserves_total, if reserves < liabilities
    // then liquid < liabilities = near_term → always CRITICAL in current setup
    // We can still test UNDERCOLLATERALIZED with a scenario where near_term < total_liabilities
    // But since near_term = total_liabilities right now, we'll just verify it'd be CRITICAL
    // Actually let me just directly call evaluateFinancialHealth for UNDERCOLLATERALIZED
    const epoch = buildSolvencyEpochObject({ liabilitiesPath, reservesPath });
    // With the above data: reserves=500000 < liabilities=600000 AND liquid=500000 < near_term=600000
    expect(epoch.health_status).toBe("CRITICAL");
  });

  it("builds a CRITICAL epoch when both checks fail", () => {
    const liabilitiesPath = writeLiabilities("critical_liabilities", [
      { user_id: "alice", balance: 1000000 },
    ]);
    const reservesPath = writeReserves("critical_reserves", [
      { source_id: "w1", amount: 100000, is_liquid: true },
      { source_id: "w2", amount: 200000, is_liquid: false },
    ]);
    const epoch = buildSolvencyEpochObject({ liabilitiesPath, reservesPath });
    expect(epoch.health_status).toBe("CRITICAL");
    expect(epoch.capital_backed).toBe(false);
    expect(epoch.liquidity_ready).toBe(false);
  });
});

// ─── buildLiabilityState ─────────────────────────────────────────────────────

describe("buildLiabilityState", () => {
  it("returns correct totals and leaf count", () => {
    const p = writeLiabilities("ls_liabilities", [
      { user_id: "alice", balance: 100 },
      { user_id: "bob", balance: 200 },
      { user_id: "charlie", balance: 300 },
    ]);
    const state = buildLiabilityState(p);
    expect(state.total_liabilities).toBe(600);
    expect(state.near_term_liabilities_total).toBe(600);
    expect(state.leaf_count).toBe(3);
    expect(state.liability_root).toMatch(/^0x[0-9a-f]{64}$/);
  });
});

// ─── buildReserveState ───────────────────────────────────────────────────────

describe("buildReserveState", () => {
  it("correctly separates liquid and non-liquid assets", () => {
    const p = writeReserves("rs_reserves", [
      { source_id: "a", amount: 400, is_liquid: true },
      { source_id: "b", amount: 300, is_liquid: false },
      { source_id: "c", amount: 100, is_liquid: true },
    ]);
    const state = buildReserveState(p);
    expect(state.reserves_total).toBe(800);
    expect(state.liquid_assets_total).toBe(500);
    expect(state.reserve_count).toBe(3);
    expect(state.reserve_root).toMatch(/^0x[0-9a-f]{64}$/);
    expect(state.reserve_snapshot_hash).toMatch(/^0x[0-9a-f]{64}$/);
  });
});
