import type { EpochConfig } from "../types/inputs.js";
import type { EpochMetadata } from "../types/epoch.js";

const DEFAULT_GRANULARITY_MS = 3_600_000; // 1 hour
const DEFAULT_FRESHNESS_WINDOW_MS = 3_600_000; // 1 hour

/**
 * Returns the numeric epoch_id for a given timestamp and granularity.
 * epoch_id = Math.floor(timestamp_ms / granularity_ms)
 *
 * This produces a stable, auto-incrementing integer that advances once per
 * granularity window regardless of how many times the engine runs.
 */
export function getCurrentEpochId(config?: EpochConfig): number {
  const granularity = config?.granularity_ms ?? DEFAULT_GRANULARITY_MS;
  return Math.floor(Date.now() / granularity);
}

/**
 * Builds a complete EpochMetadata object for the current moment.
 *
 * - epoch_id is derived from the current timestamp
 * - timestamp is the Unix timestamp in seconds at the time of generation
 * - valid_until is timestamp + freshness_window_ms / 1000
 */
export function buildEpochMetadata(config?: EpochConfig): EpochMetadata {
  const granularity = config?.granularity_ms ?? DEFAULT_GRANULARITY_MS;
  const freshness = config?.freshness_window_ms ?? DEFAULT_FRESHNESS_WINDOW_MS;

  const now_ms = Date.now();
  const epoch_id = Math.floor(now_ms / granularity);
  const timestamp = Math.floor(now_ms / 1000);
  const valid_until = timestamp + Math.floor(freshness / 1000);

  return { epoch_id, timestamp, valid_until };
}

/**
 * Returns the current epoch metadata (alias for discoverability).
 */
export function getCurrentEpoch(config?: EpochConfig): EpochMetadata {
  return buildEpochMetadata(config);
}
