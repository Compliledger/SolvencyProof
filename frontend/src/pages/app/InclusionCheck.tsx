import { useState } from "react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { useSolvencyProof } from "@/hooks/useSolvencyProof";
import SpotlightCard from "@/components/reactbits/SpotlightCard";
import {
    Shield,
    CheckCircle2,
    XCircle,
    RefreshCw,
    Trash2,
    Copy,
    Check,
    Info,
    Search,
} from "lucide-react";

export default function InclusionCheck() {
    const [userId, setUserId] = useState("");
    const [isVerifying, setIsVerifying] = useState(false);
    const [result, setResult] = useState<{ success: boolean; balance?: number; proof?: string[]; error?: string } | null>(null);
    const [copied, setCopied] = useState(false);

    const { verifyInclusion } = useSolvencyProof();

    const handleVerify = async () => {
        if (!userId.trim()) return;

        setIsVerifying(true);
        setResult(null);

        try {
            const res = await verifyInclusion(userId.trim());
            console.log("[InclusionCheck] Verify response:", res);
            setResult({ success: true, balance: res.balance, proof: res.proof });
        } catch (err: any) {
            console.error("[InclusionCheck] Verify error:", err);
            setResult({ success: false, error: err.message || "User not found in the Merkle tree" });
        } finally {
            setIsVerifying(false);
        }
    };

    const handleClear = () => {
        setUserId("");
        setResult(null);
    };

    const handleCopyResult = () => {
        if (result) {
            navigator.clipboard.writeText(JSON.stringify(result, null, 2));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <PortalLayout>
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="space-y-2 animate-fade-in">
                    <h1 className="font-display text-3xl font-semibold flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
                            <Shield size={28} className="text-purple-500" />
                        </div>
                        Verify Your Inclusion
                    </h1>
                    <p className="text-muted-foreground">
                        Check if your balance is included in the solvency proof without revealing other users' data.
                    </p>
                </div>

                <div className="grid gap-8 lg:grid-cols-12">
                    {/* Main Form */}
                    <div className="lg:col-span-7 space-y-6">
                        {/* Verification Form */}
                        <SpotlightCard
                            spotlightColor="rgba(147, 51, 234, 0.1)"
                            className="bg-card/80 border-border animate-fade-in"
                        >
                            <div className="p-6">
                                <h2 className="font-display font-medium mb-4 flex items-center gap-2">
                                    <Search size={18} className="text-purple-500" />
                                    Enter Your User ID
                                </h2>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
                                            User ID
                                        </label>
                                        <input
                                            type="text"
                                            value={userId}
                                            onChange={(e) => setUserId(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                                            placeholder="Enter your user ID (e.g., alice, bob)"
                                            className="w-full h-12 px-4 rounded-lg border border-border bg-secondary/30 text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/50 transition-all"
                                        />
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={handleVerify}
                                            disabled={!userId.trim() || isVerifying}
                                            className="flex-1 btn-primary justify-center h-12 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isVerifying ? (
                                                <>
                                                    <RefreshCw size={16} className="animate-spin" />
                                                    Verifying...
                                                </>
                                            ) : (
                                                <>
                                                    <Shield size={16} />
                                                    Verify Inclusion
                                                </>
                                            )}
                                        </button>
                                        <button
                                            onClick={handleClear}
                                            className="btn-secondary h-12"
                                        >
                                            <Trash2 size={16} />
                                            Clear
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </SpotlightCard>

                        {/* Result Panel */}
                        {result && (
                            <SpotlightCard
                                spotlightColor={result.success ? "rgba(74, 222, 128, 0.15)" : "rgba(239, 68, 68, 0.15)"}
                                className={`border-2 animate-fade-in ${
                                    result.success
                                        ? "border-success/50 bg-success/5"
                                        : "border-destructive/50 bg-destructive/5"
                                }`}
                            >
                                <div className="p-6">
                                    <div className="flex items-start gap-4 mb-6">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                            result.success ? "bg-success/20" : "bg-destructive/20"
                                        }`}>
                                            {result.success ? (
                                                <CheckCircle2 size={24} className="text-success" />
                                            ) : (
                                                <XCircle size={24} className="text-destructive" />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className={`font-display text-xl font-semibold ${
                                                result.success ? "text-success" : "text-destructive"
                                            }`}>
                                                {result.success ? "✓ VERIFIED!" : "✗ Not Found"}
                                            </h3>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {result.success
                                                    ? "Your balance IS included in the solvency proof."
                                                    : result.error || "User not found in the Merkle tree."}
                                            </p>
                                        </div>
                                    </div>

                                    {result.success && (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">User</p>
                                                    <p className="font-medium">{userId}</p>
                                                </div>
                                                <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Balance</p>
                                                    <p className="font-semibold text-success">{result.balance?.toLocaleString()} units</p>
                                                </div>
                                            </div>

                                            {result.proof && result.proof.length > 0 && (
                                                <div>
                                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Merkle Proof</p>
                                                    <div className="font-mono text-xs bg-secondary/30 p-3 rounded-lg max-h-32 overflow-auto border border-border">
                                                        {result.proof.map((p, i) => (
                                                            <div key={i} className="truncate">{p}</div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex gap-2 mt-6">
                                        <button
                                            onClick={handleCopyResult}
                                            className="flex-1 btn-secondary text-sm justify-center"
                                        >
                                            {copied ? <Check size={14} /> : <Copy size={14} />}
                                            {copied ? "Copied!" : "Copy Result"}
                                        </button>
                                        <button
                                            onClick={handleClear}
                                            className="btn-secondary text-sm"
                                        >
                                            Verify Another
                                        </button>
                                    </div>
                                </div>
                            </SpotlightCard>
                        )}
                    </div>

                    {/* Right Column - Info */}
                    <div className="lg:col-span-5 space-y-6">
                        {/* How it works */}
                        <div className="rounded-xl border border-border bg-card/50 p-6 animate-fade-in">
                            <div className="flex items-center gap-2 mb-4">
                                <Info size={16} className="text-purple-500" />
                                <h3 className="font-medium">How Inclusion Verification Works</h3>
                            </div>
                            <ul className="space-y-3 text-sm text-muted-foreground">
                                <li className="flex gap-2">
                                    <CheckCircle2 size={16} className="text-success mt-0.5 shrink-0" />
                                    <span>Your balance is hashed into a Merkle tree along with all other users.</span>
                                </li>
                                <li className="flex gap-2">
                                    <CheckCircle2 size={16} className="text-success mt-0.5 shrink-0" />
                                    <span>You receive a proof showing your inclusion WITHOUT seeing others' data.</span>
                                </li>
                                <li className="flex gap-2">
                                    <CheckCircle2 size={16} className="text-success mt-0.5 shrink-0" />
                                    <span>Anyone can verify the proof against the published Merkle root.</span>
                                </li>
                            </ul>
                        </div>

                        {/* Test Users */}
                        <div className="rounded-xl border border-border bg-secondary/20 p-6 animate-fade-in">
                            <h4 className="font-medium mb-3">Test User IDs</h4>
                            <p className="text-sm text-muted-foreground mb-4">
                                Try verifying these users that were added via Yellow Network sessions:
                            </p>
                            <div className="space-y-2">
                                {["alice", "bob", "charlie", "dave"].map((user) => (
                                    <button
                                        key={user}
                                        onClick={() => {
                                            setUserId(user);
                                            setResult(null);
                                        }}
                                        className="w-full p-3 rounded-lg bg-secondary/50 border border-border hover:border-purple-500/30 hover:bg-purple-500/5 transition-all text-left"
                                    >
                                        <span className="font-mono text-sm">{user}</span>
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-muted-foreground mt-4">
                                Note: These users must have been added via the Yellow Network sessions and the Merkle tree must be built.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </PortalLayout>
    );
}
