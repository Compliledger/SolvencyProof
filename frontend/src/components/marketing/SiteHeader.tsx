import { useLocation, useNavigate } from "react-router-dom";
import logo from "@/assets/solvencyproof-logo.png";
import PillNav from "@/components/reactbits/PillNav";

type Props = {
  onNavigate: (to: string) => void;
};

const navItems = [
  { label: "Home", href: "/" },
  { label: "Product", href: "/product" },
  { label: "How it works", href: "/how-it-works" },
  { label: "Trust", href: "/#trust" },
  { label: "Contact", href: "/#contact" },
  { label: "Verify Proofs", href: "/verify" },
];

export function SiteHeader({ onNavigate }: Props) {
  const location = useLocation();

  return (
    <header className="absolute top-0 left-0 right-0 z-50">
      <div className="container flex justify-center pt-4">
        <PillNav
          logo={logo}
          logoAlt="SolvencyProof"
          items={navItems}
          activeHref={location.pathname}
          baseColor="#D0D0D0"
          pillColor="#2a2a2a"
          hoveredPillTextColor="#1a1a1a"
          pillTextColor="#A0A0A0"
          initialLoadAnimation={true}
        />
      </div>
    </header>
  );
}
