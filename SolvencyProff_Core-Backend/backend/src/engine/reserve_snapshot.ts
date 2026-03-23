import { createHash } from "crypto";
import { keccak256, encodePacked } from "viem";
import { parseReservesJSON } from "../connectors/reserves_json.js";
import type { ReserveEntry } from "../types/inputs.js";
import type { ReserveState } from "../types/epoch.js";

/**
 * Hashes a single reserve entry into a bytes32 leaf for the Merkle tree.
 * Encoding: keccak256(source_id || amount_as_uint256 || is_liquid_as_uint8)
 */
function hashReserveLeaf(entry: ReserveEntry): `0x${string}` {
  return keccak256(
    encodePacked(
      ["string", "uint256", "uint8"],
      [entry.source_id, BigInt(entry.amount), entry.is_liquid ? 1 : 0]
    )
  );
}

/**
 * Builds a Merkle root over the reserve leaves (sorted-pair hashing).
 */
function buildReserveMerkleRoot(entries: ReserveEntry[]): string {
  let layer: `0x${string}`[] = entries.map(hashReserveLeaf);

  if (layer.length === 0) throw new Error("Cannot build Merkle root with zero entries");

  while (layer.length > 1) {
    const next: `0x${string}`[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      if (i + 1 < layer.length) {
        const [a, b] = layer[i] < layer[i + 1] ? [layer[i], layer[i + 1]] : [layer[i + 1], layer[i]];
        next.push(keccak256(encodePacked(["bytes32", "bytes32"], [a, b])));
      } else {
        next.push(layer[i]);
      }
    }
    layer = next;
  }

  return layer[0];
}

/**
 * Produces a deterministic SHA-256 snapshot hash over the full reserves array.
 * Entries are sorted by source_id before hashing to ensure determinism.
 */
function buildReserveSnapshotHash(entries: ReserveEntry[]): string {
  const sorted = [...entries].sort((a, b) => a.source_id.localeCompare(b.source_id));
  const canonical = JSON.stringify(sorted.map((e) => ({
    source_id: e.source_id,
    amount: e.amount,
    is_liquid: e.is_liquid,
  })));
  return "0x" + createHash("sha256").update(canonical, "utf8").digest("hex");
}

/**
 * Builds the complete reserve state from a JSON file.
 *
 * - Parses and validates all reserve entries
 * - Computes reserves_total (sum of all amounts)
 * - Computes liquid_assets_total (sum of amounts where is_liquid === true)
 * - Computes reserve_root (Merkle root) and reserve_snapshot_hash (SHA-256)
 */
export function buildReserveState(inputPath: string): ReserveState {
  const entries = parseReservesJSON(inputPath);

  const reserves_total = entries.reduce((sum, e) => sum + e.amount, 0);
  const liquid_assets_total = entries
    .filter((e) => e.is_liquid)
    .reduce((sum, e) => sum + e.amount, 0);

  const reserve_root = buildReserveMerkleRoot(entries);
  const reserve_snapshot_hash = buildReserveSnapshotHash(entries);

  return {
    reserve_root,
    reserve_snapshot_hash,
    reserves_total,
    liquid_assets_total,
    reserve_count: entries.length,
  };
}
