// User Verification — lets a user verify their inclusion in the liability
// commitment (Merkle tree) for a specific epoch.
//
// This component consumes the backend service layer.  It shows:
//  • Whether the user/account is included in the liability root
//  • The associated entity and epoch context
//
// It does NOT expose other users' balances or proof details.

import { useState } from "react";
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
    Hash,
    Loader2,
} from "lucide-react";
import { verifyUserInclusion } from "@/lib/api/backend";
import { MOCK_USER_IDS } from "@/lib/api/mock";
import type { UserInclusionResult } from "@/lib/types";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface UserVerificationProps {
    /** Pre-fill entity ID input. */
    defaultEntityId?: string;
    /** Pre-fill epoch ID input. */
    defaultEpochId?: number;
}

export default function UserVerification({
    defaultEntityId = "",
    defaultEpochId,
}: UserVerificationProps) {
    const [userId, setUserId] = useState("");
    const [entityId, setEntityId] = useState(defaultEntityId);
    const [epochIdInput, setEpochIdInput] = useState(
        defaultEpochId !== undefined ? String(defaultEpochId) : ""
    );
    const [isVerifying, setIsVerifying] = useState(false);
    const [result, setResult] = useState<UserInclusionResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const handleVerify = async () => {
        if (!userId.trim()) return;

        setIsVerifying(true);
        setResult(null);
        setError(null);

        try {
            const epochId = epochIdInput.trim()
                ? parseInt(epochIdInput.trim(), 10)
                : undefined;

            const res = await verifyUserInclusion(
                userId.trim(),
                epochId !== undefined && !Number.isNaN(epochId) ? epochId : undefined,
                entityId.trim() || undefined
            );
            setResult(res);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Verification failed");
        } finally {
            setIsVerifying(false);
        }
    };

    const handleClear = () => {
        setUserId("");
        setResult(null);
        setError(null);
    };

    const handleCopyResult = () => {
        if (!result) return;
        navigator.clipboard.writeText(JSON.stringify(result, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="space-y-2 animate-fade-in">
                <h1 className="font-display text-3xl font-semibold flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
                        <Shield size={26} className="text-purple-500" />
                    </div>
                    Verify Inclusion
                </h1>
                <p className="text-muted-foreground">
                    Check whether your account is included in the liability commitment for a
                    given epoch — without exposing any other user's data.
                </p>
            </div>

            <div className="grid gap-8 lg:grid-cols-12">
                {/* Form */}
                <div className="lg:col-span-7 space-y-6">
                    <SpotlightCard
                        spotlightColor="rgba(147,51,234,0.1)"
                        className="bg-card/80 border-border animate-fade-in"
                    >
                        <div className="p-6 space-y-4">
                            <h2 className="font-display font-medium flex items-center gap-2">
                                <Search size={16} className="text-purple-500" />
                                Inclusion Check
                            </h2>

                            {/* User ID */}
                            <div>
                                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                                    User / Account ID <span className="text-destructive">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={userId}
                                    onChange={(e) => setUserId(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                                    placeholder="e.g. alice"
                                    className="w-full h-11 px-4 rounded-lg border border-border bg-secondary/30 text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/50 transition-all"
                                />
                            </div>

                            {/* Entity ID (optional) */}
                            <div>
                                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                                    Entity ID{" "}
                                    <span className="text-muted-foreground/60">(optional)</span>
                                </label>
                                <input
                                    type="text"
                                    value={entityId}
                                    onChange={(e) => setEntityId(e.target.value)}
                                    placeholder="e.g. demo-exchange"
                                    className="w-full h-11 px-4 rounded-lg border border-border bg-secondary/30 text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/50 transition-all"
                                />
                            </div>

                            {/* Epoch ID (optional) */}
                            <div>
                                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                                    Epoch ID{" "}
                                    <span className="text-muted-foreground/60">
                                        (optional — defaults to latest)
                                    </span>
                                </label>
                                <input
                                    type="number"
                                    value={epochIdInput}
                                    onChange={(e) => setEpochIdInput(e.target.value)}
                                    placeholder="e.g. 42"
                                    min={1}
                                    className="w-full h-11 px-4 rounded-lg border border-border bg-secondary/30 text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/50 transition-all"
                                />
                            </div>

                            <div className="flex items-center gap-3 pt-1">
                                <button
                                    onClick={handleVerify}
                                    disabled={!userId.trim() || isVerifying}
                                    className="flex-1 btn-primary justify-center h-11 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isVerifying ? (
                                        <>
                                            <Loader2 size={15} className="animate-spin" />
                                            Verifying…
                                        </>
                                    ) : (
                                        <>
                                            <Shield size={15} />
                                            Verify Inclusion
                                        </>
                                    )}
                                </button>
                                <button onClick={handleClear} className="btn-secondary h-11">
                                    <Trash2 size={15} />
                                    Clear
                                </button>
                            </div>
                        </div>
                    </SpotlightCard>

                    {/* Error */}
                    {error && (
                        <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 flex items-center gap-3 text-sm animate-fade-in">
                            <XCircle size={18} className="text-destructive shrink-0" />
                            <p className="text-destructive">{error}</p>
                        </div>
                    )}

                    {/* Result */}
                    {result && (
                        <SpotlightCard
                            spotlightColor={
                                result.included
                                    ? "rgba(74,222,128,0.15)"
                                    : "rgba(239,68,68,0.15)"
                            }
                            className={`border-2 animate-fade-in ${
                                result.included
                                    ? "border-success/50 bg-success/5"
                                    : "border-destructive/50 bg-destructive/5"
                            }`}
                        >
                            <div className="p-6 space-y-5">
                                {/* Verdict */}
                                <div className="flex items-start gap-4">
                                    <div
                                        className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                            result.included ? "bg-success/20" : "bg-destructive/20"
                                        }`}
                                    >
                                        {result.included ? (
                                            <CheckCircle2 size={24} className="text-success" />
                                        ) : (
                                            <XCircle size={24} className="text-destructive" />
                                        )}
                                    </div>
                                    <div>
                                        <h3
                                            className={`font-display text-xl font-semibold ${
                                                result.included ? "text-success" : "text-destructive"
                                            }`}
                                        >
                                            {result.included ? "✓ INCLUDED" : "✗ NOT INCLUDED"}
                                        </h3>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {result.included
                                                ? "This account is included in the liability commitment."
                                                : "This account was not found in the liability commitment for this epoch."}
                                        </p>
                                    </div>
                                </div>

                                {/* Context */}
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="p-3 rounded-lg bg-secondary/30 border border-border">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                                            User
                                        </p>
                                        <p className="font-mono font-medium">{userId}</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-secondary/30 border border-border">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                                            Entity
                                        </p>
                                        <p className="font-mono font-medium">{result.entity_id}</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-secondary/30 border border-border">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                                            Epoch
                                        </p>
                                        <p className="font-mono font-medium">#{result.epoch_id}</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-secondary/30 border border-border">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                                            Checked At
                                        </p>
                                        <p className="text-xs">
                                            {new Date(result.checked_at * 1000).toLocaleString()}
                                        </p>
                                    </div>
                                </div>

                                {/* Liability root */}
                                {result.liability_root && (
                                    <div className="text-sm">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Hash size={13} className="text-muted-foreground" />
                                            <p className="text-xs text-muted-foreground uppercase tracking-wider">
                                                Liability Root
                                            </p>
                                        </div>
                                        <p className="font-mono text-xs break-all bg-secondary/30 p-2 rounded-lg border border-border">
                                            {result.liability_root}
                                        </p>
                                    </div>
                                )}

                                <div className="flex gap-2 pt-1">
                                    <button
                                        onClick={handleCopyResult}
                                        className="flex-1 btn-secondary text-sm justify-center"
                                    >
                                        {copied ? <Check size={13} /> : <Copy size={13} />}
                                        {copied ? "Copied!" : "Copy Result"}
                                    </button>
                                    <button onClick={handleClear} className="btn-secondary text-sm">
                                        <RefreshCw size={13} />
                                        Verify Another
                                    </button>
                                </div>
                            </div>
                        </SpotlightCard>
                    )}
                </div>

                {/* Right column — info */}
                <div className="lg:col-span-5 space-y-6">
                    {/* How it works */}
                    <div className="rounded-xl border border-border bg-card/50 p-6 animate-fade-in">
                        <div className="flex items-center gap-2 mb-4">
                            <Info size={15} className="text-purple-500" />
                            <h3 className="font-medium">How Inclusion Verification Works</h3>
                        </div>
                        <ul className="space-y-3 text-sm text-muted-foreground">
                            <li className="flex gap-2">
                                <CheckCircle2 size={15} className="text-success mt-0.5 shrink-0" />
                                <span>
                                    Every user's balance is committed into a Merkle tree (liability
                                    root) each epoch.
                                </span>
                            </li>
                            <li className="flex gap-2">
                                <CheckCircle2 size={15} className="text-success mt-0.5 shrink-0" />
                                <span>
                                    You can verify your own inclusion without seeing any other user's
                                    data.
                                </span>
                            </li>
                            <li className="flex gap-2">
                                <CheckCircle2 size={15} className="text-success mt-0.5 shrink-0" />
                                <span>
                                    The liability root is published on-chain / in the Algorand
                                    registry and is independently verifiable.
                                </span>
                            </li>
                            <li className="flex gap-2">
                                <CheckCircle2 size={15} className="text-success mt-0.5 shrink-0" />
                                <span>
                                    Leave the Epoch ID blank to check against the latest epoch.
                                </span>
                            </li>
                        </ul>
                    </div>

                    {/* Demo users */}
                    <div className="rounded-xl border border-border bg-secondary/20 p-6 animate-fade-in">
                        <h4 className="font-medium mb-3">Demo User IDs</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                            These demo accounts are included in the test liability tree:
                        </p>
                        <div className="space-y-2">
                            {MOCK_USER_IDS.map((user) => (
                                <button
                                    key={user}
                                    onClick={() => {
                                        setUserId(user);
                                        setResult(null);
                                        setError(null);
                                    }}
                                    className="w-full p-3 rounded-lg bg-secondary/50 border border-border hover:border-purple-500/30 hover:bg-purple-500/5 transition-all text-left"
                                >
                                    <span className="font-mono text-sm">{user}</span>
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-4">
                            These users are only present when the Merkle tree has been built from
                            the test dataset.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
