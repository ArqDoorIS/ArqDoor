/**
 * Link "Abrir no app" do convite.
 *
 * O app registra esquemas diferentes por variante (ver `arqdoor-mobile/app.config.ts`):
 * producao `arqdoormobile` / `com.arqdoor.app`, staging `arqdoormobile-staging` /
 * `com.arqdoor.app.staging` (ArqDoor Teste). Um `arqdoor://` cru nao abre nenhum dos dois.
 *
 * No Android usamos `intent://`: se o app nao estiver instalado, o Chrome segue para
 * `S.browser_fallback_url` em vez de mostrar erro. Fora do Android nao ha link.
 */
export const siteDeStaging = (host: string) =>
  host.startsWith("staging.") || host.includes(".staging.");

export const navegadorAndroid = (userAgent: string) => /android/i.test(userAgent);

export function linkDoAppParaConvite(token: string, host: string, fallbackUrl: string) {
  const staging = siteDeStaging(host);
  const scheme = staging ? "arqdoormobile-staging" : "arqdoormobile";
  const pacote = staging ? "com.arqdoor.app.staging" : "com.arqdoor.app";
  return (
    `intent://convite/${encodeURIComponent(token)}` +
    `#Intent;scheme=${scheme};package=${pacote};` +
    `S.browser_fallback_url=${encodeURIComponent(fallbackUrl)};end`
  );
}
