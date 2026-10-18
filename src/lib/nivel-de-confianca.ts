/**
 * Nível de confiança do jeito que o cartão do perfil mostra.
 *
 * O número vem do servidor (`nivelDeConfiancaService.js`), o mesmo do app. Antes o site
 * fazia duas contas próprias, uma no perfil público e outra no perfil do dono, com itens
 * diferentes (Sobre mim, Profissão, selo manual) e teto de 60%: o mesmo prestador aparecia
 * com um número no app e outro no site. Spec: specs/features/2026-10-confianca-site.
 *
 * Duas fontes, mesmo formato na tela:
 *  - `GET /users/me/trust` (dono): cada item tem `estado` e `o_que_falta`;
 *  - `GET /users/:id/trust` (visitante): cada item tem só `validado`.
 */
export type EstadoDoItem = "validado" | "em_analise" | "pendente";

export interface LinhaDeConfianca {
  chave: string;
  rotulo: string;
  estado: EstadoDoItem;
  texto: string;
}

export interface NivelExibido {
  percentual: number;
  linhas: LinhaDeConfianca[];
}

const ESTADOS: EstadoDoItem[] = ["validado", "em_analise", "pendente"];

const textoDoItem = (item: any, estado: EstadoDoItem): string => {
  if (estado === "validado") return "Validado";
  const falta = typeof item?.o_que_falta === "string" && item.o_que_falta.trim() ? item.o_que_falta : null;
  if (estado === "em_analise") return falta ?? "Em análise";
  // Visitante só sabe que não está validado; o que falta é assunto do dono.
  if (!("estado" in (item ?? {}))) return "Ainda não validado";
  return falta ?? "Pendente";
};

/** `data` de uma das duas rotas; null quando não dá para mostrar nada com segurança. */
export function nivelParaExibir(data: unknown): NivelExibido | null {
  const d = data as any;
  if (!d || typeof d !== "object" || !Array.isArray(d.itens)) return null;
  const percentual = Number(d.percentual);
  if (!Number.isFinite(percentual)) return null;

  const linhas = d.itens
    .filter((i: any) => i && typeof i.chave === "string")
    .map((i: any): LinhaDeConfianca => {
      const estado: EstadoDoItem = ESTADOS.includes(i.estado)
        ? i.estado
        : i.validado === true
          ? "validado"
          : "pendente";
      return { chave: i.chave, rotulo: String(i.rotulo ?? i.chave), estado, texto: textoDoItem(i, estado) };
    });

  return { percentual: Math.min(100, Math.max(0, Math.round(percentual))), linhas };
}
