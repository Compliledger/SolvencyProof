// DataSourceBanner — reusable status strip that shows where epoch data came
// from (live Algorand registry vs. file-based fallback) and whether it is
// currently fresh or expired.
//
// Data source is read from the explicit `data_source` field first.  When that
// field is absent the component falls back to heuristic inference based on
// `source_type` and the presence of `anchored_at`.
//
// Freshness is read from the explicit `is_fresh` / `is_expired` fields first,
// then inferred by comparing `valid_until` against the current time.

import { Database, FileWarning, HelpCircle, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import type { DataSource, FreshnessState } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DataSourceBannerProps {
    /** Explicit data-source classification (preferred over inference). */
    dataSource?: DataSource;
    /**
     * Whether the record is within its validity window.
     * When provided, overrides time-based freshness inference.
     */
    isFresh?: boolean | null;
    /**
     * Whether the record has passed its valid_until timestamp.
     * When provided, overrides time-based freshness inference.
     */
    isExpired?: boolean | null;
    /**
     * Unix timestamp (seconds) when the record was anchored on-chain.
     * Used both for display and as a heuristic to infer LIVE_REGISTRY source.
     */
    anchoredAt?: number;
    /**
     * Backend source_type string (e.g. "on-chain-fallback").
     * Used only when `dataSource` is not explicitly provided.
     */
    sourceType?: string;
    /**
     * Unix epoch (seconds) after which the record is considered expired.
     * Used only when `isFresh` / `isExpired` are not provided.
     */
    validUntil?: number;
    className?: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Derive the effective DataSource value.
 *
 * Priority:
 *  1. Explicit `dataSource` prop
 *  2. Heuristic: `sourceType` contains "fallback" → FALLBACK_LOCAL
 *  3. Heuristic: `anchoredAt` is set             → LIVE_REGISTRY
 *  4. Default                                    → UNKNOWN
 */
function resolveDataSource(
    dataSource: DataSource | undefined,
    sourceType: string | undefined,
    anchoredAt: number | undefined,
): DataSource {
    if (dataSource) return dataSource;
    if (sourceType && sourceType.toLowerCase().includes("fallback")) return "FALLBACK_LOCAL";
    if (anchoredAt !== undefined && anchoredAt > 0) return "LIVE_REGISTRY";
    return "UNKNOWN";
}

/**
 * Derive the effective FreshnessState value.
 *
 * Priority:
 *  1. Explicit `isFresh` / `isExpired` props
 *  2. Computed from `validUntil` vs. current time
 *  3. Default → UNKNOWN
 */
function resolveFreshness(
    isFresh: boolean | null | undefined,
    isExpired: boolean | null | undefined,
    validUntil: number | undefined,
): FreshnessState {
    if (isFresh === true) return "FRESH";
    if (isExpired === true) return "EXPIRED";
    if (validUntil !== undefined) {
        return validUntil > Math.floor(Date.now() / 1000) ? "FRESH" : "EXPIRED";
    }
    return "UNKNOWN";
}

function formatAnchoredAt(unixSeconds: number): string {
    return new Date(unixSeconds * 1000).toLocaleString();
}

// ---------------------------------------------------------------------------
// Badge sub-components
// ---------------------------------------------------------------------------

function SourceBadge({ source }: { source: DataSource }) {
    switch (source) {
        case "LIVE_REGISTRY":
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-blue-500/10 text-blue-400 border-blue-500/20">
                    <Database size={11} />
                    Live Registry
                </span>
            );
        case "FALLBACK_LOCAL":
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
                    <FileWarning size={11} />
                    Fallback / Local
                </span>
            );
        default:
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-muted/20 text-muted-foreground border-border">
                    <HelpCircle size={11} />
                    Unknown Source
                </span>
            );
    }
}

function FreshnessBadge({ state }: { state: FreshnessState }) {
    switch (state) {
        case "FRESH":
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-green-500/10 text-green-400 border-green-500/20">
                    <CheckCircle2 size={11} />
                    Fresh
                </span>
            );
        case "EXPIRED":
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-destructive/10 text-destructive border-destructive/20">
                    <AlertCircle size={11} />
                    Expired
                </span>
            );
        default:
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-muted/20 text-muted-foreground border-border">
                    <HelpCircle size={11} />
                    Unknown Freshness
                </span>
            );
    }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DataSourceBanner({
    dataSource,
    isFresh,
    isExpired,
    anchoredAt,
    sourceType,
    validUntil,
    className = "",
}: DataSourceBannerProps) {
    const resolvedSource = resolveDataSource(dataSource, sourceType, anchoredAt);
    const resolvedFreshness = resolveFreshness(isFresh, isExpired, validUntil);

    return (
        <div
            className={`flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg border bg-card/40 border-border text-xs ${className}`}
            role="status"
            aria-label="Data source and freshness status"
        >
            <span className="text-muted-foreground font-medium uppercase tracking-wider mr-1">
                Data Source
            </span>
            <SourceBadge source={resolvedSource} />
            <FreshnessBadge state={resolvedFreshness} />
            {anchoredAt !== undefined && anchoredAt > 0 && (
                <span className="flex items-center gap-1 text-muted-foreground ml-auto">
                    <Clock size={11} />
                    Anchored on-chain:{" "}
                    <span className="font-mono">{formatAnchoredAt(anchoredAt)}</span>
                </span>
            )}
        </div>
    );
}
