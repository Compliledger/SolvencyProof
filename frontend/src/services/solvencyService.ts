/**
 * Frontend service layer for backend / Algorand registry queries.
 *
 * The frontend is a STATE CONSUMER:
 *   backend → Algorand adapter → Algorand Testnet registry → frontend visibility
 *
 * All protocol logic lives in the backend.  The service layer here is
 * responsible only for fetching already-computed state and exposing it
 * to UI components via typed helpers.
 */

import type {
    BackendHealth,
    EpochState,
    EpochSummary,
    InclusionResult,
} from '@/types/solvency';

export const API_BASE_URL =
    (typeof import.meta !== 'undefined' && (import.meta as Record<string, unknown> & { env?: Record<string, string> })?.env?.VITE_API_URL) ||
    'https://solvency-proof-production.up.railway.app';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ---------------------------------------------------------------------------
// Simple in-memory + localStorage cache
// ---------------------------------------------------------------------------
function readCache<T>(key: string): T | null {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const { data, ts } = JSON.parse(raw) as { data: T; ts: number };
        if (Date.now() - ts > CACHE_TTL_MS) {
            localStorage.removeItem(key);
            return null;
        }
        return data;
    } catch {
        return null;
    }
}

function writeCache<T>(key: string, data: T): void {
    try {
        localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
    } catch {
        // storage quota — not fatal
    }
}

export function clearSolvencyServiceCache(): void {
    const prefix = 'sp_svc_';
    Object.keys(localStorage)
        .filter((k) => k.startsWith(prefix))
        .forEach((k) => localStorage.removeItem(k));
}

