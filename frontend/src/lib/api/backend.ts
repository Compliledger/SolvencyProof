// Backend service layer for SolvencyProof frontend
//
// This module is the primary integration point with the SolvencyProof backend.
// The backend is the source of truth for all epoch state and solvency calculations.
// The frontend MUST NOT compute solvency or liquidity values itself.
//
// Where a dedicated epoch endpoint exists it is called directly.
// Where it does not yet exist, the function adapts the response from the
// nearest existing endpoint and notes a TODO for the final backend route.

import { API_BASE_URL } from "./constants";
import type {
    SolvencyEpochState,
    EpochHistoryItem,
    UserInclusionResult,
} from "../types";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE_URL}${path}`, {
        headers: { "Content-Type": "application/json" },
        ...options,
    });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error ?? data.message ?? `HTTP ${res.status}`);
    }
    return data as T;
}

// ---------------------------------------------------------------------------
// Epoch state
// ---------------------------------------------------------------------------

/**
 * Fetch the latest epoch state for the given entity from the backend.
 *
 * @param entityId - optional entity identifier; when omitted the backend
 *   returns the default / single-entity state.
 *
 * TODO: back-end should expose `GET /api/epoch/latest[?entity_id=…]`
 *       returning a `SolvencyEpochState` object directly.
 *       Until then we adapt from the existing on-chain proof endpoints.
 */
export async function getLatestEpoch(entityId?: string): Promise<SolvencyEpochState> {
    // Attempt the canonical endpoint first (available once the backend is updated)
    const params = entityId ? `?entity_id=${encodeURIComponent(entityId)}` : "";
    try {
        return await apiFetch<SolvencyEpochState>(`/api/epoch/latest${params}`);
    } catch {
        // Fall back: reconstruct from existing contract-level endpoints
        const countRes = await apiFetch<{ success: boolean; epochCount: number }>(
            "/api/contracts/epoch-count"
        );
        const epochId = countRes.epochCount;
        const proof = await apiFetch<{
            success: boolean;
            epochId: string;
            liabilitiesRoot: string;
            reservesTotal: string;
            timestamp: number;
            verified: boolean;
        }>(`/api/contracts/proof/${epochId}`);

        const parsedEpochId = parseInt(proof.epochId, 10);
        return {
            entity_id: entityId ?? "default",
            epoch_id: !Number.isNaN(parsedEpochId) && parsedEpochId > 0 ? parsedEpochId : epochId,
            liability_root: proof.liabilitiesRoot,
            proof_hash: proof.liabilitiesRoot, // best available substitute until backend exposes proof_hash
            reserves_total: proof.reservesTotal,
            near_term_liabilities_total: 0, // not available from this endpoint
            liquid_assets_total: 0, // not available from this endpoint
            capital_backed: proof.verified,
            liquidity_ready: proof.verified,
            health_status: proof.verified ? "HEALTHY" : "CRITICAL",
            timestamp: proof.timestamp,
            valid_until: proof.timestamp + 86400, // assume 24-hour validity
            source_type: "on-chain-fallback",
        } satisfies SolvencyEpochState;
    }
}

/**
 * Fetch the epoch history for the given entity from the backend.
 *
 * @param entityId - entity identifier
 *
 * TODO: back-end should expose `GET /api/epoch/history?entity_id=…`
 *       returning an array of `SolvencyEpochState` objects.
 *       Until then we enumerate from the on-chain proof endpoints.
 */
export async function getEpochHistory(entityId: string): Promise<EpochHistoryItem[]> {
    // Attempt the canonical endpoint first
    try {
        return await apiFetch<EpochHistoryItem[]>(
            `/api/epoch/history?entity_id=${encodeURIComponent(entityId)}`
        );
    } catch {
        // Fall back: enumerate recent epochs from the contract
        const countRes = await apiFetch<{ success: boolean; epochCount: number }>(
            "/api/contracts/epoch-count"
        );
        const count = countRes.epochCount || 0;
        const limit = Math.min(count, 10);
        const promises: Promise<EpochHistoryItem | null>[] = [];

        for (let i = count; i > count - limit && i >= 1; i--) {
            promises.push(
                apiFetch<{
                    success: boolean;
                    epochId: string;
                    liabilitiesRoot: string;
                    reservesTotal: string;
                    timestamp: number;
                    verified: boolean;
                }>(`/api/contracts/proof/${i}`)
                    .then((p): EpochHistoryItem => {
                        const parsedId = parseInt(p.epochId, 10);
                        return {
                            entity_id: entityId,
                            epoch_id: !Number.isNaN(parsedId) && parsedId > 0 ? parsedId : i,
                            liability_root: p.liabilitiesRoot,
                            proof_hash: p.liabilitiesRoot,
                            reserves_total: p.reservesTotal,
                            near_term_liabilities_total: 0,
                            liquid_assets_total: 0,
                            capital_backed: p.verified,
                            liquidity_ready: p.verified,
                            health_status: p.verified ? "HEALTHY" : "CRITICAL",
                            timestamp: p.timestamp,
                            valid_until: p.timestamp + 86400,
                            source_type: "on-chain-fallback",
                        };
                    })
                    .catch(() => null)
            );
        }

        const results = await Promise.all(promises);
        return results.filter((r): r is EpochHistoryItem => r !== null);
    }
}

// ---------------------------------------------------------------------------
// User inclusion
// ---------------------------------------------------------------------------

/**
 * Verify that a user/account is included in the liability commitment for a
 * specific epoch.
 *
 * @param userId   - user identifier to look up
 * @param epochId  - optional epoch to check (defaults to latest)
 * @param entityId - optional entity context
 */
export async function verifyUserInclusion(
    userId: string,
    epochId?: number,
    entityId?: string
): Promise<UserInclusionResult> {
    // TODO: back-end should expose `GET /api/epoch/verify-inclusion?…`
    //       returning a `UserInclusionResult` directly.
    //       Until then we adapt from the existing Merkle verification endpoint.
    const res = await apiFetch<{
        success: boolean;
        userId?: string;
        proof?: string[];
        balance?: number;
    }>(`/api/liabilities/verify/${encodeURIComponent(userId)}`);

    // Resolve epoch metadata so we can populate the result's root
    let liabilityRoot = "";
    let resolvedEpochId = epochId ?? 0;

    try {
        const epoch = await getLatestEpoch(entityId);
        liabilityRoot = epoch.liability_root;
        resolvedEpochId = epochId ?? epoch.epoch_id;
    } catch {
        // best-effort; leave defaults
    }

    return {
        entity_id: entityId ?? "default",
        epoch_id: resolvedEpochId,
        liability_root: liabilityRoot,
        included: res.success,
        checked_at: Math.floor(Date.now() / 1000),
    };
}

// ---------------------------------------------------------------------------
// Operator actions (admin only)
// ---------------------------------------------------------------------------

/**
 * Ask the backend to refresh / re-compute the latest epoch state.
 * Only call from the Admin Console.
 */
export async function triggerRefresh(): Promise<{ success: boolean }> {
    return apiFetch<{ success: boolean }>("/api/workflow/full", {
        method: "POST",
        body: JSON.stringify({ skipProof: false }),
    });
}

/**
 * Submit the latest proof to the on-chain / Algorand registry.
 * Only call from the Admin Console.
 */
export async function submitToRegistry(): Promise<{
    success: boolean;
    txHash?: string;
    blockNumber?: number;
}> {
    return apiFetch<{ success: boolean; txHash?: string; blockNumber?: number }>(
        "/api/proof/submit",
        { method: "POST" }
    );
}
