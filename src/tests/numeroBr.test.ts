import { describe, expect, it } from "vitest";
import { contagem, lerNumero, mostrarNumero } from "@/lib/numeroBr";

describe("números no padrão pt-BR", () => {
  it("mostra com ponto no milhar e vírgula nas casas", () => {
    expect(mostrarNumero(1000)).toBe("1.000");
    expect(mostrarNumero(12345.5)).toBe("12.345,5");
    expect(mostrarNumero(0.03)).toBe("0,03");
    expect(mostrarNumero(2.17584, 4)).toBe("2,1758");
    expect(contagem(1500)).toBe("1.500");
    expect(contagem(7)).toBe("7");
    expect(contagem(null)).toBe("-");
  });

  it("lê de volta o que mostrou", () => {
    for (const v of [0.03, 1, 1.5, 2.1758, 30, 500, 1000, 1500, 12345.5, 1234567]) expect(lerNumero(mostrarNumero(v))).toBe(v);
  });

  it("lê o que a pessoa digita", () => {
    expect(lerNumero("1.000")).toBe(1000);
    expect(lerNumero("12.500.000")).toBe(12500000);
    expect(lerNumero("1.234,56")).toBe(1234.56);
    expect(lerNumero("1,5")).toBe(1.5);
    expect(lerNumero(",5")).toBe(0.5);
    expect(lerNumero(" 30 ")).toBe(30);
    expect(lerNumero("-0,2")).toBe(-0.2);
    // ponto que não forma grupo de três é decimal (quem digita no padrão americano)
    expect(lerNumero("1.5")).toBe(1.5);
    expect(lerNumero("0.03")).toBe(0.03);
    expect(lerNumero("0.035")).toBe(0.035);
    expect(lerNumero("2.1758")).toBe(2.1758);
    expect(lerNumero("1.00")).toBe(1);
  });

  it("vazio ou fora do formato é NaN, nunca 0", () => {
    for (const t of ["", "   ", "-", "abc", "1,2,3", "1.0,5", "10.00.000", "1e3", "1,5.0"]) expect(lerNumero(t)).toBeNaN();
  });
});
