import { useState, useEffect } from "react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { Link } from "react-router-dom";
import SpotlightCard from "@/components/reactbits/SpotlightCard";
import { useSolvencyProof } from "@/hooks/useSolvencyProof";
import { CONTRACTS } from "@/lib/api/constants";
import {
    Shield,
    ExternalLink,
    CheckCircle2,
    ArrowRight,
    Loader2,
    RefreshCw,
    Activity,
    TrendingUp,
    Users,
    Wallet,
} from "lucide-react";

function GlowDot({ color = "bg-success" }: { color?: string }) {
    return (
        <span className="relative flex h-2 w-2">
            <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${color} opacity-75`} />
            <span className={`relative inline-flex h-2 w-2 rounded-full ${color}`} />
        </span>
    );
}

export default function Dashboard() {
    const [healthStatus, setHealthStatus] = useState<string>("checking");
    const [epochCount, setEpochCount] = useState<number>(0);
    const [latestProof, setLatestProof] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    const { getHealth, getEpochCount, getOnChainProof } = useSolvencyProof();

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const health = await getHealth();
            setHealthStatus(["healthy", "ok"].includes(health.status) ? "live" : "offline");

            const epochs = await getEpochCount();
            setEpochCount(epochs.epochCount || 0);

            if (epochs.epochCount > 0) {
                const proof = await getOnChainProof(epochs.epochCount);
                setLatestProof(proof);
            }
        } catch (err) {
            console.error("[Dashboard] Error fetching data:", err);
            setHealthStatus("error");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const getTimeAgo = (timestamp: number) => {
        if (!timestamp) return null;
        const now = Date.now();
        const diff = now - timestamp * 1000;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours < 1) return "Just now";
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    if (isLoading) {
        return (
            <PortalLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center space-y-4">
                        <Loader2 size={48} className="animate-spin mx-auto text-accent" />
                        <p className="text-muted-foreground">Loading...</p>
                    </div>
                </div>
            </PortalLayout>
        );
    }

    return (
        <PortalLayout>
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Hero Section */}
                <div className="text-center py-8 animate-fade-in">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/20 mb-6">
                        <GlowDot color={healthStatus === "live" ? "bg-success" : "bg-destructive"} />
                        <span className="text-sm font-medium text-success capitalize">System {healthStatus}</span>
                    </div>
                    <h1 className="font-display text-4xl font-bold mb-4">
                        Proof of Solvency
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Verify that your exchange holds sufficient reserves to cover all user deposits —
                        with cryptographic guarantees and complete privacy.
                    </p>
                </div>

                {/* Quick Stats */}
                <div className="grid md:grid-cols-3 gap-4 animate-fade-in">
                    <SpotlightCard spotlightColor="rgba(74, 222, 128, 0.1)" className="bg-card/80 border-border">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                                    <Shield size={20} className="text-success" />
                                </div>
                                {latestProof?.timestamp && (
                                    <span className="text-xs text-muted-foreground">{getTimeAgo(latestProof.timestamp)}</span>
                                )}
                            </div>
                            <p className="text-3xl font-bold">{epochCount}</p>
                            <p className="text-sm text-muted-foreground">Verified Proofs</p>
                        </div>
                    </SpotlightCard>

                    <SpotlightCard spotlightColor="rgba(147, 51, 234, 0.1)" className="bg-card/80 border-border">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                    <TrendingUp size={20} className="text-purple-500" />
                                </div>
                            </div>
                            <p className="text-3xl font-bold text-success">100%</p>
                            <p className="text-sm text-muted-foreground">Coverage Ratio</p>
                        </div>
                    </SpotlightCard>

                    <SpotlightCard spotlightColor="rgba(234, 179, 8, 0.1)" className="bg-card/80 border-border">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                                    <Activity size={20} className="text-yellow-500" />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <GlowDot color="bg-success" />
                                <p className="text-lg font-semibold">All Systems Operational</p>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">Real-time verification</p>
                        </div>
                    </SpotlightCard>
                </div>

                {/* Main CTA */}
                <SpotlightCard
                    spotlightColor="rgba(74, 222, 128, 0.15)"
                    className="bg-card/95 border-border animate-fade-in-up"
                >
                    <div className="p-8">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                            <div className="space-y-2">
                                <h2 className="font-display text-2xl font-semibold">Generate Solvency Proof</h2>
                                <p className="text-muted-foreground">
                                    Create a new cryptographic proof to verify your reserves exceed liabilities.
                                </p>
                            </div>
                            <Link to="/yellow" className="btn-primary whitespace-nowrap">
                                Get Started
                                <ArrowRight size={18} />
                            </Link>
                        </div>
                    </div>
                </SpotlightCard>

                {/* Workflow Steps */}
                <div className="animate-fade-in">
                    <h2 className="font-display text-lg font-medium mb-4">How It Works</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { step: 1, label: "Connect Sessions", desc: "Link trading accounts", icon: Users, href: "/yellow" },
                            { step: 2, label: "Aggregate Liabilities", desc: "Build Merkle tree", icon: Wallet, href: "/liabilities" },
                            { step: 3, label: "Verify Reserves", desc: "Scan on-chain balances", icon: TrendingUp, href: "/reserves" },
                            { step: 4, label: "Submit Proof", desc: "Publish verification", icon: CheckCircle2, href: "/proof" },
                        ].map(({ step, label, desc, icon: Icon, href }) => (
                            <Link
                                key={step}
                                to={href}
                                className="p-5 rounded-xl border border-border bg-card/50 hover:bg-secondary/30 hover:border-accent/30 transition-all group"
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-sm font-bold text-accent">
                                        {step}
                                    </span>
                                    <Icon size={20} className="text-muted-foreground group-hover:text-accent transition-colors" />
                                </div>
                                <p className="font-medium">{label}</p>
                                <p className="text-sm text-muted-foreground">{desc}</p>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Latest Proof - Compact */}
                {latestProof && epochCount > 0 && (
                    <div className="rounded-xl border border-border bg-card/50 p-6 animate-fade-in">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                                    <CheckCircle2 size={20} className="text-success" />
                                </div>
                                <div>
                                    <p className="font-medium">Latest Proof: Epoch #{epochCount}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {latestProof.timestamp ? getTimeAgo(latestProof.timestamp) : "Verified on-chain"}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <a
                                    href={`https://sepolia.etherscan.io/address/${CONTRACTS.REGISTRY}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn-secondary text-sm"
                                >
                                    <ExternalLink size={14} />
                                    View on Etherscan
                                </a>
                                <button onClick={fetchData} className="btn-secondary text-sm">
                                    <RefreshCw size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </PortalLayout>
    );
}
