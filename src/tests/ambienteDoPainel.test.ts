import { describe, expect, it } from "vitest";
import {
  ambienteDoEnvio, ambienteDoServidor, ehHostLocal, estaNoPainel, explicacaoDoAmbiente, hostDoServidor, noAmbiente, servidorDoSite,
  SERVIDOR_DO_AMBIENTE,
} from "@/lib/ambienteDoPainel";

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

describe("ambiente de um envio em massa", () => {
  const PROD = "https://arqdoor.com/admin";
  const STAGING = "https://staging.arqdoor.com/admin";
  const LOCAL = "http://localhost:5173/admin";

  it("no caso normal, bate com o domínio do painel", () => {
    expect(ambienteDoEnvio("https://api.arqdoor.com", PROD)).toBe("producao");
    expect(ambienteDoEnvio("https://api.arqdoor.com", "https://admin.arqdoor.com/")).toBe("producao");
    expect(ambienteDoEnvio("https://api.staging.arqdoor.com", STAGING)).toBe("teste");
    expect(ambienteDoEnvio("http://localhost:3000", LOCAL)).toBe("local");
  });

  it("vale o servidor, não a página: é ele que tem as contas", () => {
    // seletor "Staging" no painel de produção
    expect(ambienteDoEnvio(SERVIDOR_DO_AMBIENTE.staging, "https://admin.arqdoor.com/")).toBe("teste");
    // seletor "Produção" no painel do staging
    expect(ambienteDoEnvio(SERVIDOR_DO_AMBIENTE.producao, STAGING)).toBe("producao");
    // localhost sem VITE_API_URL cai em api.arqdoor.com: manda para gente de verdade
    expect(ambienteDoEnvio("https://api.arqdoor.com", LOCAL)).toBe("producao");
  });

  it("servidor relativo é o próprio site; endereço ilegível ou desconhecido conta como produção", () => {
    expect(ambienteDoEnvio("", LOCAL)).toBe("local");
    expect(ambienteDoEnvio("/api", STAGING)).toBe("teste");
    expect(ambienteDoEnvio("/api", PROD)).toBe("producao");
    expect(ambienteDoEnvio("https://api.test", PROD)).toBe("producao");
    expect(ambienteDoEnvio("http://[", "nao e endereco")).toBe("producao");
  });

  it("reconhece os hosts locais", () => {
    for (const h of ["localhost", "127.0.0.1", "0.0.0.0", "[::1]", "192.168.0.12", "10.0.2.2", "172.20.1.5", "app.localhost", "mac.local"]) expect(ehHostLocal(h)).toBe(true);
    for (const h of ["arqdoor.com", "api.staging.arqdoor.com", "172.32.0.1", "localhost.arqdoor.com"]) expect(ehHostLocal(h)).toBe(false);
  });

  it("o texto da confirmação diz o ambiente e o servidor", () => {
    expect(explicacaoDoAmbiente("https://api.arqdoor.com", PROD)).toBe("Chega em pessoas reais. Servidor api.arqdoor.com.");
    expect(explicacaoDoAmbiente("https://api.staging.arqdoor.com", STAGING)).toBe("Ambiente de teste (staging): só as contas do staging recebem. Servidor api.staging.arqdoor.com.");
    expect(explicacaoDoAmbiente("http://localhost:3000", LOCAL)).toBe("Servidor no seu computador: só as contas do banco local recebem. Servidor localhost:3000.");
    expect(explicacaoDoAmbiente("https://api.arqdoor.com", LOCAL)).toBe("O painel está no seu computador, mas fala com o servidor de produção. Chega em pessoas reais. Servidor api.arqdoor.com.");
    expect(hostDoServidor("/api", STAGING)).toBe("staging.arqdoor.com");
  });

  it("o botão final termina com o ambiente", () => {
    expect(noAmbiente("https://api.arqdoor.com", PROD)).toBe("em PRODUÇÃO");
    expect(noAmbiente("https://api.staging.arqdoor.com", STAGING)).toBe("em TESTE");
    expect(noAmbiente("http://127.0.0.1:3000", LOCAL)).toBe("em LOCAL");
  });
});
