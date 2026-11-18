import { useEffect, useState } from "react";
import { History, Loader2, RotateCcw, Save } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { SectionCard, StatusBadge } from "./AdminPrimitives";

/**
 * Ficha de cada IA do app, sem mexer em código (15/11/2026; completa em 18/11/2026).
 * Backend: GET /admin/ai-settings/ajustes, PUT /admin/ai-settings/ajustes/:tipo.
 * O que salva vale em até 30 s (o servidor guarda os ajustes em cache por meio minuto).
 *
 * A temperatura saiu: os modelos atuais recusam o campo e a IA parava. Quem regula o quanto
 * a IA pensa antes de responder é o esforço.
 */
type Ajuste = {
  ligada: boolean;
  instrucoes: string | null;
  extra: string | null;
  exemplos: string | null;
  modelo: string | null;
  esforco: string | null;
  max_tokens: number | null;
  limite_por_hora: number | null;
  teto_diario_usd: number | null;
};
type Versao = { instrucoes: string | null; extra: string | null; exemplos?: string | null; em: string | null; por: string | null };
type TipoDeIA = {
  tipo: string;
  nome: string;
  onde: string;
  padrao: string;
  padroes?: { esforco: string; max_tokens: number };
  ajuste: Ajuste;
  historico?: Versao[];
};

const MODELOS: [string, string][] = [
  ["", "O mesmo da chave (padrão)"],
  ["claude-sonnet-5-5", "Claude Sonnet 5.5 (recomendado)"],
  ["claude-haiku-5-5", "Claude Haiku 5.5"],
  ["claude-opus-5-5", "Claude Opus 5.5"],
];
const ESFORCOS: Record<string, string> = { low: "Baixo (mais rápido)", medium: "Médio", high: "Alto (pensa mais)" };

const ler = async (res: Response) => {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.message || "Não foi possível falar com o servidor.");
  return body;
};

const numeroOuNulo = (v: string) => (v.trim() === "" ? null : Number(v));
const quando = (iso: string | null) => (iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "data não registrada");

