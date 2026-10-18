import { describe, expect, it } from "vitest";
import { nivelParaExibir } from "@/lib/nivel-de-confianca";

// Nível de confiança do servidor no site (spec 2026-10-confianca-site).

const doDono = {
  percentual: 50,
  verificado: false,
  resumo: "3 itens pendentes para chegar a 100%.",
  itens: [
    { chave: "documento_fiscal", rotulo: "CPF ou CNPJ", estado: "validado", o_que_falta: null },
    { chave: "foto", rotulo: "Foto de perfil", estado: "em_analise", o_que_falta: "Envie RG ou CNH" },
    { chave: "localizacao", rotulo: "Localização", estado: "pendente", o_que_falta: "Informe sua cidade e estado" },
  ],
  documentos: [{ id: 1, type: "rg", status: "aprovado" }],
};

const publico = {
  percentual: 50,
  verificado: false,
  itens: [
    { chave: "documento_fiscal", rotulo: "CPF ou CNPJ", validado: true },
    { chave: "foto", rotulo: "Foto de perfil", validado: false },
  ],
};

describe("nivelParaExibir", () => {
  it("dono vê em análise e o que falta em cada item", () => {
    expect(nivelParaExibir(doDono)).toEqual({
      percentual: 50,
      linhas: [
        { chave: "documento_fiscal", rotulo: "CPF ou CNPJ", estado: "validado", texto: "Validado" },
        { chave: "foto", rotulo: "Foto de perfil", estado: "em_analise", texto: "Envie RG ou CNH" },
        { chave: "localizacao", rotulo: "Localização", estado: "pendente", texto: "Informe sua cidade e estado" },
      ],
    });
  });

  it("visitante vê só validado ou ainda não validado", () => {
    expect(nivelParaExibir(publico)?.linhas.map((l) => [l.estado, l.texto])).toEqual([
      ["validado", "Validado"],
      ["pendente", "Ainda não validado"],
    ]);
  });

  it("o percentual é o do servidor, sem teto nem conta local", () => {
    expect(nivelParaExibir({ percentual: 83.4, itens: [] })?.percentual).toBe(83);
    expect(nivelParaExibir({ percentual: 140, itens: [] })?.percentual).toBe(100);
  });

  it("resposta quebrada não vira número inventado", () => {
    expect(nivelParaExibir(undefined)).toBeNull();
    expect(nivelParaExibir({ percentual: "x", itens: [] })).toBeNull();
    expect(nivelParaExibir({ percentual: 50 })).toBeNull();
  });

  it("item sem chave é ignorado", () => {
    expect(nivelParaExibir({ percentual: 0, itens: [null, { rotulo: "?" }] })?.linhas).toEqual([]);
  });
});
