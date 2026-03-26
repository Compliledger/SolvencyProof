/**
 * algorand_adapter_real_client.ts
 *
 * Real IAlgorandAdapterClient implementation backed by the
 * SolventRegistryClient in the shared `algorand/` package.
 *
 * This module is the ONLY place in SolvencyProof backend that imports from the
 * shared algorand package. All Algorand SDK usage (transaction building,
 * signing, broadcasting) lives inside the algorand package — never here.
 *
 * Responsibilities of this module:
 *  - Convert AlgorandAdapterPayload → AlgorandRegistryPayload for submitEpoch
 *  - Convert EpochRecord → AlgorandAdapterPayload for read methods
 *  - Forward all Algorand calls to SolventRegistryClient
 *  - Implement the three methods absent from SolventRegistryClient:
 *      getEpochHistory   – not supported (requires Indexer); returns [] + warns
 *      verifyStoredRecord – fetches on-chain record and confirms it exists
 *      isFresh           – checks valid_until on latest on-chain state
 */

// Import from the shared algorand package via relative path.
// tsx resolves .js imports to the corresponding .ts source files at runtime.
import {
  SolventRegistryClient,
  createTestnetClientFromMnemonic,
  HealthStatus,
  AMOUNT_SCALE,
} from "../../../../algorand/client/registry_client.js";
import {
  HEALTH_STATUS_STRING_MAP,
} from "../../../../algorand/types/registry.js";
import type { EpochRecord } from "../../../../algorand/types/registry.js";

import type { IAlgorandAdapterClient } from "./adapter_client.js";
import type {
  AdapterHealthStatus,
  AlgorandAdapterPayload,
  EpochHistoryEntry,
  SubmitEpochResult,
  VerifyStoredRecordResult,
} from "./adapter_types.js";
import type { AlgorandAdapterEnvConfig } from "./adapter_config.js";

// ============================================================
// HEALTH STATUS REVERSE MAP  (numeric → string)
// ============================================================

const HEALTH_STATUS_NUMERIC_TO_STRING: Record<number, string> = {
  [HealthStatus.UNKNOWN]:             "CRITICAL",
  [HealthStatus.HEALTHY]:             "HEALTHY",
  [HealthStatus.LIQUIDITY_STRESSED]:  "LIQUIDITY_STRESSED",
  [HealthStatus.UNDERCOLLATERALIZED]: "UNDERCOLLATERALIZED",
  [HealthStatus.CRITICAL]:            "CRITICAL",
  [HealthStatus.EXPIRED]:             "EXPIRED",
};

// ============================================================
// CONVERSION HELPERS
// ============================================================

/**
 * Converts bigint micro-units (scaled by AMOUNT_SCALE = 1_000_000) back to
 * a human-readable USD decimal string.
 *
 * Examples:
 *   12_500_000_500_000n → "12500000.5"
 *   1_000_000_000_000n  → "1000000"
 */
function microToUsdString(n: bigint): string {
  const whole = n / AMOUNT_SCALE;
  const frac  = n % AMOUNT_SCALE;
  if (frac === 0n) return whole.toString();
  return `${whole}.${frac.toString().padStart(6, "0").replace(/0+$/, "")}`;
}

/**
 * Converts a USD decimal string to bigint micro-units.
 *
 * Examples:
 *   "12500000.5"  → 12_500_000_500_000n
 *   "1000000"     → 1_000_000_000_000n
 */
function usdStringToMicro(s: string): bigint {
  const n = parseFloat(s);
  if (!isFinite(n)) {
    throw new Error(`Invalid USD amount string: "${s}"`);
  }
  return BigInt(Math.round(n * Number(AMOUNT_SCALE)));
}

/**
 * Converts an on-chain EpochRecord back to the AlgorandAdapterPayload shape
 * expected by IAlgorandAdapterClient callers.
 *
 * @param record      - Decoded EpochRecord from box storage
 * @param anchoredAt  - Optional Unix timestamp (seconds) of the on-chain confirmation
 */
