import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, ExternalLink, FileText, Maximize2, Smartphone } from "lucide-react";
import { formatDate, formatPrice } from "@/lib/utils";
import { formatInviteExpiry } from "@/lib/invite-validity";
import { linkDoAppParaConvite, navegadorAndroid } from "@/lib/invite-app-link";
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
      <div className="rounded-xl bg-brand-tint border border-brand-soft p-4 space-y-1">
        <div className="text-sm font-semibold text-brand-dark">Pagamento protegido</div>
        <p className="text-sm text-ink">
          Você paga cada grupo antes de ele começar. O dinheiro fica guardado na ArqDoor
          e é liberado ao profissional somente quando o grupo for concluído e aprovado.
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-xl bg-surface-soft border border-line p-4 space-y-1">
      <div className="text-sm font-semibold text-ink">Pagamento direto</div>
      <p className="text-sm text-ink">
        Você paga cada etapa quando ela for concluída e aprovada. Sem adiantamento.
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
            <div key={group.id} className="rounded-xl border border-line bg-white p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-brand flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-white">{gi + 1}</span>
                  </div>
                  <span className="font-semibold text-ink-strong text-sm">{group.name}</span>
                </div>
                <span className="font-semibold text-brand-dark text-sm whitespace-nowrap">
                  {formatPrice(groupTotal)}
                </span>
              </div>
              <div className="pl-9 space-y-1">
                {groupSteps.map((step, si) => (
                  <div key={si} className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                    <span>{step.title}</span>
                    <span className="text-muted-foreground whitespace-nowrap">{formatPrice(Number(step.price) || 0)}</span>
                  </div>
                ))}
                {groupSteps[0]?.start_date || groupSteps[0]?.end_date ? (
                  <p className="text-xs text-muted-foreground pt-1">
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
        <div key={idx} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white px-4 py-3">
          <div>
            <span className="text-xs text-muted-foreground block">Etapa {idx + 1}</span>
            <span className="text-sm font-medium text-ink">{step.title}</span>
            {(step.start_date || step.end_date) && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {step.start_date ? formatDate(step.start_date) : ""}
                {step.end_date ? ` - ${formatDate(step.end_date)}` : ""}
              </p>
            )}
          </div>
          <span className="font-semibold text-ink whitespace-nowrap text-sm">
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
  // So no Android: la o intent abre o app instalado ou volta para esta pagina.
  const appLink =
    typeof window !== "undefined" && navegadorAndroid(navigator.userAgent)
      ? linkDoAppParaConvite(token, window.location.hostname, window.location.href)
      : null;
  const expiryStr = formatInviteExpiry(invite.expires_at);

  return (
    <div className="space-y-5" data-testid="step-proposta">
      {/* Cabecalho com link discreto "Abrir no app" */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {providerName}
            {provider?.profession ? ` - ${provider.profession}` : ""}
          </p>
          <h1 className="text-2xl font-bold text-ink-strong mt-0.5">{invite.title}</h1>
        </div>
        {appLink && (
          <a
            href={appLink}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-muted-foreground whitespace-nowrap mt-1 transition-colors"
            aria-label="Abrir este convite no aplicativo ArqDoor"
            data-testid="abrir-no-app"
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>Abrir no app</span>
          </a>
        )}
      </div>

      {/* Descricao */}
      {invite.description ? (
        <p className="text-sm text-ink leading-relaxed">{invite.description}</p>
      ) : null}

      {/* Total + modo de pagamento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl bg-white border border-line px-5 py-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total do contrato</p>
          <p className="text-2xl font-bold text-ink-strong mt-1">{formatPrice(total)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {steps.length} etapa{steps.length !== 1 ? "s" : ""}
          </p>
        </div>
        <ModoExplicado method={invite.provider_receiving_method} />
      </div>

      {/* Etapas / grupos */}
      <div>
        <h2 className="text-sm font-semibold text-ink mb-2 uppercase tracking-wide">
          {paymentGroups.length > 0 ? "Grupos de pagamento" : "Etapas"}
        </h2>
        <StepsLista steps={steps} paymentGroups={paymentGroups} />
      </div>

      {/* PDF do contrato */}
      {pdfUrl ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-ink uppercase tracking-wide">
              Contrato em PDF
            </h2>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPdfExpanded((v) => !v)}
                className="text-xs text-muted-foreground gap-1.5"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                {pdfExpanded ? "Minimizar" : "Ver em tela cheia"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(pdfUrl, "_blank")}
                className="text-xs text-muted-foreground gap-1.5"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Abrir
              </Button>
            </div>
          </div>
          {pdfExpanded ? (
            <div className="rounded-xl overflow-hidden border border-line bg-surface-warm">
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
              className="w-full rounded-xl border border-line bg-surface-soft hover:bg-surface-warm transition-colors flex items-center justify-center gap-3 py-6 text-sm text-muted-foreground font-medium"
              aria-label="Clique para visualizar o contrato em PDF"
            >
              <FileText className="h-5 w-5 text-brand" />
              Clique para visualizar o contrato antes de assinar
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-warning/30 bg-warning-bg px-4 py-3 text-sm text-warning-text">
          O prestador ainda não anexou o contrato em PDF. Você poderá assinar quando ele for disponibilizado.
        </div>
      )}

      {/* Validade do link */}
      {expiryStr && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>Este link vale até {expiryStr}</span>
        </div>
      )}

      {/* CTA */}
      <div className="pt-2">
        <Button
          onClick={onContinue}
          className="w-full sm:w-auto bg-brand hover:bg-brand-dark text-white text-base font-semibold px-8 py-3 h-12 rounded-xl"
          disabled={!pdfUrl}
        >
          Continuar para assinar
        </Button>
        {!pdfUrl && (
          <p className="text-xs text-muted-foreground mt-2">
            O PDF do contrato precisa estar disponível para continuar.
          </p>
        )}
      </div>
    </div>
  );
}
