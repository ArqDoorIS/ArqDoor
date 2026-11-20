/**
 * Dados da página do convite num formato só, antes e depois da assinatura:
 *   - antes: GET /invites/public/:token/precos (grupos, fases e preço de cada pagamento);
 *   - depois (cliente logado): GET /ticket/:id/payment-groups (o que foi pago, as fases e a
 *     situação de cada uma) e /payments/options para o preço dos próximos pagamentos.
 */

export type SituacaoDaFase = "aguardando" | "execucao" | "entregue" | "aprovada";

export type FaseVista = {
  id?: number;
  titulo: string;
  inicio: string | null;
  fim: string | null;
  situacao: SituacaoDaFase;
  entregueEm?: string | null;
  /** parte da fase no preço do pagamento (o que é liberado ao aprovar) */
  parte: number | null;
  /** base para repartir o preço (valor da fase) */
  peso: number;
};

export type GrupoVista = {
  id?: number;
  /** pagamento por fase (sem grupo): paga pela fase */
  stepId?: number;
  nome: string;
  fases: FaseVista[];
  cartao: number | null;
  pix: number | null;
  parcelas: { vezes: number; valor: number } | null;
  pago: boolean;
  pagoEm?: string | null;
  pagoMeio?: string | null;
  pagoValor?: number | null;
  /** soma dos preços das fases (base da cobrança), para a folha de pagamento */
  base?: number;
};

export type Total = { cartao: number; pix: number; pagamentos: number };

export const brl = (v: number | null | undefined) =>
  v == null ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** "2026-12-01" (ou um ISO com hora em UTC) → "01/12/2026" / "01/12", sem fuso no meio. */
export const dia = (iso: string | null | undefined, comAno = true) => {
  if (!iso) return "";
  const [y, m, d] = String(iso).slice(0, 10).split("-");
  return comAno ? `${d}/${m}/${y}` : `${d}/${m}`;
};
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const diaMes = (iso: string | null | undefined) => {
  if (!iso) return "";
  const [, m, d] = String(iso).slice(0, 10).split("-");
  return `${Number(d)} de ${MESES[Number(m) - 1]}`;
};
export const somarDias = (iso: string, n: number) => {
  const t = new Date(`${String(iso).slice(0, 10)}T12:00:00Z`);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
};
export const primeiroNome = (n?: string | null) => String(n || "").trim().split(/\s+/)[0] || "";
export const iniciais = (n?: string | null) =>
  String(n || "?").trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

/** Parte de cada fase no preço do pagamento (a última fica com os centavos), igual ao app. */
export function repartir(total: number | null, pesos: number[]): (number | null)[] {
  if (total == null) return pesos.map(() => null);
  const soma = pesos.reduce((a, p) => a + p, 0);
  if (soma <= 0) return pesos.map(() => null);
  let usado = 0;
  return pesos.map((p, i) => {
    const v = i === pesos.length - 1 ? Math.round((total - usado) * 100) / 100 : Math.floor(((total * p) / soma) * 100) / 100;
    usado = Math.round((usado + v) * 100) / 100;
    return v;
  });
}

/** Situação da fase (mesma regra do acompanhamento do servidor). */
export function situacaoDaFase(step: any): SituacaoDaFase {
  const status = String(step?.status || "").toLowerCase();
  if (status === "concluido" || status === "concluído") return "aprovada";
  if (step?.confirm_freelancer && !step?.confirm_contractor) return "entregue";
  if (status === "em andamento") return "execucao";
  if (Number(step?.rework_count) > 0 && status === "pendente") return "execucao";
  return "aguardando";
}

/** Grupos da resposta de /precos (antes da assinatura). */
export function gruposDosPrecos(precos: any): GrupoVista[] {
  return (precos?.grupos || []).map((g: any) => {
    const pesos = (g.fases || []).map((f: any) => Number(f.valor) || 0);
    const partes = repartir(g.precos?.cartao ?? null, pesos);
    return {
      nome: g.nome || "",
      fases: (g.fases || []).map((f: any, i: number) => ({
        titulo: f.titulo, inicio: f.inicio, fim: f.fim, situacao: "aguardando" as SituacaoDaFase, parte: partes[i], peso: pesos[i],
      })),
      cartao: g.precos?.cartao ?? null,
      pix: g.precos?.pix ?? null,
      parcelas: g.precos?.parcelas ?? null,
      pago: false,
    };
  });
}

