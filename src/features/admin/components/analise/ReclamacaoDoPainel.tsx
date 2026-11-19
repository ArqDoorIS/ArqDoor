import { Banknote, CheckCircle2, MessageSquareWarning, RotateCcw, ShieldCheck, Star, Undo2 } from "lucide-react";
import type { AdminOperationalStep, AdminOperationalTicket, ReclamacaoDeFase } from "../../types";
import { cn } from "../../utils";
import { quando, reais } from "./comum";
import type { Acao } from "./DetalheDoContrato";

/**
 * Reclamação de fase no painel (19/11/2026, modelo de atos §11).
 *
 * O cliente recusa escrevendo o que está errado; o profissional responde no prazo (reembolso
 * total, desconto, refazer ou discordar); sem resposta, vira disputa e pelos termos de uso o
 * valor volta ao cliente. A ArqDoor decide aqui. O sistema não estorna nem repassa: a
 * ArqDoor faz na Pagar.me e marca "reembolso feito" e "repasse feito". Só depois do
 * reembolso feito o cliente responde no app se quer continuar com o profissional.
 */

const dia = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "—");

export const RESPOSTA: Record<string, string> = {
  reembolso_total: "aceitou devolver o valor da fase",
  desconto: "propôs um desconto",
  refazer: "quer refazer a fase",
  discordo: "discorda da reclamação",
};
export const DECISAO: Record<string, string> = {
  refazer: "Reaberta para o profissional refazer",
  reembolso_total: "Reembolso total ao cliente",
  reembolso_parcial: "Reembolso parcial ao cliente",
  sem_reembolso: "Concluída sem reembolso",
};
const DISPUTA: Record<string, string> = {
  sem_resposta: "o profissional não respondeu no prazo. Pelos termos de uso, o valor da fase volta ao cliente.",
  discordo: "o profissional discorda da reclamação.",
  cliente_recusou: "o cliente não aceitou a proposta do profissional.",
  cliente_sem_resposta: "o cliente não respondeu à proposta no prazo.",
};

/** A reclamação mais recente da fase. */
export const reclamacaoDaFase = (t: AdminOperationalTicket, stepId: number) =>
  (t.reclamacoes ?? []).filter((r) => r.step_id === stepId).slice(-1)[0] ?? null;

export const temReembolso = (r: ReclamacaoDeFase) => r.decisao === "reembolso_total" || r.decisao === "reembolso_parcial";

/** O que a ArqDoor deveria decidir, pelo que os dois fizeram. Null = cabe ao admin. */
export const decisaoSugerida = (r: ReclamacaoDeFase): ReclamacaoDeFase["decisao"] => {
  if (r.situacao !== "com_a_arqdoor") return null;
  if (r.motivo_da_disputa === "sem_resposta") return "reembolso_total";
  if (!r.disputa && r.resposta === "reembolso_total") return "reembolso_total";
  if (!r.disputa && r.cliente_aceitou && r.resposta === "desconto") return "reembolso_parcial";
  if (!r.disputa && r.cliente_aceitou && r.resposta === "refazer") return "refazer";
  return null;
};

/** Uma frase do ponto em que a reclamação está, para o topo e para a lista. */
export const ondeEsta = (r: ReclamacaoDeFase): { texto: string; acao: boolean } => {
  if (r.situacao === "com_o_profissional") return { texto: `Com o profissional: responde até ${dia(r.prazo_ate)}. Sem resposta, o valor volta ao cliente.`, acao: false };
  if (r.situacao === "com_o_cliente") return { texto: `Com o cliente: responde à proposta do profissional até ${dia(r.prazo_ate)}.`, acao: false };
  if (r.situacao === "com_a_arqdoor") {
    const s = decisaoSugerida(r);
    if (r.disputa) return { texto: `Disputa para a ArqDoor decidir: ${DISPUTA[r.motivo_da_disputa ?? ""] ?? ""}`, acao: true };
    return { texto: `Os dois se acertaram: falta a ArqDoor executar (${s ? DECISAO[s].toLowerCase() : "decidir"}).`, acao: true };
  }
  if (temReembolso(r) && !r.reembolso_feito_em) return { texto: `${DECISAO[r.decisao!]} de ${reais(r.valor_reembolso)}: falta fazer na Pagar.me e marcar o reembolso feito.`, acao: true };
  if (r.decisao === "reembolso_parcial" && !r.repasse_feito_em) return { texto: `Falta repassar ${reais(r.valor_ao_profissional)} ao profissional na Pagar.me e marcar o repasse feito.`, acao: true };
  if (r.continuar === false && !r.contrato_encerrado_em) return { texto: "O cliente não quer continuar: devolver as fases pagas e não executadas e encerrar o contrato.", acao: true };
  return { texto: `Resolvida: ${DECISAO[r.decisao ?? ""]?.toLowerCase() ?? "—"}.`, acao: false };
};

