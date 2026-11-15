/**
 * Aba "Erros" do admin: lista os erros agrupados e abre o log com o contexto e os passos.
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { AdminErrosSection } from "@/features/admin/components/AdminErrosSection";

const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));
vi.mock("@/lib/queryClient", () => ({ apiRequest: apiRequestMock, API_BASE_URL: "https://api.test" }));
const ok = (body: unknown) => ({ ok: true, json: async () => body });

beforeEach(() => apiRequestMock.mockReset());

describe("aba Erros", () => {
  it("lista, abre o erro com pilha, contexto e passos, e marca como resolvido", async () => {
    apiRequestMock
      .mockResolvedValueOnce(ok({ total: 1, novos: 1, erros: [{ id: 3, origem: "app", tipo: "tela", mensagem: "Cannot read property 'id' of undefined", rota: "/project/505", ocorrencias: 4, pessoas: 2, versoes: ["2.0.0"], status: "novo", primeira_em: "2026-11-15T10:00:00Z", ultima_em: "2026-11-15T16:00:00Z" }] }))
      .mockResolvedValueOnce(ok({ erro: { id: 3, origem: "app", tipo: "tela", mensagem: "Cannot read property 'id' of undefined", rota: "/project/505", ocorrencias: 4, pessoas: 2, versoes: ["2.0.0"], status: "novo", primeira_em: "2026-11-15T10:00:00Z", ultima_em: "2026-11-15T16:00:00Z", stack: "TypeError at ContractDetail (ContractModal.tsx:1300)", nota: null, ultimos: [{ em: "2026-11-15T16:00:00Z", rota: "/project/505", aparelho: { plataforma: "android", modelo: "Pixel 7" }, versao: { app: "2.0.0" }, usuario: { id: 9, nome: "Júlia Martins", tipo: "contratante" }, trilha: [{ em: "2026-11-15T15:59:58Z", tipo: "tela", texto: "/home" }, { em: "2026-11-15T15:59:59Z", tipo: "requisicao", texto: "GET /ticket/505 → 200 (120 ms)" }] }] } }))
      .mockResolvedValueOnce(ok({ erro: { id: 3, status: "resolvido", nota: "" } }));
    render(<AdminErrosSection />);
    expect(await screen.findByText(/Cannot read property 'id'/)).toBeTruthy();
    expect(screen.getByText(/4x · 2 conta/)).toBeTruthy();
    fireEvent.click(screen.getByText(/Cannot read property 'id'/));
    expect(await screen.findByText(/ContractDetail \(ContractModal.tsx:1300\)/)).toBeTruthy();
    expect(screen.getByText(/Júlia Martins/)).toBeTruthy();
    expect(screen.getByText("GET /ticket/505 → 200 (120 ms)")).toBeTruthy();
    expect(screen.getByText(/Pixel 7/)).toBeTruthy();
    fireEvent.click(screen.getByText("Resolvido"));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledTimes(3));
    expect(apiRequestMock.mock.calls[2]).toEqual(expect.arrayContaining(["PATCH", "/admin/erros/3"]));
  });
});
