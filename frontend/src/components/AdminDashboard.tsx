// Admin Console — shows the latest backend-generated epoch state plus
// capital backing / liquidity / health status, proof hashes, and optional
// operator actions (refresh, submit to registry).
//
// This component is a CONSUMER of the backend service layer and MUST NOT
// perform any solvency or liquidity calculations itself.

import { useState, useEffect, useCallback } from "react";
import SpotlightCard from "@/components/reactbits/SpotlightCard";
import {
    Shield,
    RefreshCw,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Clock,
    Hash,
    Send,
    Loader2,
    Activity,
    Tag,
} from "lucide-react";
import { getLatestEpoch, triggerRefresh, submitToRegistry } from "@/lib/api/backend";
import type { SolvencyEpochState, HealthStatus } from "@/lib/types";
import { buildAnchorFallback } from "@/lib/types";
import { DataSourceBanner } from "@/components/DataSourceBanner";
import { ReasonCodesList, AnchorMetadataCard } from "@/components/solvency";
import { CapitalStateCard, LiquidityStateCard } from "@/components/solvency";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function healthColor(status: HealthStatus): string {
    switch (status) {
        case "HEALTHY":
            return "text-success";
        case "LIQUIDITY_STRESSED":
            return "text-yellow-500";
        case "UNDERCOLLATERALIZED":
        case "CRITICAL":
            return "text-destructive";
        case "EXPIRED":
        default:
            return "text-muted-foreground";
    }
}

function healthBg(status: HealthStatus): string {
    switch (status) {
        case "HEALTHY":
            return "bg-success/10 border-success/20";
        case "LIQUIDITY_STRESSED":
            return "bg-yellow-500/10 border-yellow-500/20";
        case "UNDERCOLLATERALIZED":
        case "CRITICAL":
            return "bg-destructive/10 border-destructive/20";
        case "EXPIRED":
        default:
            return "bg-muted/10 border-muted/20";
    }
}

