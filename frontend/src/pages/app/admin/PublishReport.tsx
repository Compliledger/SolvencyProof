import { useState } from "react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import SpotlightCard from "@/components/reactbits/SpotlightCard";
import {
    Upload,
    FileJson,
    Shield,
    CheckCircle2,
    AlertCircle,
    RefreshCw,
    Calendar,
    Hash,
    DollarSign,
    FileText,
    Eye,
    X
} from "lucide-react";

type PublishStep = "upload" | "review" | "confirm" | "publishing" | "complete";

interface DraftReport {
    reportId: string;
    epochTimestamp: string;
    reservesTotal: string;
    liabilitiesTotal: string;
    coverageRatio: number;
    liabilitiesRoot: string;
    verificationMethod: string;
    network: string;
    notes: string;
}

const generateReportId = () => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    return `epoch-${dateStr}-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`;
};

const generateMockHash = () => {
    const chars = '0123456789abcdef';
    let hash = '0x';
    for (let i = 0; i < 64; i++) {
        hash += chars[Math.floor(Math.random() * chars.length)];
    }
    return hash;
};

export default function PublishReport() {
    const [step, setStep] = useState<PublishStep>("upload");
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [draftReport, setDraftReport] = useState<DraftReport | null>(null);
    const [errors, setErrors] = useState<string[]>([]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setUploadedFile(file);
            // Simulate parsing the file
            setTimeout(() => {
                const mockDraft: DraftReport = {
                    reportId: generateReportId(),
                    epochTimestamp: new Date().toISOString(),
                    reservesTotal: "128500000.00",
                    liabilitiesTotal: "112800000.00",
                    coverageRatio: 1.139,
                    liabilitiesRoot: generateMockHash(),
                    verificationMethod: "GROTH16_BN254",
                    network: "ethereum-mainnet",
                    notes: "Weekly solvency verification report"
                };
                setDraftReport(mockDraft);
                setStep("review");
            }, 1000);
        }
    };

    const handleManualEntry = () => {
        const mockDraft: DraftReport = {
            reportId: generateReportId(),
            epochTimestamp: new Date().toISOString(),
            reservesTotal: "",
            liabilitiesTotal: "",
            coverageRatio: 0,
            liabilitiesRoot: generateMockHash(),
            verificationMethod: "GROTH16_BN254",
            network: "ethereum-mainnet",
            notes: ""
        };
        setDraftReport(mockDraft);
        setStep("review");
    };

    const validateReport = (): boolean => {
        const newErrors: string[] = [];
        if (!draftReport) return false;

        if (!draftReport.reservesTotal || parseFloat(draftReport.reservesTotal) <= 0) {
            newErrors.push("Reserves total must be greater than 0");
        }
        if (!draftReport.liabilitiesTotal || parseFloat(draftReport.liabilitiesTotal) <= 0) {
            newErrors.push("Liabilities total must be greater than 0");
        }
        if (parseFloat(draftReport.reservesTotal) < parseFloat(draftReport.liabilitiesTotal)) {
            newErrors.push("Warning: Reserves are less than liabilities (coverage < 1.0)");
        }

        setErrors(newErrors);
        return newErrors.filter(e => !e.startsWith("Warning")).length === 0;
    };

    const handlePublish = async () => {
        if (!validateReport()) return;

        setStep("publishing");
        // Simulate publishing
        await new Promise(resolve => setTimeout(resolve, 3000));
        setStep("complete");
    };

    const resetForm = () => {
        setStep("upload");
        setUploadedFile(null);
        setDraftReport(null);
        setErrors([]);
    };

    const updateDraft = (field: keyof DraftReport, value: string) => {
        if (!draftReport) return;
        const updated = { ...draftReport, [field]: value };
        if (field === "reservesTotal" || field === "liabilitiesTotal") {
            const reserves = parseFloat(updated.reservesTotal) || 0;
            const liabilities = parseFloat(updated.liabilitiesTotal) || 0;
            updated.coverageRatio = liabilities > 0 ? reserves / liabilities : 0;
        }
        setDraftReport(updated);
    };

    return (
        <PortalLayout>
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="space-y-2 animate-fade-in">
                    <h1 className="font-display text-3xl font-semibold">Publish Report</h1>
                    <p className="text-muted-foreground">
                        Create and publish a new solvency verification report.
                    </p>
                </div>

                {/* Progress Steps */}
                <div className="flex items-center gap-4 animate-fade-in">
                    {["upload", "review", "confirm", "complete"].map((s, idx) => (
                        <div key={s} className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                                step === s || (step === "publishing" && s === "confirm")
                                    ? "bg-blue-500 text-white"
                                    : step === "complete" || ["upload", "review", "confirm"].indexOf(step) > idx
                                    ? "bg-success text-white"
                                    : "bg-secondary text-muted-foreground"
                            }`}>
                                {step === "complete" || ["upload", "review", "confirm"].indexOf(step) > idx ? (
                                    <CheckCircle2 size={16} />
                                ) : (
                                    idx + 1
                                )}
                            </div>
                            <span className={`text-sm ${step === s ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                                {s.charAt(0).toUpperCase() + s.slice(1)}
                            </span>
                            {idx < 3 && <div className="w-12 h-px bg-border" />}
                        </div>
                    ))}
                </div>

                {/* Step Content */}
                {step === "upload" && (
                    <div className="grid gap-6 md:grid-cols-2 animate-fade-in">
                        {/* Upload File */}
                        <SpotlightCard
                            spotlightColor="rgba(59, 130, 246, 0.1)"
                            className="bg-card/50 border-border"
                        >
                            <label className="block p-8 cursor-pointer">
                                <input
                                    type="file"
                                    accept=".json"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                                <div className="text-center">
                                    <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                                        <Upload size={28} className="text-blue-400" />
                                    </div>
                                    <h3 className="font-display font-medium mb-2">Upload Report JSON</h3>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Upload a pre-generated report file from your verification pipeline.
                                    </p>
                                    <span className="text-xs text-blue-400">
                                        Accepts .json files
                                    </span>
                                </div>
                            </label>
                        </SpotlightCard>

                        {/* Manual Entry */}
                        <SpotlightCard
                            spotlightColor="rgba(236, 223, 204, 0.1)"
                            className="bg-card/50 border-border"
                        >
                            <button
                                onClick={handleManualEntry}
                                className="block p-8 w-full text-left"
                            >
                                <div className="text-center">
                                    <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                                        <FileText size={28} className="text-accent-cream" />
                                    </div>
                                    <h3 className="font-display font-medium mb-2">Manual Entry</h3>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Enter report data manually for quick verification.
                                    </p>
                                    <span className="text-xs text-accent-cream">
                                        Recommended for testing
                                    </span>
                                </div>
                            </button>
                        </SpotlightCard>
                    </div>
                )}

                {step === "review" && draftReport && (
                    <div className="space-y-6 animate-fade-in">
                        {/* Report ID & Timestamp */}
                        <div className="rounded-xl border border-border bg-card/50 p-6">
                            <h2 className="font-display font-medium mb-4">Report Metadata</h2>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Report ID</label>
                                    <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30 border border-border">
                                        <Hash size={16} className="text-muted-foreground" />
                                        <span className="font-mono text-sm">{draftReport.reportId}</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Epoch Timestamp</label>
                                    <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30 border border-border">
                                        <Calendar size={16} className="text-muted-foreground" />
                                        <span className="text-sm">{new Date(draftReport.epochTimestamp).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Financial Data */}
                        <div className="rounded-xl border border-border bg-card/50 p-6">
                            <h2 className="font-display font-medium mb-4">Financial Data</h2>
                            <div className="grid gap-4 md:grid-cols-3">
                                <div>
                                    <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Total Reserves</label>
                                    <div className="relative">
                                        <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                        <input
                                            type="number"
                                            value={draftReport.reservesTotal}
                                            onChange={(e) => updateDraft("reservesTotal", e.target.value)}
                                            placeholder="0.00"
                                            className="w-full pl-9 pr-4 py-3 rounded-lg bg-secondary/30 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Total Liabilities</label>
                                    <div className="relative">
                                        <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                        <input
                                            type="number"
                                            value={draftReport.liabilitiesTotal}
                                            onChange={(e) => updateDraft("liabilitiesTotal", e.target.value)}
                                            placeholder="0.00"
                                            className="w-full pl-9 pr-4 py-3 rounded-lg bg-secondary/30 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Coverage Ratio</label>
                                    <div className={`p-3 rounded-lg border text-center font-display text-2xl font-bold ${
                                        draftReport.coverageRatio >= 1
                                            ? "bg-success/10 border-success/30 text-success"
                                            : "bg-destructive/10 border-destructive/30 text-destructive"
                                    }`}>
                                        {draftReport.coverageRatio.toFixed(3)}×
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Cryptographic Data */}
                        <div className="rounded-xl border border-border bg-card/50 p-6">
                            <h2 className="font-display font-medium mb-4">Cryptographic Data</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Liabilities Root Hash</label>
                                    <code className="block p-3 rounded-lg bg-secondary/30 border border-border text-xs font-mono text-muted-foreground break-all">
                                        {draftReport.liabilitiesRoot}
                                    </code>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Verification Method</label>
                                        <select
                                            value={draftReport.verificationMethod}
                                            onChange={(e) => updateDraft("verificationMethod", e.target.value)}
                                            className="w-full p-3 rounded-lg bg-secondary/30 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                        >
                                            <option value="GROTH16_BN254">Groth16 (BN254)</option>
                                            <option value="PLONK_BN254">PLONK (BN254)</option>
                                            <option value="STARK">STARK</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Network</label>
                                        <select
                                            value={draftReport.network}
                                            onChange={(e) => updateDraft("network", e.target.value)}
                                            className="w-full p-3 rounded-lg bg-secondary/30 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                        >
                                            <option value="ethereum-mainnet">Ethereum Mainnet</option>
                                            <option value="ethereum-sepolia">Ethereum Sepolia</option>
                                            <option value="polygon-mainnet">Polygon Mainnet</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="rounded-xl border border-border bg-card/50 p-6">
                            <h2 className="font-display font-medium mb-4">Notes</h2>
                            <textarea
                                value={draftReport.notes}
                                onChange={(e) => updateDraft("notes", e.target.value)}
                                placeholder="Optional notes about this report..."
                                className="w-full p-3 rounded-lg bg-secondary/30 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none h-24"
                            />
                        </div>

                        {/* Errors */}
                        {errors.length > 0 && (
                            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                                <div className="flex items-start gap-3">
                                    <AlertCircle size={20} className="text-destructive shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-medium text-destructive mb-2">Validation Issues</h4>
                                        <ul className="space-y-1">
                                            {errors.map((err, idx) => (
                                                <li key={idx} className={`text-sm ${err.startsWith("Warning") ? "text-yellow-500" : "text-destructive"}`}>
                                                    {err}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-4">
                            <button onClick={resetForm} className="btn-secondary">
                                <X size={16} />
                                Cancel
                            </button>
                            <button onClick={() => setStep("confirm")} className="btn-primary flex-1 justify-center">
                                <Eye size={16} />
                                Review & Confirm
                            </button>
                        </div>
                    </div>
                )}

                {step === "confirm" && draftReport && (
                    <div className="space-y-6 animate-fade-in">
                        <SpotlightCard
                            spotlightColor="rgba(59, 130, 246, 0.1)"
                            className="bg-card/50 border-border"
                        >
                            <div className="p-8 text-center">
                                <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-6">
                                    <Shield size={40} className="text-blue-400" />
                                </div>
                                <h2 className="font-display text-2xl font-semibold mb-2">Confirm Publication</h2>
                                <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                                    You are about to publish report <code className="px-2 py-1 rounded bg-secondary text-accent-cream font-mono text-sm">{draftReport.reportId}</code>.
                                    This action cannot be undone.
                                </p>

                                <div className="grid gap-4 md:grid-cols-3 mb-8 text-left">
                                    <div className="p-4 rounded-lg bg-secondary/30">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Reserves</p>
                                        <p className="font-display text-lg font-semibold text-success">
                                            ${parseFloat(draftReport.reservesTotal).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-secondary/30">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Liabilities</p>
                                        <p className="font-display text-lg font-semibold">
                                            ${parseFloat(draftReport.liabilitiesTotal).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-secondary/30">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Coverage</p>
                                        <p className="font-display text-lg font-semibold text-accent-cream">
                                            {draftReport.coverageRatio.toFixed(3)}×
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-center gap-4">
                                    <button onClick={() => setStep("review")} className="btn-secondary">
                                        Back to Edit
                                    </button>
                                    <button onClick={handlePublish} className="btn-primary">
                                        <Upload size={16} />
                                        Publish Report
                                    </button>
                                </div>
                            </div>
                        </SpotlightCard>
                    </div>
                )}

                {step === "publishing" && (
                    <div className="animate-fade-in">
                        <SpotlightCard
                            spotlightColor="rgba(59, 130, 246, 0.1)"
                            className="bg-card/50 border-border"
                        >
                            <div className="p-12 text-center">
                                <RefreshCw size={48} className="text-blue-400 animate-spin mx-auto mb-6" />
                                <h2 className="font-display text-2xl font-semibold mb-2">Publishing Report...</h2>
                                <p className="text-muted-foreground">
                                    Generating proof and anchoring to blockchain. This may take a moment.
                                </p>
                            </div>
                        </SpotlightCard>
                    </div>
                )}

                {step === "complete" && draftReport && (
                    <div className="animate-fade-in">
                        <SpotlightCard
                            spotlightColor="rgba(74, 222, 128, 0.1)"
                            className="bg-card/50 border-success/30"
                        >
                            <div className="p-8 text-center">
                                <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
                                    <CheckCircle2 size={40} className="text-success" />
                                </div>
                                <h2 className="font-display text-2xl font-semibold mb-2 text-success">Report Published!</h2>
                                <p className="text-muted-foreground mb-8">
                                    Report <code className="px-2 py-1 rounded bg-secondary text-accent-cream font-mono text-sm">{draftReport.reportId}</code> has been successfully published.
                                </p>

                                <div className="flex items-center justify-center gap-4">
                                    <button onClick={resetForm} className="btn-secondary">
                                        Publish Another
                                    </button>
                                    <a href={`/app/reports/${draftReport.reportId}`} className="btn-primary">
                                        View Report
                                    </a>
                                </div>
                            </div>
                        </SpotlightCard>
                    </div>
                )}
            </div>
        </PortalLayout>
    );
}
