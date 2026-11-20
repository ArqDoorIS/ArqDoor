import { useEffect, useMemo, useState } from "react";
import { History, Loader2, RotateCcw, Save } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Dica, SectionCard } from "../AdminPrimitives";
import { cn } from "../../utils";
import { Carregando, Erro, ler, quando, useApi } from "./comum";

/**
 * Regras do algoritmo de match editáveis (19/11/2026). Cada mudança vira uma versão nova, com
 * motivo; a mais nova vale para as listas criadas daqui em diante (as antigas guardam a
 * versão com que foram feitas). "Voltar para esta" cria uma versão nova igual a uma antiga.
 *
 *   GET  /admin/algoritmo/config
 *   PUT  /admin/algoritmo/config              { params, motivo }
 *   POST /admin/algoritmo/config/restaurar    { versao, motivo }
 */
type Grupo = "palpite" | "intencao" | "regras";
type Params = { palpite: Record<string, number>; intencao: Record<string, number>; regras: Record<string, number | boolean> };
type Versao = { versao: number; params: Params; motivo: string | null; criado_por: string | null; criado_em: string | null };
type Resposta = { ativa: Versao; padrao: Params; limites: Record<Grupo, Record<string, [number, number]>>; versoes: Versao[] };

type Campo = { grupo: Grupo; chave: string; rotulo: string; ajuda: string };
const SECOES: { titulo: string; dica: string; campos: Campo[] }[] = [
  {
    titulo: "Quem entra e quantos",
    dica: "Os filtros e o tamanho da lista. Quem não passa no filtro nunca é sugerido nem ganha percentual.",
    campos: [
      { grupo: "regras", chave: "raio_padrao_km", rotulo: "Raio padrão (km)", ajuda: "Até onde vai quem não definiu o próprio raio de atendimento." },
      { grupo: "regras", chave: "max_sugestoes", rotulo: "Profissionais na lista", ajuda: "Quantos aparecem para o cliente, somando os dois grupos." },
      { grupo: "regras", chave: "por_grupo", rotulo: "No grupo \"os que mais combinam\"", ajuda: "Os primeiros da lista; o resto vai para \"outras opções\"." },
      { grupo: "regras", chave: "limite_chamados", rotulo: "Chamados de uma vez", ajuda: "Quantos o cliente chama ao mesmo tempo, esperando resposta." },
      { grupo: "regras", chave: "max_chamadas_semana", rotulo: "Chamadas por semana (por profissional)", ajuda: "A partir daqui ele fica \"lotado\" e sai das listas por 7 dias." },
    ],
  },
  {
    titulo: "Percentual que o cliente vê",
    dica: "A nota real (1 a 99) é esticada para esta faixa. A ordem nunca muda: quem mais combina continua em cima.",
    campos: [
      { grupo: "regras", chave: "piso_cliente", rotulo: "Mínimo mostrado (%)", ajuda: "O que vê quem combina menos entre os que passaram." },
      { grupo: "regras", chave: "teto_cliente", rotulo: "Máximo mostrado (%)", ajuda: "O que vê o melhor encaixe possível." },
    ],
  },
  {
    titulo: "Pesos do encaixe",
    dica: "Cada profissional começa com 1 e é multiplicado por estes pesos. O resultado decide a ordem e o percentual. Acima de 1 ajuda, abaixo de 1 atrapalha.",
    campos: [
      { grupo: "palpite", chave: "esp1", rotulo: "Profissão principal do pedido", ajuda: "Tem a primeira profissão do pedido no cadastro." },
      { grupo: "palpite", chave: "esp2", rotulo: "Outra profissão do pedido", ajuda: "Tem uma das outras profissões do pedido." },
      { grupo: "palpite", chave: "esp3", rotulo: "Só os serviços do perfil batem", ajuda: "A profissão não bate, mas os serviços que ele descreveu sim." },
      { grupo: "palpite", chave: "fora_area", rotulo: "Fora da área", ajuda: "Não acontece entre os que passam no filtro; fica para a chance do painel." },
      { grupo: "palpite", chave: "evita", rotulo: "Marcou que não faz o serviço", ajuda: "O \"não faço\" do perfil dele cruza com o pedido." },
      { grupo: "palpite", chave: "fora_raio", rotulo: "Fora do raio dele", ajuda: "O pedido fica além do raio que ele atende." },
      { grupo: "palpite", chave: "preco_alto", rotulo: "Preço mínimo alto", ajuda: "O preço mínimo dele passa do limite abaixo." },
      { grupo: "palpite", chave: "preco_limite", rotulo: "Limite do preço (vezes o orçamento)", ajuda: "Ex.: 1,4 = o mínimo dele passa de 1,4 vez o que o cliente pode pagar." },
      { grupo: "palpite", chave: "nota_k", rotulo: "Força da nota", ajuda: "Cada ponto de nota acima de 4,25 multiplica por e^força (1,5 ≈ ×4,5 por ponto). 0 = nota não conta." },
      { grupo: "palpite", chave: "dist_k", rotulo: "Peso da distância (por km)", ajuda: "0,03 = perde cerca de 3% por km. 0 = distância não conta." },
      { grupo: "palpite", chave: "selo", rotulo: "Selo de verificado", ajuda: "Quem passou pela verificação de documentos." },
      { grupo: "palpite", chave: "base", rotulo: "Chance base (só o painel)", ajuda: "Ponto de partida da chance de fechar; não muda a ordem nem o percentual." },
    ],
  },
  {
    titulo: "Intenção do cliente (só a chance do painel)",
    dica: "Vale igual para todos os profissionais do mesmo pedido: muda a chance de fechar que o painel mostra, não a ordem nem o percentual. Os sinais da conversa só entram com a chave ligada.",
    campos: [
      { grupo: "intencao", chave: "estagio0", rotulo: "Só pesquisando", ajuda: "" },
      { grupo: "intencao", chave: "estagio1", rotulo: "Comparando", ajuda: "" },
      { grupo: "intencao", chave: "estagio2", rotulo: "Decidido", ajuda: "" },
      { grupo: "intencao", chave: "so_orcando", rotulo: "Só orçando", ajuda: "" },
      { grupo: "intencao", chave: "cartao", rotulo: "Tem pagamento salvo", ajuda: "" },
      { grupo: "intencao", chave: "data_sim", rotulo: "Confirmou a data", ajuda: "" },
      { grupo: "intencao", chave: "data_nao", rotulo: "Não confirmou a data", ajuda: "" },
      { grupo: "intencao", chave: "limite_ok", rotulo: "Orçamento cobre a faixa", ajuda: "" },
      { grupo: "intencao", chave: "limite_baixo", rotulo: "Orçamento abaixo da faixa", ajuda: "" },
      { grupo: "intencao", chave: "corte_fraco", rotulo: "Corte de intenção fraca", ajuda: "Abaixo disto o painel chama a intenção de fraca." },
    ],
  },
];

