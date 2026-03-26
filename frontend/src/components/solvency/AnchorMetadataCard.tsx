// AnchorMetadataCard — displays on-chain anchor details for an epoch that has
// been submitted to the Algorand Testnet SolventRegistry contract.
// Fields are populated from `AnchorMetadata` in the proof artifact.

import { Anchor, ExternalLink, Hash, Network } from 'lucide-react';
import type { AnchorMetadata } from '@/lib/types';
import { hasValidTimestamp } from '@/lib/types';
import { getAlgorandTxUrl, getAlgorandAppUrl } from '@/lib/api/constants';

interface AnchorMetadataCardProps {
    anchor: AnchorMetadata | undefined | null;
    className?: string;
}

function formatDate(unixSeconds: number | undefined): string {
    if (!unixSeconds) return 'Not available';
    try { return new Date(unixSeconds * 1000).toLocaleString(); } catch { return '—'; }
}

export function AnchorMetadataCard({ anchor, className = '' }: AnchorMetadataCardProps) {
    const hasAnchor = anchor && (anchor.tx_id || anchor.app_id || anchor.anchored_at);

    if (!hasAnchor) {
        return (
            <div className={`rounded-xl border border-border bg-card/50 p-5 space-y-2 ${className}`}>
                <div className="flex items-center gap-2">
                    <Anchor size={15} className="text-muted-foreground" />
                    <span className="text-sm font-medium">Anchor Metadata</span>
                </div>
                <p className="text-sm text-muted-foreground italic">
                    Not yet anchored on-chain — epoch may not have been submitted to the
                    Algorand registry.
                </p>
            </div>
        );
    }

    return (
        <div className={`rounded-xl border border-border bg-card/50 p-5 space-y-4 ${className}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Anchor size={15} className="text-accent" />
                    <span className="text-sm font-medium">Anchored on Algorand</span>
                </div>
                {anchor.network && (
                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium uppercase">
                        <Network size={10} />
                        {anchor.network}
                    </span>
                )}
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {hasValidTimestamp(anchor.anchored_at) && (
                    <div>
                        <dt className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                            Anchored At
                        </dt>
                        <dd>{formatDate(anchor.anchored_at)}</dd>
                    </div>
                )}
                {anchor.app_id && (
                    <div>
                        <dt className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                            Application ID
                        </dt>
                        <dd>
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
                        </dd>
                    </div>
                )}
                {anchor.tx_id && (
                    <div className="sm:col-span-2">
                        <dt className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                            Transaction ID
                        </dt>
                        <dd>
                            <a
                                href={getAlgorandTxUrl(anchor.tx_id)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 font-mono text-xs text-accent hover:underline break-all"
                            >
                                {anchor.tx_id}
                                <ExternalLink size={11} className="opacity-60 shrink-0" />
                            </a>
                        </dd>
                    </div>
                )}
            </dl>
        </div>
    );
}
