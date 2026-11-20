/**
 * Janela "Os termos de uso mudaram" (20/11/2026): aceite pelo site e o 409 de versão nova.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiRequestMock, navegar, logout, rota } = vi.hoisted(() => ({
  apiRequestMock: vi.fn(), navegar: vi.fn(), logout: vi.fn(async () => {}), rota: { v: "/home" },
}));
vi.mock("@/lib/queryClient", () => ({ apiRequest: apiRequestMock, API_BASE_URL: "https://api.test" }));
vi.mock("wouter", () => ({ useLocation: () => [rota.v, navegar] }));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { id: 7 }, isLoggedIn: true, isInitialized: true, needsOnboarding: false, logout }),
}));

import AceiteDosTermos from "@/features/termos/AceiteDosTermos";

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
const texto = (n: number) => `# Termos versão ${n}\n\n## Termos de Uso {#termos}\n\n### 1. Início {#t1}\n\n1.1. Cláusula da versão ${n}.`;
const termos = (n: number) => ({ data: { versao: n, conteudo: texto(n), resumo: `Mudança da versão ${n}`, publicada_em: null } });

let emVigor = 2;
let respostaDoAceite: () => unknown;
beforeEach(() => {
  emVigor = 2;
  rota.v = "/home";
  navegar.mockReset();
  logout.mockClear();
  respostaDoAceite = () => ok({ data: { versao: emVigor } });
  apiRequestMock.mockReset();
  apiRequestMock.mockImplementation(async (metodo: string, caminho: string) => {
    if (caminho === "/users/me/termos") return ok({ data: { versao_atual: emVigor, versao_aceita: 1, precisa_aceitar: true, resumo: null } });
    // A janela pede a versão exata, com marcador contra a cópia do navegador.
    const versao = /^\/termos\/versoes\/(\d+)\?_=\d+$/.exec(caminho);
    if (versao) return ok(termos(Number(versao[1])));
    if (metodo === "POST" && caminho === "/users/me/termos/aceitar") return respostaDoAceite();
    throw new Error(`inesperado ${metodo} ${caminho}`);
  });
});

const aceitar = () => screen.getByRole("button", { name: "Aceitar" });

describe("janela de aceite dos termos", () => {
  it("mostra o que mudou e o texto, e aceita com origem site", async () => {
    render(<AceiteDosTermos />);
    expect(await screen.findByText("Os termos de uso mudaram")).toBeTruthy();
    expect(screen.getByTestId("resumo-dos-termos").textContent).toBe("O que mudou: Mudança da versão 2");
    expect(screen.getByText("Cláusula da versão 2.")).toBeTruthy();
    expect((aceitar() as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole("checkbox"));
    expect((aceitar() as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(aceitar());

    await waitFor(() => expect(screen.queryByText("Os termos de uso mudaram")).toBeNull());
    expect(apiRequestMock).toHaveBeenCalledWith("POST", "/users/me/termos/aceitar", { versao: 2, origem: "site" });
  });

  it("no 409 busca a versão nova, mostra e pede o aceite de novo", async () => {
    respostaDoAceite = () => {
      return { ok: false, status: 409, json: async () => ({ message: "Os termos mudaram.", versao_atual: 3 }) };
    };
    render(<AceiteDosTermos />);
    await screen.findByText("Cláusula da versão 2.");
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(aceitar());

    expect(await screen.findByText("Cláusula da versão 3.")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toMatch(/mudaram de novo/);
    expect(screen.getByTestId("resumo-dos-termos").textContent).toContain("Mudança da versão 3");
    expect(screen.getByRole("checkbox").getAttribute("aria-checked")).toBe("false");

    respostaDoAceite = () => ok({ data: { versao: 3 } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(aceitar());
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("POST", "/users/me/termos/aceitar", { versao: 3, origem: "site" }));
    await waitFor(() => expect(screen.queryByText("Os termos de uso mudaram")).toBeNull());
  });

  it("no 409 usa a versão do corpo do erro, não uma cópia velha", async () => {
    respostaDoAceite = () => ({ ok: false, status: 409, json: async () => ({ message: "Os termos mudaram.", versao_atual: 3 }) });
    render(<AceiteDosTermos />);
    await screen.findByText("Cláusula da versão 2.");
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(aceitar());
    expect(await screen.findByText("Cláusula da versão 3.")).toBeTruthy();
    const caminhos = apiRequestMock.mock.calls.map((c) => c[1] as string);
    expect(caminhos.some((c) => /^\/termos\/versoes\/3\?_=/.test(c))).toBe(true);
    expect(caminhos).not.toContain("/termos");
  });

  it("confere de novo ao trocar de página: termos publicados na sessão e consulta que falhou", async () => {
    let falhar = true;
    let precisa = false;
    apiRequestMock.mockImplementation(async (_m: string, caminho: string) => {
      if (caminho === "/users/me/termos") {
        if (falhar) throw new Error("rede");
        return ok({ data: { versao_atual: 2, versao_aceita: precisa ? 1 : 2, precisa_aceitar: precisa, resumo: null } });
      }
      if (caminho.startsWith("/termos/versoes/2?_=")) return ok(termos(2));
      throw new Error(`inesperado ${caminho}`);
    });
    const { rerender } = render(<AceiteDosTermos />);
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledTimes(1));

    // A consulta falhou; na página seguinte tenta de novo (uma vez).
    falhar = false;
    rota.v = "/projetos";
    rerender(<AceiteDosTermos />);
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledTimes(2));
    expect(screen.queryByText("Os termos de uso mudaram")).toBeNull();

    // Publicaram a versão 2 durante a sessão: a próxima página já pede o aceite.
    precisa = true;
    rota.v = "/home";
    rerender(<AceiteDosTermos />);
    expect(await screen.findByText("Cláusula da versão 2.")).toBeTruthy();

    // Mesma página, sem troca: não consulta de novo.
    const antes = apiRequestMock.mock.calls.length;
    rerender(<AceiteDosTermos />);
    await new Promise((r) => setTimeout(r, 20));
    expect(apiRequestMock.mock.calls.length).toBe(antes);
  });

  it("Sair da conta sai e vai para o login", async () => {
    render(<AceiteDosTermos />);
    fireEvent.click(await screen.findByRole("button", { name: "Sair da conta" }));
    await waitFor(() => expect(logout).toHaveBeenCalled());
    expect(navegar).toHaveBeenCalledWith("/auth");
  });

  it("não aparece na própria página dos termos nem no convite", async () => {
    for (const r of ["/termos-de-uso", "/convite/abc", "/admin"]) {
      rota.v = r;
      const { unmount } = render(<AceiteDosTermos />);
      await new Promise((ok) => setTimeout(ok, 20));
      expect(screen.queryByText("Os termos de uso mudaram")).toBeNull();
      unmount();
    }
    expect(apiRequestMock).not.toHaveBeenCalled();
  });
});