function epochRecordToAdapterPayload(
  record: EpochRecord,
  anchoredAt?: number
): AlgorandAdapterPayload {
  const healthStr =
    HEALTH_STATUS_NUMERIC_TO_STRING[record.health_status] ?? "CRITICAL";

  return {
    entity_id:                   record.entity_id,
    epoch_id:                    parseInt(record.epoch_id, 10),
    liability_root:              record.liability_root,
    reserve_root:                record.reserve_root,
    reserve_snapshot_hash:       record.reserve_snapshot_hash,
    proof_hash:                  record.proof_hash,
    reserves_total:              microToUsdString(record.reserves_total),
    liquid_assets_total:         microToUsdString(record.liquid_assets_total),
    near_term_liabilities_total: microToUsdString(record.near_term_liabilities_total),
    capital_backed:              record.capital_backed,
    liquidity_ready:             record.liquidity_ready,
    health_status:               healthStr,
    timestamp:                   Number(record.timestamp),
    valid_until:                 Number(record.valid_until),
    anchored_at:                 anchoredAt,
    adapter_version:             "algorand-adapter-v1",
  };
}

/**
 * Converts an AlgorandAdapterPayload to the AlgorandRegistryPayload shape
 * expected by SolventRegistryClient.submitEpoch().
 */
function adapterPayloadToRegistryPayload(payload: AlgorandAdapterPayload) {
  const healthStatus =
    HEALTH_STATUS_STRING_MAP[payload.health_status.toUpperCase()] ??
    HealthStatus.CRITICAL;

  return {
    entity_id:                   payload.entity_id,
    epoch_id:                    String(payload.epoch_id),
    liability_root:              payload.liability_root,
    reserve_root:                payload.reserve_root,
    reserve_snapshot_hash:       payload.reserve_snapshot_hash,
    proof_hash:                  payload.proof_hash,
    reserves_total:              usdStringToMicro(payload.reserves_total),
    liquid_assets_total:         usdStringToMicro(payload.liquid_assets_total),
    near_term_liabilities_total: usdStringToMicro(payload.near_term_liabilities_total),
    capital_backed:              payload.capital_backed,
    liquidity_ready:             payload.liquidity_ready,
    health_status:               healthStatus,
    timestamp:                   BigInt(payload.timestamp),
    valid_until:                 BigInt(payload.valid_until),
  };
}

// ============================================================
// REAL CLIENT
// ============================================================

/**
 * Real IAlgorandAdapterClient backed by SolventRegistryClient.
 *
 * Replaces AlgorandAdapterStub once ALGORAND_ADAPTER_ENABLED=true and
 * all required env vars are set.
 */
export class AlgorandAdapterRealClient implements IAlgorandAdapterClient {
  private readonly registryClient: SolventRegistryClient;

  constructor(registryClient: SolventRegistryClient) {
    this.registryClient = registryClient;
  }

  /** Returns the current Unix timestamp in seconds as a bigint. */
  private nowUnixSeconds(): bigint {
    return BigInt(Math.floor(Date.now() / 1000));
  }

  // --------------------------------------------------------
  // WRITE
  // --------------------------------------------------------

  async submitEpoch(payload: AlgorandAdapterPayload): Promise<SubmitEpochResult> {
    const registryPayload = adapterPayloadToRegistryPayload(payload);

    console.info(
      `[AlgorandAdapterRealClient] Submitting epoch to Algorand: ` +
        `entity_id=${payload.entity_id} epoch_id=${payload.epoch_id}`
    );

    const txId = await this.registryClient.submitEpoch(registryPayload);
    const confirmedAt = new Date().toISOString();

    console.info(
      `[AlgorandAdapterRealClient] Epoch submitted successfully: ` +
        `txId=${txId} epoch_id=${payload.epoch_id} confirmed_at=${confirmedAt}`
    );

    return {
      txId,
      epoch_id:     payload.epoch_id,
      confirmed_at: confirmedAt,
    };
  }

  // --------------------------------------------------------
  // READ
  // --------------------------------------------------------

  async getLatestState(entityId: string): Promise<AlgorandAdapterPayload | null> {
    console.info(
      `[AlgorandAdapterRealClient] getLatestState: entity_id=${entityId}`
    );

    const record = await this.registryClient.getLatestState(entityId);
    if (!record) {
      console.info(
        `[AlgorandAdapterRealClient] No on-chain state for entity_id=${entityId}`
      );
      return null;
    }

    return epochRecordToAdapterPayload(record);
  }

