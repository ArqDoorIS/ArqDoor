// Só a landing usa a Inter por enquanto (spec 2026-11-landing-header-e-tipografia).
import "@fontsource-variable/inter";
import LandingComparisonSection from "@/components/landing/LandingComparisonSection";
import LandingEscrowSection from "@/components/landing/LandingEscrowSection";
import LandingFeaturesSection from "@/components/landing/LandingFeaturesSection";
import LandingFinalCTASection from "@/components/landing/LandingFinalCTASection";
import LandingFooter from "@/components/landing/LandingFooter";
import LandingHeader from "@/components/landing/LandingHeader";
import LandingHeroSection from "@/components/landing/LandingHeroSection";
import LandingProductPreviewSection from "@/components/landing/LandingProductPreviewSection";
import { useAuth } from "@/hooks/use-auth";

export default function Home() {
  const { isLoggedIn } = useAuth();
  const primaryCta = isLoggedIn
    ? { href: "/home", label: "Acessar plataforma" }
    : { href: "/auth", label: "Comece agora" };

  return (
    <div className="font-inter text-ink-strong">
      <LandingHeader primaryCta={primaryCta} />
      <main>
        <LandingHeroSection primaryCta={primaryCta} />
        <LandingProductPreviewSection />
        <LandingFeaturesSection />
        <LandingEscrowSection />
        <LandingComparisonSection />
        <LandingFinalCTASection primaryCta={primaryCta} />
      </main>
      <LandingFooter />
    </div>
  );
}
