import { useEffect, useState } from "react";
import { ChevronLeft, Flame, Loader2, Search, Snowflake, Sparkles, ThermometerSun } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { SectionCard, StatusBadge } from "./AdminPrimitives";

/**
 * Painel > Análise (19/11/2026): vendas, follow-up e perfil de cada conta.
 *
 *   Vendas            números e listas de ação calculados pelo código (sem IA, sem custo)
 *   Pessoas           a ficha de cada conta: dossiê, temperatura por regras e o botão
 *                     "Analisar" (a IA analista só roda aqui, por botão, com custo mostrado antes)
 *   Precisão da IA    as previsões que a IA fez, conferidas pelo código quando vencem
 *
 * Backend: /admin/analise/* (controllers/admin/adminAnaliseController.js). Nada disto vai ao app.
 */

type Temp = "quente" | "morno" | "frio";
type Fato = { id: string; em: string | null; tipo: string; texto: string };
type Traco = { traco: string; nivel: string; confianca: string; provas: string[] };
type Resultado = {
  resumo: string; categoria_de_perfil: string;
  temperatura: { nivel: Temp; motivo: string; diverge_das_regras: boolean; provas: string[] };
  tracos: Traco[]; chance_de_fechar_90_dias: number;
  previsoes: { pergunta: string; probabilidade: number; prazo_dias: number }[];
  follow_up: { acao: string; quando: string; por_que: string; mensagem_sugerida: string };
  alertas: { texto: string; provas: string[] }[]; lacunas: string[]; o_que_mudaria_a_leitura: string;
  fatos_citados?: Record<string, Omit<Fato, "id">>;
};
type Analise = { id: number; papel: string; temperatura: Temp; temperatura_codigo: Temp; categoria: string; chance: number | string; resultado: Resultado; previsoes: { pergunta: string; probabilidade: number; vence_em: string; aconteceu: boolean | null }[]; custo_usd: number | string; fatos: number; em: string };
type Dossie = { pessoa: { papel: string; cidade: string | null; uf: string | null }; numeros: Record<string, number | string | null>; fatos: Fato[]; novos_desde_a_ultima: number; temperatura_por_codigo: { nivel: Temp; motivos: string[] }; faltou: string[] };

const ler = async (res: Response) => {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.message || "Não foi possível falar com o servidor.");
  return body;
};
const quando = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—");
const pct = (v: number | string | null | undefined) => (v == null ? "—" : `${Math.round(Number(v) * 100)}%`);
const usd = (v: number | string | null | undefined) => `US$ ${Number(v || 0).toFixed(3)}`;
const rotulo = (s: string) => s.replace(/_/g, " ");

const TOM: Record<Temp, "rose" | "amber" | "sky"> = { quente: "rose", morno: "amber", frio: "sky" };
const ICONE: Record<Temp, typeof Flame> = { quente: Flame, morno: ThermometerSun, frio: Snowflake };
function Temperatura({ t, de }: { t?: Temp | null; de?: string }) {
  if (!t) return <span className="text-xs text-slate-400">—</span>;
  const I = ICONE[t];
  return (
    <span className="inline-flex items-center gap-1">
      <I className="h-3.5 w-3.5 text-slate-500" />
      <StatusBadge label={de ? `${t} (${de})` : t} tone={TOM[t]} />
    </span>
  );
}

const ACOES: Record<string, string> = {
  mensagem_no_app: "Mandar mensagem no app", ligar: "Ligar", oferecer_outros_profissionais: "Oferecer outros profissionais",
  ajudar_a_completar_o_pedido: "Ajudar a completar o pedido", lembrar_de_responder: "Lembrar de responder", reativar: "Reativar",
  esperar: "Esperar", nada_a_fazer: "Nada a fazer",
};
const QUANDO: Record<string, string> = { hoje: "hoje", esta_semana: "esta semana", em_15_dias: "em 15 dias", sem_pressa: "sem pressa" };
const PERGUNTAS: Record<string, string> = { fecha_contrato: "Fecha contrato", publica_novo_pedido: "Publica novo pedido", volta_ao_app: "Volta ao app", cancela_contrato: "Cancela contrato", envia_oferta: "Envia oferta", responde_convite: "Responde convite" };

/* ------------------------------------------------------------------ Vendas */

