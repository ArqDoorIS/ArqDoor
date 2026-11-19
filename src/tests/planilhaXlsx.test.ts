/**
 * Planilha da Análise: o .xlsx escrito no navegador (ZIP sem compressão + XML) e o texto da
 * conversa com a IA para baixar.
 */
import { describe, expect, it } from "vitest";
import { celula, crc32, escaparXml, letraDaColuna, montarXlsx, nomeDaAba, nomeDaPlanilha, partesDoXlsx } from "@/features/admin/components/analise/planilha";
import { conversaEmJson, conversaEmTexto, horaDaMensagem, nomeDoArquivoDaConversa } from "@/features/admin/components/conversaParaBaixar";

const cod = new TextEncoder();
const dec = new TextDecoder();

/** Lê um ZIP STORED: as entradas locais e o diretório central, conferindo o que o leitor confere. */
function lerZip(bytes: Uint8Array) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const fim = bytes.length - 22;
  expect(v.getUint32(fim, true)).toBe(0x06054b50);
  const total = v.getUint16(fim + 10, true);
  const tamanhoCentral = v.getUint32(fim + 12, true);
  const inicioCentral = v.getUint32(fim + 16, true);
  expect(inicioCentral + tamanhoCentral).toBe(fim);
  const arquivos: Record<string, { crc: number; dados: Uint8Array }> = {};
  let p = inicioCentral;
  for (let i = 0; i < total; i += 1) {
    expect(v.getUint32(p, true)).toBe(0x02014b50);
    const crcCentral = v.getUint32(p + 16, true);
    const tam = v.getUint32(p + 20, true);
    const nLen = v.getUint16(p + 28, true);
    const local = v.getUint32(p + 42, true);
    const nome = dec.decode(bytes.slice(p + 46, p + 46 + nLen));
    // cabeçalho local
    expect(v.getUint32(local, true)).toBe(0x04034b50);
    expect(v.getUint16(local + 8, true)).toBe(0); // STORED
    expect(v.getUint32(local + 14, true)).toBe(crcCentral);
    expect(v.getUint32(local + 18, true)).toBe(tam);
    expect(v.getUint32(local + 22, true)).toBe(tam);
    const nLocal = v.getUint16(local + 26, true);
    expect(dec.decode(bytes.slice(local + 30, local + 30 + nLocal))).toBe(nome);
    const dados = bytes.slice(local + 30 + nLocal, local + 30 + nLocal + tam);
    expect(crc32(dados)).toBe(crcCentral);
    arquivos[nome] = { crc: crcCentral, dados };
    p += 46 + nLen;
  }
  return arquivos;
}

