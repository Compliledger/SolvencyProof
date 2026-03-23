import ShinyText from "@/components/reactbits/ShinyText";

export function FinalCtaBand() {
  return (
    <section className="py-28 lg:py-36 border-t border-border relative overflow-hidden">
      {/* Subtle Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-accent/5 pointer-events-none" />

      <div className="container relative z-10">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <h2 className="font-display text-4xl font-medium tracking-tight md:text-5xl lg:text-6xl animate-fade-in-up">
            Make solvency <br />
            <ShinyText
              text="verifiable"
              shineColor="#ECDFCC"
              color="#E0E0E0"
              speed={3}
              className="font-display"
            />
          </h2>

          <p className="text-xl text-muted-foreground max-w-xl mx-auto animate-fade-in" style={{ animationDelay: '200ms' }}>
            Join the organizations building transparent, cryptographically verifiable proof of reserves.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-6 animate-fade-in" style={{ animationDelay: '300ms' }}>
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
              onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}
              className="btn-secondary"
            >
              Contact Sales
            </button>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap items-center justify-center gap-8 pt-10 text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: '400ms' }}>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Privacy-First
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Cryptographic Security
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Audit-Ready
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
