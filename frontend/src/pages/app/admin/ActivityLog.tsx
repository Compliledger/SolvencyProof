import { useState } from "react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import {
    Activity,
    Upload,
    Eye,
    Download,
    Shield,
    User,
    Clock,
    Filter,
    Search,
    ChevronDown,
    FileText,
    CheckCircle2,
    AlertCircle,
    RefreshCw
} from "lucide-react";

type ActivityType = "publish" | "view" | "download" | "verify" | "login" | "settings";

interface ActivityItem {
    id: string;
    type: ActivityType;
    user: string;
    userRole: string;
    action: string;
    target?: string;
    timestamp: string;
    status: "success" | "warning" | "error";
    details?: string;
}

const mockActivities: ActivityItem[] = [
    {
        id: "act-001",
        type: "publish",
        user: "admin@solvencyproof.com",
        userRole: "admin",
        action: "Published verification report",
        target: "epoch-2026-01-15-001",
        timestamp: "2026-01-15T10:30:00Z",
        status: "success",
        details: "Coverage ratio: 1.12×"
    },
    {
        id: "act-002",
        type: "verify",
        user: "user_48291@example.com",
        userRole: "user",
        action: "Verified inclusion proof",
        target: "epoch-2026-01-15-001",
        timestamp: "2026-01-15T11:45:00Z",
        status: "success",
        details: "Amount: $2,450.00"
    },
    {
        id: "act-003",
        type: "download",
        user: "auditor@external.com",
        userRole: "user",
        action: "Downloaded artifacts",
        target: "epoch-2026-01-15-001",
        timestamp: "2026-01-15T12:00:00Z",
        status: "success",
        details: "proof.json, public_signals.json"
    },
    {
        id: "act-004",
        type: "view",
        user: "operator@solvencyproof.com",
        userRole: "operator",
        action: "Viewed report details",
        target: "epoch-2026-01-08-001",
        timestamp: "2026-01-14T16:20:00Z",
        status: "success"
    },
    {
        id: "act-005",
        type: "verify",
        user: "user_99999@example.com",
        userRole: "user",
        action: "Failed inclusion verification",
        target: "epoch-2026-01-15-001",
        timestamp: "2026-01-14T14:30:00Z",
        status: "error",
        details: "Error: AMOUNT_MISMATCH"
    },
    {
        id: "act-006",
        type: "login",
        user: "admin@solvencyproof.com",
        userRole: "admin",
        action: "Logged in to portal",
        timestamp: "2026-01-14T09:00:00Z",
        status: "success",
        details: "IP: 192.168.1.100"
    },
    {
        id: "act-007",
        type: "settings",
        user: "admin@solvencyproof.com",
        userRole: "admin",
        action: "Updated verification settings",
        timestamp: "2026-01-13T15:45:00Z",
        status: "success",
        details: "Changed network to ethereum-mainnet"
    },
    {
        id: "act-008",
        type: "publish",
        user: "operator@solvencyproof.com",
        userRole: "operator",
        action: "Published verification report",
        target: "epoch-2026-01-08-001",
        timestamp: "2026-01-08T10:00:00Z",
        status: "success",
        details: "Coverage ratio: 1.08×"
    },
    {
        id: "act-009",
        type: "verify",
        user: "user_73842@example.com",
        userRole: "user",
        action: "Verified inclusion proof",
        target: "epoch-2026-01-08-001",
        timestamp: "2026-01-08T14:20:00Z",
        status: "success",
        details: "Amount: $15,780.50"
    },
    {
        id: "act-010",
        type: "download",
        user: "compliance@company.com",
        userRole: "user",
        action: "Downloaded report bundle",
        target: "epoch-2026-01-01-001",
        timestamp: "2026-01-07T11:30:00Z",
        status: "success",
        details: "Full artifact bundle"
    }
];

const getActivityIcon = (type: ActivityType) => {
    switch (type) {
        case "publish": return Upload;
        case "view": return Eye;
        case "download": return Download;
        case "verify": return Shield;
        case "login": return User;
        case "settings": return Activity;
        default: return FileText;
    }
};

const getActivityColor = (type: ActivityType) => {
    switch (type) {
        case "publish": return "text-blue-400 bg-blue-500/10";
        case "view": return "text-accent-cream bg-accent/10";
        case "download": return "text-purple-400 bg-purple-500/10";
        case "verify": return "text-success bg-success/10";
        case "login": return "text-cyan-400 bg-cyan-500/10";
        case "settings": return "text-amber-400 bg-amber-500/10";
        default: return "text-muted-foreground bg-secondary";
    }
};

const formatTimestamp = (ts: string) => {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
};

