/**
 * AdminDashboard — Operator Console
 *
 * Displays the latest backend-computed epoch state.
 * The frontend is a STATE CONSUMER — no protocol logic lives here.
 * Data flow: backend → Algorand adapter → Algorand Testnet registry → this view.
 */
import { useState, useEffect, useCallback } from "react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import {
    fetchBackendHealth,
    fetchLatestEpochState,
    triggerEpochRefresh,
    submitEpochToRegistry,
} from "@/services/solvencyService";
import type { EpochState } from "@/types/solvency";
import {
    HealthStatusBadge,
    FreshnessIndicator,
    CapitalStateCard,
    LiquidityStateCard,
    RegistryMetadataCard,
    ReasonCodesList,
} from "@/components/solvency";
import SpotlightCard from "@/components/reactbits/SpotlightCard";
import {
    Loader2,
    RefreshCw,
    CheckCircle2,
    AlertTriangle,
    Upload,
    Activity,
    Hash,
    Tag,
} from "lucide-react";

function GlowDot({ color = "bg-success" }: { color?: string }) {
    return (
        <span className="relative flex h-2 w-2">
            <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${color} opacity-75`} />
            <span className={`relative inline-flex h-2 w-2 rounded-full ${color}`} />
        </span>
    );
}

function HashRow({ label, value }: { label: string; value: string }) {
    if (!value) return null;
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
            <span className="font-mono text-xs break-all text-foreground/80">{value}</span>
        </div>
    );
}

export default function AdminDashboard() {
    const [backendStatus, setBackendStatus] = useState<"live" | "offline" | "checking">("checking");
    const [epochState, setEpochState] = useState<EpochState | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [actionMessage, setActionMessage] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        setActionMessage(null);
        try {
            const health = await fetchBackendHealth();
            setBackendStatus(["healthy", "ok"].includes(health.status?.toLowerCase()) ? "live" : "offline");
        } catch {
            setBackendStatus("offline");
        }

        try {
            const epoch = await fetchLatestEpochState();
            setEpochState(epoch);
        } catch {
            // partial data is fine — display what we have
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleRefreshEpoch = async () => {
        setIsRefreshing(true);
        setActionMessage(null);
        try {
            const res = await triggerEpochRefresh();
            setActionMessage(res.message ?? `Epoch refresh triggered. New epoch: ${res.epoch_id ?? "pending"}`);
            await loadData();
        } catch (err) {
            setActionMessage(err instanceof Error ? err.message : "Refresh failed");
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleSubmitToRegistry = async () => {
        if (!epochState) return;
        setIsSubmitting(true);
        setActionMessage(null);
        try {
            const res = await submitEpochToRegistry(epochState.epoch_id);
            setActionMessage(res.message ?? `Epoch ${epochState.epoch_id} submitted. Tx: ${res.tx_id ?? "pending"}`);
            await loadData();
        } catch (err) {
            setActionMessage(err instanceof Error ? err.message : "Submission failed");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <PortalLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center space-y-4">
                        <Loader2 size={48} className="animate-spin mx-auto text-accent" />
                        <p className="text-muted-foreground">Loading epoch state…</p>
                    </div>
                </div>
            </PortalLayout>
        );
    }

    return (
        <PortalLayout>
            <div className="max-w-5xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/20 mb-3">
                            <GlowDot color={backendStatus === "live" ? "bg-success" : "bg-destructive"} />
                            <span className="text-xs font-medium text-success capitalize">Backend {backendStatus}</span>
                        </div>
                        <h1 className="font-display text-3xl font-bold">Admin Console</h1>
                        <p className="text-muted-foreground mt-1">
                            View backend-computed epoch state and manage Algorand registry submissions.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleRefreshEpoch}
                            disabled={isRefreshing}
                            className="btn-secondary text-sm disabled:opacity-50"
                        >
                            {isRefreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                            Refresh Epoch
                        </button>
                        <button
                            onClick={handleSubmitToRegistry}
                            disabled={isSubmitting || !epochState}
                            className="btn-primary text-sm disabled:opacity-50"
                        >
                            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                            Submit to Registry
                        </button>
                    </div>
                </div>

                {/* Action message */}
                {actionMessage && (
                    <div className="flex items-start gap-2 px-4 py-3 rounded-xl border border-accent/30 bg-accent/5 text-sm animate-fade-in">
                        <CheckCircle2 size={16} className="text-accent mt-0.5 shrink-0" />
                        <span>{actionMessage}</span>
                    </div>
                )}

                {/* No epoch data */}
                {!epochState && (
                    <div className="flex items-start gap-2 px-4 py-3 rounded-xl border border-yellow-500/30 bg-yellow-500/5 text-sm">
                        <AlertTriangle size={16} className="text-yellow-500 mt-0.5 shrink-0" />
                        <span>No epoch state available. The backend may not have computed an epoch yet.</span>
                    </div>
                )}

                {epochState && (
                    <>
                        {/* Top-level epoch info */}
                        <SpotlightCard spotlightColor="rgba(74, 222, 128, 0.1)" className="bg-card/80 border-border animate-fade-in">
                            <div className="p-6 space-y-4">
                                <div className="flex flex-wrap items-center gap-3">
                                    <Activity size={20} className="text-accent" />
                                    <span className="font-display text-lg font-semibold">
                                        Epoch #{epochState.epoch_id}
                                    </span>
                                    <HealthStatusBadge status={epochState.health_status} />
                                    {epochState.entity_id && (
                                        <span className="text-xs text-muted-foreground">
                                            Entity: <span className="font-mono">{epochState.entity_id}</span>
                                        </span>
                                    )}
                                </div>

                                <FreshnessIndicator
                                    timestamp={epochState.timestamp}
                                    validUntil={epochState.valid_until}
                                />

                                <div className="grid gap-3 pt-2">
                                    <HashRow label="Bundle Hash" value={epochState.bundle_hash} />
                                    <HashRow label="Liability Root" value={epochState.liability_root} />
                                    <HashRow label="Reserve Root" value={epochState.reserve_root} />
                                    <HashRow label="Reserve Snapshot Hash" value={epochState.reserve_snapshot_hash} />
                                </div>
                            </div>
                        </SpotlightCard>

                        {/* Reason codes */}
                        {epochState.reason_codes && epochState.reason_codes.length > 0 && (
                            <div className="rounded-xl border border-border bg-card/50 p-5 space-y-3 animate-fade-in">
                                <div className="flex items-center gap-2">
                                    <Tag size={15} className="text-accent" />
                                    <h2 className="font-medium text-sm">Reason Codes</h2>
                                </div>
                                <ReasonCodesList codes={epochState.reason_codes} />
                            </div>
                        )}

                        {/* Capital & Liquidity cards */}
                        <div className="grid md:grid-cols-2 gap-4 animate-fade-in">
                            <CapitalStateCard
                                reservesTotal={epochState.reserves_total}
                                totalLiabilities={epochState.total_liabilities}
                                capitalBacked={epochState.capital_backed}
                            />
                            <LiquidityStateCard
                                liquidAssetsTotal={epochState.liquid_assets_total}
                                nearTermLiabilitiesTotal={epochState.near_term_liabilities_total}
                                liquidityReady={epochState.liquidity_ready}
                            />
                        </div>

                        {/* Anchor metadata */}
                        <div className="animate-fade-in">
                            <div className="flex items-center gap-2 mb-3">
                                <Hash size={16} className="text-muted-foreground" />
                                <h2 className="font-medium text-sm">Algorand Anchor</h2>
                            </div>
                            <RegistryMetadataCard anchor={epochState.anchored_at ? {
                                anchored_at: epochState.anchored_at,
                                network: "testnet",
                            } : null} />
                        </div>
                    </>
                )}
            </div>
        </PortalLayout>
    );
}
