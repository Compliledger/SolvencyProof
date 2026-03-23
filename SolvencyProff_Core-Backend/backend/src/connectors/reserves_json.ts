import { readFileSync } from "fs";
import type { ReserveEntry } from "../types/inputs.js";

/**
 * Parses and validates a reserves JSON file.
 *
 * Expected format:
 * [{ "source_id": "wallet_1", "amount": 500000, "is_liquid": true }, ...]
 *
 * Design note: this connector can be replaced by an API/webhook source
 * without changing the engine layer.
 */
export function parseReservesJSON(filePath: string): ReserveEntry[] {
  const content = readFileSync(filePath, "utf-8");

  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch (err) {
    throw new Error(`Failed to parse reserves JSON at "${filePath}": ${(err as Error).message}`);
  }

  if (!Array.isArray(raw)) {
    throw new Error(
      `reserves.json must be an array of reserve entries, got: ${typeof raw}`
    );
  }

  const entries: ReserveEntry[] = [];

  for (const item of raw as Record<string, unknown>[]) {
    const source_id = String(item.source_id ?? "").trim();
    const amount = Number(item.amount);
    const is_liquid = Boolean(item.is_liquid);

    if (!source_id) {
      throw new Error(`Invalid reserve entry: missing source_id (amount=${item.amount})`);
    }
    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error(
        `Invalid amount for reserve "${source_id}": expected non-negative number, got "${item.amount}"`
      );
    }
    if (!Number.isInteger(amount)) {
      throw new Error(
        `Invalid amount for reserve "${source_id}": fractional amounts are not supported, got "${item.amount}"`
      );
    }
    if (typeof item.is_liquid !== "boolean") {
      throw new Error(
        `Invalid is_liquid for reserve "${source_id}": expected boolean, got "${typeof item.is_liquid}"`
      );
    }

    entries.push({ source_id, amount, is_liquid });
  }

  if (entries.length === 0) {
    throw new Error(`No valid reserve entries found in: ${filePath}`);
  }

  return entries;
}
