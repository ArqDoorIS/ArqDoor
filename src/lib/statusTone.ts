// Um padrão só de status no site, com as cores do app. selo = etiqueta; ponto = marcador pequeno.
// Spec 2026-11-webapp-cores-do-app.
export const statusTone = {
  aviso: { selo: "border-warning/30 bg-warning-bg text-warning-text", ponto: "bg-warning" },
  andamento: { selo: "border-info/30 bg-info-bg text-info-dark", ponto: "bg-info" },
  sucesso: { selo: "border-success/30 bg-success-bg text-success-dark", ponto: "bg-success" },
  erro: { selo: "border-danger/30 bg-danger-bg text-danger-dark", ponto: "bg-danger" },
  neutro: { selo: "border-line bg-surface-warm text-muted-foreground", ponto: "bg-muted-foreground" },
} as const;

export type StatusTone = keyof typeof statusTone;
