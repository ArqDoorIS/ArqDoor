/**
 * Escreve um arquivo .xlsx no navegador, sem biblioteca (19/11/2026).
 *
 * Um .xlsx é um ZIP com alguns arquivos XML (Office Open XML). Aqui:
 *   - o ZIP vai sem compressão (entradas STORED), com o CRC32 de cada arquivo;
 *   - o texto vai direto na célula (t="inlineStr"), sem a tabela de textos compartilhados;
 *   - número vira número; texto, data e o resto viram texto; vazio fica sem célula;
 *   - a 1ª linha (os nomes das colunas) vai em negrito.
 * Abre no Excel, no Google Planilhas e no LibreOffice.
 */

export type Aba = { colunas: string[]; linhas: unknown[][] };
export type Planilhas = Record<string, Aba>;

/* ------------------------------------------------------------------ CRC32 */

const TABELA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(dados: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < dados.length; i += 1) c = TABELA_CRC[(c ^ dados[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/* ------------------------------------------------------------------ ZIP (STORED) */

export type ArquivoDoZip = { nome: string; dados: Uint8Array };

/** Data e hora no formato do MS-DOS (o que o ZIP guarda). */
function dataDos(d: Date) {
  const hora = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
  const dia = ((Math.max(1980, d.getFullYear()) - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { hora, dia };
}

export function zipSemCompressao(arquivos: ArquivoDoZip[], quando = new Date()): Uint8Array {
  const cod = new TextEncoder();
  const { hora, dia } = dataDos(quando);
  const locais: Uint8Array[] = [];
  const centrais: Uint8Array[] = [];
  let posicao = 0;
  for (const a of arquivos) {
    const nome = cod.encode(a.nome);
    const crc = crc32(a.dados);
    const local = new Uint8Array(30 + nome.length);
    const v = new DataView(local.buffer);
    v.setUint32(0, 0x04034b50, true); // assinatura do cabeçalho local
    v.setUint16(4, 20, true); // versão para extrair
    v.setUint16(6, 0x0800, true); // nomes em UTF-8
    v.setUint16(8, 0, true); // 0 = STORED (sem compressão)
    v.setUint16(10, hora, true);
    v.setUint16(12, dia, true);
    v.setUint32(14, crc, true);
    v.setUint32(18, a.dados.length, true);
    v.setUint32(22, a.dados.length, true);
    v.setUint16(26, nome.length, true);
    v.setUint16(28, 0, true);
    local.set(nome, 30);

    const central = new Uint8Array(46 + nome.length);
    const w = new DataView(central.buffer);
    w.setUint32(0, 0x02014b50, true); // assinatura do diretório central
    w.setUint16(4, 20, true);
    w.setUint16(6, 20, true);
    w.setUint16(8, 0x0800, true);
    w.setUint16(10, 0, true);
    w.setUint16(12, hora, true);
    w.setUint16(14, dia, true);
    w.setUint32(16, crc, true);
    w.setUint32(20, a.dados.length, true);
    w.setUint32(24, a.dados.length, true);
    w.setUint16(28, nome.length, true);
    w.setUint32(42, posicao, true); // onde começa o cabeçalho local
    central.set(nome, 46);

    locais.push(local, a.dados);
    centrais.push(central);
    posicao += local.length + a.dados.length;
  }
  const tamanhoCentral = centrais.reduce((s, c) => s + c.length, 0);
  const fim = new Uint8Array(22);
  const f = new DataView(fim.buffer);
  f.setUint32(0, 0x06054b50, true); // fim do diretório central
  f.setUint16(8, arquivos.length, true);
  f.setUint16(10, arquivos.length, true);
  f.setUint32(12, tamanhoCentral, true);
  f.setUint32(16, posicao, true);
  const partes = [...locais, ...centrais, fim];
  const out = new Uint8Array(partes.reduce((s, p) => s + p.length, 0));
  let i = 0;
  for (const p of partes) { out.set(p, i); i += p.length; }
  return out;
}

/* ------------------------------------------------------------------ XML das células */

/** Texto seguro dentro do XML: escapa & < > " ' e tira caracteres de controle que o XML não aceita. */
export function escaparXml(v: string): string {
  return v
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

/** A, B, ..., Z, AA, AB... */
export function letraDaColuna(i: number): string {
  let n = i + 1;
  let s = "";
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

const LIMITE_DA_CELULA = 32767; // o Excel não aceita texto maior numa célula

/** Data vira texto "18/11/2026 23:26" (horário de Brasília). */
const dataEmTexto = (d: Date) => d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).replace(",", "");

/** Uma célula. Número finito vira número; o resto vira texto; vazio não gera célula. */
export function celula(v: unknown, ref: string, estilo?: number): string {
  if (v == null || v === "") return "";
  const s = estilo ? ` s="${estilo}"` : "";
  if (typeof v === "number" && Number.isFinite(v)) return `<c r="${ref}"${s}><v>${v}</v></c>`;
  const texto = v instanceof Date ? dataEmTexto(v) : typeof v === "boolean" ? (v ? "sim" : "não") : typeof v === "object" ? JSON.stringify(v) : String(v);
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${escaparXml(texto.slice(0, LIMITE_DA_CELULA))}</t></is></c>`;
}

/** Nome de aba válido no Excel: até 31 letras, sem []:*?/\ e sem repetir. */
export function nomeDaAba(nome: string, usados: Set<string>): string {
  const base = (nome.replace(/[[\]:*?/\\]/g, " ").replace(/^'+|'+$/g, "").trim() || "Aba").slice(0, 31);
  let n = base;
  for (let i = 2; usados.has(n.toLowerCase()); i += 1) n = `${base.slice(0, 31 - String(i).length - 1)} ${i}`;
  usados.add(n.toLowerCase());
  return n;
}

function xmlDaAba(aba: Aba): string {
  const linhas = [aba.colunas, ...aba.linhas].map((linha, r) => {
    const cels = linha.map((v, c) => celula(v, `${letraDaColuna(c)}${r + 1}`, r === 0 ? 1 : undefined)).join("");
    return `<row r="${r + 1}">${cels}</row>`;
  }).join("");
  const largura = aba.colunas.map((_, i) => `<col min="${i + 1}" max="${i + 1}" width="18" customWidth="1"/>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>${largura ? `<cols>${largura}</cols>` : ""}<sheetData>${linhas}</sheetData></worksheet>`;
}

const CABECALHO = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const ESTILOS = `${CABECALHO}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

/** Os arquivos do .xlsx (antes do ZIP). Exportada para teste. */
export function partesDoXlsx(planilhas: Planilhas): ArquivoDoZip[] {
  const cod = new TextEncoder();
  const usados = new Set<string>();
  const abas = Object.entries(planilhas).map(([nome, aba]) => ({ nome: nomeDaAba(nome, usados), aba }));
  if (!abas.length) abas.push({ nome: "Vazia", aba: { colunas: ["sem dados"], linhas: [] } });
  const tipos = `${CABECALHO}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${abas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`;
  const rels = `${CABECALHO}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  const livro = `${CABECALHO}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${abas.map((a, i) => `<sheet name="${escaparXml(a.nome)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`;
  const relsDoLivro = `${CABECALHO}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${abas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${abas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  return [
    { nome: "[Content_Types].xml", dados: cod.encode(tipos) },
    { nome: "_rels/.rels", dados: cod.encode(rels) },
    { nome: "xl/workbook.xml", dados: cod.encode(livro) },
    { nome: "xl/_rels/workbook.xml.rels", dados: cod.encode(relsDoLivro) },
    { nome: "xl/styles.xml", dados: cod.encode(ESTILOS) },
    ...abas.map((a, i) => ({ nome: `xl/worksheets/sheet${i + 1}.xml`, dados: cod.encode(xmlDaAba(a.aba)) })),
  ];
}

/** O .xlsx pronto (bytes). */
export function montarXlsx(planilhas: Planilhas, quando = new Date()): Uint8Array {
  return zipSemCompressao(partesDoXlsx(planilhas), quando);
}

export const TIPO_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** "analise-arqdoor-2026-11-19.xlsx" (data de Brasília). */
export function nomeDaPlanilha(quando = new Date()): string {
  const d = quando.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }); // AAAA-MM-DD
  return `analise-arqdoor-${d}.xlsx`;
}
