import { useCallback, useEffect, useState, type ComponentType, type ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Ampersand, Banknote, Boxes, CheckCircle2, CircleHelp, Download, EyeOff, FileText, Filter, Flame, Gem, Hourglass, Loader2,
  MessageCircle, Repeat, Scale, Snowflake, Sprout, ThermometerSun, User, Users, X, Zap, DollarSign, Hammer,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "../../utils";
import type { Papel, Temp } from "./tipos";

/* ---------- servidor ---------- */
export const ler = async (res: Response) => {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.message || "Não foi possível falar com o servidor.");
  return body;
};

/** GET com carregando/erro e um "de novo". `caminho` null não busca. */
export function useApi<T>(caminho: string | null, tempo = 60000) {
  const [dado, setDado] = useState<T | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [vez, setVez] = useState(0);
  useEffect(() => {
    if (!caminho) return;
    let vivo = true;
    setErro(null);
    apiRequest("GET", caminho, undefined, undefined, tempo).then(ler)
      .then((b) => { if (vivo) setDado(b as T); })
      .catch((e) => { if (vivo) setErro(e.message); });
    return () => { vivo = false; };
  }, [caminho, vez, tempo]);
  const deNovo = useCallback(() => setVez((x) => x + 1), []);
  return { dado, erro, deNovo, carregando: !dado && !erro };
}

