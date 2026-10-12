/**
 * Helpers puros para CPF de destinatario de convite.
 * spec: 2026-10-convite-destinado
 */

/** Remove tudo que nao for digito. */
export function apenasDigitosCpf(cpf: string): string {
  return cpf.replace(/\D/g, "");
}

/** Aplica mascara 000.000.000-00. */
export function mascaraCpf(raw: string): string {
  const d = apenasDigitosCpf(raw).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/**
 * Valida CPF: 11 digitos, verificadores corretos, nao todos iguais.
 * Rejeita "000.000.000-00", "111.111.111-11" e similares.
 */
export function validarCpf(cpf: string): boolean {
  const d = apenasDigitosCpf(cpf);
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) soma += Number(d[i]) * (10 - i);
  let r1 = (soma * 10) % 11;
  if (r1 >= 10) r1 = 0;
  if (r1 !== Number(d[9])) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) soma += Number(d[i]) * (11 - i);
  let r2 = (soma * 10) % 11;
  if (r2 >= 10) r2 = 0;
  if (r2 !== Number(d[10])) return false;

  return true;
}

/** Retorna os 4 ultimos digitos numericos do CPF (ex.: "8901"). */
export function cpfFinal4(cpf: string): string {
  return apenasDigitosCpf(cpf).slice(-4);
}

/**
 * Formata cpf_final "8901" para exibicao "89-01".
 * Aceita qualquer string de 4 chars; retorna como esta se menor.
 */
export function formatarCpfFinal(cpfFinal: string): string {
  if (!cpfFinal || cpfFinal.length < 4) return cpfFinal || "";
  return `${cpfFinal.slice(0, 2)}-${cpfFinal.slice(2, 4)}`;
}

/**
 * Retorna true se os 4 ultimos digitos numericos do CPF do usuario batem
 * com o cpf_final do convite. Retorna false tambem quando userCpf tem menos
 * de 4 digitos (CPF incompleto deixa o servidor decidir).
 */
export function cpfBate(userCpf: string, destinatarioCpfFinal: string): boolean {
  const final = cpfFinal4(userCpf);
  return final.length === 4 && final === destinatarioCpfFinal;
}
