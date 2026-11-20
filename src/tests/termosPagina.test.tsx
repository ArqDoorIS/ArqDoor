/**
 * Página pública /termos-de-uso (20/11/2026): lê a versão em vigor do servidor.
 */
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import v1 from "./termos-v1.fixture.txt?raw";

const { apiRequestMock, busca } = vi.hoisted(() => ({ apiRequestMock: vi.fn(), busca: { v: "" } }));
vi.mock("@/lib/queryClient", () => ({ apiRequest: apiRequestMock, API_BASE_URL: "https://api.test" }));
vi.mock("wouter", () => ({ useSearch: () => busca.v }));

import TermosDeUso from "@/pages/TermosDeUso";

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
const versao = (n: number) => ({ data: { versao: n, conteudo: v1, resumo: null, publicada_em: "2026-11-20T12:00:00Z" } });

beforeEach(() => { apiRequestMock.mockReset(); busca.v = ""; });

describe("página /termos-de-uso", () => {
  it("mostra a versão em vigor lida de GET /termos", async () => {
    apiRequestMock.mockResolvedValue(ok(versao(1)));
    render(<TermosDeUso />);
    expect(await screen.findByRole("heading", { level: 1, name: "Termos de Uso e Política de Privacidade" })).toBeTruthy();
    expect(apiRequestMock).toHaveBeenCalledWith("GET", "/termos");
    expect(screen.getByRole("heading", { level: 2, name: "1. Disposições Iniciais" })).toBeTruthy();
    expect(screen.queryByText(/não é a versão em vigor/)).toBeNull();
  });

  it("?versao=N mostra a versão antiga com o aviso", async () => {
    busca.v = "versao=1";
    apiRequestMock.mockImplementation(async (_m: string, caminho: string) => ok(versao(caminho === "/termos" ? 2 : 1)));
    render(<TermosDeUso />);
    expect(await screen.findByText(/Versão 1 \(não é a versão em vigor\)/)).toBeTruthy();
    expect(apiRequestMock).toHaveBeenCalledWith("GET", "/termos/versoes/1");
  });

  it("não avisa versão antiga quando a versão em vigor não carregou", async () => {
    busca.v = "versao=1";
    apiRequestMock.mockImplementation(async (_m: string, caminho: string) =>
      caminho === "/termos" ? { ok: false, status: 500, json: async () => ({}) } : ok(versao(1)));
    render(<TermosDeUso />);
    expect(await screen.findByRole("heading", { level: 2, name: "1. Disposições Iniciais" })).toBeTruthy();
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByText(/não é a versão em vigor/)).toBeNull();
  });

  it("rola até o #privacidade do endereço depois que o texto chega", async () => {
    const rolar = vi.fn();
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = rolar;
    window.history.replaceState(null, "", "/termos-de-uso#privacidade");
    try {
      apiRequestMock.mockResolvedValue(ok(versao(1)));
      render(<TermosDeUso />);
      await screen.findByRole("heading", { level: 2, name: "1. Disposições Iniciais" });
      await waitFor(() => expect(rolar).toHaveBeenCalled());
      expect((rolar.mock.contexts[0] as Element).id).toBe("privacidade");
    } finally {
      Element.prototype.scrollIntoView = original;
      window.history.replaceState(null, "", "/");
    }
  });

  it("o topo tem o ícone do app e o nome ArqDoor, com link para o início", async () => {
    apiRequestMock.mockResolvedValue(ok(versao(1)));
    const { container } = render(<TermosDeUso />);
    await screen.findByRole("heading", { level: 1, name: "Termos de Uso e Política de Privacidade" });
    const marca = container.querySelector("a.td-marca")!;
    expect(marca.getAttribute("href")).toBe("/");
    expect(marca.querySelector("img")).toBeTruthy();
    expect(marca.textContent).toBe("ArqDoor");
  });

  it("sem servidor, mostra o erro com o link do PDF", async () => {
    apiRequestMock.mockResolvedValue({ ok: false, status: 500, json: async () => ({ message: "erro" }) });
    render(<TermosDeUso />);
    const link = await screen.findByRole("link", { name: "abra a versão em PDF" });
    expect(link.getAttribute("href")).toBe("/docs/usetermsprivacitypolices.pdf");
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Não foi possível carregar os termos"));
  });
});
