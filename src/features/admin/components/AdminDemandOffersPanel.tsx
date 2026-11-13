import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Plus, Search, Star, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { ADMIN_TOKENS } from "../tokens";
import { cn } from "../utils";
import { StatusBadge } from "./AdminPrimitives";

/**
 * Ofertas de um pedido de cliente (as que aparecem na "caixa de ofertas" do app).
 *
 * Por enquanto quem decide é o admin: escolhe os profissionais, define o percentual de
 * compatibilidade (o círculo verde/amarelo/vermelho do cartão) e a mensagem. O cliente só
 * vê, escolhe e pode arquivar; as arquivadas aparecem aqui marcadas.
 *
 * Backend: GET/POST /admin/demands/:id/ofertas, GET /admin/demands/:id/ofertas/candidatos,
 * PATCH/DELETE /admin/ofertas/:ofertaId.
 */

type Profissional = {
  user_id: number;
  nome: string;
  email?: string | null;
  profissao?: string | null;
  nota?: number;
  cidades?: string[];
};

type Oferta = {
  id: number;
  compatibilidade: number | null;
  mensagem: string | null;
  prazo_dias: number | null;
  versao_do_pedido: number | null;
  arquivada: boolean;
  enviada_em: string | null;
  profissional: Profissional;
};

// mesmas faixas do app (provisórias): ≥75 verde, 50–74 amarelo, <50 vermelho
const tomDoPercentual = (v: number | null) =>
  v == null ? ("slate" as const) : v >= 75 ? ("emerald" as const) : v >= 50 ? ("amber" as const) : ("rose" as const);

const lerErro = async (response: Response, padrao: string) => {
  const body = (await response.json().catch(() => ({}))) as { message?: string };
  return body?.message || padrao;
};

