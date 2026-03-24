/**
 * adapter_types.ts
 *
 * Strong TypeScript type definitions for the SolvencyProof → Algorand adapter
 * integration layer.
 *
 * These types define the canonical contract between:
 *  - SolvencyProof (source of truth — computes all solvency state)
 *  - The external compliledger-algorand-adapter (chain submission layer —
 *    the ONLY component that builds Algorand transactions)
 *
 * SolvencyProof produces an AlgorandAdapterPayload from a canonical
 * SolvencyEpochObject and hands it off to the adapter. No Algorand SDK
 * code lives inside SolvencyProof.
 */

// ============================================================
// PAYLOAD (SolvencyProof → adapter hand-off)
// ============================================================

/**
 * Canonical payload handed off from SolvencyProof to the shared
 * compliledger-algorand-adapter.
 *
 * Monetary totals are serialised as decimal strings to avoid floating-point
 * precision loss during JSON serialisation of large USD amounts. The adapter
 * is responsible for converting these strings to on-chain integer micro-units
 * before broadcasting transactions.
 */
export interface AlgorandAdapterPayload {
  /** Identifier for the reporting entity (e.g. "compliledger-entity-01"). */
  entity_id: string;

  /** Monotonically-increasing epoch identifier (Unix-epoch-based bucket). */
  epoch_id: number;

  /** Hex-encoded Merkle root of the liability tree. */
  liability_root: string;

  /** Hex-encoded Merkle root of the reserve tree. */
  reserve_root: string;

  /** SHA-256 hash of the reserve snapshot at evaluation time. */
  reserve_snapshot_hash: string;

  /**
   * Deterministic SHA-256 proof hash linking liabilities, reserves, and
   * epoch identity. Allows public verifiers to confirm the epoch has not
   * been tampered with.
   */
  proof_hash: string;

  /** Total reserves in USD, serialised as a decimal string. */
  reserves_total: string;

  /** Liquid assets in USD, serialised as a decimal string. */
  liquid_assets_total: string;

  /** Near-term liabilities in USD, serialised as a decimal string. */
  near_term_liabilities_total: string;

  /** True when reserves_total >= total_liabilities (capital backing check). */
  capital_backed: boolean;

  /** True when liquid_assets >= near_term_liabilities (liquidity check). */
  liquidity_ready: boolean;

  /**
   * Human-readable health status string produced by SolvencyProof.
   * One of: "HEALTHY" | "LIQUIDITY_STRESSED" | "UNDERCOLLATERALIZED" | "CRITICAL".
   * The adapter converts this to its on-chain numeric representation.
   */
  health_status: string;

  /** Unix timestamp (seconds) when this epoch was generated. */
  timestamp: number;

  /** Unix timestamp (seconds) until which this epoch is considered fresh. */
  valid_until: number;

  /**
   * Unix timestamp (seconds) when this epoch state was anchored on-chain.
   * Populated by the adapter from the confirmed Algorand transaction timestamp.
   * Absent when the epoch has not yet been submitted to the registry.
   */
  anchored_at?: number;

  /**
   * Total liabilities in USD, serialised as a decimal string.
   * Populated by the adapter from on-chain box storage when available.
   */
  total_liabilities?: string;

  /** Adapter schema version used to build this payload (e.g. "algorand-adapter-v1"). */
  adapter_version: string;
}

// ============================================================
// HEALTH STATUS RESPONSE
// ============================================================

/**
 * Health status payload returned by the adapter's getHealthStatus() method.
 * Provides a condensed view without requiring the full epoch payload.
 */
export interface AdapterHealthStatus {
  /** Entity identifier. */
  entity_id: string;

  /**
   * Human-readable health status string.
   * One of: "HEALTHY" | "LIQUIDITY_STRESSED" | "UNDERCOLLATERALIZED" | "CRITICAL" | "EXPIRED".
   */
  health_status: string;

  /** True when health_status === "HEALTHY" and the epoch is still within its validity window. */
  is_healthy: boolean;

  /** True when the current time is before valid_until. */
  is_fresh: boolean;

  /** Unix timestamp (seconds) until which this epoch state is considered fresh. */
  valid_until: number;

  /** Unix timestamp (seconds) when this epoch was generated. */
  timestamp: number;
}

// ============================================================
// CLIENT RESPONSE TYPES
// ============================================================

/**
 * Result returned by the adapter after a successful epoch submission.
 */
export interface SubmitEpochResult {
  /** Algorand transaction ID of the confirmed on-chain submission. */
  txId: string;

  /** The epoch_id that was submitted, echoed back for correlation. */
  epoch_id: number;

  /** ISO-8601 timestamp when the submission was confirmed on-chain. */
  confirmed_at: string;
}

/**
 * A single entry in an entity's on-chain epoch history.
 */
export interface EpochHistoryEntry {
  /** The epoch identifier. */
  epoch_id: number;

  /** Health status recorded for this epoch. */
  health_status: string;

  /** Unix timestamp (seconds) when this epoch was generated. */
  timestamp: number;

  /** Unix timestamp (seconds) until which this epoch was considered fresh. */
  valid_until: number;

  /** Algorand transaction ID of the epoch submission. */
  txId: string;
}

/**
 * Result of verifying a stored on-chain record against an expected payload.
 */
export interface VerifyStoredRecordResult {
  /** Entity identifier that was verified. */
  entity_id: string;

  /** Epoch identifier that was verified. */
  epoch_id: number;

  /** True when the on-chain record matches the expected payload exactly. */
  verified: boolean;

  /** Human-readable description of the verification outcome. */
  message: string;
}
