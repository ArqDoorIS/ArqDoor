import { motion } from "framer-motion";
import { GiStrongbox } from "react-icons/gi";
import { PiListChecksLight } from "react-icons/pi";
import { landingType } from "@/components/landing/typography";

const features = [
  {
    title: "Gestão Inteligente de Contratos",
    description:
      "Acelere a negociação enviando contratos através de um único link. Assinatura eletrônica, pagamento e visualização das fases em um único ato.",
    icon: (
      <img
        src="/images/landing/icon-card-1.png"
        alt="Ícone de contratos digitais inteligentes"
        className="h-[150px] w-[150px] object-contain"
      />
    ),
    tone:
      "bg-white text-ink border border-line hover:border-brand-disabled",
  },
  {
    title: "Previsibilidade de Pagamento",
    description:
      "Utilize a ArqDoor Escrow para intermediar os pagamentos. Anule a barreira de desconfiança com a nossa ferramenta e receba o valor do seu serviço em dia.",
    icon: <GiStrongbox className="h-[150px] w-[150px] text-white" />,
    tone:
      "bg-brand text-white border border-transparent hover:border-brand-light",
  },
  {
    title: "Acompanhamento de Obras",
    description:
      "Organize cada projeto com o nosso sistema, e torne cada contrato em uma experiência simples de acompanhar para o seu cliente.",
    icon: <PiListChecksLight className="h-[150px] w-[150px] text-white" />,
    tone:
      "bg-ink text-white border border-transparent hover:border-[#7b726c]",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: "easeOut" },
  },
};

const cardsContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.2,
    },
  },
};

const cardVariant = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: "easeOut" },
  },
};

export default function LandingFeaturesSection() {
  return (
    <section className="bg-surface py-16">
      <div className="mx-auto w-full max-w-[1360px] px-4">
        <motion.h2
          className={`text-center ${landingType.sectionTitle}`}
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.35 }}
        >
          O que oferecemos
        </motion.h2>

        <motion.p
          className={landingType.subtitle}
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.35 }}
          transition={{ delay: 0.12 }}
        >
          Tudo que você precisa para profissionalizar a gestão dos seus contratos
        </motion.p>

        <motion.div
          className="mx-auto mb-10 mt-10 grid w-full max-w-[1110px] gap-6 md:grid-cols-2 lg:grid-cols-3"
          variants={cardsContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {features.map((feature) => (
            <motion.article
              key={feature.title}
              variants={cardVariant}
              whileHover={{ y: -8, scale: 1.015 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className={`group flex h-full flex-col rounded-[20px] px-9 pb-8 pt-8 shadow-[0_8px_18px_rgba(0,0,0,0.14)] transition-all duration-300 hover:shadow-[0_18px_38px_rgba(0,0,0,0.18)] ${feature.tone}`}
            >
              <motion.h3
                className={`text-center ${landingType.cardTitle}`}
                initial={false}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.25 }}
              >
                {feature.title}
              </motion.h3>

              <motion.div
                className="mt-8 flex justify-center"
                initial={false}
                whileHover={{ scale: 1.06 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                {feature.icon}
              </motion.div>

              <motion.p
                className={`mt-8 text-left ${landingType.cardBody}`}
                initial={false}
                whileHover={{ opacity: 1, y: -2 }}
                transition={{ duration: 0.25 }}
              >
                {feature.description}
              </motion.p>

              <div className="mt-6 h-[2px] w-0 rounded-full bg-current opacity-30 transition-all duration-300 group-hover:w-full" />
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}