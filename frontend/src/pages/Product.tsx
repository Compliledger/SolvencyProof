import { useEffect, useRef } from "react";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import Aurora from "@/components/reactbits/Aurora";
import SpotlightCard from "@/components/reactbits/SpotlightCard";
import ShinyText from "@/components/reactbits/ShinyText";
import ScrollFloat from "@/components/reactbits/ScrollFloat";
import { useFirstVisit } from "@/hooks/useFirstVisit";

function FeatureGroup({ title, items, idx }: { title: string; items: string[]; idx: number }) {
  return (
    <SpotlightCard
      spotlightColor="rgba(255, 255, 255, 0.08)"
      className="bg-card/80 border-border animate-fade-in-up"
      style={{ animationDelay: `${idx * 100}ms` } as React.CSSProperties}
    >
      <div className="p-6">
        <span className="text-xs text-accent/60 font-medium">0{idx + 1}</span>
        <h3 className="font-display text-lg font-medium mt-2 mb-4">{title}</h3>
        <ul className="space-y-3 text-sm text-muted-foreground">
          {items.map((i) => (
            <li key={i} className="flex gap-3">
              <svg className="h-4 w-4 text-success shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{i}</span>
            </li>
          ))}
        </ul>
      </div>
    </SpotlightCard>
  );
}