function LinhaDaOferta({
  oferta,
  versaoAtual,
  ocupado,
  aoSalvar,
  aoRemover,
}: {
  oferta: Oferta;
  versaoAtual?: number | null;
  ocupado: boolean;
  aoSalvar: (mudancas: Partial<Pick<Oferta, "compatibilidade" | "mensagem" | "prazo_dias">>) => Promise<void>;
  aoRemover: () => void;
}) {
  const [pct, setPct] = useState(String(oferta.compatibilidade ?? ""));
  const [mensagem, setMensagem] = useState(oferta.mensagem ?? "");
  const [prazo, setPrazo] = useState(oferta.prazo_dias != null ? String(oferta.prazo_dias) : "");
  useEffect(() => {
    setPct(String(oferta.compatibilidade ?? ""));
    setMensagem(oferta.mensagem ?? "");
    setPrazo(oferta.prazo_dias != null ? String(oferta.prazo_dias) : "");
  }, [oferta]);

  const pctNum = pct.trim() === "" ? null : Math.max(0, Math.min(100, Math.round(Number(pct))));
  const prazoNum = prazo.trim() === "" ? null : Math.max(0, Math.round(Number(prazo)));
  const mudou =
    pctNum !== oferta.compatibilidade || (mensagem.trim() || null) !== (oferta.mensagem || null) || prazoNum !== oferta.prazo_dias;
  const p = oferta.profissional;
  const desatualizada = versaoAtual != null && oferta.versao_do_pedido != null && oferta.versao_do_pedido < versaoAtual;

  return (
    <li className={cn("rounded-lg border p-2.5", oferta.arquivada ? "border-slate-200 bg-slate-50" : "border-slate-200 bg-white")}>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-slate-900">{p.nome}</p>
        {p.profissao ? <StatusBadge label={p.profissao} tone="sky" /> : null}
        {p.nota ? (
          <span className="inline-flex items-center gap-0.5 text-xs text-slate-600">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            {p.nota.toFixed(1)}
          </span>
        ) : null}
        {p.cidades?.length ? <span className="text-xs text-slate-500">{p.cidades.join(", ")}</span> : null}
        <StatusBadge label={oferta.compatibilidade != null ? `${oferta.compatibilidade}%` : "sem %"} tone={tomDoPercentual(oferta.compatibilidade)} />
        {oferta.arquivada ? <StatusBadge label="Arquivada pelo cliente" tone="slate" /> : null}
        {desatualizada ? <StatusBadge label={`Respondeu a versão ${oferta.versao_do_pedido}`} tone="amber" /> : null}
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-[150px_110px_1fr_auto] sm:items-start">
        <label className="text-[11px] font-medium text-slate-500">
          Compatibilidade (%)
          <div className="mt-1 flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={100}
              value={pctNum ?? 0}
              onChange={(e) => setPct(e.target.value)}
              className="w-full accent-orange-600"
              aria-label={`Compatibilidade de ${p.nome}`}
            />
            <input
              type="number"
              min={0}
              max={100}
              value={pct}
              onChange={(e) => setPct(e.target.value)}
              className="h-8 w-14 rounded-md border border-slate-200 px-1.5 text-sm outline-none focus:border-orange-400"
            />
          </div>
        </label>
        <label className="text-[11px] font-medium text-slate-500">
          Prazo (dias)
          <input
            type="number"
            min={0}
            value={prazo}
            onChange={(e) => setPrazo(e.target.value)}
            className="mt-1 h-8 w-full rounded-md border border-slate-200 px-2 text-sm outline-none focus:border-orange-400"
          />
        </label>
        <label className="text-[11px] font-medium text-slate-500">
          Mensagem para o cliente
          <textarea
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            rows={2}
            maxLength={600}
            className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1 text-sm outline-none focus:border-orange-400"
          />
        </label>
        <div className="flex gap-1.5 sm:mt-5 sm:flex-col">
          <button
            type="button"
            disabled={ocupado || !mudou}
            onClick={() => void aoSalvar({ compatibilidade: pctNum, mensagem: mensagem.trim() || null, prazo_dias: prazoNum })}
            className={cn("inline-flex items-center justify-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold disabled:opacity-50", ADMIN_TOKENS.primaryButton)}
          >
            {ocupado ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Salvar
          </button>
          <button
            type="button"
            disabled={ocupado}
            onClick={aoRemover}
            className="inline-flex items-center justify-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remover
          </button>
        </div>
      </div>
    </li>
  );
}

export function AdminDemandOffersPanel({ demandId, versaoAtual }: { demandId: number; versaoAtual?: number | null }) {
  const [aberto, setAberto] = useState(false);
  const [ofertas, setOfertas] = useState<Oferta[] | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [buscaRascunho, setBuscaRascunho] = useState("");
  const [candidatos, setCandidatos] = useState<Profissional[] | null>(null);
  const [buscando, setBuscando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const r = await apiRequest("GET", `/admin/demands/${demandId}/ofertas`);
      if (!r.ok) throw new Error(await lerErro(r, "Erro ao carregar as ofertas."));
      const body = await r.json();
      setOfertas(Array.isArray(body?.ofertas) ? body.ofertas : []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar as ofertas.");
    } finally {
      setCarregando(false);
    }
  }, [demandId]);

  const alternar = () => {
    const proximo = !aberto;
    setAberto(proximo);
    if (proximo && ofertas === null && !carregando) void carregar();
  };

  const buscar = async (event?: React.FormEvent) => {
    event?.preventDefault();
    setBuscando(true);
    setErro(null);
    try {
      const q = new URLSearchParams();
      if (buscaRascunho.trim()) q.set("search", buscaRascunho.trim());
      const r = await apiRequest("GET", `/admin/demands/${demandId}/ofertas/candidatos?${q.toString()}`);
      if (!r.ok) throw new Error(await lerErro(r, "Erro ao buscar profissionais."));
      const body = await r.json();
      setCandidatos(Array.isArray(body?.profissionais) ? body.profissionais : []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao buscar profissionais.");
    } finally {
      setBuscando(false);
    }
  };

  const executar = async (chave: string, acao: () => Promise<Response>, padrao: string) => {
    setOcupado(chave);
    setErro(null);
    try {
      const r = await acao();
      if (!r.ok) throw new Error(await lerErro(r, padrao));
      await carregar();
      return true;
    } catch (e) {
      setErro(e instanceof Error ? e.message : padrao);
      return false;
    } finally {
      setOcupado(null);
    }
  };

  const adicionar = async (p: Profissional) => {
    const ok = await executar(
      `add-${p.user_id}`,
      () => apiRequest("POST", `/admin/demands/${demandId}/ofertas`, { provider_user_id: p.user_id, compatibilidade: 70 }),
      "Erro ao adicionar o profissional."
    );
    if (ok) setCandidatos((lista) => (lista ? lista.filter((c) => c.user_id !== p.user_id) : lista));
  };

  const remover = (o: Oferta) => {
    if (!window.confirm(`Remover a oferta de ${o.profissional.nome}? Ela some da caixa de ofertas do cliente.`)) return;
    void executar(`rm-${o.id}`, () => apiRequest("DELETE", `/admin/ofertas/${o.id}`), "Erro ao remover a oferta.");
  };

  const ativas = ofertas?.filter((o) => !o.arquivada).length ?? 0;

  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={alternar}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:bg-slate-50"
      >
        <span>
          Ofertas e % de compatibilidade
          {ofertas ? <span className="ml-1 normal-case text-slate-400">· {ativas} na caixa do cliente</span> : null}
        </span>
        {aberto ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {aberto ? (
        <div className="space-y-3 border-t border-slate-100 p-3">
          {erro ? <div className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1.5 text-xs text-rose-700">{erro}</div> : null}

          {carregando && ofertas === null ? (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Carregando…
            </div>
          ) : ofertas && ofertas.length === 0 ? (
            <p className="text-xs text-slate-500">Nenhuma oferta ainda. Adicione profissionais abaixo; o cliente vê os cartões na hora.</p>
          ) : ofertas ? (
            <ul className="space-y-2">
              {ofertas.map((o) => (
                <LinhaDaOferta
                  key={o.id}
                  oferta={o}
                  versaoAtual={versaoAtual}
                  ocupado={ocupado === `save-${o.id}` || ocupado === `rm-${o.id}`}
                  aoSalvar={async (mudancas) => {
                    await executar(`save-${o.id}`, () => apiRequest("PATCH", `/admin/ofertas/${o.id}`, mudancas), "Erro ao salvar a oferta.");
                  }}
                  aoRemover={() => remover(o)}
                />
              ))}
            </ul>
          ) : null}

          <div className="rounded-lg border border-dashed border-slate-300 p-2.5">
            <p className={ADMIN_TOKENS.caption}>Adicionar profissional</p>
            <form onSubmit={(e) => void buscar(e)} className="mt-1.5 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={buscaRascunho}
                  onChange={(e) => setBuscaRascunho(e.target.value)}
                  placeholder="Nome, e-mail ou profissão"
                  className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-sm outline-none focus:border-orange-400"
                />
              </div>
              <button type="submit" className={cn("h-8 rounded-lg px-3 text-xs font-semibold", ADMIN_TOKENS.primaryButton)}>
                {buscando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Buscar"}
              </button>
            </form>
            {candidatos && candidatos.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">Nenhum profissional encontrado (quem já tem oferta neste pedido não aparece).</p>
            ) : null}
            {candidatos?.length ? (
              <ul className="mt-2 divide-y divide-slate-100">
                {candidatos.map((c) => (
                  <li key={c.user_id} className="flex items-center justify-between gap-2 py-1.5">
                    <div className="min-w-0 text-xs">
                      <p className="truncate font-semibold text-slate-900">{c.nome}</p>
                      <p className="truncate text-slate-500">
                        {[c.profissao, c.cidades?.join(", "), c.email].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={Boolean(ocupado)}
                      onClick={() => void adicionar(c)}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-orange-200 bg-orange-50 px-2 py-1 text-xs font-semibold text-orange-700 hover:bg-orange-100 disabled:opacity-50"
                    >
                      {ocupado === `add-${c.user_id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                      Adicionar
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
