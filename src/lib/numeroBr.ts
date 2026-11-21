/**
 * Números no padrão pt-BR, de ida e volta (20/11/2026).
 *
 * Mostrar: ponto no milhar e vírgula nas casas ("1.000", "1.234,5", "0,03").
 * Ler o que a pessoa digitou, inclusive o que o próprio campo mostrou:
 *   "1.000" -> 1000, "1.234,5" -> 1234.5, "1,5" -> 1.5, "0,03" -> 0.03.
 * Ponto sem vírgula só é milhar quando forma grupos de três ("1.000", "12.500.000"); fora disso é
 * a casa decimal de quem digita no padrão americano ("1.5", "0.03", "2.1758").
 * Vazio ou fora do formato vira NaN (nunca 0), para a tela apontar o campo em vez de salvar zero.
 */

/** Com ponto no milhar e até `casas` casas decimais. */
export function mostrarNumero(v: number, casas = 4): string {
  return v.toLocaleString("pt-BR", { maximumFractionDigits: casas });
}

/** Inteiro de contagem com ponto no milhar; null ou indefinido vira o `vazio`. */
export function contagem(v: number | null | undefined, vazio = "-"): string {
  return v == null || !Number.isFinite(Number(v)) ? vazio : Number(v).toLocaleString("pt-BR");
}

const MILHAR_COM_VIRGULA = /^[1-9]\d{0,2}(\.\d{3})+(,\d+)?$/;
const MILHAR_SEM_VIRGULA = /^[1-9]\d{0,2}(\.\d{3})+$/;
const COM_VIRGULA = /^\d+(,\d+)?$|^,\d+$/;
const COM_PONTO = /^\d+(\.\d+)?$|^\.\d+$/;

/** O número que a pessoa digitou (ou que o campo mostrou), no padrão pt-BR. */
export function lerNumero(texto: string): number {
  let t = String(texto ?? "").replace(/[\s  ]/g, "");
  if (!t) return NaN;
  let sinal = 1;
  if (t.startsWith("-")) { sinal = -1; t = t.slice(1); } else if (t.startsWith("+")) t = t.slice(1);
  if (!t) return NaN;
  if (t.includes(",")) {
    if (MILHAR_COM_VIRGULA.test(t)) return sinal * Number(t.replace(/\./g, "").replace(",", "."));
    return COM_VIRGULA.test(t) ? sinal * Number(t.replace(",", ".")) : NaN;
  }
  if (MILHAR_SEM_VIRGULA.test(t)) return sinal * Number(t.replace(/\./g, ""));
  return COM_PONTO.test(t) ? sinal * Number(t) : NaN;
}
