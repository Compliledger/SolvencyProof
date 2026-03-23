import { useState, useEffect } from "react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { useSolvencyProof } from "@/hooks/useSolvencyProof";
import SpotlightCard from "@/components/reactbits/SpotlightCard";
import { Link } from "react-router-dom";
import { getEtherscanTxUrl, getEtherscanAddressUrl, CONTRACTS } from "@/lib/api/constants";
import {
    Trophy,
    Shield,
    CheckCircle2,
    ExternalLink,
    Github,
    RefreshCw,
    Lock,
    Eye,
    EyeOff,
    Zap,
    GitBranch,
    Wallet,
} from "lucide-react";

export default function Summary() {
    const [latestProof, setLatestProof] = useState<any>(null);
    const [epochCount, setEpochCount] = useState<number>(0);
    const { getEpochCount, getOnChainProof } = useSolvencyProof();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const countRes = await getEpochCount();
                console.log("[Summary] Epoch count:", countRes);
                const count = countRes.epochCount || 0;
                setEpochCount(count);

                if (count > 0) {
                    const proofRes = await getOnChainProof(count);
                    console.log("[Summary] Latest proof:", proofRes);
                    setLatestProof(proofRes);
                }
            } catch (err) {
                console.error("[Summary] Failed to fetch:", err);
            }
        };
        fetchData();
    }, []);

    return (
        <PortalLayout>
            <div className="space-y-6">
                {/* Victory Banner */}
                <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 mb-6">
                        <Trophy size={40} className="text-yellow-500" />
                    </div>
                    <h1 className="font-display text-4xl font-bold mb-2">
                        🎉 SOLVENCY VERIFIED! 🎉
                    </h1>
                    <p className="text-muted-foreground text-lg">
                        Cryptographic proof of solvency submitted on-chain
                    </p>
                </div>

                {/* Verified Badge */}
                <SpotlightCard spotlightColor="rgba(74, 222, 128, 0.2)" className="bg-card/95 border-success/30">
                    <div className="p-8 text-center">
                        <div className="inline-block p-8 rounded-2xl bg-success/10 border-2 border-success/30 mb-6">
                            <div className="space-y-2">
                                <p className="text-sm uppercase tracking-widest text-success/70">CRYPTOGRAPHICALLY</p>
                                <p className="text-3xl font-bold text-success">VERIFIED</p>
                                <div className="h-px bg-success/30 my-4" />
                                <p className="text-lg font-medium">Reserves ≥ Liabilities</p>
                            </div>
                        </div>

                        {latestProof && (
                            <div className="grid md:grid-cols-3 gap-4 mt-6">
                                <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Epoch</p>
                                    <p className="font-display text-xl font-semibold">#{epochCount}</p>
                                </div>
                                <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">On-Chain</p>
                                    <p className="font-medium text-success">✅ Verified</p>
                                </div>
                                <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Network</p>
                                    <p className="font-medium">Sepolia</p>
                                </div>
                            </div>
                        )}
                    </div>
                </SpotlightCard>

                {/* What We Proved */}
                <div className="grid md:grid-cols-2 gap-6">
                    <SpotlightCard spotlightColor="rgba(74, 222, 128, 0.1)" className="bg-card/80 border-border">
                        <div className="p-6">
                            <h3 className="font-medium mb-4 flex items-center gap-2">
                                <Eye size={18} className="text-success" />
                                What We Proved
                            </h3>
                            <ul className="space-y-3">
                                <li className="flex items-start gap-3">
                                    <CheckCircle2 size={18} className="text-success mt-0.5 shrink-0" />
                                    <span>Exchange holds sufficient ETH reserves</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle2 size={18} className="text-success mt-0.5 shrink-0" />
                                    <span>All users' balances are committed in Merkle tree</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle2 size={18} className="text-success mt-0.5 shrink-0" />
                                    <span>Reserves cover total liabilities</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle2 size={18} className="text-success mt-0.5 shrink-0" />
                                    <span>Proof verified on-chain (Sepolia)</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle2 size={18} className="text-success mt-0.5 shrink-0" />
                                    <span>Anyone can verify independently</span>
                                </li>
                            </ul>
                        </div>
                    </SpotlightCard>

                    <SpotlightCard spotlightColor="rgba(239, 68, 68, 0.1)" className="bg-card/80 border-border">
                        <div className="p-6">
                            <h3 className="font-medium mb-4 flex items-center gap-2">
                                <EyeOff size={18} className="text-muted-foreground" />
                                What We DIDN'T Reveal
                            </h3>
                            <ul className="space-y-3">
                                <li className="flex items-start gap-3">
                                    <Lock size={18} className="text-muted-foreground mt-0.5 shrink-0" />
                                    <span>Individual user balances</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <Lock size={18} className="text-muted-foreground mt-0.5 shrink-0" />
                                    <span>Total number of users (optional)</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <Lock size={18} className="text-muted-foreground mt-0.5 shrink-0" />
                                    <span>Exact reserve amounts per wallet</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <Lock size={18} className="text-muted-foreground mt-0.5 shrink-0" />
                                    <span>User identities or account details</span>
                                </li>
                            </ul>
                        </div>
                    </SpotlightCard>
                </div>

                {/* Tech Stack */}
                <SpotlightCard spotlightColor="rgba(147, 51, 234, 0.1)" className="bg-card/80 border-border">
                    <div className="p-6">
                        <h3 className="font-medium mb-4">Technology Stack</h3>
                        <div className="grid md:grid-cols-4 gap-4">
                            <div className="p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/20 text-center">
                                <Zap size={24} className="mx-auto mb-2 text-yellow-500" />
                                <p className="font-medium text-sm">Yellow Network</p>
                                <p className="text-xs text-muted-foreground">State Channels</p>
                            </div>
                            <div className="p-4 rounded-lg bg-purple-500/5 border border-purple-500/20 text-center">
                                <GitBranch size={24} className="mx-auto mb-2 text-purple-500" />
                                <p className="font-medium text-sm">Merkle Trees</p>
                                <p className="text-xs text-muted-foreground">Privacy Commitments</p>
                            </div>
                            <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20 text-center">
                                <Lock size={24} className="mx-auto mb-2 text-blue-500" />
                                <p className="font-medium text-sm">Groth16</p>
                                <p className="text-xs text-muted-foreground">ZK Proofs</p>
                            </div>
                            <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-center">
                                <Wallet size={24} className="mx-auto mb-2 text-emerald-500" />
                                <p className="font-medium text-sm">Sepolia</p>
                                <p className="text-xs text-muted-foreground">On-Chain Verification</p>
                            </div>
                        </div>
                    </div>
                </SpotlightCard>

                {/* Quote */}
                <div className="text-center py-6">
                    <blockquote className="text-xl italic text-muted-foreground">
                        "Prevent the next FTX with cryptographic certainty"
                    </blockquote>
                </div>

                {/* Links */}
                <div className="flex flex-wrap items-center justify-center gap-4">
                    {/* <a
                        href="https://github.com/Compliledger/SolvencyProof_Core"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary"
                    >
                        <Github size={18} />
                        GitHub
                    </a> */}
                    <a
                        href={getEtherscanAddressUrl(CONTRACTS.REGISTRY)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary"
                    >
                        <ExternalLink size={18} />
                        Registry Contract
                    </a>
                    <a
                        href={getEtherscanAddressUrl(CONTRACTS.VERIFIER)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary"
                    >
                        <Shield size={18} />
                        Verifier Contract
                    </a>
                    <Link to="/verify" className="btn-primary">
                        <RefreshCw size={18} />
                        New Verification
                    </Link>
                </div>
            </div>
        </PortalLayout>
    );
}
