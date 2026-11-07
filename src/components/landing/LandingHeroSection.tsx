import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { LandingPrimaryCta } from "@/components/landing/types";
import { landingType } from "@/components/landing/typography";

interface LandingHeroSectionProps {
  primaryCta: LandingPrimaryCta;
}

const fadeLeft = {
  hidden: { opacity: 0, x: -40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.7, ease: "easeOut" },
  },
};

const fadeRight = {
  hidden: { opacity: 0, x: 40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.8, ease: "easeOut" },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

export default function LandingHeroSection({ primaryCta }: LandingHeroSectionProps) {
  return (
    <section className="relative overflow-hidden bg-surface pt-10 md:pt-14">
      <div className="mx-auto grid w-full max-w-[1280px] gap-10 px-4 lg:grid-cols-2 lg:items-start lg:gap-x-16">
        <motion.div
          className="max-w-[580px] text-center lg:text-left"
          variants={fadeLeft}
          initial={false}
          animate="visible"
        >
          <motion.h1
            className={landingType.heroTitle}
            variants={fadeUp}
            initial={false}
            animate="visible"
            transition={{ delay: 0.1 }}
          >
            Estruture o projeto, <br />
            formalize o contrato <br />
            e receba com
            <span className={landingType.heroSpan}> mais segurança</span>
          </motion.h1>

          <motion.p
            className={`mx-auto mt-6 max-w-[65ch] text-left text-ink lg:mx-0 ${landingType.body}`}
            variants={fadeUp}
            initial={false}
            animate="visible"
            transition={{ delay: 0.25 }}
          >
            Com a ArqDoor, Prestadores de Serviço organizam seus projetos por etapas, definem valores por fase, formalizam o
            contrato e contam com intermediação segura de pagamentos em uma única plataforma.
          </motion.p>

          <motion.div
            className="mt-6 flex flex-col items-center gap-5 lg:items-start"
            variants={fadeUp}
            initial={false}
            animate="visible"
            transition={{ delay: 0.4 }}
          >
            <Button
              asChild
              className={`inline-flex items-center justify-center rounded-[16px] bg-brand px-4 py-6 text-white transition-colors hover:bg-brand-dark md:px-11 ${landingType.button}`}
            >
              <Link href={primaryCta.href}>{primaryCta.label}</Link>
            </Button>

            <a
              href="#escrow"
              className={`mt-2 inline-flex items-center gap-2 rounded-[16px] border border-brand bg-brand-tint px-4 py-3 text-brand-dark transition-all duration-300 hover:scale-[1.02] hover:shadow-md ${landingType.strong}`}
            >
              <svg
                viewBox="0 0 36 36"
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 flex-shrink-0 md:h-6 md:w-6"
                fill="currentColor"
              >
                <path d="M31.25,7.4a43.79,43.79,0,0,1-6.62-2.35,45,45,0,0,1-6.08-3.21L18,1.5l-.54.35a45,45,0,0,1-6.08,3.21A43.79,43.79,0,0,1,4.75,7.4L4,7.59v8.34c0,13.39,13.53,18.4,13.66,18.45l.34.12.34-.12c.14,0,13.66-5.05,13.66-18.45V7.59Zm-4.57,6.65L15.51,24.9,9.19,18.57a1.4,1.4,0,0,1,2-2L15.54,21,24.73,12a1.4,1.4,0,1,1,2,2Z" />
              </svg>

              Utilize Escrow e proteja 100% do valor do seu serviço
            </a>
          </motion.div>
        </motion.div>

        <motion.div
          className="relative mt-2 w-full lg:mt-0 lg:justify-self-end"
          variants={fadeRight}
          initial={false}
          animate="visible"
          transition={{ delay: 0.2 }}
        >
          <img
            src="/images/landing/Imagem_pag1.png"
            width={2134}
            height={2084}
            alt="Fluxo de etapas do projeto na ArqDoor"
            className="w-full max-w-[620px]"
          />
        </motion.div>
      </div>

    </section>
  );
}
