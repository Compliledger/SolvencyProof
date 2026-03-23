import { useState } from 'react';

const BASE_URL = 'https://solvency-proof-production.up.railway.app';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Cache keys
const CACHE_KEYS = {
    HEALTH: 'solvency_health',
    LIABILITIES: 'solvency_liabilities',
    RESERVES: 'solvency_reserves',
    EPOCH_COUNT: 'solvency_epoch_count',
    YELLOW_STATUS: 'solvency_yellow_status',
    YELLOW_SESSIONS: 'solvency_yellow_sessions',
};

// Cache helpers
function getCache<T>(key: string): T | null {
    try {
        const cached = localStorage.getItem(key);
        if (!cached) return null;
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp > CACHE_DURATION) {
            localStorage.removeItem(key);
            return null;
        }
        console.log(`[CACHE HIT] ${key}`);
        return data;
    } catch {
        return null;
    }
}

function setCache<T>(key: string, data: T): void {
    try {
        localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
        console.log(`[CACHE SET] ${key}`);
    } catch (e) {
        console.warn('[CACHE] Failed to set:', e);
    }
}

export function clearSolvencyCache(): void {
    Object.values(CACHE_KEYS).forEach(key => localStorage.removeItem(key));
    console.log('[CACHE] Cleared all solvency cache');
}

export function useSolvencyProof() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const api = async <T>(endpoint: string, options?: RequestInit, cacheKey?: string): Promise<T> => {
        // Check cache first for GET requests
        if (!options?.method || options.method === 'GET') {
            if (cacheKey) {
                const cached = getCache<T>(cacheKey);
                if (cached) return cached;
            }
        }

        setLoading(true);
        setError(null);
        const startTime = Date.now();

        console.log(`[API] ${options?.method || 'GET'} ${endpoint}`);

        try {
            const res = await fetch(`${BASE_URL}${endpoint}`, {
                headers: { 'Content-Type': 'application/json' },
                ...options
            });

            const data = await res.json();

            if (!res.ok) {
                console.error(`[API ERROR] ${endpoint} - ${res.status} (${Date.now() - startTime}ms)`, data);
                throw new Error(data.error || data.message || `HTTP ${res.status}`);
            }

            console.log(`[API OK] ${endpoint} (${Date.now() - startTime}ms)`, data);

            // Cache successful GET responses
            if (cacheKey && (!options?.method || options.method === 'GET')) {
                setCache(cacheKey, data);
            }

            return data;
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Unknown error';
            setError(msg);
            throw e;
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        error,

        // Health
        getHealth: () => api<{ status: string; timestamp: string }>('/health', undefined, CACHE_KEYS.HEALTH),

        // Liabilities
        getLiabilities: () => api<{
            root: string;
            epochId: string;
            leafCount: number;
            timestamp: number;
            tree: any;
        }>('/api/liabilities', undefined, CACHE_KEYS.LIABILITIES),

        buildMerkleTree: () => api<{
            success: boolean;
            root: string;
            totalLiabilities: number;
            userCount: number;
        }>('/api/liabilities/build', { method: 'POST' }),

        verifyInclusion: (userId: string) => api<{
            success: boolean;
            userId: string;
            proof: string[];
            balance: number;
        }>(`/api/liabilities/verify/${encodeURIComponent(userId)}`),

        // Reserves
        getReserves: () => api<{
            epoch_id: string;
            timestamp: number;
            chain: string;
            chain_id: number;
            addresses: Array<{ address: string; balance: string; balanceWei: string }>;
            total_wei?: string;
            total_eth?: string;
        }>('/api/reserves', undefined, CACHE_KEYS.RESERVES),

        scanReserves: () => api<{
            success: boolean;
            snapshot: { epoch_id: number; reserves_total_wei: string; chain: string };
        }>('/api/reserves/scan', { method: 'POST' }),

        // Proof
        generateProof: () => api<{
            success: boolean;
            proof: any;
            publicSignals: string[];
            isSolvent: boolean;
        }>('/api/proof/generate', { method: 'POST' }),

        submitProof: () => api<{
            success: boolean;
            txHash: string;
            blockNumber: number;
            epochId: string;
        }>('/api/proof/submit', { method: 'POST' }),

        // Contracts
        getEpochCount: () => api<{
            success: boolean;
            epochCount: number;
        }>('/api/contracts/epoch-count', undefined, CACHE_KEYS.EPOCH_COUNT),

        getOnChainProof: (epochId: number) => api<{
            success: boolean;
            epochId: string;
            liabilitiesRoot: string;
            reservesTotal: string;
            timestamp: number;
            verified: boolean;
        }>(`/api/contracts/proof/${epochId}`),

        // Yellow Network
        getYellowStatus: () => api<{
            connected: boolean;
            authenticated: boolean;
            sessionsCount: number;
        }>('/api/yellow/status', undefined, CACHE_KEYS.YELLOW_STATUS),

        getYellowSessions: () => api<{
            success: boolean;
            sessions: Array<{
                id: string;
                status: string;
                participants: string[];
                allocations: Record<string, string>;
                createdAt?: string;
            }>;
        }>('/api/yellow/sessions', undefined, CACHE_KEYS.YELLOW_SESSIONS),

        createYellowSession: (participants: string[]) => api<{
            success: boolean;
            session: {
                id: string;
                status: string;
                participants: string[];
                allocations: Record<string, string>;
            };
        }>('/api/yellow/session', {
            method: 'POST',
            body: JSON.stringify({ participants })
        }),

        updateAllocations: (sessionId: string, allocations: Record<string, string>) => api<{
            success: boolean;
        }>(`/api/yellow/session/${sessionId}/allocations`, {
            method: 'PUT',
            body: JSON.stringify({ allocations })
        }),

        // Full Workflow
        runFullWorkflow: (skipProof = false) => api<{
            success: boolean;
            steps: Record<string, string>;
            txHash?: string;
        }>('/api/workflow/full', {
            method: 'POST',
            body: JSON.stringify({ skipProof })
        }),
    };
}
