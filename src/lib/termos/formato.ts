/**
 * Formato do texto dos Termos de Uso e Política de Privacidade (20/11/2026).
 *
 * O admin edita os termos no painel como texto simples; o site e o app desenham a partir
 * destes blocos (nada de HTML vindo do servidor). ESTE ARQUIVO É IGUAL no site
 * (src/lib/termos/formato.ts) e no app (src/lib/termos-formato.ts): mudou um, mude o outro.
 *
 * Regras do texto:
 *   # Título                     título do documento
 *   ## Parte {#id}               grande divisão (ex.: "Termos de Uso", "Política de Privacidade")
 *   ### Seção {#id}              seção numerada (ex.: "1. Disposições Iniciais")
 *   > linha                      linha de apoio do cabeçalho (empresa, data da atualização)
 *   1.1. texto                   cláusula; o recuo sai do número (1.1. / 1.1.1. / 1.1.1.1.)
 *   texto solto                  parágrafo comum
 *   ---                          daqui para baixo é o rodapé (empresa, endereço)
 *   **negrito**  [texto](https://endereço)
 *
 * Linha em branco separa parágrafos; linhas seguidas viram quebra de linha no mesmo bloco.
 * O índice sai sozinho das partes e seções.
 */

export type Trecho = { t: 'texto'; v: string } | { t: 'negrito'; v: string } | { t: 'link'; v: string; href: string };
export type Linha = Trecho[];

export type Bloco =
  | { tipo: 'titulo'; texto: string }
  | { tipo: 'meta'; linhas: Linha[] }
  | { tipo: 'parte'; texto: string; id: string }
  | { tipo: 'secao'; texto: string; id: string }
  | { tipo: 'clausula'; numero: string; nivel: number; linhas: Linha[] }
  | { tipo: 'paragrafo'; linhas: Linha[] }
  | { tipo: 'rodape'; linhas: Linha[] };

export type ItemDoIndice = { texto: string; id: string; filhos: { texto: string; id: string }[] };

const CLAUSULA = /^(\d+(?:\.\d+)+\.)\s+([\s\S]*)$/;
const ID = /\s*\{#([A-Za-z0-9_-]+)\}\s*$/;

/** Link só para endereço seguro: http(s), e-mail, telefone, âncora ou caminho do próprio site. */
export function linkSeguro(href: string): string | null {
  const h = href.trim();
  if (/^(https?:\/\/|mailto:|tel:)/i.test(h) || /^#[A-Za-z0-9_-]+$/.test(h) || /^\/(?![\/\\])/.test(h)) return h;
  return null;
}

/** **negrito** e [texto](endereço) dentro de uma linha. */
export function trechos(linha: string): Linha {
  const saida: Linha = [];
  const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let ultimo = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(linha))) {
    if (m.index > ultimo) saida.push({ t: 'texto', v: linha.slice(ultimo, m.index) });
    if (m[1] !== undefined) saida.push({ t: 'negrito', v: m[1] });
    else {
      const href = linkSeguro(m[3]);
      saida.push(href ? { t: 'link', v: m[2], href } : { t: 'texto', v: m[2] });
    }
    ultimo = re.lastIndex;
  }
  if (ultimo < linha.length) saida.push({ t: 'texto', v: linha.slice(ultimo) });
  return saida;
}

const slug = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'secao';

function cabecalho(resto: string, usados: Set<string>) {
  const m = ID.exec(resto);
  const texto = (m ? resto.slice(0, m.index) : resto).trim();
  let id = m ? m[1] : slug(texto);
  let n = 2;
  const base = id;
  while (usados.has(id)) id = `${base}-${n++}`;
  usados.add(id);
  return { texto, id };
}

export function lerTermos(fonte: string): Bloco[] {
  const blocos: Bloco[] = [];
  const usados = new Set<string>();
  const linhas = String(fonte ?? '').replace(/\r\n?/g, '\n').split('\n');
  let rodape = false;
  let grupo: string[] = [];

  const fechar = () => {
    if (!grupo.length) return;
    const g = grupo;
    grupo = [];
    if (rodape) { blocos.push({ tipo: 'rodape', linhas: g.map(trechos) }); return; }
    const m = CLAUSULA.exec(g[0]);
    if (m) {
      const numero = m[1];
      const nivel = numero.split('.').filter(Boolean).length - 1;
      blocos.push({ tipo: 'clausula', numero, nivel, linhas: [m[2], ...g.slice(1)].map(trechos) });
    } else blocos.push({ tipo: 'paragrafo', linhas: g.map(trechos) });
  };

  for (const bruta of linhas) {
    const l = bruta.trimEnd();
    const t = l.trim();
    if (!t) { fechar(); continue; }
    if (/^-{3,}$/.test(t)) { fechar(); rodape = true; continue; }
    if (!rodape && t.startsWith('### ')) { fechar(); blocos.push({ tipo: 'secao', ...cabecalho(t.slice(4), usados) }); continue; }
    if (!rodape && t.startsWith('## ')) { fechar(); blocos.push({ tipo: 'parte', ...cabecalho(t.slice(3), usados) }); continue; }
    if (!rodape && t.startsWith('# ')) { fechar(); blocos.push({ tipo: 'titulo', texto: t.slice(2).trim() }); continue; }
    if (!rodape && t.startsWith('> ')) {
      fechar();
      const anterior = blocos[blocos.length - 1];
      if (anterior?.tipo === 'meta') anterior.linhas.push(trechos(t.slice(2)));
      else blocos.push({ tipo: 'meta', linhas: [trechos(t.slice(2))] });
      continue;
    }
    grupo.push(t);
  }
  fechar();
  return blocos;
}

/** Índice: cada parte com as suas seções (seções antes de qualquer parte viram itens soltos). */
export function indiceDosTermos(blocos: Bloco[]): ItemDoIndice[] {
  const itens: ItemDoIndice[] = [];
  for (const b of blocos) {
    if (b.tipo === 'parte') itens.push({ texto: b.texto, id: b.id, filhos: [] });
    else if (b.tipo === 'secao') {
      const pai = itens[itens.length - 1];
      if (pai) pai.filhos.push({ texto: b.texto, id: b.id });
      else itens.push({ texto: b.texto, id: b.id, filhos: [] });
    }
  }
  return itens;
}

/** O texto puro (para comparar versões e conferir a conversão). */
export function textoPuro(blocos: Bloco[]): string {
  const linha = (l: Linha) => l.map((x) => x.v).join('');
  return blocos
    .map((b) => {
      switch (b.tipo) {
        case 'titulo': case 'parte': case 'secao': return b.texto;
        case 'clausula': return [`${b.numero} ${linha(b.linhas[0])}`, ...b.linhas.slice(1).map(linha)].join('\n');
        default: return b.linhas.map(linha).join('\n');
      }
    })
    .join('\n');
}
