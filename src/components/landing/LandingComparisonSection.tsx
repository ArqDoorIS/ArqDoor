import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { landingType } from "@/components/landing/typography";

const highlights = [
  "Visualização simples e compreensível das etapas da obra",
  "Segurança de receber o valor cobrado na data certa",
  "Assinatura, Pagamento e Visualização das etapas em um único ato",
  "Mecanismos de geração de provas que protegem juridicamente o seu trabalho",
  "Gestão e organização 100% digital dos documentos das suas obras",
];

const highlightsTrad = [
  "Cliente sem clareza do que foi entregue em cada fase", 
  "Risco de calote e cobrança constrangedora após a entrega",
  "Assinar contrato, cobrar e acompanhar em 3 lugares diferentes",
  "Sem respaldo jurídico quando o cliente contesta o serviço",
  "Papelada perdida, versões desatualizadas e retrabalho constante",
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

const leftCard = {
  hidden: { opacity: 0, x: -40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.7, ease: "easeOut" },
  },
};

const rightCard = {
  hidden: { opacity: 0, x: 40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.7, ease: "easeOut", delay: 0.1 },
  },
};

const listContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const listItem = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35 },
  },
};

export default function LandingComparisonSection() {
  return (
    <section className="w-full bg-white py-16">
      <div className="mx-auto max-w-[1280px] px-6">
        <motion.h2
          className={`mx-auto max-w-[880px] text-center ${landingType.comparisonTitle}`}
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          Já é hora de atualizar o seu modo
          <br />
          de trabalho
        </motion.h2>

        <motion.p
          className={landingType.sectionSubtitle}
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          Compare como a ArqDoor transforma a gestão de obras e contratos, protegendo você e seus clientes.
        </motion.p>

        <div className="mx-auto mt-12 mb-10 grid max-w-[900px] gap-10 lg:grid-cols-2">
          
          {/* TRADICIONAL */}
          <motion.article
            variants={leftCard}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="rounded-[28px] border border-[#d2d7de] bg-[#f8f8f8] p-5 sm:p-6"
          >
            <div className="mx-auto mb-6 w-fit rounded-[18px] bg-[#d4d4d4] px-6 py-3 text-center text-[16px] font-bold text-[#4B5563] sm:text-[17px]">
              Modelo tradicional
            </div>

            <motion.div
              className="space-y-3"
              variants={listContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {highlightsTrad.map((item) => (
                <motion.div
                  key={`traditional-${item}`}
                  variants={listItem}
                  className="flex items-start gap-3 rounded-[14px] border border-[#E5E7EB] bg-[#ebebeb] px-4 py-3"
                >
                  <span className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#ef4444] text-white">
                    <X className="h-4 w-4" strokeWidth={3} />
                  </span>

                  <p className="leading-snug text-[#5d6878] sm:text-sm font-medium">
                    {item}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </motion.article>

          {/* ARQDOOR */}
          <motion.article
            variants={rightCard}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            animate={{
              boxShadow: [
                "0 10px 25px rgba(231,88,18,0.15)",
                "0 18px 40px rgba(231,88,18,0.35)",
                "0 10px 25px rgba(231,88,18,0.15)",
              ],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="rounded-[28px] border-2 border-brand bg-surface-soft p-5 sm:p-6"
          >
            <div className="mx-auto mb-6 w-fit rounded-[18px] bg-brand px-6 py-3 shadow-[0_10px_20px_rgba(231,88,18,0.25)]">
              <img
                src="/images/landing/logo_branca.png"
                alt="ArqDoor"
                className="h-6 w-auto opacity-90 sm:h-7"
              />
            </div>

            <motion.div
              className="space-y-3"
              variants={listContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {highlights.map((item) => (
                <motion.div
                  key={`arq-${item}`}
                  variants={listItem}
                  className="flex items-start gap-3 rounded-[14px] border border-[#f6d8c7] bg-white px-4 py-3"
                >
                  <span className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand text-white">
                    <Check className="h-4 w-4" strokeWidth={3} />
                  </span>

                  <p className="leading-snug text-[#444444] sm:text-sm font-medium">
                    {item}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </motion.article>
        </div>
      </div>
    </section>
  );
}