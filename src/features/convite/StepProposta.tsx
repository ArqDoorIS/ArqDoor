import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, ExternalLink, FileText, Maximize2, Smartphone } from "lucide-react";
import { formatDate, formatPrice } from "@/lib/utils";
import { formatInviteExpiry } from "@/lib/invite-validity";
import type { InviteData, InviteStep, PaymentGroup, ProviderData } from "./types";

type Props = {
  invite: InviteData;
  provider: ProviderData | null;
  pdfUrl: string;
  total: number;
  steps: InviteStep[];
  paymentGroups: PaymentGroup[];
  token: string;
  onContinue: () => void;
};

function ModoExplicado({ method }: { method?: string }) {
  if (method === "escrow") {
    return (
      <div className="rounded-xl bg-orange-50 border border-orange-100 p-4 space-y-1">
        <div className="text-sm font-semibold text-orange-800">Pagamento protegido</div>
        <p className="text-sm text-slate-700">
          Voce paga cada grupo antes de ele comecar. O dinheiro fica guardado na ArqDoor
          e e liberado ao profissional somente quando o grupo for concluido e aprovado.
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-1">
      <div className="text-sm font-semibold text-slate-800">Pagamento direto</div>
      <p className="text-sm text-slate-700">
        Voce paga cada etapa quando ela for concluida e aprovada. Sem adiantamento.
      </p>
    </div>
  );
}

function StepsLista({
  steps,
  paymentGroups,
}: {
  steps: InviteStep[];
  paymentGroups: PaymentGroup[];
}) {
  if (paymentGroups.length > 0) {
    return (
      <div className="space-y-3">
        {paymentGroups.map((group, gi) => {
          const groupSteps = steps.filter(
            (s) => (s.group_id || s.payment_group_id) === group.id
          );
          const groupTotal = groupSteps.reduce((sum, s) => sum + (Number(s.price) || 0), 0);

          return (
            <div key={group.id} className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-orange-500 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-white">{gi + 1}</span>
                  </div>
                  <span className="font-semibold text-slate-900 text-sm">{group.name}</span>
                </div>
                <span className="font-semibold text-orange-600 text-sm whitespace-nowrap">
                  {formatPrice(groupTotal)}
                </span>
              </div>
              <div className="pl-9 space-y-1">
                {groupSteps.map((step, si) => (
                  <div key={si} className="flex items-center justify-between gap-2 text-sm text-slate-600">
                    <span>{step.title}</span>
                    <span className="text-slate-500 whitespace-nowrap">{formatPrice(Number(step.price) || 0)}</span>
                  </div>
                ))}
                {groupSteps[0]?.start_date || groupSteps[0]?.end_date ? (
                  <p className="text-xs text-slate-400 pt-1">
                    {groupSteps[0].start_date ? `Inicio: ${formatDate(groupSteps[0].start_date)}` : ""}
                    {groupSteps[0].end_date ? ` - Fim: ${formatDate(groupSteps[0].end_date)}` : ""}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {steps.map((step, idx) => (
        <div key={idx} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
          <div>
            <span className="text-xs text-slate-400 block">Etapa {idx + 1}</span>
            <span className="text-sm font-medium text-slate-800">{step.title}</span>
            {(step.start_date || step.end_date) && (
              <p className="text-xs text-slate-400 mt-0.5">
                {step.start_date ? formatDate(step.start_date) : ""}
                {step.end_date ? ` - ${formatDate(step.end_date)}` : ""}
              </p>
            )}
          </div>
          <span className="font-semibold text-slate-700 whitespace-nowrap text-sm">
            {formatPrice(Number(step.price) || 0)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function StepProposta({ invite, provider, pdfUrl, total, steps, paymentGroups, token, onContinue }: Props) {
  const [pdfExpanded, setPdfExpanded] = useState(false);
  const providerName = provider?.name || provider?.user?.name || "Prestador";
  const expiryStr = formatInviteExpiry(invite.expires_at);

  return (
    <div className="space-y-5" data-testid="step-proposta">
      {/* Cabecalho com link discreto "Abrir no app" */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">
            {providerName}
            {provider?.profession ? ` - ${provider.profession}` : ""}
          </p>
          <h1 className="text-2xl font-bold text-slate-900 mt-0.5">{invite.title}</h1>
        </div>
        <a
          href={`arqdoor://convite/${token}`}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 whitespace-nowrap mt-1 transition-colors"
          aria-label="Abrir este convite no aplicativo ArqDoor"
        >
          <Smartphone className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Abrir no app</span>
        </a>
      </div>

      {/* Descricao */}
      {invite.description ? (
        <p className="text-sm text-slate-700 leading-relaxed">{invite.description}</p>
      ) : null}

      {/* Total + modo de pagamento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl bg-white border border-slate-200 px-5 py-4">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Total do contrato</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatPrice(total)}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {steps.length} etapa{steps.length !== 1 ? "s" : ""}
          </p>
        </div>
        <ModoExplicado method={invite.provider_receiving_method} />
      </div>

      {/* Etapas / grupos */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">
          {paymentGroups.length > 0 ? "Grupos de pagamento" : "Etapas"}
        </h2>
        <StepsLista steps={steps} paymentGroups={paymentGroups} />
      </div>

      {/* PDF do contrato */}
      {pdfUrl ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
              Contrato em PDF
            </h2>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPdfExpanded((v) => !v)}
                className="text-xs text-slate-500 gap-1.5"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                {pdfExpanded ? "Minimizar" : "Ver em tela cheia"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(pdfUrl, "_blank")}
                className="text-xs text-slate-500 gap-1.5"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Abrir
              </Button>
            </div>
          </div>
          {pdfExpanded ? (
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
              <iframe
                src={pdfUrl}
                title="Contrato em PDF"
                className="w-full"
                style={{ height: "60vh" }}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setPdfExpanded(true)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-center gap-3 py-6 text-sm text-slate-600 font-medium"
              aria-label="Clique para visualizar o contrato em PDF"
            >
              <FileText className="h-5 w-5 text-orange-500" />
              Clique para visualizar o contrato antes de assinar
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          O prestador ainda nao anexou o contrato em PDF. Voce podera assinar quando ele for disponibilizado.
        </div>
      )}

      {/* Validade do link */}
      {expiryStr && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Clock className="h-3.5 w-3.5" />
          <span>Este link vale ate {expiryStr}</span>
        </div>
      )}

      {/* CTA */}
      <div className="pt-2">
        <Button
          onClick={onContinue}
          className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white text-base font-semibold px-8 py-3 h-12 rounded-xl"
          disabled={!pdfUrl}
        >
          Continuar para assinar
        </Button>
        {!pdfUrl && (
          <p className="text-xs text-slate-400 mt-2">
            O PDF do contrato precisa estar disponivel para continuar.
          </p>
        )}
      </div>
    </div>
  );
}
