/**
 * Sinais da conversa com a IA (19/11/2026): fatos objetivos que a IA marcou por trás, cada
 * um com a frase exata da pessoa que prova, já conferida pelo backend
 * (services/ai/sinaisDaConversa.js). Vão para o palpite do Kirios. Só o admin vê.
 */
export type Sinal = { sinal: string; valor: string; prova: string; confianca?: string; origem?: string; em?: string; motivo?: string };

const NOMES: Record<string, string> = {
  estagio: "Estágio",
  so_orcando: "Só orçando",
  data_confirmada: "Data confirmada",
  pressa: "Pressa",
  quem_decide: "Quem decide",
};
const VALORES: Record<string, string> = {
  pesquisando: "pesquisando", comparando: "comparando", decidido: "decidido",
  sim: "sim", nao: "não",
  urgente: "urgente", ate_30_dias: "em até 30 dias", tempo_razoavel: "em tempo razoável", sem_pressa: "sem pressa",
  sozinho: "sozinho", com_outra_pessoa: "com outra pessoa",
};
const nome = (s: string) => NOMES[s] ?? s;
const valor = (v: string) => VALORES[v] ?? v;

function Linha({ s, recusado }: { s: Sinal; recusado?: boolean }) {
  return (
    <li className={recusado ? "text-slate-400 line-through decoration-slate-300" : undefined}>
      <span className="font-semibold text-slate-800">{nome(s.sinal)}:</span> {valor(s.valor)}
      {s.origem === "botao" ? <span className="ml-1 rounded bg-slate-100 px-1 text-[10px] text-slate-600">botão</span> : null}
      {s.confianca === "media" ? <span className="ml-1 rounded bg-amber-50 px-1 text-[10px] text-amber-700">confiança média</span> : null}
      {s.prova ? <span className="text-slate-500"> · “{s.prova}”</span> : null}
      {recusado && s.motivo ? <span className="ml-1 text-[10px] text-red-600 no-underline">({s.motivo})</span> : null}
    </li>
  );
}

/** O retrato da conversa ou do pedido: o mais recente de cada sinal. */
export function SinaisConsolidados({ sinais, titulo = "Sinais da conversa (privado)" }: { sinais?: Record<string, Sinal> | null; titulo?: string }) {
  const lista = Object.values(sinais ?? {});
  if (!lista.length) return null;
  return (
    <div className="mt-2 text-xs text-slate-600">
      <p className="font-semibold text-slate-800">{titulo}</p>
      <ul className="mt-0.5 space-y-0.5">{lista.map((s) => <Linha key={s.sinal} s={s} />)}</ul>
    </div>
  );
}

/** O que a IA marcou num turno: aceitos e, riscados, os que a conferência recusou. */
export function SinaisDoTurno({ s }: { s: { aceitos?: Sinal[]; recusados?: Sinal[] } }) {
  const aceitos = s.aceitos ?? [];
  const recusados = s.recusados ?? [];
  if (!aceitos.length && !recusados.length) return null;
  return (
    <details className="mt-1 text-[11px] text-slate-600">
      <summary className="cursor-pointer font-semibold">Sinais ({aceitos.length}{recusados.length ? ` · ${recusados.length} recusado${recusados.length === 1 ? "" : "s"}` : ""})</summary>
      <ul className="mt-1 space-y-0.5">
        {aceitos.map((x, i) => <Linha key={`a${i}`} s={x} />)}
        {recusados.map((x, i) => <Linha key={`r${i}`} s={x} recusado />)}
      </ul>
    </details>
  );
}
