import { useState, useEffect } from "react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { useSolvencyProof } from "@/hooks/useSolvencyProof";
import SpotlightCard from "@/components/reactbits/SpotlightCard";
import { Link } from "react-router-dom";
import {
    GitBranch,
    Hash,
    Loader2,
    CheckCircle2,
    ArrowRight,
    RefreshCw,
    Search,
    Copy,
    Check,
    XCircle,
} from "lucide-react";

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
        >
            {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
        </button>
    );
}

export default function Liabilities() {
    const [epochId, setEpochId] = useState<string>("");
    const [merkleRoot, setMerkleRoot] = useState<string>("");
    const [leafCount, setLeafCount] = useState<number>(0);
    const [totalLiabilities, setTotalLiabilities] = useState<number>(0);
    const [userCount, setUserCount] = useState<number>(0);
    const [treeBuilt, setTreeBuilt] = useState(false);
    const [isBuilding, setIsBuilding] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [verifyUserId, setVerifyUserId] = useState("");
    const [verifyResult, setVerifyResult] = useState<{ success: boolean; balance?: number; proof?: string[]; error?: string } | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);

    const { getLiabilities, buildMerkleTree, verifyInclusion, loading, error } = useSolvencyProof();

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const res = await getLiabilities();
            console.log("[Liabilities] API response:", res);
            if (res.root && res.root !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
                setMerkleRoot(res.root);
                setEpochId(res.epochId || "");
                setLeafCount(res.leafCount || 0);
                setTreeBuilt(true);
            }
        } catch (err) {
            console.error("[Liabilities] Failed to fetch:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleBuildTree = async () => {
        setIsBuilding(true);
        try {
            const res = await buildMerkleTree();
            console.log("[Liabilities] Build tree response:", res);
            setMerkleRoot(res.root);
            setTotalLiabilities(res.totalLiabilities || 0);
            setUserCount(res.userCount || 0);
            setTreeBuilt(true);
            await fetchData();
        } catch (err) {
            console.error("[Liabilities] Failed to build tree:", err);
        } finally {
            setIsBuilding(false);
        }
    };

    const handleVerify = async () => {
        if (!verifyUserId.trim()) return;
        setIsVerifying(true);
        setVerifyResult(null);
        try {
            const res = await verifyInclusion(verifyUserId);
            console.log("[Liabilities] Verify response:", res);
            setVerifyResult({ success: true, balance: res.balance, proof: res.proof });
        } catch (err: any) {
            console.error("[Liabilities] Verify error:", err);
            setVerifyResult({ success: false, error: err.message || "User not found" });
        } finally {
            setIsVerifying(false);
        }
    };

    if (isLoading) {
        return (
            <PortalLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center space-y-4">
                        <Loader2 size={48} className="animate-spin mx-auto text-purple-500" />
                        <p className="text-muted-foreground">Loading liabilities data...</p>
                    </div>
                </div>
            </PortalLayout>
        );
    }

    return (
        <PortalLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="font-display text-2xl font-semibold flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
                                <GitBranch size={24} className="text-purple-500" />
                            </div>
                            Liabilities Merkle Tree
                        </h1>
                        <p className="text-muted-foreground mt-1">Privacy-preserving commitment to all user balances</p>
                    </div>
                    <button
                        onClick={fetchData}
                        className="p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                    >
                        <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>

                {/* Why Merkle Trees */}
                <SpotlightCard spotlightColor="rgba(147, 51, 234, 0.1)" className="bg-card/80 border-border">
                    <div className="p-6">
                        <h3 className="font-medium mb-3">Why Merkle Trees?</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li className="flex items-start gap-2">
                                <CheckCircle2 size={16} className="text-success mt-0.5 shrink-0" />
                                Commit to ALL user balances with single hash
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 size={16} className="text-success mt-0.5 shrink-0" />
                                Users can verify inclusion WITHOUT seeing others
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 size={16} className="text-success mt-0.5 shrink-0" />
                                Privacy-preserving proof of total liabilities
                            </li>
                        </ul>
                    </div>
                </SpotlightCard>

                {/* Build Tree Button */}
                {!treeBuilt && (
                    <div className="text-center py-8">
                        <button
                            onClick={handleBuildTree}
                            disabled={isBuilding}
                            className="btn-primary text-lg px-8 py-4"
                        >
                            {isBuilding ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    Building Tree...
                                </>
                            ) : (
                                <>
                                    <GitBranch size={20} />
                                    Build Merkle Tree
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* Merkle Root Display */}
                {treeBuilt && (
                    <SpotlightCard spotlightColor="rgba(74, 222, 128, 0.1)" className="bg-card/95 border-border animate-fade-in-up">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 size={20} className="text-success" />
                                    <h3 className="font-medium">Liabilities Committed</h3>
                                </div>
                                <span className="px-3 py-1 rounded-full bg-success/10 text-success text-xs font-medium border border-success/20">
                                    Ready
                                </span>
                            </div>

                            <div className="grid md:grid-cols-3 gap-4 mb-6">
                                <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Users Included</p>
                                    <p className="font-display text-2xl font-semibold">{userCount || leafCount}</p>
                                </div>
                                <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Liabilities</p>
                                    <p className="font-display text-2xl font-semibold">{totalLiabilities.toLocaleString()}</p>
                                </div>
                                <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Epoch</p>
                                    <p className="font-display text-2xl font-semibold">{epochId || "Current"}</p>
                                </div>
                            </div>

                            <div className="p-4 rounded-lg bg-purple-500/5 border border-purple-500/20">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Commitment Hash</p>
                                    <CopyButton text={merkleRoot} />
                                </div>
                                <p className="font-mono text-sm break-all">{merkleRoot}</p>
                            </div>

                            <div className="mt-6 flex justify-end">
                                <Link to="/reserves" className="btn-primary">
                                    Continue to Reserves
                                    <ArrowRight size={16} />
                                </Link>
                            </div>
                        </div>
                    </SpotlightCard>
                )}

                {/* Verify Inclusion */}
                <SpotlightCard spotlightColor="rgba(147, 51, 234, 0.1)" className="bg-card/80 border-border">
                    <div className="p-6">
                        <h3 className="font-medium mb-4 flex items-center gap-2">
                            <Search size={18} className="text-purple-500" />
                            Verify Your Inclusion
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Any user can verify they're included in the proof without seeing others' balances.
                        </p>

                        <div className="flex gap-3 mb-4">
                            <input
                                type="text"
                                value={verifyUserId}
                                onChange={(e) => setVerifyUserId(e.target.value)}
                                placeholder="Enter User ID (e.g., alice)"
                                className="flex-1 px-4 py-2 rounded-lg bg-secondary/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                                onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                            />
                            <button
                                onClick={handleVerify}
                                disabled={isVerifying || !verifyUserId.trim()}
                                className="btn-primary disabled:opacity-50"
                            >
                                {isVerifying ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                                Verify
                            </button>
                        </div>

                        {verifyResult && (
                            <div className={`p-4 rounded-lg border ${verifyResult.success ? "bg-success/5 border-success/20" : "bg-destructive/5 border-destructive/20"}`}>
                                {verifyResult.success ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-success">
                                            <CheckCircle2 size={20} />
                                            <span className="font-medium">VERIFIED!</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <p className="text-muted-foreground">User</p>
                                                <p className="font-medium">{verifyUserId}</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">Balance</p>
                                                <p className="font-medium">{verifyResult.balance?.toLocaleString()} units</p>
                                            </div>
                                        </div>
                                        {verifyResult.proof && (
                                            <div>
                                                <p className="text-muted-foreground text-sm mb-1">Merkle Proof:</p>
                                                <div className="font-mono text-xs bg-secondary/30 p-2 rounded-lg max-h-20 overflow-auto">
                                                    {verifyResult.proof.map((p, i) => (
                                                        <div key={i}>{p.slice(0, 20)}...</div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        <p className="text-sm text-success">Your balance IS included in the solvency proof.</p>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-destructive">
                                        <XCircle size={20} />
                                        <span className="font-medium">User not found in tree</span>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="mt-4 p-3 rounded-lg bg-secondary/30 border border-border">
                            <p className="text-xs text-muted-foreground">
                                <span className="font-medium text-foreground">Note:</span> Enter a user ID that was added via Yellow Network sessions
                            </p>
                        </div>
                    </div>
                </SpotlightCard>
            </div>
        </PortalLayout>
    );
}
