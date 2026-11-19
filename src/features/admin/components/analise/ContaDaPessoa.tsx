import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { SectionCard } from "../AdminPrimitives";
import { cn } from "../../utils";
import { baixarChat, horaDaMensagem, type ChatParaBaixar, type MensagemDoChat } from "../conversaParaBaixar";
import type { AdminOperationalConversation, AdminOperationalStep, AdminOperationalTicket, AdminUserOperationsOverview, Participant } from "../../types";
import { BotaoBaixarConversa, ConversaCompleta } from "./ConversaCompleta";
import { Carregando, Erro, EtiquetaPH, ler, quando, reais, rotulo, usd, useApi, type ConteudoJanela } from "./comum";
import type { Ficha, GuardadoDaConta } from "./tipos";

/**
 * Investigar (19/11/2026), duas abas:
 *   Conversas  o chat com cada pessoa (inteiro, com Baixar) e as conversas com a IA
 *   Conta      contratos com as fases (GET /admin/users/:id/operations, a mesma visão da tela
 *              Usuários), rascunhos e arquivados (da ficha: ficha.guardados)
 */

type RespostaDoChat = { data: { conversation: { conversation_id: number; participants: Participant[] }; messages: MensagemDoChat[] } };

const STATUS_CONTRATO: Record<string, string> = { pendente: "esperando assinar e pagar", "em andamento": "em andamento", "concluída": "concluído", cancelada: "cancelado" };
const STATUS_PAGAMENTO: Record<string, string> = {
  awaiting_deposit: "esperando o 1º pagamento", deposit_pending: "1º pagamento em processamento", deposit_paid: "1º pagamento feito",
  awaiting_steps: "esperando pagar as fases", partial_steps: "parte das fases paga", steps_paid: "todas as fases pagas",
};
const STATUS_FASE: Record<string, string> = { Pendente: "não começou", "Em Andamento": "em andamento", Concluido: "concluída", Recusado: "recusada pelo cliente" };

const paraBaixar = (r: RespostaDoChat["data"]): ChatParaBaixar => ({
  conversation_id: r.conversation.conversation_id,
  participantes: r.conversation.participants.map((p) => ({ id: p.id, nome: p.name ?? null })),
  mensagens: r.messages,
});

