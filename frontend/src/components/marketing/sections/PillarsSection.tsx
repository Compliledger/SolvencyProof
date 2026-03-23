import SpotlightCard from "@/components/reactbits/SpotlightCard";
import ScrollFloat from "@/components/reactbits/ScrollFloat";

const pillars = [
  {
    title: "Cryptographic Verification",
    description: "Coverage derived from cryptographic commitments and zero-knowledge proofs. All artifacts designed for reproducibility.",
  },
  {
    title: "Privacy-Preserving",
    description: "No sensitive user balances exposed in public interfaces. Inclusion checks keep peer data completely private.",
  },
  {
    title: "Audit-Ready Reporting",
    description: "Consistent schema across every verification epoch. Export-ready structures for enterprise compliance.",
  },
];

export function PillarsSection() {
  return (
    <section className="py-28 lg:py-36">
      <div className="container">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="space-y-4 max-w-2xl">
            <ScrollFloat
              containerClassName="my-0"
              textClassName="font-display text-4xl font-semibold tracking-tight md:text-5xl text-foreground"
              animationDuration={1}
              ease="back.inOut(2)"
              scrollStart="top bottom+=20%"
              scrollEnd="bottom bottom-=20%"
            >
              Verification you can trust
            </ScrollFloat>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Enterprise-grade architecture. Clear artifacts, clear semantics, clear workflows.
            </p>
          </div>
          <button
            className="btn-secondary cursor-pointer shrink-0"
            onClick={() => (window.location.href = "/how-it-works")}
          >
            <span className="flex items-center gap-2">
              How it works
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {pillars.map((p, idx) => (
            <SpotlightCard
              key={p.title}
              spotlightColor="rgba(224, 224, 224, 0.08)"
              className="bg-card/50 border-border hover:border-accent/30 transition-all duration-300 animate-fade-in-up"
              style={{ animationDelay: `${idx * 100}ms` } as React.CSSProperties}
            >
              <div className="p-8">
                <span className="inline-block font-display text-sm font-medium text-accent/60 mb-6">
                  0{idx + 1}
                </span>
                <h3 className="font-display text-xl font-medium mb-4">
                  {p.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {p.description}
                </p>
              </div>
            </SpotlightCard>
          ))}
        </div>
      </div>
    </section>
  );
}
