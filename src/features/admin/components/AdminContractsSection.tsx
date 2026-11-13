import { useState } from "react";
import type { AdminTicketRow } from "../types";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatRelativeTime,
  openSecureFile,
  participantRoleLabel,
  participantSubtitle,
  participantTone,
  preferenceLabel,
  stepStatusTone,
} from "../utils";
import { apiRequest } from "@/lib/queryClient";
import { EmptyState, SectionCard, StatusBadge } from "./AdminPrimitives";
import { ChevronDown, ChevronUp, ExternalLink, Loader2 } from "lucide-react";

type AdminContractsSectionProps = {
  tickets: AdminTicketRow[];
};

type StepRow = {
  id: number;
  title: string;
  price: number | string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  is_financially_cleared: boolean;
  is_signature_step: boolean;
  fee_amount?: number | string | null;
  /** quando o prestador declarou a entrega */
  confirm_freelancerAt?: string | null;
  /** aprovada sozinha depois de 3 dias sem resposta do cliente */
  auto_approved_at?: string | null;
  paymentGroup?: { id: number; name: string; sequence: number } | null;
};

function ContractStepsPanel({ ticketId }: { ticketId: number }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<StepRow[] | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest("GET", `/admin/contracts/${ticketId}/steps`);
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body?.success === false) {
        throw new Error((body as { message?: string }).message || "Erro ao carregar etapas.");
      }
      setSteps(Array.isArray(body?.data) ? body.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar etapas.");
    } finally {
      setLoading(false);
    }
  };

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && steps === null && !loading) void load();
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:bg-slate-50"
      >
        <span>Etapas do contrato</span>
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {open ? (
        <div className="border-t border-slate-100 p-2 space-y-1.5">
          {loading ? (
            <div className="flex items-center gap-2 px-2 py-3 text-xs text-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Carregando…
            </div>
          ) : error ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1.5 text-xs text-rose-700">
              {error}
            </div>
          ) : steps && steps.length === 0 ? (
            <p className="px-2 py-2 text-xs text-slate-500">Nenhuma etapa cadastrada.</p>
          ) : steps ? (
            steps.map((step, idx) => (
              <div
                key={step.id}
                className="rounded-md border border-slate-100 bg-slate-50 px-2 py-1.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      {idx + 1}. {step.title}
                      {step.is_signature_step ? (
                        <span className="ml-1 text-[10px] text-slate-500">(assinatura)</span>
                      ) : null}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
                      {step.paymentGroup ? (
                        <span>Grupo: {step.paymentGroup.name}</span>
                      ) : null}
                      {step.start_date ? (
                        <span>{formatDate(step.start_date)} → {formatDate(step.end_date)}</span>
                      ) : null}
                      {step.confirm_freelancerAt ? (
                        <span>Entregue {formatDateTime(step.confirm_freelancerAt)}</span>
                      ) : null}
                      {step.auto_approved_at ? (
                        <span>Aprovada sozinha {formatDateTime(step.auto_approved_at)} (cliente não respondeu em 3 dias)</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-0.5">
                    <span className="text-xs font-semibold text-slate-900">
                      {formatCurrency(Number(step.price) || 0)}
                    </span>
                    <div className="flex flex-wrap items-center gap-1">
                      <StatusBadge label={step.status} tone={stepStatusTone(step.status)} />
                      {step.is_financially_cleared ? (
                        <StatusBadge label="Pago" tone="emerald" />
                      ) : null}
                      {step.auto_approved_at ? (
                        <StatusBadge label="Aprovada automaticamente" tone="amber" />
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function AdminContractsSection({ tickets }: AdminContractsSectionProps) {
  return (
    <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {tickets.length ? (
        tickets.map((ticket) => (
          <SectionCard
            key={ticket.id}
            title={`Contrato #${ticket.id}`}
            subtitle={`${ticket.contractor?.name || "Cliente"} • ${ticket.provider?.name || "Prestador"}`}
            className="h-full"
          >
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <StatusBadge
                  label={ticket.status}
                  tone={
                    ticket.status === "concluída"
                      ? "emerald"
                      : ticket.status === "cancelada"
                        ? "rose"
                        : "amber"
                  }
                />
                <StatusBadge label={preferenceLabel(ticket.payment_preference)} tone="slate" />
                {ticket.has_signed_document ? (
                  <StatusBadge label="Assinado" tone="emerald" />
                ) : (
                  <StatusBadge label="Sem assinatura" tone="amber" />
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[22px] bg-slate-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Valor
                  </p>
                  <p className="mt-2 text-xl font-semibold text-slate-950">
                    {formatCurrency(ticket.total_price)}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {ticket.steps_count} etapa(s) cadastradas
                  </p>
                </div>
                <div className="rounded-[22px] bg-slate-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Cobrança
                  </p>
                  <p className="mt-2 text-xl font-semibold text-slate-950">
                    {ticket.running_payments_count}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatCurrency(ticket.running_payments_amount)} em aberto
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {[ticket.contractor, ticket.provider].map((participant) => (
                  <div
                    key={`${ticket.id}-${participant?.id || participantRoleLabel(participant)}`}
                    className="rounded-[22px] border border-slate-200 bg-white px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {participant?.name || "Sem vínculo"}
                        </p>
                        <p className="text-xs text-slate-500">{participantSubtitle(participant)}</p>
                      </div>
                      <StatusBadge
                        label={participantRoleLabel(participant)}
                        tone={participantTone(participant)}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <ContractStepsPanel ticketId={ticket.id} />

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-3">
                <div className="text-sm text-slate-500" title={formatDateTime(ticket.updated_at)}>
                  Atualizado {formatRelativeTime(ticket.updated_at)}
                </div>
                {ticket.latest_document ? (
                  <button
                    onClick={() =>
                      openSecureFile(
                        ticket.latest_document?.download_url || ticket.latest_document?.pdf_path
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Abrir PDF
                  </button>
                ) : (
                  <span className="text-sm text-slate-400">Sem PDF anexado</span>
                )}
              </div>
            </div>
          </SectionCard>
        ))
      ) : (
        <div className="lg:col-span-2 xl:col-span-3">
          <EmptyState
            title="Nenhum contrato apareceu nesse recorte"
            description="Ajuste o status, a faixa de valor ou o período para reenquadrar a busca."
          />
        </div>
      )}
    </div>
  );
}
