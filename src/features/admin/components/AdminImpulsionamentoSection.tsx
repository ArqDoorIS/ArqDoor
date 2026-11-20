import { useEffect, useMemo, useState, type ReactNode } from "react";
import { History, Loader2, Plus, RotateCcw, Save, Search, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Dica, SectionCard } from "./AdminPrimitives";
import { cn } from "../utils";
import { Alternador, Bloco, Carregando, Erro, Janela, ler, quando, useApi, type ConteudoJanela } from "./analise/comum";

/**
 * Aba Impulsionamento (20/11/2026). Duas partes:
 *
 *  Regras gerais (versões, como as regras do algoritmo)
 *   GET  /admin/impulsionamento/config               { ativa, padrao, limites, max_faixas, versoes }
 *   PUT  /admin/impulsionamento/config               { params, motivo }
 *   POST /admin/impulsionamento/config/restaurar     { versao }   (0 = fábrica)
 *
 *  Profissionais (o número de cada um, multiplicador, bônus e punições)
 *   GET    /admin/impulsionamento/profissionais?busca=
 *   GET    /admin/impulsionamento/profissionais/:userId
 *   PUT    /admin/impulsionamento/profissionais/:userId/multiplicador   { multiplicador, valido_ate, motivo }
 *   POST   /admin/impulsionamento/profissionais/:userId/ajustes          { tipo, pontos, motivo, valido_ate }
 *   DELETE /admin/impulsionamento/profissionais/:userId/ajustes/:id
 */

/* ---------- tipos ---------- */
type Faixa = { ate: number | null; pontos: number };
type Params = {
  base: { inicial: number; teto: number };
  faixas: Faixa[];
  multiplicadores: { geral: number };
  punicoes: { por_reclamacao: number; por_reembolso: number };
  lancamento: { previsto_para: string; bonus_por_cliente: number; bonus_maximo: number };
};
type GrupoNum = "base" | "multiplicadores" | "punicoes" | "lancamento";
type Limite = [number, number];
type Limites = Record<GrupoNum, Record<string, Limite>> & { faixa: { ate: Limite; pontos: Limite } };
type Versao = { versao: number; params: Params; motivo: string | null; criado_por: string | null; criado_em: string | null };
type RespostaConfig = { ativa: Versao; padrao: Params; limites: Limites; max_faixas: number; versoes: Versao[] };

type LinhaProfissional = {
  user_id: number; nome: string; email: string | null; profissao: string | null; suspenso: boolean;
  valor: number | null; fases: number; clientes: number; multiplicador: number; bonus: number; punicoes: number;
};
type Conta = {
  valor: number; teto: number;
  partes: {
    inicial: number;
    fases: { quantidade: number; pontos: number; multiplicador_individual: number; multiplicador_geral: number; total: number };
    lancamento: { clientes: number; pontos: number; previsto_para: string };
    bonus: number;
    punicoes: { reclamacoes: number; reembolsos: number; automaticas: number; manuais: number };
  };
};
type Individual = { multiplicador: number | string; valido_ate: string | null; motivo: string | null; atualizado_por: string | null } | null;
type Ajuste = {
  id: number; tipo: "bonus" | "punicao"; pontos: number | string; motivo: string | null; valido_ate: string | null;
  criado_por: string | null; created_at: string | null; revogado_em: string | null; revogado_por: string | null;
};
type DetalheResposta = { profissional: Omit<LinhaProfissional, "valor" | "fases" | "clientes" | "multiplicador" | "bonus" | "punicoes">; conta: Conta; individual: Individual; ajustes: Ajuste[] };

/* ---------- números ---------- */
/** Sem separador de milhar no campo: "1.000" seria lido como 1. */
const paraCampo = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v.toLocaleString("pt-BR", { maximumFractionDigits: 4, useGrouping: false }) : v == null ? "" : String(v));
/** Aceita vírgula decimal. Em reais, "10.000" ou "10.000,50" vira dez mil. */
export const paraNumero = (s: string, reais = false) => {
  let t = String(s ?? "").replace(/\s/g, "").replace(/^R\$/i, "");
  if (!t) return NaN;
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  else if (reais && /^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, "");
  return Number(t);
};
const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) : "—";
};
const reaisCurto = (v: number) => `R$ ${v.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}`;
/** Data do banco (fim do dia em Brasília) para o campo AAAA-MM-DD. */
const paraData = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" }) : "");
/** Hoje no fuso de Brasília (AAAA-MM-DD), o mínimo dos campos "Vale até". */
const hoje = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
const diaBr = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—");
const diaDoCampo = (aaaaMmDd: string) => (/^\d{4}-\d{2}-\d{2}$/.test(aaaaMmDd) ? aaaaMmDd.split("-").reverse().join("/") : aaaaMmDd);
const DATA_OK = /^\d{4}-\d{2}-\d{2}$/;

