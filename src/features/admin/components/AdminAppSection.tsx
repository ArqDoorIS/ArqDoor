import { useEffect, useState } from "react";
import { Loader2, Radio, Star } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { SectionCard, StatusBadge } from "./AdminPrimitives";

/**
 * Aba "Textos e avaliações" (15/11/2026).
 *  - Textos do app: caixas de texto que o app lê do servidor (a primeira é a página do
 *    foguete, o impulsionamento). Salvar atualiza o app de todo mundo na próxima abertura
 *    da página. Backend: GET /admin/textos-do-app, PUT /admin/textos-do-app/:chave.
 *  - Avaliações: as estrelas que o app pede de vez em quando a quem já usou a plataforma.
 *    Backend: GET /admin/avaliacoes-do-app.
 */
type Texto = { chave: string; rotulo: string; titulo: string; texto: string; padrao: { titulo: string; texto: string }; personalizado: boolean; atualizado_em: string | null };
type Avaliacao = { id: number; nota: number; comentario: string | null; plataforma: string | null; versao: string | null; em: string; pessoa: { id: number; nome?: string; email?: string; tipo?: string } };
type RespostaAvaliacoes = { total: number; media: number | null; distribuicao: Record<string, number>; avaliacoes: Avaliacao[]; pagina: number; paginas: number };

const ler = async (res: Response) => {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.message || "Não foi possível falar com o servidor.");
  return body;
};
const quando = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "");
const campo = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-500";

function CaixaDeTexto({ t, limites, aoSalvar }: { t: Texto; limites: { titulo: number; texto: number }; aoSalvar: (t: Texto) => void }) {
  const [titulo, setTitulo] = useState(t.titulo);
  const [texto, setTexto] = useState(t.texto);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; msg: string } | null>(null);
  const mudou = titulo !== t.titulo || texto !== t.texto;

  const salvar = async () => {
    setSalvando(true);
    setAviso(null);
    try {
      await apiRequest("PUT", `/admin/textos-do-app/${t.chave}`, { titulo, texto }).then(ler);
      aoSalvar({ ...t, titulo, texto, personalizado: true, atualizado_em: new Date().toISOString() });
      setAviso({ ok: true, msg: "Salvo. O app mostra o texto novo na próxima vez que a página abrir." });
    } catch (e) {
      setAviso({ ok: false, msg: (e as Error).message });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <SectionCard
      title={t.rotulo}
      subtitle={t.personalizado ? `Texto editado · atualizado em ${quando(t.atualizado_em)}` : "Usando o texto padrão"}
      action={t.personalizado ? <StatusBadge label="Editado" tone="emerald" /> : <StatusBadge label="Padrão" tone="slate" />}
    >
      <div className="space-y-3">
        <label className="block text-xs font-semibold text-slate-600">
          Título
          <input value={titulo} maxLength={limites.titulo} onChange={(e) => setTitulo(e.target.value)} className={`${campo} mt-1`} />
        </label>
        <label className="block text-xs font-semibold text-slate-600">
          Texto (linha em branco separa os parágrafos)
          <textarea value={texto} maxLength={limites.texto} onChange={(e) => setTexto(e.target.value)} rows={9} className={`${campo} mt-1 leading-6`} />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={!mudou || salvando || !titulo.trim() || !texto.trim()} onClick={() => void salvar()} className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Salvar no app
          </button>
          <button type="button" disabled={salvando} onClick={() => { setTitulo(t.padrao.titulo); setTexto(t.padrao.texto); }} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
            Voltar ao padrão
          </button>
          <span className="text-xs text-slate-500">{texto.length}/{limites.texto}</span>
        </div>
        {aviso ? <p className={`text-sm ${aviso.ok ? "text-emerald-700" : "text-red-700"}`}>{aviso.msg}</p> : null}
      </div>
    </SectionCard>
  );
}