  async getEpochRecord(
    entityId: string,
    epochId: number
  ): Promise<AlgorandAdapterPayload | null> {
    console.info(
      `[AlgorandAdapterRealClient] getEpochRecord: ` +
        `entity_id=${entityId} epoch_id=${epochId}`
    );

    const record = await this.registryClient.getEpochRecord(
      entityId,
      String(epochId)
    );
    if (!record) {
      console.info(
        `[AlgorandAdapterRealClient] No on-chain record: ` +
          `entity_id=${entityId} epoch_id=${epochId}`
      );
      return null;
    }

    return epochRecordToAdapterPayload(record);
  }

  async getEpochHistory(entityId: string): Promise<EpochHistoryEntry[]> {
    // The SolventRegistryClient reads individual box keys (latest + per-epoch boxes).
    // Enumerating all epochs requires the Algorand Indexer API to scan past
    // submit_epoch transactions — this is not yet implemented.
    // The server will fall back to file-based epoch history.
    console.warn(
      `[AlgorandAdapterRealClient] getEpochHistory is not supported by the ` +
        `registry client (requires Indexer API). Returning [] for entity_id=${entityId}.`
    );
    return [];
  }

  async verifyStoredRecord(
    entityId: string,
    epochId: number
  ): Promise<VerifyStoredRecordResult> {
    console.info(
      `[AlgorandAdapterRealClient] verifyStoredRecord: ` +
        `entity_id=${entityId} epoch_id=${epochId}`
    );

    const record = await this.registryClient.getEpochRecord(
      entityId,
      String(epochId)
    );

    if (!record) {
      return {
        entity_id: entityId,
        epoch_id:  epochId,
        verified:  false,
        message:
          `No on-chain record found for entity_id=${entityId} epoch_id=${epochId}`,
      };
    }

    return {
      entity_id: entityId,
      epoch_id:  epochId,
      verified:  true,
      message:
        `On-chain record verified for entity_id=${entityId} epoch_id=${epochId}. ` +
          `proof_hash=${record.proof_hash}`,
    };
  }

  // --------------------------------------------------------
  // HEALTH / FRESHNESS
  // --------------------------------------------------------

  async getHealthStatus(entityId: string): Promise<AdapterHealthStatus | null> {
    console.info(
      `[AlgorandAdapterRealClient] getHealthStatus: entity_id=${entityId}`
    );

    const record = await this.registryClient.getLatestState(entityId);
    if (!record) return null;

    const nowSeconds = this.nowUnixSeconds();
    const isFresh    = nowSeconds <= record.valid_until;
    const isHealthy  = record.health_status === HealthStatus.HEALTHY && isFresh;
    const healthStr  = isFresh
      ? (HEALTH_STATUS_NUMERIC_TO_STRING[record.health_status] ?? "CRITICAL")
      : "EXPIRED";

    return {
      entity_id:     entityId,
      health_status: healthStr,
      is_healthy:    isHealthy,
      is_fresh:      isFresh,
      valid_until:   Number(record.valid_until),
      timestamp:     Number(record.timestamp),
    };
  }

  async isHealthy(entityId: string): Promise<boolean> {
    return this.registryClient.isHealthy(entityId);
  }

  async isFresh(entityId: string): Promise<boolean> {
    const record = await this.registryClient.getLatestState(entityId);
    if (!record) return false;
    return this.nowUnixSeconds() <= record.valid_until;
  }
}

// ============================================================
// FACTORY
// ============================================================

/**
 * Creates an AlgorandAdapterRealClient from a validated config.
 *
 * When config.mnemonic is provided the client is initialised with a signer
 * and can call submitEpoch(). Without a mnemonic the client is read-only —
 * submitEpoch() will throw an error.
 */
export function createAlgorandAdapterRealClient(
  config: AlgorandAdapterEnvConfig
): AlgorandAdapterRealClient {
  let registryClient: SolventRegistryClient;

  if (config.mnemonic) {
    registryClient = createTestnetClientFromMnemonic(config.appId, config.mnemonic);
    console.info(
      `[AlgorandAdapterRealClient] Initialised with signer for network=${config.network} ` +
        `appId=${config.appId}`
    );
  } else {
    // Read-only: no signer — submitEpoch() will throw
    registryClient = new SolventRegistryClient({
      nodeUrl:    config.algodUrl,
      nodeToken:  config.algodToken,
      nodePort:   config.algodPort,
      appId:      config.appId,
    });
    console.info(
      `[AlgorandAdapterRealClient] Initialised in READ-ONLY mode (no mnemonic) for ` +
        `network=${config.network} appId=${config.appId}`
    );
  }

  return new AlgorandAdapterRealClient(registryClient);
}