export default function Product() {
  const { isFirstVisit, hasAnimated, markAsVisited } = useFirstVisit('product');
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isFirstVisit && !hasAnimated) {
      const timer = setTimeout(() => markAsVisited(), 2000);
      return () => clearTimeout(timer);
    }
  }, [isFirstVisit, hasAnimated, markAsVisited]);

  return (
    <MarketingLayout>
      {/* Hero Section with Aurora - Full Screen on First Visit */}
      <section
        ref={heroRef}
        className={`relative overflow-hidden transition-all duration-1000 ease-out ${
          isFirstVisit && !hasAnimated
            ? 'min-h-screen flex items-center'
            : 'min-h-[60vh]'
        }`}
      >
        <div className="absolute inset-0 z-0">
          <Aurora
            colorStops={["#FFFFFF", "#F0F0F0", "#E0E0E0", "#F5F5F5", "#FFFFFF"]}
            blend={0.6}
            amplitude={1.5}
            speed={0.4}
          />
        </div>
        <div className={`absolute inset-0 z-[1] transition-all duration-1000 ${
          isFirstVisit && !hasAnimated
            ? 'bg-gradient-to-b from-background/20 via-background/40 to-background/60'
            : 'bg-gradient-to-b from-background/40 via-background/70 to-background'
        }`} />

        <div className="container relative z-10 py-24 md:py-32">
          <div className="max-w-3xl space-y-6">
            <div className={`inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm transition-all duration-700 ${
              isFirstVisit && !hasAnimated ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
            }`} style={{ transitionDelay: '200ms' }}>
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Product Overview
            </div>

            <h1 className={`font-display text-5xl font-semibold tracking-tight md:text-6xl lg:text-7xl transition-all duration-700 ${
              isFirstVisit && !hasAnimated ? 'opacity-0 translate-y-8' : 'opacity-100 translate-y-0'
            }`} style={{ transitionDelay: '400ms' }}>
              Verification <br />
              <ShinyText
                text="Reports"
                shineColor="#ECDFCC"
                color="#E0E0E0"
                speed={3}
                className="font-display font-semibold"
              />
            </h1>

            <p className={`text-xl text-muted-foreground max-w-xl transition-all duration-700 ${
              isFirstVisit && !hasAnimated ? 'opacity-0 translate-y-6' : 'opacity-100 translate-y-0'
            }`} style={{ transitionDelay: '600ms' }}>
              Enterprise-grade solvency verification. Real-time coverage, historical epochs, exportable artifacts.
            </p>

            <div className={`flex flex-wrap gap-4 pt-4 transition-all duration-700 ${
              isFirstVisit && !hasAnimated ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
            }`} style={{ transitionDelay: '800ms' }}>
              <button
                onClick={() => (window.location.href = "/#reports")}
                className="btn-primary"
              >
                Explore Reports
              </button>
              <button
                onClick={() => (window.location.href = "/#contact")}
                className="btn-secondary"
              >
                Talk to Sales
              </button>
            </div>

            {/* Scroll indicator on first visit */}
            {isFirstVisit && !hasAnimated && (
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce opacity-60">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Core Capabilities */}
      <section className="py-20">
        <div className="container">
          <ScrollFloat
            containerClassName="mb-10"
            textClassName="font-display text-3xl font-semibold tracking-tight text-foreground"
          >
            Core Capabilities
          </ScrollFloat>
          <div className="grid gap-6 md:grid-cols-2">
            <FeatureGroup
              idx={0}
              title="Verification Reports"
              items={["Verified status, coverage ratio, and totals", "Historical timeline across epochs", "Stable fields for reproducible validation"]}
            />
            <FeatureGroup
              idx={1}
              title="Inclusion Checks"
              items={["Users confirm membership without exposing others", "Consistent UX for pass/fail results", "Designed for schema-driven proofs"]}
            />
            <FeatureGroup
              idx={2}
              title="Operational Workflows"
              items={["Operator-friendly publishing patterns", "Structured steps: prepare → verify → publish", "Ready to connect to real pipelines"]}
            />
            <FeatureGroup
              idx={3}
              title="Audit & Compliance"
              items={["Exportable report layouts", "Standardized artifacts format", "Built for review and sign-off workflows"]}
            />
          </div>
        </div>
      </section>

      {/* Report Lifecycle */}
      <section className="py-20 border-t border-border">
        <div className="container">
          <ScrollFloat
            containerClassName="mb-10"
            textClassName="font-display text-3xl font-semibold tracking-tight text-foreground"
          >
            Report Lifecycle
          </ScrollFloat>
          <div className="grid gap-6 md:grid-cols-4">
            {[
              { stage: "Prepare", desc: "Define epoch scope and liabilities snapshot." },
              { stage: "Verify", desc: "Bind reserves and commitments with proofs." },
              { stage: "Publish", desc: "Issue a report with reproducible artifacts." },
              { stage: "Review", desc: "Stakeholders validate and archive history." }
            ].map((s, idx) => (
              <SpotlightCard
                key={s.stage}
                spotlightColor="rgba(236, 223, 204, 0.08)"
                className="bg-card/80 border-border animate-fade-in-up"
                style={{ animationDelay: `${idx * 100}ms` } as React.CSSProperties}
              >
                <div className="p-6">
                  <span className="text-xs text-accent/60 font-medium">Stage {idx + 1}</span>
                  <h3 className="font-display text-xl font-medium mt-2">{s.stage}</h3>
                  <p className="mt-3 text-sm text-muted-foreground">{s.desc}</p>
                </div>
              </SpotlightCard>
            ))}
          </div>
        </div>
      </section>

      {/* Integration */}
      <section className="py-20 border-t border-border">
        <div className="container">
          <SpotlightCard
            spotlightColor="rgba(255, 255, 255, 0.1)"
            className="bg-card/90 border-border"
          >
            <div className="p-10">
              <h2 className="font-display text-3xl font-semibold tracking-tight">Integration-Ready Architecture</h2>
              <p className="mt-3 text-muted-foreground max-w-2xl">
                APIs, webhooks, indexers, and export surfaces designed to attach to the existing report schema.
              </p>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {["APIs & Webhooks", "Indexers & Monitoring", "Artifact Bundles"].map((t, idx) => (
                  <div key={t} className="rounded-lg border border-border bg-secondary/30 p-5">
                    <p className="font-medium">{t}</p>
                    <p className="mt-2 text-xs text-muted-foreground">Designed to plug into the report schema.</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap gap-4">
                <button onClick={() => (window.location.href = "/#contact")} className="btn-primary">
                  Request Access
                </button>
                <button onClick={() => (window.location.href = "/how-it-works")} className="btn-secondary">
                  Understand the Method
                </button>
              </div>
            </div>
          </SpotlightCard>
        </div>
      </section>
    </MarketingLayout>
  );
}