/* ---------- campos das regras ---------- */
type Campo = { grupo: GrupoNum; chave: string; rotulo: string; ajuda: string };
const SECOES: { titulo: string; dica: string; campos: Campo[]; comData?: boolean }[] = [
  {
    titulo: "Começo e teto",
    dica: "Todo profissional começa no número inicial. Fases, bônus e punições mexem a partir dali, sem passar do teto e sem ficar abaixo de 0.",
    campos: [
      { grupo: "base", chave: "inicial", rotulo: "Começa em", ajuda: "Onde todo profissional começa." },
      { grupo: "base", chave: "teto", rotulo: "Teto", ajuda: "O máximo que alguém chega." },
    ],
  },
  {
    titulo: "Multiplicador geral",
    dica: "Vale para todo mundo ao mesmo tempo. Bom para campanhas: 2 dobra os pontos das fases enquanto estiver valendo.",
    campos: [
      { grupo: "multiplicadores", chave: "geral", rotulo: "Multiplicador geral", ajuda: "Multiplica os pontos das fases de todos. 1 = normal." },
    ],
  },
  {
    titulo: "Punições automáticas",
    dica: "Saem sozinhas, sem ninguém do painel lançar.",
    campos: [
      { grupo: "punicoes", chave: "por_reclamacao", rotulo: "Por reclamação de fase", ajuda: "Pontos que perde a cada reclamação de fase." },
      { grupo: "punicoes", chave: "por_reembolso", rotulo: "Por reembolso", ajuda: "Pontos a mais que perde quando a ArqDoor decide reembolso." },
    ],
  },
  {
    titulo: "Lançamento",
    dica: "Bônus para quem já trouxe clientes antes do lançamento: conta os clientes fechados pela plataforma até a data prevista, convidados ou que o conheceram aqui.",
    comData: true,
    campos: [
      { grupo: "lancamento", chave: "bonus_por_cliente", rotulo: "Bônus por cliente", ajuda: "Pontos por cliente já fechado pela plataforma até o lançamento." },
      { grupo: "lancamento", chave: "bonus_maximo", rotulo: "Bônus máximo", ajuda: "O máximo que o bônus do lançamento soma." },
    ],
  },
];
const TODOS_CAMPOS = SECOES.flatMap((s) => s.campos);
const idDe = (c: Campo) => `${c.grupo}.${c.chave}`;

type Rascunho = { campos: Record<string, string>; faixas: { ate: string; pontos: string }[]; data: string };
const rascunhoDe = (p: Params): Rascunho => ({
  campos: Object.fromEntries(TODOS_CAMPOS.map((c) => [idDe(c), paraCampo((p[c.grupo] as Record<string, number>)[c.chave])])),
  faixas: p.faixas.map((f) => ({ ate: f.ate == null ? "" : paraCampo(f.ate), pontos: paraCampo(f.pontos) })),
  data: p.lancamento.previsto_para ?? "",
});

/** Monta os params do rascunho e aponta o que está fora do limite (chave do campo -> mensagem). */
function montar(base: Params, r: Rascunho, lim: Limites) {
  const p: Params = JSON.parse(JSON.stringify(base));
  const erros: Record<string, string> = {};
  const confere = (id: string, n: number, [min, max]: Limite) => {
    if (!Number.isFinite(n) || n < min || n > max) erros[id] = `entre ${num(min)} e ${num(max)}`;
  };
  for (const c of TODOS_CAMPOS) {
    const n = paraNumero(r.campos[idDe(c)] ?? "");
    (p[c.grupo] as Record<string, number>)[c.chave] = n;
    confere(idDe(c), n, lim[c.grupo]?.[c.chave] ?? [-Infinity, Infinity]);
  }
  p.lancamento.previsto_para = r.data;
  if (!DATA_OK.test(r.data) || Number.isNaN(Date.parse(`${r.data}T12:00:00Z`))) erros.data = "uma data válida";
  p.faixas = r.faixas.map((f, i) => {
    const ultima = i === r.faixas.length - 1;
    const pontos = paraNumero(f.pontos);
    confere(`faixa.${i}.pontos`, pontos, lim.faixa.pontos);
    if (ultima) return { ate: null, pontos };
    const ate = paraNumero(f.ate, true);
    confere(`faixa.${i}.ate`, ate, lim.faixa.ate);
    const antes = i > 0 ? paraNumero(r.faixas[i - 1].ate, true) : NaN;
    if (!erros[`faixa.${i}.ate`] && Number.isFinite(antes) && ate <= antes) erros[`faixa.${i}.ate`] = "maior que a faixa de cima";
    return { ate, pontos };
  });
  if (!erros["base.inicial"] && !erros["base.teto"] && p.base.inicial > p.base.teto) erros["base.inicial"] = "no máximo o teto";
  return { params: p, erros };
}

