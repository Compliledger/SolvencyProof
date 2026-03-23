import logo from "@/assets/solvencyproof-logo.png";

type Props = {
  onNavigate: (to: string) => void;
};

const footerLinks = {
  product: [
    { label: "Product", href: "/product" },
    { label: "How it works", href: "/how-it-works" },
    { label: "Proof Verifier", href: "/verify" },
  ],
  resources: [
    { label: "Documentation", href: "#" },
    { label: "API Reference", href: "#" },
    { label: "Security", href: "#trust" },
  ],
  company: [
    { label: "About", href: "#" },
    { label: "Contact", href: "#contact" },
    { label: "Privacy Policy", href: "#" },
    { label: "Terms", href: "#" },
  ],
};

export function SiteFooter({ onNavigate }: Props) {
  return (
    <footer className="border-t border-border bg-card/30">
      <div className="container py-16">
        <div className="grid gap-12 lg:grid-cols-12">
          {/* Brand Column */}
          <div className="lg:col-span-4 space-y-6">
            <button
              type="button"
              className="flex items-center gap-3 group"
              onClick={() => onNavigate("/")}
            >
              <img
                src={logo}
                alt="SolvencyProof"
                className="h-7 w-auto"
              />
              <span className="font-display text-sm font-medium">SolvencyProof</span>
            </button>

            <p className="max-w-xs text-sm text-muted-foreground leading-relaxed">
              Enterprise-grade solvency verification with cryptographic proofs.
              Build trust with stakeholders through verifiable reserves.
            </p>
          </div>

          {/* Links Grid */}
          <div className="lg:col-span-8">
            <div className="grid gap-8 sm:grid-cols-3">
              {/* Product Links */}
              <div className="space-y-4">
                <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Product
                </h4>
                <ul className="space-y-3">
                  {footerLinks.product.map((link) => (
                    <li key={link.label}>
                      <button
                        type="button"
                        onClick={() => onNavigate(link.href)}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {link.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Resources Links */}
              <div className="space-y-4">
                <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Resources
                </h4>
                <ul className="space-y-3">
                  {footerLinks.resources.map((link) => (
                    <li key={link.label}>
                      <button
                        type="button"
                        onClick={() => onNavigate(link.href)}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {link.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Company Links */}
              <div className="space-y-4">
                <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Company
                </h4>
                <ul className="space-y-3">
                  {footerLinks.company.map((link) => (
                    <li key={link.label}>
                      <button
                        type="button"
                        onClick={() => onNavigate(link.href)}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {link.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} SolvencyProof. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            All systems operational
          </div>
        </div>
      </div>
    </footer>
  );
}
