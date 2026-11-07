import { useState } from "react";
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
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white">
      {/* Mesmo recuo do título da página. A altura é o botão de 40 px mais o mínimo em volta. */}
      <div className="mx-auto w-full max-w-[1280px] px-4">
        <div className="flex h-14 items-center justify-between gap-2 md:h-16">
          <Link href="/" className="inline-flex shrink-0 items-center">
            <img src="/images/landing/logo.png" alt="ArqDoor" className="h-6 w-auto md:h-7" />
          </Link>

          <nav className="hidden items-center gap-8 lg:flex">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noopener noreferrer" : undefined}
                className={`${landingType.navLink} text-ink transition-colors duration-300 hover:text-brand`}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex min-w-0 items-center gap-1">
            <Button
              asChild
              className={`h-10 min-w-0 overflow-hidden rounded-lg bg-brand px-3 text-white transition-colors duration-300 hover:bg-brand-dark sm:px-4 md:px-5 ${landingType.button}`}
            >
              <Link href={primaryCta.href}>{primaryCta.label}</Link>
            </Button>

            <button
              type="button"
              aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ink transition-colors duration-300 hover:bg-surface-warm hover:text-brand lg:hidden"
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Menu do celular e do tablet: os links de navegação abaixo do lg. */}
        {menuOpen && (
          <nav className="border-t border-line py-3 lg:hidden">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noopener noreferrer" : undefined}
                onClick={() => setMenuOpen(false)}
                className={`${landingType.navLink} block rounded-lg px-3 py-3 text-ink transition-colors duration-300 hover:bg-surface-warm hover:text-brand`}
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
