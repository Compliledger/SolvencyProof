import type { HealthStatus } from '@/lib/types';

interface HealthStatusBadgeProps {
    status: HealthStatus;
    showDot?: boolean;
    className?: string;
}

const STATUS_CONFIG: Record<
    HealthStatus,
    { label: string; dot: string; bg: string; text: string; border: string }
> = {
    HEALTHY: {
        label: 'Healthy',
        dot: 'bg-green-500',
        bg: 'bg-green-500/10',
        text: 'text-green-500',
        border: 'border-green-500/20',
    },
    LIQUIDITY_STRESSED: {
        label: 'Liquidity Stressed',
        dot: 'bg-yellow-500',
        bg: 'bg-yellow-500/10',
        text: 'text-yellow-500',
        border: 'border-yellow-500/20',
    },
    UNDERCOLLATERALIZED: {
        label: 'Undercollateralized',
        dot: 'bg-orange-500',
        bg: 'bg-orange-500/10',
        text: 'text-orange-500',
        border: 'border-orange-500/20',
    },
    CRITICAL: {
        label: 'Critical',
        dot: 'bg-red-500',
        bg: 'bg-red-500/10',
        text: 'text-red-500',
        border: 'border-red-500/20',
    },
    EXPIRED: {
        label: 'Expired',
        dot: 'bg-gray-400',
        bg: 'bg-gray-400/10',
        text: 'text-gray-400',
        border: 'border-gray-400/20',
    },
};

export function HealthStatusBadge({ status, showDot = true, className = '' }: HealthStatusBadgeProps) {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.EXPIRED;
    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.text} ${cfg.border} ${className}`}
        >
            {showDot && (
                <span className="relative flex h-2 w-2">
                    <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${cfg.dot} opacity-75`} />
                    <span className={`relative inline-flex h-2 w-2 rounded-full ${cfg.dot}`} />
                </span>
            )}
            {cfg.label}
        </span>
    );
}
