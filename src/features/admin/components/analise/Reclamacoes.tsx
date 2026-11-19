import { MessageSquareWarning } from "lucide-react";
import { SectionCard } from "../AdminPrimitives";
import { cn } from "../../utils";
import type { AdminUserOperationsOverview, ReclamacaoDeFase } from "../../types";
import { Carregando, Erro, reais, useApi, type ConteudoJanela } from "./comum";
import { DetalheDoContrato } from "./DetalheDoContrato";
import { ondeEsta } from "./ReclamacaoDoPainel";

/**
 * Reclamações de fase (19/11/2026): a lista do que está aberto ou ainda pede ação da
 * ArqDoor (decidir, marcar reembolso ou repasse feito, encerrar contrato). Abrir leva ao
 * contrato, onde ficam o texto do cliente, a resposta do profissional e os botões.
 */
type Item = ReclamacaoDeFase & {
  fase: { id: number; titulo: string; valor: number } | null;
  cliente: { id: number; nome: string | null } | null;
  profissional: { id: number; nome: string | null } | null;
};

/** O contrato da reclamação, lido pela visão operacional do cliente. */
function ContratoDaReclamacao({ donoId, ticketId, aoMudar }: { donoId: number; ticketId: number; aoMudar: () => void }) {
  const { dado, erro } = useApi<{ data: AdminUserOperationsOverview }>(`/admin/users/${donoId}/operations`, 90000);
  if (erro) return <Erro msg={erro} />;
  if (!dado) return <Carregando />;
  const t = dado.data.conversations.flatMap((c) => c.contracts).find((x) => x.id === ticketId);
  if (!t) return <p className="text-sm text-slate-500">Contrato {ticketId} não encontrado.</p>;
  return <DetalheDoContrato t={t} donoId={donoId} aoMudar={aoMudar} />;
}

export function Reclamacoes({ abrir }: { abrir: (c: ConteudoJanela) => void }) {
  const { dado, erro, deNovo } = useApi<{ data: Item[] }>("/admin/reclamacoes?abertas=1");
  const lista = [...(dado?.data ?? [])].sort((a, b) => Number(ondeEsta(b).acao) - Number(ondeEsta(a).acao));
  return (
    <SectionCard title="Reclamações" subtitle="Fases recusadas pelo cliente. Em cima, as que esperam a ArqDoor.">
      {erro ? <Erro msg={erro} /> : !dado ? <Carregando /> : !lista.length ? <p className="text-sm text-slate-500">Nenhuma reclamação aberta.</p> : (
        <div className="space-y-1.5">
          {lista.map((r) => {
            const onde = ondeEsta(r);
            return (
              <button key={r.id} type="button" data-testid="reclamacao-na-lista"
                onClick={() => r.cliente && abrir({
                  titulo: `Contrato ${r.ticket_id} · reclamação de "${r.fase?.titulo ?? "fase"}"`,
                  sub: `${r.cliente?.nome ?? "Cliente"} com ${r.profissional?.nome ?? "profissional"}`,
                  corpo: <ContratoDaReclamacao donoId={r.cliente.id} ticketId={r.ticket_id} aoMudar={deNovo} />,
                })}
                className={cn("flex w-full items-start gap-2.5 rounded-lg border px-2.5 py-2 text-left hover:border-orange-300", onde.acao ? "border-rose-200 bg-rose-50/40" : "border-slate-200")}>
                <MessageSquareWarning className={cn("mt-0.5 h-4 w-4 shrink-0", onde.acao ? "text-rose-600" : "text-amber-600")} />
                <span className="min-w-0 flex-1">
                  <b className="block text-[13px] text-slate-900">{r.fase?.titulo ?? "Fase"} · {reais(r.fase?.valor)} · {r.cliente?.nome ?? "—"} com {r.profissional?.nome ?? "—"}</b>
                  <small className="line-clamp-1 text-xs text-slate-500">“{r.texto}”</small>
                  <small className={cn("block text-xs font-semibold", onde.acao ? "text-rose-700" : "text-slate-600")}>{onde.texto}</small>
                </span>
                <span className="text-slate-400">›</span>
              </button>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
