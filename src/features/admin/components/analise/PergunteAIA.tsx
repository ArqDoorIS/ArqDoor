import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { SectionCard } from "../AdminPrimitives";
import { cn } from "../../utils";
import { Erro, ler, usd } from "./comum";

/**
 * PERGUNTE À IA (19/11/2026), no topo da aba Precisão da IA.
 *
 * O admin pergunta em texto livre e a IA responde só com os números da Análise (o servidor
 * monta um pacote sem dado pessoal; as pessoas vão pelo id). Antes de cada pergunta o painel
 * pede a prévia (sem IA) e mostra o custo numa confirmação, como no "Analisar com IA".
 * A conversa fica só nesta página. Backend: POST /admin/analise/perguntar.
 */

type Fala = { de: "admin" | "ia"; texto: string; fontes?: string[]; sabe?: boolean; custo_usd?: number };

export const SUGESTOES = [
  "Quais perfis fecham mais?",
  "Por que a liquidez caiu?",
  "Quem devo ligar hoje?",
  "Onde o funil do cliente mais perde gente?",
  "O algoritmo de match está acertando?",
  "Quanto as IAs gastaram este mês?",
];

/** Nomes de quem aparece na resposta (só no painel; a IA nunca recebe nome). */
const nomesConhecidos = new Map<number, string | null>();
async function buscarNome(id: number) {
  if (nomesConhecidos.has(id)) return nomesConhecidos.get(id) ?? null;
  try {
    const b = await apiRequest("GET", `/admin/analise/pessoas?busca=${id}`).then(ler);
    const p = (b?.pessoas ?? []).find((x: { id: number }) => x.id === id);
    nomesConhecidos.set(id, p?.nome ?? null);
    return p?.nome ?? null;
  } catch {
    return null;
  }
}
/** Os pedaços "PH #123" do texto, com a posição de cada um. */
function marcasPH(t: string) {
  const out: { id: number; inicio: number; fim: number }[] = [];
  const re = /PH\s*#(\d{1,10})/g;
  for (let m = re.exec(t); m; m = re.exec(t)) out.push({ id: Number(m[1]), inicio: m.index, fim: m.index + m[0].length });
  return out;
}
const idsDaResposta = (t: string) => Array.from(new Set(marcasPH(t).map((m) => m.id))).slice(0, 8);

/** O texto da IA com "PH #123" virando um botão (com o nome ao lado, se o painel souber). */
function TextoDaIA({ texto, investigar }: { texto: string; investigar?: (id: number) => void }) {
  const [nomes, setNomes] = useState<Record<number, string | null>>({});
  useEffect(() => {
    let vivo = true;
    for (const id of idsDaResposta(texto)) void buscarNome(id).then((n) => { if (vivo) setNomes((x) => ({ ...x, [id]: n })); });
    return () => { vivo = false; };
  }, [texto]);
  const partes: ReactNode[] = [];
  let ultimo = 0;
  for (const { id, inicio, fim } of marcasPH(texto)) {
    partes.push(texto.slice(ultimo, inicio));
    partes.push(
      <button key={`ph-${inicio}`} type="button" onClick={() => investigar?.(id)} title="Investigar esta pessoa"
        className="mx-0.5 inline-flex items-center rounded-md bg-blue-50 px-1.5 py-0.5 font-mono text-[11px] font-bold text-blue-700 ring-1 ring-blue-200">
        PH #{id}{nomes[id] ? <span className="ml-1 font-sans font-semibold">{nomes[id]}</span> : null}
      </button>,
    );
    ultimo = fim;
  }
  partes.push(texto.slice(ultimo));
  return <>{partes.map((p, i) => <Fragment key={i}>{p}</Fragment>)}</>;
}

