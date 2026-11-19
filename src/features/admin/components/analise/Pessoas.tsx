import React, { useEffect, useState } from "react";
import { Clock3, Flag, Hammer, Loader2, MapPin, Megaphone, Search, Sparkles, Target, User, Users } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { SectionCard } from "../AdminPrimitives";
import { cn } from "../../utils";
import { COR_TEMP, Carregando, Erro, EtiquetaPH, ICONE_CATEGORIA, ICONE_TEMP, Pilula, SeloTemp, haQuanto, ler, nomeCategoria, pct, pctNum, usd } from "./comum";
import type { PessoaDaLista, Temp } from "./tipos";

type Filtro = "todos" | "cliente" | "profissional" | Temp;

function CartaoDaPessoa({ p, abrir }: { p: PessoaDaLista; abrir: () => void }) {
  const IP = p.papel === "cliente" ? User : Hammer;
  const IC = (p.categoria && ICONE_CATEGORIA[p.categoria]) || User;
  const iniciais = (p.nome ?? "?").split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase();
  return (
    <button type="button" onClick={abrir} className="grid gap-2.5 rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-orange-300">
      <div className="flex items-center gap-2.5">
        <span className={cn("relative grid h-9 w-9 flex-none place-items-center rounded-full text-[13px] font-bold", p.papel === "cliente" ? "bg-orange-100 text-orange-800" : "bg-blue-100 text-blue-900")}>
          {iniciais}
          <i className="absolute -bottom-1 -right-1 grid h-[17px] w-[17px] place-items-center rounded-full bg-white ring-1 ring-slate-200"><IP className="h-2.5 w-2.5" /></i>
        </span>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-1"><b className="text-[14.5px] text-slate-950">{p.nome ?? `Conta ${p.id}`}</b><EtiquetaPH id={p.id} /></div>
        <SeloTemp t={p.temperatura} />
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1"><IP className="h-3.5 w-3.5 text-slate-400" />{p.papel}{p.profissao ? ` · ${p.profissao}` : ""}</span>
        {p.cidade ? <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-slate-400" />{p.cidade}{p.uf ? `/${p.uf}` : ""}</span> : null}
        {p.origem ? <span className="inline-flex items-center gap-1"><Megaphone className="h-3.5 w-3.5 text-slate-400" />{p.origem}</span> : null}
        <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5 text-slate-400" />último acesso {haQuanto(p.ultimo_acesso)}</span>
      </div>
      <div className="text-xs text-slate-500">
        <div className="flex items-center gap-1"><Target className="h-3.5 w-3.5 text-slate-400" />chance de fechar<b className="ml-auto text-[13px] text-slate-950">{pct(p.chance)}</b></div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"><i className={cn("block h-full rounded-full", p.temperatura ? COR_TEMP[p.temperatura].barra : "bg-slate-300")} style={{ width: `${pctNum(p.chance)}%` }} /></div>
      </div>
      {p.categoria ? <span className="inline-flex items-center gap-1 justify-self-start rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-700"><IC className="h-3.5 w-3.5 text-orange-500" />{nomeCategoria(p.categoria)}</span> : <span className="justify-self-start text-xs text-slate-400">ainda sem análise da IA</span>}
      {p.etapa ? <p className="flex items-start gap-1.5 border-t border-dashed border-slate-200 pt-2 text-[12.5px] text-slate-800"><Flag className="mt-0.5 h-3.5 w-3.5 flex-none text-orange-500" />{p.etapa}</p> : null}
    </button>
  );
}

export function AbaPessoas({ investigar }: { investigar: (id: number) => void }) {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busca, setBusca] = useState("");
  const [buscaFeita, setBuscaFeita] = useState("");
  const [pagina, setPagina] = useState(1);
  const [dados, setDados] = useState<{ total: number; pessoas: PessoaDaLista[] } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [lote, setLote] = useState<{ prontos: { id: number; nome: string; fatos: number; novos: number; custo_estimado_usd: number }[]; custo_estimado_usd: number } | null>(null);
  const [rodando, setRodando] = useState<string | null>(null);
  const [vez, setVez] = useState(0);

  useEffect(() => { const t = setTimeout(() => { setBuscaFeita(busca.trim().replace(/^#/, "")); setPagina(1); }, 350); return () => clearTimeout(t); }, [busca]);
  useEffect(() => {
    const q = new URLSearchParams({ pagina: String(pagina) });
    if (filtro === "cliente" || filtro === "profissional") q.set("papel", filtro);
    if (filtro === "quente" || filtro === "morno" || filtro === "frio") q.set("temperatura", filtro);
    if (buscaFeita) q.set("busca", buscaFeita);
    setDados(null); setErro(null);
    apiRequest("GET", `/admin/analise/pessoas?${q}`).then(ler).then(setDados).catch((e) => setErro(e.message));
  }, [filtro, buscaFeita, pagina, vez]);

  const papelDoFiltro = filtro === "cliente" || filtro === "profissional" ? filtro : undefined;
  const verLote = () => { setErro(null); setRodando("Procurando quem tem dado novo…"); apiRequest("POST", "/admin/analise/lote", { papel: papelDoFiltro }, undefined, 120000).then(ler).then(setLote).catch((e) => setErro(e.message)).finally(() => setRodando(null)); };
  // uma por vez, daqui do painel (cada análise leva perto de um minuto)
  const rodarLote = async () => {
    if (!lote?.prontos.length) return;
    if (!window.confirm(`Analisar ${lote.prontos.length} conta(s)? Custo estimado: ${usd(lote.custo_estimado_usd)}.`)) return;
    for (let i = 0; i < lote.prontos.length; i++) {
      const p = lote.prontos[i];
      setRodando(`Analisando ${i + 1} de ${lote.prontos.length}: ${p.nome}…`);
      try { await apiRequest("POST", `/admin/analise/pessoas/${p.id}/analisar`, { confirmar: true }, undefined, 180000).then(ler); }
      catch (e: any) { setErro(`${p.nome}: ${e.message}`); if (/teto|chave|limite/i.test(e.message)) break; }
    }
    setRodando(null); setLote(null); setVez((x) => x + 1);
  };

  const FILTROS: [Filtro, string, React.ComponentType<{ className?: string }>][] = [["todos", "Todos", Users], ["cliente", "Clientes", User], ["profissional", "Profissionais", Hammer], ["quente", "Quentes", ICONE_TEMP.quente], ["morno", "Mornos", ICONE_TEMP.morno], ["frio", "Frios", ICONE_TEMP.frio]];
  return (
    <SectionCard
      title="Pessoas"
      subtitle="Todo mundo com conta. O código PH é o mesmo da pessoa no PostHog: dá para buscar por ele."
      action={<button type="button" onClick={verLote} className="inline-flex items-center gap-1 rounded-full bg-orange-600 px-3 py-1.5 text-xs font-bold text-white"><Sparkles className="h-3.5 w-3.5" />Analisar quem tem dado novo</button>}
    >
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">{FILTROS.map(([f, r, I]) => <Pilula key={f} ativo={filtro === f} onClick={() => { setFiltro(f); setPagina(1); }}><I className="h-3.5 w-3.5" />{r}</Pilula>)}</div>
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm focus-within:border-orange-300">
          <Search className="h-4 w-4 text-slate-400" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar pelo nome ou pelo código do PostHog (ex.: 1043)" className="w-full outline-none" />
        </label>
        {rodando ? <p className="flex items-center gap-2 text-sm text-slate-600"><Loader2 className="h-4 w-4 animate-spin" />{rodando}</p> : null}
        {erro ? <Erro msg={erro} /> : null}
        {lote ? (
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm">
            {!lote.prontos.length ? <p>Ninguém com dado novo suficiente agora. Nada foi gasto.</p> : (
              <>
                <p><b>{lote.prontos.length}</b> conta(s) com dado novo suficiente · custo estimado <b>{usd(lote.custo_estimado_usd)}</b></p>
                <ul className="mt-1 text-xs text-slate-600">{lote.prontos.map((p) => <li key={p.id}>{p.nome} · {p.fatos} fatos ({p.novos} novos) · {usd(p.custo_estimado_usd)}</li>)}</ul>
                <div className="mt-2 flex gap-2"><button type="button" onClick={() => void rodarLote()} className="rounded-full bg-orange-600 px-3 py-1.5 text-xs font-bold text-white">Analisar estas</button><button type="button" onClick={() => setLote(null)} className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold">Cancelar</button></div>
              </>
            )}
          </div>
        ) : null}
        {!dados ? (erro ? null : <Carregando />) : !dados.pessoas?.length ? <p className="text-sm text-slate-500">Ninguém com esse filtro.</p> : (
          <>
            <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(270px,1fr))]">
              {dados.pessoas.map((p) => <CartaoDaPessoa key={p.id} p={p} abrir={() => investigar(p.id)} />)}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <button type="button" disabled={pagina <= 1} onClick={() => setPagina((x) => x - 1)} className="rounded-full border px-3 py-1 disabled:opacity-40">Anterior</button>
              <span>Página {pagina} · {dados.total} pessoa(s)</span>
              <button type="button" disabled={pagina * 25 >= dados.total} onClick={() => setPagina((x) => x + 1)} className="rounded-full border px-3 py-1 disabled:opacity-40">Próxima</button>
            </div>
          </>
        )}
      </div>
    </SectionCard>
  );
}
