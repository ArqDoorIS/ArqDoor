import { useState, type ReactNode } from "react";
import { AlertTriangle, Banknote, Check, CheckCircle2, Clock, FileText, Loader2, MessageSquare, Undo2, Play, RotateCcw, ShieldCheck, Lock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { cn, openSecureFile } from "../../utils";
import type { AdminOperationalStep, AdminOperationalTicket, AdminUserOperationsOverview, Participant } from "../../types";
import { EtiquetaPH, ler, quando, reais } from "./comum";

/**
 * Detalhe do contrato no Investigar › Conta (19/11/2026).
 *
 * Mostra o contrato como ele funciona: grupos de pagamento (o cliente paga o grupo inteiro)
 * e, dentro de cada grupo, as fases (o dinheiro sai fase a fase). Cada fase diz em palavras
 * onde está e traz só os botões que fazem sentido naquele ponto. Todo botão abre uma
 * confirmação com o que vai acontecer, pede o motivo (vai para o registro do painel) e, se
 * marcado, avisa as duas pessoas no chat da ArqDoor.
 *
 * Por baixo usa os caminhos que o painel já tinha:
 *   POST /admin/steps/:id/status     muda a fase (o servidor recusa mudar fase já repassada)
 *   POST /admin/transfers/:id/pay    repassa ao profissional as fases prontas
 *   POST /admin/message              mensagem da ArqDoor no chat de cada pessoa
 * "Liberar" aprova a fase (entrega e aprovação) e deixa o valor pronto para repasse; o
 * repasse em si continua no botão "Repassar", para o dinheiro nunca sair sem alguém ver.
 */

type StatusFase = "Pendente" | "Em Andamento" | "Concluido" | "Recusado";
type Estado = "a_pagar" | "nao_comecou" | "em_andamento" | "entregue" | "recusada" | "aprovada" | "pronta" | "repasse_andamento" | "repassada";
type Fase = AdminOperationalStep & { numero: number; estado: Estado };

const DIA = 86400000;

export const estadoDaFase = (s: AdminOperationalStep): Estado => {
  if (s.payout_status === "processando") return "repasse_andamento";
  if (s.payout_status || s.payout_paid_at) return "repassada";
  if (!s.is_financially_cleared) return "a_pagar";
  if (s.status === "Recusado") return "recusada";
  if (s.status === "Concluido") return s.payout_ready ? "pronta" : "aprovada";
  if (s.status === "Em Andamento") return s.confirm_freelancer ? "entregue" : "em_andamento";
  return "nao_comecou";
};

const ESTADO: Record<Estado, { texto: string; cor: string }> = {
  a_pagar: { texto: "Esperando o cliente pagar", cor: "bg-slate-100 text-slate-600" },
  nao_comecou: { texto: "Paga, ainda não começou", cor: "bg-slate-100 text-slate-700" },
  em_andamento: { texto: "Em andamento", cor: "bg-sky-50 text-sky-700" },
  entregue: { texto: "Entregue, esperando o cliente conferir", cor: "bg-amber-50 text-amber-800" },
  recusada: { texto: "Recusada pelo cliente", cor: "bg-rose-50 text-rose-700" },
  aprovada: { texto: "Aprovada", cor: "bg-emerald-50 text-emerald-700" },
  pronta: { texto: "Aprovada, pronta para repassar", cor: "bg-emerald-50 text-emerald-700" },
  repasse_andamento: { texto: "Repasse em andamento", cor: "bg-emerald-50 text-emerald-700" },
  repassada: { texto: "Repassada ao profissional", cor: "bg-emerald-600 text-white" },
};

const STATUS_CONTRATO: Record<string, string> = { pendente: "Esperando assinar e pagar", "em andamento": "Em andamento", "concluída": "Concluído", cancelada: "Cancelado" };
const STATUS_PAGAMENTO: Record<string, string> = {
  awaiting_deposit: "esperando o 1º pagamento", deposit_pending: "1º pagamento em processamento", deposit_paid: "1º pagamento feito",
  awaiting_steps: "esperando pagar as fases", partial_steps: "parte das fases paga", steps_paid: "todas as fases pagas",
};

const prazoDe = (t: AdminOperationalTicket) => t.prazo_conferencia_dias ?? 3;
/** Quando vence a conferência do cliente (entrega + prazo do contrato). */
const venceEm = (s: AdminOperationalStep, dias: number) => (s.delivered_at ? new Date(new Date(s.delivered_at).getTime() + dias * DIA) : null);
const diaCurto = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

/* ---------- ações ---------- */

type Para = "dois" | "cliente" | "profissional";
type Acao = {
  chave: string;
  rotulo: string;
  icone: ReactNode;
  jeito: "principal" | "normal" | "perigo";
  /** Muda a fase para este status. Sem status, a ação só manda o aviso. */
  status?: StatusFase;
  repassar?: boolean;
  explica: string[];
  /** O aviso no chat: o mesmo texto para os dois, ou um texto para cada um. */
  aviso: string | Avisos;
  para: Para;
  bloqueada?: string;
};

type Avisos = { cliente: string; profissional: string };

/** Dinheiro liberado porque o cliente não conferiu no prazo: cada um lê o que é dele. */
const avisoDoPrazo = (t: AdminOperationalTicket, f: AdminOperationalStep): Avisos => {
  const dias = prazoDe(t);
  return {
    cliente: `ArqDoor: o prazo de ${dias} dias para você conferir a fase "${f.title}" do contrato ${t.id} acabou sem resposta, então ela foi aprovada automaticamente. O valor de ${reais(f.price)} foi liberado para o profissional. Se algo não ficou certo, fale com a gente por aqui.`,
    profissional: `ArqDoor: a fase "${f.title}" do contrato ${t.id} foi aprovada porque o prazo de ${dias} dias para o cliente conferir acabou. O valor de ${reais(f.price)} foi liberado para você.`,
  };
};

/** Dinheiro liberado com a concordância dos dois. */
const avisoDoAcordo = (t: AdminOperationalTicket, f: AdminOperationalStep): Avisos => ({
  cliente: `ArqDoor: como você e o profissional concordaram, a fase "${f.title}" do contrato ${t.id} foi aprovada. O valor de ${reais(f.price)} foi liberado para o profissional.`,
  profissional: `ArqDoor: o cliente concordou e a fase "${f.title}" do contrato ${t.id} foi aprovada. O valor de ${reais(f.price)} foi liberado para você.`,
});

/** O grupo é pago de uma vez: o lembrete de pagar fica no grupo, não em cada fase. */
const lembrarDePagar = (t: AdminOperationalTicket, grupo: string, valor: number): Acao => ({
  chave: "lembrar", rotulo: "Lembrar o cliente de pagar", icone: <MessageSquare className="h-3.5 w-3.5" />, jeito: "normal",
  explica: ["Nada muda no contrato: só vai uma mensagem da ArqDoor para o cliente."],
  aviso: `ArqDoor: o grupo "${grupo}" do contrato ${t.id} (${reais(valor)}) está esperando o pagamento para a obra seguir. Qualquer dúvida, fale com a gente por aqui.`,
  para: "cliente",
});

const acoesDaFase = (f: Fase, t: AdminOperationalTicket): Acao[] => {
  const ref = `a fase "${f.title}" do contrato ${t.id}`;
  const dias = prazoDe(t);
  const vence = venceEm(f, dias);
  const prazoAcabou = !vence || vence.getTime() <= Date.now();
  const liberarAcordo: Acao = {
    chave: "liberar_acordo", rotulo: "Liberar: os dois concordaram", icone: <ShieldCheck className="h-3.5 w-3.5" />, jeito: "normal", status: "Concluido",
    explica: ["A fase fica aprovada (entrega e aprovação marcadas pelo admin).", `${reais(f.price)} fica pronto para repassar ao profissional.`, "O repasse continua no botão Repassar, lá em cima."],
    aviso: avisoDoAcordo(t, f),
    para: "dois",
  };
  // Fase já aprovada (pelo cliente, sozinha pelo prazo ou já repassada): nada muda, só o
  // aviso certo de como o dinheiro foi liberado, um texto para cada um.
  const pelaAprovacao = f.auto_approved_at ? "prazo" : "acordo";
  const avisarLiberacao: Acao[] = [
    { chave: "avisar_prazo", rotulo: "Avisar: liberado pelo prazo", icone: <Clock className="h-3.5 w-3.5" />, jeito: pelaAprovacao === "prazo" ? "principal" : "normal",
      explica: ["Nada muda no contrato: só vai o aviso no chat da ArqDoor.", `O cliente fica sabendo que o prazo de ${dias} dias acabou e o dinheiro foi liberado; o profissional, que o valor foi liberado para ele.`],
      aviso: avisoDoPrazo(t, f), para: "dois" },
    { chave: "avisar_acordo", rotulo: "Avisar: liberado com acordo", icone: <ShieldCheck className="h-3.5 w-3.5" />, jeito: pelaAprovacao === "acordo" ? "principal" : "normal",
      explica: ["Nada muda no contrato: só vai o aviso no chat da ArqDoor.", "Cada um recebe a mensagem de que a fase foi aprovada com a concordância dos dois."],
      aviso: avisoDoAcordo(t, f), para: "dois" },
  ];
  switch (f.estado) {
    case "nao_comecou":
      return [{
        chave: "comecar", rotulo: "Começar a fase", icone: <Play className="h-3.5 w-3.5" />, jeito: "principal", status: "Em Andamento",
        explica: ["A fase passa para em andamento, como se o profissional tivesse iniciado."],
        aviso: `ArqDoor: ${ref} foi marcada como em andamento.`, para: "dois",
      }];
    case "em_andamento":
      return [
        { ...liberarAcordo, chave: "concluir", rotulo: "Concluir pelo admin", icone: <CheckCircle2 className="h-3.5 w-3.5" />, jeito: "normal",
          aviso: `ArqDoor: ${ref} foi concluída pela equipe da ArqDoor. O valor de ${reais(f.price)} está liberado para o profissional.` },
        { chave: "voltar_inicio", rotulo: "Voltar para não começou", icone: <Undo2 className="h-3.5 w-3.5" />, jeito: "perigo", status: "Pendente",
          explica: ["A fase volta para o começo. O dinheiro continua guardado."], aviso: `ArqDoor: ${ref} voltou para "não começou".`, para: "dois" },
      ];
    case "entregue":
      return [
        {
          chave: "liberar_prazo", rotulo: "Liberar: o prazo acabou", icone: <Clock className="h-3.5 w-3.5" />, jeito: "principal", status: "Concluido",
          bloqueada: prazoAcabou ? undefined : `O prazo de conferência de ${dias} dias vence em ${diaCurto(vence!)}`,
          explica: [`O cliente não conferiu em ${dias} dias depois da entrega: a fase fica aprovada.`, `${reais(f.price)} fica pronto para repassar ao profissional.`],
          aviso: avisoDoPrazo(t, f),
          para: "dois",
        },
        // Prazo ainda correndo: o caminho que sobra é o acordo, então ele vira o principal.
        prazoAcabou ? liberarAcordo : { ...liberarAcordo, jeito: "principal" },
        { chave: "recusar", rotulo: "Recusar a entrega", icone: <RotateCcw className="h-3.5 w-3.5" />, jeito: "perigo", status: "Recusado",
          explica: ["A entrega é recusada em nome do cliente. O profissional precisa refazer e entregar de novo.", "O dinheiro continua guardado."],
          aviso: `ArqDoor: a entrega da ${ref.replace("a fase", "fase")} foi recusada e precisa ser refeita.`, para: "dois" },
      ];
    case "recusada":
      return [
        { chave: "refazer", rotulo: "Mandar refazer", icone: <RotateCcw className="h-3.5 w-3.5" />, jeito: "principal", status: "Em Andamento",
          explica: ["A fase volta para em andamento: o profissional refaz e entrega de novo, e o cliente confere de novo.", "O dinheiro continua guardado."],
          aviso: `ArqDoor: ${ref} voltou para em andamento para ser refeita. Quando terminar, o profissional entrega de novo e o cliente confere.`, para: "dois" },
        liberarAcordo,
      ];
    case "aprovada":
    case "pronta":
      return [...avisarLiberacao, {
        chave: "voltar", rotulo: "Voltar para em andamento", icone: <Undo2 className="h-3.5 w-3.5" />, jeito: "perigo", status: "Em Andamento",
        explica: ["A aprovação é desfeita: o profissional entrega de novo e o cliente confere de novo.", "O valor sai de pronto para repassar e volta a ficar guardado."],
        aviso: `ArqDoor: ${ref} voltou para em andamento.`, para: "dois",
      }];
    case "repasse_andamento":
    case "repassada":
      return avisarLiberacao;
    default:
      return [];
  }
};

/* ---------- peças ---------- */

const BOTAO = {
  principal: "bg-orange-600 text-white hover:bg-orange-700",
  normal: "bg-white text-slate-800 ring-1 ring-slate-200 hover:ring-orange-300",
  perigo: "bg-white text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50",
};

function Trilha({ f }: { f: Fase }) {
  const feito = f.estado === "repassada" || f.estado === "repasse_andamento";
  const passos: [string, boolean][] = [
    ["Paga", f.is_financially_cleared],
    ["Entregue", f.confirm_freelancer || f.status === "Concluido"],
    ["Aprovada", f.confirm_contractor || f.status === "Concluido"],
    ["Repassada", feito],
  ];
  return (
    <ol className="flex items-start" aria-label="Andamento da fase">
      {passos.map(([nome, ok], i) => (
        <li key={nome} className="flex flex-1 flex-col items-center gap-1 text-center">
          <div className="flex w-full items-center">
            <span className={cn("h-0.5 flex-1", i === 0 ? "bg-transparent" : ok ? "bg-emerald-400" : "bg-slate-200")} />
            <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full", ok ? "bg-emerald-500 text-white" : "bg-white ring-2 ring-slate-200")}>
              {ok ? <Check className="h-3 w-3" /> : null}
            </span>
            <span className={cn("h-0.5 flex-1", i === passos.length - 1 ? "bg-transparent" : passos[i + 1][1] ? "bg-emerald-400" : "bg-slate-200")} />
          </div>
          <span className={cn("text-[10px] font-semibold", ok ? "text-emerald-700" : "text-slate-400")}>{nome}</span>
        </li>
      ))}
    </ol>
  );
}

function Confirmar({ acao, t, fase, aoTerminar, aoCancelar }: {
  acao: Acao; t: AdminOperationalTicket; fase: Fase | null; aoTerminar: (msg: string, ruim?: boolean) => void; aoCancelar: () => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [avisar, setAvisar] = useState(true);

  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const mexe = Boolean(acao.status || acao.repassar);
  const destinos = ([acao.para !== "profissional" ? t.contractor : null, acao.para !== "cliente" ? t.provider : null].filter(Boolean) as Participant[]);
  const papelDe = (p: Participant) => (p.id === t.contractor?.id ? "cliente" : "profissional");
  const [textos, setTextos] = useState<Record<number, string>>(() =>
    Object.fromEntries(destinos.map((p) => [p.id, typeof acao.aviso === "string" ? acao.aviso : acao.aviso[papelDe(p)]])));
  const vaiAviso = avisar || !mexe;
  const pronto = (!mexe || motivo.trim().length >= 3) && (!vaiAviso || destinos.every((p) => (textos[p.id] ?? "").trim()));

  const executar = async () => {
    setEnviando(true); setErro(null);
    let mudou = false;
    try {
      if (acao.status && fase) {
        await apiRequest("POST", `/admin/steps/${fase.id}/status`, { status: acao.status, reason: `${acao.rotulo}: ${motivo.trim()}` }).then(ler);
        mudou = true;
      }
      if (acao.repassar) {
        await apiRequest("POST", `/admin/transfers/${t.id}/pay`).then(ler);
        mudou = true;
      }
      if (vaiAviso) {
        for (const p of destinos) await apiRequest("POST", "/admin/message", { userId: p.id, content: textos[p.id].trim() }).then(ler);
      }
      const quem = destinos.length > 1 ? "As duas pessoas foram avisadas no chat." : `${destinos[0]?.name ?? "A pessoa"} foi avisada no chat.`;
      aoTerminar(mexe ? (avisar ? `Feito. ${quem}` : "Feito.") : quem);
    } catch (e: any) {
      // Já mudou e só o aviso falhou: fecha e diz; senão fica aberto com o erro para tentar de novo.
      if (mudou) aoTerminar(`A mudança foi feita, mas o aviso no chat não foi: ${e.message}`, true);
      else setErro(e.message);
    } finally { setEnviando(false); }
  };

  return (
    <div role="group" aria-label={`Confirmar: ${acao.rotulo}`} className="mt-2 space-y-2 rounded-xl border border-orange-200 bg-orange-50/50 p-3 text-sm">
      <p className="font-bold text-slate-900">{acao.rotulo}{fase ? ` · ${fase.title}` : ""}</p>
      <ul className="list-disc space-y-0.5 pl-5 text-slate-700">{acao.explica.map((x) => <li key={x}>{x}</li>)}</ul>
      {mexe ? (
        <label className="block">
          <span className="text-xs font-semibold text-slate-600">Motivo (fica no registro do painel)</span>
          <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={2} placeholder="Ex.: cliente confirmou por telefone que está tudo certo"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-orange-400" />
        </label>
      ) : null}
      {mexe ? (
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <input type="checkbox" checked={avisar} onChange={(e) => setAvisar(e.target.checked)} />
          Avisar {destinos.map((p) => p.name).join(" e ")} no chat da ArqDoor
        </label>
      ) : null}
      {vaiAviso ? destinos.map((p) => (
        <label key={p.id} className="block">
          <span className="text-xs font-semibold text-slate-600">Mensagem para {p.name ?? "—"} ({papelDe(p)})</span>
          <textarea aria-label={`Aviso para o ${papelDe(p)}`} value={textos[p.id] ?? ""} onChange={(e) => setTextos((x) => ({ ...x, [p.id]: e.target.value }))} rows={3}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-orange-400" />
        </label>
      )) : null}
      {erro ? <p className="rounded-lg bg-rose-50 px-2 py-1.5 text-xs font-semibold text-rose-700">{erro}</p> : null}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={aoCancelar} disabled={enviando} className="rounded-full px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100">Cancelar</button>
        <button type="button" onClick={() => void executar()} disabled={!pronto || enviando}
          className={cn("inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-bold disabled:opacity-50", acao.jeito === "perigo" ? "bg-rose-600 text-white" : "bg-orange-600 text-white")}>
          {enviando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}Confirmar
        </button>
      </div>
    </div>
  );
}

function Dinheiro({ fases, total }: { fases: Fase[]; total: number }) {
  const soma = (f: (x: Fase) => boolean) => fases.filter(f).reduce((s, x) => s + x.price, 0);
  const partes = [
    { nome: "Já repassado", valor: soma((x) => x.estado === "repassada" || x.estado === "repasse_andamento"), cor: "bg-emerald-600" },
    { nome: "Pronto para repassar", valor: soma((x) => x.estado === "pronta"), cor: "bg-emerald-300" },
    { nome: "Guardado (pago, não liberado)", valor: soma((x) => ["nao_comecou", "em_andamento", "entregue", "recusada", "aprovada"].includes(x.estado)), cor: "bg-orange-400" },
    { nome: "Falta o cliente pagar", valor: soma((x) => x.estado === "a_pagar"), cor: "bg-slate-200" },
  ];
  const base = Math.max(1, partes.reduce((s, p) => s + p.valor, 0) || total);
  return (
    <div className="space-y-2">
      <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100" aria-hidden>
        {partes.map((p) => p.valor > 0 ? <span key={p.nome} className={p.cor} style={{ width: `${(p.valor / base) * 100}%` }} /> : null)}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {partes.map((p) => (
          <div key={p.nome} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500"><span className={cn("h-2 w-2 rounded-full", p.cor)} />{p.nome}</p>
            <p className="text-base font-bold text-slate-950">{reais(p.valor)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/** A frase do topo: o que está acontecendo e o que falta. */
const situacaoAgora = (t: AdminOperationalTicket, fases: Fase[], grupos: { nome: string; fases: Fase[] }[]): { texto: string; cor: string } => {
  const dias = prazoDe(t);
  const recusada = fases.find((f) => f.estado === "recusada");
  if (recusada) return { texto: `O cliente recusou "${recusada.title}". Decida: mandar refazer ou liberar com a concordância dos dois.`, cor: "border-rose-200 bg-rose-50 text-rose-800" };
  const entregue = fases.find((f) => f.estado === "entregue");
  if (entregue) {
    const v = venceEm(entregue, dias);
    return v && v.getTime() <= Date.now()
      ? { texto: `"${entregue.title}" foi entregue e o prazo de conferência acabou em ${diaCurto(v)}: dá para liberar.`, cor: "border-amber-200 bg-amber-50 text-amber-900" }
      : { texto: `"${entregue.title}" foi entregue e espera o cliente conferir${v ? ` até ${diaCurto(v)}` : ""}.`, cor: "border-amber-200 bg-amber-50 text-amber-900" };
  }
  if (t.ready_payout_total > 0) return { texto: `${reais(t.ready_payout_total)} pronto para repassar ao profissional.`, cor: "border-emerald-200 bg-emerald-50 text-emerald-800" };
  const andando = fases.find((f) => f.estado === "em_andamento");
  if (andando) return { texto: `"${andando.title}" está em andamento com o profissional.`, cor: "border-slate-200 bg-slate-50 text-slate-700" };
  const aPagar = grupos.find((g) => g.fases.some((f) => f.estado === "a_pagar"));
  if (aPagar) return { texto: `Esperando o cliente pagar o grupo "${aPagar.nome}".`, cor: "border-slate-200 bg-slate-50 text-slate-700" };
  if (fases.length && fases.every((f) => f.estado === "repassada")) return { texto: "Tudo pago e repassado. Nada pendente.", cor: "border-emerald-200 bg-emerald-50 text-emerald-800" };
  return { texto: "Nada pendente agora.", cor: "border-slate-200 bg-slate-50 text-slate-700" };
};

/* ---------- a janela ---------- */

/** Onde a confirmação abre: "contrato", "grupo:<key>" ou "fase:<id>". */
type Aberta = { chave: string; lugar: string; fase: Fase | null; acao: Acao } | null;

export function DetalheDoContrato({ t: inicial, donoId, aoMudar }: { t: AdminOperationalTicket; donoId: number; aoMudar?: () => void }) {
  const [t, setT] = useState(inicial);
  const [aberta, setAberta] = useState<Aberta>(null);
  const [recado, setRecado] = useState<{ texto: string; ruim?: boolean } | null>(null);
  const [atualizando, setAtualizando] = useState(false);

  const fases: Fase[] = t.steps.filter((s) => s.price > 0).map((s, i) => ({ ...s, numero: i + 1, estado: estadoDaFase(s) }));
  const ordemDosGrupos = new Map(t.groups.map((g) => [g.key, g]));
  const grupos = Array.from(new Set(fases.map((f) => f.group_key)))
    .map((key) => {
      const doGrupo = fases.filter((f) => f.group_key === key);
      return { key, nome: ordemDosGrupos.get(key)?.label ?? doGrupo[0].group_label, ordem: ordemDosGrupos.get(key)?.order ?? doGrupo[0].group_order, fases: doGrupo };
    })
    .sort((a, b) => a.ordem - b.ordem);
  const agora = situacaoAgora(t, fases, grupos);
  const ocupado = atualizando;

  const recarregar = async (msg: string, ruim?: boolean) => {
    setAberta(null);
    setRecado({ texto: msg, ruim });
    setAtualizando(true);
    try {
      const b = (await apiRequest("GET", `/admin/users/${donoId}/operations`, undefined, undefined, 90000).then(ler)) as { data: AdminUserOperationsOverview };
      const novo = b.data.conversations.flatMap((c) => c.contracts).find((x) => x.id === t.id);
      if (novo) setT(novo);
    } catch { /* a tela fica com o que tinha; o recado já diz que foi feito */ } finally { setAtualizando(false); }
    aoMudar?.();
  };

  const abrirAcao = (chave: string, lugar: string, acao: Acao, fase: Fase | null) => { setRecado(null); setAberta(aberta?.chave === chave ? null : { chave, lugar, acao, fase }); };

  const repassar: Acao = {
    chave: "repassar", rotulo: `Repassar ${reais(t.ready_payout_total)} ao profissional`, icone: <Banknote className="h-3.5 w-3.5" />, jeito: "principal", repassar: true,
    explica: [`Repassa ao profissional as ${t.ready_payout_steps_count} fase(s) aprovadas e ainda não repassadas.`, "Cada fase só sai uma vez: se alguém apertar ao mesmo tempo, o servidor segura."],
    aviso: `ArqDoor: repassamos ${reais(t.ready_payout_total)} do contrato ${t.id} para a sua conta.`, para: "profissional",
  };
  const mensagem = (para: "cliente" | "profissional"): Acao => ({
    chave: `msg_${para}`, rotulo: `Mensagem para o ${para}`, icone: <MessageSquare className="h-3.5 w-3.5" />, jeito: "normal",
    explica: ["Vai como mensagem da ArqDoor no chat da pessoa. Nada muda no contrato."], aviso: "", para,
  });

  const pessoa = (papel: string, p: Participant | null) => (
    <div key={papel} className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{papel}</p>
      <p className="truncate font-bold text-slate-900">{p?.name ?? "—"} {p ? <EtiquetaPH id={p.id} leve /> : null}</p>
    </div>
  );

  const botao = (acao: Acao, lugar: string, fase: Fase | null = null) => {
    const chave = `${lugar}:${acao.chave}`;
    return (
      <button key={chave} type="button" disabled={ocupado || Boolean(acao.bloqueada)} title={acao.bloqueada} onClick={() => abrirAcao(chave, lugar, acao, fase)}
        className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-45", BOTAO[acao.jeito], aberta?.chave === chave && "ring-2 ring-orange-400")}>
        {acao.icone}{acao.rotulo}
      </button>
    );
  };
  const painelAberto = (lugar: string) =>
    aberta && aberta.lugar === lugar
      ? <Confirmar key={aberta.chave} acao={aberta.acao} t={t} fase={aberta.fase} aoTerminar={(m, ruim) => void recarregar(m, ruim)} aoCancelar={() => setAberta(null)} />
      : null;

  return (
    <div className="space-y-4 text-sm">
      <div className={cn("flex items-start gap-2 rounded-xl border px-3 py-2.5 font-semibold", agora.cor)} data-testid="situacao-agora">
        {agora.cor.includes("rose") || agora.cor.includes("amber") ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
        <span>{agora.texto}</span>
        {atualizando ? <Loader2 className="ml-auto h-4 w-4 shrink-0 animate-spin" aria-label="Atualizando" /> : null}
      </div>
      {recado ? <p className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold", recado.ruim ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-800")} role="status">{recado.texto}</p> : null}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
        <span><b className="text-slate-800">{STATUS_CONTRATO[t.status] ?? t.status}</b></span>
        <span>Pagamento: <b className="text-slate-800">{t.payment_status ? STATUS_PAGAMENTO[t.payment_status] ?? t.payment_status : "—"}</b></span>
        <span>Criado {quando(t.created_at)}</span>
        <span>Prazo de conferência: <b className="text-slate-800">{prazoDe(t)} dias</b></span>
        <span>{t.latest_document ? (t.latest_document.signed ? `Assinado ${quando(t.latest_document.date)}` : "Contrato gerado, sem assinatura") : "Sem documento"}</span>
      </div>

      <Dinheiro fases={fases} total={t.total_price} />

      <div className="flex flex-col gap-2 sm:flex-row">
        {pessoa("Cliente", t.contractor)}
        {pessoa("Profissional", t.provider)}
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2" aria-label="Ações do contrato">
          {t.ready_payout_total > 0 ? botao(repassar, "contrato") : null}
          {t.contractor ? botao(mensagem("cliente"), "contrato") : null}
          {t.provider ? botao(mensagem("profissional"), "contrato") : null}
          {t.latest_document ? (
            <button type="button" onClick={() => openSecureFile(t.latest_document!.download_url || t.latest_document!.pdf_path)}
              className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold", BOTAO.normal)}><FileText className="h-3.5 w-3.5" />Abrir o contrato (PDF)</button>
          ) : null}
        </div>
        {painelAberto("contrato")}
      </div>

      {grupos.map((g, gi) => {
        const pagas = g.fases.filter((f) => f.estado !== "a_pagar").length;
        const chip = pagas === 0 ? ["Esperando pagamento", "bg-slate-100 text-slate-600"] : pagas === g.fases.length ? ["Pago", "bg-emerald-50 text-emerald-700"] : ["Parte paga", "bg-amber-50 text-amber-800"];
        const total = g.fases.reduce((s, f) => s + f.price, 0);
        const aPagar = g.fases.filter((f) => f.estado === "a_pagar").reduce((s, f) => s + f.price, 0);
        const concluidas = g.fases.filter((f) => ["aprovada", "pronta", "repasse_andamento", "repassada"].includes(f.estado)).length;
        return (
          <section key={g.key} aria-label={`Grupo de pagamento: ${g.nome}`} className="overflow-hidden rounded-2xl border border-slate-200">
            <header className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Grupo {gi + 1}</span>
              <b className="text-slate-900">{g.nome}</b>
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", chip[1])}>{chip[0]}</span>
              <span className="ml-auto text-xs text-slate-500">{concluidas} de {g.fases.length} fases concluídas · <b className="text-slate-800">{reais(total)}</b></span>
              {aPagar ? botao(lembrarDePagar(t, g.nome, aPagar), `grupo:${g.key}`) : null}
            </header>
            {painelAberto(`grupo:${g.key}`) ? <div className="border-b border-slate-100 px-3 pb-3">{painelAberto(`grupo:${g.key}`)}</div> : null}
            <ol className="divide-y divide-slate-100">
              {g.fases.map((f) => {
                const est = ESTADO[f.estado];
                const acoes = acoesDaFase(f, t);
                const vence = f.estado === "entregue" ? venceEm(f, prazoDe(t)) : null;
                return (
                  <li key={f.id} className="px-3 py-3" data-testid="fase">
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:items-center">
                      <div className="flex min-w-0 items-start gap-2.5">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">{f.numero}</span>
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-baseline gap-x-2"><b className="text-slate-950">{f.title}</b><span className="font-semibold text-slate-600">{reais(f.price)}</span></p>
                          <p className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", est.cor)}>{est.texto}</span>
                            {vence ? <span className="text-[11px] text-slate-500">{vence.getTime() <= Date.now() ? `prazo acabou ${diaCurto(vence)}` : `prazo vence ${diaCurto(vence)}`}</span> : null}
                            {f.auto_approved_at ? <span className="text-[11px] text-slate-500">aprovada sozinha (prazo) em {quando(f.auto_approved_at)}</span> : null}
                            {f.rework_count ? <span className="text-[11px] text-slate-500">refeita {f.rework_count}×</span> : null}
                          </p>
                        </div>
                      </div>
                      <Trilha f={f} />
                    </div>
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5 md:pl-8">
                      {acoes.map((a) => botao(a, `fase:${f.id}`, f))}
                      {f.estado === "a_pagar" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400"><Clock className="h-3 w-3" />Começa quando o cliente pagar o grupo {g.nome}.</span>
                      ) : f.estado === "repassada" || f.estado === "repasse_andamento" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400"><Lock className="h-3 w-3" />O dinheiro desta fase já saiu: a situação dela não muda mais, só dá para avisar.</span>
                      ) : null}
                    </div>
                    {painelAberto(`fase:${f.id}`)}
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