export default function ActivityLog() {
    const [filter, setFilter] = useState<ActivityType | "all">("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [isRefreshing, setIsRefreshing] = useState(false);

    const filteredActivities = mockActivities.filter(activity => {
        const matchesFilter = filter === "all" || activity.type === filter;
        const matchesSearch =
            activity.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
            activity.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (activity.target?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
        return matchesFilter && matchesSearch;
    });

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsRefreshing(false);
    };

    const stats = {
        total: mockActivities.length,
        today: mockActivities.filter(a => {
            const date = new Date(a.timestamp);
            const today = new Date();
            return date.toDateString() === today.toDateString();
        }).length,
        errors: mockActivities.filter(a => a.status === "error").length,
        publishes: mockActivities.filter(a => a.type === "publish").length
    };

    return (
        <PortalLayout>
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 animate-fade-in">
                    <div className="space-y-1">
                        <h1 className="font-display text-3xl font-semibold">Activity Log</h1>
                        <p className="text-muted-foreground">
                            Monitor all portal activity and audit events.
                        </p>
                    </div>

                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="btn-secondary self-start lg:self-auto"
                    >
                        <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
                        {isRefreshing ? "Refreshing..." : "Refresh"}
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-4 animate-fade-in">
                    <div className="rounded-xl border border-border bg-card/50 p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                                <Activity size={20} className="text-accent-cream" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.total}</p>
                                <p className="text-xs text-muted-foreground">Total Events</p>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-xl border border-border bg-card/50 p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                <Clock size={20} className="text-blue-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.today}</p>
                                <p className="text-xs text-muted-foreground">Today</p>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-xl border border-border bg-card/50 p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                                <Upload size={20} className="text-success" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.publishes}</p>
                                <p className="text-xs text-muted-foreground">Reports Published</p>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-xl border border-border bg-card/50 p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                                <AlertCircle size={20} className="text-destructive" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.errors}</p>
                                <p className="text-xs text-muted-foreground">Errors</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-4 animate-fade-in">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search by user, action, or target..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-lg bg-secondary/50 border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
                        />
                    </div>

                    {/* Type Filter */}
                    <div className="flex items-center gap-2">
                        <Filter size={16} className="text-muted-foreground" />
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value as ActivityType | "all")}
                            className="px-3 py-2 rounded-lg bg-secondary/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                        >
                            <option value="all">All Types</option>
                            <option value="publish">Publish</option>
                            <option value="verify">Verify</option>
                            <option value="view">View</option>
                            <option value="download">Download</option>
                            <option value="login">Login</option>
                            <option value="settings">Settings</option>
                        </select>
                    </div>

                    <p className="text-sm text-muted-foreground">
                        {filteredActivities.length} event{filteredActivities.length !== 1 ? 's' : ''}
                    </p>
                </div>

                {/* Activity List */}
                <div className="rounded-xl border border-border bg-card/50 overflow-hidden animate-fade-in">
                    <div className="divide-y divide-border">
                        {filteredActivities.map((activity) => {
                            const Icon = getActivityIcon(activity.type);
                            const colorClass = getActivityColor(activity.type);

                            return (
                                <div
                                    key={activity.id}
                                    className="p-4 hover:bg-secondary/20 transition-colors"
                                >
                                    <div className="flex items-start gap-4">
                                        {/* Icon */}
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                                            <Icon size={20} />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <p className="font-medium text-sm">
                                                        {activity.action}
                                                        {activity.target && (
                                                            <a
                                                                href={`/app/reports/${activity.target}`}
                                                                className="ml-2 text-accent hover:underline font-mono text-xs"
                                                            >
                                                                {activity.target}
                                                            </a>
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        <span className="font-medium">{activity.user}</span>
                                                        <span className="mx-2">•</span>
                                                        <span className={`capitalize ${
                                                            activity.userRole === "admin" ? "text-amber-400" :
                                                            activity.userRole === "operator" ? "text-blue-400" :
                                                            "text-muted-foreground"
                                                        }`}>
                                                            {activity.userRole}
                                                        </span>
                                                    </p>
                                                </div>

                                                <div className="text-right shrink-0">
                                                    <div className="flex items-center gap-2">
                                                        {activity.status === "success" && (
                                                            <CheckCircle2 size={14} className="text-success" />
                                                        )}
                                                        {activity.status === "error" && (
                                                            <AlertCircle size={14} className="text-destructive" />
                                                        )}
                                                        <span className="text-xs text-muted-foreground">
                                                            {formatTimestamp(activity.timestamp)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {activity.details && (
                                                <p className="text-xs text-muted-foreground mt-2 p-2 rounded bg-secondary/30">
                                                    {activity.details}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {filteredActivities.length === 0 && (
                        <div className="p-12 text-center">
                            <Activity size={48} className="text-muted-foreground/30 mx-auto mb-4" />
                            <p className="text-muted-foreground">No activities match your filters.</p>
                        </div>
                    )}
                </div>

                {/* Load More */}
                {filteredActivities.length > 0 && (
                    <div className="text-center animate-fade-in">
                        <button className="btn-secondary">
                            <ChevronDown size={16} />
                            Load More
                        </button>
                    </div>
                )}
            </div>
        </PortalLayout>
    );
}
