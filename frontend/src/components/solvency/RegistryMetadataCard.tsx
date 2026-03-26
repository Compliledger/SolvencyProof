import { Link2, Hash, ExternalLink } from 'lucide-react';
import type { AnchorMetadata } from '@/lib/types';
import { getAlgorandTxUrl, getAlgorandAppUrl } from '@/lib/api/constants';

interface RegistryMetadataCardProps {
    anchor: AnchorMetadata | null | undefined;
    className?: string;
}

function formatDate(unixSeconds: number | undefined): string {
    if (!unixSeconds) return '—';
    try { return new Date(unixSeconds * 1000).toLocaleString(); } catch { return '—'; }
}

export function RegistryMetadataCard({ anchor, className = '' }: RegistryMetadataCardProps) {
    if (!anchor) {
        return (
            <div className={`rounded-xl border border-border bg-card/50 p-5 text-sm text-muted-foreground ${className}`}>
                Anchor metadata unavailable — epoch may not yet be submitted to the Algorand registry.
            </div>
        );
    }

    return (
        <div className={`rounded-xl border border-border bg-card/50 p-5 space-y-3 ${className}`}>
            <div className="flex items-center gap-2 mb-1">
                <Link2 size={15} className="text-accent" />
                <span className="text-sm font-medium">Algorand Registry — Anchor</span>
                {anchor.network && (
                    <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium uppercase">
                        {anchor.network}
                    </span>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
                {anchor.app_id && (
                    <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">App ID</p>
                        <a
                            href={getAlgorandAppUrl(anchor.app_id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 font-mono text-accent hover:underline"
                        >
                            <Hash size={12} />
                            {anchor.app_id}
                            <ExternalLink size={11} className="opacity-60" />
                        </a>
                    </div>
                )}
                {anchor.tx_id && (
                    <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Transaction ID</p>
                        <a
                            href={getAlgorandTxUrl(anchor.tx_id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 font-mono text-xs text-accent hover:underline truncate"
                        >
                            {anchor.tx_id.slice(0, 12)}…
                            <ExternalLink size={11} className="opacity-60 shrink-0" />
                        </a>
                    </div>
                )}
                {anchor.anchored_at !== undefined && anchor.anchored_at > 0 && (
                    <div className="col-span-2">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Anchored On-Chain</p>
                        <p className="text-xs">{formatDate(anchor.anchored_at)}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
