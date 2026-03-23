import { createHash } from "crypto";
import { extractHashableFields } from "./proof_schema.js";
import type { SolvencyEpochObject } from "../types/epoch.js";

/**
 * Computes a deterministic proof_hash for a SolvencyEpochObject.
 *
 * Hashing strategy:
 *  - Algorithm: SHA-256
 *  - Input: JSON.stringify of the canonical field subset (see proof_schema.ts)
 *  - Field order: fixed by PROOF_HASH_FIELDS — never reordered by JSON.stringify
 *  - Output: "0x" + hex digest
 *
 * The hash is stable across runs for identical inputs and does not depend on
 * insertion order of the epoch object's keys.
 *
 * This is the canonical backend commitment hash.
 * It is NOT a ZK proof — it is the state fingerprint submitted to Algorand.
 */
export function computeProofHash(epoch: SolvencyEpochObject): string {
  const fields = extractHashableFields(epoch);
  const canonical = JSON.stringify(fields);
  return "0x" + createHash("sha256").update(canonical, "utf8").digest("hex");
}
