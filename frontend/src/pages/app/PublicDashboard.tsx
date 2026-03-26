/**
 * PublicDashboard — Public Solvency State Explorer
 *
 * Displays the latest registry-backed solvency state, freshness,
 * historical epochs, proof hashes, and anchor metadata.
 *
 * No auth required — this is a public transparency page.
 */
import { useState, useEffect, useCallback } from "react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { getLatestEpoch, getEpochHistory, getEpochRecord } from "@/lib/api/backend";
import type { SolvencyEpochState, EpochHistoryItem } from "@/lib/types";
import {
    HealthStatusBadge,
    FreshnessIndicator,
    CapitalStateCard,
    LiquidityStateCard,
    EpochHistoryTable,
    RegistryMetadataCard,
    ReasonCodesList,
} from "@/components/solvency";
import SpotlightCard from "@/components/reactbits/SpotlightCard";
import {
    Shield,
    Loader2,
    RefreshCw,
    Search,
    Hash,
    ArrowLeft,
    AlertTriangle,
    Tag,
} from "lucide-react";

export default function PublicDashboard() {
    const [entityId, setEntityId] = useState("");
    const [activeEntityId, setActiveEntityId] = useState<string | undefined>(undefined);
    const [latestEpoch, setLatestEpoch] = useState<SolvencyEpochState | null>(null);
    const [selectedEpoch, setSelectedEpoch] = useState<SolvencyEpochState | null>(null);
    const [history, setHistory] = useState<EpochHistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingEpoch, setIsLoadingEpoch] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadData = useCallback(async (eid?: string) => {
        setIsLoading(true);
        setError(null);
        setSelectedEpoch(null);
        try {
            const epoch = await getLatestEpoch(eid);
            setLatestEpoch(epoch);
        } catch {
            setError("Could not load latest epoch state.");
        }
        try {
            const hist = await getEpochHistory(eid ?? "default");
            setHistory(hist);
        } catch {
            setHistory([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData(activeEntityId);
    }, [loadData, activeEntityId]);

    const handleSearch = () => {
        const trimmed = entityId.trim() || undefined;
        setActiveEntityId(trimmed);
    };

    const handleSelectEpoch = async (epochId: number) => {
        const eid = activeEntityId ?? latestEpoch?.entity_id ?? "default";
        setIsLoadingEpoch(true);
        try {
            const epoch = await getEpochRecord(eid, epochId);
            setSelectedEpoch(epoch);
        } catch {
            setSelectedEpoch(null);
        } finally {
            setIsLoadingEpoch(false);
        }
    };

    const displayedEpoch = selectedEpoch ?? latestEpoch;

    if (isLoading) {
        return (
            <PortalLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center space-y-4">
                        <Loader2 size={48} className="animate-spin mx-auto text-accent" />
                        <p className="text-muted-foreground">Loading solvency state…</p>
                    </div>
                </div>
            </PortalLayout>
        );
    }

    return (
        <PortalLayout>
            <div className="max-w-6xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 animate-fade-in">
                    <div>
                        <h1 className="font-display text-3xl font-semibold flex items-center gap-3">
                            <Shield size={28} className="text-success" />
                            Solvency State Explorer
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Live registry-backed solvency epochs anchored on Algorand Testnet.
                        </p>
                    </div>
                    <button
                        onClick={() => loadData(activeEntityId)}
                        className="btn-secondary"
                        disabled={isLoading}
                    >
                        <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
                        Refresh
                    </button>
                </div>

                {/* Entity search */}
                <div className="flex gap-2 animate-fade-in">
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            value={entityId}
                            onChange={(e) => setEntityId(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                            placeholder="Filter by entity ID (leave blank for default)"
                            className="w-full h-10 pl-9 pr-4 rounded-lg border border-border bg-secondary/30 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all"
                        />
                    </div>
                    <button onClick={handleSearch} className="btn-secondary">
                        Search
                    </button>
                </div>

                {error && (
                    <div className="flex items-start gap-2 px-4 py-3 rounded-xl border border-yellow-500/30 bg-yellow-500/5 text-sm">
                        <AlertTriangle size={16} className="text-yellow-500 mt-0.5 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Epoch detail */}
                {displayedEpoch && (
                    <>
                        {selectedEpoch && (
                            <button
                                onClick={() => setSelectedEpoch(null)}
                                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <ArrowLeft size={14} />
                                Back to latest epoch
                            </button>
                        )}

                        <SpotlightCard spotlightColor="rgba(74, 222, 128, 0.1)" className="bg-card/80 border-border animate-fade-in">
                            <div className="p-6 space-y-4">
                                <div className="flex flex-wrap items-center gap-3">
                                    <span className="font-display text-lg font-semibold">
                                        Epoch #{displayedEpoch.epoch_id}
                                        {selectedEpoch ? "" : " (Latest)"}
                                    </span>
                                    <HealthStatusBadge status={displayedEpoch.health_status} />
                                    {displayedEpoch.entity_id && (
                                        <span className="text-xs text-muted-foreground">
                                            Entity: <span className="font-mono">{displayedEpoch.entity_id}</span>
                                        </span>
                                    )}
                                </div>

                                {isLoadingEpoch ? (
                                    <Loader2 size={18} className="animate-spin text-accent" />
                                ) : (
                                    <FreshnessIndicator
                                        timestamp={displayedEpoch.timestamp}
                                        validUntil={displayedEpoch.valid_until}
                                    />
                                )}

                                {/* Hashes */}
                                <div className="grid sm:grid-cols-2 gap-3 pt-2">
                                    {[
                                        { label: "Bundle Hash", value: displayedEpoch.bundle_hash ?? displayedEpoch.proof_hash },
                                        { label: "Liability Root", value: displayedEpoch.liability_root },
                                        { label: "Reserve Root", value: displayedEpoch.reserve_root },
                                        { label: "Reserve Snapshot Hash", value: displayedEpoch.reserve_snapshot_hash },
                                    ].map(({ label, value }) =>
                                        value ? (
                                            <div key={label} className="p-3 rounded-lg bg-secondary/20 border border-border">
                                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
                                                <p className="font-mono text-xs break-all">{value}</p>
                                            </div>
                                        ) : null,
                                    )}
                                </div>

                                {/* Rule version */}
                                {displayedEpoch.rule_version_used && (
                                    <p className="text-xs text-muted-foreground">
                                        Rule Version: <span className="font-mono">{displayedEpoch.rule_version_used}</span>
                                    </p>
                                )}
                            </div>
                        </SpotlightCard>

                        {/* Reason codes */}
                        {displayedEpoch.reason_codes && displayedEpoch.reason_codes.length > 0 && (
                            <div className="rounded-xl border border-border bg-card/50 p-5 space-y-3 animate-fade-in">
                                <div className="flex items-center gap-2">
                                    <Tag size={15} className="text-accent" />
                                    <h2 className="font-medium text-sm">Reason Codes</h2>
                                </div>
                                <ReasonCodesList codes={displayedEpoch.reason_codes} />
                            </div>
                        )}

                        {/* Capital & Liquidity */}
                        <div className="grid md:grid-cols-2 gap-4 animate-fade-in">
                            <CapitalStateCard
                                reservesTotal={Number(displayedEpoch.reserves_total)}
                                totalLiabilities={Number(displayedEpoch.total_liabilities ?? 0)}
                                capitalBacked={displayedEpoch.capital_backed}
                            />
                            <LiquidityStateCard
                                liquidAssetsTotal={Number(displayedEpoch.liquid_assets_total)}
                                nearTermLiabilitiesTotal={Number(displayedEpoch.near_term_liabilities_total)}
                                liquidityReady={displayedEpoch.liquidity_ready}
                            />
                        </div>

                        {/* Anchor metadata */}
                        <div className="animate-fade-in">
                            <div className="flex items-center gap-2 mb-3">
                                <Hash size={16} className="text-muted-foreground" />
                                <h2 className="font-medium">Algorand Anchor</h2>
                            </div>
                            <RegistryMetadataCard anchor={displayedEpoch.anchor_metadata ?? (displayedEpoch.anchored_at ? {
                                anchored_at: displayedEpoch.anchored_at,
                                network: "testnet",
                            } : null)} />
                        </div>
                    </>
                )}

                {/* Epoch history */}
                <div className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-3">
                        <Hash size={16} className="text-muted-foreground" />
                        <h2 className="font-medium">Epoch History</h2>
                        <span className="text-xs text-muted-foreground">({history.length} epochs)</span>
                    </div>
                    <EpochHistoryTable
                        epochs={history}
                        onSelectEpoch={handleSelectEpoch}
                        selectedEpochId={selectedEpoch?.epoch_id}
                    />
                </div>
            </div>
        </PortalLayout>
    );
}
