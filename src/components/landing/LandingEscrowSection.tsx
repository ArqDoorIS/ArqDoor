import { motion } from "framer-motion";
import { landingType } from "@/components/landing/typography";

const escrowSteps = [
  "Preencha as informações do contrato, dividindo-as em quantas fases preferir.",
  "Envie o link gerado para o seu cliente, e aguarde a assinatura e o pagamento dele.",
  "O pagamento efetuado por seu cliente fica em um Fundo de Custódia, protegido até a finalização da fase correspondente.",
  "Declare a finalização da fase e aguarde o cliente confirmar. Então, receba os valores em sua conta",
];

const textContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.14,
      delayChildren: 0.1,
    },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: "easeOut" },
  },
};

const stepContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.3,
    },
  },
};

const stepItem = {
  hidden: { opacity: 0, x: -24 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

const imageVariant = {
  hidden: { opacity: 0, scale: 0.92, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.85, ease: "easeOut", delay: 0.2 },
  },
};

export default function LandingEscrowSection() {
  return (
    <section
      id="escrow"
      className="relative overflow-hidden bg-gradient-to-br from-brand via-brand to-brand-dark py-16 text-white"
    >
      <div className="pointer-events-none absolute -left-16 top-20 h-56 w-56 rounded-full bg-white/10 blur-[2px]" />
      <div className="pointer-events-none absolute -bottom-24 -left-10 h-72 w-72 rounded-full bg-brand-light/20 blur-[4px]" />
      <div className="pointer-events-none absolute right-[-80px] top-[-40px] h-64 w-64 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute bottom-10 right-[12%] h-32 w-32 rounded-full bg-brand-lighter/20 blur-xl" />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.10),transparent_28%),radial-gradient(circle_at_85%_20%,rgba(255,255,255,0.08),transparent_22%),radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.06),transparent_20%)]" />

      <div className="relative z-10 mx-auto grid w-full max-w-[1280px] gap-16 px-6 lg:grid-cols-[1fr_1.05fr] lg:items-center">
        <motion.div
          variants={textContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          <motion.h2
            variants={fadeUp}
            className={landingType.sectionTitle}
          >
            <span className="block lg:whitespace-nowrap">
              Cliente atrasando pagamento?
            </span>
            <span className="block">Utilize a ArqDoor Escrow!</span>
          </motion.h2>

          <motion.p
            variants={fadeUp}
            className={`mt-6 text-white ${landingType.body}`}
          >
            Você nunca mais precisará cobrar o pagamento dos seus clientes. Com a
            ArqDoor Escrow, o pagamento é efetuado pelo seu cliente antes de
            iniciar a obra, protegido num fundo de custódia separado.
          </motion.p>

          <motion.ol
            variants={stepContainer}
            className="mt-6 space-y-5"
          >
            {escrowSteps.map((step, index) => (
              <motion.li
                key={step}
                variants={stepItem}
                className="grid grid-cols-[56px_1fr] items-center gap-3"
              >
                <span className={`inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-brand-disabled bg-brand-lighter text-white shadow-[0_8px_20px_rgba(0,0,0,0.12)] ${landingType.strong}`}>
                  {index + 1}
                </span>
                <span className={`text-white ${landingType.cardBody}`}>
                  {step}
                </span>
              </motion.li>
            ))}
          </motion.ol>

          <motion.p
            variants={fadeUp}
            className={`mt-6 inline-flex gap-3 rounded-2xl border-2 border-brand-disabled/80 bg-white/15 px-4 py-3 backdrop-blur-sm ${landingType.strong}`}
          >
            <svg
              viewBox="0 0 36 36"
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 flex-shrink-0"
              fill="currentColor"
            >
              <path d="M31.25,7.4a43.79,43.79,0,0,1-6.62-2.35,45,45,0,0,1-6.08-3.21L18,1.5l-.54.35a45,45,0,0,1-6.08,3.21A43.79,43.79,0,0,1,4.75,7.4L4,7.59v8.34c0,13.39,13.53,18.4,13.66,18.45l.34.12.34-.12c.14,0,13.66-5.05,13.66-18.45V7.59Zm-4.57,6.65L15.51,24.9,9.19,18.57a1.4,1.4,0,0,1,2-2L15.54,21,24.73,12a1.4,1.4,0,1,1,2,2Z" />
            </svg>
            100% do valor do seu serviço protegido por Escrow
          </motion.p>
        </motion.div>

        <motion.div
          className="max-w-[600px] justify-self-end"
          variants={imageVariant}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
        >
          <img
            src="/images/landing/esquema_escrow.png"
            width={2300}
            height={1975}
            alt="Fluxo de proteção de pagamento via Escrow"
          />
        </motion.div>
      </div>
    </section>
  );
}