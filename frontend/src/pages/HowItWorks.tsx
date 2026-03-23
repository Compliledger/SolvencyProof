import { useEffect, useRef } from "react";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import Aurora from "@/components/reactbits/Aurora";
import SpotlightCard from "@/components/reactbits/SpotlightCard";
import ShinyText from "@/components/reactbits/ShinyText";
import ScrollFloat from "@/components/reactbits/ScrollFloat";
import { useFirstVisit } from "@/hooks/useFirstVisit";

export default function HowItWorks() {
  const { isFirstVisit, hasAnimated, markAsVisited } = useFirstVisit('how-it-works');
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isFirstVisit && !hasAnimated) {
      const timer = setTimeout(() => markAsVisited(), 2000);
      return () => clearTimeout(timer);
    }
  }, [isFirstVisit, hasAnimated, markAsVisited]);

  const steps = [
    {
      title: "Commit Liabilities",
      desc: "The exchange aggregates all user balances into a single cryptographic commitment (Merkle root). This captures total liabilities without revealing individual accounts.",
      details: ["Balance snapshot at epoch boundary", "Merkle tree construction", "Root hash published on-chain"]
    },
    {
      title: "Measure Reserves",
      desc: "On-chain reserve addresses are identified and their balances verified against the blockchain state at the same epoch timestamp.",
      details: ["Multi-chain address aggregation", "Real-time balance verification", "Cryptographic attestation"]
    },
    {
      title: "Generate Proof",
      desc: "A zero-knowledge proof is generated demonstrating that reserves exceed the committed liabilities total, without revealing the actual values.",
      details: ["ZK-SNARK circuit execution", "Constraint satisfaction proof", "Verifiable computation"]
    },
    {
      title: "Publish Report",
      desc: "The verification report, proof artifacts, and metadata are published. Anyone can verify the proof and check their inclusion.",
      details: ["Report schema compliance", "Artifact bundle generation", "Public verification endpoint"]
    }
  ];

  const concepts = [
    { title: "Merkle Trees", desc: "Binary hash trees that allow efficient and secure verification of large data sets. Users can prove their balance was included without revealing others." },
    { title: "Zero-Knowledge Proofs", desc: "Cryptographic proofs that verify a statement is true without revealing any underlying data. Proves reserves > liabilities while keeping amounts private." },
    { title: "Epoch Snapshots", desc: "Point-in-time captures that ensure consistency between reserve and liability measurements, enabling reproducible verification." },
    { title: "On-Chain Attestation", desc: "Immutable records anchored to blockchain state, providing tamper-proof timestamps and public auditability." }
  ];

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
            colorStops={["#FFFFFF", "#F0F0F0", "#E8E8E8", "#F5F5F5", "#FFFFFF"]}
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
              Technical Overview
            </div>

            <h1 className={`font-display text-5xl font-semibold tracking-tight md:text-6xl lg:text-7xl transition-all duration-700 ${
              isFirstVisit && !hasAnimated ? 'opacity-0 translate-y-8' : 'opacity-100 translate-y-0'
            }`} style={{ transitionDelay: '400ms' }}>
              How <ShinyText
                text="Verification"
                shineColor="#ECDFCC"
                color="#E0E0E0"
                speed={3}
                className="font-display font-semibold"
              />
              <br />Works
            </h1>

            <p className={`text-xl text-muted-foreground max-w-xl transition-all duration-700 ${
              isFirstVisit && !hasAnimated ? 'opacity-0 translate-y-6' : 'opacity-100 translate-y-0'
            }`} style={{ transitionDelay: '600ms' }}>
              From liability commitment to published proof — a transparent, cryptographically-secure verification pipeline.
            </p>

            <div className={`flex flex-wrap gap-4 pt-4 transition-all duration-700 ${
              isFirstVisit && !hasAnimated ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
            }`} style={{ transitionDelay: '800ms' }}>
              <button
                onClick={() => (window.location.href = "/product")}
                className="btn-primary"
              >
                View Product
              </button>
              <button
                onClick={() => (window.location.href = "/#contact")}
                className="btn-secondary"
              >
                Contact Us
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

      {/* Verification Steps */}
      <section className="py-20">
        <div className="container">
          <ScrollFloat
            containerClassName="mb-4"
            textClassName="font-display text-3xl font-semibold tracking-tight text-foreground"
          >
            Verification Pipeline
          </ScrollFloat>
          <p className="text-muted-foreground mb-12 max-w-2xl">
            Four distinct stages ensure transparent, reproducible solvency verification.
          </p>

          <div className="grid gap-8 md:grid-cols-2">
            {steps.map((step, idx) => (
              <SpotlightCard
                key={step.title}
                spotlightColor="rgba(236, 223, 204, 0.08)"
                className="bg-card/80 border-border animate-fade-in-up"
                style={{ animationDelay: `${idx * 100}ms` } as React.CSSProperties}
              >
                <div className="p-8">
                  <div className="flex items-center gap-4 mb-4">
                    <span className="flex items-center justify-center w-10 h-10 rounded-full bg-accent/10 text-accent-cream font-display font-medium">
                      {idx + 1}
                    </span>
                    <h3 className="font-display text-xl font-medium">{step.title}</h3>
                  </div>
                  <p className="text-muted-foreground mb-6">{step.desc}</p>
                  <ul className="space-y-2">
                    {step.details.map((d) => (
                      <li key={d} className="flex items-center gap-3 text-sm text-muted-foreground">
                        <svg className="h-4 w-4 text-success shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              </SpotlightCard>
            ))}
          </div>
        </div>
      </section>

      {/* Cryptographic Concepts */}
      <section className="py-20 border-t border-border">
        <div className="container">
          <ScrollFloat
            containerClassName="mb-4"
            textClassName="font-display text-3xl font-semibold tracking-tight text-foreground"
          >
            Cryptographic Foundations
          </ScrollFloat>
          <p className="text-muted-foreground mb-12 max-w-2xl">
            The mathematical primitives that power privacy-preserving verification.
          </p>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {concepts.map((c, idx) => (
              <SpotlightCard
                key={c.title}
                spotlightColor="rgba(255, 255, 255, 0.06)"
                className="bg-card/80 border-border animate-fade-in-up"
                style={{ animationDelay: `${idx * 100}ms` } as React.CSSProperties}
              >
                <div className="p-6">
                  <h3 className="font-display text-lg font-medium mb-3">{c.title}</h3>
                  <p className="text-sm text-muted-foreground">{c.desc}</p>
                </div>
              </SpotlightCard>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 border-t border-border">
        <div className="container">
          <SpotlightCard
            spotlightColor="rgba(236, 223, 204, 0.1)"
            className="bg-card/90 border-border"
          >
            <div className="p-10 text-center">
              <h2 className="font-display text-3xl font-semibold tracking-tight mb-4">
                Ready to verify?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                Explore our verification reports or get in touch to learn how SolvencyProof can work for your organization.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <button onClick={() => (window.location.href = "/app/login")} className="btn-primary">
                  Open Portal
                </button>
                <button onClick={() => (window.location.href = "/#contact")} className="btn-secondary">
                  Contact Sales
                </button>
              </div>
            </div>
          </SpotlightCard>
        </div>
      </section>
    </MarketingLayout>
  );
}