// ---------------------------------------------------------------------------
// Core fetch helper
// ---------------------------------------------------------------------------
async function apiFetch<T>(
    path: string,
    options?: RequestInit,
    cacheKey?: string,
): Promise<T> {
    if (cacheKey && (!options?.method || options.method === 'GET')) {
        const cached = readCache<T>(cacheKey);
        if (cached) return cached;
    }

    const res = await fetch(`${API_BASE_URL}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });

    const body = await res.json();

    if (!res.ok) {
        throw new Error(
            body?.error || body?.message || `HTTP ${res.status}`,
        );
    }

    if (cacheKey && (!options?.method || options.method === 'GET')) {
        writeCache(cacheKey, body);
    }

    return body as T;
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------
export function fetchBackendHealth(): Promise<BackendHealth> {
    return apiFetch<BackendHealth>('/health', undefined, 'sp_svc_health');
}

// ---------------------------------------------------------------------------
// Epoch state (backend-computed, Algorand-anchored)
// ---------------------------------------------------------------------------

/**
 * Fetch the latest epoch state for an entity from the registry-backed backend.
 */
export async function fetchLatestEpochState(entityId?: string): Promise<EpochState> {
    const path = entityId
        ? `/api/epoch/latest?entity_id=${encodeURIComponent(entityId)}`
        : '/api/epoch/latest';
    const raw = await apiFetch<Record<string, unknown>>(path, undefined, `sp_svc_epoch_latest_${entityId ?? 'default'}`);
    return normaliseEpochState(raw);
}

/**
 * Fetch a specific epoch by ID.
 */
export async function fetchEpochById(epochId: string): Promise<EpochState> {
    const raw = await apiFetch<Record<string, unknown>>(
        `/api/epoch/${encodeURIComponent(epochId)}`,
    );
    return normaliseEpochState(raw);
}

/**
 * Fetch the history of epochs for an entity (most recent first).
 */
export async function fetchEpochHistory(
    entityId?: string,
    limit = 20,
): Promise<EpochSummary[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (entityId) params.set('entity_id', entityId);
    const raw = await apiFetch<unknown>(
        `/api/epoch/history?${params.toString()}`,
        undefined,
        `sp_svc_epoch_history_${entityId ?? 'default'}_${limit}`,
    );

    if (Array.isArray(raw)) return raw.map(normaliseEpochSummary);

    // Backend returns array directly; handle wrapped legacy shapes gracefully
    const obj = raw as Record<string, unknown>;
    const arr = obj?.epochs ?? obj?.proofs ?? [];
    return Array.isArray(arr) ? (arr as Record<string, unknown>[]).map(normaliseEpochSummary) : [];
}

// ---------------------------------------------------------------------------
// User inclusion verification (epoch-aware)
// ---------------------------------------------------------------------------
export async function verifyUserInclusion(
    userId: string,
    epochId?: string,
): Promise<InclusionResult> {
    try {
        const res = await apiFetch<Record<string, unknown>>(
            `/api/liabilities/verify/${encodeURIComponent(userId)}${epochId ? `?epoch_id=${encodeURIComponent(epochId)}` : ''}`,
        );
        return {
            success: true,
            user_id: userId,
            epoch_id: epochId ?? (res.epochId as string) ?? '',
            liability_root: (res.liabilityRoot as string) ?? (res.root as string) ?? '',
            balance: res.balance as number | undefined,
            proof: res.proof as string[] | undefined,
        };
    } catch (err) {
        return {
            success: false,
            user_id: userId,
            epoch_id: epochId ?? '',
            liability_root: '',
            error: err instanceof Error ? err.message : 'Verification failed',
        };
    }
}

// ---------------------------------------------------------------------------
// Admin actions (epoch submission / refresh) — operator console only
// ---------------------------------------------------------------------------
export async function triggerEpochRefresh(): Promise<{ success: boolean; epoch_id?: string; message?: string }> {
    return apiFetch('/api/epoch/refresh', { method: 'POST' });
}

export async function submitEpochToRegistry(epochId: string): Promise<{ success: boolean; tx_id?: string; message?: string }> {
    return apiFetch('/api/epoch/submit', {
        method: 'POST',
        body: JSON.stringify({ epoch_id: epochId }),
    });
}

// ---------------------------------------------------------------------------
// Normalisation helpers — absorb backend field-name variations
// ---------------------------------------------------------------------------
function normaliseEpochState(raw: Record<string, unknown>): EpochState {
    const bundleHash = str(raw.bundle_hash ?? raw.proof_hash ?? raw.proofHash ?? raw.txHash ?? '');
    return {
        entity_id: str(raw.entity_id ?? raw.entityId ?? ''),
        epoch_id: str(raw.epoch_id ?? raw.epochId ?? raw.id ?? ''),
        liability_root: str(raw.liability_root ?? raw.liabilityRoot ?? raw.liabilitiesRoot ?? ''),
        reserve_root: str(raw.reserve_root ?? raw.reserveRoot ?? ''),
        reserve_snapshot_hash: str(raw.reserve_snapshot_hash ?? raw.reserveSnapshotHash ?? ''),
        bundle_hash: bundleHash,
        proof_hash: bundleHash,
        reserves_total: num(raw.reserves_total ?? raw.reservesTotal ?? 0),
        total_liabilities: num(raw.total_liabilities ?? raw.totalLiabilities ?? 0),
        near_term_liabilities_total: num(raw.near_term_liabilities_total ?? raw.nearTermLiabilitiesTotal ?? 0),
        liquid_assets_total: num(raw.liquid_assets_total ?? raw.liquidAssetsTotal ?? 0),
        capital_backed: bool(raw.capital_backed ?? raw.capitalBacked ?? false),
        liquidity_ready: bool(raw.liquidity_ready ?? raw.liquidityReady ?? false),
        health_status: sanitiseHealthStatus(raw.health_status ?? raw.healthStatus),
        timestamp: parseTimestampOrZero(raw.timestamp),
        valid_until: parseTimestampOrZero(raw.valid_until ?? raw.validUntil),
        anchored_at: raw.anchored_at != null ? parseTimestampOrZero(raw.anchored_at) : undefined,
        rule_version_used: raw.rule_version_used != null ? str(raw.rule_version_used) : undefined,
        reason_codes: Array.isArray(raw.reason_codes) ? (raw.reason_codes as string[]) : undefined,
    };
}

function normaliseEpochSummary(raw: Record<string, unknown>): EpochSummary {
    const bundleHash = str(raw.bundle_hash ?? raw.proof_hash ?? raw.proofHash ?? raw.txHash ?? '');
    return {
        entity_id: str(raw.entity_id ?? raw.entityId ?? ''),
        epoch_id: str(raw.epoch_id ?? raw.epochId ?? raw.id ?? ''),
        health_status: sanitiseHealthStatus(raw.health_status ?? raw.healthStatus ?? (raw.verified ? 'HEALTHY' : 'EXPIRED')),
        bundle_hash: bundleHash,
        proof_hash: bundleHash,
        timestamp: parseTimestampOrZero(raw.timestamp),
        valid_until: parseTimestampOrZero(raw.valid_until ?? raw.validUntil),
        capital_backed: bool(raw.capital_backed ?? raw.capitalBacked ?? false),
        liquidity_ready: bool(raw.liquidity_ready ?? raw.liquidityReady ?? false),
        anchored_at: raw.anchored_at != null ? parseTimestampOrZero(raw.anchored_at) : undefined,
    };
}

const VALID_STATUSES = new Set<string>([
    'HEALTHY',
    'LIQUIDITY_STRESSED',
    'UNDERCOLLATERALIZED',
    'CRITICAL',
    'EXPIRED',
]);

function sanitiseHealthStatus(v: unknown): import('@/types/solvency').HealthStatus {
    if (typeof v === 'string' && VALID_STATUSES.has(v.toUpperCase())) {
        return v.toUpperCase() as import('@/types/solvency').HealthStatus;
    }
    return 'EXPIRED';
}

function str(v: unknown): string {
    return v == null ? '' : String(v);
}

function num(v: unknown): number {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
}

/**
 * Parses a raw value as a Unix timestamp (seconds).
 * Accepts both numeric Unix seconds and ISO-8601 strings.
 * Returns 0 when the value is null / undefined / unparseable.
 */
function parseTimestampOrZero(v: unknown): number {
    if (v == null) return 0;
    // Accept numeric Unix timestamp directly
    const n = Number(v);
    if (!isNaN(n)) return n;
    // Attempt ISO string parse
    const d = new Date(String(v)).getTime();
    return isNaN(d) ? 0 : Math.floor(d / 1000);
}

function bool(v: unknown): boolean {
    return Boolean(v);
}
