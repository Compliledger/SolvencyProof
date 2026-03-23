import { useState, useEffect } from "react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { useSolvencyProof } from "@/hooks/useSolvencyProof";
import SpotlightCard from "@/components/reactbits/SpotlightCard";
import { Link } from "react-router-dom";
import { getEtherscanTxUrl, CONTRACTS } from "@/lib/api/constants";
import {
    Lock,
    Loader2,
    CheckCircle2,
    ArrowRight,
    ExternalLink,
    Copy,
    Check,
    Zap,
    Shield,
    FileText,
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

export default function ProofGenerator() {
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [proofGenerated, setProofGenerated] = useState(false);
    const [proofData, setProofData] = useState<any>(null);
    const [publicSignals, setPublicSignals] = useState<string[]>([]);
    const [isSolvent, setIsSolvent] = useState<boolean | null>(null);
    const [txHash, setTxHash] = useState<string>("");
    const [blockNumber, setBlockNumber] = useState<number | null>(null);
    const [generationTime, setGenerationTime] = useState<number>(0);

    const { generateProof, submitProof, getLiabilities, getReserves, loading, error } = useSolvencyProof();

    // Fetch current inputs
    const [liabilitiesRoot, setLiabilitiesRoot] = useState<string>("");
    const [totalLiabilities, setTotalLiabilities] = useState<number>(0);
    const [totalReserves, setTotalReserves] = useState<string>("0");
    const [epochId, setEpochId] = useState<string>("");

    useEffect(() => {
        const fetchInputs = async () => {
            try {
                const [liabRes, resRes] = await Promise.all([getLiabilities(), getReserves()]);
                console.log("[ProofGenerator] Liabilities:", liabRes);
                console.log("[ProofGenerator] Reserves:", resRes);
                
                if (liabRes.root) {
                    setLiabilitiesRoot(liabRes.root);
                    setEpochId(liabRes.epochId || "");
                }
                
                if (resRes.addresses) {
                    let total = BigInt(0);
                    resRes.addresses.forEach((addr: any) => {
                        try {
                            const wei = addr.balanceWei || '0';
                            const clean = wei.toString().replace(/[^0-9]/g, '');
                            if (clean) total += BigInt(clean);
                        } catch (e) {}
                    });
                    setTotalReserves(total.toString());
                }
            } catch (err) {
                console.error("[ProofGenerator] Failed to fetch inputs:", err);
            }
        };
        fetchInputs();
    }, []);

    const handleGenerate = async () => {
        setIsGenerating(true);
        const startTime = Date.now();
        try {
            const res = await generateProof();
            console.log("[ProofGenerator] Generate response:", res);
            setProofGenerated(true);
            setProofData(res.proof);
            setPublicSignals(res.publicSignals || []);
            setIsSolvent(res.isSolvent);
            setGenerationTime((Date.now() - startTime) / 1000);
        } catch (err) {
            console.error("[ProofGenerator] Failed to generate:", err);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const res = await submitProof();
            console.log("[ProofGenerator] Submit response:", res);
            setTxHash(res.txHash);
            setBlockNumber(res.blockNumber);
        } catch (err) {
            console.error("[ProofGenerator] Failed to submit:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <PortalLayout>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="font-display text-2xl font-semibold flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
                            <Lock size={24} className="text-blue-500" />
                        </div>
                        Zero-Knowledge Proof Generator
                    </h1>
                    <p className="text-muted-foreground mt-1">Generate Groth16 proof of solvency</p>
                </div>

                {/* Proof Inputs */}
                <SpotlightCard spotlightColor="rgba(59, 130, 246, 0.1)" className="bg-card/80 border-border">
                    <div className="p-6">
                        <h3 className="font-medium mb-4 flex items-center gap-2">
                            <FileText size={18} className="text-blue-500" />
                            Proof Inputs
                        </h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Liabilities Root</p>
                                <p className="font-mono text-sm truncate">{liabilitiesRoot || "Not built yet"}</p>
                            </div>
                            <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Liabilities</p>
                                <p className="font-mono text-sm">{totalLiabilities.toLocaleString()} units</p>
                            </div>
                            <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Reserves</p>
                                <p className="font-mono text-sm">{totalReserves} wei</p>
                            </div>
                            <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Epoch ID</p>
                                <p className="font-mono text-sm">{epochId || "Current"}</p>
                            </div>
                        </div>
                    </div>
                </SpotlightCard>

                {/* Generate Button */}
                {!proofGenerated && (
                    <div className="text-center py-8">
                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="btn-primary text-lg px-8 py-4 bg-blue-500 hover:bg-blue-600"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    Generating ZK Proof...
                                </>
                            ) : (
                                <>
                                    <Lock size={20} />
                                    Generate ZK Proof
                                </>
                            )}
                        </button>
                        <p className="text-sm text-muted-foreground mt-3">
                            This will generate a Groth16 zero-knowledge proof
                        </p>
                    </div>
                )}

                {/* Proof Result */}
                {proofGenerated && (
                    <SpotlightCard spotlightColor="rgba(74, 222, 128, 0.15)" className="bg-card/95 border-border animate-fade-in-up">
                        <div className="p-6">
                            <div className="flex items-center gap-2 mb-6">
                                <CheckCircle2 size={24} className="text-success" />
                                <h3 className="font-medium text-lg">Proof Generated Successfully!</h3>
                            </div>

                            {/* Solvency Status */}
                            <div className={`p-6 rounded-xl mb-6 text-center ${isSolvent ? "bg-success/10 border border-success/30" : "bg-destructive/10 border border-destructive/30"}`}>
                                <p className="text-sm uppercase tracking-wider mb-2">Result</p>
                                <p className={`text-3xl font-bold ${isSolvent ? "text-success" : "text-destructive"}`}>
                                    {isSolvent ? "✅ SOLVENT" : "❌ INSOLVENT"}
                                </p>
                            </div>

                            {/* Public Signals */}
                            <div className="mb-6">
                                <h4 className="font-medium mb-3">Public Signals</h4>
                                <div className="space-y-2">
                                    {publicSignals.map((signal, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                                            <span className="text-sm text-muted-foreground">[{idx}] {
                                                idx === 0 ? "isSolvent" :
                                                idx === 1 ? "liabilitiesRoot" :
                                                idx === 2 ? "reservesTotal" :
                                                idx === 3 ? "epochId" : `signal_${idx}`
                                            }</span>
                                            <span className="font-mono text-sm truncate max-w-[200px]">
                                                {idx === 0 ? (signal === "1" ? "1 (TRUE)" : "0 (FALSE)") : signal}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Proof Metadata */}
                            <div className="grid md:grid-cols-2 gap-4 mb-6">
                                <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Proof Type</p>
                                    <p className="font-medium">Groth16 (BN128)</p>
                                </div>
                                <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Generation Time</p>
                                    <p className="font-medium">{generationTime.toFixed(2)}s</p>
                                </div>
                            </div>

                            {/* Submit to Chain */}
                            {!txHash && (
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={handleSubmit}
                                        disabled={isSubmitting}
                                        className="btn-primary flex-1"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" />
                                                Submitting to Chain...
                                            </>
                                        ) : (
                                            <>
                                                <Zap size={16} />
                                                Submit On-Chain
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}

                            {/* Transaction Result */}
                            {txHash && (
                                <div className="p-4 rounded-lg bg-success/10 border border-success/30 mb-6">
                                    <div className="flex items-center gap-2 mb-3">
                                        <CheckCircle2 size={18} className="text-success" />
                                        <span className="font-medium">Submitted On-Chain!</span>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground">TX Hash:</span>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono">{txHash.slice(0, 10)}...{txHash.slice(-8)}</span>
                                                <CopyButton text={txHash} />
                                            </div>
                                        </div>
                                        {blockNumber && (
                                            <div className="flex items-center justify-between">
                                                <span className="text-muted-foreground">Block:</span>
                                                <span className="font-mono">{blockNumber.toLocaleString()}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground">Status:</span>
                                            <span className="text-success">✅ Confirmed</span>
                                        </div>
                                    </div>
                                    <a
                                        href={getEtherscanTxUrl(txHash)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-secondary w-full mt-4"
                                    >
                                        <ExternalLink size={16} />
                                        View on Etherscan
                                    </a>
                                </div>
                            )}

                            {/* Next Step */}
                            <div className="flex justify-end">
                                <Link to="/summary" className="btn-primary">
                                    View Summary
                                    <ArrowRight size={16} />
                                </Link>
                            </div>
                        </div>
                    </SpotlightCard>
                )}

                {/* Smart Contracts Info */}
                <SpotlightCard spotlightColor="rgba(59, 130, 246, 0.1)" className="bg-card/80 border-border">
                    <div className="p-6">
                        <h3 className="font-medium mb-4 flex items-center gap-2">
                            <Shield size={18} className="text-blue-500" />
                            Smart Contracts (Sepolia)
                        </h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                                <span className="text-sm text-muted-foreground">Registry</span>
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-sm">{CONTRACTS.REGISTRY.slice(0, 10)}...{CONTRACTS.REGISTRY.slice(-8)}</span>
                                    <CopyButton text={CONTRACTS.REGISTRY} />
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                                <span className="text-sm text-muted-foreground">Verifier</span>
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-sm">{CONTRACTS.VERIFIER.slice(0, 10)}...{CONTRACTS.VERIFIER.slice(-8)}</span>
                                    <CopyButton text={CONTRACTS.VERIFIER} />
                                </div>
                            </div>
                        </div>
                    </div>
                </SpotlightCard>
            </div>
        </PortalLayout>
    );
}
