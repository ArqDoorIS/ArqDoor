import { Cpu, Gauge, ListOrdered, Radio, ScrollText, Store, Target } from "lucide-react";
import { SectionCard } from "../AdminPrimitives";
import { cn } from "../../utils";
import { Barras, Bloco, Carregando, Erro, dia, rotulo, useApi } from "./comum";
import type { Kirios } from "./tipos";

/**
 * Aba Kirios: o desempenho do algoritmo de match (o % de cada cartão). Separada da Precisão da IA,
 * que mede a IA analista. Aqui a pergunta é uma só: o % do cartão acerta quem fecha?
 */

const auc = (v: number | null | undefined) => (v == null ? "—" : v.toFixed(2).replace(".", ","));
/** Leitura em palavras do acerto (0,5 = chute). */
const leitura = (v: number | null | undefined) => (v == null ? "sem dado" : v >= 0.8 ? "muito bom" : v >= 0.7 ? "bom" : v >= 0.6 ? "fraco" : "quase chute");

function Medidor({ rotulo: r, valor, ajuda, icone: I }: { rotulo: string; valor: number | null; ajuda: string; icone: typeof Target }) {
  const p = valor == null ? 0 : Math.max(0, Math.min(100, ((valor - 0.5) / 0.5) * 100));
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500"><I className="h-3.5 w-3.5 text-orange-500" />{r}</p>
      <p className="mt-1 text-2xl font-bold text-slate-950">{auc(valor)} <span className="text-sm font-semibold text-slate-400">{leitura(valor)}</span></p>
      <div className="relative mt-2 h-1.5 rounded-full bg-gradient-to-r from-slate-200 via-amber-200 to-emerald-300"><b className="absolute -top-1 h-3.5 w-1 rounded bg-slate-900" style={{ left: `calc(${p}% - 2px)` }} /></div>
      <div className="mt-0.5 flex justify-between text-[10px] text-slate-400"><span>0,5 chute</span><span>1 perfeito</span></div>
      <p className="mt-1 text-[11px] text-slate-400">{ajuda}</p>
    </div>
  );
}

function Numero({ rotulo: r, valor, ajuda }: { rotulo: string; valor: React.ReactNode; ajuda?: string }) {
  return <div className="rounded-xl bg-slate-50 px-3 py-2"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{r}</p><p className="text-lg font-bold text-slate-950">{valor}</p>{ajuda ? <p className="text-[11px] text-slate-400">{ajuda}</p> : null}</div>;
}

