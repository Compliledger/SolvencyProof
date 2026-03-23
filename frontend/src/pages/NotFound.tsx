import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import Aurora from "@/components/reactbits/Aurora";
import { Home, ArrowLeft, Search, FileQuestion } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  const isPortalRoute = location.pathname.startsWith("/app");

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden">
      {/* Aurora Background */}
      <div className="absolute inset-0 z-0 opacity-40">
        <Aurora
          colorStops={["#1a1a1a", "#2d2d2d", "#404040", "#333333"]}
          blend={0.5}
          amplitude={1.2}
          speed={0.3}
        />
      </div>

      {/* Grid Pattern Overlay */}
      <div
        className="absolute inset-0 z-[1] opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6">
        {/* 404 Display */}
        <div className="relative mb-8">
          <h1 className="font-display text-[12rem] md:text-[16rem] font-bold leading-none text-transparent bg-clip-text bg-gradient-to-b from-foreground/20 to-foreground/5 select-none">
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center animate-pulse">
              <FileQuestion size={48} className="text-accent-cream" />
            </div>
          </div>
        </div>

        {/* Message */}
        <div className="text-center max-w-md mb-10">
          <h2 className="font-display text-2xl md:text-3xl font-semibold mb-4">
            Page Not Found
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            The page you're looking for doesn't exist or has been moved.
            Check the URL or navigate back to safety.
          </p>

          {/* Show attempted path */}
          <div className="mt-6 p-3 rounded-lg bg-secondary/30 border border-border inline-block">
            <code className="text-sm text-muted-foreground">
              {location.pathname}
            </code>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="btn-secondary"
          >
            <ArrowLeft size={18} />
            Go Back
          </button>

          <Link
            to={isPortalRoute ? "/app" : "/"}
            className="btn-primary"
          >
            <Home size={18} />
            {isPortalRoute ? "Back to Dashboard" : "Back to Home"}
          </Link>
        </div>

        {/* Quick Links */}
        <div className="mt-16 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">
            Quick Links
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <Link
              to="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Home
            </Link>
            <Link
              to="/product"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Product
            </Link>
            <Link
              to="/how-it-works"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              How It Works
            </Link>
            <Link
              to="/app"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Portal
            </Link>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <p className="text-xs text-muted-foreground/50">
            SolvencyProof © {new Date().getFullYear()}
          </p>
        </div>
      </div>

      {/* Floating Decorative Shapes */}
      <div className="absolute top-20 left-20 w-32 h-32 rounded-full bg-accent/5 blur-3xl" />
      <div className="absolute bottom-20 right-20 w-48 h-48 rounded-full bg-accent/5 blur-3xl" />
    </div>
  );
};

export default NotFound;
