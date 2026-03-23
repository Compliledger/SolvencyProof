import { useState } from "react";
import { mockReports, coverageRatio } from "@/lib/mock/reports";
import { formatRatio, formatUsd } from "@/lib/format";

function StatusBadge({ status }: { status: string }) {
  const isVerified = status === "Verified";
  return (
    <span className={isVerified ? "status-verified" : "status-pending"}>
      <span className={`h-1.5 w-1.5 rounded-full ${isVerified ? "bg-success" : "bg-warning"}`} />
      {status}
    </span>
  );
}

export function ReportsExplorerSection() {
  const [filter, setFilter] = useState<"all" | "verified">("all");

  const filtered = mockReports.filter((r) =>
    filter === "all" ? true : r.status === "Verified"
  );

  return (
    <section id="reports" className="py-28 lg:py-36 scroll-mt-24">
      <div className="container">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between mb-12">
          <div className="space-y-4 max-w-xl">
            <h2 className="font-display text-4xl font-medium tracking-tight md:text-5xl">
              Verification <span className="text-accent-cream">Reports</span>
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Browse cryptographic proof of reserves across all epochs.
            </p>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-1 p-1 glass-light rounded-lg">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${filter === "all"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("verified")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${filter === "verified"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              Verified
            </button>
          </div>
        </div>

        {/* Reports Table */}
        <div className="premium-card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-6 py-5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Report
                  </th>
                  <th className="px-6 py-5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Coverage
                  </th>
                  <th className="px-6 py-5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Reserves
                  </th>
                  <th className="px-6 py-5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Published
                  </th>
                  <th className="px-6 py-5 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">

                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map((report) => {
                  const ratio = coverageRatio(report);
                  return (
                    <tr
                      key={report.id}
                      className="group transition-colors hover:bg-secondary/30"
                    >
                      <td className="px-6 py-5">
                        <span className="font-display font-medium text-foreground">
                          {report.id}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <StatusBadge status={report.status} />
                      </td>
                      <td className="px-6 py-5">
                        <span className={`font-display text-lg font-medium ${ratio >= 1 ? "text-success" : "text-warning"
                          }`}>
                          {formatRatio(ratio)}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-sm text-muted-foreground">
                        {formatUsd(report.reservesTotal)}
                      </td>
                      <td className="px-6 py-5 text-sm text-muted-foreground">
                        {new Date(report.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                          View →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border bg-secondary/20">
            <p className="text-xs text-muted-foreground">
              Showing {filtered.length} of {mockReports.length} reports
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
