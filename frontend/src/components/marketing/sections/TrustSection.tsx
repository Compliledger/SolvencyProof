import SpotlightCard from "@/components/reactbits/SpotlightCard";

const trustPillars = [
  {
    title: "Verification Transparency",
    description: "Every report includes a verification summary and stable fields intended for reproducible validation by any third party.",
  },
  {
    title: "Privacy Posture",
    description: "User-level data remains private. Verification is based on cryptographic commitments and publishable artifacts only.",
  },
  {
    title: "Operational Controls",
    description: "Consistent publishing workflow patterns with report history preserved across all verification epochs.",
  },
];

export function TrustSection() {
  return (
    <section id="trust" className="py-28 lg:py-36 scroll-mt-24 border-t border-border">
      <div className="container">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <h2 className="font-display text-4xl font-medium tracking-tight md:text-5xl mb-6">
            Trust & Security
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Clear signals for enterprise stakeholders. Designed to communicate process and artifacts.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-20">
          {trustPillars.map((pillar, idx) => (
            <SpotlightCard
              key={pillar.title}
              spotlightColor="rgba(236, 223, 204, 0.06)"
              className="bg-card/50 border-border hover:border-accent/20 transition-all duration-300"
            >
              <div className="p-8 text-center">
                <span className="inline-block font-display text-sm font-medium text-muted-foreground mb-6">
                  0{idx + 1}
                </span>
                <h3 className="font-display text-lg font-medium mb-4">
                  {pillar.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            </SpotlightCard>
          ))}
        </div>

        {/* Contact Form */}
        <div id="contact" className="scroll-mt-24">
          <div className="premium-card max-w-4xl mx-auto">
            <div className="grid gap-12 md:grid-cols-12">
              <div className="md:col-span-7 space-y-6">
                <h3 className="font-display text-3xl font-medium">
                  Ready to get started?
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Connect with our team to learn how SolvencyProof can help your organization build verifiable trust with stakeholders.
                </p>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-center gap-3">
                    <svg className="h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Custom integration support
                  </li>
                  <li className="flex items-center gap-3">
                    <svg className="h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Dedicated onboarding
                  </li>
                  <li className="flex items-center gap-3">
                    <svg className="h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Enterprise SLA available
                  </li>
                </ul>
              </div>

              <div className="md:col-span-5">
                <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                  <input
                    className="w-full h-12 rounded-lg border border-border bg-secondary/30 px-4 text-sm focus:outline-none focus:border-accent/50 transition-colors"
                    placeholder="Work email"
                    aria-label="Work email"
                  />
                  <input
                    className="w-full h-12 rounded-lg border border-border bg-secondary/30 px-4 text-sm focus:outline-none focus:border-accent/50 transition-colors"
                    placeholder="Company"
                    aria-label="Company"
                  />
                  <button
                    className="w-full btn-primary justify-center"
                    type="submit"
                  >
                    Request Access
                  </button>
                  <p className="text-xs text-center text-muted-foreground">
                    We'll respond within 24 hours.
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
