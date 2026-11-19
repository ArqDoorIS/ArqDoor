import { useMemo, useState, type ComponentType } from "react";
import { AlertTriangle, CheckCircle2, Clock3, FileText, Hammer, Lightbulb, Sparkles, User, Wallet } from "lucide-react";
import { SectionCard } from "../AdminPrimitives";
import { cn } from "../../utils";
import {
  ACOES, Alternador, COR_TEMP, Carregando, Erro, EtiquetaPH, ICONE_GRUPO, ICONE_TEMP, Pilula, QUANDO, dia, nomeCategoria, pct, reais, useApi,
} from "./comum";
import type { Funil, PassoDoFunil, Temp, Visao } from "./tipos";
import type { ConteudoJanela } from "./comum";
import { Reclamacoes } from "./Reclamacoes";

/* ---------- números do topo ---------- */
function Linhazinha({ serie }: { serie: number[] }) {
  if (!serie?.length) return null;
  const max = Math.max(...serie, 1), min = Math.min(...serie, 0);
  const pts = serie.map((v, i) => `${(i / Math.max(1, serie.length - 1)) * 100},${28 - ((v - min) / Math.max(1, max - min)) * 24}`).join(" ");
  return <svg viewBox="0 0 100 30" className="h-7 w-24" preserveAspectRatio="none" aria-hidden="true"><polyline points={pts} fill="none" stroke="#fb923c" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /></svg>;
}
function Variacao({ atual, anterior, pontos }: { atual: number | null; anterior: number | null; pontos?: boolean }) {
  if (atual == null || anterior == null) return null;
  const dif = pontos ? atual - anterior : anterior ? Math.round(((atual - anterior) / anterior) * 100) : null;
  if (dif == null || !Number.isFinite(dif)) return null;
  const sobe = dif >= 0;
  return <span className={cn("rounded-full px-1.5 py-0.5 text-[11px] font-bold", sobe ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600")}>{sobe ? "▲" : "▼"} {Math.abs(dif)}{pontos ? " pts" : "%"}</span>;
}
function Kpi({ rotulo, icone: I, valor, ajuda, children, destaque }: { rotulo: string; icone: ComponentType<{ className?: string }>; valor: string; ajuda: string; children?: React.ReactNode; destaque?: boolean }) {
  return (
    <div className={cn("rounded-2xl border p-3", destaque ? "border-orange-200 bg-gradient-to-b from-white to-orange-50" : "border-slate-200 bg-white")}>
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500"><I className="h-3.5 w-3.5 text-orange-500" />{rotulo}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{valor}</p>
      <div className="mt-1 flex items-end justify-between gap-2">{children}</div>
      <p className="mt-1 text-[11px] text-slate-400">{ajuda}</p>
    </div>
  );
}
function Numeros({ v, dias }: { v: Visao; dias: number }) {
  const k = v.kpis;
  if (!k) return null;
  const liq = k.liquidez;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Kpi rotulo="Pedidos" icone={FileText} valor={String(k.pedidos.atual)} ajuda={`${k.pedidos.anterior} nos ${dias} dias anteriores`}><Linhazinha serie={k.pedidos.serie} /><Variacao atual={k.pedidos.atual} anterior={k.pedidos.anterior} /></Kpi>
      <Kpi rotulo="Liquidez" icone={Clock3} destaque valor={liq.atual_pct == null ? "—" : `${liq.atual_pct}%`} ajuda={`pedidos com oferta em até 48 h · meta ${liq.meta_pct}%`}>
        <div className="relative mt-1 h-1.5 flex-1 rounded-full bg-slate-200"><i className="block h-full rounded-full bg-orange-500" style={{ width: `${liq.atual_pct ?? 0}%` }} /><b className="absolute -top-1 h-3.5 w-0.5 bg-slate-900" style={{ left: `${liq.meta_pct}%` }} /></div>
        <Variacao atual={liq.atual_pct} anterior={liq.anterior_pct} pontos />
      </Kpi>
      <Kpi rotulo="Contratos fechados" icone={CheckCircle2} valor={String(k.contratos.atual)} ajuda={k.contratos.pct_dos_pedidos == null ? "contratos em andamento ou concluídos" : `${k.contratos.pct_dos_pedidos}% dos pedidos viraram contrato`}><Linhazinha serie={k.contratos.serie} /><Variacao atual={k.contratos.atual} anterior={k.contratos.anterior} /></Kpi>
      <Kpi rotulo="Valor fechado" icone={Wallet} valor={reais(k.valor.atual)} ajuda={`ticket médio ${reais(k.valor.ticket_medio)}`}><Linhazinha serie={k.valor.serie} /><Variacao atual={k.valor.atual} anterior={k.valor.anterior} /></Kpi>
    </div>
  );
}

/* ---------- funil ---------- */
function TabelaDoFunil({ f }: { f: Funil }) {
  const passos = (f.passos ?? []).filter((p): p is Exclude<PassoDoFunil, { grupo: string }> => !("grupo" in p));
  const topo = passos.find((p) => p.n)?.n ?? 1;
  let ant: number | null = null, antRamo: number | null = null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="text-[11px] uppercase tracking-wide text-slate-400"><tr><th className="py-1.5 pl-2">Passo</th><th className="w-[30%]" /><th>Pessoas</th><th>Do anterior</th><th>Tempo até aqui</th><th>Detalhe</th></tr></thead>
        <tbody>
          {(f.passos ?? []).map((p, i) => {
            if ("grupo" in p) {
              const I = ICONE_GRUPO[p.grupo];
              return <tr key={i} className="bg-slate-50"><td colSpan={6} className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500"><span className="inline-flex items-center gap-1.5">{I ? <I className="h-3.5 w-3.5 text-orange-500" /> : null}{p.grupo}</span></td></tr>;
            }
            const base = p.ramo ? antRamo ?? ant : ant;
            const doAnt = base && p.n != null ? Math.round((p.n / base) * 100) : null;
            const ruim = !p.divide && doAnt != null && doAnt < 85;
            const queda = base && p.n != null && !p.ramo ? base - p.n : 0;
            const linha = (
              <tr key={i} className={cn("border-t border-slate-100 align-top", p.ramo && "bg-orange-50/50")}>
                <td className={cn("py-2 pl-2", p.ramo && "pl-6")}>
                  {p.ramo ? <span className="mb-0.5 inline-block rounded bg-orange-100 px-1.5 text-[10px] font-bold uppercase tracking-wide text-orange-700">opcional</span> : null}
                  <b className="block text-[13.5px] text-slate-900">{p.ramo ? "↳ " : ""}{p.nome}</b>
                  {p.sub ? <small className="text-xs text-slate-400">{p.sub}</small> : null}
                </td>
                <td className="py-2 pr-3">
                  {p.n == null ? <span className="text-xs text-slate-400">{p.sem_dado ?? "sem dado"}</span> : (
                    <div className="h-5 overflow-hidden rounded-md bg-slate-100">
                      <i className={cn("block h-full rounded-md", p.fim ? "bg-orange-600" : p.ramo ? "bg-[repeating-linear-gradient(135deg,#fdba74_0_6px,#fed7aa_6px_12px)]" : "bg-orange-400")} style={{ width: `${Math.max(1, (p.n / topo) * 100)}%` }} />
                    </div>
                  )}
                </td>
                <td className="whitespace-nowrap py-2"><b>{p.n ?? "—"}</b> {p.n != null ? <span className="text-slate-400">{Math.round((p.n / topo) * 100)}%</span> : null}</td>
                <td className={cn("whitespace-nowrap py-2 font-bold", ruim && "text-rose-600", p.divide && "text-slate-400")}>
                  {doAnt == null ? "—" : `${doAnt}%`}
                  {p.divide && doAnt != null ? <small className="block text-[11px] font-semibold">dividiu</small> : null}
                  {ruim && queda > 0 ? <small className="block text-[11px] font-semibold">−{queda}</small> : null}
                  {p.ramo && doAnt != null ? <small className="block text-[11px] font-semibold text-slate-400">{antRamo ? "de quem começou" : "de cima"}</small> : null}
                </td>
                <td className="py-2 text-slate-500">{p.tempo ?? "—"}</td>
                <td className="py-2">
                  <div className="flex flex-wrap gap-1">
                    {(p.detalhes ?? []).map((d, k) => <span key={k} className="rounded-md border border-slate-200 bg-slate-50 px-1.5 text-[11px] text-slate-600">{d}</span>)}
                    {p.motivo_saida && ruim ? <span className="rounded-md border border-rose-200 bg-rose-50 px-1.5 text-[11px] text-rose-700">quem sai: {p.motivo_saida}</span> : null}
                    {p.fonte === "posthog" ? <span className="rounded-md bg-blue-50 px-1.5 text-[10px] font-semibold text-blue-700">PostHog</span> : null}
                  </div>
                </td>
              </tr>
            );
            if (p.n != null) { if (p.ramo) antRamo = p.n; else { ant = p.n; antRamo = null; } }
            return linha;
          })}
        </tbody>
      </table>
    </div>
  );
}

