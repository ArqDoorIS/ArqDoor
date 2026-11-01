/**
 * Se a página está dentro de um iframe de OUTRA origem (spec
 * specs/features/2026-11-site-ganhos-rapidos).
 *
 * A produção não manda `X-Frame-Options` nem `frame-ancestors` valendo (a CSP de lá só
 * relata). Qualquer site podia abrir o nosso num iframe invisível por cima do pagamento ou da
 * assinatura e fazer a pessoa clicar sem saber. Como o site só existe com JavaScript, não
 * renderizar nesse caso fecha a porta: iframe sem script mostra página em branco, iframe com
 * script cai aqui. Mesma origem continua liberada.
 */
export function emIframeDeFora(janela: Window = window): boolean {
  if (janela.top === janela.self) return false;
  try {
    return janela.top!.location.origin !== janela.location.origin;
  } catch {
    // Ler a localização da janela de cima é proibido quando a origem é outra.
    return true;
  }
}