const ehAssinatura = (s: any) => Boolean(s?.is_signature_step) || /assinatura/i.test(String(s?.title || ""));

/** Grupos do contrato (depois da assinatura), na ordem das fases. */
export function gruposDoContrato(resp: any): GrupoVista[] {
  const grupos: GrupoVista[] = (resp?.groups || []).map((g: any) => ({
    id: Number(g.group_id),
    nome: g.name || "",
    fases: (g.steps || []).filter((s: any) => !ehAssinatura(s)).map(faseDoStep),
    cartao: null, pix: null, parcelas: null,
    pago: Boolean(g.is_fully_paid),
    pagoEm: g.paid_at ?? null,
    pagoMeio: g.paid_method ?? null,
    pagoValor: g.paid_amount != null ? Number(g.paid_amount) : null,
    base: Number(g.total_price) || 0,
  }));
  // pagamento por fase (sem grupo): cada fase é um pagamento
  for (const s of resp?.loose_steps || []) {
    if (ehAssinatura(s) || !(Number(s.price) > 0)) continue;
    grupos.push({
      stepId: Number(s.id), nome: s.title || "", fases: [faseDoStep(s)],
      cartao: null, pix: null, parcelas: null, pago: Boolean(s.is_financially_cleared), base: Number(s.price) || 0,
    });
  }
  const inicio = (g: GrupoVista) => g.fases.map((f) => f.inicio || "").filter(Boolean).sort()[0] || "9999";
  return grupos.filter((g) => g.fases.length).sort((a, b) => inicio(a).localeCompare(inicio(b)));
}

function faseDoStep(s: any): FaseVista {
  return {
    id: Number(s.id),
    titulo: s.title,
    inicio: s.start_date ? String(s.start_date).slice(0, 10) : null,
    fim: s.end_date ? String(s.end_date).slice(0, 10) : null,
    situacao: situacaoDaFase(s),
    entregueEm: s.confirm_freelancerAt ?? null,
    parte: null,
    peso: Number(s.price) || 0,
  };
}

/** Preço do cartão à vista, Pix e maior parcela a partir de /payments/options. */
export function precoDasOpcoes(opcoes: any[]): Pick<GrupoVista, "cartao" | "pix" | "parcelas"> {
  const cartoes = (opcoes || []).filter((o) => String(o.method).startsWith("credit_card_")).sort((a, b) => a.installments - b.installments);
  const pix = (opcoes || []).find((o) => o.method === "pix");
  const maior = cartoes[cartoes.length - 1];
  return {
    cartao: cartoes[0]?.total ?? null,
    pix: pix?.total ?? null,
    parcelas: maior && maior.installments > 1
      ? { vezes: maior.installments, valor: Math.ceil((maior.total / maior.installments) * 100 - 1e-9) / 100 }
      : null,
  };
}

/** Preenche a parte de cada fase depois de saber o preço do pagamento. */
export function comPartes(g: GrupoVista): GrupoVista {
  const total = g.pago ? (g.pagoValor ?? g.cartao) : g.cartao;
  const partes = repartir(total ?? null, g.fases.map((f) => f.peso));
  return { ...g, fases: g.fases.map((f, i) => ({ ...f, parte: partes[i] })) };
}

export function totalDe(grupos: GrupoVista[]): Total {
  const r2 = (v: number) => Math.round(v * 100) / 100;
  return {
    cartao: r2(grupos.reduce((a, g) => a + ((g.pago ? g.pagoValor : g.cartao) || 0), 0)),
    pix: r2(grupos.reduce((a, g) => a + ((g.pago ? g.pagoValor : g.pix) || 0), 0)),
    pagamentos: grupos.length,
  };
}

export const descontoPix = (cartao: number, pix: number) =>
  cartao > 0 && pix < cartao ? Math.floor((1 - pix / cartao) * 1000) / 10 : 0;

export const MEIO: Record<string, string> = { PIX: "Pix", CREDIT_CARD: "cartão", BOLETO: "boleto" };
