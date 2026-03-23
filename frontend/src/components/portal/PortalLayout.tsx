import { PropsWithChildren } from "react";
import { Link, useLocation } from "react-router-dom";
import logo from "@/assets/solvencyproof-logo.png";
import Aurora from "@/components/reactbits/Aurora";
import {
    LayoutDashboard,
    FileText,
    Search,
    ArrowLeft,
    Shield,
    ExternalLink,
    Github,
    Zap,
    GitBranch,
    Wallet,
    Lock,
    Trophy,
    type LucideIcon
} from "lucide-react";

type NavItem = {
    label: string;
    href: string;
    icon: LucideIcon;
};

const navItems: NavItem[] = [
    { label: "Dashboard", href: "/verify", icon: LayoutDashboard },
    { label: "Sessions", href: "/yellow", icon: Zap },
    { label: "Liabilities", href: "/liabilities", icon: GitBranch },
    { label: "Reserves", href: "/reserves", icon: Wallet },
    { label: "Generate Proof", href: "/proof", icon: Lock },
    { label: "Summary", href: "/summary", icon: Trophy },
];

export function PortalLayout({ children }: PropsWithChildren) {
    const location = useLocation();

    const getPageTitle = () => {
        if (location.pathname === "/verify" || location.pathname === "/app") return "Dashboard";
        if (location.pathname === "/yellow") return "Trading Sessions";
        if (location.pathname === "/liabilities") return "User Liabilities";
        if (location.pathname === "/reserves") return "Reserve Verification";
        if (location.pathname === "/proof") return "Proof Generation";
        if (location.pathname === "/summary") return "Summary";
        if (location.pathname === "/proofs" || location.pathname === "/app/reports") return "All Proofs";
        if (location.pathname.startsWith("/proofs/") || location.pathname.startsWith("/app/reports/")) return "Proof Details";
        if (location.pathname === "/inclusion" || location.pathname === "/app/inclusion") return "Verify Inclusion";
        return "SolvencyProof";
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex">
            {/* Aurora Background */}
            <div className="fixed inset-0 z-0 pointer-events-none opacity-30">
                <Aurora
                    colorStops={["#444444", "#888888", "#E0E0E0", "#B0B0B0"]}
                    blend={0.3}
                    amplitude={0.8}
                    speed={0.2}
                />
            </div>

            {/* Sidebar */}
            <aside className="fixed left-0 top-0 h-full w-64 border-r border-border/50 bg-gradient-to-b from-card/95 to-card/80 backdrop-blur-md z-40 flex flex-col">
                {/* Logo */}
                <div className="p-6 border-b border-border/50">
                    <Link to="/" className="flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center border border-accent/20">
                            <img src={logo} alt="SolvencyProof" className="h-6 w-auto" />
                        </div>
                        <div>
                            <span className="font-display text-sm font-semibold block">SolvencyProof</span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Proof Verifier</span>
                        </div>
                    </Link>
                </div>

                {/* Public Badge */}
                <div className="p-4 border-b border-border/50">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-success/5 border border-success/20">
                        <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                            <Shield size={20} className="text-success" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">Public Verifier</p>
                            <p className="text-[10px] text-muted-foreground">No login required</p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider px-3 mb-3">Verification Flow</p>
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.href ||
                            (item.href === "/verify" && location.pathname === "/app");
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                to={item.href}
                                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
                                    ? "bg-accent/15 text-foreground border border-accent/30 shadow-sm"
                                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50 hover:border-border/50 border border-transparent"
                                    }`}
                            >
                                <Icon size={18} className={isActive ? "text-accent" : ""} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-border/50 space-y-1.5">
                    {/* <a
                        href="https://github.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-all rounded-lg w-full"
                    >
                        <Github size={16} />
                        View Source
                        <ExternalLink size={12} className="ml-auto opacity-50" />
                    </a> */}
                    <Link
                        to="/"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-all rounded-lg w-full"
                    >
                        <ArrowLeft size={16} />
                        Back to Home
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-64 relative z-10">
                {/* Top Bar */}
                <div className="sticky top-0 z-20 border-b border-border/50 bg-background/80 backdrop-blur-md">
                    <div className="flex items-center justify-between px-8 py-4">
                        <div className="flex items-center gap-2">
                            <Shield size={16} className="text-success" />
                            <span className="text-sm font-medium">{getPageTitle()}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground">Sepolia Testnet</span>
                            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                        </div>
                    </div>
                </div>
                <div className="min-h-screen p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
