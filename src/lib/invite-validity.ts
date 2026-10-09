/**
 * Validade do link de proposta. Espelha `constants/validadeDoConvite.js` do backend
 * (spec 2026-09-convite-validade).
 */

export type ValidadeDoConvite = "1h" | "24h" | "3d" | "7d";

export const VALIDADES_DO_CONVITE: { value: ValidadeDoConvite; label: string }[] = [
  { value: "1h", label: "1 hora" },
  { value: "24h", label: "24 horas" },
  { value: "3d", label: "3 dias" },
  { value: "7d", label: "7 dias" },
];

export const VALIDADE_PADRAO: ValidadeDoConvite = "24h";

/** "28/09, 14:30" no horário de Brasília. `null` se a data não existir ou for inválida. */
export function formatInviteExpiry(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const dia = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
  return `${dia}, ${hora}`;
}

export type FalhaDoConvite =
  | { tipo: "expirado"; titulo: string; prestador: string | null; expiraEm: string | null }
  | { tipo: "nao_encontrado" };

/** Traduz a resposta de erro de `GET /invites/public/:token`. `null` para erro que não é 404 nem 410. */
export function falhaDoConvitePublico(status: number, body: any): FalhaDoConvite | null {
  if (status === 410 && body?.expired) {
    return {
      tipo: "expirado",
      titulo: body?.invite?.title || "Proposta",
      prestador: body?.provider?.name || null,
      expiraEm: body?.invite?.expires_at || null,
    };
  }
  if (status === 404) return { tipo: "nao_encontrado" };
  return null;
}