/** O chat inteiro entre as duas pessoas, numa janela. */
function ChatCompleto({ id, dono }: { id: number; dono: number }) {
  const { dado, erro } = useApi<RespostaDoChat>(`/admin/conversations/${id}/messages`);
  if (erro) return <Erro msg={erro} />;
  if (!dado) return <Carregando />;
  const c = paraBaixar(dado.data);
  const nome = (uid: number) => c.participantes.find((p) => p.id === uid)?.nome ?? `Conta ${uid}`;
  const msgs = [...c.mensagens].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500">{msgs.length} {msgs.length === 1 ? "mensagem" : "mensagens"}</span>
        <span className="ml-auto" />
        <button type="button" onClick={() => baixarChat(c, "txt")} className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-bold text-white"><Download className="h-3.5 w-3.5" />Baixar .txt</button>
        <button type="button" onClick={() => baixarChat(c, "json")} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-800"><Download className="h-3.5 w-3.5" />.json</button>
      </div>
      {!msgs.length ? <p className="text-sm text-slate-500">Conversa aberta, sem mensagens.</p> : (
        <div className="space-y-1.5" aria-label="Mensagens do chat">
          {msgs.map((m) => {
            const minha = m.sender_id === dono;
            return (
              <div key={m.message_id} data-testid="mensagem-do-chat" className={cn("max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-1.5", minha ? "ml-auto bg-orange-50" : "bg-slate-100")}>
                <div className="text-[10px] font-semibold text-slate-500">{nome(m.sender_id)} · {horaDaMensagem(m.createdAt)}</div>
                {m.content}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BotaoBaixarChat({ id }: { id: number }) {
  const [baixando, setBaixando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const baixar = async () => {
    setBaixando(true); setErro(null);
    try {
      const b = (await apiRequest("GET", `/admin/conversations/${id}/messages`).then(ler)) as RespostaDoChat;
      baixarChat(paraBaixar(b.data), "txt");
    } catch (e: any) { setErro(e.message); } finally { setBaixando(false); }
  };
  return (
    <button type="button" disabled={baixando} title={erro ?? "Baixar o chat inteiro em .txt"} onClick={() => void baixar()}
      className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold disabled:opacity-60", erro ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-800")}>
      {baixando ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}{erro ? "Tentar de novo" : "Baixar"}
    </button>
  );
}

const outro = (c: AdminOperationalConversation, dono: number) => c.participants.find((p) => p && p.id !== dono) ?? null;

function SimNao({ sim, texto }: { sim: boolean; texto: string }) {
  return <span className={cn("whitespace-nowrap rounded px-1.5 text-[11px] font-semibold", sim ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400")}>{sim ? "✓ " : ""}{texto}</span>;
}

/** Detalhe de um contrato: situação, pagamento e cada fase. */
function DetalheDoContrato({ t }: { t: AdminOperationalTicket }) {
  const fases = t.steps.filter((s) => s.price > 0);
  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
        <dt className="text-slate-500">Situação</dt><dd className="font-semibold text-slate-900">{STATUS_CONTRATO[t.status] ?? t.status}</dd>
        <dt className="text-slate-500">Pagamento</dt><dd className="font-semibold text-slate-900">{t.payment_status ? STATUS_PAGAMENTO[t.payment_status] ?? t.payment_status : "—"}</dd>
        <dt className="text-slate-500">Cliente</dt><dd className="font-semibold text-slate-900">{t.contractor?.name ?? "—"}{t.contractor ? <> <EtiquetaPH id={t.contractor.id} leve /></> : null}</dd>
        <dt className="text-slate-500">Profissional</dt><dd className="font-semibold text-slate-900">{t.provider?.name ?? "—"}{t.provider ? <> <EtiquetaPH id={t.provider.id} leve /></> : null}</dd>
        <dt className="text-slate-500">Criado em</dt><dd className="font-semibold text-slate-900">{quando(t.created_at)}</dd>
        <dt className="text-slate-500">Última mudança</dt><dd className="font-semibold text-slate-900">{quando(t.updated_at)}</dd>
        <dt className="text-slate-500">Contrato assinado</dt><dd className="font-semibold text-slate-900">{t.latest_document ? (t.latest_document.signed ? `sim, ${quando(t.latest_document.date)}` : "gerado, sem assinatura") : "sem documento"}</dd>
        <dt className="text-slate-500">Pronto para repassar</dt><dd className="font-semibold text-slate-900">{t.ready_payout_steps_count ? `${t.ready_payout_steps_count} fase(s) · ${reais(t.ready_payout_total)}` : "nada"}</dd>
      </dl>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="text-[11px] uppercase tracking-wide text-slate-400"><tr><th className="py-1">Fase</th><th>Valor</th><th>Situação</th><th>Andamento</th></tr></thead>
          <tbody>{fases.map((s: AdminOperationalStep) => (
            <tr key={s.id} className="border-t border-slate-100 align-top">
              <td className="py-1.5"><b className="block text-slate-900">{s.title}</b>{t.groups.length > 1 ? <small className="text-xs text-slate-400">{s.group_label}</small> : null}</td>
              <td className="py-1.5 font-semibold">{reais(s.price)}</td>
              <td className={cn("py-1.5", s.status === "Recusado" && "font-semibold text-rose-600")}>{STATUS_FASE[s.status] ?? s.status}</td>
              <td className="py-1.5"><div className="flex flex-wrap gap-1"><SimNao sim={s.is_financially_cleared} texto="paga" /><SimNao sim={s.confirm_freelancer} texto="entregue" /><SimNao sim={s.confirm_contractor} texto="aprovada" /><SimNao sim={s.payout_ready} texto="pronta p/ repasse" /></div></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">Para mexer no contrato (repasse, fases), use a tela Usuários ou Contratos do painel.</p>
    </div>
  );
}

function Guardados({ itens, vazio, nome, rotuloDoTipo, abrir }: { itens: GuardadoDaConta[]; vazio: string; nome: string; rotuloDoTipo: string; abrir: (c: ConteudoJanela) => void }) {
  if (!itens.length) return <p className="text-xs text-slate-400">{vazio}</p>;
  return (
    <div className="space-y-1.5">
      {itens.map((it, i) => (
        <button key={i} type="button"
          onClick={() => abrir({
            titulo: it.titulo, sub: `${nome} · ${rotuloDoTipo}`,
            corpo: (
              <div className="space-y-3">
                <p className="text-slate-500">{it.sub}</p>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">{Object.entries(it.campos).map(([k, v]) => <div key={k} className="contents"><dt className="text-slate-500">{k}</dt><dd className="font-semibold text-slate-900">{v}</dd></div>)}</dl>
                {it.conversa_id ? <ConversaCompleta id={it.conversa_id} nome={nome} /> : null}
              </div>
            ),
          })}
          className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 px-2.5 py-2 text-left hover:border-orange-300">
          <span><b className="block text-[13px] text-slate-900">{it.titulo}</b><small className="text-xs text-slate-500">{it.sub}</small></span><span className="text-slate-400">›</span>
        </button>
      ))}
    </div>
  );
}

type Props = { id: number; nome: string; f: Ficha | undefined; abrir: (c: ConteudoJanela) => void; investigar: (id: number) => void };

/** A visão operacional da conta (a mesma da tela Usuários): conversas e contratos. */
const useOperacoes = (id: number) => {
  const ops = useApi<{ data: AdminUserOperationsOverview }>(`/admin/users/${id}/operations`, 90000);
  const o = ops.dado?.data;
  return { ops, o, conversas: (o?.conversations ?? []).filter((c) => !c.is_admin_thread), contratos: (o?.conversations ?? []).flatMap((c) => c.contracts) };
};

/** Investigar › Conversas: o chat com cada pessoa e as conversas com a IA. */
export function ConversasDaPessoa({ id, nome, f, abrir, investigar }: Props) {
  const { ops, o, conversas } = useOperacoes(id);
  return (
    <div className="space-y-4">
      <SectionCard title="Conversas no chat" subtitle="Com quem a pessoa conversou no app. Ver abre a conversa inteira; Baixar salva em .txt">
        {ops.erro ? <Erro msg={ops.erro} /> : !o ? <Carregando /> : !conversas.length ? <p className="text-sm text-slate-500">Nenhuma conversa no chat.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wide text-slate-400"><tr><th className="py-1">Com quem</th><th>Mensagens</th><th>Última mensagem</th><th>Contratos</th><th /></tr></thead>
              <tbody>{conversas.map((c) => {
                const p = outro(c, id);
                return (
                  <tr key={c.conversation_id} className="border-t border-slate-100 align-top">
                    <td className="py-1.5">
                      <b className="block text-slate-900">{p?.name ?? "—"}</b>
                      {p ? <button type="button" onClick={() => investigar(p.id)} className="text-left"><EtiquetaPH id={p.id} leve /> <small className="text-xs text-slate-400">{p.type === "prestador" ? "profissional" : "cliente"}</small></button> : null}
                    </td>
                    <td className="py-1.5">{c.message_count}</td>
                    <td className="max-w-[320px] py-1.5"><small className="block text-[11px] text-slate-400">{quando(c.last_message_at)}</small><span className="line-clamp-2 text-xs text-slate-600">{c.last_message_preview ?? "—"}</span></td>
                    <td className="py-1.5">{c.contracts.length || "—"}</td>
                    <td className="whitespace-nowrap py-1.5 text-right">
                      <button type="button" className="mr-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold" onClick={() => abrir({ titulo: `Chat com ${p?.name ?? "—"}`, sub: `${nome} · ${c.message_count} mensagens`, corpo: <ChatCompleto id={c.conversation_id} dono={id} /> })}>ver</button>
                      <BotaoBaixarChat id={c.conversation_id} />
                    </td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Conversas com a IA" subtitle="Ver abre a conversa inteira; Baixar salva em .txt">
        {!f?.conversas_ia?.length ? <p className="text-sm text-slate-500">Nenhuma conversa com a IA ainda.</p> : (
          <table className="w-full text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-slate-400"><tr><th className="py-1">Conversa</th><th>Quando</th><th>Mensagens</th><th>Custo</th><th>Sinais</th><th /></tr></thead>
            <tbody>{f.conversas_ia.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="py-1.5 font-semibold">{rotulo(c.tipo)}</td><td>{quando(c.quando)}</td><td>{c.mensagens}</td><td>{c.custo_usd == null ? "—" : usd(c.custo_usd)}</td><td>{c.sinais}</td>
                <td className="whitespace-nowrap text-right">
                  <button type="button" className="mr-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold" onClick={() => abrir({ titulo: `Conversa: ${rotulo(c.tipo)}`, sub: `${nome} · ${quando(c.quando)}`, corpo: <ConversaCompleta id={c.id} nome={nome} /> })}>ver</button>
                  <BotaoBaixarConversa id={c.id} />
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </SectionCard>

    </div>
  );
}

/** Investigar › Conta: contratos com as fases, rascunhos e arquivados. */
export function ContaDaPessoa({ id, nome, f, abrir }: Props) {
  const { ops, o, contratos } = useOperacoes(id);
  const g = f?.guardados;
  return (
    <div className="space-y-4">
      {o ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {([["Contratos", o.summary.contracts_count], ["Contratos ativos", o.summary.active_contracts_count], ["Pronto para repassar", reais(o.summary.ready_payout_total)], ["Rascunhos", g ? g.rascunhos.length : "—"]] as [string, string | number][]).map(([k, v]) => (
            <div key={k} className="rounded-xl border border-slate-200 bg-white px-3 py-2"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{k}</p><p className="text-lg font-bold text-slate-950">{v}</p></div>
          ))}
        </div>
      ) : null}

      <SectionCard title="Contratos" subtitle="Todos os contratos da conta, com as fases. Clique para ver o detalhe.">
        {ops.erro ? <Erro msg={ops.erro} /> : !o ? <Carregando /> : !contratos.length ? <p className="text-sm text-slate-500">Nenhum contrato.</p> : (
          <div className="space-y-1.5">
            {contratos.map((t) => {
              const fases = t.steps.filter((s) => s.price > 0);
              const feitas = fases.filter((s) => s.status === "Concluido").length;
              const recusadas = fases.filter((s) => s.status === "Recusado").length;
              const comQuem = id === t.contractor?.id ? t.provider?.name : t.contractor?.name;
              return (
                <button key={t.id} type="button" onClick={() => abrir({ titulo: `Contrato ${t.id} · ${reais(t.total_price)}`, sub: `${nome} com ${comQuem ?? "—"}`, corpo: <DetalheDoContrato t={t} /> })}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 px-2.5 py-2 text-left hover:border-orange-300">
                  <span>
                    <b className="block text-[13px] text-slate-900">{reais(t.total_price)} · contrato {t.id} · com {comQuem ?? "—"}</b>
                    <small className="text-xs text-slate-500">{STATUS_CONTRATO[t.status] ?? t.status} · {feitas} de {fases.length} fases concluídas{recusadas ? ` · ${recusadas} recusada(s)` : ""} · {t.payment_status ? STATUS_PAGAMENTO[t.payment_status] ?? t.payment_status : "sem pagamento"}</small>
                  </span>
                  <span className="text-slate-400">›</span>
                </button>
              );
            })}
          </div>
        )}
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title="Rascunhos" subtitle="O que a pessoa começou e não terminou">
          {!g ? <p className="text-xs text-slate-400">Ainda não chegou do servidor.</p> : (
            <>
              <Guardados itens={g.rascunhos} vazio="Nenhum rascunho." nome={nome} rotuloDoTipo="rascunho" abrir={abrir} />
              {g.aviso_rascunhos ? <p className="mt-2 text-[11px] text-slate-400">{g.aviso_rascunhos}</p> : null}
            </>
          )}
        </SectionCard>
        <SectionCard title="Arquivados e encerrados" subtitle="Ofertas arquivadas, pedidos e propostas cancelados">
          {!g ? <p className="text-xs text-slate-400">Ainda não chegou do servidor.</p> : <Guardados itens={g.arquivados} vazio="Nada arquivado." nome={nome} rotuloDoTipo="arquivado" abrir={abrir} />}
        </SectionCard>
      </div>
    </div>
  );
}