export function PergunteAIA({ investigar }: { investigar?: (id: number) => void }) {
  const [falas, setFalas] = useState<Fala[]>([]);
  const [texto, setTexto] = useState("");
  const [estimativa, setEstimativa] = useState<number | null>(null);
  const [etapa, setEtapa] = useState<"livre" | "custo" | "pensando">("livre");
  const [erro, setErro] = useState<string | null>(null);
  const fim = useRef<HTMLDivElement>(null);

  // custo de uma pergunta, para mostrar antes de enviar (prévia: o servidor não chama a IA)
  useEffect(() => {
    let vivo = true;
    apiRequest("POST", "/admin/analise/perguntar", { pergunta: "estimativa de custo" }, undefined, 120000).then(ler)
      .then((b) => { if (vivo) setEstimativa(Number(b.custo_estimado_usd) || null); })
      .catch(() => {});
    return () => { vivo = false; };
  }, []);
  useEffect(() => { fim.current?.scrollIntoView?.({ block: "nearest" }); }, [falas.length, etapa]);

  const historico = () => falas.map(({ de, texto: t }) => ({ de, texto: t }));
  const enviar = async (pergunta = texto) => {
    const p = pergunta.trim();
    if (!p || etapa !== "livre") return;
    setErro(null); setEtapa("custo");
    try {
      const previa = await apiRequest("POST", "/admin/analise/perguntar", { pergunta: p, historico: historico() }, undefined, 120000).then(ler);
      const custo = Number(previa.custo_estimado_usd) || 0;
      setEstimativa(custo);
      if (!window.confirm(`Perguntar à IA agora? Custo estimado: ${usd(custo)}.\n\n"${p}"`)) { setEtapa("livre"); return; }
      setFalas((xs) => [...xs, { de: "admin", texto: p }]);
      setTexto(""); setEtapa("pensando");
      const r = await apiRequest("POST", "/admin/analise/perguntar", { pergunta: p, historico: historico(), confirmar: true }, undefined, 180000).then(ler);
      setFalas((xs) => [...xs, { de: "ia", texto: r.resposta, fontes: r.fontes ?? [], sabe: r.sabe !== false, custo_usd: Number(r.custo_usd) || 0 }]);
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setEtapa("livre");
    }
  };

  const ocupado = etapa !== "livre";
  const gasto = falas.reduce((s, f) => s + (f.custo_usd ?? 0), 0);
  return (
    <SectionCard title="Pergunte à IA" subtitle="Pergunte o que quiser sobre os números da Análise. A IA não recebe nome, e-mail nem telefone: as pessoas vão pelo código PH.">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {SUGESTOES.map((s) => (
            <button key={s} type="button" disabled={ocupado} onClick={() => setTexto(s)} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:border-orange-300 disabled:opacity-60">{s}</button>
          ))}
        </div>

        {falas.length ? (
          <div className="max-h-[460px] space-y-2 overflow-auto rounded-xl bg-slate-50 p-3" aria-label="Conversa com a IA">
            {falas.map((f, i) => (
              <div key={i} className={cn("max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm", f.de === "admin" ? "ml-auto bg-slate-900 text-white" : "bg-white text-slate-800 ring-1 ring-slate-200")}>
                <div className="mb-0.5 text-[10px] font-semibold opacity-70">{f.de === "admin" ? "Você" : "IA"}{f.de === "ia" && f.sabe === false ? " · não sabe" : ""}</div>
                {f.de === "ia" ? <TextoDaIA texto={f.texto} investigar={investigar} /> : f.texto}
                {f.de === "ia" ? (
                  <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[10px] text-slate-500">
                    {f.fontes?.length ? <>Usou: {f.fontes.map((x) => <span key={x} className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold">{x}</span>)}</> : null}
                    <span className="ml-auto">{usd(f.custo_usd)}</span>
                  </div>
                ) : null}
              </div>
            ))}
            {etapa === "pensando" ? <p className="inline-flex items-center gap-1.5 text-xs text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" />A IA está lendo os números…</p> : null}
            <div ref={fim} />
          </div>
        ) : null}

        {erro ? <Erro msg={erro} /> : null}

        <form onSubmit={(e) => { e.preventDefault(); void enviar(); }} className="flex items-end gap-2">
          <label className="flex-1">
            <span className="sr-only">Sua pergunta</span>
            <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={2} maxLength={1000} disabled={ocupado}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void enviar(); } }}
              placeholder="Ex.: quais perfis fecham mais? por que a liquidez caiu?"
              className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400 disabled:bg-slate-50" />
          </label>
          <button type="submit" disabled={ocupado || !texto.trim()} className="inline-flex items-center gap-1.5 rounded-full bg-orange-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-60">
            {ocupado ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}Perguntar{estimativa != null ? ` · ≈ ${usd(estimativa)}` : ""}
          </button>
        </form>
        <p className="flex items-center gap-1 text-[11px] text-slate-400"><Sparkles className="h-3 w-3" />Cada pergunta pede confirmação com o custo antes. A conversa fica só nesta página.{gasto ? ` Gasto nesta conversa: ${usd(gasto)}.` : ""}</p>
      </div>
    </SectionCard>
  );
}
