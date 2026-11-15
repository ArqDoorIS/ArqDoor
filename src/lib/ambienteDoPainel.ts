/**
 * Ambiente do painel admin: PRODUÇÃO ou STAGING (15/11/2026).
 *
 * O site é compilado para UM servidor (VITE_API_URL): o de produção fala com
 * api.arqdoor.com e o de staging com api.staging.arqdoor.com. O painel precisa operar os
 * dois, então nele (e só nele) quem escolhe o servidor é o seletor "Produção | Staging",
 * guardado neste navegador. O resto do site continua no servidor da compilação.
 *
 * Os dois ambientes ficam separados de verdade:
 *   - bancos diferentes: conta, contrato e pagamento de um não existem no outro;
 *   - login separado: o cookie `admin_token` é host-only (backend src/utils/authCookies.js),
 *     então o login em api.staging.arqdoor.com não vale em api.arqdoor.com e vice-versa;
 *   - a troca recarrega a página, para nenhum dado de um ambiente ficar na tela do outro.
 *
 * O servidor de staging já aceita o painel de admin.arqdoor.com (CORS fixo no backend,
 * src/server.js), e admin.arqdoor.com e api.staging.arqdoor.com são o mesmo "site"
 * (arqdoor.com), então o cookie SameSite=Lax do admin vai junto.
 */
export type AmbienteDoPainel = "producao" | "staging";

export const SERVIDOR_DO_AMBIENTE: Record<AmbienteDoPainel, string> = {
  producao: "https://api.arqdoor.com",
  staging: "https://api.staging.arqdoor.com",
};

const CHAVE = "painel_ambiente";

/** Está no painel? (admin.arqdoor.com, ou /admin em qualquer host) */
export function estaNoPainel(local: Pick<Location, "hostname" | "pathname"> | undefined = typeof window !== "undefined" ? window.location : undefined): boolean {
  if (!local) return false;
  return local.hostname.startsWith("admin.") || local.pathname === "/admin" || local.pathname.startsWith("/admin/");
}

/** O ambiente escolhido neste navegador (null = nunca escolheu: vale o da compilação). */
export function ambienteEscolhido(): AmbienteDoPainel | null {
  try {
    const v = localStorage.getItem(CHAVE);
    return v === "producao" || v === "staging" ? v : null;
  } catch {
    return null;
  }
}

/** De que ambiente é um endereço de servidor. */
export function ambienteDoServidor(url: string): AmbienteDoPainel {
  return /staging/i.test(url) ? "staging" : "producao";
}

/**
 * O servidor que o site usa: no painel, o do ambiente escolhido; fora dele (ou sem
 * escolha), o da compilação.
 */
export function servidorDoSite(daCompilacao: string, noPainel = estaNoPainel(), escolhido = ambienteEscolhido()): string {
  if (noPainel && escolhido) return SERVIDOR_DO_AMBIENTE[escolhido];
  return daCompilacao;
}

/** Troca o ambiente do painel e recarrega a página (o login de cada um é separado). */
export function trocarAmbienteDoPainel(novo: AmbienteDoPainel) {
  try {
    localStorage.setItem(CHAVE, novo);
    // o token anti-CSRF guardado é do servidor de antes
    sessionStorage.removeItem("csrf_token");
  } catch {
    /* sem armazenamento: segue no da compilação */
  }
  window.location.reload();
}
