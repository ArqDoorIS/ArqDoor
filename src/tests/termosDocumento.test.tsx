/**
 * Termos de Uso versionados (20/11/2026): o desenho da versão 1 (o texto da antiga página
 * estática, convertido) a partir dos blocos de src/lib/termos/formato.ts.
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import v1 from "./termos-v1.fixture.txt?raw";
import { DocumentoDosTermos } from "@/features/termos/DocumentoDosTermos";
import { linkSeguro } from "@/lib/termos/formato";

const desenhar = (conteudo: string, prefixo?: string) => render(<DocumentoDosTermos conteudo={conteudo} prefixo={prefixo} />).container;

describe("DocumentoDosTermos com a versão 1", () => {
  it("monta título, partes, seções, cláusulas, negritos e rodapé como a página antiga", () => {
    const c = desenhar(v1);
    expect(c.querySelectorAll("h1")).toHaveLength(1);
    expect(c.querySelector("h1")?.textContent).toBe("Termos de Uso e Política de Privacidade");
    expect(Array.from(c.querySelectorAll(".td-meta")).map((p) => p.textContent)).toEqual([
      "Plataforma ArqDoor — operada por ZAMEED INOVA SIMPLES (I.S.), CNPJ 57.795.075/0001-23.",
      "Última atualização: 29 de julho de 2026.",
    ]);

    const partes = c.querySelectorAll("h2.td-doc");
    expect(Array.from(partes).map((h) => h.id)).toEqual(["termos", "privacidade"]);
    const secoes = c.querySelectorAll("h2:not(.td-doc)");
    expect(Array.from(secoes).map((h) => h.id)).toEqual(["t1", "t2", "t3", "t4", "t5", "t6", "p1", "p2", "p3", "p4"]);

    // 52 cláusulas com o recuo da página antiga: 37 .c, 11 .c-sub, 4 .c-sub2
    expect(c.querySelectorAll("p[data-nivel]")).toHaveLength(52);
    expect(c.querySelectorAll("p.td-c")).toHaveLength(37);
    expect(c.querySelectorAll("p.td-c-sub")).toHaveLength(11);
    expect(c.querySelectorAll("p.td-c-sub2")).toHaveLength(4);
    expect(c.querySelector("p.td-c-sub .td-n")?.textContent).toBe("1.7.1.");
    expect(c.querySelectorAll("strong")).toHaveLength(13);
    expect(c.querySelectorAll("p.td-lead")).toHaveLength(1);

    const rodape = c.querySelector("footer");
    expect(rodape?.textContent).toContain("Rua Doutor Filinto Borja, 166, Brotas, Salvador — BA, CEP 40.285-850");
    const link = rodape?.querySelector("a");
    expect(link?.getAttribute("href")).toBe("/");
    expect(link?.textContent).toBe("arqdoor.com");
  });

  it("monta o índice com as partes e as seções, sem repetir o número", () => {
    const c = desenhar(v1);
    const indice = c.querySelector("nav.td-indice")!;
    expect(indice.querySelector("p")?.textContent).toBe("Índice");
    const links = Array.from(indice.querySelectorAll("a"));
    expect(links).toHaveLength(12);
    expect(links[0].getAttribute("href")).toBe("#termos");
    expect(links[1].getAttribute("href")).toBe("#t1");
    expect(links[1].textContent).toBe("Disposições Iniciais");
    expect(links[11].textContent).toBe("Da Mudança das Políticas de Privacidade");
  });

  it("mostra as frases da página antiga", () => {
    const texto = desenhar(v1).textContent ?? "";
    for (const frase of [
      'inscrita no CNPJ sob o nº 57.795.075/0001-23, doravante simplesmente denominada "Zameed".',
      '"Declaro que li e concordo com os Termos de Uso e Política de Privacidade"',
      "Oferecimento do serviço de intermediação de pagamentos através do pagamento em garantia",
      "A Zameed respeita a privacidade dos seus Usuários",
      "Utilizamos cookies essenciais estritamente para o funcionamento técnico da plataforma e manutenção de sessão.",
      "o Usuário poderá solicitar o encerramento da sua conta e a exclusão de seus dados dos sistemas da ArqDoor.",
      "ZAMEED INOVA SIMPLES (I.S.) — CNPJ 57.795.075/0001-23",
    ]) expect(texto).toContain(frase);
  });

  it("não interpreta HTML do texto e só cria link seguro", () => {
    const c = desenhar("1.1. <b>oi</b> <script>alert(1)</script> [ruim](javascript:alert(1)) [site](https://exemplo.com) [aqui](#t1)");
    expect(c.querySelector("b")).toBeNull();
    expect(c.querySelector("script")).toBeNull();
    expect(c.textContent).toContain("<b>oi</b>");
    const links = Array.from(c.querySelectorAll("a"));
    expect(links.map((a) => a.getAttribute("href"))).toEqual(["https://exemplo.com", "#t1"]);
    expect(links[0].getAttribute("target")).toBe("_blank");
    expect(links[0].getAttribute("rel")).toBe("noreferrer");
    expect(links[1].getAttribute("target")).toBeNull();
  });

  it("recusa caminho que o navegador lê como outro site (// e /\\)", () => {
    expect(linkSeguro("/termos-de-uso#privacidade")).toBe("/termos-de-uso#privacidade");
    expect(linkSeguro("//evil.com")).toBeNull();
    expect(linkSeguro("/\\evil.com")).toBeNull();
    const c = desenhar("1.1. [ruim](/\\evil.com) [bom](/excluir-conta)");
    expect(Array.from(c.querySelectorAll("a")).map((a) => a.getAttribute("href"))).toEqual(["/excluir-conta"]);
  });

  it("põe o prefixo nos ids e nos links do índice", () => {
    const c = desenhar(v1, "aceite-");
    expect(c.querySelector("#aceite-t1")?.textContent).toBe("1. Disposições Iniciais");
    expect(c.querySelector("#t1")).toBeNull();
    expect(c.querySelector("nav.td-indice a")?.getAttribute("href")).toBe("#aceite-termos");
  });
});
