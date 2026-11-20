import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { SectionCard } from "../AdminPrimitives";
import { cn } from "../../utils";
import { Carregando, Erro, EtiquetaPH, quando, useApi, type ConteudoJanela } from "./comum";

/**
 * Histórico das listas de recomendação (19/11/2026). Cada pedido que recebeu lista, com a
 * versão das regras, quantos o algoritmo olhou e quantos passaram, e o que aconteceu depois.
 * Abrir mostra a lista inteira: o porquê de cada sugerido e quem ficou de fora.
 *
 *   GET /admin/algoritmo/listas?pagina&busca
 *   GET /admin/algoritmo/listas/:demandId
 */
type ItemDaLista = {
  demand_id: number; titulo: string; status: string | null; cliente: { id: number; nome: string | null } | null; criada_em: string | null;
  config_versao: number | null; candidatos: number | null; elegiveis: number | null; sugeridos: number; chamados: number; responderam: number; fecharam: number;
  primeiros: { nome: string; mostrado: number | null }[];
};
type Fator = { rotulo: string; peso: number };
type Sugerido = {
  posicao: number; grupo: string; profissional: { id: number; nome: string | null; profissao: string | null };
  real: number | null; mostrado: number | null; chance: number | null; porque: { fatores: Fator[]; encaixe: number } | null;
  chamado_em: string | null; respondeu: boolean; oferta_compatibilidade: number | null; fechou: boolean;
};
type ListaInteira = {
  pedido: { id: number; titulo: string; resumo: string | null; status: string; profissoes: string[] | null; cliente: { id: number; nome: string | null }; criado_em: string | null };
  config_versao: number; candidatos: number | null; elegiveis: number | null; criada_em: string | null;
  sugeridos: Sugerido[]; excluidos: { user_id: number; nome: string | null; motivo: string }[]; excluidos_por_motivo: Record<string, number>;
};

