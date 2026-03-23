// Mock data helpers for development and testing
//
// Use these functions when the backend or Algorand registry is unavailable,
// e.g. during local development or Storybook rendering.
// Do NOT use mock functions in production code paths.

import type {
    SolvencyEpochState,
    EpochHistoryItem,
    UserInclusionResult,
    HealthStatus,
} from "../types";

const DEFAULT_ENTITY_ID = "demo-exchange";

// Users that are considered "included" in the mock liability tree
const MOCK_INCLUDED_USERS = new Set(["alice", "bob", "charlie", "dave"]);

// ---------------------------------------------------------------------------
// Epoch state mocks
// ---------------------------------------------------------------------------

/**
 * Return a mock `SolvencyEpochState` for the given entity.
 */
export function getMockLatestEpoch(entityId?: string): Promise<SolvencyEpochState> {
    const now = Math.floor(Date.now() / 1000);
    const epoch: SolvencyEpochState = {
        entity_id: entityId ?? DEFAULT_ENTITY_ID,
        epoch_id: 42,
        liability_root:
            "0xabc123def456abc123def456abc123def456abc123def456abc123def456abc1",
        reserve_root:
            "0xdef456abc123def456abc123def456abc123def456abc123def456abc123def4",
        reserve_snapshot_hash:
            "0x789abcdef012789abcdef012789abcdef012789abcdef012789abcdef01278ff",
        proof_hash:
            "0x111222333444555666777888999aaabbbcccdddeeefff000111222333444abc0",
        reserves_total: 1_500_000,
        total_liabilities: 1_200_000,
        near_term_liabilities_total: 800_000,
        liquid_assets_total: 1_100_000,
        capital_backed: true,
        liquidity_ready: true,
        health_status: "HEALTHY",
        timestamp: now - 3600,
        valid_until: now + 82800, // ~23 hours from now
        adapter_version: "1.0.0",
        source_type: "mock",
    };
    return Promise.resolve(epoch);
}

/**
 * Return mock epoch history (5 epochs) for the given entity.
 */
export function getMockEpochHistory(entityId?: string): Promise<EpochHistoryItem[]> {
    const now = Math.floor(Date.now() / 1000);
    const statuses: HealthStatus[] = [
        "HEALTHY",
        "HEALTHY",
        "LIQUIDITY_STRESSED",
        "HEALTHY",
        "HEALTHY",
    ];

    const history: EpochHistoryItem[] = Array.from({ length: 5 }, (_, i) => {
        const idx = String(i).padStart(2, "0");
        const fill = "0".repeat(54);
        return {
            entity_id: entityId ?? DEFAULT_ENTITY_ID,
            epoch_id: 42 - i,
            liability_root: `0xabc${idx}def456${fill}`,
            proof_hash: `0x789${idx}abcdef${fill}`,
            reserves_total: 1_500_000 - i * 15_000,
            total_liabilities: 1_200_000 - i * 5_000,
            near_term_liabilities_total: 800_000,
            liquid_assets_total: 1_100_000 - i * 10_000,
            capital_backed: true,
            liquidity_ready: i !== 2,
            health_status: statuses[i] ?? "HEALTHY",
            timestamp: now - i * 86400,
            valid_until: now - i * 86400 + 86400,
            adapter_version: "1.0.0",
            source_type: "mock",
        };
    });

    return Promise.resolve(history);
}

// ---------------------------------------------------------------------------
// User inclusion mocks
// ---------------------------------------------------------------------------

/**
 * Return a mock `UserInclusionResult` for the given user ID.
 */
export function getMockUserInclusion(
    userId: string,
    entityId?: string,
    epochId = 42
): Promise<UserInclusionResult> {
    const included = MOCK_INCLUDED_USERS.has(userId.toLowerCase());
    const result: UserInclusionResult = {
        entity_id: entityId ?? DEFAULT_ENTITY_ID,
        epoch_id: epochId,
        liability_root:
            "0xabc123def456abc123def456abc123def456abc123def456abc123def456abc1",
        included,
        checked_at: Math.floor(Date.now() / 1000),
    };
    return Promise.resolve(result);
}

// ---------------------------------------------------------------------------
// Convenience: list of mock user IDs for UI demo purposes
// ---------------------------------------------------------------------------

/** User IDs that are included in the mock liability tree. */
export const MOCK_USER_IDS: string[] = [...MOCK_INCLUDED_USERS];
