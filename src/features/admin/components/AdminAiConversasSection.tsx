import { useEffect, useState } from "react";
import { ChevronLeft, Loader2, Search } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { SectionCard, StatusBadge } from "./AdminPrimitives";
import { SinaisConsolidados, SinaisDoTurno, type Sinal } from "./SinaisDaIA";

/**
 * Cópia das conversas com a IA (15/11/2026): quem usou, qual IA, por qual botão entrou e a
 * conversa inteira. Backend: GET /admin/ai-conversas, GET /admin/ai-conversas/:id.
 * A cópia é gravada depois que a IA responde, sem atrasar quem está usando.
 */
type Pessoa = { id: number; nome?: string; email?: string; tipo?: string } | null;
type Linha = { id: number; tipo: string; origem: string; publica: boolean; turnos: number; erros: number; ultima_em: string; criada_em: string; pessoa: Pessoa; primeira_mensagem: string | null };
type Bastidores = { entendi?: string | null; suposicoes?: string[]; faltando?: string[]; confianca?: string | null; calculos?: { ferramenta: string; erro?: string; resultado?: unknown }[] };
type Conversa = Linha & { mensagens: { de: "eu" | "ia"; texto: string; em: string; bastidores?: Bastidores; sinais?: { aceitos?: Sinal[]; recusados?: Sinal[] } }[]; resultado: unknown; sinais?: Record<string, Sinal> | null };

/** O que a IA entendeu, supôs, deixou faltando e calculou naquele turno (o app não mostra). */
function BastidoresDoTurno({ b }: { b: Bastidores }) {
  const linhas: [string, string][] = [];
  if (b.entendi) linhas.push(["Entendeu", b.entendi]);
  if (b.suposicoes?.length) linhas.push(["Supondo", b.suposicoes.join("; ")]);
  if (b.faltando?.length) linhas.push(["Falta", b.faltando.join("; ")]);
  if (b.confianca) linhas.push(["Confiança", b.confianca]);
  if (b.calculos?.length) linhas.push(["Calculou", b.calculos.map((c) => (c.erro ? `${c.ferramenta}: erro (${c.erro})` : c.ferramenta)).join(", ")]);
  if (!linhas.length) return null;
  return (
    <details className="mt-1 text-[11px] text-slate-600">
      <summary className="cursor-pointer font-semibold">Bastidores</summary>
      <dl className="mt-1 space-y-0.5">
        {linhas.map(([k, v]) => <div key={k}><dt className="inline font-semibold">{k}: </dt><dd className="inline">{v}</dd></div>)}
      </dl>
    </details>
  );
}

const TIPOS: Record<string, string> = {
  proposta: "Proposta com IA",
  contrato: "Texto do orçamento",
  pedido: "Pedido do cliente",
  perfil: "Perfil de demanda",
  fases: "Explicação das fases",
};

/** Nome de cada botão/tela por onde a pessoa entra na IA (o app manda o código). */
const ORIGENS: Record<string, string> = {
  inicio_barra: "Início do profissional: barra 'Descreva o serviço'",
  aviso_personalizar: "Início do profissional: aviso 'Personalize sua demanda'",
  ajustes_ia: "Ajustes: Ajustar Inteligência Artificial",
  projetos_proposta_ia: "Projetos: 'Envie uma Proposta com IA'",
  projetos_convite_ia: "Projetos: 'Crie um convite com IA'",
  rascunho: "Projetos: continuar um rascunho",
  historico: "Proposta com IA: histórico de conversas",
  chat_proposta_ia: "Conversa com o cliente: 'Proposta com IA'",
  conversas_proposta_ia: "Aba Conversas: 'Envie uma Proposta com IA'",
  nova_proposta: "Proposta manual: 'Montar com a IA'",
  notificacao: "Notificação",
  inicio_busca: "Início do cliente: 'Conte sua obra'",
  inicio_sugestao: "Início do cliente: sugestões",
  projetos_pedido_ia: "Projetos do cliente: 'Publicar um pedido com IA'",
  pedido_ia: "Pedido com IA (outra entrada)",
  onboarding_teste: "Primeira entrada: teste da IA",
  nao_informada: "Não informado (app antigo)",
};

const ler = async (res: Response) => {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.message || "Não foi possível falar com o servidor.");
  return body;
};
const quando = (iso?: string) => (iso ? new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "");
const turnos = (n: number) => `${n} ${n === 1 ? "turno" : "turnos"}`;
const quem = (p: Pessoa, publica: boolean) => (publica ? "Sem conta (teste)" : p?.nome ? `${p.nome}${p.email ? ` · ${p.email}` : ""}` : `Usuário ${p?.id ?? "?"}`);