const pesoTxt = (p: number) => `×${p.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}`;
const Sim = ({ ok, texto }: { ok: boolean; texto: string }) => (
  <span className={cn("inline-flex items-center gap-0.5 whitespace-nowrap rounded px-1.5 text-[11px] font-semibold", ok ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400")}>
    {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}{texto}
  </span>
);

/** A lista inteira de um pedido (usada no histórico e nos matchs da pessoa). */
export function DetalheDaLista({ demandId, investigar }: { demandId: number; investigar?: (id: number) => void }) {
  const { dado, erro } = useApi<ListaInteira>(`/admin/algoritmo/listas/${demandId}`);
  if (erro) return <Erro msg={erro} />;
  if (!dado) return <Carregando />;
  if (!dado.pedido) return <p className="text-sm text-slate-500">Lista não encontrada.</p>;
  const l = { ...dado, sugeridos: dado.sugeridos ?? [], excluidos: dado.excluidos ?? [] };
  const motivos = Object.entries(l.excluidos_por_motivo || {}).sort((a, b) => b[1] - a[1]);
  return (
    <div className="space-y-4 text-sm" data-testid="detalhe-da-lista">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        <span>Cliente: <b className="text-slate-800">{l.pedido.cliente.nome ?? "—"}</b> <EtiquetaPH id={l.pedido.cliente.id} leve /></span>
        <span>Profissões do pedido: <b className="text-slate-800">{(l.pedido.profissoes ?? []).join(", ") || "—"}</b></span>
        <span>Regras: <b className="text-slate-800">{l.config_versao ? `versão ${l.config_versao}` : "de fábrica"}</b></span>
        <span>Feita em {quando(l.criada_em)}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {([["Olhou", l.candidatos ?? "—"], ["Passaram no filtro", l.elegiveis ?? "—"], ["Sugeridos", l.sugeridos.length], ["Fecharam", l.sugeridos.filter((s) => s.fechou).length]] as [string, string | number][]).map(([k, v]) => (
          <div key={k} className="rounded-xl border border-slate-200 px-3 py-2"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{k}</p><p className="text-lg font-bold text-slate-950">{v}</p></div>
        ))}
      </div>

      {!l.sugeridos.length ? <p className="text-slate-500">Ninguém foi sugerido para este pedido.</p> : (
        <ol className="space-y-2">
          {l.sugeridos.map((s) => (
            <li key={s.profissional.id} className="rounded-xl border border-slate-200 p-3" data-testid="sugerido-da-lista">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">{s.posicao}</span>
                <b className="text-slate-900">{s.profissional.nome ?? "Profissional"}</b>
                <button type="button" onClick={() => investigar?.(s.profissional.id)} className="text-left"><EtiquetaPH id={s.profissional.id} leve /></button>
                <span className="text-xs text-slate-500">{s.profissional.profissao ?? ""}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{s.grupo === "principal" ? "os que mais combinam" : "outras opções"}</span>
                <span className="ml-auto text-right">
                  <b className="text-base text-slate-950">{s.mostrado ?? "—"}%</b>
                  <span className="block text-[11px] text-slate-400">real {s.real ?? "—"} · chance {s.chance != null ? `${(s.chance * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : "—"}</span>
                </span>
              </div>
              {s.porque ? (
                <div className="mt-2 flex flex-wrap items-center gap-1">
                  <span className="text-[11px] font-semibold text-slate-500">Por quê:</span>
                  {s.porque.fatores.map((f) => (
                    <span key={f.rotulo} className={cn("rounded px-1.5 text-[11px]", f.peso > 1.001 ? "bg-emerald-50 text-emerald-800" : f.peso < 0.999 ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-500")}>{f.rotulo} {pesoTxt(f.peso)}</span>
                  ))}
                  <span className="text-[11px] font-bold text-slate-700">= encaixe {s.porque.encaixe.toLocaleString("pt-BR")}</span>
                </div>
              ) : <p className="mt-1 text-[11px] text-slate-400">Lista feita antes de o porquê ser guardado.</p>}
              <div className="mt-2 flex flex-wrap gap-1">
                <Sim ok={!!s.chamado_em} texto={s.chamado_em ? `chamado ${quando(s.chamado_em)}` : "não chamado"} />
                <Sim ok={s.respondeu} texto={s.respondeu ? "respondeu" : "não respondeu"} />
                <Sim ok={s.fechou} texto={s.fechou ? "fechou contrato" : "não fechou"} />
              </div>
            </li>
          ))}
        </ol>
      )}

      <div>
        <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Quem ficou de fora</p>
        {!l.excluidos.length ? <p className="text-xs text-slate-400">{l.candidatos == null ? "Lista feita antes de o retrato ser guardado." : "Ninguém."}</p> : (
          <>
            <div className="mb-1.5 flex flex-wrap gap-1">{motivos.map(([m, n]) => <span key={m} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{m}: {n}</span>)}</div>
            <ul className="max-h-56 divide-y divide-slate-100 overflow-auto rounded-xl border border-slate-200 text-xs">
              {l.excluidos.map((x) => (
                <li key={x.user_id} className="flex items-center gap-2 px-3 py-1.5" data-testid="excluido-da-lista">
                  <span className="flex-1">{x.nome ?? "Profissional"} <button type="button" onClick={() => investigar?.(x.user_id)}><EtiquetaPH id={x.user_id} leve /></button></span>
                  <span className="text-slate-500">{x.motivo}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

export function HistoricoDeListas({ abrir, investigar }: { abrir: (c: ConteudoJanela) => void; investigar: (id: number) => void }) {
  const [pagina, setPagina] = useState(1);
  const [busca, setBusca] = useState("");
  const [buscaFeita, setBuscaFeita] = useState("");
  const { dado, erro } = useApi<{ total: number; por_pagina: number; listas: ItemDaLista[] }>(`/admin/algoritmo/listas?pagina=${pagina}${buscaFeita ? `&busca=${encodeURIComponent(buscaFeita)}` : ""}`);
  const itens = Array.isArray(dado?.listas) ? dado!.listas : [];
  const paginas = dado?.total && dado?.por_pagina ? Math.max(1, Math.ceil(dado.total / dado.por_pagina)) : 1;
  return (
    <SectionCard title="Histórico das listas de recomendação" subtitle="Cada pedido que recebeu lista. Abra para ver o porquê de cada sugerido e quem ficou de fora."
      dica="Cada lista guarda a versão das regras com que foi feita, os pesos que contaram para cada profissional e o que aconteceu depois: se o cliente chamou, se o profissional respondeu e se fecharam contrato.">
      <div className="space-y-2">
        <form onSubmit={(e) => { e.preventDefault(); setPagina(1); setBuscaFeita(busca.trim()); }} className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
          <Search className="h-3.5 w-3.5 text-slate-400" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar pelo pedido, pelo cliente ou pelo número" aria-label="Buscar lista" className="w-full bg-transparent text-sm outline-none" />
        </form>
        {erro ? <Erro msg={erro} /> : !dado ? <Carregando /> : !itens.length ? <p className="text-sm text-slate-500">Nenhuma lista ainda.</p> : (
          <>
            <ul className="space-y-1.5">
              {itens.map((l) => (
                <li key={l.demand_id}>
                  <button type="button" data-testid="lista-do-historico"
                    onClick={() => abrir({ titulo: `Lista do pedido "${l.titulo}"`, sub: `Pedido ${l.demand_id} · ${l.cliente?.nome ?? "—"}`, corpo: <DetalheDaLista demandId={l.demand_id} investigar={investigar} /> })}
                    className="flex w-full items-start justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-left hover:border-orange-300">
                    <span className="min-w-0">
                      <b className="block text-[13px] text-slate-900">{l.titulo} <span className="font-normal text-slate-400">· pedido {l.demand_id} · {l.cliente?.nome ?? "—"}</span></b>
                      <small className="block text-xs text-slate-500">{quando(l.criada_em)} · {l.config_versao ? `regras v${l.config_versao}` : "regras de fábrica"} · olhou {l.candidatos ?? "—"}, passaram {l.elegiveis ?? "—"}, sugeriu {l.sugeridos} · chamou {l.chamados} · responderam {l.responderam} · fecharam {l.fecharam}</small>
                      <small className="block truncate text-xs text-slate-400">{l.primeiros.map((p) => `${p.nome} ${p.mostrado ?? "—"}%`).join(" · ") || "ninguém sugerido"}</small>
                    </span>
                    <span className="text-slate-400">›</span>
                  </button>
                </li>
              ))}
            </ul>
            {paginas > 1 ? (
              <div className="flex items-center justify-end gap-2 text-xs text-slate-500">
                <button type="button" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)} className="rounded-full p-1 hover:bg-slate-100 disabled:opacity-30" aria-label="Página anterior"><ChevronLeft className="h-4 w-4" /></button>
                página {pagina} de {paginas}
                <button type="button" disabled={pagina >= paginas} onClick={() => setPagina((p) => p + 1)} className="rounded-full p-1 hover:bg-slate-100 disabled:opacity-30" aria-label="Próxima página"><ChevronRight className="h-4 w-4" /></button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </SectionCard>
  );
}
