import { describe, it, expect } from "vitest";
import {
  evaluateEntityAdmission,
  evaluateReserveSourcesAdmission,
  evaluateLiabilityInputsAdmission,
  evaluateAdmission,
} from "../marketproof/admission_evaluator.js";
import { REASON_CODES } from "../marketproof/reason_codes.js";
import type { ReserveEntry, LiabilityEntry } from "../types/inputs.js";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const validReserves: ReserveEntry[] = [
  { source_id: "wallet_1", amount: 500000, is_liquid: true },
  { source_id: "wallet_2", amount: 200000, is_liquid: false },
];

const noLiquidReserves: ReserveEntry[] = [
  { source_id: "wallet_1", amount: 500000, is_liquid: false },
];

const validLiabilities: LiabilityEntry[] = [
  { user_id: "alice", balance: 100000 },
  { user_id: "bob", balance: 200000 },
];

const zeroBalanceLiabilities: LiabilityEntry[] = [
  { user_id: "alice", balance: 0 },
];

// ─── evaluateEntityAdmission ─────────────────────────────────────────────────

describe("evaluateEntityAdmission", () => {
  it("admits a valid entity id", () => {
    expect(evaluateEntityAdmission("compliledger-entity-01")).toBe(true);
    expect(evaluateEntityAdmission("entity_A")).toBe(true);
    expect(evaluateEntityAdmission("firm123")).toBe(true);
  });

  it("rejects an empty string", () => {
    expect(evaluateEntityAdmission("")).toBe(false);
  });

  it("rejects a whitespace-only string", () => {
    expect(evaluateEntityAdmission("   ")).toBe(false);
  });

  it("rejects ids containing invalid characters", () => {
    expect(evaluateEntityAdmission("entity@firm")).toBe(false);
    expect(evaluateEntityAdmission("entity firm")).toBe(false);
    expect(evaluateEntityAdmission("entity.firm")).toBe(false);
  });
});

// ─── evaluateReserveSourcesAdmission ────────────────────────────────────────

describe("evaluateReserveSourcesAdmission", () => {
  it("admits reserves when at least one entry is liquid", () => {
    expect(evaluateReserveSourcesAdmission(validReserves)).toBe(true);
  });

  it("rejects an empty reserves array", () => {
    expect(evaluateReserveSourcesAdmission([])).toBe(false);
  });

  it("rejects reserves with no liquid entry", () => {
    expect(evaluateReserveSourcesAdmission(noLiquidReserves)).toBe(false);
  });

  it("admits when all entries are liquid", () => {
    const allLiquid: ReserveEntry[] = [
      { source_id: "w1", amount: 100, is_liquid: true },
      { source_id: "w2", amount: 200, is_liquid: true },
    ];
    expect(evaluateReserveSourcesAdmission(allLiquid)).toBe(true);
  });
});

// ─── evaluateLiabilityInputsAdmission ───────────────────────────────────────

describe("evaluateLiabilityInputsAdmission", () => {
  it("admits liabilities when at least one entry has a positive balance", () => {
    expect(evaluateLiabilityInputsAdmission(validLiabilities)).toBe(true);
  });

  it("rejects an empty liabilities array", () => {
    expect(evaluateLiabilityInputsAdmission([])).toBe(false);
  });

  it("rejects liabilities where all balances are zero", () => {
    expect(evaluateLiabilityInputsAdmission(zeroBalanceLiabilities)).toBe(false);
  });

  it("admits when at least one balance is positive alongside zeros", () => {
    const mixed: LiabilityEntry[] = [
      { user_id: "alice", balance: 0 },
      { user_id: "bob", balance: 50000 },
    ];
    expect(evaluateLiabilityInputsAdmission(mixed)).toBe(true);
  });
});

// ─── evaluateAdmission (composite) ──────────────────────────────────────────

describe("evaluateAdmission", () => {
  it("returns ADMITTED with all positive codes when all checks pass", () => {
    const result = evaluateAdmission({
      entity_id: "compliledger-entity-01",
      reserve_entries: validReserves,
      liability_entries: validLiabilities,
    });

    expect(result.marketproof_status).toBe("ADMITTED");
    expect(result.reason_codes).toContain(REASON_CODES.ENTITY_ADMITTED);
    expect(result.reason_codes).toContain(REASON_CODES.RESERVE_SOURCES_ADMITTED);
    expect(result.reason_codes).toContain(REASON_CODES.LIABILITY_INPUTS_ADMITTED);
    expect(result.reason_codes).toHaveLength(3);
  });

  it("returns NOT_ADMITTED when entity_id is invalid", () => {
    const result = evaluateAdmission({
      entity_id: "",
      reserve_entries: validReserves,
      liability_entries: validLiabilities,
    });

    expect(result.marketproof_status).toBe("NOT_ADMITTED");
    expect(result.reason_codes).toContain(REASON_CODES.NOT_ENTITY_ADMITTED);
    expect(result.reason_codes).toContain(REASON_CODES.RESERVE_SOURCES_ADMITTED);
    expect(result.reason_codes).toContain(REASON_CODES.LIABILITY_INPUTS_ADMITTED);
  });

  it("returns NOT_ADMITTED when reserves have no liquid entry", () => {
    const result = evaluateAdmission({
      entity_id: "compliledger-entity-01",
      reserve_entries: noLiquidReserves,
      liability_entries: validLiabilities,
    });

    expect(result.marketproof_status).toBe("NOT_ADMITTED");
    expect(result.reason_codes).toContain(REASON_CODES.ENTITY_ADMITTED);
    expect(result.reason_codes).toContain(REASON_CODES.NOT_RESERVE_SOURCES_ADMITTED);
    expect(result.reason_codes).toContain(REASON_CODES.LIABILITY_INPUTS_ADMITTED);
  });

  it("returns NOT_ADMITTED when all liability balances are zero", () => {
    const result = evaluateAdmission({
      entity_id: "compliledger-entity-01",
      reserve_entries: validReserves,
      liability_entries: zeroBalanceLiabilities,
    });

    expect(result.marketproof_status).toBe("NOT_ADMITTED");
    expect(result.reason_codes).toContain(REASON_CODES.NOT_LIABILITY_INPUTS_ADMITTED);
  });

  it("returns NOT_ADMITTED with all negative codes when all checks fail", () => {
    const result = evaluateAdmission({
      entity_id: "",
      reserve_entries: [],
      liability_entries: [],
    });

    expect(result.marketproof_status).toBe("NOT_ADMITTED");
    expect(result.reason_codes).toEqual([
      REASON_CODES.NOT_ENTITY_ADMITTED,
      REASON_CODES.NOT_RESERVE_SOURCES_ADMITTED,
      REASON_CODES.NOT_LIABILITY_INPUTS_ADMITTED,
    ]);
  });

  it("reason_codes array always has exactly 3 entries", () => {
    const admittedResult = evaluateAdmission({
      entity_id: "firm-1",
      reserve_entries: validReserves,
      liability_entries: validLiabilities,
    });
    expect(admittedResult.reason_codes).toHaveLength(3);

    const rejectedResult = evaluateAdmission({
      entity_id: "",
      reserve_entries: [],
      liability_entries: [],
    });
    expect(rejectedResult.reason_codes).toHaveLength(3);
  });
});