function TextosDoApp() {
  const [textos, setTextos] = useState<Texto[] | null>(null);
  const [limites, setLimites] = useState({ titulo: 120, texto: 6000 });
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => {
    apiRequest("GET", "/admin/textos-do-app").then(ler).then((b) => { setTextos(b.textos ?? []); if (b.limites) setLimites(b.limites); }).catch((e) => setErro(e.message));
  }, []);
  if (erro) return <p className="mt-3 text-sm text-red-700">{erro}</p>;
  if (!textos) return <Loader2 className="mt-3 h-4 w-4 animate-spin text-slate-400" />;
  return (
    <div className="mt-2 space-y-3">
      {textos.map((t) => (
        <CaixaDeTexto key={t.chave} t={t} limites={limites} aoSalvar={(n) => setTextos((xs) => (xs ?? []).map((x) => (x.chave === n.chave ? n : x)))} />
      ))}
    </div>
  );
}

function Estrelas({ nota }: { nota: number }) {
  return (
    <span className="inline-flex" aria-label={`${nota} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((i) => <Star key={i} className={`h-4 w-4 ${i <= nota ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />)}
    </span>
  );
}

function Avaliacoes() {
  const [dados, setDados] = useState<RespostaAvaliacoes | null>(null);
  const [pagina, setPagina] = useState(1);
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => {
    setDados(null);
    apiRequest("GET", `/admin/avaliacoes-do-app?pagina=${pagina}`).then(ler).then(setDados).catch((e) => setErro(e.message));
  }, [pagina]);
  if (erro) return <p className="mt-3 text-sm text-red-700">{erro}</p>;
  if (!dados) return <Loader2 className="mt-3 h-4 w-4 animate-spin text-slate-400" />;
  const maior = Math.max(1, ...Object.values(dados.distribuicao));
  return (
    <div className="mt-2 space-y-3">
      <SectionCard title="Avaliações do app" subtitle={dados.total ? `${dados.total} ${dados.total === 1 ? "avaliação" : "avaliações"}` : "Ninguém avaliou ainda"}>
        <div className="flex flex-wrap items-start gap-8">
          <div>
            <div className="text-4xl font-semibold text-slate-900">{dados.media ?? "–"}</div>
            {dados.media ? <Estrelas nota={Math.round(dados.media)} /> : null}
          </div>
          <div className="min-w-[220px] flex-1 space-y-1">
            {[5, 4, 3, 2, 1].map((n) => (
              <div key={n} className="flex items-center gap-2 text-xs text-slate-600">
                <span className="w-3 text-right">{n}</span>
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-amber-400" style={{ width: `${((dados.distribuicao[n] ?? 0) / maior) * 100}%` }} /></div>
                <span className="w-8 text-right">{dados.distribuicao[n] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>
      {dados.avaliacoes.length ? (
        <SectionCard title="Últimas avaliações">
          <div className="divide-y divide-slate-100">
            {dados.avaliacoes.map((a) => (
              <div key={a.id} className="flex items-start justify-between gap-3 py-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-800">{a.pessoa?.nome ?? `Usuário ${a.pessoa?.id}`}{a.pessoa?.email ? ` · ${a.pessoa.email}` : ""}</div>
                  <div className="text-xs text-slate-500">{a.pessoa?.tipo === "contratante" ? "Cliente" : a.pessoa?.tipo ? "Profissional" : ""}{a.plataforma ? ` · ${a.plataforma}` : ""}{a.versao ? ` · versão ${a.versao}` : ""}</div>
                  {a.comentario ? <p className="mt-1 text-sm text-slate-700">“{a.comentario}”</p> : null}
                </div>
                <div className="shrink-0 text-right text-xs text-slate-500">
                  <Estrelas nota={a.nota} />
                  <div>{quando(a.em)}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <button type="button" disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)} className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-50">Anterior</button>
            <span className="text-slate-500">Página {dados.pagina} de {dados.paginas}</span>
            <button type="button" disabled={pagina >= dados.paginas} onClick={() => setPagina(pagina + 1)} className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-50">Próxima</button>
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}

/**
 * Telemetria do app (26/11/2026).
 * Liga e desliga o envio de eventos do app ao PostHog. A rota /eventos continua funcionando
 * independente desta chave; o que muda e o PostHog em especifico.
 * Nao confundir com "Ligar o PostHog" na aba Analise, que configura uma chave pessoal de
 * leitura para buscar dados do PostHog no painel. Sao coisas diferentes.
 */
function TelemetriaDoApp() {
  const [ligada, setLigada] = useState<boolean | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    apiRequest("GET", "/admin/telemetria").then(ler).then((b) => { setLigada(b?.telemetria_ligada !== false); }).catch((e) => setAviso({ ok: false, msg: e.message }));
  }, []);

  const alternar = async () => {
    if (ligada == null) return;
    const nova = !ligada;
    setSalvando(true);
    setAviso(null);
    try {
      await apiRequest("PUT", "/admin/telemetria", { telemetria_ligada: nova }).then(ler);
      setLigada(nova);
      setAviso({ ok: true, msg: nova ? "Telemetria do app ligada. O app voltara a enviar eventos ao PostHog." : "Telemetria do app desligada. O app para de enviar eventos ao PostHog. A rota /eventos continua funcionando normalmente." });
    } catch (e) {
      setAviso({ ok: false, msg: (e as Error).message });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <SectionCard
      title="Telemetria do app"
      dica="Liga ou desliga o envio de eventos do app ao PostHog (cliques, telas abertas, acoes). Desligar nao afeta a rota /eventos nem os dados que ja estao no PostHog. Nao confundir com &ldquo;Ligar o PostHog&rdquo; na aba Analise, que e uma chave pessoal de leitura."
      subtitle={ligada == null ? "Carregando..." : ligada ? "Ligada - o app envia eventos ao PostHog" : "Desligada - nenhum evento vai ao PostHog"}
      action={ligada != null ? <StatusBadge label={ligada ? "Ligada" : "Desligada"} tone={ligada ? "emerald" : "slate"} /> : null}
    >
      <div className="space-y-3">
        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <Radio className={`mt-0.5 h-5 w-5 shrink-0 ${ligada ? "text-emerald-600" : "text-slate-400"}`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900">PostHog - envio de eventos do app</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Quando ligado, o app envia ao PostHog cada acao (tela aberta, botao clicado, visita realizada).
              Desligar interrompe so o PostHog; a rota <code className="font-mono">/eventos</code> continua recebendo e guardando tudo.
            </p>
          </div>
          {ligada == null ? (
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          ) : (
            <button
              type="button"
              disabled={salvando}
              onClick={() => void alternar()}
              data-testid="btn-telemetria"
              aria-pressed={ligada}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none disabled:opacity-60 ${ligada ? "bg-emerald-500" : "bg-slate-300"}`}
            >
              <span className="sr-only">{ligada ? "Desligar telemetria" : "Ligar telemetria"}</span>
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${ligada ? "translate-x-6" : "translate-x-1"}`}
              />
            </button>
          )}
        </div>
        {aviso ? (
          <p
            role="status"
            data-testid="aviso-telemetria"
            className={`rounded-lg px-3 py-2 text-xs font-semibold ${aviso.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`}
          >
            {aviso.msg}
          </p>
        ) : null}
      </div>
    </SectionCard>
  );
}

export function AdminAppSection() {
  const [parte, setParte] = useState<"textos" | "avaliacoes" | "telemetria">("textos");
  return (
    <div>
      <div className="mt-2 inline-flex rounded-xl border border-slate-200 bg-white p-1">
        {([["textos", "Textos do app"], ["avaliacoes", "Avaliações"], ["telemetria", "Telemetria"]] as const).map(([k, n]) => (
          <button key={k} type="button" onClick={() => setParte(k)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${parte === k ? "bg-orange-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
            {n}
          </button>
        ))}
      </div>
      {parte === "textos" ? <TextosDoApp /> : parte === "avaliacoes" ? <Avaliacoes /> : <div className="mt-2"><TelemetriaDoApp /></div>}
    </div>
  );
}
