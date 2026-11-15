import { useEffect, useState } from "react";
import { ChevronLeft, Loader2, Save, Search } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { SectionCard, StatusBadge } from "./AdminPrimitives";
import { AdminAiConversasSection } from "./AdminAiConversasSection";

/**
 * Aba "Erros" (15/11/2026): o que deu errado na plataforma, sozinho. O app manda os erros
 * inesperados (com a tela, a versão, o aparelho, a conta e a trilha dos últimos passos) e
 * a API registra os próprios erros 500. Erros iguais aparecem uma vez, com o número de
 * ocorrências. Backend: GET/PATCH /admin/erros.
 */
type Status = "novo" | "investigando" | "resolvido";
type Linha = { id: number; origem: string; tipo: string; mensagem: string; rota: string | null; ocorrencias: number; pessoas: number; versoes: string[] | null; status: Status; primeira_em: string; ultima_em: string };
type Passo = { em: string; tipo: string; texto: string };
type Contexto = { em: string; rota?: string; aparelho?: Record<string, unknown> | null; versao?: Record<string, unknown> | null; trilha?: Passo[]; extra?: Record<string, unknown> | null; usuario?: { id: number; nome?: string; email?: string; tipo?: string } | null };
type Erro = Linha & { stack: string | null; nota: string | null; ultimos: Contexto[] };

const TIPOS: Record<string, string> = {
  javascript: "Erro de JavaScript", tela: "Tela quebrou", promessa: "Promessa sem tratamento", servidor: "Servidor (visto no app)",
  requisicao: "Resposta inesperada", rede: "Rede", dados: "Dados", outro: "Outro", servidor_api: "Erro 500 da API",
};
const STATUS: Record<Status, { nome: string; tom: "amber" | "slate" | "emerald" }> = {
  novo: { nome: "Novo", tom: "amber" }, investigando: { nome: "Investigando", tom: "slate" }, resolvido: { nome: "Resolvido", tom: "emerald" },
};

const ler = async (res: Response) => {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.message || "Não foi possível falar com o servidor.");
  return body;
};
const quando = (iso?: string) => (iso ? new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "");
const campo = "h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-orange-500";

function Contextos({ ultimos }: { ultimos: Contexto[] }) {
  const [i, setI] = useState(ultimos.length - 1);
  const c = ultimos[i];
  if (!c) return null;
  const a = c.aparelho ?? {};
  const v = c.versao ?? {};
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
        <span className="font-semibold">Ocorrência</span>
        {ultimos.map((_, k) => (
          <button key={k} type="button" onClick={() => setI(k)} className={`rounded-md px-2 py-0.5 ${k === i ? "bg-orange-600 text-white" : "bg-slate-100"}`}>{k + 1}</button>
        ))}
        <span>de {ultimos.length} (as últimas guardadas)</span>
      </div>
      <dl className="grid gap-x-4 gap-y-1 text-sm md:grid-cols-2">
        <div><dt className="text-xs text-slate-500">Quando</dt><dd>{quando(c.em)}</dd></div>
        <div><dt className="text-xs text-slate-500">Tela</dt><dd className="font-mono text-xs">{c.rota || "—"}</dd></div>
        <div><dt className="text-xs text-slate-500">Conta</dt><dd>{c.usuario ? `${c.usuario.nome ?? `Usuário ${c.usuario.id}`}${c.usuario.email ? ` · ${c.usuario.email}` : ""} (${c.usuario.tipo ?? "?"})` : "Sem conta"}</dd></div>
        <div><dt className="text-xs text-slate-500">Versão</dt><dd>{[v.app, v.atualizacao ? `atualização ${String(v.atualizacao).slice(0, 8)}` : null, v.variante, v.demo ? "demonstração" : null].filter(Boolean).join(" · ") || "—"}</dd></div>
        <div className="md:col-span-2"><dt className="text-xs text-slate-500">Aparelho</dt><dd>{[a.fabricante, a.modelo, a.plataforma, a.versao_do_sistema ? `sistema ${a.versao_do_sistema}` : null, a.emulador ? "emulador" : null].filter(Boolean).join(" · ") || "—"}</dd></div>
      </dl>
      {c.extra ? (
        <div>
          <div className="text-xs font-semibold text-slate-600">Detalhes do erro</div>
          <pre className="mt-1 overflow-auto rounded-lg bg-slate-50 p-2 text-[11px] text-slate-700">{JSON.stringify(c.extra, null, 2)}</pre>
        </div>
      ) : null}
      <div>
        <div className="text-xs font-semibold text-slate-600">Passos até o erro (para reproduzir)</div>
        <ol className="mt-1 space-y-0.5 text-xs">
          {(c.trilha ?? []).map((p, k) => (
            <li key={k} className="flex gap-2">
              <span className="w-16 shrink-0 text-slate-400">{new Date(p.em).toLocaleTimeString("pt-BR")}</span>
              <span className={`w-20 shrink-0 font-semibold ${p.tipo === "requisicao" ? "text-sky-700" : p.tipo === "tela" ? "text-orange-700" : "text-slate-600"}`}>{p.tipo === "requisicao" ? "servidor" : p.tipo}</span>
              <span className="font-mono text-slate-700">{p.texto}</span>
            </li>
          ))}
          {!(c.trilha ?? []).length ? <li className="text-slate-400">Sem passos (erro do servidor ou do começo do app).</li> : null}
        </ol>
      </div>
    </div>
  );
}

