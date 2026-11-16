/**
 * Aba "Textos e avaliações": edita o texto do foguete e mostra as avaliações do app.
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { AdminAppSection } from "@/features/admin/components/AdminAppSection";

const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));
vi.mock("@/lib/queryClient", () => ({ apiRequest: apiRequestMock, API_BASE_URL: "https://api.test" }));
const ok = (body: unknown) => ({ ok: true, json: async () => body });
const TEXTO = { chave: "impulsionamento", rotulo: "Impulsionamento (o foguete)", titulo: "Impulsionamento", texto: "Em breve.", padrao: { titulo: "Impulsionamento", texto: "Em breve." }, personalizado: false, atualizado_em: null };

beforeEach(() => apiRequestMock.mockReset());

describe("aba Textos e avaliações", () => {
  it("edita o texto do foguete e salva no app", async () => {
    apiRequestMock.mockResolvedValueOnce(ok({ textos: [TEXTO], limites: { titulo: 120, texto: 6000 } })).mockResolvedValueOnce(ok({ texto: TEXTO }));
    render(<AdminAppSection />);
    const caixa = await screen.findByDisplayValue("Em breve.");
    fireEvent.change(caixa, { target: { value: "Começa em 1º de dezembro." } });
    fireEvent.click(screen.getByText("Salvar no app"));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledTimes(2));
    expect(apiRequestMock.mock.calls[1]).toEqual(["PUT", "/admin/textos-do-app/impulsionamento", { titulo: "Impulsionamento", texto: "Começa em 1º de dezembro." }]);
    expect(await screen.findByText(/Salvo\. O app mostra o texto novo/)).toBeTruthy();
  });

  it("mostra a média, a distribuição e as avaliações", async () => {
    apiRequestMock
      .mockResolvedValueOnce(ok({ textos: [TEXTO] }))
      .mockResolvedValueOnce(ok({ total: 2, media: 4.5, distribuicao: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 1 }, pagina: 1, paginas: 1, avaliacoes: [{ id: 1, nota: 5, comentario: "Muito útil", plataforma: "android", versao: "2.0.0", em: "2026-11-15T20:00:00Z", pessoa: { id: 3, nome: "Carlos Souza", tipo: "prestador" } }] }));
    render(<AdminAppSection />);
    await screen.findByDisplayValue("Em breve.");
    fireEvent.click(screen.getByText("Avaliações"));
    expect(await screen.findByText("4.5")).toBeTruthy();
    expect(screen.getByText(/Carlos Souza/)).toBeTruthy();
    expect(screen.getByText(/Muito útil/)).toBeTruthy();
  });
});
