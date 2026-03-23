import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { HeroSection } from "@/components/marketing/sections/HeroSection";
import { PillarsSection } from "@/components/marketing/sections/PillarsSection";
import { ReportsExplorerSection } from "@/components/marketing/sections/ReportsExplorerSection";
import { HowItWorksPreviewSection } from "@/components/marketing/sections/HowItWorksPreviewSection";
import { UseCasesSection } from "@/components/marketing/sections/UseCasesSection";
import { TrustSection } from "@/components/marketing/sections/TrustSection";
import { FinalCtaBand } from "@/components/marketing/sections/FinalCtaBand";

const Index = () => {
  return (
    <MarketingLayout>
      <HeroSection />
      <ReportsExplorerSection />
      <PillarsSection />
      <HowItWorksPreviewSection />
      <UseCasesSection />
      <TrustSection />
      <FinalCtaBand />
    </MarketingLayout>
  );
};

export default Index;
