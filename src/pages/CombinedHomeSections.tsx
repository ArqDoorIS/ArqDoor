import { useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getResumeRoute } from "@/lib/utils";
import LandingHeader from "@/components/landing/LandingHeader";
import LandingHeroSection from "@/components/landing/LandingHeroSection";
import LandingProductPreviewSection from "@/components/landing/LandingProductPreviewSection";
import LandingEscrowSection from "@/components/landing/LandingEscrowSection";
import LandingFeaturesSection from "@/components/landing/LandingFeaturesSection";
import LandingComparisonSection from "@/components/landing/LandingComparisonSection";
import LandingFinalCTASection from "@/components/landing/LandingFinalCTASection";
import LandingFooter from "@/components/landing/LandingFooter";

const CombinedHomeSections = () => {
  const { isLoggedIn } = useAuth();

  const primaryCta = useMemo(
    () => ({
      href: isLoggedIn ? getResumeRoute("/home") : "/auth",
      label: isLoggedIn ? "Continuar usando, você está online!" : "Gere uma proposta",
    }),
    [isLoggedIn],
  );

  return (
    <main
      className="overflow-x-hidden bg-white text-ink-strong"
      style={{ fontFamily: '"Nunito Sans", ui-sans-serif, system-ui, sans-serif' }}
    >
      <LandingHeader primaryCta={primaryCta} />
      <LandingHeroSection primaryCta={primaryCta} />
      <LandingProductPreviewSection />
      <LandingEscrowSection />
      <LandingFeaturesSection />
      <LandingComparisonSection />
      <LandingFinalCTASection primaryCta={primaryCta} />
      <LandingFooter />
    </main>
  );
};

export default CombinedHomeSections;

