import { Check, X } from "lucide-react";
import { SectionCard } from "../AdminPrimitives";
import { cn } from "../../utils";
import { Carregando, Erro, EtiquetaPH, quando, useApi, type ConteudoJanela } from "./comum";
import { DetalheDaLista } from "./HistoricoDeListas";

/**
 * Investigar › Matchs (19/11/2026): os matchs em que a pessoa aparece, para conferir a
 * situação de cada um. Como profissional: as listas em que foi sugerido e as ofertas com
 * percentual. Como cliente: as listas dos pedidos dela.
 *
 *   GET /admin/algoritmo/pessoa/:userId
 */
type Resposta = {
  como_profissional: { demand_id: number; titulo: string; cliente: { id: number; nome: string | null } | null; posicao: number; grupo: string; real: number | null; mostrado: number | null; config_versao: number | null; quando: string | null; chamado_em: string | null; respondeu: boolean; fechou: boolean }[];
  ofertas: { demand_id: number; titulo: string; compatibilidade: number | null; origem: string; com_mensagem: boolean; quando: string | null }[];
  como_cliente: { demand_id: number; titulo: string; status: string; quando: string | null; sugeridos: { id: number; nome: string; mostrado: number | null; chamado: boolean; fechou: boolean }[] }[];
};

const Sim = ({ ok }: { ok: boolean }) => (ok ? <Check className="h-4 w-4 text-emerald-600" aria-label="sim" /> : <X className="h-4 w-4 text-slate-300" aria-label="não" />);

export function MatchsDaPessoa({ id, abrir, investigar }: { id: number; abrir: (c: ConteudoJanela) => void; investigar: (id: number) => void }) {
  const { dado, erro } = useApi<Resposta>(`/admin/algoritmo/pessoa/${id}`);
  if (erro) return <Erro msg={erro} />;
  if (!dado) return <Carregando />;
  dado.como_profissional ??= []; dado.ofertas ??= []; dado.como_cliente ??= [];
  const verLista = (demandId: number, titulo: string) => abrir({ titulo: `Lista do pedido "${titulo}"`, sub: `Pedido ${demandId}`, corpo: <DetalheDaLista demandId={demandId} investigar={investigar} /> });
  const p = dado.como_profissional;
  const resumo = [
    ["Listas em que apareceu", p.length],
    ["Chamado", p.filter((x) => x.chamado_em).length],
    ["Respondeu", p.filter((x) => x.respondeu).length],
    ["Fechou", p.filter((x) => x.fechou).length],
  ] as [string, number][];
  return (
    <div className="space-y-4" data-testid="matchs-da-pessoa">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {resumo.map(([k, v]) => <div key={k} className="rounded-xl border border-slate-200 bg-white px-3 py-2"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{k}</p><p className="text-lg font-bold text-slate-950">{v}</p></div>)}
      </div>

      <SectionCard title="Onde apareceu como profissional" subtitle="As listas de recomendação em que foi sugerido. Clique para ver a lista inteira."
        dica="Cada linha é um pedido em que o algoritmo sugeriu esta pessoa: a posição, o percentual que o cliente viu (e a nota real) e o que aconteceu depois.">
        {!p.length ? <p className="text-sm text-slate-500">Ainda não apareceu em nenhuma lista.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wide text-slate-400"><tr><th className="py-1">Pedido</th><th>Cliente</th><th>Posição</th><th>%</th><th>Chamado</th><th>Respondeu</th><th>Fechou</th></tr></thead>
              <tbody>{p.map((x) => (
                <tr key={`${x.demand_id}`} className="cursor-pointer border-t border-slate-100 hover:bg-slate-50" onClick={() => verLista(x.demand_id, x.titulo)} data-testid="match-como-profissional">
                  <td className="py-1.5"><b className="block text-slate-900">{x.titulo}</b><small className="text-xs text-slate-400">{quando(x.quando)} · {x.config_versao ? `regras v${x.config_versao}` : "regras de fábrica"}</small></td>
                  <td>{x.cliente?.nome ?? "—"}</td>
                  <td>{x.posicao}º <small className="text-xs text-slate-400">{x.grupo === "principal" ? "mais combinam" : "outras"}</small></td>
                  <td><b>{x.mostrado ?? "—"}%</b> <small className="text-xs text-slate-400">real {x.real ?? "—"}</small></td>
                  <td><Sim ok={!!x.chamado_em} /></td><td><Sim ok={x.respondeu} /></td><td><Sim ok={x.fechou} /></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {dado.ofertas.length ? (
        <SectionCard title="Ofertas com percentual" subtitle="O percentual que o cliente viu em cada oferta desta pessoa e de onde ele veio">
          <ul className="divide-y divide-slate-100 text-sm">
            {dado.ofertas.map((o) => (
              <li key={`${o.demand_id}-${o.quando}`} className="flex flex-wrap items-center gap-2 py-1.5">
                <span className="min-w-0 flex-1"><b className="text-slate-900">{o.titulo}</b> <small className="text-xs text-slate-400">{quando(o.quando)}{o.com_mensagem ? " · com mensagem" : ""}</small></span>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", o.origem === "posta pelo admin" ? "bg-sky-50 text-sky-700" : "bg-slate-100 text-slate-600")}>{o.origem}</span>
                <b className="w-12 text-right">{o.compatibilidade ?? "—"}%</b>
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      {dado.como_cliente.length ? (
        <SectionCard title="Listas dos pedidos desta pessoa (como cliente)" subtitle="Quem o algoritmo sugeriu em cada pedido. Clique para ver a lista inteira.">
          <ul className="space-y-1.5">
            {dado.como_cliente.map((c) => (
              <li key={c.demand_id}>
                <button type="button" onClick={() => verLista(c.demand_id, c.titulo)} data-testid="lista-como-cliente" className="flex w-full items-start justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-left hover:border-orange-300">
                  <span className="min-w-0">
                    <b className="block text-[13px] text-slate-900">{c.titulo} <span className="font-normal text-slate-400">· {quando(c.quando)}</span></b>
                    <small className="flex flex-wrap gap-1.5 text-xs text-slate-500">
                      {c.sugeridos.length ? c.sugeridos.map((s) => (
                        <span key={s.id} className="inline-flex items-center gap-1">{s.nome} {s.mostrado ?? "—"}%{s.chamado ? " · chamado" : ""}{s.fechou ? " · fechou" : ""} <EtiquetaPH id={s.id} leve /></span>
                      )) : "sem lista (ninguém passou no filtro ou o pedido é antigo)"}
                    </small>
                  </span>
                  <span className="text-slate-400">›</span>
                </button>
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}
    </div>
  );
}