/* ---------- formatos ---------- */
export const quando = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—");
export const dia = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "—");
export const haQuanto = (iso?: string | null) => {
  if (!iso) return "—";
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return d <= 0 ? "hoje" : d === 1 ? "há 1 dia" : `há ${d} dias`;
};
export const reais = (v?: number | null) => (v == null ? "—" : v >= 10000 ? `R$ ${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : `R$ ${Math.round(v).toLocaleString("pt-BR")}`);
export const usd = (v?: number | string | null) => `US$ ${Number(v || 0).toFixed(3).replace(".", ",")}`;
/** chance pode vir 0 a 1 (IA) ou 0 a 100 (agregado). */
export const pct = (v?: number | string | null) => (v == null || v === "" ? "—" : `${Math.round(Number(v) <= 1 ? Number(v) * 100 : Number(v))}%`);
export const pctNum = (v?: number | string | null) => (v == null || v === "" ? 0 : Math.round(Number(v) <= 1 ? Number(v) * 100 : Number(v)));
export const rotulo = (s?: string | null) => (s ? s.replace(/_/g, " ") : "—");
export const parte = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

/* ---------- textos ---------- */
export const NOME_CATEGORIA: Record<string, string> = {
  decidido_com_pressa: "Decidido com pressa", comparador_criterioso: "Comparador criterioso", exigente_detalhista: "Exigente e detalhista",
  pesquisador_de_preco: "Pesquisador de preço", indeciso: "Indeciso", recorrente: "Recorrente", sumido: "Sumido",
  ativo_e_rapido: "Ativo e rápido", seletivo: "Seletivo", premium: "Premium", iniciante_buscando_clientes: "Iniciante buscando clientes",
  sobrecarregado: "Sobrecarregado", volume_preco_baixo: "Volume com preço baixo", sem_dados: "Sem dados",
};
export const COMO_RECONHECE: Record<string, string> = {
  decidido_com_pressa: "disse urgente ou data certa; abre propostas no mesmo dia", comparador_criterioso: "abre 3+ perfis e compara propostas",
  exigente_detalhista: "pede ajuste e reabre a proposta várias vezes", pesquisador_de_preco: "disse que só está orçando; sem data",
  indeciso: "edita o pedido e some no orçamento", recorrente: "já fechou antes e voltou", sumido: "30+ dias sem abrir o app",
  ativo_e_rapido: "responde convite em menos de 3 h", seletivo: "recusa a maioria; fecha os que aceita", premium: "preço acima da média e nota alta",
  iniciante_buscando_clientes: "conta nova, poucas avaliações", sobrecarregado: "abre e não responde; agenda cheia", volume_preco_baixo: "manda muita oferta barata",
  sem_dados: "pouco dado para classificar",
};
export const ACOES: Record<string, string> = {
  mensagem_no_app: "Mandar mensagem no app", ligar: "Ligar", oferecer_outros_profissionais: "Oferecer outros profissionais",
  ajudar_a_completar_o_pedido: "Ajudar a completar o pedido", lembrar_de_responder: "Lembrar de responder", reativar: "Reativar",
  esperar: "Esperar", nada_a_fazer: "Nada a fazer",
};
export const QUANDO: Record<string, string> = { hoje: "hoje", esta_semana: "esta semana", em_15_dias: "em 15 dias", sem_pressa: "sem pressa" };
export const PERGUNTAS: Record<string, string> = { fecha_contrato: "Fecha contrato", publica_novo_pedido: "Publica novo pedido", volta_ao_app: "Volta ao app", cancela_contrato: "Cancela contrato", envia_oferta: "Envia oferta", responde_convite: "Responde convite" };
export const nomeCategoria = (c?: string | null) => (c ? NOME_CATEGORIA[c] ?? rotulo(c) : "—");

/* ---------- ícones ---------- */
type Icone = ComponentType<{ className?: string }>;
export const ICONE_CATEGORIA: Record<string, Icone> = {
  decidido_com_pressa: Zap, comparador_criterioso: Scale, exigente_detalhista: Gem, pesquisador_de_preco: DollarSign, indeciso: CircleHelp,
  recorrente: Repeat, sumido: EyeOff, ativo_e_rapido: Zap, seletivo: Filter, premium: Gem, iniciante_buscando_clientes: Sprout,
  sobrecarregado: Hourglass, volume_preco_baixo: Boxes, sem_dados: Ampersand,
};
export const ICONE_GRUPO: Record<string, Icone> = {
  "Do download à conta": Download, "Montou o pedido": FileText, "Escolheu o profissional": Users, "Fechou": CheckCircle2,
  "Montou o perfil": User, "Recebeu trabalho": MessageCircle,
};
export const ICONE_PAPEL: Record<Papel, Icone> = { cliente: User, profissional: Hammer };
export const ICONE_TEMP: Record<Temp, Icone> = { quente: Flame, morno: ThermometerSun, frio: Snowflake };
export const COR_TEMP: Record<Temp, { texto: string; fundo: string; barra: string }> = {
  quente: { texto: "text-rose-600", fundo: "bg-rose-50", barra: "bg-rose-500" },
  morno: { texto: "text-amber-600", fundo: "bg-amber-50", barra: "bg-amber-500" },
  frio: { texto: "text-sky-600", fundo: "bg-sky-50", barra: "bg-sky-500" },
};
export { Banknote };

export function SeloTemp({ t, extra }: { t?: Temp | null; extra?: string }) {
  if (!t) return <span className="text-xs text-slate-400">sem análise</span>;
  const I = ICONE_TEMP[t];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold capitalize", COR_TEMP[t].texto, COR_TEMP[t].fundo)}>
      <I className="h-3.5 w-3.5" />{t}{extra ? <span className="font-medium normal-case">{extra}</span> : null}
    </span>
  );
}

/** Etiqueta com o mesmo código da conta no PostHog (distinct_id = id do usuário). */
export const urlPosthog = (id: number) => `https://us.posthog.com/project/715328/person/${id}`;
export function EtiquetaPH({ id, leve }: { id: number; leve?: boolean }) {
  return (
    <a
      href={urlPosthog(id)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
      title="Abrir esta pessoa no PostHog (o mesmo código da conta)"
      className={cn("inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-[11px] font-bold no-underline", leve ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200" : "bg-blue-600 text-white")}
    >
      PH #{id}
    </a>
  );
}

export function Carregando() { return <Loader2 className="h-4 w-4 animate-spin text-slate-400" />; }
export function Erro({ msg }: { msg: string }) { return <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{msg}</p>; }

/* ---------- janela de detalhes ---------- */
export type ConteudoJanela = { titulo: ReactNode; sub?: ReactNode; corpo: ReactNode } | null;
export function Janela({ conteudo, fechar }: { conteudo: ConteudoJanela; fechar: () => void }) {
  return (
    <DialogPrimitive.Root open={!!conteudo} onOpenChange={(o) => { if (!o) fechar(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-900/45 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 max-h-[88vh] w-[min(920px,94vw)] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-2xl bg-white p-5 shadow-2xl data-[state=open]:animate-in data-[state=open]:fade-in-0">
          {conteudo ? (
            <>
              <div className="mb-3 flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <DialogPrimitive.Title className="text-lg font-semibold text-slate-950">{conteudo.titulo}</DialogPrimitive.Title>
                  {conteudo.sub ? <DialogPrimitive.Description className="mt-0.5 text-sm text-slate-500">{conteudo.sub}</DialogPrimitive.Description> : <DialogPrimitive.Description className="sr-only">Detalhes</DialogPrimitive.Description>}
                </div>
                <DialogPrimitive.Close className="rounded-full bg-slate-100 p-1.5 text-slate-600 hover:bg-slate-200" aria-label="Fechar"><X className="h-4 w-4" /></DialogPrimitive.Close>
              </div>
              <div className="space-y-4 text-sm">{conteudo.corpo}</div>
            </>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** Quatro números no topo de uma janela. */
export function MiniKpis({ itens }: { itens: [string, ReactNode, ReactNode?][] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {itens.map(([r, v, a], i) => (
        <div key={i} className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{r}</p>
          <p className={cn("my-0.5 font-bold text-slate-950", String(v).length > 14 ? "text-sm" : "text-xl")}>{v}</p>
          {a ? <p className="text-xs text-slate-400">{a}</p> : null}
        </div>
      ))}
    </div>
  );
}

export function Bloco({ titulo, icone: I, children, fonte }: { titulo: string; icone?: Icone; children: ReactNode; fonte?: string }) {
  return (
    <section className="rounded-xl border border-slate-200 p-3">
      <h5 className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-600">
        {I ? <I className="h-3.5 w-3.5 text-orange-500" /> : null}{titulo}
        {fonte ? <span className="ml-auto rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-slate-500">{fonte}</span> : null}
      </h5>
      {children}
    </section>
  );
}

/** Barras horizontais com rótulo, barra e número. */
export function Barras({ linhas, total, cor = "bg-orange-400", porcentagem }: { linhas: [string, number, string?][]; total: number; cor?: string; porcentagem?: boolean }) {
  if (!linhas.length) return <p className="text-xs text-slate-400">Sem dado.</p>;
  return (
    <div className="space-y-1.5">
      {linhas.map(([r, v, extra], i) => (
        <div key={i} className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] items-center gap-2 text-xs">
          <span className="truncate text-slate-700" title={r}>{r}</span>
          <span className="h-2 overflow-hidden rounded-full bg-slate-100"><i className={cn("block h-full rounded-full", cor)} style={{ width: `${Math.max(2, porcentagem ? v : parte(v, total))}%` }} /></span>
          <span className="whitespace-nowrap text-slate-500"><b className="text-slate-900">{porcentagem ? `${v}%` : v}</b>{porcentagem ? "" : ` · ${parte(v, total)}%`}{extra ? <small className="ml-1 text-slate-400">{extra}</small> : null}</span>
        </div>
      ))}
    </div>
  );
}

/** Botões em pílula (Cliente / Profissional, 7/30/90 dias...). */
export function Alternador<T extends string>({ valor, opcoes, mudar }: { valor: T; opcoes: [T, string, Icone?][]; mudar: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-full bg-slate-100 p-0.5" role="group">
      {opcoes.map(([v, r, I]) => (
        <button key={v} type="button" onClick={() => mudar(v)} className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition", valor === v ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800")}>
          {I ? <I className="h-3.5 w-3.5" /> : null}{r}
        </button>
      ))}
    </div>
  );
}

export function Pilula({ ativo, children, onClick }: { ativo?: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn("inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition", ativo ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-400")}>
      {children}
    </button>
  );
}
