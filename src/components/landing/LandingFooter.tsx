import { FaInstagram } from "react-icons/fa";
import { landingType } from "@/components/landing/typography";

export default function LandingFooter() {
  return (
    <footer
      id="contato-vendas"
      className="bg-brand pt-8 pb-8 text-white md:pt-12 md:pb-12"
    >
      <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center gap-10 lg:flex-row lg:justify-between">
        
        <div className="flex justify-center">
          <img
            src="/images/landing/logo_branca.png"
            alt="ArqDoor"
            className="h-[48px] w-auto md:h-[52px]"
          />
        </div>

        <div className="flex w-full max-w-[500px] flex-col gap-10">
          <div className="grid grid-cols-1 gap-8 text-center sm:grid-cols-3 sm:text-left">
            
            <div className="flex flex-col items-center text-center">
              <p className="text-[16px] font-bold opacity-90">
                Legal
              </p>
              <ul className="mt-1 space-y-1">
                <li>
                  <a href="/docs/usetermsprivacitypolices.html" className="inline-flex min-h-[44px] items-center text-[14px] opacity-80 transition hover:opacity-100">
                    Termos de Uso e Política de Privacidade
                  </a>
                </li>
              </ul>
            </div>

            <div className="flex flex-col items-center text-center">
              <p className="text-[16px] font-bold opacity-90">
                Contato
              </p>
              <ul className="mt-2 space-y-2">
                <li>
                  <a href="#" className="inline-flex min-h-[44px] items-center text-[14px] opacity-80 transition hover:opacity-100">
                    Fale Conosco
                  </a>
                </li>
              </ul>
            </div>

            <div className="flex flex-col items-center">
              <p className="text-[16px] font-bold opacity-90">
                Redes Sociais
              </p>

              <a
                href="https://www.instagram.com/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="mt-2 inline-flex h-11 w-11 items-center justify-center rounded-md transition-all duration-300 hover:bg-white/20 hover:scale-105"
              >
                <FaInstagram className="h-6 w-6 text-white" />
              </a>
            </div>
          </div>

          <div className="text-center text-[12px] leading-relaxed opacity-80 sm:text-right">
            <p>
              ArqDoor, uma plataforma Zameed Inova Simples (I.S.) | CNPJ:
              57.795.075/0001-23
            </p>
            <p>ArqDoor&#174; - Todos os direitos reservados.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
