import { useState } from "react";

type TabKey = "exchanges" | "custodians" | "funds" | "lending";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "exchanges", label: "Exchanges" },
  { key: "custodians", label: "Custodians" },
  { key: "funds", label: "Funds" },
  { key: "lending", label: "Lending" },
];

const content: Record<TabKey, { risk: string; verified: string; reporting: string }> = {
  exchanges: {
    risk: "Reduce counterparty risk during volatile market cycles with real-time verification.",
    verified: "Coverage ratio and publication history with reproducible cryptographic artifacts.",
    reporting: "Fast stakeholder reporting without exposing sensitive balance information.",
  },
  custodians: {
    risk: "Demonstrate operational integrity and reserve posture to institutional clients.",
    verified: "Reserve snapshots bound to liabilities commitments for consistent verification.",
    reporting: "Audit-friendly reporting structure ready for export and regulatory review.",
  },
  funds: {
    risk: "Improve investor confidence with verifiable reserve coverage across all holdings.",
    verified: "Repeatable reporting cadence across epochs with stable data schema.",
    reporting: "Credible artifacts for internal governance and external review workflows.",
  },
  lending: {
    risk: "Lower exposure by validating reserve coverage continuously over time.",
    verified: "Verification summary checkable by observers without privileged access.",
    reporting: "Fast, structured updates for risk teams and key stakeholders.",
  },
};

export function UseCasesSection() {
  const [active, setActive] = useState<TabKey>("exchanges");
  const c = content[active];

  return (
    <section className="py-28 lg:py-36 border-t border-border">
      <div className="container">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <h2 className="font-display text-4xl font-medium tracking-tight md:text-5xl mb-6">
            Built for <span className="text-accent-cream">enterprise</span>
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Verification solutions for organizations managing digital assets.
          </p>
        </div>

        <div className="grid gap-12 lg:grid-cols-12">
          {/* Tab Navigation */}
          <div className="lg:col-span-4">
            <div className="space-y-2">
              {tabs.map((t) => {
                const isActive = t.key === active;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setActive(t.key)}
                    className={`w-full text-left px-6 py-4 rounded-lg transition-all duration-200 ${isActive
                      ? "bg-accent/10 border border-accent/30"
                      : "border border-transparent hover:bg-secondary/50"
                      }`}
                  >
                    <span className={`font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content Panel */}
          <div className="lg:col-span-8">
            <div className="premium-card">
              <div className="grid gap-8 md:grid-cols-3">
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Risk Reduction</p>
                  <p className="text-sm text-foreground leading-relaxed">{c.risk}</p>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">What's Verified</p>
                  <p className="text-sm text-foreground leading-relaxed">{c.verified}</p>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Reporting</p>
                  <p className="text-sm text-foreground leading-relaxed">{c.reporting}</p>
                </div>
              </div>

              {/* CTA */}
              <div className="mt-10 pt-8 border-t border-border flex flex-wrap gap-4">
                <button
                  className="btn-primary"
                  onClick={() => document.getElementById("reports")?.scrollIntoView({ behavior: "smooth" })}
                >
                  See Example Report
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}
                >
                  Contact Sales
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
