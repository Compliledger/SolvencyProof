// Backend service layer for SolvencyProof frontend
//
// This module is the primary integration point with the SolvencyProof backend.
// The backend is the source of truth for all epoch state and solvency calculations.
// The frontend MUST NOT compute solvency or liquidity values itself.
//
// All routes call the registry-backed backend endpoints directly.
// No Ethereum/contract fallback paths are retained.

import { API_BASE_URL, DEFAULT_ENTITY_ID } from "./constants";
import type {
    SolvencyEpochState,
    EpochHistoryItem,
    UserInclusionResult,
    VerificationResult,
    HealthStatus,
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
 * Calls `GET /api/epoch/latest[?entity_id=…]`.
 * The backend uses the Algorand adapter as the primary source and falls back
 * to file-based state only when the adapter is unavailable.
 *
 * @param entityId - optional entity identifier; when omitted the backend
 *   returns the default / single-entity state.
 */
export async function getLatestEpoch(entityId?: string): Promise<SolvencyEpochState> {
    const eid = entityId || DEFAULT_ENTITY_ID;
    const params = `?entity_id=${encodeURIComponent(eid)}`;
    return apiFetch<SolvencyEpochState>(`/api/epoch/latest${params}`);
}

/**
 * Fetch the epoch history for the given entity from the backend.
 *
 * Calls `GET /api/epoch/history?entity_id=…[&limit=…]`.
 * The backend uses the Algorand adapter as the primary source, returns
 * epochs sorted latest-first.
 *
 * @param entityId - entity identifier
 * @param limit    - optional maximum number of epochs to return
 */
export async function getEpochHistory(entityId?: string, limit?: number): Promise<EpochHistoryItem[]> {
    const eid = entityId || DEFAULT_ENTITY_ID;
    const params = new URLSearchParams({ entity_id: eid });
    if (limit !== undefined && limit > 0) params.set("limit", String(limit));
    return apiFetch<EpochHistoryItem[]>(`/api/epoch/history?${params.toString()}`);
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
        entity_id: entityId ?? DEFAULT_ENTITY_ID,
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
 * Submit the latest proof to the Algorand registry.
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

// ---------------------------------------------------------------------------
// Registry-level reads (Algorand adapter)
// ---------------------------------------------------------------------------

/**
 * Fetch a specific epoch state by ID.
 *
 * Calls `GET /api/epoch/:entityId?epochId=<n>`.
 * When epochId is omitted the backend returns the latest state for the entity.
 *
 * @param entityId - entity identifier
 * @param epochId  - the epoch number to retrieve
 */
export async function getEpochRecord(
    entityId: string,
    epochId: number
): Promise<SolvencyEpochState> {
    return apiFetch<SolvencyEpochState>(
        `/api/epoch/${encodeURIComponent(entityId)}?epochId=${epochId}`
    );
}

/**
 * Fetch the current health status for an entity.
 *
 * Calls `GET /api/epoch/health?entity_id=<entityId>`.
 * Returns the health status, entity ID, epoch freshness timestamps, and
 * convenience boolean flags.
 *
 * @param entityId - entity identifier
 */
export async function getHealthStatus(entityId: string): Promise<{
    entity_id: string;
    health_status: HealthStatus;
    is_healthy: boolean;
    is_fresh: boolean;
    timestamp: number;
    valid_until: number;
}> {
    return apiFetch<{
        entity_id: string;
        health_status: HealthStatus;
        is_healthy: boolean;
        is_fresh: boolean;
        timestamp: number;
        valid_until: number;
    }>(`/api/epoch/health?entity_id=${encodeURIComponent(entityId)}`);
}

/**
 * Verify that the Algorand registry record for a given entity + epoch matches
 * the backend-computed state.
 *
 * Calls `GET /api/epoch/verify-stored?entity_id=<entityId>&epoch_id=<epochId>`.
 *
 * @param entityId - entity identifier
 * @param epochId  - epoch to verify
 */
export async function verifyStoredRecord(
    entityId: string,
    epochId: number
): Promise<VerificationResult> {
    return apiFetch<VerificationResult>(
        `/api/epoch/verify-stored?entity_id=${encodeURIComponent(entityId)}&epoch_id=${epochId}`
    );
}
