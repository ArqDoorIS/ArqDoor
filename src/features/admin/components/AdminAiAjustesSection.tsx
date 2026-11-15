import { useEffect, useState } from "react";
import { Loader2, RotateCcw, Save } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { SectionCard, StatusBadge } from "./AdminPrimitives";

/**
 * Ajustes de cada IA do app, sem mexer em código (15/11/2026).
 * Backend: GET /admin/ai-settings/ajustes, PUT /admin/ai-settings/ajustes/:tipo.
 * O que salva vale em até 30 s (o servidor guarda os ajustes em cache por meio minuto).
 */
type Ajuste = { ligada: boolean; instrucoes: string | null; extra: string | null; modelo: string | null; temperatura: number | null };
type TipoDeIA = { tipo: string; nome: string; onde: string; padrao: string; ajuste: Ajuste };

const MODELOS: [string, string][] = [
  ["", "O mesmo da chave (padrão)"],
  ["claude-sonnet-5-5", "Claude Sonnet 5.5"],
  ["claude-haiku-5-5", "Claude Haiku 5.5 (mais barato e rápido)"],
  ["claude-opus-5-5", "Claude Opus 5.5 (mais caro)"],
];

const ler = async (res: Response) => {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.message || "Não foi possível falar com o servidor.");
  return body;
};

function CartaoDaIA({ ia, aoSalvar }: { ia: TipoDeIA; aoSalvar: (tipo: string, a: Ajuste) => Promise<void> }) {
  const [a, setA] = useState<Ajuste>(ia.ajuste);
  const [instrucoes, setInstrucoes] = useState(ia.ajuste.instrucoes ?? ia.padrao);
  const [salvando, setSalvando] = useState(false);
  const proprias = instrucoes.trim() !== ia.padrao.trim();
  const campo = "mt-1 block w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100";
  const salvar = async () => {
    setSalvando(true);
    try { await aoSalvar(ia.tipo, { ...a, instrucoes: proprias ? instrucoes : null }); } finally { setSalvando(false); }
  };
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
        <label className="block text-sm font-medium text-slate-700">
          Modelo
          <select value={a.modelo ?? ""} onChange={(e) => setA({ ...a, modelo: e.target.value || null })} className={`${campo} h-10`}>
            {MODELOS.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Criatividade (temperatura, 0 a 1)
          <input
            type="number" min={0} max={1} step={0.1} placeholder="Padrão do modelo"
            value={a.temperatura ?? ""}
            onChange={(e) => setA({ ...a, temperatura: e.target.value === "" ? null : Number(e.target.value) })}
            className={`${campo} h-10`}
          />
        </label>
      </div>
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
      </div>
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
