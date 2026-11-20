import { useState } from "react";
import {
  Archive, Banknote, Calendar, Clock3, Copy, Database, ExternalLink, FileText, Flag, Lightbulb, Loader2, Map as Mapa, MapPin, Megaphone, MessageCircle,
  Search, Smartphone, Sparkles, Target, TrendingUp, User, AlertTriangle, Shuffle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { SectionCard } from "../AdminPrimitives";
import { cn } from "../../utils";
import {
  ACOES, Bloco, COMO_RECONHECE, Carregando, Erro, EtiquetaPH, ICONE_CATEGORIA, ICONE_PAPEL, PERGUNTAS, QUANDO, SeloTemp, dia, haQuanto, ler,
  nomeCategoria, pct, quando, rotulo, urlPosthog, useApi, usd, type ConteudoJanela,
} from "./comum";
import { Sankey } from "./Sankey";
import { ContaDaPessoa, ConversasDaPessoa } from "./ContaDaPessoa";
import { MatchsDaPessoa } from "./MatchsDaPessoa";
import { janelaDaFaixa, janelaDoBloco, Legenda } from "./Caminhos";
import type { Caminhos, Ficha, ItemDaFicha, RespostaDaFicha } from "./tipos";

type Sub = "resumo" | "mapa" | "dados" | "conversas" | "previsoes" | "conta" | "matchs";
const SUBS: [Sub, string, typeof User][] = [["resumo", "Resumo", Sparkles], ["mapa", "Mapa do cliente", Mapa], ["dados", "Dados", Database], ["conversas", "Conversas", MessageCircle], ["previsoes", "Previsões", TrendingUp], ["conta", "Conta", Archive], ["matchs", "Matchs", Shuffle]];

function Itens({ itens, nome, rotuloDoTipo, abrir }: { itens: ItemDaFicha[]; nome: string; rotuloDoTipo: string; abrir: (c: ConteudoJanela) => void }) {
  if (!itens.length) return <p className="text-xs text-slate-400">Nenhum.</p>;
  return (
    <div className="space-y-1.5">
      {itens.map((it, i) => (
        <button key={i} type="button" onClick={() => abrir({ titulo: it.titulo, sub: `${nome} · ${rotuloDoTipo}`, corpo: <><p className="text-slate-500">{it.sub}</p><dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">{Object.entries(it.campos).map(([k, v]) => <div key={k} className="contents"><dt className="text-slate-500">{k}</dt><dd className="font-semibold text-slate-900">{v}</dd></div>)}</dl></> })}
          className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 px-2.5 py-2 text-left hover:border-orange-300">
          <span><b className="block text-[13px] text-slate-900">{it.titulo}</b><small className="text-xs text-slate-500">{it.sub}</small></span><span className="text-slate-400">›</span>
        </button>
      ))}
    </div>
  );
}

function Linha({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-1 text-[13px] last:border-0"><span className="text-slate-500">{k}</span><b className="text-right text-slate-900">{v}</b></div>;
}

function Trajetoria({ f, nome }: { f: Ficha; nome: string }) {
  if (!f.trajetoria?.length) return <p className="text-xs text-slate-400">Sem passos registrados ainda.</p>;
  return (
    <ul className="relative ml-1 space-y-0 border-l-2 border-slate-200 pl-4" aria-label={`Trajetória de ${nome}`}>
      {f.trajetoria.map((p, i) => "pausa" in p ? (
        <li key={i} className="py-1.5 text-xs italic text-slate-400">⏸ {p.pausa}</li>
      ) : (
        <li key={i} className="relative py-1.5">
          <span className={cn("absolute -left-[23px] top-2.5 h-3 w-3 rounded-full border-2 bg-white", p.tipo === "marco" ? "border-orange-500 bg-orange-500" : p.tipo === "ruim" ? "border-rose-500" : "border-slate-300")} />
          <span className="mr-2 text-[11px] font-semibold text-slate-400">{quando(p.em)}</span>
          <b className={cn("text-[13px]", p.tipo === "ruim" ? "text-rose-700" : "text-slate-900")}>{p.titulo}</b>
          {p.detalhe ? <small className="block text-xs text-slate-500">{p.detalhe}</small> : null}
        </li>
      ))}
    </ul>
  );
}

function FichaDaPessoa({ id, abrir, irParaPerfis, investigar }: { id: number; abrir: (c: ConteudoJanela) => void; irParaPerfis: () => void; investigar: (id: number) => void }) {
  const { dado: r, erro, deNovo } = useApi<RespostaDaFicha>(`/admin/analise/pessoas/${id}`, 90000);
  const [sub, setSub] = useState<Sub>("resumo");
  const [rodando, setRodando] = useState(false);
  const [erroIA, setErroIA] = useState<string | null>(null);
  const f = r?.ficha;
  const papel = f?.papel ?? (r?.dossie.pessoa.papel === "profissional" ? "profissional" : "cliente");
  const principal = useApi<Caminhos>(sub === "mapa" && r ? `/admin/analise/caminhos?papel=${papel}&dias=90` : null);
  const pos = useApi<Caminhos>(sub === "mapa" && r ? `/admin/analise/caminhos?papel=pos&dias=90` : null);

  if (erro) return <Erro msg={erro} />;
  if (!r) return <Carregando />;
  const nome = r.nome ?? `Conta ${id}`;
  const a = r.analises?.[0];
  const res = a?.resultado;
  const IP = ICONE_PAPEL[papel];
  const IC = (a?.categoria && ICONE_CATEGORIA[a.categoria]) || User;

  const analisar = async () => {
    const pouco = !r.suficiencia.ok;
    if (!window.confirm(`${pouco ? `Atenção: ${r.suficiencia.motivo}\n\n` : ""}Rodar a IA analista agora? Custo estimado: ${usd(r.custo_estimado_usd)}.`)) return;
    setRodando(true); setErroIA(null);
    try { await apiRequest("POST", `/admin/analise/pessoas/${id}/analisar`, { confirmar: true, mesmo_com_pouco_dado: pouco }, undefined, 180000).then(ler); deNovo(); }
    catch (e: any) { setErroIA(e.message); } finally { setRodando(false); }
  };
  const abrirCategoria = () => a && abrir({
    titulo: nomeCategoria(a.categoria), sub: `Perfil de ${papel}`,
    corpo: <><p>Como a IA reconhece: <b>{COMO_RECONHECE[a.categoria] ?? "—"}</b>.</p><button type="button" onClick={irParaPerfis} className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-bold text-white">Ver todos deste perfil em Perfis</button></>,
  });

  return (
    <div className="space-y-4">
      {/* topo */}
      <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-bold text-slate-950">{nome}</h2><EtiquetaPH id={id} /><span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600"><IP className="h-3 w-3" />{papel}</span></div>
          <div className="mt-1 flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-slate-500">
            {f?.cidade || r.dossie.pessoa.cidade ? <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{[f?.cidade ?? r.dossie.pessoa.cidade, f?.uf ?? r.dossie.pessoa.uf].filter(Boolean).join("/")}{f?.profissao ? ` · ${f.profissao}` : ""}</span> : null}
            {f?.criado_em ? <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />desde {dia(f.criado_em)}</span> : null}
            {f?.origem ? <span className="inline-flex items-center gap-1"><Megaphone className="h-3.5 w-3.5" />{f.origem}</span> : null}
            {f ? <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />último acesso {haQuanto(f.ultimo_acesso)}</span> : null}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <SeloTemp t={a?.temperatura ?? r.dossie.temperatura_por_codigo.nivel} extra={a ? undefined : " (regras)"} />
            {a ? <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-xs font-semibold"><Target className="h-3.5 w-3.5 text-slate-400" />{pct(a.chance)} de chance</span> : null}
            {a ? <button type="button" onClick={abrirCategoria} className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-xs font-semibold hover:border-orange-300"><IC className="h-3.5 w-3.5 text-orange-500" />{nomeCategoria(a.categoria)} ›</button> : null}
            {f?.etapa ? <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-xs font-semibold"><Flag className="h-3.5 w-3.5 text-orange-500" />{f.etapa}</span> : null}
          </div>
        </div>
        <div className="flex flex-wrap items-start gap-2 md:flex-col md:items-end">
          <button type="button" disabled={rodando} onClick={() => void analisar()} className="inline-flex items-center gap-1.5 rounded-full bg-orange-600 px-3.5 py-2 text-xs font-bold text-white disabled:opacity-60">
            {rodando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}Analisar com IA · ≈ {usd(r.custo_estimado_usd)}
          </button>
          <a href={f?.posthog_url ?? urlPosthog(id)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-800 no-underline"><ExternalLink className="h-3.5 w-3.5" />Ver todos os cliques no PostHog</a>
          <button type="button" onClick={() => void navigator.clipboard?.writeText(String(id))} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-800"><Copy className="h-3.5 w-3.5" />Copiar código {id}</button>
        </div>
      </section>
      {erroIA ? <Erro msg={erroIA} /> : null}
      {!r.suficiencia.ok && !a ? <p className="text-xs text-amber-700">{r.suficiencia.motivo} Dá para rodar mesmo assim, mas a leitura tende a ficar rasa.</p> : null}

      {/* abas internas */}
      <div className="inline-flex flex-wrap rounded-full bg-slate-100 p-0.5">
        {SUBS.map(([k, rr, I]) => <button key={k} type="button" onClick={() => setSub(k)} className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold", sub === k ? "bg-white text-slate-950 shadow-sm" : "text-slate-500")}><I className="h-3.5 w-3.5" />{rr}</button>)}
      </div>

      {sub === "resumo" ? (
        <div className="space-y-3">
          {res ? (
            <>
              <p className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2.5 text-sm text-slate-800">{res.resumo} <span className="text-xs text-slate-400">(análise de {quando(a!.em)} · {usd(a!.custo_usd)})</span></p>
              <div className="grid gap-3 md:grid-cols-2">
                <Bloco titulo="Follow-up sugerido" icone={Lightbulb}>
                  <p className="text-sm"><b>{ACOES[res.follow_up.acao] ?? rotulo(res.follow_up.acao)}</b> · {QUANDO[res.follow_up.quando] ?? res.follow_up.quando}. {res.follow_up.por_que}</p>
                  {res.follow_up.mensagem_sugerida ? <p className="mt-1.5 rounded-lg bg-slate-50 px-2 py-1.5 text-xs text-slate-600">Mensagem: “{res.follow_up.mensagem_sugerida}”</p> : null}
                </Bloco>
                <Bloco titulo="Traços (clique para ver a prova)" icone={Sparkles}>
                  <div className="space-y-1.5">
                    {res.tracos.map((t) => (
                      <button key={t.traco} type="button" className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-2.5 py-1.5 text-left text-[13px] hover:border-orange-300"
                        onClick={() => abrir({ titulo: rotulo(t.traco), sub: `${nome} · nível ${rotulo(t.nivel)} · confiança ${t.confianca}`, corpo: <section><h5 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Por que a IA disse isso</h5>{t.provas.length ? <ul className="space-y-1">{t.provas.map((pid) => <li key={pid}><b>{pid}</b> {res.fatos_citados?.[pid] ? `[${quando(res.fatos_citados[pid].em)}] ${res.fatos_citados[pid].texto}` : "(fato não guardado)"}</li>)}</ul> : <p className="text-slate-500">Sem prova direta: veio dos números da conta.</p>}</section> })}>
                        <span>{rotulo(t.traco)}</span>
                        <span className={cn("rounded px-1.5 text-[11px] font-bold", t.nivel === "alto" ? "bg-rose-50 text-rose-600" : t.nivel === "medio" ? "bg-amber-50 text-amber-600" : t.nivel === "baixo" ? "bg-sky-50 text-sky-600" : "bg-slate-100 text-slate-400")}>{t.nivel === "medio" ? "médio" : rotulo(t.nivel)}</span>
                      </button>
                    ))}
                  </div>
                </Bloco>
              </div>
              <p className="text-xs text-slate-500">Por que {res.temperatura.nivel}: {res.temperatura.motivo}{res.temperatura.diverge_das_regras ? ` · pelas regras seria ${a!.temperatura_codigo}` : ""}</p>
              {res.alertas.length ? <Bloco titulo="Alertas" icone={AlertTriangle}><ul className="list-disc space-y-1 pl-4 text-sm">{res.alertas.map((x, i) => <li key={i}>{x.texto}</li>)}</ul></Bloco> : null}
              {res.lacunas.length || res.o_que_mudaria_a_leitura ? <p className="text-xs text-slate-500">{res.lacunas.length ? <><b>Falta saber:</b> {res.lacunas.join("; ")}. </> : null}{res.o_que_mudaria_a_leitura ? <><b>O que mudaria a leitura:</b> {res.o_que_mudaria_a_leitura}</> : null}</p> : null}
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
              Ainda sem análise da IA para esta pessoa. Pelas regras (sem IA): <SeloTemp t={r.dossie.temperatura_por_codigo.nivel} />
              <p className="mt-1 text-xs">{r.dossie.temperatura_por_codigo.motivos.join(" · ")}</p>
            </div>
          )}
        </div>
      ) : null}

      {sub === "mapa" ? (
        <div className="space-y-4">
          <SectionCard title={`Caminho de ${nome}`} subtitle="O caminho dela acende sobre o de todo mundo (últimos 90 dias). Clique nos blocos para ver detalhes.">
            {principal.erro ? <Erro msg={principal.erro} /> : !principal.dado ? <Carregando /> : <Sankey dados={principal.dado} destaque={f?.caminho?.principal} aoClicarNo={(n) => abrir(janelaDoBloco(principal.dado!, n, investigar))} aoClicarLiga={(i) => abrir(janelaDaFaixa(principal.dado!, i, investigar))} alturaMin={600} />}
            <Legenda />
          </SectionCard>
          {f?.caminho?.pos?.length ? (
            <SectionCard title="Depois de fechar">
              {pos.erro ? <Erro msg={pos.erro} /> : !pos.dado ? <Carregando /> : <Sankey dados={pos.dado} destaque={f.caminho.pos} aoClicarNo={(n) => abrir(janelaDoBloco(pos.dado!, n, investigar))} aoClicarLiga={(i) => abrir(janelaDaFaixa(pos.dado!, i, investigar))} alturaMin={380} />}
            </SectionCard>
          ) : null}
          <SectionCard title={`Trajetória de ${nome}`} subtitle="Cada passo com data e hora; pontos laranja são marcos, vermelhos são onde travou">{f ? <Trajetoria f={f} nome={nome} /> : <p className="text-xs text-slate-400">Sem dado.</p>}</SectionCard>
        </div>
      ) : null}

      {sub === "dados" && f ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Bloco titulo="Conta" icone={User} fonte="banco da ArqDoor">{(f.conta ?? []).map(([k, v]) => <Linha key={k} k={k} v={v} />)}<Linha k="Código no PostHog" v={<EtiquetaPH id={id} leve />} /></Bloco>
          <Bloco titulo="Uso do app" icone={Smartphone} fonte={f.uso_do_app?.fonte === "posthog" ? "PostHog (resumo)" : f.uso_do_app?.fonte === "eventos" ? "eventos do app" : undefined}>
            {!f.uso_do_app ? <p className="text-xs text-slate-400">Sem dado de uso ainda.</p> : (
              <>
                <Linha k="Sessões" v={f.uso_do_app.sessoes} />
                <Linha k="Tempo médio por sessão" v={f.uso_do_app.tempo_medio_seg == null ? "—" : `${Math.floor(f.uso_do_app.tempo_medio_seg / 60)} min ${Math.round(f.uso_do_app.tempo_medio_seg % 60)} s`} />
                <Linha k="Último evento" v={quando(f.uso_do_app.ultimo_evento)} />
                {f.uso_do_app.telas.length ? <><p className="mt-2 text-[11px] font-semibold text-slate-400">Telas mais vistas</p>{f.uso_do_app.telas.slice(0, 6).map(([t, n]) => <Linha key={t} k={t} v={`${n}×`} />)}</> : null}
                {f.uso_do_app.botoes.length ? <><p className="mt-2 text-[11px] font-semibold text-slate-400">Botões mais tocados</p>{f.uso_do_app.botoes.slice(0, 6).map(([t, n]) => <Linha key={t} k={t} v={`${n}×`} />)}</> : null}
                <p className="mt-2 text-[11px] font-semibold text-slate-400">Horário de uso (0h a 23h)</p>
                <div className="mt-1 flex h-10 items-end gap-px">{f.uso_do_app.horas.map((h, i) => <i key={i} title={`${i}h: ${h}`} className="block flex-1 rounded-t-sm bg-orange-300" style={{ height: `${(h / Math.max(1, ...f.uso_do_app!.horas)) * 100}%`, minHeight: h ? 2 : 0 }} />)}</div>
              </>
            )}
          </Bloco>
          <Bloco titulo={papel === "cliente" ? "Pedidos" : "Pedidos recebidos"} icone={FileText}><Itens itens={f.pedidos ?? []} nome={nome} rotuloDoTipo="pedido" abrir={abrir} /></Bloco>
          <Bloco titulo="Propostas" icone={FileText}><Itens itens={f.propostas ?? []} nome={nome} rotuloDoTipo="proposta" abrir={abrir} /></Bloco>
          <Bloco titulo="Sinais da conversa (com a frase que prova)" icone={MessageCircle}>
            {!f.sinais?.length ? <p className="text-xs text-slate-400">Nenhum.</p> : f.sinais.map((s, i) => <div key={i} className="border-b border-slate-100 py-1 text-[13px] last:border-0"><span className="text-slate-500">{rotulo(s.sinal)}:</span> <b>{s.valor}</b><small className="block text-xs text-slate-400">“{s.prova}”</small></div>)}
          </Bloco>
          <Bloco titulo="Contratos e pagamentos" icone={Banknote}><Itens itens={f.pagamentos ?? []} nome={nome} rotuloDoTipo="pagamento" abrir={abrir} /></Bloco>
          <details className="rounded-xl border border-slate-200 p-3 text-xs md:col-span-2">
            <summary className="cursor-pointer font-semibold text-slate-700">O que a IA lê: {r.dossie.fatos.length} fatos e os números da conta</summary>
            <div className="mt-2 grid grid-cols-2 gap-1 sm:grid-cols-4">{Object.entries(r.dossie.numeros).map(([k, v]) => <div key={k} className="rounded border border-slate-200 px-2 py-1"><span className="text-slate-500">{rotulo(k)}</span><br /><b>{v ?? "—"}</b></div>)}</div>
            <ul className="mt-2 max-h-80 space-y-0.5 overflow-auto">{[...r.dossie.fatos].reverse().map((x) => <li key={x.id}><b>{x.id}</b> [{quando(x.em)}] <span className="text-slate-500">{x.tipo}</span> {x.texto}</li>)}</ul>
            {r.dossie.faltou.length ? <p className="mt-2 text-amber-700">Não deu para ler: {r.dossie.faltou.join("; ")}</p> : null}
          </details>
        </div>
      ) : null}
      {sub === "dados" && !f ? <p className="text-sm text-slate-500">Os dados detalhados ainda não chegaram do servidor.</p> : null}

      {sub === "conversas" ? <ConversasDaPessoa id={id} nome={nome} f={f} abrir={abrir} investigar={investigar} /> : null}

      {sub === "previsoes" ? (
        !a?.previsoes.length ? <p className="text-sm text-slate-500">Ainda sem análise da IA para esta pessoa.</p> : (
          <SectionCard title="Previsões da última análise" subtitle="O código confere no banco quando o prazo vence">
            <table className="w-full text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wide text-slate-400"><tr><th className="py-1">Previsão</th><th>A IA disse</th><th>Vence</th><th>Situação</th></tr></thead>
              <tbody>{a.previsoes.map((p, i) => (
                <tr key={i} className="border-t border-slate-100"><td className="py-1.5">{PERGUNTAS[p.pergunta] ?? rotulo(p.pergunta)}</td><td className="font-bold">{pct(p.probabilidade)}</td><td>{dia(p.vence_em)}</td>
                  <td>{p.aconteceu == null ? <span className="text-slate-400">aguardando</span> : p.aconteceu ? <span className="font-semibold text-emerald-700">aconteceu</span> : <span className="font-semibold text-slate-600">não aconteceu</span>}</td></tr>
              ))}</tbody>
            </table>
            {(r.analises?.length ?? 0) > 1 ? <p className="mt-2 text-xs text-slate-400">Análises anteriores: {r.analises.slice(1).map((x) => `${dia(x.em)} ${x.temperatura} ${pct(x.chance)}`).join(" · ")}</p> : null}
          </SectionCard>
        )
      ) : null}

      {sub === "conta" ? <ContaDaPessoa id={id} nome={nome} f={f} abrir={abrir} investigar={investigar} /> : null}
      {sub === "matchs" ? <MatchsDaPessoa id={id} abrir={abrir} investigar={investigar} /> : null}
    </div>
  );
}

export function AbaInvestigar({ id, abrir, investigar, irParaPerfis }: { id: number | null; abrir: (c: ConteudoJanela) => void; investigar: (id: number) => void; irParaPerfis: () => void }) {
  const [codigo, setCodigo] = useState("");
  const ir = () => { const n = Number(codigo.replace(/\D/g, "")); if (n) investigar(n); };
  return (
    <div className="space-y-4">
      <form onSubmit={(e) => { e.preventDefault(); ir(); }} className="flex flex-wrap items-center gap-2">
        <label className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-within:border-orange-300">
          <Search className="h-4 w-4 text-slate-400" />
          <input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Código da conta ou do PostHog (ex.: 1043)" className="w-full outline-none" inputMode="numeric" />
        </label>
        <button type="submit" className="rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white">Investigar</button>
      </form>
      {id ? <FichaDaPessoa key={id} id={id} abrir={abrir} irParaPerfis={irParaPerfis} investigar={investigar} /> : <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">Escolha alguém em Pessoas, num perfil ou num bloco dos caminhos, ou digite o código acima.</p>}
    </div>
  );
}
