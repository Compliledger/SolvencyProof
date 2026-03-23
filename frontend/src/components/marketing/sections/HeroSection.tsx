import { useMemo, useState } from "react";
import { mockReports, coverageRatio } from "@/lib/mock/reports";
import { formatRatio, formatUsd } from "@/lib/format";
import Aurora from "@/components/reactbits/Aurora";
import Counter from "@/components/reactbits/Counter";
import ShinyText from "@/components/reactbits/ShinyText";
import SpotlightCard from "@/components/reactbits/SpotlightCard";
import Shuffle from "@/components/reactbits/Shuffle";

function GlowDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
    </span>
  );
}

export function HeroSection() {
  const [activeId, setActiveId] = useState(mockReports[0]?.id);
  const active = useMemo(() => mockReports.find((r) => r.id === activeId) ?? mockReports[0], [activeId]);
  const ratio = coverageRatio(active);

  return (
    <section className="relative min-h-[100vh] overflow-hidden">
      {/* Aurora Background - Bright White/Gray */}
      <div className="absolute inset-0 z-0">
        <Aurora
          colorStops={["#FFFFFF", "#F5F5F5", "#E8E8E8", "#FFFFFF", "#EEEEEE"]}
          blend={0.7}
          amplitude={1.8}
          speed={0.5}
        />
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-background/30 via-background/60 to-background" />

      <div className="container relative z-10 py-32 md:py-40 lg:py-48">
        <div className="grid items-center gap-16 lg:grid-cols-12 lg:gap-20">
          {/* Left Column */}
          <div className="lg:col-span-6 space-y-10">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm animate-fade-in">
              <GlowDot />
              Enterprise Verification Platform
            </div>

            {/* Headline */}
            <div className="space-y-4 animate-fade-in-up">
              <h1 className="font-display text-6xl font-semibold leading-[1.05] tracking-tight text-foreground md:text-7xl lg:text-8xl">
                <Shuffle
                  text="Provable"
                  tag="span"
                  className="font-display text-6xl md:text-7xl lg:text-8xl font-semibold block"
                  shuffleDirection="up"
                  duration={0.4}
                  stagger={0.04}
                  triggerOnce={true}
                />
                <ShinyText
                  text="Solvency"
                  shineColor="#ECDFCC"
                  color="#E0E0E0"
                  speed={3}
                  className="font-display font-semibold"
                />
              </h1>

              <p className="max-w-lg text-lg text-muted-foreground leading-relaxed md:text-xl">
                Cryptographic verification of reserves. Privacy-preserving proof that assets cover liabilities.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4 pt-4 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              <button
                onClick={() => (window.location.href = "/verify")}
                className="btn-primary group"
              >
                Verify Proofs
                <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>

              <button
                onClick={() => document.getElementById("reports")?.scrollIntoView({ behavior: "smooth" })}
                className="btn-secondary"
              >
                View Reports
              </button>
            </div>

            {/* Trust Indicators */}
            <div className="flex items-center gap-8 pt-6 text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: '400ms' }}>
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Cryptographic
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Privacy-First
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Audit-Ready
              </div>
            </div>
          </div>

          {/* Right Column - Report Card */}
          <div className="lg:col-span-6 space-y-6">
            <SpotlightCard
              spotlightColor="rgba(255, 255, 255, 0.15)"
              className="bg-card/90 border-border backdrop-blur-md animate-fade-in-up"
            >
              <div className="p-8">
                <div className="flex items-center justify-between gap-4 mb-8">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Latest Verification</p>
                    <p className="mt-2 font-display text-lg font-medium">{active.id}</p>
                  </div>
                  <span className="status-verified">
                    <GlowDot />
                    {active.status}
                  </span>
                </div>

                {/* Coverage Ratio */}
                <div className="mb-10">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Coverage Ratio</p>
                  <div className="flex items-baseline gap-3">
                    <p className="font-display text-6xl font-semibold tracking-tight text-accent-cream">
                      <Counter
                        value={Math.round(ratio * 100)}
                        fontSize={56}
                        gradientFrom="transparent"
                        gradientTo="transparent"
                      />
                    </p>
                    <span className="text-2xl text-muted-foreground">%</span>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg bg-secondary/50 p-4 hover:bg-secondary/70 transition-colors">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Reserves</p>
                    <p className="mt-2 font-display text-xl font-medium text-success">{formatUsd(active.reservesTotal)}</p>
                  </div>
                  <div className="rounded-lg bg-secondary/50 p-4 hover:bg-secondary/70 transition-colors">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Liabilities</p>
                    <p className="mt-2 font-display text-xl font-medium text-foreground">{formatUsd(active.liabilitiesTotal)}</p>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-8 flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-6">
                  <span>Published {new Date(active.publishedAt).toLocaleDateString()}</span>
                  <button
                    className="inline-flex items-center gap-2 text-foreground hover:text-accent transition-colors font-medium group"
                    onClick={() => document.getElementById("reports")?.scrollIntoView({ behavior: "smooth" })}
                  >
                    View details
                    <span className="group-hover:translate-x-0.5 transition-transform" aria-hidden>→</span>
                  </button>
                </div>
              </div>
            </SpotlightCard>

            {/* Timeline */}
            <div className="flex items-center gap-2 animate-fade-in" style={{ animationDelay: '300ms' }}>
              {mockReports.slice(0, 5).map((r, idx) => {
                const activeMarker = r.id === activeId;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setActiveId(r.id)}
                    className={
                      "flex-1 h-12 rounded-lg border transition-all duration-200 flex items-center justify-center hover-lift " +
                      (activeMarker
                        ? "border-accent/50 bg-accent/10"
                        : "border-border bg-card/50 hover:border-accent/30 hover:bg-secondary/50"
                      )
                    }
                    aria-label={`Select report ${r.id}`}
                  >
                    <span className="text-xs font-medium truncate px-2">
                      {idx === 0 ? "Latest" : `${r.id.slice(-5)}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
