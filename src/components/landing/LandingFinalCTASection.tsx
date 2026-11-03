import { motion } from "framer-motion";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import type { LandingPrimaryCta } from "@/components/landing/types";
import { landingType } from "@/components/landing/typography";

interface LandingFinalCTASectionProps {
  primaryCta: LandingPrimaryCta;
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

export default function LandingFinalCTASection({ primaryCta }: LandingFinalCTASectionProps) {
  return (
    <section className="bg-brand pb-0 pt-14 text-white md:pt-20">
      <div className="mx-auto w-full max-w-[1360px] px-4">
        <motion.div
          className="mx-auto max-w-[880px] text-center"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <p className="mx-auto max-w-[650px] text-sm font-normal leading-relaxed text-brand-soft sm:text-base md:text-xl">
            A excelência não está apenas na entrega final, mas também na forma em que o projeto é conduzido!
          </p>

          <h2 className={`mt-6 text-white ${landingType.sectionTitle}`}>
            Profissionalize a sua gestão de contratos hoje mesmo
          </h2>

          <motion.div
            className="mt-8 md:mt-12"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            viewport={{ once: true }}
          >
            <Button
              asChild
              className={`h-[54px] rounded-full bg-[#f1f1f1] px-8 text-brand hover:bg-white md:h-[62px] md:px-14 transition-all duration-300 hover:scale-105 ${landingType.buttonText}`}
            >
              <Link href={primaryCta.href}>
                Gere uma Proposta hoje mesmo
              </Link>
            </Button>
          </motion.div>
        </motion.div>

        <div className="mt-14 border-t border-white/45 md:mt-16" />
      </div>
    </section>
  );
}