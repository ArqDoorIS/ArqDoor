/**
 * Aba "IA" do admin: ajustar cada IA sem código e ver as conversas com a IA.
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { AdminAiAjustesSection } from "@/features/admin/components/AdminAiAjustesSection";
import { AdminAiConversasSection } from "@/features/admin/components/AdminAiConversasSection";

const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));
vi.mock("@/lib/queryClient", () => ({ apiRequest: apiRequestMock, API_BASE_URL: "https://api.test" }));
const ok = (body: unknown) => ({ ok: true, json: async () => body });

beforeEach(() => apiRequestMock.mockReset());

describe("ajustes de cada IA", () => {
  const ia = { tipo: "perfil", nome: "Perfil de demanda (profissional)", onde: "Conversa do perfil", padrao: "INSTRUCOES DO CODIGO", ajuste: { ligada: true, instrucoes: null, extra: null, modelo: null, temperatura: null } };

  it("mostra as instruções do código e salva o acréscimo, o modelo e a temperatura", async () => {
    apiRequestMock.mockResolvedValueOnce(ok({ ajustes: [ia] })).mockResolvedValueOnce(ok({ success: true }));
    render(<AdminAiAjustesSection />);
    expect(await screen.findByDisplayValue("INSTRUCOES DO CODIGO")).toBeTruthy();
    expect(screen.getByText("Padrão")).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText(/sempre sugira a vistoria/), { target: { value: "Seja breve" } });
    fireEvent.change(screen.getByPlaceholderText("Padrão do modelo"), { target: { value: "0.3" } });
    fireEvent.click(screen.getByText("Salvar"));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledTimes(2));
    const [metodo, caminho, corpo] = apiRequestMock.mock.calls[1];
    expect(metodo).toBe("PUT");
    expect(caminho).toBe("/admin/ai-settings/ajustes/perfil");
    // instruções iguais às do código não vão como próprias
    expect(corpo).toMatchObject({ ligada: true, extra: "Seja breve", temperatura: 0.3, instrucoes: null });
    expect(await screen.findByText(/Vale no app em até 30 segundos/)).toBeTruthy();
  });
});

describe("conversas com a IA", () => {
  it("lista quem usou, qual IA e o botão, e abre a conversa inteira", async () => {
    apiRequestMock
      .mockResolvedValueOnce(ok({ total: 1, origens: ["inicio_barra"], conversas: [{ id: 5, tipo: "proposta", origem: "inicio_barra", publica: false, turnos: 2, erros: 0, ultima_em: "2026-11-15T15:00:00Z", criada_em: "2026-11-15T14:58:00Z", pessoa: { id: 1, nome: "Rafael Pereira", email: "r@x.com" }, primeira_mensagem: "Reforma de banheiro" }] }))
      .mockResolvedValueOnce(ok({ conversa: { id: 5, tipo: "proposta", origem: "inicio_barra", publica: false, turnos: 2, erros: 0, ultima_em: "2026-11-15T15:00:00Z", pessoa: { id: 1, nome: "Rafael Pereira" }, mensagens: [{ de: "eu", texto: "Reforma de banheiro", em: "2026-11-15T14:58:00Z" }, { de: "ia", texto: "Quais são as fases?", em: "2026-11-15T14:58:05Z" }], resultado: null } }));
    render(<AdminAiConversasSection />);
    expect(await screen.findByText(/Rafael Pereira · r@x.com/)).toBeTruthy();
    expect(screen.getByText(/Proposta com IA · Início do profissional: barra/)).toBeTruthy();
    fireEvent.click(screen.getByText(/Rafael Pereira · r@x.com/));
    expect(await screen.findByText("Quais são as fases?")).toBeTruthy();
    expect(screen.getByText(/Entrou por: Início do profissional: barra/)).toBeTruthy();
  });
});
