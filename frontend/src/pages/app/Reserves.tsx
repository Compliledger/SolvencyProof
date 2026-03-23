import { useState, useEffect } from "react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { useSolvencyProof } from "@/hooks/useSolvencyProof";
import SpotlightCard from "@/components/reactbits/SpotlightCard";
import { Link } from "react-router-dom";
import { getEtherscanAddressUrl } from "@/lib/api/constants";
import {
    Wallet,
    RefreshCw,
    Loader2,
    CheckCircle2,
    ArrowRight,
    ExternalLink,
    Copy,
    Check,
} from "lucide-react";

interface ReserveAddress {
    address: string;
    balance: string;
    balanceWei: string;
}

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

export default function Reserves() {
    const [addresses, setAddresses] = useState<ReserveAddress[]>([]);
    const [reservesTotal, setReservesTotal] = useState<string>("0");
    const [reservesTotalEth, setReservesTotalEth] = useState<string>("0");
    const [epochId, setEpochId] = useState<string>("");
    const [chain, setChain] = useState<string>("sepolia");
    const [isScanning, setIsScanning] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [lastScan, setLastScan] = useState<Date | null>(null);

    const { getReserves, scanReserves, loading, error } = useSolvencyProof();

    const formatWei = (wei: string | undefined): string => {
        try {
            if (!wei || wei === '' || wei === 'undefined' || wei === 'null') return '0';
            // Remove any non-numeric characters
            const cleanWei = wei.toString().replace(/[^0-9]/g, '');
            if (!cleanWei || cleanWei === '') return '0';
            return BigInt(cleanWei).toLocaleString();
        } catch (e) {
            console.warn('[Reserves] formatWei failed for:', wei, e);
            return '0';
        }
    };

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const res = await getReserves();
            console.log("[Reserves] API response:", res);
            setAddresses(res.addresses || []);
            setChain(res.chain || "sepolia");
            setEpochId(res.epoch_id || "");
            
            // Calculate totals from addresses
            if (res.addresses && res.addresses.length > 0) {
                let totalWei = BigInt(0);
                res.addresses.forEach((addr: ReserveAddress) => {
                    try {
                        const weiStr = addr.balanceWei || '0';
                        const cleanWei = weiStr.toString().replace(/[^0-9]/g, '');
                        if (cleanWei) {
                            totalWei += BigInt(cleanWei);
                        }
                    } catch (e) {
                        console.warn('[Reserves] Failed to parse balance:', addr);
                    }
                });
                setReservesTotal(totalWei.toString());
                const ethValue = Number(totalWei) / 1e18;
                setReservesTotalEth(ethValue.toFixed(6));
            } else if (res.total_wei) {
                setReservesTotal(res.total_wei);
                setReservesTotalEth(res.total_eth || (Number(res.total_wei) / 1e18).toFixed(6));
            }
        } catch (err) {
            console.error("[Reserves] Failed to fetch:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleScan = async () => {
        setIsScanning(true);
        try {
            const res = await scanReserves();
            console.log("[Reserves] Scan response:", res);
            setLastScan(new Date());
            await fetchData();
        } catch (err) {
            console.error("[Reserves] Failed to scan:", err);
        } finally {
            setIsScanning(false);
        }
    };

    if (isLoading) {
        return (
            <PortalLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center space-y-4">
                        <Loader2 size={48} className="animate-spin mx-auto text-emerald-500" />
                        <p className="text-muted-foreground">Loading reserves data...</p>
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
                            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                <Wallet size={24} className="text-emerald-500" />
                            </div>
                            Reserve Addresses (On-Chain Balances)
                        </h1>
                        <p className="text-muted-foreground mt-1">Real ETH balances from {chain} blockchain</p>
                    </div>
                    <button
                        onClick={fetchData}
                        className="p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                    >
                        <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>

                {/* Scan Button */}
                <SpotlightCard spotlightColor="rgba(16, 185, 129, 0.1)" className="bg-card/80 border-border">
                    <div className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium mb-1">Refresh Blockchain Balances</h3>
                                <p className="text-sm text-muted-foreground">
                                    Scan reserve wallet addresses for current on-chain balances
                                </p>
                            </div>
                            <button
                                onClick={handleScan}
                                disabled={isScanning}
                                className="btn-primary bg-emerald-500 hover:bg-emerald-600"
                            >
                                {isScanning ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <RefreshCw size={16} />
                                )}
                                Refresh Balances
                            </button>
                        </div>
                        {lastScan && (
                            <p className="text-xs text-muted-foreground mt-3">
                                Last scan: {lastScan.toLocaleTimeString()}
                            </p>
                        )}
                    </div>
                </SpotlightCard>

                {/* Addresses Table */}
                {addresses.length > 0 && (
                    <div className="rounded-xl border border-border bg-card/50 overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border bg-secondary/30">
                                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">Address</th>
                                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">Balance (ETH)</th>
                                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">Balance (Wei)</th>
                                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">Explorer</th>
                                </tr>
                            </thead>
                            <tbody>
                                {addresses.map((addr) => (
                                    <tr
                                        key={addr.address}
                                        className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-sm">{addr.address.slice(0, 10)}...{addr.address.slice(-8)}</span>
                                                <CopyButton text={addr.address} />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-semibold text-success">{addr.balance || "0"} ETH</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-mono text-sm text-muted-foreground">{formatWei(addr.balanceWei)}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <a
                                                href={getEtherscanAddressUrl(addr.address)}
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
                    </div>
                )}

                {addresses.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        <Wallet size={48} className="mx-auto mb-4 opacity-50" />
                        <p>No reserve addresses found. Click "Refresh Balances" to scan.</p>
                    </div>
                )}

                {/* Summary */}
                <SpotlightCard spotlightColor="rgba(16, 185, 129, 0.15)" className="bg-card/95 border-border">
                    <div className="p-6">
                        <h3 className="font-medium mb-4 flex items-center gap-2">
                            <CheckCircle2 size={18} className="text-success" />
                            Reserves Summary
                        </h3>

                        <div className="grid md:grid-cols-4 gap-6 mb-6">
                            <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Reserves</p>
                                <p className="font-display text-2xl font-semibold text-success">{reservesTotalEth} ETH</p>
                            </div>
                            <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Wei</p>
                                <p className="font-mono text-sm">{formatWei(reservesTotal)}</p>
                            </div>
                            <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Chain</p>
                                <p className="font-medium capitalize">{chain} Testnet</p>
                            </div>
                            <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Addresses</p>
                                <p className="font-display text-2xl font-semibold">{addresses.length}</p>
                            </div>
                        </div>

                        <div className="p-4 rounded-lg bg-success/5 border border-success/20 mb-6">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 size={20} className="text-success" />
                                <span className="font-medium text-success">Reserves scanned from {chain} blockchain</span>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Link to="/proof" className="btn-primary">
                                Next: Generate Proof
                                <ArrowRight size={16} />
                            </Link>
                        </div>
                    </div>
                </SpotlightCard>
            </div>
        </PortalLayout>
    );
}