export function AbaKirios() {
  const { dado: k, erro } = useApi<Kirios>("/admin/analise/kirios?dias=90", 120000);
  if (erro) return <Erro msg={erro} />;
  if (!k) return <Carregando />;
  const v = k.versao, a = k.acerto, m = k.mercado;
  const fonte = v.fonte_do_match === "kirios" ? "o Kirios calcula o % de cada cartão" : v.fonte_do_match === "misto" ? "parte dos cartões com % do Kirios, parte posta pelo admin" : "o % de cada cartão ainda é posto pelo admin";
  const maxPos = Math.max(1, ...(k.posicao ?? []).map((p) => p.cartoes));
  const maxSem = Math.max(1, ...(k.semanas ?? []).map((s) => s.cartoes));
  return (
    <div className="space-y-4">
      {/* versão */}
      <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_1.2fr]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-900 text-white"><Cpu className="h-5 w-5" /></span>
            <h2 className="text-xl font-bold text-slate-950">{v.nome}</h2>
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold", v.ligado ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}><Radio className="h-3 w-3" />{v.ligado ? "ligado no app" : "ainda não ligado no app"}</span>
          </div>
          <p className="mt-1.5 text-sm text-slate-600">Hoje {fonte}. Fase: <b>{v.fase === "arranque" ? "arranque (sem dado real, usa o treino em mercados inventados e o palpite)" : "principal (aprende com os contratos reais)"}</b>.</p>
          <p className="mt-1 text-xs text-slate-400">O acerto abaixo mede o % que os cartões mostraram nos últimos {k.dias} dias, seja de onde ele veio: é a régua para comparar quando o Kirios entrar.</p>
        </div>
        <div className="space-y-2.5">
          {[["Seleção de dados liga", v.minimo_para_selecao, "a partir daqui o Kirios pode promover ou rebaixar dados"], ["Troca do arranque pelo modelo real", v.transicao_em, "o treino inventado perde peso conforme o dado real chega"]].map(([r, alvo, ajuda]) => (
            <div key={String(r)}>
              <div className="flex justify-between text-xs"><span className="font-semibold text-slate-700">{r}</span><span className="text-slate-500"><b className="text-slate-900">{v.contratos_reais}</b> de {alvo} contratos reais</span></div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><i className="block h-full rounded-full bg-orange-500" style={{ width: `${Math.min(100, (v.contratos_reais / Number(alvo)) * 100)}%` }} /></div>
              <p className="mt-0.5 text-[11px] text-slate-400">{ajuda}</p>
            </div>
          ))}
        </div>
      </section>

      {/* acerto */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Medidor rotulo="Acerto geral" icone={Target} valor={a.auc} ajuda={a.intervalo ? `entre ${auc(a.intervalo[0])} e ${auc(a.intervalo[1])} (margem de erro)` : "chance de um cartão que fechou ter % maior que um que não fechou"} />
        <Medidor rotulo="Acerto dentro do pedido" icone={ListOrdered} valor={a.auc_dentro_do_pedido} ajuda="entre os cartões do mesmo pedido, o que fechou tinha o maior %?" />
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-3 lg:col-span-2">
          <Numero rotulo="Cartões medidos" valor={a.cartoes} ajuda={`últimos ${k.dias} dias`} />
          <Numero rotulo="Viraram contrato" valor={a.contratos} ajuda={a.cartoes ? `${Math.round((a.contratos / a.cartoes) * 100)}% dos cartões` : undefined} />
          {a.sem_dado ? <p className="col-span-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">{a.sem_dado}</p> : <p className="col-span-2 text-xs text-slate-500">Na simulação, o Kirios Alpha 1.1 teve 0,75 de acerto geral no arranque e 0,78 com ~700 contratos reais.</p>}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Calibração do %" subtitle="Dos cartões que mostraram ~30%, quantos fecharam? Perto do traço = bem calibrado.">
          <table className="w-full text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-slate-400"><tr><th className="py-1">Faixa do %</th><th>Cartões</th><th>Disse</th><th>Fechou</th><th className="w-2/5" /></tr></thead>
            <tbody>{(k.calibracao ?? []).map((f) => (
              <tr key={f.faixa} className="border-t border-slate-100">
                <td className="py-1.5 font-semibold">{f.faixa}</td><td>{f.cartoes}</td><td>{f.disse_media == null ? "—" : `${Math.round(f.disse_media)}%`}</td><td className="font-bold">{f.fechou_pct == null ? "—" : `${Math.round(f.fechou_pct)}%`}</td>
                <td>{f.fechou_pct != null && f.disse_media != null ? <div className="relative h-2 rounded-full bg-slate-100"><i className="absolute inset-y-0 left-0 rounded-full bg-orange-300" style={{ width: `${Math.min(100, f.fechou_pct)}%` }} /><b className="absolute -top-1 h-4 w-0.5 bg-slate-900" style={{ left: `${Math.min(100, f.disse_media)}%` }} /></div> : null}</td>
              </tr>
            ))}</tbody>
          </table>
        </SectionCard>
        <SectionCard title="Posição do cartão" subtitle="Ordem pelo % dentro do pedido: o 1º cartão é o que mais fecha?">
          <div className="space-y-2">
            {(k.posicao ?? []).map((p) => (
              <div key={p.posicao} className="grid grid-cols-[70px_1fr_auto] items-center gap-2 text-xs">
                <span className="font-semibold text-slate-700">{p.posicao >= 5 ? "5º ou mais" : `${p.posicao}º cartão`}</span>
                <span className="relative h-4 overflow-hidden rounded-md bg-slate-100"><i className="absolute inset-y-0 left-0 bg-orange-200" style={{ width: `${(p.cartoes / maxPos) * 100}%` }} /><i className="absolute inset-y-0 left-0 bg-orange-600" style={{ width: `${(p.contratos / maxPos) * 100}%` }} /></span>
                <span className="whitespace-nowrap text-slate-500"><b className="text-slate-900">{p.contratos}</b> de {p.cartoes} · {p.cartoes ? Math.round((p.contratos / p.cartoes) * 100) : 0}%</span>
              </div>
            ))}
            <div className="flex gap-4 pt-1 text-[11px] text-slate-500"><span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm bg-orange-200" />cartões</span><span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm bg-orange-600" />viraram contrato</span></div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Funil por faixa do %" subtitle="Do cartão mostrado ao contrato. Se o % funciona, as faixas altas avançam mais.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-slate-400"><tr><th className="py-1">Faixa</th><th>Mostrados</th><th>Abriu o perfil</th><th>Conversou</th><th>Proposta</th><th>Contrato</th></tr></thead>
            <tbody>{(k.funil_por_faixa ?? []).map((f) => {
              const c = (n: number | null) => n == null ? <span className="text-slate-300">—</span> : <span><b>{n}</b> <span className="text-xs text-slate-400">{f.mostrados ? Math.round((n / f.mostrados) * 100) : 0}%</span></span>;
              return <tr key={f.faixa} className="border-t border-slate-100"><td className="py-1.5 font-semibold">{f.faixa}</td><td><b>{f.mostrados}</b></td><td>{c(f.perfil_aberto)}</td><td>{c(f.conversa)}</td><td>{c(f.proposta)}</td><td className="text-orange-700">{c(f.contrato)}</td></tr>;
            })}</tbody>
          </table>
        </div>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Saúde do mercado" subtitle="O match não pode ganhar contrato às custas dos profissionais">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Numero rotulo="Liquidez 48 h" valor={m.liquidez_48h_pct == null ? "—" : `${Math.round(m.liquidez_48h_pct)}%`} ajuda="pedidos com oferta em 48 h" />
            <Numero rotulo="Ofertas por pedido" valor={m.ofertas_por_pedido == null ? "—" : m.ofertas_por_pedido.toFixed(1).replace(".", ",")} ajuda={`${m.pedidos} pedidos`} />
            <Numero rotulo="Pedidos sem oferta" valor={m.pedidos_sem_oferta} />
            <Numero rotulo="Retomadas" valor={m.retomadas ?? "—"} ajuda="2ª leva de cartões" />
            <Numero rotulo="Profissionais sem oferta" valor={m.profissionais_sem_oferta_pct == null ? "—" : `${Math.round(m.profissionais_sem_oferta_pct)}%`} ajuda={`de ${m.profissionais_ativos} ativos`} />
            <Numero rotulo="Concentração" valor={m.concentracao_top10_pct == null ? "—" : `${Math.round(m.concentracao_top10_pct)}%`} ajuda="das ofertas nos 10% que mais recebem" />
          </div>
          {m.sairam != null ? <p className="mt-2 text-xs text-slate-500"><Store className="mr-1 inline h-3.5 w-3.5" />{m.sairam} profissional(is) sumiram no período.</p> : null}
        </SectionCard>
        <SectionCard title="Entradas do palpite" subtitle="Quanto dos pedidos já traz cada sinal da conversa com a IA">
          <Barras linhas={(k.sinais ?? []).map((s) => [rotulo(s.sinal), Math.round(s.pct)])} total={100} porcentagem />
        </SectionCard>
      </div>

      <SectionCard title="Semana a semana" subtitle="Cartões, contratos e o acerto de cada semana (últimas 12)">
        {!(k.semanas ?? []).length ? <p className="text-sm text-slate-500">Sem semanas ainda.</p> : (
          <div className="flex items-end gap-2">
            {k.semanas.map((s) => (
              <div key={s.inicio} className="flex flex-1 flex-col items-center gap-1" title={`Semana de ${dia(s.inicio)}: ${s.cartoes} cartões, ${s.contratos} contratos, acerto ${auc(s.auc)}`}>
                <span className="text-[10px] font-bold text-slate-500">{auc(s.auc)}</span>
                <div className="relative flex h-28 w-full items-end justify-center">
                  <i className="block w-full rounded-t-md bg-orange-200" style={{ height: `${(s.cartoes / maxSem) * 100}%` }} />
                  <i className="absolute bottom-0 block w-1/2 rounded-t-md bg-orange-600" style={{ height: `${(s.contratos / maxSem) * 100}%` }} />
                </div>
                <span className="text-[10px] text-slate-400">{dia(s.inicio)}</span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <Bloco titulo="Registro do Kirios" icone={ScrollText}>
        {!(k.registro ?? []).length ? <p className="text-xs text-slate-400">Nenhuma mudança ainda. Quando o Kirios promover, rebaixar ou bloquear um dado, aparece aqui com o motivo (só depois de 100 contratos reais e 2 ciclos seguidos).</p> : (
          <ul className="space-y-1 text-sm">{k.registro.map((r, i) => <li key={i} className="flex flex-wrap gap-2"><span className="text-xs text-slate-400">{dia(r.em)}</span><b>{r.tipo}</b><span>{r.dado}</span><span className="text-xs text-slate-500">{r.motivo}</span></li>)}</ul>
        )}
      </Bloco>
      <p className="flex items-center gap-1.5 text-[11px] text-slate-400"><Gauge className="h-3.5 w-3.5" />Acerto = AUC: 0,5 é o mesmo que sortear; 1 é acertar sempre quem fecha.</p>
    </div>
  );
}
