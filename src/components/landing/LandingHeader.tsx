import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LandingPrimaryCta } from "@/components/landing/types";
import { landingType } from "@/components/landing/typography";
import { ARQDOOR_WHATSAPP_URL } from "@/lib/whatsapp";

interface LandingHeaderProps {
  primaryCta: LandingPrimaryCta;
}

const navItems = [
  { label: "Sobre nós", href: "#sobre", external: false },
  { label: "Fale com a equipe de vendas", href: ARQDOOR_WHATSAPP_URL, external: true },
];

export default function LandingHeader({ primaryCta }: LandingHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setIsScrolled(window.scrollY > 24);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "border-b border-[#e6e6e6] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
          : "bg-white shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
      }`}
    >
      <div className="mx-auto w-full max-w-[1600px] px-6 md:px-12">
        <div
          className={`mx-auto flex max-w-[1280px] items-center justify-between gap-3 transition-all duration-300 ${
            isScrolled ? "h-[70px]" : "h-[80px]"
          }`}
        >
          <Link href="/" className="inline-flex shrink-0 items-center">
            <img
              src="/images/landing/logo.png"
              alt="ArqDoor"
              className={`w-auto transition-all duration-300 ${
                isScrolled ? "h-5 md:h-8" : "h-5 md:h-9"
              }`}
            />
          </Link>

          <nav className="hidden items-center gap-10 lg:flex">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noopener noreferrer" : undefined}
                className={`${landingType.navLink} text-[#4A5565] transition-colors duration-300 hover:text-brand`}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              asChild
              className={`rounded-xl bg-brand text-white shadow-[0_3px_8px_rgba(0,0,0,0.18)] transition-all duration-300 hover:bg-brand-dark ${
                isScrolled
                  ? `h-[38px] px-4 sm:px-6 md:px-7 ${landingType.navButton}`
                  : `h-[40px] px-4 sm:px-7 md:px-8 ${landingType.navButton}`
              }`}
            >
              <Link href={primaryCta.href}>{primaryCta.label}</Link>
            </Button>

            <button
              type="button"
              aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[#4A5565] transition-colors duration-300 hover:bg-surface-warm hover:text-brand lg:hidden"
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Menu mobile/tablet — restaura os links de navegação abaixo do lg */}
        {menuOpen && (
          <nav className="mx-auto max-w-[1280px] border-t border-line py-3 lg:hidden">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noopener noreferrer" : undefined}
                onClick={() => setMenuOpen(false)}
                className={`${landingType.navLink} block rounded-lg px-3 py-3 text-[#4A5565] transition-colors duration-300 hover:bg-surface-warm hover:text-brand`}
              >
                {item.label}
              </a>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
