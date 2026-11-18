/**
 * Aba "IA" do admin: ajustar cada IA sem código e ver as conversas com a IA.
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { AdminAiAjustesSection } from "@/features/admin/components/AdminAiAjustesSection";
import { AdminAiConversasSection } from "@/features/admin/components/AdminAiConversasSection";
import { AdminAiUsoSection } from "@/features/admin/components/AdminAiUsoSection";

const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));
vi.mock("@/lib/queryClient", () => ({ apiRequest: apiRequestMock, API_BASE_URL: "https://api.test" }));
const ok = (body: unknown) => ({ ok: true, json: async () => body });

beforeEach(() => apiRequestMock.mockReset());

describe("ajustes de cada IA", () => {
  const ia = { tipo: "perfil", nome: "Perfil de demanda (profissional)", onde: "Conversa do perfil", padrao: "INSTRUCOES DO CODIGO", padroes: { esforco: "medium", max_tokens: 8000 }, ajuste: { ligada: true, instrucoes: null, extra: null, modelo: null, esforco: null, max_tokens: null, limite_por_hora: null, teto_diario_usd: null }, historico: [{ instrucoes: null, extra: "Versão antiga", em: "2026-11-15T10:00:00Z", por: "a@b.com" }] };

  it("mostra as instruções do código e salva o acréscimo, o esforço, o limite e o teto", async () => {
    apiRequestMock.mockResolvedValueOnce(ok({ ajustes: [ia] })).mockResolvedValueOnce(ok({ success: true }));
    render(<AdminAiAjustesSection />);
    expect(await screen.findByDisplayValue("INSTRUCOES DO CODIGO")).toBeTruthy();
    expect(screen.getByText("Padrão")).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText(/sempre sugira a vistoria/), { target: { value: "Seja breve" } });
    expect(screen.queryByText(/temperatura/i)).toBeNull();
    fireEvent.change(screen.getByLabelText("Esforço"), { target: { value: "high" } });
    fireEvent.change(screen.getByPlaceholderText(/Padrão: 120/), { target: { value: "30" } });
    fireEvent.change(screen.getByPlaceholderText("Sem teto"), { target: { value: "2.5" } });
    fireEvent.click(screen.getByText("Salvar"));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledTimes(2));
    const [metodo, caminho, corpo] = apiRequestMock.mock.calls[1];
    expect(metodo).toBe("PUT");
    expect(caminho).toBe("/admin/ai-settings/ajustes/perfil");
    // instruções iguais às do código não vão como próprias
    expect(corpo).toMatchObject({ ligada: true, extra: "Seja breve", esforco: "high", limite_por_hora: 30, teto_diario_usd: 2.5, max_tokens: null, instrucoes: null });
    expect(await screen.findByText(/Vale no app em até 30 segundos/)).toBeTruthy();
  });
});

describe("versões e uso", () => {
  it("carrega uma versão anterior no formulário sem salvar sozinho", async () => {
    const ia = { tipo: "pedido", nome: "Pedido", onde: "x", padrao: "PADRAO", ajuste: { ligada: true, instrucoes: null, extra: "Atual", modelo: null, esforco: null, max_tokens: null, limite_por_hora: null, teto_diario_usd: null }, historico: [{ instrucoes: null, extra: "Antiga", em: "2026-11-15T10:00:00Z", por: "a@b.com" }] };
    apiRequestMock.mockResolvedValueOnce(ok({ ajustes: [ia] }));
    render(<AdminAiAjustesSection />);
    fireEvent.click(await screen.findByText(/Versões anteriores \(1\)/));
    fireEvent.click(screen.getByText("Carregar esta versão"));
    expect(screen.getByDisplayValue("Antiga")).toBeTruthy();
    expect(apiRequestMock).toHaveBeenCalledTimes(1);
  });

  it("mostra o gasto de cada IA no período", async () => {
    apiRequestMock.mockResolvedValueOnce(ok({ uso: { desde: "2026-10-20", dias: 30, tipos: [{ tipo: "pedido", chamadas: 10, erros: 1, tokens_entrada: 1000, tokens_saida: 500, tokens_cache: 3000, custo_usd: 0.5, hoje_usd: 0.1 }], por_dia: [{ dia: "2026-11-18", custo_usd: 0.5 }] } }));
    render(<AdminAiUsoSection />);
    expect(await screen.findByText("Pedido do cliente")).toBeTruthy();
    expect(screen.getByText(/Gasto nos últimos 30 dias/)).toBeTruthy();
    expect(screen.getByText("75%")).toBeTruthy();
    expect(apiRequestMock.mock.calls[0][1]).toBe("/admin/ai-uso?dias=30");
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
