// Public Dashboard — lets anyone query an entity's solvency health, view
// freshness / expiration, browse epoch history, and inspect proof metadata.
//
// This component is READ-ONLY and consumes registry-backed epoch state from
// the backend service layer.  It MUST NOT perform any solvency calculations.

import { useState, useCallback } from "react";
import SpotlightCard from "@/components/reactbits/SpotlightCard";
import {
    Search,
    Shield,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Clock,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    Hash,
    Loader2,
    History,
    Tag,
} from "lucide-react";
import { getLatestEpoch, getEpochHistory } from "@/lib/api/backend";
import type { SolvencyEpochState, EpochHistoryItem, HealthStatus } from "@/lib/types";
import { DataSourceBanner } from "@/components/DataSourceBanner";
import { ReasonCodesList, AnchorMetadataCard } from "@/components/solvency";

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

function expiresLabel(validUntil: number): string {
    const diff = validUntil - Math.floor(Date.now() / 1000);
    if (diff <= 0) return "Expired";
    if (diff < 3600) return `Expires in ${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `Expires in ${Math.floor(diff / 3600)}h`;
    return `Expires in ${Math.floor(diff / 86400)}d`;
}

function formatTs(seconds: number): string {
    return new Date(seconds * 1000).toLocaleString();
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FreshnessBar({ timestamp, validUntil }: { timestamp: number; validUntil: number }) {
    const now = Math.floor(Date.now() / 1000);
    const total = validUntil - timestamp;
    const elapsed = now - timestamp;
    const pct = total > 0 ? Math.max(0, Math.min(100, (elapsed / total) * 100)) : 100;
    const isExpired = now > validUntil;

    return (
        <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
                <span>{isExpired ? "Expired" : "Freshness"}</span>
                <span>{isExpired ? "—" : expiresLabel(validUntil)}</span>
            </div>
            <div className="h-2 rounded-full bg-secondary/50 overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all ${
                        isExpired
                            ? "bg-destructive"
                            : pct > 75
                            ? "bg-yellow-500"
                            : "bg-success"
                    }`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}

