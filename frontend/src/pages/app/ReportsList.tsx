import { useState, useEffect } from "react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { useSolvencyProof } from "@/hooks/useSolvencyProof";
import { getEtherscanAddressUrl, CONTRACTS } from "@/lib/api/constants";
import { Link } from "react-router-dom";
import SpotlightCard from "@/components/reactbits/SpotlightCard";
import {
    ExternalLink,
    Loader2,
    RefreshCw,
    CheckCircle2,
    Shield,
} from "lucide-react";

function GlowDot({ color = "bg-success" }: { color?: string }) {
    return (
        <span className="relative flex h-2 w-2">
            <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${color} opacity-75`} />
            <span className={`relative inline-flex h-2 w-2 rounded-full ${color}`} />
        </span>
    );
}

interface ProofData {
    epochId: string;
    liabilitiesRoot: string;
    reservesTotal: string;
    timestamp: number;
    verified: boolean;
}

export default function ReportsList() {
    const [proofs, setProofs] = useState<ProofData[]>([]);
    const [epochCount, setEpochCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    const { getEpochCount, getOnChainProof } = useSolvencyProof();

    const fetchProofs = async () => {
        setIsLoading(true);
        try {
            const countRes = await getEpochCount();
            const count = countRes.epochCount || 0;
            setEpochCount(count);

            // Fetch all proofs
            const proofPromises = [];
            for (let i = count; i >= 1 && i > count - 10; i--) {
                proofPromises.push(getOnChainProof(i).catch(() => null));
            }
            const results = await Promise.all(proofPromises);
            setProofs(results.filter(Boolean) as ProofData[]);
        } catch (err) {
            console.error("[ReportsList] Error fetching proofs:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProofs();
    }, []);

    const formatTimestamp = (timestamp: number) => {
        if (!timestamp) return "N/A";
        return new Date(timestamp * 1000).toLocaleString();
    };

    if (isLoading) {
        return (
            <PortalLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center space-y-4">
                        <Loader2 size={48} className="animate-spin mx-auto text-accent" />
                        <p className="text-muted-foreground">Loading proofs...</p>
                    </div>
                </div>
            </PortalLayout>
        );
    }

    return (
        <PortalLayout>
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 animate-fade-in">
                    <div className="space-y-1">
                        <h1 className="font-display text-3xl font-semibold flex items-center gap-3">
                            <Shield size={28} className="text-success" />
                            All On-Chain Proofs
                        </h1>
                        <p className="text-muted-foreground">
                            Browse verified solvency proofs stored on Sepolia blockchain.
                        </p>
                    </div>

                    <button onClick={fetchProofs} className="btn-secondary">
                        <RefreshCw size={16} />
                        Refresh
                    </button>
                </div>

                {/* Stats */}
                <div className="grid md:grid-cols-3 gap-4">
                    <SpotlightCard spotlightColor="rgba(74, 222, 128, 0.1)" className="bg-card/80 border-border">
                        <div className="p-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                                <CheckCircle2 size={20} className="text-success" />
                            </div>
                            <div>
                                <p className="text-2xl font-semibold">{epochCount}</p>
                                <p className="text-xs text-muted-foreground">Total Epochs</p>
                            </div>
                        </div>
                    </SpotlightCard>
                    <SpotlightCard spotlightColor="rgba(74, 222, 128, 0.1)" className="bg-card/80 border-border">
                        <div className="p-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                                <Shield size={20} className="text-success" />
                            </div>
                            <div>
                                <p className="text-2xl font-semibold">{proofs.length}</p>
                                <p className="text-xs text-muted-foreground">Verified Proofs</p>
                            </div>
                        </div>
                    </SpotlightCard>
                    <SpotlightCard spotlightColor="rgba(74, 222, 128, 0.1)" className="bg-card/80 border-border">
                        <div className="p-4">
                            <p className="text-xs text-muted-foreground mb-1">Registry Contract</p>
                            <a
                                href={getEtherscanAddressUrl(CONTRACTS.REGISTRY)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-xs text-accent hover:underline flex items-center gap-1"
                            >
                                {CONTRACTS.REGISTRY.slice(0, 10)}...{CONTRACTS.REGISTRY.slice(-8)}
                                <ExternalLink size={12} />
                            </a>
                        </div>
                    </SpotlightCard>
                </div>

                {/* Proofs Table */}
                <div className="rounded-xl border border-border bg-card/50 overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border bg-secondary/30">
                                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">Epoch</th>
                                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">Status</th>
                                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">Liabilities Root</th>
                                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">Reserves</th>
                                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">Timestamp</th>
                                <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {proofs.map((proof, idx) => (
                                <tr
                                    key={`proof-${idx}-${proof.epochId}`}
                                    className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors"
                                >
                                    <td className="px-6 py-4">
                                        <span className="font-mono text-sm">#{parseInt(proof.epochId) || idx + 1}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-success/10 text-success border border-success/20">
                                            <GlowDot color="bg-success" />
                                            {proof.verified ? "VERIFIED" : "PENDING"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-mono text-xs text-muted-foreground">
                                            {proof.liabilitiesRoot?.slice(0, 16)}...
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm text-success">{proof.reservesTotal} wei</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm text-muted-foreground">{formatTimestamp(proof.timestamp)}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <a
                                            href={getEtherscanAddressUrl(CONTRACTS.REGISTRY)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 rounded-lg hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-foreground inline-flex"
                                            title="View on Etherscan"
                                        >
                                            <ExternalLink size={16} />
                                        </a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {proofs.length === 0 && (
                        <div className="px-6 py-12 text-center">
                            <p className="text-muted-foreground">No proofs submitted yet.</p>
                            <Link to="/proof" className="mt-2 text-sm text-accent hover:underline">
                                Generate your first proof →
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </PortalLayout>
    );
}