function DetalheDaConversa({ id, aoVoltar }: { id: number; aoVoltar: () => void }) {
  const [c, setC] = useState<Conversa | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => {
    apiRequest("GET", `/admin/ai-conversas/${id}`).then(ler).then((b) => setC(b.conversa)).catch((e) => setErro(e.message));
  }, [id]);
  return (
    <SectionCard
      title={c ? `${TIPOS[c.tipo] ?? c.tipo} · ${quem(c.pessoa, c.publica)}` : "Conversa"}
      subtitle={c ? `Entrou por: ${ORIGENS[c.origem] ?? c.origem} · ${turnos(c.turnos)} · última ${quando(c.ultima_em)}` : undefined}
      action={<button type="button" onClick={aoVoltar} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900"><ChevronLeft className="h-4 w-4" /> Voltar</button>}
    >
      {erro ? <p className="text-sm text-red-700">{erro}</p> : !c ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : (
        <div className="space-y-2">
          {c.sinais ? <div className="rounded-lg border border-slate-200 px-3 py-2"><SinaisConsolidados sinais={c.sinais} titulo="Sinais da conversa (privado, para o palpite)" /></div> : null}
          {c.mensagens.map((m, i) => {
            // o backend grava a falha da IA como "(erro) motivo" (middlewares/registrarConversaDaIA.js)
            const falhou = m.de === "ia" && m.texto.startsWith("(erro)");
            const cores = m.de === "eu" ? "ml-auto bg-slate-900 text-white" : falhou ? "border border-red-200 bg-red-50 text-red-800" : "bg-orange-50 text-slate-800";
            return (
              <div key={i} className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${cores}`}>
                <div className="mb-0.5 text-[10px] opacity-70">{m.de === "eu" ? "Usuário" : falhou ? "IA · falhou" : "IA"} · {quando(m.em)}</div>
                {falhou ? m.texto.replace(/^\(erro\)\s*/, "") : m.texto}
                {m.de === "ia" && m.bastidores ? <BastidoresDoTurno b={m.bastidores} /> : null}
                {m.de === "ia" && m.sinais ? <SinaisDoTurno s={m.sinais} /> : null}
              </div>
            );
          })}
          {c.resultado ? (
            <details className="rounded-lg border border-slate-200 p-2 text-xs">
              <summary className="cursor-pointer font-semibold text-slate-700">O que a IA montou (último retrato)</summary>
              <pre className="mt-2 overflow-auto whitespace-pre-wrap text-[11px] text-slate-600">{JSON.stringify(c.resultado, null, 2)}</pre>
            </details>
          ) : null}
        </div>
      )}
    </SectionCard>
  );
}

export function AdminAiConversasSection({ soComErro = false }: { soComErro?: boolean } = {}) {
  const [linhas, setLinhas] = useState<Linha[] | null>(null);
  const [total, setTotal] = useState(0);
  const [origens, setOrigens] = useState<string[]>([]);
  const [tipo, setTipo] = useState("");
  const [origem, setOrigem] = useState("");
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const [aberta, setAberta] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const q = new URLSearchParams({ pagina: String(pagina), ...(soComErro ? { com_erro: "1" } : {}), ...(tipo ? { tipo } : {}), ...(origem ? { origem } : {}), ...(busca.trim() ? { busca: busca.trim() } : {}) });
    setLinhas(null);
    apiRequest("GET", `/admin/ai-conversas?${q}`).then(ler)
      .then((b) => { setLinhas(b.conversas ?? []); setTotal(b.total ?? 0); setOrigens(b.origens ?? []); })
      .catch((e) => setErro(e.message));
  }, [tipo, origem, busca, pagina, soComErro]);

  if (aberta != null) return <div className="mt-2"><DetalheDaConversa id={aberta} aoVoltar={() => setAberta(null)} /></div>;

  const campo = "h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-orange-500";
  return (
    <div className="mt-2 space-y-2">
      <SectionCard title={soComErro ? "Conversas com a IA que deram erro" : "Conversas com a IA"} subtitle={soComErro ? `${total} conversas em que a IA falhou ao responder (sem chave, fora do ar, resposta fora do formato…).` : `${total} conversas. Cada uma mostra quem usou, qual IA e por qual botão entrou.`}>
        <div className="mb-3 flex flex-wrap gap-2">
          <select value={tipo} onChange={(e) => { setTipo(e.target.value); setPagina(1); }} className={campo}>
            <option value="">Todas as IAs</option>
            {Object.entries(TIPOS).map(([v, n]) => <option key={v} value={v}>{n}</option>)}
          </select>
          <select value={origem} onChange={(e) => { setOrigem(e.target.value); setPagina(1); }} className={campo}>
            <option value="">Todos os botões</option>
            {origens.map((o) => <option key={o} value={o}>{ORIGENS[o] ?? o}</option>)}
          </select>
          <label className={`${campo} flex items-center gap-2`}>
            <Search className="h-4 w-4 text-slate-400" />
            <input value={busca} onChange={(e) => { setBusca(e.target.value); setPagina(1); }} placeholder="Nome ou e-mail" className="outline-none" />
          </label>
        </div>
        {erro ? <p className="text-sm text-red-700">{erro}</p> : !linhas ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : linhas.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma conversa ainda.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {linhas.map((l) => (
              <button key={l.id} type="button" onClick={() => setAberta(l.id)} className="flex w-full items-start justify-between gap-3 py-2 text-left hover:bg-slate-50">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-800">{quem(l.pessoa, l.publica)}</div>
                  <div className="text-xs text-slate-500">{TIPOS[l.tipo] ?? l.tipo} · {ORIGENS[l.origem] ?? l.origem}</div>
                  {l.primeira_mensagem ? <div className="truncate text-xs text-slate-600">“{l.primeira_mensagem}”</div> : null}
                </div>
                <div className="shrink-0 text-right text-xs text-slate-500">
                  <div>{quando(l.ultima_em)}</div>
                  <div>{turnos(l.turnos)}</div>
                  {l.erros ? <StatusBadge label={`${l.erros} erro(s)`} tone="amber" /> : null}
                </div>
              </button>
            ))}
          </div>
        )}
        <div className="mt-3 flex items-center gap-2 text-sm">
          <button type="button" disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)} className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-50">Anterior</button>
          <span className="text-slate-500">Página {pagina}</span>
          <button type="button" disabled={(linhas?.length ?? 0) < 30} onClick={() => setPagina(pagina + 1)} className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-50">Próxima</button>
        </div>
      </SectionCard>
    </div>
  );
}
