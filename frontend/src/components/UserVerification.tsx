// User Verification — lets a user verify their inclusion in the liability
// commitment (Merkle tree) for a specific epoch, and also lets anyone verify
// that a stored Algorand registry record matches the backend-computed state.
//
// Two independent verification flows are provided:
//  1. Liability Inclusion — checks whether a user ID appears in the liability root.
//  2. Stored Record — checks whether an on-chain epoch record exists and matches.
//
// Flow 1 does NOT expose other users' balances or proof details.

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
    Database,
} from "lucide-react";
import { verifyUserInclusion, verifyStoredRecord } from "@/lib/api/backend";
import { MOCK_USER_IDS } from "@/lib/api/mock";
import type { UserInclusionResult, VerificationResult } from "@/lib/types";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TabButton({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                active
                    ? "bg-accent/10 text-accent border border-accent/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
            }`}
        >
            {children}
        </button>
    );
}

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
    // Active tab: "inclusion" | "record"
    const [tab, setTab] = useState<"inclusion" | "record">("inclusion");

    // ---- Liability Inclusion state ----
    const [userId, setUserId] = useState("");
    const [entityId, setEntityId] = useState(defaultEntityId);
    const [epochIdInput, setEpochIdInput] = useState(
        defaultEpochId !== undefined ? String(defaultEpochId) : ""
    );
    const [isVerifying, setIsVerifying] = useState(false);
    const [result, setResult] = useState<UserInclusionResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // ---- Stored Record Verification state ----
    const [recEntityId, setRecEntityId] = useState(defaultEntityId);
    const [recEpochIdInput, setRecEpochIdInput] = useState(
        defaultEpochId !== undefined ? String(defaultEpochId) : ""
    );
    const [isRecVerifying, setIsRecVerifying] = useState(false);
    const [recResult, setRecResult] = useState<VerificationResult | null>(null);
    const [recError, setRecError] = useState<string | null>(null);
    const [recCopied, setRecCopied] = useState(false);

    // ---- Handlers: Liability Inclusion ----
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

    // ---- Handlers: Stored Record ----
    const handleRecVerify = async () => {
        if (!recEntityId.trim() || !recEpochIdInput.trim()) return;
        const epochId = parseInt(recEpochIdInput.trim(), 10);
        if (Number.isNaN(epochId) || epochId < 1) {
            setRecError("Please enter a valid epoch ID (positive integer).");
            return;
        }
        setIsRecVerifying(true);
        setRecResult(null);
        setRecError(null);
        try {
            const res = await verifyStoredRecord(recEntityId.trim(), epochId);
            setRecResult(res);
        } catch (e) {
            setRecError(e instanceof Error ? e.message : "Verification failed");
        } finally {
            setIsRecVerifying(false);
        }
    };

    const handleRecClear = () => {
        setRecResult(null);
        setRecError(null);
    };

    const handleCopyRecResult = () => {
        if (!recResult) return;
        navigator.clipboard.writeText(JSON.stringify(recResult, null, 2));
        setRecCopied(true);
        setTimeout(() => setRecCopied(false), 2000);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="space-y-2 animate-fade-in">
                <h1 className="font-display text-3xl font-semibold flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
                        <Shield size={26} className="text-purple-500" />
                    </div>
                    Verify
                </h1>
                <p className="text-muted-foreground">
                    Check liability inclusion for a user account, or verify that an
                    on-chain registry record matches the backend-computed state.
                </p>
            </div>

            {/* Tab selector */}
            <div className="flex items-center gap-2 animate-fade-in">
                <TabButton active={tab === "inclusion"} onClick={() => setTab("inclusion")}>
                    <Search size={14} />
                    Liability Inclusion
                </TabButton>
                <TabButton active={tab === "record"} onClick={() => setTab("record")}>
                    <Database size={14} />
                    Stored Record
                </TabButton>
            </div>

            {/* ============================================================
                Tab 1 — Liability Inclusion
            ============================================================ */}
            {tab === "inclusion" && (
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
                                        The liability root is anchored in the Algorand registry and is
                                        independently verifiable.
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
            )}

            {/* ============================================================
                Tab 2 — Stored Record Verification
            ============================================================ */}
            {tab === "record" && (
                <div className="grid gap-8 lg:grid-cols-12">
                    {/* Form */}
                    <div className="lg:col-span-7 space-y-6">
                        <SpotlightCard
                            spotlightColor="rgba(99,102,241,0.1)"
                            className="bg-card/80 border-border animate-fade-in"
                        >
                            <div className="p-6 space-y-4">
                                <h2 className="font-display font-medium flex items-center gap-2">
                                    <Database size={16} className="text-indigo-400" />
                                    Registry Record Check
                                </h2>

                                {/* Entity ID */}
                                <div>
                                    <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                                        Entity ID <span className="text-destructive">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={recEntityId}
                                        onChange={(e) => setRecEntityId(e.target.value)}
                                        placeholder="e.g. demo-exchange"
                                        className="w-full h-11 px-4 rounded-lg border border-border bg-secondary/30 text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400/50 transition-all"
                                    />
                                </div>

                                {/* Epoch ID */}
                                <div>
                                    <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                                        Epoch ID <span className="text-destructive">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={recEpochIdInput}
                                        onChange={(e) => setRecEpochIdInput(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleRecVerify()}
                                        placeholder="e.g. 42"
                                        min={1}
                                        className="w-full h-11 px-4 rounded-lg border border-border bg-secondary/30 text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400/50 transition-all"
                                    />
                                </div>

                                <div className="flex items-center gap-3 pt-1">
                                    <button
                                        onClick={handleRecVerify}
                                        disabled={
                                            !recEntityId.trim() ||
                                            !recEpochIdInput.trim() ||
                                            isRecVerifying
                                        }
                                        className="flex-1 btn-primary justify-center h-11 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isRecVerifying ? (
                                            <>
                                                <Loader2 size={15} className="animate-spin" />
                                                Verifying…
                                            </>
                                        ) : (
                                            <>
                                                <Database size={15} />
                                                Verify Record
                                            </>
                                        )}
                                    </button>
                                    <button onClick={handleRecClear} className="btn-secondary h-11">
                                        <Trash2 size={15} />
                                        Clear
                                    </button>
                                </div>
                            </div>
                        </SpotlightCard>

                        {/* Error */}
                        {recError && (
                            <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 flex items-center gap-3 text-sm animate-fade-in">
                                <XCircle size={18} className="text-destructive shrink-0" />
                                <p className="text-destructive">{recError}</p>
                            </div>
                        )}

                        {/* Result */}
                        {recResult && (
                            <SpotlightCard
                                spotlightColor={
                                    !recResult.exists
                                        ? "rgba(239,68,68,0.1)"
                                        : recResult.matches
                                        ? "rgba(74,222,128,0.15)"
                                        : "rgba(234,179,8,0.15)"
                                }
                                className={`border-2 animate-fade-in ${
                                    !recResult.exists
                                        ? "border-destructive/50 bg-destructive/5"
                                        : recResult.matches
                                        ? "border-success/50 bg-success/5"
                                        : "border-yellow-500/50 bg-yellow-500/5"
                                }`}
                            >
                                <div className="p-6 space-y-5">
                                    {/* Verdict */}
                                    <div className="flex items-start gap-4">
                                        <div
                                            className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                                !recResult.exists
                                                    ? "bg-destructive/20"
                                                    : recResult.matches
                                                    ? "bg-success/20"
                                                    : "bg-yellow-500/20"
                                            }`}
                                        >
                                            {!recResult.exists ? (
                                                <XCircle size={24} className="text-destructive" />
                                            ) : recResult.matches ? (
                                                <CheckCircle2 size={24} className="text-success" />
                                            ) : (
                                                <XCircle size={24} className="text-yellow-500" />
                                            )}
                                        </div>
                                        <div>
                                            <h3
                                                className={`font-display text-xl font-semibold ${
                                                    !recResult.exists
                                                        ? "text-destructive"
                                                        : recResult.matches
                                                        ? "text-success"
                                                        : "text-yellow-500"
                                                }`}
                                            >
                                                {!recResult.exists
                                                    ? "✗ NOT FOUND"
                                                    : recResult.matches
                                                    ? "✓ VERIFIED"
                                                    : "⚠ MISMATCH"}
                                            </h3>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {!recResult.exists
                                                    ? "No on-chain record was found for this entity and epoch."
                                                    : recResult.matches
                                                    ? "The on-chain registry record matches the backend-computed state."
                                                    : "The on-chain record exists but differs from the backend-computed state."}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Mismatches */}
                                    {recResult.mismatches.length > 0 && (
                                        <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm">
                                            <p className="font-medium text-yellow-600 mb-1">
                                                Mismatched fields:
                                            </p>
                                            <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                                                {recResult.mismatches.map((f) => (
                                                    <li key={f} className="font-mono text-xs">
                                                        {f}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Record metadata */}
                                    {recResult.record && (
                                        <div className="space-y-3 text-sm">
                                            <p className="text-xs text-muted-foreground uppercase tracking-wider">
                                                Record Metadata
                                            </p>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="p-3 rounded-lg bg-secondary/30 border border-border">
                                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                                                        Epoch
                                                    </p>
                                                    <p className="font-mono font-medium">
                                                        #{recResult.record.epoch_id}
                                                    </p>
                                                </div>
                                                <div className="p-3 rounded-lg bg-secondary/30 border border-border">
                                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                                                        Health
                                                    </p>
                                                    <p className="font-mono font-medium">
                                                        {recResult.record.health_status}
                                                    </p>
                                                </div>
                                                <div className="p-3 rounded-lg bg-secondary/30 border border-border">
                                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                                                        Recorded
                                                    </p>
                                                    <p className="text-xs">
                                                        {new Date(
                                                            recResult.record.timestamp * 1000
                                                        ).toLocaleString()}
                                                    </p>
                                                </div>
                                                {recResult.record.anchored_at !== undefined && (
                                                    <div className="p-3 rounded-lg bg-secondary/30 border border-border">
                                                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                                                            Anchored
                                                        </p>
                                                        <p className="text-xs">
                                                            {new Date(
                                                                recResult.record.anchored_at * 1000
                                                            ).toLocaleString()}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <Hash size={13} className="text-muted-foreground" />
                                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">
                                                        Proof Hash
                                                    </p>
                                                </div>
                                                <p className="font-mono text-xs break-all bg-secondary/30 p-2 rounded-lg border border-border">
                                                    {recResult.record.proof_hash}
                                                </p>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <Hash size={13} className="text-muted-foreground" />
                                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">
                                                        Liability Root
                                                    </p>
                                                </div>
                                                <p className="font-mono text-xs break-all bg-secondary/30 p-2 rounded-lg border border-border">
                                                    {recResult.record.liability_root}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex gap-2 pt-1">
                                        <button
                                            onClick={handleCopyRecResult}
                                            className="flex-1 btn-secondary text-sm justify-center"
                                        >
                                            {recCopied ? <Check size={13} /> : <Copy size={13} />}
                                            {recCopied ? "Copied!" : "Copy Result"}
                                        </button>
                                        <button
                                            onClick={handleRecClear}
                                            className="btn-secondary text-sm"
                                        >
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
                        <div className="rounded-xl border border-border bg-card/50 p-6 animate-fade-in">
                            <div className="flex items-center gap-2 mb-4">
                                <Info size={15} className="text-indigo-400" />
                                <h3 className="font-medium">How Record Verification Works</h3>
                            </div>
                            <ul className="space-y-3 text-sm text-muted-foreground">
                                <li className="flex gap-2">
                                    <CheckCircle2 size={15} className="text-success mt-0.5 shrink-0" />
                                    <span>
                                        Each anchored epoch has a corresponding record in the Algorand
                                        registry.
                                    </span>
                                </li>
                                <li className="flex gap-2">
                                    <CheckCircle2 size={15} className="text-success mt-0.5 shrink-0" />
                                    <span>
                                        This check confirms that the on-chain record matches the
                                        backend-computed proof hash, liability root, and reserves total.
                                    </span>
                                </li>
                                <li className="flex gap-2">
                                    <CheckCircle2 size={15} className="text-success mt-0.5 shrink-0" />
                                    <span>
                                        A mismatch indicates that the on-chain record may have been
                                        tampered with or that the backend state is out of sync.
                                    </span>
                                </li>
                                <li className="flex gap-2">
                                    <CheckCircle2 size={15} className="text-success mt-0.5 shrink-0" />
                                    <span>
                                        "Not Found" means no on-chain record exists for that epoch —
                                        the epoch may not have been submitted to the registry yet.
                                    </span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
