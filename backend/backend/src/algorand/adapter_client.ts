/**
 * adapter_client.ts
 *
 * Abstraction layer for the external compliledger-algorand-adapter.
 *
 * Architectural contract:
 *  - SolvencyProof computes all solvency state and produces a canonical
 *    AlgorandAdapterPayload (see adapter_payload.ts).
 *  - The external compliledger-algorand-adapter is the ONLY component that
 *    builds Algorand transactions and communicates directly with the chain.
 *  - SolvencyProof hands off the payload to the adapter via this client
 *    interface and does NOT contain any Algorand SDK usage.
 *
 * This file defines:
 *  - IAlgorandAdapterClient  — the contract the real adapter must satisfy
 *  - AlgorandAdapterStub     — a no-op stub used until the adapter package
 *                              is integrated
 *  - createAlgorandAdapterClient() — factory that returns the active client
 */

import type {
  AdapterHealthStatus,
  AlgorandAdapterPayload,
  EpochHistoryEntry,
  SubmitEpochResult,
  VerifyStoredRecordResult,
} from "./adapter_types.js";
import { loadAlgorandAdapterConfig } from "./adapter_config.js";
import { createAlgorandAdapterRealClient } from "./algorand_adapter_real_client.js";

// ============================================================
// INTERFACE
// ============================================================

/**
 * Contract that the external compliledger-algorand-adapter must satisfy.
 *
 * SolvencyProof only calls these four methods. All Algorand SDK usage lives
 * inside the adapter implementation — never inside SolvencyProof.
 */
export interface IAlgorandAdapterClient {
  /**
   * Submits a canonical solvency epoch to the Algorand Solvent Registry.
   *
   * The adapter translates the payload into an Algorand ABI method call,
   * signs it, and broadcasts the transaction. SolvencyProof does not
   * participate in transaction construction.
   *
   * @param payload - Payload produced by toAlgorandSolventRegistryPayload()
   * @returns Transaction ID and confirmation metadata
   * @throws When the submission is rejected by the on-chain contract
   */
  submitEpoch(payload: AlgorandAdapterPayload): Promise<SubmitEpochResult>;

  /**
   * Retrieves the latest on-chain solvency state for an entity.
   *
   * @param entityId - Entity identifier (e.g. "compliledger-entity-01")
   * @returns The most recently submitted epoch payload, or null if none exists
   */
  getLatestState(entityId: string): Promise<AlgorandAdapterPayload | null>;

  /**
   * Retrieves the full epoch submission history for an entity.
   *
   * @param entityId - Entity identifier
   * @returns List of epoch history entries in submission order (oldest first)
   */
  getEpochHistory(entityId: string): Promise<EpochHistoryEntry[]>;

  /**
   * Verifies that the on-chain record for a specific epoch matches the
   * provided payload, confirming that the stored state has not been tampered.
   *
   * @param entityId - Entity identifier
   * @param epochId  - Epoch ID to verify
   * @returns Verification result with a boolean flag and a human-readable message
   */
  verifyStoredRecord(
    entityId: string,
    epochId: number
  ): Promise<VerifyStoredRecordResult>;

  /**
   * Retrieves a specific historical epoch record for an entity.
   *
   * @param entityId - Entity identifier
   * @param epochId  - The epoch ID to retrieve
   * @returns The epoch payload for the requested epoch, or null if not found
   */
  getEpochRecord(
    entityId: string,
    epochId: number
  ): Promise<AlgorandAdapterPayload | null>;

  /**
   * Returns the condensed health status for an entity without fetching the
   * full epoch payload.
   *
   * @param entityId - Entity identifier
   * @returns Health status summary, or null if no state exists for the entity
   */
  getHealthStatus(entityId: string): Promise<AdapterHealthStatus | null>;

  /**
   * Returns whether the entity's latest epoch is in a HEALTHY state and
   * within its validity window.
   *
   * @param entityId - Entity identifier
   * @returns true when the latest state is HEALTHY and not yet expired
   */
  isHealthy(entityId: string): Promise<boolean>;

  /**
   * Returns whether the entity's latest epoch is still within its validity
   * window (i.e. current time is before valid_until).
   *
   * @param entityId - Entity identifier
   * @returns true when the latest state has not yet expired
   */
  isFresh(entityId: string): Promise<boolean>;
}

// ============================================================
// STUB IMPLEMENTATION
// ============================================================

/**
 * No-op stub for the Algorand adapter client.
 *
 * Used while the external compliledger-algorand-adapter package has not yet
 * been wired into SolvencyProof. Each method logs its intent and returns a
 * safe placeholder response so the rest of the system continues to function.
 *
 * TODO: Replace this stub with the real adapter client once the shared
 *       compliledger-algorand-adapter package is available and integrated.
 *       Steps:
 *         1. npm install @compliledger/algorand-adapter
 *         2. Import the real client in createAlgorandAdapterClient() below
 *         3. Remove AlgorandAdapterStub once the real client is verified
 */
