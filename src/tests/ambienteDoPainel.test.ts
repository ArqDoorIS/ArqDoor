import { describe, expect, it } from "vitest";
import { ambienteDoServidor, estaNoPainel, servidorDoSite, SERVIDOR_DO_AMBIENTE } from "@/lib/ambienteDoPainel";

describe("ambiente do painel", () => {
  it("reconhece o painel pelo host admin. ou pelo caminho /admin", () => {
    expect(estaNoPainel({ hostname: "admin.arqdoor.com", pathname: "/" })).toBe(true);
    expect(estaNoPainel({ hostname: "arqdoor.com", pathname: "/admin" })).toBe(true);
    expect(estaNoPainel({ hostname: "arqdoor.com", pathname: "/administrar" })).toBe(false);
    expect(estaNoPainel({ hostname: "arqdoor.com", pathname: "/" })).toBe(false);
  });

  it("no painel, o servidor é o do ambiente escolhido", () => {
    expect(servidorDoSite("https://api.arqdoor.com", true, "staging")).toBe(SERVIDOR_DO_AMBIENTE.staging);
    expect(servidorDoSite("https://api.staging.arqdoor.com", true, "producao")).toBe(SERVIDOR_DO_AMBIENTE.producao);
  });

  it("sem escolha, ou fora do painel, vale o servidor da compilação", () => {
    expect(servidorDoSite("https://api.arqdoor.com", true, null)).toBe("https://api.arqdoor.com");
    expect(servidorDoSite("https://api.arqdoor.com", false, "staging")).toBe("https://api.arqdoor.com");
  });

  it("sabe de que ambiente é cada servidor", () => {
    expect(ambienteDoServidor("https://api.staging.arqdoor.com")).toBe("staging");
    expect(ambienteDoServidor("https://api.arqdoor.com")).toBe("producao");
  });
});
