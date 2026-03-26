/**
 * algorand/types/registry.ts
 *
 * Shared type definitions for the Algorand Solvent Registry.
 * These types are used by both the registry client and the adapter layer.
 *
 * Field names mirror the canonical epoch object produced by the SolvencyProof backend
 * and the payload emitted by toAlgorandSolventRegistryPayload().
 */
// ============================================================
// HEALTH STATUS ENUM
// ============================================================
/**
 * Numeric health-status codes stored on-chain.
 *
 * 0 = UNKNOWN           – state has not been evaluated / initialised
 * 1 = HEALTHY           – capital backing + liquidity readiness both satisfied
 * 2 = LIQUIDITY_STRESSED – capital backing OK, but liquid assets < near-term obligations
 * 3 = UNDERCOLLATERALIZED – reserves < total liabilities
 * 4 = CRITICAL          – both capital backing and liquidity readiness have failed
 * 5 = EXPIRED           – valid_until window has passed without renewal
 */
export var HealthStatus;
(function (HealthStatus) {
    HealthStatus[HealthStatus["UNKNOWN"] = 0] = "UNKNOWN";
    HealthStatus[HealthStatus["HEALTHY"] = 1] = "HEALTHY";
    HealthStatus[HealthStatus["LIQUIDITY_STRESSED"] = 2] = "LIQUIDITY_STRESSED";
    HealthStatus[HealthStatus["UNDERCOLLATERALIZED"] = 3] = "UNDERCOLLATERALIZED";
    HealthStatus[HealthStatus["CRITICAL"] = 4] = "CRITICAL";
    HealthStatus[HealthStatus["EXPIRED"] = 5] = "EXPIRED";
})(HealthStatus || (HealthStatus = {}));
/** Maps the string health_status in canonical epoch objects to the on-chain numeric value. */
export const HEALTH_STATUS_STRING_MAP = {
    UNKNOWN: HealthStatus.UNKNOWN,
    HEALTHY: HealthStatus.HEALTHY,
    LIQUIDITY_STRESSED: HealthStatus.LIQUIDITY_STRESSED,
    UNDERCOLLATERALIZED: HealthStatus.UNDERCOLLATERALIZED,
    CRITICAL: HealthStatus.CRITICAL,
    EXPIRED: HealthStatus.EXPIRED,
};
// ============================================================
// SCALE FACTOR
// ============================================================
/**
 * Monetary amounts in the canonical epoch object are floating-point USD values.
 * The on-chain contract stores them as uint64 integers scaled by AMOUNT_SCALE to
 * preserve 6 decimal places of precision without floating-point arithmetic.
 *
 * e.g. 12_500_000.00 USD  →  12_500_000_000_000 (12.5 trillion micro-units)
 */
export const AMOUNT_SCALE = 1000000n;
// ============================================================
// BOX ENCODING CONSTANTS  (kept in sync with the PyTeal contract)
// ============================================================
/**
 * Prefix used in every box key. Kept here so the client and contract share
 * the exact same key derivation logic.
 */
export const BOX_KEY_ENTITY_PREFIX = "entity:";
export const BOX_KEY_LATEST_SUFFIX = ":latest";
export const BOX_KEY_EPOCH_INFIX = ":epoch:";
export function makeLatestBoxKey(entityId) {
    return new TextEncoder().encode(`${BOX_KEY_ENTITY_PREFIX}${entityId}${BOX_KEY_LATEST_SUFFIX}`);
}
export function makeEpochBoxKey(entityId, epochId) {
    return new TextEncoder().encode(`${BOX_KEY_ENTITY_PREFIX}${entityId}${BOX_KEY_EPOCH_INFIX}${epochId}`);
}