function CartaoDoFunil({ dias, configurarPosthog }: { dias: number; configurarPosthog: () => void }) {
  const [papel, setPapel] = useState<"cliente" | "profissional">("cliente");
  const { dado: f, erro } = useApi<Funil>(`/admin/analise/funil?papel=${papel}&dias=${dias}`);
  return (
    <SectionCard
      title={papel === "cliente" ? "Funil do cliente, passo a passo" : "Funil do profissional, passo a passo"}
      subtitle="Desde que baixa o app. Linhas listradas são caminhos opcionais; não contam na queda do funil."
      action={<Alternador valor={papel} mudar={setPapel} opcoes={[["cliente", "Cliente", User], ["profissional", "Profissional", Hammer]]} />}
    >
      {erro ? <Erro msg={erro} /> : !f ? <Carregando /> : (
        <div className="space-y-3">
          {!f.posthog?.ligado ? (
            <p className="flex flex-wrap items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
              Os passos antes do login (baixar, abrir, boas-vindas, escolher o papel, teste com a IA) vêm do PostHog. {f.posthog?.motivo ?? ""}
              <button type="button" onClick={configurarPosthog} className="rounded-full bg-blue-600 px-2.5 py-1 font-bold text-white">Ligar o PostHog</button>
            </p>
          ) : null}
          <TabelaDoFunil f={f} />
          {f.onde_mais_perde?.length ? (
            <div className="flex gap-2 rounded-xl bg-rose-50 px-3 py-2 text-[13px] text-rose-700"><AlertTriangle className="mt-0.5 h-4 w-4 flex-none" /><p><b>Onde mais perde:</b> {f.onde_mais_perde.join(" · ")}</p></div>
          ) : null}
        </div>
      )}
    </SectionCard>
  );
}

