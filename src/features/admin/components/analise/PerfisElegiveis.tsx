import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Loader2, Search } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { SectionCard } from "../AdminPrimitives";
import { cn } from "../../utils";
import { Carregando, Erro, EtiquetaPH, ler, useApi } from "./comum";

/**
 * Perfis elegíveis para o match (19/11/2026): o admin escolhe quais profissionais entram nas
 * sugestões do pedido e ganham o percentual de compatibilidade no app. Todos começam marcados.
 *
 *   GET   /admin/algoritmo/elegiveis
 *   PATCH /admin/algoritmo/elegiveis   { ids, elegivel }
 */
export type PerfilElegivel = {
  user_id: number;
  nome: string;
  profissao: string | null;
  profissoes_reconhecidas: string[];
  cidade: string | null;
  verificado: boolean;
  perfil_publico: boolean;
  suspenso: boolean;
  tem_perfil_de_demanda: boolean;
  nota: number | null;
  avaliacoes: number;
  elegivel: boolean;
};

type Filtro = "todos" | "elegiveis" | "fora" | "sem_profissao";
const FILTROS: [Filtro, string][] = [["todos", "Todos"], ["elegiveis", "Elegíveis"], ["fora", "Fora do match"], ["sem_profissao", "Sem profissão reconhecida"]];

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function PerfisElegiveis() {
  const { dado, erro } = useApi<{ profissionais: PerfilElegivel[] }>("/admin/algoritmo/elegiveis");
  const [lista, setLista] = useState<PerfilElegivel[]>([]);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; ruim?: boolean } | null>(null);
  useEffect(() => { if (dado) setLista(Array.isArray(dado.profissionais) ? dado.profissionais : []); }, [dado]);

  const visiveis = useMemo(() => {
    const q = semAcento(busca.trim());
    return lista.filter((p) => {
      if (filtro === "elegiveis" && !p.elegivel) return false;
      if (filtro === "fora" && p.elegivel) return false;
      if (filtro === "sem_profissao" && p.profissoes_reconhecidas.length) return false;
      if (!q) return true;
      return semAcento([p.nome, p.profissao ?? "", p.cidade ?? "", ...p.profissoes_reconhecidas].join(" ")).includes(q);
    });
  }, [lista, busca, filtro]);

  const marcar = async (ids: number[], elegivel: boolean) => {
    if (!ids.length) return;
    const antes = lista;
    setLista((l) => l.map((p) => (ids.includes(p.user_id) ? { ...p, elegivel } : p)));
    setSalvando(true); setAviso(null);
    try {
      await apiRequest("PATCH", "/admin/algoritmo/elegiveis", { ids, elegivel }).then(ler);
      setAviso({ texto: ids.length === 1 ? (elegivel ? "Entrou no match." : "Saiu do match.") : `${ids.length} perfis ${elegivel ? "entraram no" : "saíram do"} match.` });
    } catch (e: any) {
      setLista(antes);
      setAviso({ texto: e.message, ruim: true });
    } finally { setSalvando(false); }
  };

  const elegiveis = lista.filter((p) => p.elegivel).length;
  return (
    <SectionCard title="Perfis elegíveis" subtitle="Quem entra no match: as sugestões do pedido e o percentual de compatibilidade no app"
      dica="Só os profissionais marcados aqui são sugeridos ao cliente e ganham o percentual. Mesmo marcado, ele precisa ter uma profissão que o algoritmo reconhece, perfil público e conta ativa. O percentual mostrado no app fica sempre entre 80% e 98%, na ordem de quem mais combina.">
      {erro ? <Erro msg={erro} /> : !dado ? <Carregando /> : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, profissão ou cidade" aria-label="Buscar profissional"
                className="w-full bg-transparent text-sm outline-none" />
            </label>
            <span className="text-xs text-slate-500" data-testid="contagem-elegiveis"><b className="text-slate-900">{elegiveis}</b> de {lista.length} elegíveis</span>
            {salvando ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" aria-label="Salvando" /> : null}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {FILTROS.map(([f, r]) => (
              <button key={f} type="button" onClick={() => setFiltro(f)}
                className={cn("rounded-full px-2.5 py-1 text-xs font-bold", filtro === f ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700")}>{r}</button>
            ))}
            <span className="ml-auto" />
            <button type="button" disabled={salvando || !visiveis.some((p) => !p.elegivel)} onClick={() => void marcar(visiveis.filter((p) => !p.elegivel).map((p) => p.user_id), true)}
              className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-800 ring-1 ring-slate-200 hover:ring-orange-300 disabled:opacity-40">Marcar os da lista</button>
            <button type="button" disabled={salvando || !visiveis.some((p) => p.elegivel)} onClick={() => void marcar(visiveis.filter((p) => p.elegivel).map((p) => p.user_id), false)}
              className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50 disabled:opacity-40">Tirar os da lista</button>
          </div>
          {aviso ? <p role="status" className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold", aviso.ruim ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-800")}>{aviso.texto}</p> : null}
          {!visiveis.length ? <p className="text-sm text-slate-500">Ninguém nesta lista.</p> : (
            <ul className="max-h-[480px] divide-y divide-slate-100 overflow-auto rounded-xl border border-slate-200">
              {visiveis.map((p) => {
                const avisoDoPerfil = !p.profissoes_reconhecidas.length ? "sem profissão reconhecida: nunca é sugerido"
                  : p.suspenso ? "conta suspensa" : !p.perfil_publico ? "perfil oculto" : null;
                return (
                  <li key={p.user_id} data-testid="perfil-elegivel">
                    <label className="flex cursor-pointer items-start gap-3 px-3 py-2 hover:bg-slate-50">
                      <input type="checkbox" className="mt-1 h-4 w-4 accent-orange-600" checked={p.elegivel} disabled={salvando}
                        onChange={(e) => void marcar([p.user_id], e.target.checked)} aria-label={`${p.nome} no match`} />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <b className="text-sm text-slate-900">{p.nome}</b>
                          <EtiquetaPH id={p.user_id} leve />
                          {p.verificado ? <BadgeCheck className="h-3.5 w-3.5 text-sky-600" aria-label="verificado" /> : null}
                          {p.nota != null ? <span className="text-xs text-slate-500">★ {p.nota.toLocaleString("pt-BR")} ({p.avaliacoes})</span> : null}
                        </span>
                        <span className="block text-xs text-slate-500">{[p.profissao ?? "sem profissão", p.cidade].filter(Boolean).join(" · ")}</span>
                        {p.profissoes_reconhecidas.length ? (
                          <span className="mt-0.5 flex flex-wrap gap-1">{p.profissoes_reconhecidas.map((r) => <span key={r} className="rounded bg-slate-100 px-1.5 text-[11px] text-slate-600">{r}</span>)}</span>
                        ) : null}
                        {avisoDoPerfil ? <span className="mt-0.5 block text-[11px] font-semibold text-amber-700">{avisoDoPerfil}</span> : null}
                      </span>
                      <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold", p.elegivel ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500")}>{p.elegivel ? "no match" : "fora"}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </SectionCard>
  );
}
