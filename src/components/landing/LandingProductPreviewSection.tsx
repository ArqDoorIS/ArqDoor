import { useState } from "react";
import { motion } from "framer-motion";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { HiOutlineLightBulb } from "react-icons/hi";
import { landingType } from "@/components/landing/typography";
import { useTypewriter } from "@/hooks/use-typewriter";

const featureCards = [
  {
    title: "Clareza",
    description: "Etapas e entregas definidas",
    icon: (
      <HiOutlineLightBulb className="h-20 w-20 text-[#fffffe] transition-colors duration-300 group-hover:text-brand" />
    ),
  },
  {
    title: "Proteção",
    description: "Assinatura eletrônica",
    icon: (
      <ShieldCheck className="h-10 w-10 text-[#fffffe] transition-colors duration-300 group-hover:text-brand" />
    ),
  },
  {
    title: "Segurança",
    description: "Pagamento intermediado",
    icon: (
      <LockKeyhole className="h-10 w-10 text-[#fffffe] transition-colors duration-300 group-hover:text-brand" />
    ),
  },
];

const imageVariant = {
  hidden: { opacity: 0, y: 50, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.8, ease: "easeOut" },
  },
};

const textVariant = {
  hidden: { opacity: 0, x: 50 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.75, ease: "easeOut", delay: 0.15 },
  },
};

const paragraphVariant = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: "easeOut" },
  },
};

const cardsContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.14,
      delayChildren: 0.35,
    },
  },
};

const cardVariant = {
  hidden: { opacity: 0, y: 26, scale: 0.94 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

export default function LandingProductPreviewSection() {
  const [startTyping, setStartTyping] = useState(false);

  const typedPrefix = "Organize o seu trabalho com ";
  const typedHighlight = "Gestão Inteligente de Contratos";
  const fullTypedText = `${typedPrefix}${typedHighlight}`;

  const typedText = useTypewriter(startTyping ? fullTypedText : "", 35);

  const typedPrefixIsComplete = typedText.length >= typedPrefix.length;
  const typedHighlightPortion = typedPrefixIsComplete
    ? typedText.slice(typedPrefix.length)
    : "";

  const isTypingComplete = typedText.length === fullTypedText.length;

  return (
    <section id="sobre" className="overflow-hidden bg-white py-24">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-6 lg:flex-row lg:items-center lg:gap-10 xl:gap-16">
        <motion.div
          className="w-full min-w-0 lg:w-[50%]"
          variants={imageVariant}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
        >
          <img
            src="/images/landing/arqdoor_links.png"
            alt="Prévia de contrato digital ArqDoor"
            className="block w-full object-contain"
          />
        </motion.div>

        <motion.div
          className="flex w-full min-w-0 flex-col justify-center lg:w-[42%] xl:w-[40%]"
          variants={textVariant}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          onAnimationComplete={() => {
            if (!startTyping) setStartTyping(true);
          }}
        >
          <div className="max-w-[560px]">
            <h2 className={`relative whitespace-pre-line ${landingType.sectionTitle}`}>
              <span className="invisible">
                Organize o seu trabalho
                <br />
                com Gestão Inteligente <br />
                de Contratos_
              </span>

              <span className="absolute left-0 top-0 w-full break-words font-semibold leading-tight text-left">
                {typedPrefixIsComplete ? (
                  <>
                    {typedPrefix}
                    <span className="text-brand">{typedHighlightPortion}</span>
                  </>
                ) : (
                  typedText
                )}

                <span
                  className={`text-brand ${
                    isTypingComplete ? "animate-pulse" : ""
                  }`}
                >
                  _
                </span>
              </span>
            </h2>

            <motion.p
              className={`mt-14 text-left text-[#636466] ${landingType.sectionBody}`}
              variants={paragraphVariant}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: 0.25 }}
            >
              Na relação entre profissional e cliente, a falta de estrutura pode
              gerar dúvidas sobre escopo, pagamentos e responsabilidades.
            </motion.p>

            <motion.p
              className={`mt-4 text-left text-[#636466] ${landingType.sectionBody}`}
              variants={paragraphVariant}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: 0.38 }}
            >
              Por isso, garanta uma experiência Premium para o seu cliente
              utilizando o nosso sistema de Gestão Inteligente de Contratos,
              e evite atritos desnecessários.
            </motion.p>
          </div>

          <motion.div
            className="mx-auto mt-6 grid max-w-[650px] grid-cols-1 gap-6 sm:grid-cols-3"
            variants={cardsContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            {featureCards.map((card) => (
              <motion.article
                key={card.title}
                variants={cardVariant}
                className="group mx-auto flex w-full max-w-[320px] flex-col items-center rounded-[18px] bg-brand px-2 py-5 text-center text-[#1F2937] shadow-[0_10px_28px_rgba(231,88,18,0.16)] transition-all duration-300 hover:-translate-y-1 hover:bg-[#fffffe] hover:text-brand hover:shadow-[0_16px_34px_rgba(231,88,18,0.35)]"
              >
                <h3
                  className={`${landingType.miniCardTitle} text-[#fffffe] transition-colors duration-300 group-hover:text-brand`}
                >
                  {card.title}
                </h3>

                <div className="mt-4 flex h-12 w-12 items-center justify-center">
                  {card.icon}
                </div>

                <p className="mt-4 font-normal text-[#fffffe] transition-colors duration-300 group-hover:text-brand">
                  {card.description}
                </p>
              </motion.article>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}