/* ---------- fila de ação ---------- */
type ItemDaFila = { tipo: "prop" | "ped" | "conv" | "ia"; quem: string; userId: number | null; detalhe: string; desde: string | null; valor: string; porque: string };
const TIPO_FILA = {
  prop: ["Proposta parada", "bg-violet-50 text-violet-700"], ped: ["Pedido sem oferta", "bg-orange-50 text-orange-700"],
  conv: ["Convite sem resposta", "bg-sky-50 text-sky-700"], ia: ["Sugestão da IA", "bg-emerald-50 text-emerald-700"],
} as const;
function Parado({ desde }: { desde: string | null }) {
  if (!desde) return <span className="text-slate-400">—</span>;
  const d = Math.floor((Date.now() - new Date(desde).getTime()) / 86400000);
  const cor = d >= 7 ? "text-rose-600 bg-rose-500" : d >= 3 ? "text-amber-600 bg-amber-500" : "text-emerald-600 bg-emerald-500";
  const [txt, bola] = cor.split(" ");
  return <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap font-semibold", txt)}><i className={cn("h-2 w-2 rounded-full", bola)} />{d <= 0 ? "hoje" : `${d} dia${d > 1 ? "s" : ""}`}</span>;
}
function FilaDeAcao({ v, investigar }: { v: Visao; investigar: (id: number) => void }) {
  const [filtro, setFiltro] = useState<"todos" | ItemDaFila["tipo"]>("todos");
  const itens = useMemo<ItemDaFila[]>(() => [
    ...(v.follow_ups ?? []).map((f) => ({ tipo: "ia" as const, quem: f.nome ?? `Conta ${f.user_id}`, userId: f.user_id, detalhe: `${f.papel} · ${f.temperatura} · ${pct(f.chance)}`, desde: null, valor: "—", porque: `${ACOES[f.acao] ?? f.acao} ${QUANDO[f.quando] ?? ""}. ${f.por_que}` })),
    ...(v.propostas_paradas ?? []).map((t) => ({ tipo: "prop" as const, quem: `Proposta ${t.id}`, userId: null, detalhe: "esperando o cliente decidir", desde: t.criado_em, valor: reais(t.valor), porque: "Sem decisão há 5+ dias" })),
    ...(v.pedidos_sem_oferta ?? []).map((p) => ({ tipo: "ped" as const, quem: p.nome ?? `Conta ${p.user_id}`, userId: p.user_id, detalhe: `cliente · ${p.titulo}`, desde: p.criado_em, valor: "—", porque: "Ninguém mandou oferta: chamar profissionais" })),
    ...(v.convites_parados ?? []).map((c) => ({ tipo: "conv" as const, quem: c.nome ?? `Conta ${c.user_id}`, userId: c.user_id, detalhe: `profissional · pedido ${c.pedido}`, desde: c.criado_em, valor: "—", porque: c.status === "viewed" ? "Viu e não respondeu" : "Nem abriu o convite" })),
  ], [v]);
  const conta = (t: ItemDaFila["tipo"]) => itens.filter((i) => i.tipo === t).length;
  const lista = itens.filter((i) => filtro === "todos" || i.tipo === filtro);
  return (
    <SectionCard title="Fila de ação" subtitle="O que fazer agora. A cor mostra há quanto tempo está parado."
      dica="Pessoas e negócios que pedem contato: proposta sem decisão do cliente, pedido sem oferta, convite sem resposta e as sugestões da IA. Verde: parado há pouco; amarelo: alguns dias; vermelho: muito tempo.">
      <div className="mb-3 flex flex-wrap gap-1.5">
        <Pilula ativo={filtro === "todos"} onClick={() => setFiltro("todos")}>Tudo <span className="opacity-60">{itens.length}</span></Pilula>
        {(Object.keys(TIPO_FILA) as ItemDaFila["tipo"][]).map((t) => <Pilula key={t} ativo={filtro === t} onClick={() => setFiltro(t)}>{TIPO_FILA[t][0]} <span className="opacity-60">{conta(t)}</span></Pilula>)}
      </div>
      {!lista.length ? <p className="text-sm text-slate-500">Nada parado. Bom sinal.</p> : (
        <div className="max-h-[420px] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-white text-[11px] uppercase tracking-wide text-slate-400"><tr><th className="py-1.5">O quê</th><th>Quem</th><th>Parado há</th><th>Valor</th><th>Por quê</th><th /></tr></thead>
            <tbody>
              {lista.map((i, k) => (
                <tr key={k} className="border-t border-slate-100 align-top">
                  <td className="py-2"><span className={cn("whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold", TIPO_FILA[i.tipo][1])}>{TIPO_FILA[i.tipo][0]}</span></td>
                  <td className="py-2"><b className="block text-slate-900">{i.quem}</b><small className="text-xs text-slate-400">{i.detalhe}</small></td>
                  <td className="py-2"><Parado desde={i.desde} /></td>
                  <td className="py-2 font-semibold">{i.valor}</td>
                  <td className="py-2 text-xs text-slate-600">{i.porque}</td>
                  <td className="py-2 text-right">{i.userId ? <button type="button" onClick={() => investigar(i.userId!)} className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-white">investigar</button> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

/* ---------- temperatura ---------- */
function Temperatura({ v, investigar, irParaPessoas }: { v: Visao; investigar: (id: number) => void; irParaPessoas: () => void }) {
  const leads = v.leads ?? [];
  return (
    <SectionCard
      title={`Leads analisados pela IA · últimos 60 dias`}
      subtitle={`${v.temperaturas?.analisados ?? 0} analisados · ${v.temperaturas?.divergem_das_regras ?? 0} em que a IA discorda das regras`}
      action={<button type="button" onClick={irParaPessoas} className="inline-flex items-center gap-1 rounded-full bg-orange-600 px-3 py-1.5 text-xs font-bold text-white"><Sparkles className="h-3.5 w-3.5" />Analisar quem tem dado novo</button>}
    >
      <div className="grid gap-3 md:grid-cols-3">
        {(["quente", "morno", "frio"] as Temp[]).map((t) => {
          const I = ICONE_TEMP[t];
          const daqui = leads.filter((l) => l.temperatura === t);
          return (
            <div key={t} className="rounded-xl bg-slate-50 p-2.5">
              <h4 className={cn("mb-2 flex items-center gap-1.5 text-sm font-bold capitalize", COR_TEMP[t].texto)}><I className="h-4 w-4" />{t}<span className="ml-auto rounded-full bg-white px-2 text-xs text-slate-500">{v.temperaturas?.[t] ?? 0}</span></h4>
              <div className="space-y-2">
                {daqui.slice(0, 5).map((l) => (
                  <button key={l.user_id} type="button" onClick={() => investigar(l.user_id)} className="block w-full rounded-lg border border-slate-200 bg-white p-2 text-left hover:border-orange-300">
                    <div className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-900">{l.nome ?? `Conta ${l.user_id}`}<EtiquetaPH id={l.user_id} leve /><small className="ml-auto text-slate-400">{pct(l.chance)}</small></div>
                    <p className="mt-0.5 text-xs text-slate-500">{l.motivo ?? nomeCategoria(l.categoria)}</p>
                    {l.follow_up_acao ? <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-orange-700"><Lightbulb className="h-3.5 w-3.5" />{ACOES[l.follow_up_acao] ?? l.follow_up_acao}{l.follow_up_quando ? ` · ${QUANDO[l.follow_up_quando] ?? l.follow_up_quando}` : ""}</p> : null}
                  </button>
                ))}
                {daqui.length > 5 ? <button type="button" onClick={irParaPessoas} className="w-full rounded-lg border border-dashed border-slate-300 p-2 text-xs text-slate-500">+ {daqui.length - 5} pessoas · ver todas em Pessoas</button> : null}
                {!daqui.length ? <p className="px-1 text-xs text-slate-400">Ninguém.</p> : null}
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

/* ---------- tendências ---------- */
function Tendencias({ v }: { v: Visao }) {
  const t = v.tendencias;
  if (!t) return null;
  const max = Math.max(1, ...(t.semanas ?? []).flatMap((s) => [s.pedidos, s.contratos]));
  const tot = (t.tempo_ate_1a_oferta ?? []).reduce((s, x) => s + x[1], 0);
  // Duas barras lado a lado por semana, cada uma com o número em cima (antes a de contratos
  // ficava por cima da de pedidos e não dava para ler nenhum valor).
  const Barra = ({ n, cor, rotulo }: { n: number; cor: string; rotulo: string }) => (
    <div className="flex h-full flex-1 flex-col items-center justify-end">
      <span className={cn("text-[11px] font-bold leading-4", n ? "text-slate-700" : "text-slate-300")} aria-label={`${n} ${rotulo}`}>{n}</span>
      <i className={cn("block w-full rounded-t-md", cor)} style={{ height: `${(n / max) * 100}%`, minHeight: n ? 3 : 0 }} />
    </div>
  );
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SectionCard title="Pedidos e contratos por semana" subtitle="Últimas 8 semanas">
        <div className="flex items-end gap-2">
          {(t.semanas ?? []).map((s) => (
            <div key={s.inicio} data-testid="semana" className="flex flex-1 flex-col items-center gap-1" title={`Semana de ${dia(s.inicio)}: ${s.pedidos} pedidos, ${s.contratos} contratos`}>
              <div className="flex h-32 w-full items-end gap-0.5 pt-4">
                <Barra n={s.pedidos} cor="bg-orange-200" rotulo="pedidos" />
                <Barra n={s.contratos} cor="bg-orange-600" rotulo="contratos" />
              </div>
              <span className="text-[10px] text-slate-400">{dia(s.inicio)}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-4 text-xs text-slate-500"><span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-orange-200" />Pedidos</span><span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-orange-600" />Contratos</span></div>
      </SectionCard>
      <SectionCard title="Tempo até a 1ª oferta" subtitle="Pedidos do período · verde é rápido, vermelho é demorado">
        <div className="space-y-2">
          {(t.tempo_ate_1a_oferta ?? []).map(([r, n], i) => (
            <div key={r} className="grid grid-cols-[110px_1fr_auto] items-center gap-2 text-xs">
              <span className="text-slate-600">{r}</span>
              <span className="h-3 overflow-hidden rounded-full bg-slate-100"><i className={cn("block h-full rounded-full", i < 2 ? "bg-emerald-500" : i < 3 ? "bg-amber-400" : "bg-rose-400")} style={{ width: `${tot ? Math.max(2, (n / tot) * 100) : 0}%` }} /></span>
              <b className="text-slate-900">{n}</b>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

export function AbaVisaoGeral({ dias, investigar, irParaPessoas, configurarPosthog, abrir }: { dias: number; investigar: (id: number) => void; irParaPessoas: () => void; configurarPosthog: () => void; abrir?: (c: ConteudoJanela) => void }) {
  const { dado: v, erro } = useApi<Visao>(`/admin/analise/visao?dias=${dias}`);
  if (erro) return <Erro msg={erro} />;
  return (
    <div className="space-y-4">
      {v ? <Numeros v={v} dias={dias} /> : <Carregando />}
      <CartaoDoFunil dias={dias} configurarPosthog={configurarPosthog} />
      {abrir ? <Reclamacoes abrir={abrir} /> : null}
      {v ? <FilaDeAcao v={v} investigar={investigar} /> : null}
      {v ? <Temperatura v={v} investigar={investigar} irParaPessoas={irParaPessoas} /> : null}
      {v ? <Tendencias v={v} /> : null}
    </div>
  );
}
