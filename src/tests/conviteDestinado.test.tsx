/**
 * Helpers do "convite destinado a um CPF" (spec 2026-10-convite-destinado).
 * O comportamento da página (faixa, tela de outra pessoa, bloqueio) está em conviteWeb.test.tsx.
 */
import { mascaraCpf, validarCpf, formatarCpfFinal, cpfBate } from "@/lib/invite-cpf";

describe("mascaraCpf", () => {
  it("formata 11 digitos com pontos e traco", () => {
    expect(mascaraCpf("12345678909")).toBe("123.456.789-09");
  });

  it("mascara parcial enquanto o usuario digita", () => {
    expect(mascaraCpf("123")).toBe("123");
    expect(mascaraCpf("1234")).toBe("123.4");
    expect(mascaraCpf("1234567")).toBe("123.456.7");
  });

  it("ignora caracteres nao-numericos no input", () => {
    expect(mascaraCpf("abc123def456ghi789ij01")).toBe("123.456.789-01");
  });

  it("limita a 11 digitos mesmo que o input tenha mais", () => {
    expect(mascaraCpf("123456789099999")).toBe("123.456.789-09");
  });
});

describe("validarCpf", () => {
  it("aceita um CPF valido com mascara", () => {
    // CPF valido gerado conforme algoritmo
    expect(validarCpf("529.982.247-25")).toBe(true);
  });

  it("aceita um CPF valido sem mascara", () => {
    expect(validarCpf("52998224725")).toBe(true);
  });

  it("rejeita CPF com todos os digitos iguais", () => {
    expect(validarCpf("111.111.111-11")).toBe(false);
    expect(validarCpf("00000000000")).toBe(false);
    expect(validarCpf("999.999.999-99")).toBe(false);
  });

  it("rejeita CPF com digito verificador errado", () => {
    expect(validarCpf("529.982.247-26")).toBe(false);
  });

  it("rejeita CPF com menos de 11 digitos", () => {
    expect(validarCpf("123.456")).toBe(false);
  });

  it("rejeita string vazia", () => {
    expect(validarCpf("")).toBe(false);
  });
});

describe("formatarCpfFinal", () => {
  it("formata 4 chars com hifen no meio", () => {
    expect(formatarCpfFinal("8901")).toBe("89-01");
    expect(formatarCpfFinal("0000")).toBe("00-00");
  });

  it("retorna vazio para string vazia", () => {
    expect(formatarCpfFinal("")).toBe("");
  });
});

describe("cpfBate", () => {
  it("retorna true quando os 4 ultimos digitos batem", () => {
    expect(cpfBate("52998224725", "4725")).toBe(true);
    expect(cpfBate("529.982.247-25", "4725")).toBe(true);
  });

  it("retorna false quando os 4 ultimos digitos nao batem", () => {
    expect(cpfBate("52998224725", "8901")).toBe(false);
  });

  it("retorna false para CPF vazio", () => {
    expect(cpfBate("", "8901")).toBe(false);
  });

  it("retorna false para CPF com menos de 4 digitos", () => {
    expect(cpfBate("123", "8901")).toBe(false);
  });
});