function HealthIcon({ status }: { status: HealthStatus }) {
    switch (status) {
        case "HEALTHY":
            return <CheckCircle2 size={20} className="text-success" />;
        case "LIQUIDITY_STRESSED":
            return <AlertTriangle size={20} className="text-yellow-500" />;
        case "UNDERCOLLATERALIZED":
        case "CRITICAL":
            return <XCircle size={20} className="text-destructive" />;
        default:
            return <Clock size={20} className="text-muted-foreground" />;
    }
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
    return (
        <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                ok
                    ? "bg-success/10 text-success border-success/20"
                    : "bg-destructive/10 text-destructive border-destructive/20"
            }`}
        >
            {ok ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
            {label}
        </span>
    );
}

function HashRow({ label, value }: { label: string; value?: string }) {
    if (!value) return null;
    return (
        <div className="flex flex-col gap-0.5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className="font-mono text-xs break-all text-foreground/80">{value}</p>
        </div>
    );
}

function timeAgo(seconds: number): string {
    const diff = Math.floor(Date.now() / 1000) - seconds;
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

function expiresIn(validUntil: number): string {
    const diff = validUntil - Math.floor(Date.now() / 1000);
    if (diff <= 0) return "Expired";
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface AdminDashboardProps {
    /** Entity to display; when omitted the backend default entity is used. */
    entityId?: string;
}

export default function AdminDashboard({ entityId }: AdminDashboardProps) {
    const [epoch, setEpoch] = useState<SolvencyEpochState | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<"refresh" | "submit" | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [actionMsg, setActionMsg] = useState<string | null>(null);

    const fetchEpoch = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getLatestEpoch(entityId);
            setEpoch(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load epoch state");
        } finally {
            setLoading(false);
        }
    }, [entityId]);

    useEffect(() => {
        fetchEpoch();
    }, [fetchEpoch]);

    const handleRefresh = async () => {
        setActionLoading("refresh");
        setActionMsg(null);
        try {
            await triggerRefresh();
            setActionMsg("Refresh triggered — reloading state…");
            await fetchEpoch();
        } catch (e) {
            setActionMsg(
                `Refresh failed: ${e instanceof Error ? e.message : "Unknown error"}`
            );
        } finally {
            setActionLoading(null);
        }
    };

    const handleSubmit = async () => {
        setActionLoading("submit");
        setActionMsg(null);
        try {
            const res = await submitToRegistry();
            setActionMsg(
                res.txHash
                    ? `Submitted — tx: ${res.txHash}`
                    : "Submission complete"
            );
            await fetchEpoch();
        } catch (e) {
            setActionMsg(
                `Submission failed: ${e instanceof Error ? e.message : "Unknown error"}`
            );
        } finally {
            setActionLoading(null);
        }
    };

    // ------ Loading ------
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[40vh]">
                <div className="text-center space-y-4">
                    <Loader2 size={40} className="animate-spin mx-auto text-accent" />
                    <p className="text-muted-foreground text-sm">Loading epoch state…</p>
                </div>
            </div>
        );
    }

    // ------ Error ------
    if (error || !epoch) {
        return (
            <div className="max-w-2xl mx-auto p-6 rounded-xl border border-destructive/30 bg-destructive/5 text-center space-y-3">
                <XCircle size={32} className="mx-auto text-destructive" />
                <p className="font-medium text-destructive">Unable to load epoch state</p>
                <p className="text-sm text-muted-foreground">{error ?? "No data available"}</p>
                <button onClick={fetchEpoch} className="btn-secondary text-sm">
                    <RefreshCw size={14} />
                    Retry
                </button>
            </div>
        );
    }

    const isExpired = epoch.valid_until < Math.floor(Date.now() / 1000);
    const bundleHash = epoch.bundle_hash ?? epoch.proof_hash;

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 animate-fade-in">
                <div className="space-y-1">
                    <h1 className="font-display text-3xl font-semibold flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-accent/10 border border-accent/20">
                            <Shield size={26} className="text-accent" />
                        </div>
                        Admin Console
                    </h1>
                    <p className="text-muted-foreground">
                        Latest epoch state for{" "}
                        <span className="font-mono text-foreground">{epoch.entity_id}</span>
                        {epoch.rule_version_used && (
                            <span className="ml-2 text-xs px-2 py-0.5 rounded bg-secondary/60 border border-border font-mono">
                                Rule v{epoch.rule_version_used}
                            </span>
                        )}
                    </p>
                </div>

                {/* Operator actions */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleRefresh}
                        disabled={actionLoading !== null}
                        className="btn-secondary text-sm disabled:opacity-50"
                    >
                        {actionLoading === "refresh" ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <RefreshCw size={14} />
                        )}
                        Refresh
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={actionLoading !== null}
                        className="btn-primary text-sm disabled:opacity-50"
                    >
                        {actionLoading === "submit" ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <Send size={14} />
                        )}
                        Submit to Registry
                    </button>
                </div>
            </div>

            {/* Action feedback */}
            {actionMsg && (
                <p className="text-sm px-4 py-2 rounded-lg bg-accent/10 border border-accent/20 text-accent">
                    {actionMsg}
                </p>
            )}

            {/* Data source + freshness banner */}
            <DataSourceBanner
                dataSource={epoch.data_source}
                isFresh={epoch.is_fresh}
                isExpired={epoch.is_expired}
                anchoredAt={epoch.anchored_at ?? epoch.anchor_metadata?.anchored_at}
                sourceType={epoch.source_type}
                validUntil={epoch.valid_until}
                className="animate-fade-in"
            />

            {/* Health status banner */}
            <SpotlightCard
                spotlightColor="rgba(74,222,128,0.1)"
                className={`border ${healthBg(epoch.health_status)} animate-fade-in`}
            >
                <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${healthBg(epoch.health_status)}`}>
                            <HealthIcon status={epoch.health_status} />
                        </div>
                        <div>
                            <p className={`text-2xl font-bold ${healthColor(epoch.health_status)}`}>
                                {epoch.health_status}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Epoch #{epoch.epoch_id} · {timeAgo(epoch.timestamp)}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <StatusPill ok={epoch.capital_backed} label="Capital Backed" />
                        <StatusPill ok={epoch.liquidity_ready} label="Liquidity Ready" />
                        <StatusPill ok={!isExpired} label={isExpired ? "Expired" : `Valid (${expiresIn(epoch.valid_until)})`} />
                    </div>
                </div>
            </SpotlightCard>

            {/* Capital & Liquidity cards */}
            <div className="grid md:grid-cols-2 gap-4 animate-fade-in">
                <CapitalStateCard
                    reservesTotal={Number(epoch.reserves_total)}
                    totalLiabilities={Number(epoch.total_liabilities ?? 0)}
                    capitalBacked={epoch.capital_backed}
                />
                <LiquidityStateCard
                    liquidAssetsTotal={Number(epoch.liquid_assets_total)}
                    nearTermLiabilitiesTotal={Number(epoch.near_term_liabilities_total)}
                    liquidityReady={epoch.liquidity_ready}
                />
            </div>

            {/* Reason codes */}
            {(epoch.reason_codes && epoch.reason_codes.length > 0) && (
                <div className="rounded-xl border border-border bg-card/50 p-6 space-y-3 animate-fade-in">
                    <h2 className="font-display font-medium flex items-center gap-2">
                        <Tag size={16} className="text-accent" />
                        Reason Codes
                    </h2>
                    <ReasonCodesList codes={epoch.reason_codes} />
                </div>
            )}

            {/* Bundle hash + commitment hashes */}
            <div className="rounded-xl border border-border bg-card/50 p-6 space-y-4 animate-fade-in">
                <h2 className="font-display font-medium flex items-center gap-2">
                    <Hash size={16} className="text-accent" />
                    Bundle Hash &amp; Commitments
                </h2>
                <div className="space-y-3 divide-y divide-border">
                    <HashRow label="Bundle Hash" value={bundleHash} />
                    <div className="pt-3">
                        <HashRow label="Liability Root" value={epoch.liability_root} />
                    </div>
                    {epoch.reserve_root && (
                        <div className="pt-3">
                            <HashRow label="Reserve Root" value={epoch.reserve_root} />
                        </div>
                    )}
                    {epoch.reserve_snapshot_hash && (
                        <div className="pt-3">
                            <HashRow label="Reserve Snapshot Hash" value={epoch.reserve_snapshot_hash} />
                        </div>
                    )}
                </div>
            </div>

            {/* Anchor metadata */}
            <div className="animate-fade-in">
                <h2 className="font-display font-medium flex items-center gap-2 mb-3">
                    <Activity size={16} className="text-muted-foreground" />
                    Algorand Anchor
                </h2>
                <AnchorMetadataCard anchor={epoch.anchor_metadata ?? buildAnchorFallback(epoch.anchored_at)} />
            </div>

            {/* Metadata */}
            <div className="rounded-xl border border-border bg-card/50 p-6 animate-fade-in">
                <h2 className="font-display font-medium flex items-center gap-2 mb-4">
                    <Activity size={16} className="text-muted-foreground" />
                    Metadata
                </h2>
                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                        <dt className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                            Entity
                        </dt>
                        <dd className="font-mono">{epoch.entity_id}</dd>
                    </div>
                    <div>
                        <dt className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                            Epoch ID
                        </dt>
                        <dd className="font-mono">#{epoch.epoch_id}</dd>
                    </div>
                    <div>
                        <dt className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                            Recorded
                        </dt>
                        <dd>{new Date(epoch.timestamp * 1000).toLocaleString()}</dd>
                    </div>
                    <div>
                        <dt className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                            Valid Until
                        </dt>
                        <dd className={isExpired ? "text-destructive" : ""}>
                            {new Date(epoch.valid_until * 1000).toLocaleString()}
                        </dd>
                    </div>
                    {epoch.rule_version_used && (
                        <div>
                            <dt className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                                Rule Version
                            </dt>
                            <dd className="font-mono">{epoch.rule_version_used}</dd>
                        </div>
                    )}
                    {epoch.adapter_version && !epoch.rule_version_used && (
                        <div>
                            <dt className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                                Adapter Version
                            </dt>
                            <dd>{epoch.adapter_version}</dd>
                        </div>
                    )}
                    {epoch.anchored_at !== undefined && (
                        <div>
                            <dt className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                                Anchored On-Chain
                            </dt>
                            <dd>{new Date(epoch.anchored_at * 1000).toLocaleString()}</dd>
                        </div>
                    )}
                    {epoch.source_type && (
                        <div>
                            <dt className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                                Data Source
                            </dt>
                            <dd className="capitalize">{epoch.source_type.replace(/-/g, ' ')}</dd>
                        </div>
                    )}
                </dl>
            </div>
        </div>
    );
}
