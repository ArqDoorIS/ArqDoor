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

/* ---------- ambiente de um envio em massa (20/11/2026) ---------- */
/**
 * Em que ambiente cai um envio do painel (comunicado, notificação personalizada). Quem decide
 * quem recebe é o SERVIDOR, não a página: cada ambiente tem o seu banco, com as suas contas.
 * Por isso o ambiente sai do endereço da API em uso (o da compilação, VITE_API_URL, ou o do
 * seletor "Produção | Staging"), sem variável nova:
 *   - servidor local (localhost, 127.0.0.1, rede da casa) -> LOCAL;
 *   - servidor com "staging" no nome (api.staging.arqdoor.com) -> TESTE;
 *   - qualquer outro -> PRODUÇÃO. Na dúvida vale o aviso mais forte.
 * No caso normal bate com o domínio da página (arqdoor.com, staging.arqdoor.com, localhost).
 * Quando não bate, vale o servidor: o painel em localhost sem VITE_API_URL fala com
 * api.arqdoor.com (o padrão do queryClient) e manda para gente de verdade.
 */
export type AmbienteDoEnvio = "producao" | "teste" | "local";

export const NOME_DO_AMBIENTE: Record<AmbienteDoEnvio, string> = { producao: "PRODUÇÃO", teste: "TESTE", local: "LOCAL" };

const HOST_LOCAL = [
  /^localhost$/i, /\.localhost$/i, /\.local$/i, /^0\.0\.0\.0$/, /^\[?::1\]?$/,
  /^127(\.\d{1,3}){3}$/, /^10(\.\d{1,3}){3}$/, /^192\.168(\.\d{1,3}){2}$/, /^172\.(1[6-9]|2\d|3[01])(\.\d{1,3}){2}$/,
];

/** O host é do computador de quem desenvolve (ou da rede da casa)? */
export function ehHostLocal(host: string): boolean {
  return HOST_LOCAL.some((r) => r.test(host));
}

const paginaAtual = () => (typeof window !== "undefined" ? window.location.href : "http://localhost/");

/** O endereço do servidor como URL (um caminho relativo é o próprio site). null = não deu para ler. */
function urlDoServidor(servidor: string, pagina: string): URL | null {
  try {
    return new URL(servidor || "/", pagina);
  } catch {
    return null;
  }
}

/** O host do servidor, com a porta, para mostrar na confirmação ("api.arqdoor.com"). */
export function hostDoServidor(servidor: string, pagina = paginaAtual()): string {
  return urlDoServidor(servidor, pagina)?.host || servidor || "servidor desconhecido";
}

export function ambienteDoEnvio(servidor: string, pagina = paginaAtual()): AmbienteDoEnvio {
  const url = urlDoServidor(servidor, pagina);
  if (!url) return "producao";
  if (ehHostLocal(url.hostname)) return "local";
  return ambienteDoServidor(url.hostname) === "staging" ? "teste" : "producao";
}

/** A frase do ambiente na confirmação do envio. */
export function explicacaoDoAmbiente(servidor: string, pagina = paginaAtual()): string {
  const ambiente = ambienteDoEnvio(servidor, pagina);
  const host = hostDoServidor(servidor, pagina);
  if (ambiente === "teste") return `Ambiente de teste (staging): só as contas do staging recebem. Servidor ${host}.`;
  if (ambiente === "local") return `Servidor no seu computador: só as contas do banco local recebem. Servidor ${host}.`;
  const doPainel = urlDoServidor("/", pagina);
  const painelLocal = doPainel ? ehHostLocal(doPainel.hostname) : false;
  return `${painelLocal ? "O painel está no seu computador, mas fala com o servidor de produção. " : ""}Chega em pessoas reais. Servidor ${host}.`;
}

/** O fim do botão final: "Enviar para 1.234 contas em PRODUÇÃO". */
export const noAmbiente = (servidor: string, pagina = paginaAtual()) => `em ${NOME_DO_AMBIENTE[ambienteDoEnvio(servidor, pagina)]}`;