/** O que mudou entre duas versões, em palavras. */
const diferencas = (a: Params, b: Params) => {
  const saida = TODOS_CAMPOS.filter((c) => (a[c.grupo] as Record<string, number>)?.[c.chave] !== (b[c.grupo] as Record<string, number>)?.[c.chave]).map((c) => c.rotulo.toLowerCase());
  if (a.lancamento?.previsto_para !== b.lancamento?.previsto_para) saida.push("data do lançamento");
  if (JSON.stringify(a.faixas) !== JSON.stringify(b.faixas)) saida.push("pontos por fase");
  return saida;
};

const caixaCampo = (ruim: boolean, alterado: boolean) => cn("block rounded-xl border px-3 py-2", ruim ? "border-rose-300 bg-rose-50/40" : alterado ? "border-orange-300 bg-orange-50/40" : "border-slate-200");
const entrada = "mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm font-semibold outline-none focus:border-orange-400";

/* ---------- regras gerais ---------- */
export function RegrasDoImpulsionamento() {
  const { dado, erro, deNovo } = useApi<RespostaConfig>("/admin/impulsionamento/config");
  const [rascunho, setRascunho] = useState<Rascunho | null>(null);
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; ruim?: boolean } | null>(null);
  const [verVersoes, setVerVersoes] = useState(false);

  const ativa = dado?.ativa;
  useEffect(() => { if (ativa) setRascunho(rascunhoDe(ativa.params)); }, [ativa]);

  const montado = useMemo(() => (ativa && rascunho && dado?.limites ? montar(ativa.params, rascunho, dado.limites) : null), [ativa, rascunho, dado?.limites]);

  if (erro) return <SectionCard title="Regras gerais"><Erro msg={erro} /></SectionCard>;
  if (!dado || !ativa || !rascunho || !montado || !dado.padrao) return <SectionCard title="Regras gerais"><Carregando /></SectionCard>;
  const versoes = Array.isArray(dado.versoes) ? dado.versoes : [];
  const maxFaixas = dado.max_faixas || 12;
  const { params, erros } = montado;
  const mudou = diferencas(ativa.params, params);
  const invalidos = Object.keys(erros).length;

  const mudarCampo = (id: string, v: string) => setRascunho((r) => (r ? { ...r, campos: { ...r.campos, [id]: v } } : r));
  const mudarFaixa = (i: number, k: "ate" | "pontos", v: string) => setRascunho((r) => (r ? { ...r, faixas: r.faixas.map((f, j) => (j === i ? { ...f, [k]: v } : f)) } : r));
  const novaFaixa = () => setRascunho((r) => {
    if (!r || r.faixas.length >= maxFaixas) return r;
    const faixas = [...r.faixas];
    const ultima = faixas[faixas.length - 1];
    const antes = faixas.length > 1 ? paraNumero(faixas[faixas.length - 2].ate, true) : NaN;
    // entra logo antes do "acima disso", com o dobro do teto da faixa de cima
    faixas.splice(faixas.length - 1, 0, { ate: paraCampo(Number.isFinite(antes) ? antes * 2 : 1000), pontos: ultima.pontos });
    return { ...r, faixas };
  });
  const tirarFaixa = (i: number) => setRascunho((r) => (r && r.faixas.length > 1 ? { ...r, faixas: r.faixas.filter((_, j) => j !== i).map((f, j, l) => (j === l.length - 1 ? { ...f, ate: "" } : f)) } : r));

  const salvar = async () => {
    // Vale na hora para todo mundo: confirma, com aviso mais forte quando zera ou baixa o número.
    const zerou = Number(params.multiplicadores?.geral) === 0;
    const baixouTeto = Number(params.base?.teto) < Number(ativa.params.base?.teto);
    const alertas = [
      zerou ? "O multiplicador geral fica 0: os pontos das fases de TODOS os profissionais zeram." : "",
      baixouTeto ? `O teto desce de ${num(ativa.params.base?.teto)} para ${num(params.base?.teto)}: quem está acima do novo teto cai para ele.` : "",
    ].filter(Boolean);
    const pergunta = alertas.length
      ? `Atenção: ${alertas.join(" ")} Vale para todos os profissionais na hora. Salvar mesmo assim?`
      : "Vale para todos os profissionais na hora. Salvar?";
    if (!window.confirm(pergunta)) return;
    setSalvando(true); setAviso(null);
    try {
      const r = (await apiRequest("PUT", "/admin/impulsionamento/config", { params, motivo: motivo.trim() }).then(ler)) as { versao: number };
      setAviso({ texto: `Salvo como versão ${r.versao}. Já vale para todos os profissionais.` });
      setMotivo("");
      deNovo();
    } catch (e: any) { setAviso({ texto: e.message, ruim: true }); } finally { setSalvando(false); }
  };
  const restaurar = async (versao: number) => {
    if (!window.confirm(versao === 0 ? "Voltar às regras de fábrica? Vira uma versão nova." : `Voltar às regras da versão ${versao}? Vira uma versão nova.`)) return;
    setSalvando(true); setAviso(null);
    try {
      const r = (await apiRequest("POST", "/admin/impulsionamento/config/restaurar", { versao }).then(ler)) as { versao: number };
      setAviso({ texto: `Pronto: a versão ${r.versao} repete as regras da ${versao === 0 ? "fábrica" : `versão ${versao}`}.` });
      deNovo();
    } catch (e: any) { setAviso({ texto: e.message, ruim: true }); } finally { setSalvando(false); }
  };

  const ativaFaixas = ativa.params.faixas ?? [];
  const msg = (id: string) => (erros[id] ? <b className="text-rose-700">Precisa ficar {erros[id]}. </b> : null);

  return (
    <SectionCard title="Regras gerais"
      subtitle={`Em vigor: ${ativa.versao === 0 ? "regras de fábrica" : `versão ${ativa.versao}`}${ativa.criado_em ? ` · ${quando(ativa.criado_em)}` : ""}${ativa.criado_por ? ` · ${ativa.criado_por}` : ""}`}
      dica="As regras que dão o número de cada profissional. Cada mudança vira uma versão nova com motivo e vale na hora para todos."
      action={<button type="button" onClick={() => setVerVersoes((v) => !v)} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700"><History className="h-3.5 w-3.5" />{verVersoes ? "Fechar versões" : `Versões (${versoes.length})`}</button>}>
      <div className="space-y-4" data-testid="regras-do-impulsionamento">
        {verVersoes ? (
          <div className="rounded-xl border border-slate-200">
            <ul className="max-h-72 divide-y divide-slate-100 overflow-auto text-sm">
              {versoes.map((v, i) => {
                const d = diferencas(versoes[i + 1]?.params ?? dado.padrao, v.params);
                return (
                  <li key={v.versao} className="flex flex-wrap items-start gap-2 px-3 py-2" data-testid="versao-do-impulsionamento">
                    <span className="min-w-0 flex-1">
                      <b className="text-slate-900">Versão {v.versao}</b>{v.versao === ativa.versao ? <span className="ml-1.5 rounded bg-emerald-50 px-1.5 text-[11px] font-bold text-emerald-700">em vigor</span> : null}
                      <span className="block text-xs text-slate-500">{quando(v.criado_em)} · {v.criado_por ?? "—"} · {v.motivo ?? "sem motivo"}</span>
                      <span className="block text-[11px] text-slate-400">{d.length ? `mudou: ${d.join(", ")}` : "igual à anterior"}</span>
                    </span>
                    {v.versao !== ativa.versao ? <button type="button" disabled={salvando} onClick={() => void restaurar(v.versao)} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-800 ring-1 ring-slate-200 hover:ring-orange-300">Voltar para esta</button> : null}
                  </li>
                );
              })}
              <li className="flex items-center gap-2 px-3 py-2">
                <span className="flex-1 text-xs text-slate-500"><b className="text-slate-900">Regras de fábrica</b> · as do começo</span>
                {ativa.versao !== 0 ? <button type="button" disabled={salvando} onClick={() => void restaurar(0)} className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-800 ring-1 ring-slate-200 hover:ring-orange-300"><RotateCcw className="h-3 w-3" />Voltar às de fábrica</button> : null}
              </li>
            </ul>
          </div>
        ) : null}

        {/* faixas */}
        <div>
          <p className="mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Pontos por fase aprovada<Dica texto="Cada fase que o cliente aprova soma os pontos da faixa em que o valor dela cai. A primeira faixa que couber vale." /></p>
          <p className="mb-2 text-[11px] text-slate-400">Cada fase que o cliente aprova soma os pontos da faixa do valor dela.</p>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 bg-slate-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <span>Valor da fase</span><span>Pontos</span><span className="w-7" />
            </div>
            <ul className="divide-y divide-slate-100">
              {rascunho.faixas.map((f, i) => {
                const ultima = i === rascunho.faixas.length - 1;
                const antes = ativaFaixas[i];
                const alteradoAte = !ultima && (!antes || antes.ate !== params.faixas[i].ate);
                const alteradoPontos = !antes || antes.pontos !== params.faixas[i].pontos;
                const anterior = i > 0 ? paraNumero(rascunho.faixas[i - 1].ate, true) : NaN;
                return (
                  <li key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-start gap-2 px-3 py-2" data-testid="faixa-de-pontos">
                    {ultima ? (
                      <span className="pt-1.5 text-sm font-semibold text-slate-700">{rascunho.faixas.length === 1 ? "Qualquer valor" : Number.isFinite(anterior) ? `Acima disso (mais de ${reaisCurto(anterior)})` : "Acima disso"}</span>
                    ) : (
                      <label className={caixaCampo(!!erros[`faixa.${i}.ate`], alteradoAte)}>
                        <span className="block text-[11px] font-semibold text-slate-600">Até R$</span>
                        <input aria-label={`Até R$ (faixa ${i + 1})`} inputMode="decimal" value={f.ate} onChange={(e) => mudarFaixa(i, "ate", e.target.value)} className={entrada} />
                        {erros[`faixa.${i}.ate`] ? <span className="mt-0.5 block text-[11px]">{msg(`faixa.${i}.ate`)}</span> : null}
                      </label>
                    )}
                    <label className={caixaCampo(!!erros[`faixa.${i}.pontos`], alteradoPontos)}>
                      <span className="block text-[11px] font-semibold text-slate-600">Pontos</span>
                      <input aria-label={`Pontos (faixa ${i + 1})`} inputMode="decimal" value={f.pontos} onChange={(e) => mudarFaixa(i, "pontos", e.target.value)} className={entrada} />
                      {erros[`faixa.${i}.pontos`] ? <span className="mt-0.5 block text-[11px]">{msg(`faixa.${i}.pontos`)}</span> : null}
                    </label>
                    <button type="button" aria-label={`Tirar faixa ${i + 1}`} title="Tirar esta faixa" disabled={rascunho.faixas.length <= 1} onClick={() => tirarFaixa(i)}
                      className="mt-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          <button type="button" onClick={novaFaixa} disabled={rascunho.faixas.length >= maxFaixas}
            className="mt-2 inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-800 ring-1 ring-slate-200 hover:ring-orange-300 disabled:opacity-40">
            <Plus className="h-3 w-3" />Nova faixa{rascunho.faixas.length >= maxFaixas ? ` (máximo ${maxFaixas})` : ""}
          </button>
        </div>

        {SECOES.map((s) => (
          <div key={s.titulo}>
            <p className="mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">{s.titulo}<Dica texto={s.dica} /></p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {s.comData ? (
                <label className={caixaCampo(!!erros.data, params.lancamento.previsto_para !== ativa.params.lancamento.previsto_para)}>
                  <span className="block text-xs font-semibold text-slate-800">Data prevista do lançamento</span>
                  <input aria-label="Data prevista do lançamento" type="date" value={rascunho.data} onChange={(e) => setRascunho((r) => (r ? { ...r, data: e.target.value } : r))} className={entrada} />
                  <span className="mt-0.5 block text-[11px] text-slate-400">{msg("data")}Conta os clientes fechados até este dia. Fábrica: {diaDoCampo(dado.padrao.lancamento.previsto_para)}.</span>
                </label>
              ) : null}
              {s.campos.map((c) => {
                const id = idDe(c);
                const alterado = (params[c.grupo] as Record<string, number>)[c.chave] !== (ativa.params[c.grupo] as Record<string, number>)[c.chave];
                return (
                  <label key={id} className={caixaCampo(!!erros[id], alterado)}>
                    <span className="block text-xs font-semibold text-slate-800">{c.rotulo}</span>
                    <input aria-label={c.rotulo} inputMode="decimal" value={rascunho.campos[id] ?? ""} onChange={(e) => mudarCampo(id, e.target.value)} className={entrada} />
                    <span className="mt-0.5 block text-[11px] text-slate-400">{msg(id)}{c.ajuda} Fábrica: {num((dado.padrao[c.grupo] as Record<string, number>)[c.chave])}.</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs text-slate-600">{mudou.length ? <>Mudanças: <b>{mudou.length}</b> ({mudou.join(", ")})</> : "Nada mudou ainda."}</p>
          <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={2} placeholder="Motivo da mudança (fica no histórico de versões)"
            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-orange-400" />
          {aviso ? <p role="status" className={cn("mt-2 rounded-lg px-3 py-1.5 text-xs font-semibold", aviso.ruim ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-800")}>{aviso.texto}</p> : null}
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" disabled={!mudou.length || salvando} onClick={() => setRascunho(rascunhoDe(ativa.params))}
              className="rounded-full px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40">Desfazer</button>
            <button type="button" disabled={!mudou.length || invalidos > 0 || motivo.trim().length < 3 || salvando} onClick={() => void salvar()}
              className="inline-flex items-center gap-1 rounded-full bg-orange-600 px-3.5 py-1.5 text-xs font-bold text-white disabled:opacity-40">
              {salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}Salvar como versão {(versoes[0]?.versao ?? 0) + 1}
            </button>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

/* ---------- profissionais ---------- */
function Chip({ tom, children }: { tom: "amber" | "emerald" | "rose" | "slate"; children: ReactNode }) {
  const cor = { amber: "bg-amber-50 text-amber-800 ring-amber-200", emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200", rose: "bg-rose-50 text-rose-700 ring-rose-200", slate: "bg-slate-100 text-slate-600 ring-slate-200" }[tom];
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ring-1", cor)}>{children}</span>;
}

/** "Começa em 50 · Fases: ... · Total 59,3%" */
export function SomaDaConta({ conta }: { conta: Conta }) {
  const { inicial, fases: f, lancamento: l, bonus, punicoes: p } = conta.partes;
  const pedacos = [
    `Começa em ${num(inicial)}`,
    `Fases: ${f.quantidade} ${f.quantidade === 1 ? "fase" : "fases"} = ${num(f.pontos)} pts × ${num(f.multiplicador_individual)} × ${num(f.multiplicador_geral)} = ${num(f.total)}`,
    `Lançamento: ${l.clientes} ${l.clientes === 1 ? "cliente" : "clientes"} = ${num(l.pontos)}`,
    `Bônus +${num(bonus)}`,
    `Punições −${num(Number(p.automaticas) + Number(p.manuais))}`,
  ];
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2" data-testid="soma-da-conta">
      <p className="text-sm text-slate-700">{pedacos.join(" · ")} · <b className="text-slate-950">Total {num(conta.valor)}%</b></p>
      <p className="mt-1 text-[11px] text-slate-400">
        Fases: pontos das faixas × multiplicador individual × multiplicador geral. Lançamento: clientes fechados até {diaDoCampo(l.previsto_para)}.
        {" "}Punições: {p.reclamacoes} {p.reclamacoes === 1 ? "reclamação" : "reclamações"} e {p.reembolsos} {p.reembolsos === 1 ? "reembolso" : "reembolsos"} (−{num(p.automaticas)} automáticas), −{num(p.manuais)} lançadas aqui. Teto: {num(conta.teto)}.
      </p>
    </div>
  );
}

function DetalheDoProfissional({ userId, aoMudar }: { userId: number; aoMudar: () => void }) {
  const { dado, erro, deNovo } = useApi<DetalheResposta>(`/admin/impulsionamento/profissionais/${userId}`);
  const [mult, setMult] = useState({ multiplicador: "1", valido_ate: "", motivo: "" });
  const [ajuste, setAjuste] = useState<{ tipo: "bonus" | "punicao"; pontos: string; valido_ate: string; motivo: string }>({ tipo: "bonus", pontos: "", valido_ate: "", motivo: "" });
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; ruim?: boolean } | null>(null);

  const individual = dado?.individual ?? null;
  useEffect(() => {
    if (!dado) return;
    setMult({ multiplicador: paraCampo(individual ? Number(individual.multiplicador) : 1), valido_ate: paraData(individual?.valido_ate), motivo: "" });
  }, [dado, individual]);

  if (erro) return <Erro msg={erro} />;
  if (!dado) return <Carregando />;

  const depois = (texto: string) => { setAviso({ texto }); deNovo(); aoMudar(); };
  const rodar = async (qual: string, fazer: () => Promise<unknown>, texto: string) => {
    setOcupado(qual); setAviso(null);
    try { await fazer(); depois(texto); return true; }
    catch (e: any) { setAviso({ texto: e.message, ruim: true }); return false; }
    finally { setOcupado(null); }
  };
  const salvarMult = () => {
    if (paraNumero(mult.multiplicador) === 0 && !window.confirm("Multiplicador 0 zera os pontos das fases deste profissional: o número dele fica só com o inicial, o lançamento e os bônus, menos as punições. Salvar?")) return;
    return rodar("mult", () => apiRequest("PUT", `/admin/impulsionamento/profissionais/${userId}/multiplicador`, {
    multiplicador: paraNumero(mult.multiplicador), valido_ate: mult.valido_ate, motivo: mult.motivo.trim(),
  }).then(ler), "Multiplicador salvo.");
  };
  const lancar = async () => {
    const ok = await rodar("ajuste", () => apiRequest("POST", `/admin/impulsionamento/profissionais/${userId}/ajustes`, {
      tipo: ajuste.tipo, pontos: paraNumero(ajuste.pontos), motivo: ajuste.motivo.trim(), valido_ate: ajuste.valido_ate,
    }).then(ler), ajuste.tipo === "bonus" ? "Bônus lançado." : "Punição lançada.");
    if (ok) setAjuste((a) => ({ ...a, pontos: "", valido_ate: "", motivo: "" }));
  };
  const revogar = (a: Ajuste) => {
    if (!window.confirm(`Revogar ${a.tipo === "bonus" ? "o bônus" : "a punição"} de ${num(a.pontos)} pontos? Fica no histórico como revogado.`)) return;
    void rodar(`rev-${a.id}`, () => apiRequest("DELETE", `/admin/impulsionamento/profissionais/${userId}/ajustes/${a.id}`).then(ler), "Revogado.");
  };

  const multN = paraNumero(mult.multiplicador);
  const multOk = Number.isFinite(multN) && multN >= 0 && multN <= 10 && mult.motivo.trim().length >= 3;
  const pontosN = paraNumero(ajuste.pontos);
  const ajusteOk = Number.isFinite(pontosN) && pontosN > 0 && pontosN <= 100 && ajuste.motivo.trim().length >= 3;
  const venceu = (iso: string | null) => !!iso && new Date(iso).getTime() < Date.now();

  return (
    <div className="space-y-4" data-testid="detalhe-do-profissional">
      <SomaDaConta conta={dado.conta} />
      {aviso ? <p role="status" className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold", aviso.ruim ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-800")}>{aviso.texto}</p> : null}

      <Bloco titulo="Multiplicador individual">
        <p className="mb-2 text-xs text-slate-500">
          {individual
            ? <>Hoje: <b className="text-slate-800">×{num(individual.multiplicador)}</b>{individual.valido_ate ? ` até ${diaBr(individual.valido_ate)}${venceu(individual.valido_ate) ? " (venceu)" : ""}` : " sem prazo"}{individual.motivo ? ` · ${individual.motivo}` : ""}{individual.atualizado_por ? ` · ${individual.atualizado_por}` : ""}</>
            : "Hoje: ×1 (normal). Multiplica só os pontos das fases deste profissional."}
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="block text-xs font-semibold text-slate-700">Multiplicador
            <input aria-label="Multiplicador" inputMode="decimal" value={mult.multiplicador} onChange={(e) => setMult((m) => ({ ...m, multiplicador: e.target.value }))} className={entrada} />
            <span className="block text-[11px] font-normal text-slate-400">De 0 a 10. 1 = normal.</span>
          </label>
          <label className="block text-xs font-semibold text-slate-700">Vale até
            <input aria-label="Multiplicador vale até" type="date" min={hoje()} value={mult.valido_ate} onChange={(e) => setMult((m) => ({ ...m, valido_ate: e.target.value }))} className={entrada} />
            <span className="block text-[11px] font-normal text-slate-400">Vazio = sem prazo.</span>
          </label>
          <label className="block text-xs font-semibold text-slate-700">Motivo
            <input aria-label="Motivo do multiplicador" value={mult.motivo} onChange={(e) => setMult((m) => ({ ...m, motivo: e.target.value }))} className={entrada} />
          </label>
        </div>
        <div className="mt-2 flex justify-end">
          <button type="button" disabled={!multOk || !!ocupado} onClick={() => void salvarMult()} className="inline-flex items-center gap-1 rounded-full bg-orange-600 px-3.5 py-1.5 text-xs font-bold text-white disabled:opacity-40">
            {ocupado === "mult" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}Salvar multiplicador
          </button>
        </div>
      </Bloco>

      <Bloco titulo="Bônus e punições">
        <div className="mb-2"><Alternador valor={ajuste.tipo} opcoes={[["bonus", "Dar bônus"], ["punicao", "Aplicar punição"]]} mudar={(tipo) => setAjuste((a) => ({ ...a, tipo }))} /></div>
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="block text-xs font-semibold text-slate-700">Pontos
            <input aria-label="Pontos do ajuste" inputMode="decimal" value={ajuste.pontos} onChange={(e) => setAjuste((a) => ({ ...a, pontos: e.target.value }))} className={entrada} />
            <span className="block text-[11px] font-normal text-slate-400">{ajuste.tipo === "bonus" ? "Soma ao número dele." : "Tira do número dele."} De 0,1 a 100.</span>
          </label>
          <label className="block text-xs font-semibold text-slate-700">Vale até
            <input aria-label="Ajuste vale até" type="date" min={hoje()} value={ajuste.valido_ate} onChange={(e) => setAjuste((a) => ({ ...a, valido_ate: e.target.value }))} className={entrada} />
            <span className="block text-[11px] font-normal text-slate-400">Vazio = sem prazo.</span>
          </label>
          <label className="block text-xs font-semibold text-slate-700">Motivo
            <input aria-label="Motivo do ajuste" value={ajuste.motivo} onChange={(e) => setAjuste((a) => ({ ...a, motivo: e.target.value }))} className={entrada} />
          </label>
        </div>
        <div className="mt-2 flex justify-end">
          <button type="button" disabled={!ajusteOk || !!ocupado} onClick={() => void lancar()}
            className={cn("inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-bold text-white disabled:opacity-40", ajuste.tipo === "bonus" ? "bg-emerald-600" : "bg-rose-600")}>
            {ocupado === "ajuste" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}{ajuste.tipo === "bonus" ? "Lançar bônus" : "Lançar punição"}
          </button>
        </div>

        {dado.ajustes.length ? (
          <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm">
            {dado.ajustes.map((a) => {
              const fora = !!a.revogado_em || venceu(a.valido_ate);
              return (
                <li key={a.id} className={cn("flex flex-wrap items-start gap-2 px-3 py-2", fora && "opacity-50")} data-testid="ajuste-do-profissional">
                  <span className="min-w-0 flex-1">
                    <b className={a.tipo === "bonus" ? "text-emerald-700" : "text-rose-700"}>{a.tipo === "bonus" ? `Bônus +${num(a.pontos)}` : `Punição −${num(a.pontos)}`}</b>
                    <span className="text-slate-600"> · {a.motivo || "sem motivo"}</span>
                    <span className="block text-xs text-slate-500">
                      {quando(a.created_at)} · {a.criado_por ?? "—"} · {a.valido_ate ? `até ${diaBr(a.valido_ate)}` : "sem prazo"}
                      {a.revogado_em ? ` · revogado em ${quando(a.revogado_em)} por ${a.revogado_por ?? "—"}` : venceu(a.valido_ate) ? " · venceu" : ""}
                    </span>
                  </span>
                  {!a.revogado_em ? (
                    <button type="button" disabled={!!ocupado} onClick={() => revogar(a)} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-800 ring-1 ring-slate-200 hover:ring-rose-300">
                      {ocupado === `rev-${a.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : "Revogar"}
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : <p className="mt-3 text-xs text-slate-400">Nenhum bônus ou punição lançado ainda.</p>}
      </Bloco>
    </div>
  );
}

export function ProfissionaisDoImpulsionamento() {
  const [busca, setBusca] = useState("");
  const [buscaFeita, setBuscaFeita] = useState("");
  useEffect(() => { const t = setTimeout(() => setBuscaFeita(busca.trim()), 350); return () => clearTimeout(t); }, [busca]);
  const { dado, erro, deNovo } = useApi<{ profissionais: LinhaProfissional[] }>(`/admin/impulsionamento/profissionais?busca=${encodeURIComponent(buscaFeita)}`);
  const [aberto, setAberto] = useState<LinhaProfissional | null>(null);

  const lista = dado?.profissionais ?? [];
  const janela: ConteudoJanela = aberto
    ? { titulo: aberto.nome, sub: [aberto.profissao, aberto.email, `#${aberto.user_id}`].filter(Boolean).join(" · "), corpo: <DetalheDoProfissional key={aberto.user_id} userId={aberto.user_id} aoMudar={deNovo} /> }
    : null;

  return (
    <SectionCard title="Profissionais" subtitle="O número de cada um, do maior para o menor. Clique para ver a conta e ajustar."
      dica="O número sobe com as fases aprovadas e o bônus do lançamento e cai com reclamações e reembolsos. Aqui dá para mudar o multiplicador de um profissional e lançar bônus ou punições à mão.">
      <label className="mb-3 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm">
        <Search className="h-4 w-4 text-slate-400" />
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar pelo nome, e-mail, profissão ou código" aria-label="Buscar profissional" className="w-full outline-none" />
      </label>
      {erro ? <Erro msg={erro} /> : !dado ? <Carregando /> : !lista.length ? <p className="text-sm text-slate-400">Nenhum profissional encontrado.</p> : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {lista.map((p) => (
            <li key={p.user_id}>
              <button type="button" onClick={() => setAberto(p)} data-testid="profissional-do-impulsionamento" className="flex w-full flex-wrap items-center gap-2 px-3 py-2 text-left hover:bg-slate-50">
                <span className="min-w-0 flex-1">
                  <b className="text-sm text-slate-900">{p.nome}</b>
                  <span className="block text-xs text-slate-500">{p.profissao || "Sem profissão"} · {p.fases} {p.fases === 1 ? "fase" : "fases"} · {p.clientes} {p.clientes === 1 ? "cliente" : "clientes"} no lançamento</span>
                </span>
                <span className="flex flex-wrap items-center gap-1">
                  {p.suspenso ? <Chip tom="slate">suspenso</Chip> : null}
                  {Number(p.multiplicador) !== 1 ? <Chip tom="amber">×{num(p.multiplicador)}</Chip> : null}
                  {Number(p.bonus) > 0 ? <Chip tom="emerald">+{num(p.bonus)} bônus</Chip> : null}
                  {Number(p.punicoes) > 0 ? <Chip tom="rose">−{num(p.punicoes)} punições</Chip> : null}
                </span>
                <span className="w-16 text-right text-base font-bold text-slate-950">{p.valor == null ? "—" : `${num(p.valor)}%`}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <Janela conteudo={janela} fechar={() => setAberto(null)} />
    </SectionCard>
  );
}

export function AdminImpulsionamentoSection() {
  return (
    <div className="mt-2 space-y-4">
      <RegrasDoImpulsionamento />
      <ProfissionaisDoImpulsionamento />
    </div>
  );
}
