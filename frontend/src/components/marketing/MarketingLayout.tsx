import { PropsWithChildren, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";

export function MarketingLayout({ children }: PropsWithChildren) {
  const location = useLocation();
  const navigate = useNavigate();

  const hashTarget = useMemo(() => {
    const raw = location.hash?.replace("#", "").trim();
    return raw || null;
  }, [location.hash]);

  useEffect(() => {
    if (!hashTarget) return;
    requestAnimationFrame(() => {
      const el = document.getElementById(hashTarget);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [hashTarget]);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <SiteHeader
        onNavigate={(to) => {
          if (to.startsWith("#")) {
            if (location.pathname !== "/") {
              navigate(`/${to}`);
            } else {
              navigate({ hash: to, pathname: "/" });
            }
            return;
          }
          navigate(to);
        }}
      />
      <main className="relative">{children}</main>
      <SiteFooter onNavigate={(to) => navigate(to)} />
    </div>
  );
}
