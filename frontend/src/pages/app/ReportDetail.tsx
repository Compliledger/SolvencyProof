import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { useSolvencyProof } from "@/hooks/useSolvencyProof";
import { getEtherscanAddressUrl, CONTRACTS } from "@/lib/api/constants";
import SpotlightCard from "@/components/reactbits/SpotlightCard";
import {
    Copy,
    ExternalLink,
    Shield,
    Calendar,
    ArrowLeft,
    Check,
    Loader2,
    CheckCircle2,
} from "lucide-react";

function GlowDot({ color = "bg-success" }: { color?: string }) {
    return (
        <span className="relative flex h-2 w-2">
            <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${color} opacity-75`} />
            <span className={`relative inline-flex h-2 w-2 rounded-full ${color}`} />
        </span>
    );
}

function CopyButton({ text, label }: { text: string; label: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:border-accent/30 hover:bg-secondary/30 transition-all text-sm"
        >
            {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
            {copied ? "Copied!" : label}
        </button>
    );
}

export default function ReportDetail() {
    const { id } = useParams();
    const [proof, setProof] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { getOnChainProof } = useSolvencyProof();

    useEffect(() => {
        const fetchProof = async () => {
            if (!id) return;
            setIsLoading(true);
            try {
                const epochId = parseInt(id) || 1;
                const data = await getOnChainProof(epochId);
                setProof(data);
            } catch (err: any) {
                setError(err.message || "Failed to fetch proof");
            } finally {
                setIsLoading(false);
            }
        };
        fetchProof();
    }, [id]);

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
                        <p className="text-muted-foreground">Loading proof details...</p>
                    </div>
                </div>
            </PortalLayout>
        );
    }

    if (error || !proof) {
        return (
            <PortalLayout>
                <div className="max-w-2xl mx-auto text-center py-12">
                    <h1 className="text-2xl font-semibold mb-4">Proof Not Found</h1>
                    <p className="text-muted-foreground mb-6">{error || "The requested proof does not exist."}</p>
                    <Link to="/proofs" className="btn-primary">
                        <ArrowLeft size={16} />
                        Back to All Proofs
                    </Link>
                </div>
            </PortalLayout>
        );
    }

    return (
        <PortalLayout>
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Breadcrumb */}
                <nav className="flex items-center gap-2 text-sm text-muted-foreground animate-fade-in">
                    <Link to="/verify" className="hover:text-foreground transition-colors">Home</Link>
                    <span>/</span>
                    <Link to="/proofs" className="hover:text-foreground transition-colors">Proofs</Link>
                    <span>/</span>
                    <span className="text-foreground font-medium">Epoch #{id}</span>
                </nav>

                {/* Verification Summary */}
                <SpotlightCard
                    spotlightColor="rgba(74, 222, 128, 0.1)"
                    className="bg-card/95 border-border animate-fade-in-up"
                >
                    <div className="p-8">
                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 mb-8">
                            <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">On-Chain Proof</p>
                                <h1 className="font-display text-2xl font-semibold flex items-center gap-3">
                                    <CheckCircle2 size={28} className="text-success" />
                                    Epoch #{id}
                                </h1>
                                <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
                                    <Calendar size={14} />
                                    {formatTimestamp(proof.timestamp)}
                                </p>
                            </div>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-success/10 text-success border border-success/20">
                                <GlowDot color="bg-success" />
                                {proof.verified ? "VERIFIED" : "PENDING"}
                            </span>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
                            <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Epoch ID</p>
                                <p className="font-mono text-lg">{proof.epochId}</p>
                            </div>
                            <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Liabilities Root</p>
                                <p className="font-mono text-sm truncate" title={proof.liabilitiesRoot}>
                                    {proof.liabilitiesRoot?.slice(0, 20)}...
                                </p>
                            </div>
                            <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Reserves Total</p>
                                <p className="font-mono text-sm text-success">{proof.reservesTotal} wei</p>
                            </div>
                            <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Timestamp</p>
                                <p className="text-sm">{proof.timestamp}</p>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-3">
                            <a
                                href={getEtherscanAddressUrl(CONTRACTS.REGISTRY)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-primary"
                            >
                                <ExternalLink size={16} />
                                View on Etherscan
                            </a>
                            <Link to="/inclusion" className="btn-secondary">
                                <Shield size={16} />
                                Verify Inclusion
                            </Link>
                            <CopyButton text={proof.liabilitiesRoot || ""} label="Copy Root Hash" />
                            <CopyButton text={window.location.href} label="Copy Link" />
                        </div>
                    </div>
                </SpotlightCard>

                {/* Verification Statement */}
                <div className="rounded-xl border border-border bg-card/50 p-6 animate-fade-in">
                    <h2 className="font-display text-lg font-medium mb-4">Verification Statement</h2>
                    <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                        <p className="text-sm leading-relaxed">
                            This on-chain proof attests that at epoch <code className="px-1.5 py-0.5 rounded bg-secondary text-accent-cream font-mono text-xs">#{id}</code>,
                            total reserves were ≥ total liabilities.
                        </p>
                        <p className="text-sm text-muted-foreground mt-3">
                            Verification method: <span className="text-foreground">Groth16 ZK-SNARK</span>
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Network: <span className="text-foreground">Sepolia Testnet</span>
                        </p>
                    </div>
                </div>

                {/* Smart Contracts */}
                <div className="rounded-xl border border-border bg-card/50 p-6 animate-fade-in">
                    <h2 className="font-display text-lg font-medium mb-4">Smart Contracts</h2>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                            <span className="text-sm text-muted-foreground">Registry Contract</span>
                            <a
                                href={getEtherscanAddressUrl(CONTRACTS.REGISTRY)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-xs text-accent hover:underline flex items-center gap-1"
                            >
                                {CONTRACTS.REGISTRY}
                                <ExternalLink size={12} />
                            </a>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                            <span className="text-sm text-muted-foreground">Verifier Contract</span>
                            <a
                                href={getEtherscanAddressUrl(CONTRACTS.VERIFIER)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-xs text-accent hover:underline flex items-center gap-1"
                            >
                                {CONTRACTS.VERIFIER}
                                <ExternalLink size={12} />
                            </a>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex justify-between">
                    <Link to="/proofs" className="btn-secondary">
                        <ArrowLeft size={16} />
                        Back to All Proofs
                    </Link>
                </div>
            </div>
        </PortalLayout>
    );
}