describe("xlsx sem biblioteca", () => {
  it("CRC32 bate com o valor de referência", () => {
    expect(crc32(cod.encode("123456789"))).toBe(0xcbf43926);
    expect(crc32(new Uint8Array())).toBe(0);
  });

  it("o ZIP tem os arquivos do Office, uma aba por planilha, com CRC certo", () => {
    const bytes = montarXlsx({
      Pessoas: { colunas: ["id", "nome"], linhas: [[1, "Ana"], [2, "Bruno & Cia"]] },
      "Análises": { colunas: ["x"], linhas: [] },
    }, new Date(2026, 10, 19, 10, 30));
    const zip = lerZip(bytes);
    expect(Object.keys(zip)).toEqual([
      "[Content_Types].xml", "_rels/.rels", "xl/workbook.xml", "xl/_rels/workbook.xml.rels", "xl/styles.xml",
      "xl/worksheets/sheet1.xml", "xl/worksheets/sheet2.xml",
    ]);
    const tipos = dec.decode(zip["[Content_Types].xml"].dados);
    expect(tipos).toContain('PartName="/xl/worksheets/sheet2.xml"');
    const livro = dec.decode(zip["xl/workbook.xml"].dados);
    expect(livro).toContain('<sheet name="Pessoas" sheetId="1" r:id="rId1"/>');
    expect(livro).toContain('<sheet name="Análises" sheetId="2" r:id="rId2"/>');
    const aba = dec.decode(zip["xl/worksheets/sheet1.xml"].dados);
    expect(aba).toContain('<c r="A1" s="1" t="inlineStr"><is><t xml:space="preserve">id</t></is></c>'); // cabeçalho em negrito
    expect(aba).toContain('<c r="A3"><v>2</v></c>');
    expect(aba).toContain("Bruno &amp; Cia");
    expect(dec.decode(zip["xl/_rels/workbook.xml.rels"].dados)).toContain('Target="styles.xml"');
  });

  it("células: escapa o XML, número é número, texto que parece número continua texto, data vira texto", () => {
    expect(escaparXml(`a & <b> "c" 'd'\u0001`)).toBe("a &amp; &lt;b&gt; &quot;c&quot; &apos;d&apos;");
    expect(celula(12.5, "B2")).toBe('<c r="B2"><v>12.5</v></c>');
    expect(celula("12", "B2")).toBe('<c r="B2" t="inlineStr"><is><t xml:space="preserve">12</t></is></c>');
    expect(celula(Number.NaN, "B2")).toContain("NaN");
    expect(celula(Number.NaN, "B2")).toContain('t="inlineStr"');
    expect(celula(new Date("2026-11-19T02:26:00Z"), "C1")).toContain(">18/11/2026 23:26<");
    expect(celula(true, "D1")).toContain(">sim<");
    expect(celula(null, "E1")).toBe("");
    expect(celula("", "E1")).toBe("");
    expect(celula("<script>", "F1")).toContain("&lt;script&gt;");
  });

  it("colunas e nomes de aba válidos no Excel", () => {
    expect([0, 25, 26, 27, 701, 702].map(letraDaColuna)).toEqual(["A", "Z", "AA", "AB", "ZZ", "AAA"]);
    const usados = new Set<string>();
    expect(nomeDaAba("Funil: cliente/profissional [v2]?", usados)).toBe("Funil  cliente profissional  v2");
    expect(nomeDaAba("Uma aba com nome comprido demais para o Excel", usados)).toHaveLength(31);
    expect(nomeDaAba("pessoas", usados)).toBe("pessoas");
    expect(nomeDaAba("Pessoas", usados)).toBe("Pessoas 2");
    const partes = partesDoXlsx({});
    expect(partes.map((p) => p.nome)).toContain("xl/worksheets/sheet1.xml");
  });

  it("nome do arquivo com a data de Brasília", () => {
    expect(nomeDaPlanilha(new Date("2026-11-19T12:00:00Z"))).toBe("analise-arqdoor-2026-11-19.xlsx");
    expect(nomeDaPlanilha(new Date("2026-11-20T01:00:00Z"))).toBe("analise-arqdoor-2026-11-19.xlsx");
  });
});

describe("conversa com a IA para baixar", () => {
  const conversa = {
    id: 77, tipo: "pedido", origem: "inicio_busca", publica: false, pessoa: { id: 5, nome: "Ana Lima" },
    mensagens: [
      { de: "eu", texto: "quero trocar o piso da sala", em: "2026-11-19T02:26:00Z" },
      { de: "ia", texto: "Qual o tamanho da sala?\nPode ser aproximado.", em: "2026-11-19T02:26:30Z" },
      { de: "eu", texto: "uns 20 m²" },
    ],
  };

  it("texto legível com hora de Brasília e quem falou", () => {
    const t = conversaEmTexto(conversa);
    expect(t).toContain("Conversa com a IA #77");
    expect(t).toContain("Conta: Ana Lima (PH #5)");
    expect(t).toContain("[18/11 23:26] Pessoa: quero trocar o piso da sala");
    expect(t).toContain("[18/11 23:26] IA: Qual o tamanho da sala?\nPode ser aproximado.");
    expect(t).toContain("\nPessoa: uns 20 m²\n");
    expect(horaDaMensagem("x")).toBe("");
    expect(nomeDoArquivoDaConversa(conversa, "txt")).toBe("conversa-ia-77-pedido.txt");
  });

  it("json sem e-mail, com todas as mensagens", () => {
    const j = JSON.parse(conversaEmJson({ ...conversa, pessoa: { id: 5, nome: "Ana Lima", email: "ana@x.com" } as never }));
    expect(j.pessoa).toEqual({ id: 5, nome: "Ana Lima" });
    expect(j.mensagens).toHaveLength(3);
    expect(j.mensagens[0]).toEqual({ de: "pessoa", texto: "quero trocar o piso da sala", em: "2026-11-19T02:26:00Z" });
  });
});
