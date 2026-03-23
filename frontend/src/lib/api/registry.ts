// Algorand public state registry integration
//
// Algorand is the public state registry for SolvencyProof epoch states.
// This module provides read-only access to the on-chain Algorand registry.
//
// TODO: Replace stubs with real Algorand SDK / Indexer calls once the
//       Algorand smart-contract registry address and ABI are finalised.
//       See the `algorand/` directory in this repo for contract details.

import type { SolvencyEpochState } from "../types";

// ---------------------------------------------------------------------------
// Registry configuration (update when Algorand contracts are deployed)
// ---------------------------------------------------------------------------

/** Algorand application ID for the SolvencyProof state registry. */
export const ALGORAND_APP_ID: number | null = null; // TODO: set after deployment

/** Algorand network to target ("mainnet" | "testnet" | "betanet"). */
export const ALGORAND_NETWORK = "testnet" as const;

/** Algorand Indexer base URL for the target network. */
export const ALGORAND_INDEXER_URL =
    ALGORAND_NETWORK === "mainnet"
        ? "https://mainnet-idx.algonode.cloud"
        : "https://testnet-idx.algonode.cloud";

// ---------------------------------------------------------------------------
// Public registry reads
// ---------------------------------------------------------------------------

/**
 * Fetch the latest canonical `SolvencyEpochState` for an entity from the
 * Algorand public state registry.
 *
 * @param entityId - entity whose latest epoch state is requested
 * @returns the latest epoch state, or `null` when not yet available / registry
 *          is not yet deployed.
 *
 * TODO: implement using algosdk or the Algonode Indexer REST API once the
 *       Algorand contract is deployed and the state schema is finalised.
 */
export async function getRegistryLatest(
    _entityId: string
): Promise<SolvencyEpochState | null> {
    // Stub — Algorand registry not yet deployed
    return null;
}

/**
 * Fetch a specific epoch state from the Algorand public state registry.
 *
 * @param entityId - entity identifier
 * @param epochId  - epoch number to retrieve
 * @returns the epoch state, or `null` when not available.
 *
 * TODO: implement once Algorand contract is deployed.
 */
export async function getRegistryEpoch(
    _entityId: string,
    _epochId: number
): Promise<SolvencyEpochState | null> {
    // Stub — Algorand registry not yet deployed
    return null;
}

/**
 * Check whether the Algorand registry is reachable and configured.
 *
 * @returns `true` when the registry is available.
 */
export function isRegistryAvailable(): boolean {
    return ALGORAND_APP_ID !== null;
}
