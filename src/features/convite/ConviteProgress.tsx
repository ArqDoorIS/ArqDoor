import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FlowStep } from "./types";

type Props = {
  currentStep: FlowStep;
};

const STEPS = [
  { n: 1 as const, label: "Proposta" },
  { n: 2 as const, label: "Conta" },
  { n: 3 as const, label: "Assinar" },
  { n: 4 as const, label: "Pagamento" },
];

export function ConviteProgress({ currentStep }: Props) {
  // Passo 5 = Pronto, que nao aparece na barra
  const displayStep = Math.min(currentStep, 4) as 1 | 2 | 3 | 4;

  return (
    <div className="w-full bg-white border-b shadow-sm" aria-label="Progresso do percurso">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="flex items-center py-3 gap-0">
          {STEPS.map((step, idx) => {
            const done = step.n < displayStep;
            const active = step.n === displayStep;
            const last = idx === STEPS.length - 1;

            return (
              <div key={step.n} className="flex items-center flex-1 min-w-0">
                {/* Circulo + label */}
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ring-2 transition-colors",
                      active
                        ? "ring-brand bg-brand text-white"
                        : done
                          ? "ring-brand bg-brand-soft text-brand-dark"
                          : "ring-line bg-white text-muted-foreground"
                    )}
                    aria-current={active ? "step" : undefined}
                  >
                    {done ? <Check className="h-3.5 w-3.5" /> : step.n}
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-medium tracking-wide hidden sm:block",
                      active
                        ? "text-brand-dark"
                        : done
                          ? "text-brand-light"
                          : "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </span>
                </div>

                {/* Linha de conexao */}
                {!last && (
                  <div
                    className={cn(
                      "flex-1 h-0.5 mx-1 rounded-full",
                      done ? "bg-brand-disabled" : "bg-surface-cream"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