const fmt = (v: unknown) => (typeof v === "number" ? v.toLocaleString("pt-BR", { maximumFractionDigits: 4 }) : String(v));
const paraNumero = (s: string) => Number(String(s).replace(/\s/g, "").replace(",", "."));

/** Quantos números mudaram entre duas versões. */
const diferencas = (a: Params, b: Params) =>
  (["palpite", "intencao", "regras"] as Grupo[]).flatMap((g) => Object.keys(a[g] || {}).filter((k) => a[g][k] !== b[g]?.[k]).map((k) => `${g}.${k}`));

export function RegrasDoAlgoritmo() {
  const { dado, erro, deNovo } = useApi<Resposta>("/admin/algoritmo/config");
  const [rascunho, setRascunho] = useState<Record<string, string>>({});
  const [sinais, setSinais] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; ruim?: boolean } | null>(null);
  const [verVersoes, setVerVersoes] = useState(false);

  const ativa = dado?.ativa;
  useEffect(() => {
    if (!ativa) return;
    const r: Record<string, string> = {};
    for (const s of SECOES) for (const c of s.campos) r[`${c.grupo}.${c.chave}`] = fmt(ativa.params[c.grupo][c.chave]);
    setRascunho(r);
    setSinais(Boolean(ativa.params.regras.usar_sinais_na_chance));
  }, [ativa]);

  const montado = useMemo<Params | null>(() => {
    if (!ativa) return null;
    const p: Params = JSON.parse(JSON.stringify(ativa.params));
    for (const s of SECOES) for (const c of s.campos) {
      const n = paraNumero(rascunho[`${c.grupo}.${c.chave}`] ?? "");
      if (Number.isFinite(n)) (p[c.grupo] as Record<string, number | boolean>)[c.chave] = n;
    }
    p.regras.usar_sinais_na_chance = sinais;
    return p;
  }, [ativa, rascunho, sinais]);

  if (erro) return <SectionCard title="Regras do algoritmo"><Erro msg={erro} /></SectionCard>;
  if (!dado || !ativa || !montado || !dado.padrao || !dado.limites) return <SectionCard title="Regras do algoritmo"><Carregando /></SectionCard>;
  const versoes = Array.isArray(dado.versoes) ? dado.versoes : [];

  const mudou = diferencas(ativa.params, montado);
  const foraDoLimite = (c: Campo) => {
    const [min, max] = dado.limites[c.grupo]?.[c.chave] ?? [-Infinity, Infinity];
    const n = paraNumero(rascunho[`${c.grupo}.${c.chave}`] ?? "");
    return !Number.isFinite(n) || n < min || n > max ? `entre ${fmt(min)} e ${fmt(max)}` : null;
  };
  const invalidos = SECOES.flatMap((s) => s.campos).filter(foraDoLimite);

  const salvar = async () => {
    setSalvando(true); setAviso(null);
    try {
      const r = (await apiRequest("PUT", "/admin/algoritmo/config", { params: montado, motivo: motivo.trim() }).then(ler)) as { versao: number };
      setAviso({ texto: `Salvo como versão ${r.versao}. Vale para as listas criadas daqui em diante.` });
      setMotivo("");
      deNovo();
    } catch (e: any) { setAviso({ texto: e.message, ruim: true }); } finally { setSalvando(false); }
  };
  const restaurar = async (versao: number) => {
    if (!window.confirm(versao === 0 ? "Voltar às regras de fábrica? Vira uma versão nova." : `Voltar às regras da versão ${versao}? Vira uma versão nova.`)) return;
    setSalvando(true); setAviso(null);
    try {
      const r = (await apiRequest("POST", "/admin/algoritmo/config/restaurar", { versao }).then(ler)) as { versao: number };
      setAviso({ texto: `Pronto: a versão ${r.versao} repete as regras da ${versao === 0 ? "fábrica" : `versão ${versao}`}.` });
      deNovo();
    } catch (e: any) { setAviso({ texto: e.message, ruim: true }); } finally { setSalvando(false); }
  };

  return (
    <SectionCard title="Regras do algoritmo" subtitle={`Em vigor: ${ativa.versao === 0 ? "regras de fábrica" : `versão ${ativa.versao}`}${ativa.criado_em ? ` · ${quando(ativa.criado_em)}` : ""}${ativa.criado_por ? ` · ${ativa.criado_por}` : ""}`}
      dica="Tudo o que o algoritmo usa para montar a lista e dar o percentual. Cada mudança vira uma versão nova com motivo, e cada lista guarda a versão com que foi feita. Mudanças valem para as listas criadas depois de salvar."
      action={<button type="button" onClick={() => setVerVersoes((v) => !v)} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700"><History className="h-3.5 w-3.5" />{verVersoes ? "Fechar versões" : `Versões (${versoes.length})`}</button>}>
      <div className="space-y-4" data-testid="regras-do-algoritmo">
        {verVersoes ? (
          <div className="rounded-xl border border-slate-200">
            <ul className="max-h-72 divide-y divide-slate-100 overflow-auto text-sm">
              {versoes.map((v, i) => {
                const anterior = versoes[i + 1]?.params ?? dado.padrao;
                const d = diferencas(anterior, v.params);
                return (
                  <li key={v.versao} className="flex flex-wrap items-start gap-2 px-3 py-2" data-testid="versao-do-algoritmo">
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
                <span className="flex-1 text-xs text-slate-500"><b className="text-slate-900">Regras de fábrica</b> · as do lançamento (Kirios Alpha 1.1)</span>
                {ativa.versao !== 0 ? <button type="button" disabled={salvando} onClick={() => void restaurar(0)} className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-800 ring-1 ring-slate-200 hover:ring-orange-300"><RotateCcw className="h-3 w-3" />Voltar às de fábrica</button> : null}
              </li>
            </ul>
          </div>
        ) : null}

        {SECOES.map((s) => (
          <div key={s.titulo}>
            <p className="mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">{s.titulo}<Dica texto={s.dica} /></p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {s.campos.map((c) => {
                const id = `${c.grupo}.${c.chave}`;
                const fabrica = dado.padrao[c.grupo][c.chave];
                const alterado = montado[c.grupo][c.chave] !== ativa.params[c.grupo][c.chave];
                const ruim = foraDoLimite(c);
                return (
                  <label key={id} className={cn("block rounded-xl border px-3 py-2", ruim ? "border-rose-300 bg-rose-50/40" : alterado ? "border-orange-300 bg-orange-50/40" : "border-slate-200")}>
                    <span className="block text-xs font-semibold text-slate-800">{c.rotulo}</span>
                    <input aria-label={c.rotulo} inputMode="decimal" value={rascunho[id] ?? ""} onChange={(e) => setRascunho((r) => ({ ...r, [id]: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm font-semibold outline-none focus:border-orange-400" />
                    <span className="mt-0.5 block text-[11px] text-slate-400">{ruim ? <b className="text-rose-700">Precisa ficar {ruim}. </b> : null}{c.ajuda} Fábrica: {fmt(fabrica)}.</span>
                  </label>
                );
              })}
            </div>
            {s.titulo.startsWith("Intenção") ? (
              <label className="mt-2 flex items-center gap-2 text-xs font-semibold text-slate-700">
                <input type="checkbox" checked={sinais} onChange={(e) => setSinais(e.target.checked)} />
                Usar os sinais da conversa com a IA na chance (deixe desligado até a auditoria dar 90% de acerto)
              </label>
            ) : null}
          </div>
        ))}

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs text-slate-600">{mudou.length ? <>Mudanças: <b>{mudou.length}</b> ({mudou.join(", ")})</> : "Nada mudou ainda."}</p>
          <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={2} placeholder="Motivo da mudança (fica no histórico de versões)"
            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-orange-400" />
          {aviso ? <p role="status" className={cn("mt-2 rounded-lg px-3 py-1.5 text-xs font-semibold", aviso.ruim ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-800")}>{aviso.texto}</p> : null}
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" disabled={!mudou.length || salvando} onClick={() => { const r: Record<string, string> = {}; for (const s of SECOES) for (const c of s.campos) r[`${c.grupo}.${c.chave}`] = fmt(ativa.params[c.grupo][c.chave]); setRascunho(r); setSinais(Boolean(ativa.params.regras.usar_sinais_na_chance)); }}
              className="rounded-full px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40">Desfazer</button>
            <button type="button" disabled={!mudou.length || invalidos.length > 0 || motivo.trim().length < 3 || salvando} onClick={() => void salvar()}
              className="inline-flex items-center gap-1 rounded-full bg-orange-600 px-3.5 py-1.5 text-xs font-bold text-white disabled:opacity-40">
              {salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}Salvar como versão {(versoes[0]?.versao ?? 0) + 1}
            </button>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
