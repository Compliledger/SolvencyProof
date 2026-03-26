import { ExternalLink } from 'lucide-react';
import type { EpochHistoryItem } from '@/lib/types';
import { HealthStatusBadge } from './HealthStatusBadge';

interface EpochHistoryTableProps {
    epochs: EpochHistoryItem[];
    onSelectEpoch?: (epochId: number) => void;
    selectedEpochId?: number;
}

function formatDate(unixSeconds: number): string {
    if (!unixSeconds) return '—';
    try {
        return new Date(unixSeconds * 1000).toLocaleString();
    } catch {
        return '—';
    }
}

function truncateHash(h: string, chars = 10): string {
    if (!h) return '—';
    if (h.length <= chars * 2) return h;
    return `${h.slice(0, chars)}…${h.slice(-6)}`;
}

export function EpochHistoryTable({ epochs, onSelectEpoch, selectedEpochId }: EpochHistoryTableProps) {
    if (!epochs.length) {
        return (
            <div className="rounded-xl border border-border bg-card/50 px-6 py-12 text-center">
                <p className="text-muted-foreground text-sm">No epoch history available.</p>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-border bg-card/50 overflow-hidden">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-border bg-secondary/30">
                        <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Epoch</th>
                        <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Status</th>
                        <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3 hidden md:table-cell">Bundle Hash</th>
                        <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Anchored / Recorded</th>
                        <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Valid Until</th>
                        <th className="w-10 px-5 py-3" />
                    </tr>
                </thead>
                <tbody>
                    {epochs.map((epoch) => {
                        const isSelected = epoch.epoch_id === selectedEpochId;
                        const bundleHash = epoch.bundle_hash ?? epoch.proof_hash;
                        const displayTs = epoch.anchored_at ?? epoch.timestamp;
                        return (
                            <tr
                                key={epoch.epoch_id}
                                className={`border-b border-border/50 last:border-0 transition-colors ${
                                    onSelectEpoch ? 'cursor-pointer hover:bg-secondary/20' : ''
                                } ${isSelected ? 'bg-accent/5' : ''}`}
                                onClick={() => onSelectEpoch?.(epoch.epoch_id)}
                            >
                                <td className="px-5 py-3">
                                    <span className="font-mono">#{epoch.epoch_id}</span>
                                </td>
                                <td className="px-5 py-3">
                                    <HealthStatusBadge status={epoch.health_status} />
                                </td>
                                <td className="px-5 py-3 hidden md:table-cell">
                                    <span className="font-mono text-xs text-muted-foreground">
                                        {truncateHash(bundleHash)}
                                    </span>
                                </td>
                                <td className="px-5 py-3 hidden lg:table-cell">
                                    <span className="text-muted-foreground text-xs">{formatDate(displayTs)}</span>
                                </td>
                                <td className="px-5 py-3 hidden lg:table-cell">
                                    <span className="text-muted-foreground text-xs">{formatDate(epoch.valid_until)}</span>
                                </td>
                                <td className="px-5 py-3 text-right">
                                    {onSelectEpoch && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onSelectEpoch(epoch.epoch_id); }}
                                            className="p-1.5 rounded hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
                                            title="View epoch details"
                                        >
                                            <ExternalLink size={14} />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