export class AlgorandAdapterStub implements IAlgorandAdapterClient {
  async submitEpoch(payload: AlgorandAdapterPayload): Promise<SubmitEpochResult> {
    // TODO: Forward to compliledger-algorand-adapter's submitEpoch()
    console.warn(
      "[AlgorandAdapterStub] submitEpoch called — adapter not yet connected. " +
        `epoch_id=${payload.epoch_id} entity_id=${payload.entity_id}`
    );
    return {
      txId: "STUB_TX_ID_NOT_SUBMITTED",
      epoch_id: payload.epoch_id,
      confirmed_at: new Date().toISOString(),
    };
  }

  async getLatestState(entityId: string): Promise<AlgorandAdapterPayload | null> {
    // TODO: Forward to compliledger-algorand-adapter's getLatestState()
    console.warn(
      `[AlgorandAdapterStub] getLatestState called — adapter not yet connected. entity_id=${entityId}`
    );
    return null;
  }

  async getEpochHistory(entityId: string): Promise<EpochHistoryEntry[]> {
    // TODO: Forward to compliledger-algorand-adapter's getEpochHistory()
    console.warn(
      `[AlgorandAdapterStub] getEpochHistory called — adapter not yet connected. entity_id=${entityId}`
    );
    return [];
  }

  async verifyStoredRecord(
    entityId: string,
    epochId: number
  ): Promise<VerifyStoredRecordResult> {
    // TODO: Forward to compliledger-algorand-adapter's verifyStoredRecord()
    console.warn(
      "[AlgorandAdapterStub] verifyStoredRecord called — adapter not yet connected. " +
        `entity_id=${entityId} epoch_id=${epochId}`
    );
    return {
      entity_id: entityId,
      epoch_id: epochId,
      verified: false,
      message:
        "Adapter stub: verification not available until @compliledger/algorand-adapter is integrated.",
    };
  }

  async getEpochRecord(
    entityId: string,
    epochId: number
  ): Promise<AlgorandAdapterPayload | null> {
    // TODO: Forward to compliledger-algorand-adapter's getEpochRecord()
    console.warn(
      "[AlgorandAdapterStub] getEpochRecord called — adapter not yet connected. " +
        `entity_id=${entityId} epoch_id=${epochId}`
    );
    return null;
  }

  async getHealthStatus(entityId: string): Promise<AdapterHealthStatus | null> {
    // TODO: Forward to compliledger-algorand-adapter's getHealthStatus()
    console.warn(
      `[AlgorandAdapterStub] getHealthStatus called — adapter not yet connected. entity_id=${entityId}`
    );
    return null;
  }

  async isHealthy(entityId: string): Promise<boolean> {
    // TODO: Forward to compliledger-algorand-adapter's isHealthy()
    console.warn(
      `[AlgorandAdapterStub] isHealthy called — adapter not yet connected. entity_id=${entityId}`
    );
    return false;
  }

  async isFresh(entityId: string): Promise<boolean> {
    // TODO: Forward to compliledger-algorand-adapter's isFresh()
    console.warn(
      `[AlgorandAdapterStub] isFresh called — adapter not yet connected. entity_id=${entityId}`
    );
    return false;
  }
}

// ============================================================
// FACTORY
// ============================================================

/**
 * Returns an IAlgorandAdapterClient instance.
 *
 * When ALGORAND_ADAPTER_ENABLED=true the factory reads env vars via
 * loadAlgorandAdapterConfig() and returns a live AlgorandAdapterRealClient
 * backed by the shared SolventRegistryClient.
 *
 * When ALGORAND_ADAPTER_ENABLED is absent or not "true" the factory returns
 * AlgorandAdapterStub, which logs warnings and returns safe placeholders so
 * the rest of the system continues to function without on-chain access.
 *
 * Required env vars for the real client:
 *   ALGORAND_ADAPTER_ENABLED=true
 *   ALGORAND_APP_ID             — deployed SolventRegistry application ID
 *
 * Optional env vars (with testnet defaults):
 *   ALGORAND_ALGOD_URL          — Algod node URL
 *   ALGORAND_ALGOD_TOKEN        — Algod auth token
 *   ALGORAND_ALGOD_PORT         — Algod port
 *   ALGORAND_NETWORK            — "testnet" | "mainnet"
 *   ALGO_MNEMONIC               — 25-word mnemonic (needed for submitEpoch)
 *   ALGORAND_SENDER_ADDRESS     — Override sender address
 */
export function createAlgorandAdapterClient(): IAlgorandAdapterClient {
  if (process.env.ALGORAND_ADAPTER_ENABLED === "true") {
    try {
      const config = loadAlgorandAdapterConfig();
      const client = createAlgorandAdapterRealClient(config);
      console.info(
        `[createAlgorandAdapterClient] Real Algorand adapter enabled: ` +
          `network=${config.network} appId=${config.appId}`
      );
      return client;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[createAlgorandAdapterClient] Failed to create real adapter client — ` +
          `falling back to stub. Error: ${message}`
      );
    }
  }

  console.warn(
    "[createAlgorandAdapterClient] ALGORAND_ADAPTER_ENABLED is not set to 'true'. " +
      "Using AlgorandAdapterStub — on-chain reads/writes are disabled. " +
      "Set ALGORAND_ADAPTER_ENABLED=true and ALGORAND_APP_ID to enable real integration."
  );
  return new AlgorandAdapterStub();
}