/** Fases pagas e não executadas: o que volta ao cliente se ele não continuar. */
export const fasesParaDevolver = (t: AdminOperationalTicket, r: ReclamacaoDeFase) =>
  t.steps.filter((s) => s.id !== r.step_id && s.price > 0 && s.is_financially_cleared && s.status !== "Concluido" && !s.confirm_freelancer && !s.payout_status && !s.payout_paid_at);

/** Botões da ArqDoor para a reclamação da fase, conforme o ponto em que ela está. */
export const acoesDaReclamacao = (r: ReclamacaoDeFase, f: AdminOperationalStep, t: AdminOperationalTicket): Acao[] => {
  const nome = `"${f.title}" do contrato ${t.id}`;
  const sugerida = decisaoSugerida(r);
  const jeito = (d: string) => (sugerida === d ? "principal" : "normal") as Acao["jeito"];
  const decidir = (decisao: NonNullable<ReclamacaoDeFase["decisao"]>) => ({ id: r.id, rota: "decidir", decisao });
  if (r.situacao !== "resolvida") {
    const valorParcial = r.resposta === "desconto" && r.resposta_valor ? r.resposta_valor : Math.round(f.price / 2);
    return [
      {
        chave: "rec_refazer", rotulo: "Reabrir para refazer", icone: <RotateCcw className="h-3.5 w-3.5" />, jeito: jeito("refazer"), reclamacao: decidir("refazer"),
        explica: ["A fase volta para o profissional: ele aperta Iniciar, refaz e entrega de novo, e o cliente confere de novo.", "O dinheiro continua guardado."],
        aviso: {
          cliente: `ArqDoor: reabrimos a fase ${nome} para o profissional refazer. Quando ele entregar de novo, você confere.`,
          profissional: `ArqDoor: reabrimos a fase ${nome} para você refazer. Aperte "Iniciar" no app quando começar.`,
        },
        para: "dois",
      },
      {
        chave: "rec_total", rotulo: "Reembolso total", icone: <Undo2 className="h-3.5 w-3.5" />, jeito: jeito("reembolso_total"), reclamacao: decidir("reembolso_total"),
        explica: [`Os ${reais(f.price)} da fase voltam ao cliente: faça o estorno na Pagar.me e depois marque "reembolso feito".`, "A fase sai do repasse para sempre."],
        aviso: {
          cliente: `ArqDoor: decidimos reembolsar o valor da fase ${nome} (${reais(f.price)}). Avisamos quando o reembolso for feito.`,
          profissional: `ArqDoor: decidimos reembolsar ao cliente o valor da fase ${nome} (${reais(f.price)})${r.motivo_da_disputa === "sem_resposta" ? ", porque a reclamação não teve resposta no prazo, como dizem os termos de uso" : ""}.`,
        },
        para: "dois",
      },
      {
        chave: "rec_parcial", rotulo: "Reembolso parcial", icone: <Banknote className="h-3.5 w-3.5" />, jeito: jeito("reembolso_parcial"), reclamacao: decidir("reembolso_parcial"),
        valor: { rotulo: "Quanto volta ao cliente (R$)", inicial: valorParcial, max: f.price },
        explica: ["Parte do valor volta ao cliente e o resto vai ao profissional, na mesma proporção.", "Os dois na Pagar.me: estorno parcial e repasse parcial. Depois marque cada um como feito."],
        aviso: {
          cliente: `ArqDoor: decidimos reembolsar ${reais(valorParcial)} da fase ${nome}. Avisamos quando o reembolso for feito.`,
          profissional: `ArqDoor: decidimos reembolsar ${reais(valorParcial)} ao cliente na fase ${nome}. O restante da fase será repassado a você.`,
        },
        para: "dois",
      },
      {
        chave: "rec_sem", rotulo: "Liberar sem reembolso", icone: <ShieldCheck className="h-3.5 w-3.5" />, jeito: "normal", reclamacao: decidir("sem_reembolso"),
        explica: ["A fase fica concluída e o valor inteiro fica pronto para repassar ao profissional.", "O cliente responde no app se quer continuar o contrato."],
        aviso: {
          cliente: `ArqDoor: analisamos a reclamação da fase ${nome} e concluímos a fase sem reembolso. O valor foi liberado para o profissional.`,
          profissional: `ArqDoor: analisamos a reclamação da fase ${nome} e concluímos a fase sem reembolso. O valor está liberado para você.`,
        },
        para: "dois",
      },
    ];
  }
  const pendentes: Acao[] = [];
  if (temReembolso(r) && !r.reembolso_feito_em) {
    pendentes.push({
      chave: "rec_reembolso_feito", rotulo: `Marcar reembolso feito (${reais(r.valor_reembolso)})`, icone: <CheckCircle2 className="h-3.5 w-3.5" />, jeito: "principal",
      reclamacao: { id: r.id, rota: "reembolso-feito" }, semMotivo: true,
      explica: ["Só depois de fazer o estorno na Pagar.me.", "O cliente recebe a pergunta se quer continuar o contrato e a nota da ArqDoor."],
      aviso: `ArqDoor: o reembolso de ${reais(r.valor_reembolso)} da fase ${nome} foi feito. Quer continuar o contrato com este profissional? Responda no app.`,
      para: "cliente",
    });
  }
  if (r.decisao === "reembolso_parcial" && !r.repasse_feito_em) {
    pendentes.push({
      chave: "rec_repasse_feito", rotulo: `Marcar repasse feito (${reais(r.valor_ao_profissional)})`, icone: <CheckCircle2 className="h-3.5 w-3.5" />, jeito: r.reembolso_feito_em ? "principal" : "normal",
      reclamacao: { id: r.id, rota: "repasse-feito" }, semMotivo: true,
      explica: ["Só depois de fazer o repasse parcial na Pagar.me.", "A fase fica como repassada."],
      aviso: `ArqDoor: repassamos ${reais(r.valor_ao_profissional)} da fase ${nome} para a sua conta.`,
      para: "profissional",
    });
  }
  return pendentes;
};

