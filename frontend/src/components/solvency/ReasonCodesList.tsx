// ReasonCodesList — renders the machine-readable reason codes returned by the
// backend financial evaluation engine. Positive codes (e.g. CAPITAL_BACKED)
// are shown in green; negative codes prefixed with NOT_ are shown in red.

import { Tag } from 'lucide-react';

interface ReasonCodesListProps {
    codes: string[] | undefined | null;
    className?: string;
}

function codeStyle(code: string): string {
    if (code.startsWith('NOT_')) {
        return 'bg-destructive/10 text-destructive border-destructive/20';
    }
    return 'bg-success/10 text-success border-success/20';
}

function codeLabel(code: string): string {
    return code.replace(/_/g, ' ');
}

export function ReasonCodesList({ codes, className = '' }: ReasonCodesListProps) {
    if (!codes || codes.length === 0) {
        return (
            <p className={`text-xs text-muted-foreground italic ${className}`}>
                No reason codes available.
            </p>
        );
    }

    return (
        <div className={`flex flex-wrap gap-2 ${className}`}>
            {codes.map((code) => (
                <span
                    key={code}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${codeStyle(code)}`}
                >
                    <Tag size={10} />
                    {codeLabel(code)}
                </span>
            ))}
        </div>
    );
}