function HistoryRow({
    item,
    index,
}: {
    item: EpochHistoryItem;
    index: number;
}) {
    const [expanded, setExpanded] = useState(false);
    const isExpired = item.valid_until < Math.floor(Date.now() / 1000);

    return (
        <div
            className={`rounded-lg border transition-colors ${
                index === 0 ? "border-accent/30 bg-accent/5" : "border-border bg-card/30"
            }`}
        >
            <button
                className="w-full flex items-center justify-between p-4 text-left"
                onClick={() => setExpanded((v) => !v)}
            >
                <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-medium">
                        #{item.epoch_id}
                    </span>
                    <span
                        className={`text-xs font-medium ${healthColor(item.health_status)}`}
                    >
                        {item.health_status}
                    </span>
                    {isExpired && (
                        <span className="text-xs text-muted-foreground">(expired)</span>
                    )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{formatTs(item.timestamp)}</span>
                    {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
            </button>

            {expanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-border pt-3 text-sm">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                                Reserves
                            </p>
                            <p>{Number(item.reserves_total).toLocaleString()}</p>
                        </div>
                        {item.total_liabilities !== undefined && (
                            <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                                    Liabilities
                                </p>
                                <p>{Number(item.total_liabilities).toLocaleString()}</p>
                            </div>
                        )}
                        <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                                Capital Backed
                            </p>
                            <p className={item.capital_backed ? "text-success" : "text-destructive"}>
                                {item.capital_backed ? "Yes" : "No"}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                                Liquidity Ready
                            </p>
                            <p className={item.liquidity_ready ? "text-success" : "text-yellow-500"}>
                                {item.liquidity_ready ? "Yes" : "No"}
                            </p>
                        </div>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                            Proof Hash
                        </p>
                        <p className="font-mono text-xs break-all">{item.proof_hash}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                            Liability Root
                        </p>
                        <p className="font-mono text-xs break-all">{item.liability_root}</p>
                    </div>
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PublicDashboard() {
    const [query, setQuery] = useState("");
    const [entityId, setEntityId] = useState<string | null>(null);
    const [epoch, setEpoch] = useState<SolvencyEpochState | null>(null);
    const [history, setHistory] = useState<EpochHistoryItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = useCallback(async (target: string) => {
        if (!target.trim()) return;

        setLoading(true);
        setError(null);
        setEpoch(null);
        setHistory([]);
        setEntityId(target.trim());

        try {
            const data = await getLatestEpoch(target.trim());
            setEpoch(data);

            // Fetch history in the background
            setHistoryLoading(true);
            getEpochHistory(target.trim())
                .then(setHistory)
                .catch(() => setHistory([]))
                .finally(() => setHistoryLoading(false));
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to fetch entity state");
        } finally {
            setLoading(false);
        }
    }, []);

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="space-y-2 animate-fade-in">
                <h1 className="font-display text-3xl font-semibold flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-success/10 border border-success/20">
                        <Shield size={26} className="text-success" />
                    </div>
                    Public Solvency Dashboard
                </h1>
                <p className="text-muted-foreground">
                    Query any entity to view its live registry-backed solvency health, proof
                    metadata, and epoch history anchored on Algorand Testnet.
                </p>
            </div>

            {/* Search */}
            <SpotlightCard
                spotlightColor="rgba(74,222,128,0.1)"
                className="bg-card/80 border-border animate-fade-in"
            >
                <div className="p-6">
                    <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
                        Entity ID
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSearch(query)}
                            placeholder="e.g. demo-exchange"
                            className="flex-1 h-12 px-4 rounded-lg border border-border bg-secondary/30 text-foreground focus:outline-none focus:ring-2 focus:ring-success/30 focus:border-success/50 transition-all"
                        />
                        <button
                            onClick={() => handleSearch(query)}
                            disabled={!query.trim() || loading}
                            className="btn-primary h-12 px-5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <Search size={16} />
                            )}
                            Search
                        </button>
                    </div>
                </div>
            </SpotlightCard>

            {/* Error */}
            {error && (
                <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 flex items-center gap-3 text-sm animate-fade-in">
                    <XCircle size={18} className="text-destructive shrink-0" />
                    <p className="text-destructive">{error}</p>
                    <button
                        onClick={() => handleSearch(entityId ?? "")}
                        className="ml-auto btn-secondary text-xs"
                    >
                        <RefreshCw size={12} />
                        Retry
                    </button>
                </div>
            )}

            {/* Result */}
            {epoch && (
                <div className="space-y-6 animate-fade-in">
                    {/* Health status card */}
                    <SpotlightCard
                        spotlightColor="rgba(74,222,128,0.1)"
                        className={`border ${healthBg(epoch.health_status)}`}
                    >
                        <div className="p-6 space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div
                                        className={`w-12 h-12 rounded-full flex items-center justify-center ${healthBg(epoch.health_status)}`}
                                    >
                                        <HealthIcon status={epoch.health_status} />
                                    </div>
                                    <div>
                                        <p
                                            className={`text-2xl font-bold ${healthColor(epoch.health_status)}`}
                                        >
                                            {epoch.health_status}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {epoch.entity_id} · Epoch #{epoch.epoch_id}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleSearch(entityId ?? "")}
                                    className="btn-secondary text-sm self-start sm:self-auto"
                                >
                                    <RefreshCw size={14} />
                                    Refresh
                                </button>
                            </div>

                            <FreshnessBar
                                timestamp={epoch.timestamp}
                                validUntil={epoch.valid_until}
                            />

                            <DataSourceBanner
                                dataSource={epoch.data_source}
                                isFresh={epoch.is_fresh}
                                isExpired={epoch.is_expired}
                                anchoredAt={epoch.anchored_at}
                                sourceType={epoch.source_type}
                                validUntil={epoch.valid_until}
                            />

                            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                                <div>
                                    <dt className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                                        Capital Backed
                                    </dt>
                                    <dd
                                        className={
                                            epoch.capital_backed ? "text-success font-medium" : "text-destructive font-medium"
                                        }
                                    >
                                        {epoch.capital_backed ? "Yes" : "No"}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                                        Liquidity Ready
                                    </dt>
                                    <dd
                                        className={
                                            epoch.liquidity_ready ? "text-success font-medium" : "text-yellow-500 font-medium"
                                        }
                                    >
                                        {epoch.liquidity_ready ? "Yes" : "No"}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                                        Recorded
                                    </dt>
                                    <dd>{formatTs(epoch.timestamp)}</dd>
                                </div>
                            </dl>
                        </div>
                    </SpotlightCard>

                    {/* Proof metadata */}
                    <div className="rounded-xl border border-border bg-card/50 p-6 space-y-3 animate-fade-in">
                        <h2 className="font-display font-medium flex items-center gap-2">
                            <Hash size={16} className="text-accent" />
                            Proof Metadata
                        </h2>
                        <div className="space-y-3 divide-y divide-border text-sm">
                            <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                                    Bundle Hash
                                </p>
                                <p className="font-mono break-all">{epoch.bundle_hash ?? epoch.proof_hash}</p>
                            </div>
                            <div className="pt-3">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                                    Liability Root
                                </p>
                                <p className="font-mono break-all">{epoch.liability_root}</p>
                            </div>
                            {epoch.reserve_snapshot_hash && (
                                <div className="pt-3">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                                        Reserve Snapshot Hash
                                    </p>
                                    <p className="font-mono break-all">
                                        {epoch.reserve_snapshot_hash}
                                    </p>
                                </div>
                            )}
                            {epoch.rule_version_used && (
                                <div className="pt-3">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                                        Rule Version
                                    </p>
                                    <p className="font-mono">{epoch.rule_version_used}</p>
                                </div>
                            )}
                            {epoch.source_type && (
                                <div className="pt-3">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                                        Data Source
                                    </p>
                                    <p className="capitalize">{epoch.source_type.replace(/-/g, ' ')}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Reason codes */}
                    {epoch.reason_codes && epoch.reason_codes.length > 0 && (
                        <div className="rounded-xl border border-border bg-card/50 p-6 space-y-3 animate-fade-in">
                            <h2 className="font-display font-medium flex items-center gap-2">
                                <Tag size={16} className="text-accent" />
                                Reason Codes
                            </h2>
                            <ReasonCodesList codes={epoch.reason_codes} />
                        </div>
                    )}

                    {/* Anchor metadata */}
                    <div className="animate-fade-in">
                        <AnchorMetadataCard anchor={epoch.anchor_metadata ?? (epoch.anchored_at ? {
                            anchored_at: epoch.anchored_at,
                            network: "testnet",
                        } : null)} />
                    </div>

                    {/* Epoch history */}
                    <div className="space-y-3 animate-fade-in">
                        <h2 className="font-display font-medium flex items-center gap-2">
                            <History size={16} className="text-muted-foreground" />
                            Epoch History
                            {historyLoading && (
                                <Loader2 size={14} className="animate-spin text-muted-foreground" />
                            )}
                        </h2>

                        {!historyLoading && history.length === 0 && (
                            <p className="text-sm text-muted-foreground">
                                No historical epochs available.
                            </p>
                        )}

                        <div className="space-y-2">
                            {history.map((item, idx) => (
                                <HistoryRow key={item.epoch_id} item={item} index={idx} />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
