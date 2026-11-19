/**
 * Aba "IA" do admin: ajustar cada IA sem código e ver as conversas com a IA.
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { AdminAiAjustesSection } from "@/features/admin/components/AdminAiAjustesSection";
import { AdminAiConversasSection } from "@/features/admin/components/AdminAiConversasSection";
import { AdminAiUsoSection } from "@/features/admin/components/AdminAiUsoSection";
import { AdminAiLimitesCard } from "@/features/admin/components/AdminAiLimitesCard";

const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));
vi.mock("@/lib/queryClient", () => ({ apiRequest: apiRequestMock, API_BASE_URL: "https://api.test" }));
const ok = (body: unknown) => ({ ok: true, json: async () => body });
const limitesDoMes = (extra: Record<string, unknown> = {}) => ({
  mes: "2026-11", gasto_mes_usd: 12.3, teto_pessoa_dia_usd: 4, alertas_mes_usd: [40, 50],
  padroes: { teto_pessoa_dia_usd: 4, alertas_mes_usd: [40, 50] },
  alertas: [{ limite: 40, passou: false, avisado_em: null }, { limite: 50, passou: false, avisado_em: null }],
  pessoas_hoje: [], ...extra,
});

beforeEach(() => apiRequestMock.mockReset());

describe("ajustes de cada IA", () => {
  const ia = { tipo: "perfil", nome: "Perfil de demanda (profissional)", onde: "Conversa do perfil", padrao: "INSTRUCOES DO CODIGO", padroes: { esforco: "medium", max_tokens: 8000 }, ajuste: { ligada: true, instrucoes: null, extra: null, exemplos: null, modelo: null, esforco: null, max_tokens: null, limite_por_hora: null, teto_diario_usd: null }, historico: [{ instrucoes: null, extra: "Versão antiga", em: "2026-11-15T10:00:00Z", por: "a@b.com" }] };

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
    fireEvent.change(screen.getByLabelText("Exemplos"), { target: { value: "Cliente: oi\nIA: olá" } });
    fireEvent.click(screen.getByText("Salvar"));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledTimes(2));
    const [metodo, caminho, corpo] = apiRequestMock.mock.calls[1];
    expect(metodo).toBe("PUT");
    expect(caminho).toBe("/admin/ai-settings/ajustes/perfil");
    // instruções iguais às do código não vão como próprias
    expect(corpo).toMatchObject({ ligada: true, extra: "Seja breve", esforco: "high", limite_por_hora: 30, teto_diario_usd: 2.5, max_tokens: null, exemplos: "Cliente: oi\nIA: olá", instrucoes: null });
    expect(await screen.findByText(/Vale no app em até 30 segundos/)).toBeTruthy();
  });
});

describe("versões e uso", () => {
  it("carrega uma versão anterior no formulário sem salvar sozinho", async () => {
    const ia = { tipo: "pedido", nome: "Pedido", onde: "x", padrao: "PADRAO", ajuste: { ligada: true, instrucoes: null, extra: "Atual", exemplos: null, modelo: null, esforco: null, max_tokens: null, limite_por_hora: null, teto_diario_usd: null }, historico: [{ instrucoes: null, extra: "Antiga", em: "2026-11-15T10:00:00Z", por: "a@b.com" }] };
    apiRequestMock.mockResolvedValueOnce(ok({ ajustes: [ia] }));
    render(<AdminAiAjustesSection />);
    fireEvent.click(await screen.findByText(/Versões anteriores \(1\)/));
    fireEvent.click(screen.getByText("Carregar esta versão"));
    expect(screen.getByDisplayValue("Antiga")).toBeTruthy();
    expect(apiRequestMock).toHaveBeenCalledTimes(1);
  });

  it("mostra o gasto de cada IA no período", async () => {
    const uso = { desde: "2026-10-20", dias: 30, tipos: [{ tipo: "pedido", chamadas: 10, erros: 1, tokens_entrada: 1000, tokens_saida: 500, tokens_cache: 3000, custo_usd: 0.5, hoje_usd: 0.1 }], por_dia: [{ dia: "2026-11-18", custo_usd: 0.5 }] };
    apiRequestMock.mockImplementation(async (...a: unknown[]) => { const caminho = String(a[1] ?? ""); return (caminho.startsWith("/admin/ai-uso") ? ok({ uso }) : ok({ limites: limitesDoMes() })); });
    render(<AdminAiUsoSection />);
    expect(await screen.findByText("Pedido do cliente")).toBeTruthy();
    expect(screen.getByText(/Gasto nos últimos 30 dias/)).toBeTruthy();
    expect(screen.getByText("75%")).toBeTruthy();
    expect(apiRequestMock.mock.calls.map((c) => c[1])).toContain("/admin/ai-uso?dias=30");
  });
});

describe("conversas com a IA", () => {
  it("lista quem usou, qual IA e o botão, e abre a conversa inteira", async () => {
    apiRequestMock
      .mockResolvedValueOnce(ok({ total: 1, origens: ["inicio_barra"], conversas: [{ id: 5, tipo: "proposta", origem: "inicio_barra", publica: false, turnos: 2, erros: 0, ultima_em: "2026-11-15T15:00:00Z", criada_em: "2026-11-15T14:58:00Z", pessoa: { id: 1, nome: "Rafael Pereira", email: "r@x.com" }, primeira_mensagem: "Reforma de banheiro" }] }))
      .mockResolvedValueOnce(ok({ conversa: { id: 5, tipo: "proposta", origem: "inicio_barra", publica: false, turnos: 2, erros: 0, ultima_em: "2026-11-15T15:00:00Z", pessoa: { id: 1, nome: "Rafael Pereira" }, mensagens: [{ de: "eu", texto: "Reforma de banheiro", em: "2026-11-15T14:58:00Z" }, { de: "ia", texto: "Quais são as fases?", em: "2026-11-15T14:58:05Z", bastidores: { entendi: "Quer orçar a reforma", suposicoes: [], faltando: ["fases"], confianca: "media" } }], resultado: null } }));
    render(<AdminAiConversasSection />);
    expect(await screen.findByText(/Rafael Pereira · r@x.com/)).toBeTruthy();
    expect(screen.getByText(/Proposta com IA · Início do profissional: barra/)).toBeTruthy();
    fireEvent.click(screen.getByText(/Rafael Pereira · r@x.com/));
    expect(await screen.findByText("Quais são as fases?")).toBeTruthy();
    expect(screen.getByText(/Entrou por: Início do profissional: barra/)).toBeTruthy();
    expect(screen.getByText("Bastidores")).toBeTruthy();
    expect(screen.getByText("Quer orçar a reforma")).toBeTruthy();
  });
});

describe("limites de gasto da IA", () => {
  it("sem alerta passado não mostra aviso; mostra o gasto do mês e os valores dos alertas", async () => {
    apiRequestMock.mockResolvedValueOnce(ok({ limites: limitesDoMes() }));
    render(<AdminAiLimitesCard />);
    expect(await screen.findByText(/Gasto em novembro/)).toBeTruthy();
    expect(screen.getByText("US$ 12,30")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText("US$ 40,00: ainda não")).toBeTruthy();
    expect((screen.getByLabelText("Teto por pessoa por dia") as HTMLInputElement).value).toBe("4");
    expect((screen.getByLabelText("Alerta 2 do mês") as HTMLInputElement).value).toBe("50");
    expect(screen.getByText("Ninguém usou a IA hoje")).toBeTruthy();
  });

  it("passou de US$ 40: aparece o aviso com o gasto e quando saiu", async () => {
    apiRequestMock.mockResolvedValueOnce(ok({ limites: limitesDoMes({ gasto_mes_usd: 43.5, alertas: [{ limite: 40, passou: true, avisado_em: "2026-11-19T14:00:00Z" }, { limite: 50, passou: false, avisado_em: null }] }) }));
    render(<AdminAiLimitesCard />);
    const aviso = await screen.findByRole("alert");
    expect(aviso.textContent).toContain("já gastou US$ 43,50 em novembro e passou de US$ 40,00");
    expect(aviso.textContent).toContain("Nada foi bloqueado");
    expect(screen.getByText("US$ 40,00: passou")).toBeTruthy();
  });

  it("lista quem mais gastou hoje, com nome e quem está perto ou bateu o teto", async () => {
    apiRequestMock.mockResolvedValueOnce(ok({ limites: limitesDoMes({ pessoas_hoje: [
      { user_id: 9, custo_usd: 4.1, chamadas: 30, bateu_o_teto: true, pessoa: { id: 9, nome: "Júlia Souza", email: "julia@x.com", tipo: "cliente" } },
      { user_id: 3, custo_usd: 3.2, chamadas: 12, bateu_o_teto: false, pessoa: { id: 3, nome: "Carlos Lima", tipo: "prestador" } },
      { user_id: 5, custo_usd: 0.4, chamadas: 2, bateu_o_teto: false, pessoa: { id: 5 } },
    ] }) }));
    render(<AdminAiLimitesCard />);
    expect(await screen.findByText("Júlia Souza")).toBeTruthy();
    expect(screen.getByText("#9 · julia@x.com · Cliente")).toBeTruthy();
    expect(screen.getByText("#3 · Profissional")).toBeTruthy();
    expect(screen.getByText("Bateu o teto")).toBeTruthy();
    expect(screen.getByText("Perto do teto")).toBeTruthy();
    expect(screen.getByText("Normal")).toBeTruthy();
  });

  it("salva o teto e os alertas no servidor", async () => {
    apiRequestMock
      .mockResolvedValueOnce(ok({ limites: limitesDoMes() }))
      .mockResolvedValueOnce(ok({ success: true }))
      .mockResolvedValueOnce(ok({ limites: limitesDoMes({ teto_pessoa_dia_usd: 3, alertas_mes_usd: [45, 60] }) }));
    render(<AdminAiLimitesCard />);
    fireEvent.change(await screen.findByLabelText("Teto por pessoa por dia"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Alerta 1 do mês"), { target: { value: "45" } });
    fireEvent.change(screen.getByLabelText("Alerta 2 do mês"), { target: { value: "60" } });
    fireEvent.click(screen.getByText("Salvar limites"));
    expect(await screen.findByText(/Limites salvos/)).toBeTruthy();
    const [metodo, caminho, corpo] = apiRequestMock.mock.calls[1];
    expect(metodo).toBe("PUT");
    expect(caminho).toBe("/admin/ai-limites");
    expect(corpo).toEqual({ teto_pessoa_dia_usd: 3, alertas_mes_usd: [45, 60] });
  });

  it("não deixa salvar teto zerado", async () => {
    apiRequestMock.mockResolvedValueOnce(ok({ limites: limitesDoMes() }));
    render(<AdminAiLimitesCard />);
    fireEvent.change(await screen.findByLabelText("Teto por pessoa por dia"), { target: { value: "0" } });
    fireEvent.click(screen.getByText("Salvar limites"));
    expect(await screen.findByText(/maior que zero/)).toBeTruthy();
    expect(apiRequestMock).toHaveBeenCalledTimes(1);
  });
});