/** Encerrar o contrato quando o cliente não quer continuar. */
export const acaoDeEncerrar = (r: ReclamacaoDeFase, t: AdminOperationalTicket): Acao | null => {
  if (r.continuar !== false || r.contrato_encerrado_em) return null;
  const fases = fasesParaDevolver(t, r);
  const total = fases.reduce((s, f) => s + f.price, 0);
  return {
    chave: `encerrar_${r.id}`, rotulo: `Encerrar contrato${total ? ` (devolver ${reais(total)})` : ""}`, icone: <Undo2 className="h-3.5 w-3.5" />, jeito: "perigo",
    reclamacao: { id: r.id, rota: "encerrar-contrato" }, semMotivo: true,
    explica: [
      "O cliente não quer continuar com o profissional.",
      fases.length ? `Devolva na Pagar.me as fases pagas e não executadas: ${fases.map((f) => `${f.title} (${reais(f.price)})`).join(", ")}. Elas saem do repasse.` : "Não há fase paga e não executada para devolver.",
      "As fases já entregues seguem o caminho normal de pagamento ao profissional. O contrato fica encerrado.",
    ],
    aviso: {
      cliente: `ArqDoor: encerramos o contrato ${t.id} como você pediu${total ? ` e devolvemos ${reais(total)} das fases pagas e não executadas` : ""}.`,
      profissional: `ArqDoor: o cliente decidiu não continuar o contrato ${t.id}. As fases que você já entregou seguem o caminho normal de pagamento.`,
    },
    para: "dois",
  };
};