function CartaoDaIA({ ia, aoSalvar }: { ia: TipoDeIA; aoSalvar: (tipo: string, a: Ajuste) => Promise<void> }) {
  const [a, setA] = useState<Ajuste>({ ...ia.ajuste });
  const [instrucoes, setInstrucoes] = useState(ia.ajuste.instrucoes ?? ia.padrao);
  const [salvando, setSalvando] = useState(false);
  const [verVersoes, setVerVersoes] = useState(false);
  const proprias = instrucoes.trim() !== ia.padrao.trim();
  const campo = "mt-1 block w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100";
  const rotulo = "block text-sm font-medium text-slate-700";
  const padraoDoEsforco = ia.padroes?.esforco ? ESFORCOS[ia.padroes.esforco] : "da área";
  const salvar = async () => {
    setSalvando(true);
    try { await aoSalvar(ia.tipo, { ...a, instrucoes: proprias ? instrucoes : null }); } finally { setSalvando(false); }
  };
  const carregarVersao = (v: Versao) => {
    setInstrucoes(v.instrucoes ?? ia.padrao);
    setA({ ...a, extra: v.extra, exemplos: v.exemplos ?? null });
  };
  const versoes = ia.historico ?? [];
  return (
    <SectionCard
      title={ia.nome}
      subtitle={ia.onde}
      action={<StatusBadge label={!a.ligada ? "Desligada" : proprias || a.extra ? "Personalizada" : "Padrão"} tone={!a.ligada ? "slate" : proprias || a.extra ? "amber" : "emerald"} />}
    >
      <div className="grid gap-3 md:grid-cols-3">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" checked={a.ligada} onChange={(e) => setA({ ...a, ligada: e.target.checked })} />
          Ligada no app
        </label>
        <label className={rotulo}>
          Modelo
          <select value={a.modelo ?? ""} onChange={(e) => setA({ ...a, modelo: e.target.value || null })} className={`${campo} h-10`}>
            {MODELOS.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
          </select>
        </label>
        <label className={rotulo}>
          Esforço (quanto pensa antes de responder)
          <select aria-label="Esforço" value={a.esforco ?? ""} onChange={(e) => setA({ ...a, esforco: e.target.value || null })} className={`${campo} h-10`}>
            <option value="">Padrão da área ({padraoDoEsforco})</option>
            {Object.entries(ESFORCOS).map(([v, n]) => <option key={v} value={v}>{n}</option>)}
          </select>
        </label>
        <label className={rotulo}>
          Tamanho máximo da resposta (tokens)
          <input
            type="number" min={2000} max={32000} step={1000}
            placeholder={`Padrão: ${ia.padroes?.max_tokens ?? "da área"}`}
            value={a.max_tokens ?? ""}
            onChange={(e) => setA({ ...a, max_tokens: numeroOuNulo(e.target.value) })}
            className={`${campo} h-10`}
          />
        </label>
        <label className={rotulo}>
          Conversas por hora, por pessoa
          <input
            type="number" min={1} step={1} placeholder="Padrão: 120 (escrita do orçamento: 20)"
            value={a.limite_por_hora ?? ""}
            onChange={(e) => setA({ ...a, limite_por_hora: numeroOuNulo(e.target.value) })}
            className={`${campo} h-10`}
          />
        </label>
        <label className={rotulo}>
          Teto de gasto por dia (US$)
          <input
            type="number" min={0} step={0.5} placeholder="Sem teto"
            value={a.teto_diario_usd ?? ""}
            onChange={(e) => setA({ ...a, teto_diario_usd: numeroOuNulo(e.target.value) })}
            className={`${campo} h-10`}
          />
        </label>
      </div>
      <p className="mt-1 text-[11px] text-slate-500">
        O teto é em dólar porque a Anthropic cobra em dólar. Ao chegar nele, esta IA para até o dia seguinte e o app mostra um aviso.
      </p>
      <label className="mt-3 block text-sm font-medium text-slate-700">
        Instruções da IA {proprias ? <span className="text-amber-700">(alteradas)</span> : <span className="text-slate-400">(as do código)</span>}
        <textarea value={instrucoes} onChange={(e) => setInstrucoes(e.target.value)} rows={12} className={`${campo} py-2 font-mono text-xs leading-5`} />
      </label>
      <label className="mt-3 block text-sm font-medium text-slate-700">
        Acrescentar ao fim (opcional)
        <textarea
          value={a.extra ?? ""}
          onChange={(e) => setA({ ...a, extra: e.target.value || null })}
          rows={3}
          placeholder="Ex.: sempre sugira a vistoria antes de começar; use frases curtas."
          className={`${campo} py-2 text-sm`}
        />
      </label>
      <label className="mt-3 block text-sm font-medium text-slate-700">
        Exemplos de conversas boas (opcional)
        <textarea
          aria-label="Exemplos"
          value={a.exemplos ?? ""}
          onChange={(e) => setA({ ...a, exemplos: e.target.value || null })}
          rows={4}
          placeholder={"Cole 3 a 5 trechos de conversas que deram certo, por exemplo:\nCliente: quero trocar o piso da sala\nIA: Pelo que contou, é uma sala de uns 15 m². É isso? E o piso atual sai?"}
          className={`${campo} py-2 text-sm`}
        />
      </label>
      <p className="mt-2 text-[11px] text-slate-500">
        Mude o formato das respostas com cuidado: o app espera os mesmos campos. Para pequenos ajustes, prefira o campo de acrescentar.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={salvando} onClick={() => void salvar()} className="inline-flex h-10 items-center gap-2 rounded-lg bg-orange-600 px-3 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60">
          {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar
        </button>
        <button type="button" disabled={salvando || !proprias} onClick={() => setInstrucoes(ia.padrao)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
          <RotateCcw className="h-4 w-4" /> Voltar às instruções do código
        </button>
        <button type="button" disabled={!versoes.length} onClick={() => setVerVersoes(!verVersoes)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
          <History className="h-4 w-4" /> Versões anteriores ({versoes.length})
        </button>
      </div>
      {verVersoes && versoes.length ? (
        <ul className="mt-3 space-y-2">
          {versoes.map((v, i) => (
            <li key={`${v.em}-${i}`} className="rounded-lg border border-slate-200 p-3 text-xs text-slate-600">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>Salva em {quando(v.em)}{v.por ? ` por ${v.por}` : ""}</span>
                <button type="button" onClick={() => carregarVersao(v)} className="rounded-md border border-slate-200 px-2 py-1 font-semibold text-slate-700 hover:bg-slate-50">
                  Carregar esta versão
                </button>
              </div>
              <p className="mt-1 line-clamp-2">{v.instrucoes ? "Instruções próprias" : "Instruções do código"}{v.extra ? ` + acréscimo: ${v.extra}` : ""}{v.exemplos ? " + exemplos" : ""}</p>
            </li>
          ))}
          <li className="text-[11px] text-slate-500">Carregar só preenche o formulário: confira e toque em Salvar para valer.</li>
        </ul>
      ) : null}
    </SectionCard>
  );
}

export function AdminAiAjustesSection() {
  const [ias, setIas] = useState<TipoDeIA[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  useEffect(() => {
    let cancelado = false;
    apiRequest("GET", "/admin/ai-settings/ajustes").then(ler)
      .then((b) => { if (!cancelado) setIas(b.ajustes ?? []); })
      .catch((e) => { if (!cancelado) setErro(e.message); });
    return () => { cancelado = true; };
  }, []);
  const aoSalvar = async (tipo: string, ajuste: Ajuste) => {
    setAviso(null); setErro(null);
    try {
      await ler(await apiRequest("PUT", `/admin/ai-settings/ajustes/${tipo}`, ajuste));
      setAviso("Ajuste salvo. Vale no app em até 30 segundos.");
    } catch (e) {
      setErro((e as Error).message);
    }
  };
  if (!ias && !erro) return <div className="mt-4 flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando os ajustes da IA…</div>;
  return (
    <div className="mt-2 space-y-2">
      {erro ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p> : null}
      {aviso ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{aviso}</p> : null}
      {(ias ?? []).map((ia) => <CartaoDaIA key={ia.tipo} ia={ia} aoSalvar={aoSalvar} />)}
    </div>
  );
}