type Visao = {
  numeros: Record<string, number>;
  temperaturas: { analisados: number; quente: number; morno: number; frio: number; divergem_das_regras: number };
  follow_ups: { user_id: number; nome: string | null; papel: string; temperatura: Temp; chance: number; acao: string; quando: string; por_que: string; mensagem_sugerida: string }[];
  pedidos_sem_oferta: { id: number; titulo: string; user_id: number; nome: string | null; criado_em: string }[];
  convites_parados: { id: number; pedido: number; user_id: number; nome: string | null; status: string; criado_em: string }[];
  propostas_paradas: { id: number; valor: number; criado_em: string }[];
};
const NUMEROS: [string, string][] = [
  ["clientes", "Clientes"], ["profissionais", "Profissionais"], ["ativos_7_dias", "Ativos em 7 dias"], ["pedidos_30_dias", "Pedidos em 30 dias"],
  ["contratos_30_dias", "Contratos em 30 dias"], ["pedidos_abertos", "Pedidos abertos"], ["abertos_sem_oferta_2_dias", "Sem oferta há 2+ dias"],
  ["convites_parados_2_dias", "Convites parados 2+ dias"], ["propostas_paradas_5_dias", "Propostas paradas 5+ dias"],
];

function Vendas({ abrir }: { abrir: (id: number) => void }) {
  const [v, setV] = useState<Visao | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => { apiRequest("GET", "/admin/analise/visao").then(ler).then(setV).catch((e) => setErro(e.message)); }, []);
  if (erro) return <p className="text-sm text-red-700">{erro}</p>;
  if (!v) return <Loader2 className="h-4 w-4 animate-spin text-slate-400" />;
  const Pessoa = ({ id, nome }: { id: number; nome: string | null }) => <button type="button" onClick={() => abrir(id)} className="font-semibold text-orange-700 underline">{nome || `Conta ${id}`}</button>;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {NUMEROS.map(([k, r]) => (
          <div key={k} className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{r}</p>
            <p className="mt-1 text-lg font-semibold text-slate-950">{v.numeros[k] ?? 0}</p>
          </div>
        ))}
      </div>
      <SectionCard title="Temperatura (análises dos últimos 60 dias)" subtitle={`${v.temperaturas.analisados} conta(s) analisada(s) · ${v.temperaturas.divergem_das_regras} em que a IA discorda das regras`}>
        <div className="flex flex-wrap gap-3 text-sm">
          <span><Temperatura t="quente" /> {v.temperaturas.quente}</span>
          <span><Temperatura t="morno" /> {v.temperaturas.morno}</span>
          <span><Temperatura t="frio" /> {v.temperaturas.frio}</span>
        </div>
      </SectionCard>
      <SectionCard title="Follow-ups para fazer" subtitle="O que a IA analista sugeriu para hoje e esta semana">
        {!v.follow_ups.length ? <p className="text-sm text-slate-500">Nenhum. Analise algumas contas em Pessoas para a lista aparecer.</p> : (
          <ul className="space-y-2">
            {v.follow_ups.map((f) => (
              <li key={f.user_id} className="rounded-lg border border-slate-200 p-2 text-sm">
                <div className="flex flex-wrap items-center gap-2"><Pessoa id={f.user_id} nome={f.nome} /> <span className="text-xs text-slate-500">{f.papel}</span> <Temperatura t={f.temperatura} /> <span className="text-xs text-slate-600">chance {pct(f.chance)}</span></div>
                <p className="mt-1"><b>{ACOES[f.acao] ?? rotulo(f.acao)}</b> · {QUANDO[f.quando] ?? f.quando}. {f.por_que}</p>
                {f.mensagem_sugerida ? <p className="mt-1 rounded bg-orange-50 px-2 py-1 text-xs text-slate-700">“{f.mensagem_sugerida}”</p> : null}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Pedidos sem oferta há 2+ dias" subtitle="Cliente esperando: vale chamar profissionais">
          {!v.pedidos_sem_oferta.length ? <p className="text-sm text-slate-500">Nenhum.</p> : (
            <ul className="space-y-1 text-sm">{v.pedidos_sem_oferta.map((p) => <li key={p.id}><Pessoa id={p.user_id} nome={p.nome} /> · {p.titulo} · {quando(p.criado_em)}</li>)}</ul>
          )}
        </SectionCard>
        <SectionCard title="Convites sem resposta há 2+ dias" subtitle="Profissional convidado que não respondeu">
          {!v.convites_parados.length ? <p className="text-sm text-slate-500">Nenhum.</p> : (
            <ul className="space-y-1 text-sm">{v.convites_parados.map((c) => <li key={c.id}><Pessoa id={c.user_id} nome={c.nome} /> · pedido {c.pedido} · {c.status === "viewed" ? "viu e não respondeu" : "nem abriu"} · {quando(c.criado_em)}</li>)}</ul>
          )}
        </SectionCard>
      </div>
      <SectionCard title="Propostas paradas há 5+ dias" subtitle="Proposta enviada e ainda sem decisão do cliente">
        {!v.propostas_paradas.length ? <p className="text-sm text-slate-500">Nenhuma.</p> : (
          <ul className="space-y-1 text-sm">{v.propostas_paradas.map((t) => <li key={t.id}>Proposta {t.id} · R$ {Math.round(t.valor).toLocaleString("pt-BR")} · {quando(t.criado_em)}</li>)}</ul>
        )}
      </SectionCard>
    </div>
  );
}

/* ------------------------------------------------------------------ Pessoas */

type Linha = { id: number; nome: string; papel: string; ultimo_acesso: string | null; ultima_analise: { temperatura: Temp; temperatura_codigo: Temp; categoria: string; chance: number; em: string } | null };

function ListaDePessoas({ abrir }: { abrir: (id: number) => void }) {
  const [papel, setPapel] = useState("");
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const [dados, setDados] = useState<{ total: number; pessoas: Linha[] } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [lote, setLote] = useState<{ prontos: { id: number; nome: string; fatos: number; novos: number; custo_estimado_usd: number }[]; custo_estimado_usd: number } | null>(null);
  const [rodando, setRodando] = useState<string | null>(null);
  useEffect(() => {
    const q = new URLSearchParams({ pagina: String(pagina), ...(papel ? { papel } : {}), ...(busca ? { busca } : {}) });
    apiRequest("GET", `/admin/analise/pessoas?${q}`).then(ler).then(setDados).catch((e) => setErro(e.message));
  }, [papel, busca, pagina]);

  const verLote = () => { setErro(null); setRodando("Procurando quem tem dado novo…"); apiRequest("POST", "/admin/analise/lote", { papel: papel || undefined }, undefined, 120000).then(ler).then((b) => setLote(b)).catch((e) => setErro(e.message)).finally(() => setRodando(null)); };
  // roda uma por vez, daqui do painel (cada análise leva perto de um minuto)
  const rodarLote = async () => {
    if (!lote?.prontos.length) return;
    if (!window.confirm(`Analisar ${lote.prontos.length} conta(s)? Custo estimado: ${usd(lote.custo_estimado_usd)}.`)) return;
    for (let i = 0; i < lote.prontos.length; i++) {
      const p = lote.prontos[i];
      setRodando(`Analisando ${i + 1} de ${lote.prontos.length}: ${p.nome}…`);
      try { await apiRequest("POST", `/admin/analise/pessoas/${p.id}/analisar`, { confirmar: true }, undefined, 180000).then(ler); }
      catch (e: any) { setErro(`${p.nome}: ${e.message}`); if (/teto|chave|limite/i.test(e.message)) break; }
    }
    setRodando(null); setLote(null); setPagina((x) => x);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select value={papel} onChange={(e) => { setPapel(e.target.value); setPagina(1); }} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" aria-label="Papel">
          <option value="">Todos</option><option value="cliente">Clientes</option><option value="profissional">Profissionais</option>
        </select>
        <label className="flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
          <Search className="h-4 w-4 text-slate-400" />
          <input value={busca} onChange={(e) => { setBusca(e.target.value); setPagina(1); }} placeholder="Buscar pelo nome" className="outline-none" />
        </label>
        <button type="button" onClick={verLote} className="ml-auto inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white"><Sparkles className="h-4 w-4" /> Analisar quem tem dado novo</button>
      </div>
      {rodando ? <p className="flex items-center gap-2 text-sm text-slate-600"><Loader2 className="h-4 w-4 animate-spin" /> {rodando}</p> : null}
      {erro ? <p className="text-sm text-red-700">{erro}</p> : null}
      {lote ? (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm">
          {!lote.prontos.length ? <p>Ninguém com dado novo suficiente agora. Nada foi gasto.</p> : (
            <>
              <p><b>{lote.prontos.length}</b> conta(s) com dado novo suficiente · custo estimado <b>{usd(lote.custo_estimado_usd)}</b></p>
              <ul className="mt-1 text-xs text-slate-600">{lote.prontos.map((p) => <li key={p.id}>{p.nome} · {p.fatos} fatos ({p.novos} novos) · {usd(p.custo_estimado_usd)}</li>)}</ul>
              <div className="mt-2 flex gap-2"><button type="button" onClick={() => void rodarLote()} className="rounded-lg bg-orange-600 px-3 py-1.5 font-semibold text-white">Analisar estas</button><button type="button" onClick={() => setLote(null)} className="rounded-lg border border-slate-300 px-3 py-1.5">Cancelar</button></div>
            </>
          )}
        </div>
      ) : null}
      {!dados ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : (
        <>
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-slate-500"><tr><th className="py-1">Conta</th><th>Papel</th><th>Último acesso</th><th>Temperatura (IA)</th><th>Chance 90 dias</th><th>Perfil</th><th>Analisada em</th></tr></thead>
            <tbody>
              {dados.pessoas.map((p) => (
                <tr key={p.id} className="cursor-pointer border-t border-slate-100 hover:bg-slate-50" onClick={() => abrir(p.id)}>
                  <td className="py-1.5 font-semibold text-slate-900">{p.nome}</td><td>{p.papel}</td><td>{quando(p.ultimo_acesso)}</td>
                  <td><Temperatura t={p.ultima_analise?.temperatura} /></td><td>{pct(p.ultima_analise?.chance)}</td>
                  <td className="text-xs">{p.ultima_analise ? rotulo(p.ultima_analise.categoria) : "—"}</td><td className="text-xs">{quando(p.ultima_analise?.em)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center gap-2 text-sm">
            <button type="button" disabled={pagina <= 1} onClick={() => setPagina((x) => x - 1)} className="rounded border px-2 py-1 disabled:opacity-40">Anterior</button>
            <span>Página {pagina} · {dados.total} conta(s)</span>
            <button type="button" disabled={pagina * 25 >= dados.total} onClick={() => setPagina((x) => x + 1)} className="rounded border px-2 py-1 disabled:opacity-40">Próxima</button>
          </div>
        </>
      )}
    </div>
  );
}

function Provas({ ids, citados }: { ids: string[]; citados?: Record<string, Omit<Fato, "id">> }) {
  if (!ids?.length) return null;
  return (
    <details className="mt-0.5 text-[11px] text-slate-500">
      <summary className="cursor-pointer">provas ({ids.join(", ")})</summary>
      <ul className="mt-0.5 space-y-0.5">{ids.map((id) => <li key={id}><b>{id}</b> {citados?.[id] ? `[${quando(citados[id].em)}] ${citados[id].texto}` : "(fato não guardado)"}</li>)}</ul>
    </details>
  );
}

function FichaDaPessoa({ id, aoVoltar }: { id: number; aoVoltar: () => void }) {
  const [f, setF] = useState<{ nome: string | null; dossie: Dossie; suficiencia: { ok: boolean; motivo: string | null }; custo_estimado_usd: number; analises: Analise[] } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [rodando, setRodando] = useState(false);
  const carregar = () => apiRequest("GET", `/admin/analise/pessoas/${id}`, undefined, undefined, 60000).then(ler).then(setF).catch((e) => setErro(e.message));
  useEffect(() => { void carregar(); }, [id]);

  const analisar = async () => {
    if (!f) return;
    const pouco = !f.suficiencia.ok;
    if (!window.confirm(`${pouco ? `Atenção: ${f.suficiencia.motivo}\n\n` : ""}Rodar a análise agora? Custo estimado: ${usd(f.custo_estimado_usd)}.`)) return;
    setRodando(true); setErro(null);
    try {
      await apiRequest("POST", `/admin/analise/pessoas/${id}/analisar`, { confirmar: true, mesmo_com_pouco_dado: pouco }, undefined, 180000).then(ler);
      await carregar();
    } catch (e: any) { setErro(e.message); } finally { setRodando(false); }
  };

  const a = f?.analises?.[0];
  const r = a?.resultado;
  return (
    <SectionCard
      title={f ? `${f.nome ?? `Conta ${id}`} · ${f.dossie.pessoa.papel}` : "Conta"}
      subtitle={f ? `${[f.dossie.pessoa.cidade, f.dossie.pessoa.uf].filter(Boolean).join("/") || "local não informado"} · ${f.dossie.fatos.length} fatos no dossiê` : undefined}
      action={<button type="button" onClick={aoVoltar} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900"><ChevronLeft className="h-4 w-4" /> Voltar</button>}
    >
      {erro ? <p className="mb-2 text-sm text-red-700">{erro}</p> : null}
      {!f ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm">
            <span>Pelas regras (sem IA): <Temperatura t={f.dossie.temperatura_por_codigo.nivel} /></span>
            <span className="text-xs text-slate-500">{f.dossie.temperatura_por_codigo.motivos.join(" · ") || "sem motivos"}</span>
            <button type="button" disabled={rodando} onClick={() => void analisar()} className="ml-auto inline-flex items-center gap-1 rounded-lg bg-orange-600 px-3 py-1.5 font-semibold text-white disabled:opacity-60">
              {rodando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Analisar com IA · {usd(f.custo_estimado_usd)}
            </button>
          </div>
          {!f.suficiencia.ok ? <p className="text-xs text-amber-700">{f.suficiencia.motivo} Dá para rodar mesmo assim, mas a leitura tende a ficar rasa.</p> : null}

          {r ? (
            <div className="space-y-3 rounded-lg border border-orange-200 bg-orange-50/40 p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <b>Análise de {quando(a!.em)}</b> <Temperatura t={a!.temperatura} de="IA" /> {r.temperatura.diverge_das_regras ? <StatusBadge label="discorda das regras" tone="slate" /> : null}
                <span>chance de fechar em 90 dias: <b>{pct(r.chance_de_fechar_90_dias)}</b></span> <span>perfil: <b>{rotulo(r.categoria_de_perfil)}</b></span>
                <span className="ml-auto text-xs text-slate-500">{usd(a!.custo_usd)}</span>
              </div>
              <p>{r.resumo}</p>
              <div><p className="text-xs text-slate-600">Por que {r.temperatura.nivel}: {r.temperatura.motivo}</p><Provas ids={r.temperatura.provas} citados={r.fatos_citados} /></div>
              <div className="rounded bg-white p-2">
                <p><b>Follow-up:</b> {ACOES[r.follow_up.acao] ?? rotulo(r.follow_up.acao)} · {QUANDO[r.follow_up.quando] ?? r.follow_up.quando}. {r.follow_up.por_que}</p>
                {r.follow_up.mensagem_sugerida ? <p className="mt-1 text-xs text-slate-700">Mensagem sugerida: “{r.follow_up.mensagem_sugerida}”</p> : null}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-700">Traços</p>
                <ul className="mt-1 grid gap-1 sm:grid-cols-2">
                  {r.tracos.map((t) => <li key={t.traco} className="rounded border border-slate-200 bg-white px-2 py-1"><span className="font-semibold">{rotulo(t.traco)}:</span> {rotulo(t.nivel)} <span className="text-[10px] text-slate-500">({t.confianca})</span><Provas ids={t.provas} citados={r.fatos_citados} /></li>)}
                </ul>
              </div>
              {r.alertas.length ? <div><p className="text-xs font-semibold text-red-700">Alertas</p><ul className="list-disc pl-4">{r.alertas.map((x, i) => <li key={i}>{x.texto}<Provas ids={x.provas} citados={r.fatos_citados} /></li>)}</ul></div> : null}
              <div>
                <p className="text-xs font-semibold text-slate-700">Previsões (o código confere quando vencem)</p>
                <ul className="text-xs">{a!.previsoes.map((p, i) => <li key={i}>{PERGUNTAS[p.pergunta] ?? p.pergunta}: {pct(p.probabilidade)} até {quando(p.vence_em)} {p.aconteceu == null ? "· aguardando" : p.aconteceu ? "· aconteceu" : "· não aconteceu"}</li>)}</ul>
              </div>
              {r.lacunas.length ? <p className="text-xs text-slate-600"><b>Falta saber:</b> {r.lacunas.join("; ")}</p> : null}
              {r.o_que_mudaria_a_leitura ? <p className="text-xs text-slate-600"><b>O que mudaria a leitura:</b> {r.o_que_mudaria_a_leitura}</p> : null}
            </div>
          ) : <p className="text-sm text-slate-500">Ainda sem análise da IA para esta conta.</p>}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Números (código)</p>
            <div className="mt-1 grid grid-cols-2 gap-1 text-xs sm:grid-cols-4">
              {Object.entries(f.dossie.numeros).map(([k, v]) => <div key={k} className="rounded border border-slate-200 px-2 py-1"><span className="text-slate-500">{rotulo(k)}</span><br /><b>{v ?? "—"}</b></div>)}
            </div>
          </div>
          <details className="rounded-lg border border-slate-200 p-2 text-xs">
            <summary className="cursor-pointer font-semibold text-slate-700">Dossiê: {f.dossie.fatos.length} fatos (o que a IA lê)</summary>
            <ul className="mt-2 max-h-96 space-y-0.5 overflow-auto">{[...f.dossie.fatos].reverse().map((x) => <li key={x.id}><b>{x.id}</b> [{quando(x.em)}] <span className="text-slate-500">{x.tipo}</span> {x.texto}</li>)}</ul>
            {f.dossie.faltou.length ? <p className="mt-2 text-amber-700">Não deu para ler: {f.dossie.faltou.join("; ")}</p> : null}
          </details>
          {f.analises.length > 1 ? (
            <details className="text-xs"><summary className="cursor-pointer font-semibold text-slate-700">Análises anteriores ({f.analises.length - 1})</summary>
              <ul className="mt-1 space-y-0.5">{f.analises.slice(1).map((x) => <li key={x.id}>{quando(x.em)} · {x.temperatura} · {rotulo(x.categoria)} · chance {pct(x.chance)}</li>)}</ul>
            </details>
          ) : null}
        </div>
      )}
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ Precisão */

type Nota = { conferidas: number; brier: number | null; faixas: { faixa: string; previsoes: number; disse: number | null; aconteceu: number | null }[]; por_pergunta: Record<string, { conferidas: number; aconteceu: number; media_dita: number }> };

function Precisao() {
  const [n, setN] = useState<{ pendentes: number; conferidas_agora: number; geral: Nota; cliente: Nota; profissional: Nota } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => { apiRequest("GET", "/admin/analise/previsoes", undefined, undefined, 120000).then(ler).then(setN).catch((e) => setErro(e.message)); }, []);
  if (erro) return <p className="text-sm text-red-700">{erro}</p>;
  if (!n) return <Loader2 className="h-4 w-4 animate-spin text-slate-400" />;
  const Bloco = ({ titulo, x }: { titulo: string; x: Nota }) => (
    <SectionCard title={titulo} subtitle={x.conferidas ? `${x.conferidas} previsão(ões) conferida(s) · Brier ${x.brier} (0 = perfeita; 0,25 = chute de 50%)` : "Nenhuma previsão vencida ainda"}>
      {x.conferidas ? (
        <table className="text-xs"><thead className="text-slate-500"><tr><th className="pr-3 text-left">A IA disse</th><th className="pr-3">Previsões</th><th className="pr-3">Média dita</th><th>Aconteceu</th></tr></thead>
          <tbody>{x.faixas.map((f) => <tr key={f.faixa}><td className="pr-3">{f.faixa}</td><td className="pr-3 text-center">{f.previsoes}</td><td className="pr-3 text-center">{f.disse == null ? "—" : `${f.disse}%`}</td><td className="text-center">{f.aconteceu == null ? "—" : `${f.aconteceu}%`}</td></tr>)}</tbody>
        </table>
      ) : <p className="text-sm text-slate-500">Assim que os prazos vencerem, a nota aparece aqui.</p>}
    </SectionCard>
  );
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">Bem calibrada é quando, das vezes que a IA diz ~30%, umas 30 em 100 acontecem. {n.pendentes} previsão(ões) aguardando o prazo{n.conferidas_agora ? ` · ${n.conferidas_agora} conferida(s) agora` : ""}.</p>
      <Bloco titulo="Geral" x={n.geral} />
      <div className="grid gap-4 lg:grid-cols-2"><Bloco titulo="Clientes" x={n.cliente} /><Bloco titulo="Profissionais" x={n.profissional} /></div>
    </div>
  );
}

/* ------------------------------------------------------------------ a aba */

const ABAS = [["vendas", "Vendas"], ["pessoas", "Pessoas"], ["precisao", "Precisão da IA"]] as const;

export function AdminAnaliseSection() {
  const [aba, setAba] = useState<(typeof ABAS)[number][0]>("vendas");
  const [pessoa, setPessoa] = useState<number | null>(null);
  const abrir = (id: number) => { setPessoa(id); setAba("pessoas"); };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1" role="tablist">
        {ABAS.map(([k, r]) => (
          <button key={k} type="button" role="tab" aria-selected={aba === k} onClick={() => { setAba(k); if (k !== "pessoas") setPessoa(null); }} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${aba === k ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}>{r}</button>
        ))}
      </div>
      {aba === "vendas" ? <Vendas abrir={abrir} /> : null}
      {aba === "pessoas" ? (pessoa ? <FichaDaPessoa id={pessoa} aoVoltar={() => setPessoa(null)} /> : <ListaDePessoas abrir={abrir} />) : null}
      {aba === "precisao" ? <Precisao /> : null}
    </div>
  );
}