function Estrelas({ nota }: { nota: number | null }) {
  if (!nota) return <span className="text-slate-400">ainda não avaliou</span>;
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${nota} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((i) => <Star key={i} className={cn("h-3.5 w-3.5", i <= nota ? "fill-amber-400 text-amber-400" : "text-slate-300")} />)}
    </span>
  );
}

/** O que aconteceu na reclamação, em ordem, dentro da fase. */
export function CartaoDaReclamacao({ r, t }: { r: ReclamacaoDeFase; t: AdminOperationalTicket }) {
  const onde = ondeEsta(r);
  const cliente = t.contractor?.name ?? "Cliente";
  const profissional = t.provider?.name ?? "Profissional";
  return (
    <div className="mt-2.5 space-y-2 rounded-xl border border-rose-200 bg-rose-50/40 p-3 text-sm md:ml-8" data-testid="reclamacao">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-rose-700">
        <MessageSquareWarning className="h-3.5 w-3.5" />Reclamação {r.aberta_por === "arqdoor" ? "registrada pela ArqDoor" : `de ${cliente}`} · {quando(r.created_at ?? r.createdAt ?? null)}
      </p>
      <blockquote className="whitespace-pre-wrap rounded-lg bg-white px-3 py-2 text-slate-800 ring-1 ring-rose-100">“{r.texto}”</blockquote>
      {r.resposta ? (
        <p className="text-slate-700">
          <b>{profissional}</b> {RESPOSTA[r.resposta]}{r.resposta === "desconto" && r.resposta_valor != null ? ` de ${reais(r.resposta_valor)}` : ""}.
          {r.resposta_texto ? <span className="mt-1 block whitespace-pre-wrap rounded-lg bg-white px-3 py-1.5 text-slate-700 ring-1 ring-slate-100">“{r.resposta_texto}”</span> : null}
        </p>
      ) : null}
      {r.cliente_aceitou != null ? <p className="text-slate-700"><b>{cliente}</b> {r.cliente_aceitou ? "aceitou" : "não aceitou"} a proposta.</p> : null}
      {r.decisao ? (
        <p className="text-slate-700">
          <b>ArqDoor:</b> {DECISAO[r.decisao]}{r.valor_reembolso ? ` · ${reais(r.valor_reembolso)} ao cliente` : ""}{r.decisao === "reembolso_parcial" ? ` · ${reais(r.valor_ao_profissional)} ao profissional` : ""}.
          {r.decisao_motivo ? <span className="text-slate-500"> Motivo: {r.decisao_motivo}</span> : null}
          {r.reembolso_feito_em ? <span className="block text-xs text-emerald-700">Reembolso feito em {quando(r.reembolso_feito_em)}.</span> : null}
          {r.repasse_feito_em ? <span className="block text-xs text-emerald-700">Repasse feito em {quando(r.repasse_feito_em)}.</span> : null}
        </p>
      ) : null}
      {r.continuar != null ? <p className="text-slate-700"><b>{cliente}</b> {r.continuar ? "quer continuar o contrato." : "não quer continuar o contrato."}{r.contrato_encerrado_em ? ` Encerrado em ${quando(r.contrato_encerrado_em)}.` : ""}</p> : null}
      {r.situacao === "resolvida" ? (
        <div className="grid gap-1 text-xs text-slate-600 sm:grid-cols-2">
          <p>Nota de {cliente} à ArqDoor: <Estrelas nota={r.nota_cliente} />{r.comentario_cliente ? <span className="block text-slate-500">“{r.comentario_cliente}”</span> : null}</p>
          <p>Nota de {profissional} à ArqDoor: <Estrelas nota={r.nota_profissional} />{r.comentario_profissional ? <span className="block text-slate-500">“{r.comentario_profissional}”</span> : null}</p>
        </div>
      ) : null}
      <p className={cn("rounded-lg px-2.5 py-1.5 text-xs font-semibold", onde.acao ? "bg-amber-50 text-amber-900" : "bg-white text-slate-600 ring-1 ring-slate-100")}>{onde.texto}</p>
    </div>
  );
}