function DetalheDoErro({ id, aoVoltar }: { id: number; aoVoltar: () => void }) {
  const [e, setE] = useState<Erro | null>(null);
  const [nota, setNota] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    apiRequest("GET", `/admin/erros/${id}`).then(ler).then((b) => { setE(b.erro); setNota(b.erro?.nota ?? ""); }).catch((x) => setMsg(x.message));
  }, [id]);
  const salvar = async (status?: Status) => {
    try {
      const b = await ler(await apiRequest("PATCH", `/admin/erros/${id}`, { ...(status ? { status } : {}), nota }));
      setE((atual) => (atual ? { ...atual, status: b.erro.status, nota: b.erro.nota } : atual));
      setMsg("Salvo.");
    } catch (x) {
      setMsg((x as Error).message);
    }
  };
  return (
    <SectionCard
      title={e ? `${TIPOS[e.tipo] ?? e.tipo} · ${e.ocorrencias}x · ${e.pessoas} conta(s)` : "Erro"}
      subtitle={e ? `${e.origem === "servidor" ? "API" : "App"} · primeira vez ${quando(e.primeira_em)} · última ${quando(e.ultima_em)}` : undefined}
      action={<button type="button" onClick={aoVoltar} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900"><ChevronLeft className="h-4 w-4" /> Voltar</button>}
    >
      {!e ? (msg ? <p className="text-sm text-red-700">{msg}</p> : <Loader2 className="h-4 w-4 animate-spin text-slate-400" />) : (
        <div className="space-y-4">
          <p className="rounded-lg bg-red-50 px-3 py-2 font-mono text-sm text-red-800">{e.mensagem}</p>
          {e.versoes?.length ? <p className="text-xs text-slate-500">Versões em que aconteceu: {e.versoes.join(", ")}</p> : null}
          {e.stack ? (
            <details open className="rounded-lg border border-slate-200 p-2">
              <summary className="cursor-pointer text-xs font-semibold text-slate-700">Pilha (log do erro)</summary>
              <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap text-[11px] text-slate-700">{e.stack}</pre>
            </details>
          ) : null}
          <Contextos ultimos={e.ultimos ?? []} />
          <div className="border-t border-slate-100 pt-3">
            <label className="block text-sm font-medium text-slate-700">
              Anotação da investigação
              <textarea value={nota} onChange={(x) => setNota(x.target.value)} rows={3} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-500" />
            </label>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => void salvar()} className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-semibold"><Save className="h-4 w-4" /> Salvar nota</button>
              {(Object.keys(STATUS) as Status[]).map((s) => (
                <button key={s} type="button" disabled={e.status === s} onClick={() => void salvar(s)} className={`h-9 rounded-lg px-3 text-sm font-semibold ${e.status === s ? "bg-orange-600 text-white" : "border border-slate-200 text-slate-700"}`}>
                  {STATUS[s].nome}
                </button>
              ))}
              {msg ? <span className="text-xs text-slate-500">{msg}</span> : null}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Se um erro resolvido voltar a acontecer, ele volta para "Novo" sozinho.</p>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

function ErrosDoAppEDaApi() {
  const [linhas, setLinhas] = useState<Linha[] | null>(null);
  const [total, setTotal] = useState(0);
  const [novos, setNovos] = useState(0);
  const [status, setStatus] = useState<string>("novo");
  const [origem, setOrigem] = useState("");
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const [aberto, setAberto] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (aberto != null) return;
    const q = new URLSearchParams({ pagina: String(pagina), ...(status ? { status } : {}), ...(origem ? { origem } : {}), ...(busca.trim() ? { busca: busca.trim() } : {}) });
    setLinhas(null);
    apiRequest("GET", `/admin/erros?${q}`).then(ler)
      .then((b) => { setLinhas(b.erros ?? []); setTotal(b.total ?? 0); setNovos(b.novos ?? 0); })
      .catch((x) => setErro(x.message));
  }, [status, origem, busca, pagina, aberto]);

  if (aberto != null) return <div className="mt-2"><DetalheDoErro id={aberto} aoVoltar={() => setAberto(null)} /></div>;
  return (
    <div className="mt-2 space-y-2">
      <SectionCard title="Erros da plataforma" subtitle={`${novos} novo(s). Chegam sozinhos do app e da API; erros iguais aparecem uma vez.`}>
        <div className="mb-3 flex flex-wrap gap-2">
          <select value={status} onChange={(x) => { setStatus(x.target.value); setPagina(1); }} className={campo}>
            <option value="">Todos</option>
            {(Object.keys(STATUS) as Status[]).map((s) => <option key={s} value={s}>{STATUS[s].nome}</option>)}
          </select>
          <select value={origem} onChange={(x) => { setOrigem(x.target.value); setPagina(1); }} className={campo}>
            <option value="">App e API</option>
            <option value="app">Só do app</option>
            <option value="servidor">Só da API</option>
          </select>
          <label className={`${campo} flex items-center gap-2`}>
            <Search className="h-4 w-4 text-slate-400" />
            <input value={busca} onChange={(x) => { setBusca(x.target.value); setPagina(1); }} placeholder="Mensagem ou tela" className="outline-none" />
          </label>
        </div>
        {erro ? <p className="text-sm text-red-700">{erro}</p> : !linhas ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : linhas.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum erro aqui.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {linhas.map((l) => (
              <button key={l.id} type="button" onClick={() => setAberto(l.id)} className="flex w-full items-start justify-between gap-3 py-2 text-left hover:bg-slate-50">
                <div className="min-w-0">
                  <div className="truncate font-mono text-sm text-slate-800">{l.mensagem}</div>
                  <div className="text-xs text-slate-500">{TIPOS[l.tipo] ?? l.tipo} · {l.origem === "servidor" ? "API" : "App"}{l.rota ? ` · ${l.rota}` : ""}</div>
                </div>
                <div className="shrink-0 space-y-0.5 text-right text-xs text-slate-500">
                  <StatusBadge label={STATUS[l.status]?.nome ?? l.status} tone={STATUS[l.status]?.tom ?? "slate"} />
                  <div>{l.ocorrencias}x · {l.pessoas} conta(s)</div>
                  <div>{quando(l.ultima_em)}</div>
                </div>
              </button>
            ))}
          </div>
        )}
        <div className="mt-3 flex items-center gap-2 text-sm">
          <button type="button" disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)} className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-50">Anterior</button>
          <span className="text-slate-500">Página {pagina} · {total} no filtro</span>
          <button type="button" disabled={(linhas?.length ?? 0) < 30} onClick={() => setPagina(pagina + 1)} className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-50">Próxima</button>
        </div>
      </SectionCard>
    </div>
  );
}

/** Aba "Auditoria de erros": os erros do app e da API e as conversas com a IA que deram erro. */
export function AdminErrosSection() {
  const [parte, setParte] = useState<"plataforma" | "ia">("plataforma");
  const abas: [typeof parte, string][] = [["plataforma", "App e API"], ["ia", "IA com erro"]];
  return (
    <div>
      <div className="mt-2 inline-flex rounded-xl border border-slate-200 bg-white p-1">
        {abas.map(([k, n]) => (
          <button key={k} type="button" onClick={() => setParte(k)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${parte === k ? "bg-orange-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
            {n}
          </button>
        ))}
      </div>
      {parte === "plataforma" ? <ErrosDoAppEDaApi /> : <AdminAiConversasSection soComErro />}
    </div>
  );
}
