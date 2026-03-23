import { readFileSync } from "fs";
import { parse } from "csv-parse/sync";
import type { LiabilityRow, LiabilityEntry } from "../types/inputs.js";

/**
 * Parses and validates a liabilities CSV file.
 *
 * Expected columns: user_id, balance
 * Design note: this connector can be replaced by an API/webhook source
 * without changing the engine layer.
 */
export function parseLiabilitiesCSV(filePath: string): LiabilityEntry[] {
  const content = readFileSync(filePath, "utf-8");

  const rows: LiabilityRow[] = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const entries: LiabilityEntry[] = [];

  for (const row of rows) {
    const balance = Number(row.balance);

    if (!row.user_id || row.user_id.trim() === "") {
      throw new Error(`Invalid liability row: missing user_id (balance=${row.balance})`);
    }
    if (!Number.isFinite(balance) || balance < 0) {
      throw new Error(
        `Invalid balance for user "${row.user_id}": expected non-negative number, got "${row.balance}"`
      );
    }
    if (!Number.isInteger(balance)) {
      throw new Error(
        `Invalid balance for user "${row.user_id}": fractional balances are not supported, got "${row.balance}"`
      );
    }

    entries.push({ user_id: row.user_id.trim(), balance });
  }

  if (entries.length === 0) {
    throw new Error(`No valid liability rows found in: ${filePath}`);
  }

  return entries;
}
