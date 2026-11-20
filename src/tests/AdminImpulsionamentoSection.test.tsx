/**
 * Painel > Impulsionamento: regras gerais em versões (com as faixas de pontos por fase) e a
 * lista de profissionais com a conta de cada um, multiplicador, bônus e punições.
 */
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { AdminImpulsionamentoSection, paraNumero } from "@/features/admin/components/AdminImpulsionamentoSection";
import { TABS } from "@/features/admin/constants";

const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));
vi.mock("@/lib/queryClient", () => ({ apiRequest: apiRequestMock, API_BASE_URL: "https://api.test" }));

const ok = (body: unknown) => ({ ok: true, json: async () => body });
const falha = (message: string) => ({ ok: false, json: async () => ({ success: false, message }) });

const PADRAO = {
  base: { inicial: 50, teto: 100 },
  faixas: [{ ate: 1000, pontos: 0.5 }, { ate: 5000, pontos: 2 }, { ate: 20000, pontos: 4 }, { ate: null, pontos: 5 }],
  multiplicadores: { geral: 1 },
  punicoes: { por_reclamacao: 1, por_reembolso: 3 },
  lancamento: { previsto_para: "2027-04-30", bonus_por_cliente: 2, bonus_maximo: 20 },
};
const V2 = { versao: 2, params: { ...PADRAO, multiplicadores: { geral: 1.5 } }, motivo: "Campanha de dezembro", criado_por: "rafael@arqdoor.com", criado_em: "2026-11-20T12:00:00Z" };
const V1 = { versao: 1, params: PADRAO, motivo: "Primeira", criado_por: "rafael@arqdoor.com", criado_em: "2026-11-19T12:00:00Z" };
const LIMITES = {
  base: { inicial: [0, 100], teto: [1, 1000] },
  multiplicadores: { geral: [0, 10] },
  punicoes: { por_reclamacao: [0, 100], por_reembolso: [0, 100] },
  lancamento: { bonus_por_cliente: [0, 100], bonus_maximo: [0, 1000] },
  faixa: { ate: [1, 100000000], pontos: [0, 100] },
};
const CONFIG = { success: true, ativa: V2, padrao: PADRAO, limites: LIMITES, max_faixas: 12, versoes: [V2, V1] };

const LISTA = {
  profissionais: [
    { user_id: 7, nome: "Carlos Pinto", email: "carlos@x.com", profissao: "Pedreiro", suspenso: false, valor: 62.5, fases: 4, clientes: 3, multiplicador: 1.5, bonus: 2, punicoes: 4 },
    { user_id: 8, nome: "Eva Rocha", email: null, profissao: "Pintora", suspenso: false, valor: 50, fases: 0, clientes: 0, multiplicador: 1, bonus: 0, punicoes: 0 },
  ],
};
const DETALHE = {
  profissional: { user_id: 7, nome: "Carlos Pinto", email: "carlos@x.com", profissao: "Pedreiro", suspenso: false },
  conta: {
    valor: 59.3, teto: 100,
    partes: {
      inicial: 50,
      fases: { quantidade: 4, pontos: 3.5, multiplicador_individual: 1.5, multiplicador_geral: 1, total: 5.3 },
      lancamento: { clientes: 3, pontos: 6, previsto_para: "2027-04-30" },
      bonus: 2,
      punicoes: { reclamacoes: 1, reembolsos: 1, automaticas: 4, manuais: 0 },
    },
  },
  individual: { multiplicador: "1.50", valido_ate: "2027-01-01T02:59:59.000Z", motivo: "Parceiro do lançamento", atualizado_por: "rafael@arqdoor.com" },
  ajustes: [
    { id: 11, tipo: "bonus", pontos: "2.00", motivo: "Indicou três clientes", valido_ate: null, criado_por: "rafael@arqdoor.com", created_at: "2026-11-20T10:00:00Z", revogado_em: null, revogado_por: null },
    { id: 10, tipo: "punicao", pontos: "5.00", motivo: "Atrasou a obra", valido_ate: null, criado_por: "rafael@arqdoor.com", created_at: "2026-11-18T10:00:00Z", revogado_em: "2026-11-19T10:00:00Z", revogado_por: "ana@arqdoor.com" },
  ],
};

beforeEach(() => {
  apiRequestMock.mockReset();
  apiRequestMock.mockImplementation((m: string, rota: string, corpo?: any) => {
    if (rota === "/admin/impulsionamento/config" && m === "GET") return Promise.resolve(ok(CONFIG));
    if (rota === "/admin/impulsionamento/config" && m === "PUT") return Promise.resolve(ok({ success: true, versao: 3, params: corpo.params }));
    if (rota === "/admin/impulsionamento/config/restaurar") return Promise.resolve(ok({ success: true, versao: 3 }));
    if (rota.startsWith("/admin/impulsionamento/profissionais?")) return Promise.resolve(ok(LISTA));
    if (rota === "/admin/impulsionamento/profissionais/7") return Promise.resolve(ok(DETALHE));
    if (rota === "/admin/impulsionamento/profissionais/7/multiplicador") return Promise.resolve(falha("O multiplicador vai de 0 a 10 (1 = normal)."));
    if (rota === "/admin/impulsionamento/profissionais/7/ajustes") return Promise.resolve(ok({ success: true, id: 12 }));
    if (rota.startsWith("/admin/impulsionamento/profissionais/7/ajustes/")) return Promise.resolve(ok({ success: true }));
    return Promise.resolve(ok({}));
  });
});

describe("aba Impulsionamento", () => {
  it("existe no menu, só para o owner", () => {
    expect(TABS.find((t) => t.key === "impulsionamento")).toMatchObject({ label: "Impulsionamento", papeis: ["owner"] });
  });

  it("lê número com vírgula e milhar em reais", () => {
    expect(paraNumero("1,5")).toBe(1.5);
    expect(paraNumero("10.000", true)).toBe(10000);
    expect(paraNumero("10.000,50", true)).toBe(10000.5);
    expect(paraNumero("")).toBeNaN();
  });

  it("regras: mostra as faixas e salva a versão nova com as faixas no corpo", async () => {
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<AdminImpulsionamentoSection />);
    const caixa = await screen.findByTestId("regras-do-impulsionamento");
    expect(screen.getByText(/Em vigor: versão 2/)).toBeInTheDocument();
    const faixas = within(caixa).getAllByTestId("faixa-de-pontos");
    expect(faixas).toHaveLength(4);
    expect(faixas[3]).toHaveTextContent("Acima disso");
    expect(within(faixas[3]).queryByLabelText(/Até R\$/)).toBeNull();
    expect(within(caixa).getByLabelText("Multiplicador geral")).toHaveValue("1,5");
    expect(within(caixa).getByLabelText("Até R$ (faixa 3)")).toHaveValue("20000");

    const salvar = within(caixa).getByRole("button", { name: /Salvar como versão 3/ });
    expect(salvar).toBeDisabled();

    fireEvent.change(within(caixa).getByLabelText("Pontos (faixa 1)"), { target: { value: "0,75" } });
    fireEvent.click(within(caixa).getByRole("button", { name: /Nova faixa/ }));
    expect(within(caixa).getAllByTestId("faixa-de-pontos")).toHaveLength(5);
    expect(within(caixa).getByLabelText("Até R$ (faixa 4)")).toHaveValue("40000");
    fireEvent.change(within(caixa).getByLabelText("Pontos (faixa 4)"), { target: { value: "4,5" } });
    fireEvent.change(within(caixa).getByLabelText("Data prevista do lançamento"), { target: { value: "2027-05-15" } });
    expect(within(caixa).getByText(/Mudanças: /)).toHaveTextContent("pontos por fase");

    fireEvent.change(within(caixa).getByPlaceholderText(/Motivo da mudança/), { target: { value: "Faixa nova acima de 20 mil" } });
    expect(salvar).toBeEnabled();
    fireEvent.click(salvar);
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("PUT", "/admin/impulsionamento/config", {
      motivo: "Faixa nova acima de 20 mil",
      params: {
        base: { inicial: 50, teto: 100 },
        faixas: [{ ate: 1000, pontos: 0.75 }, { ate: 5000, pontos: 2 }, { ate: 20000, pontos: 4 }, { ate: 40000, pontos: 4.5 }, { ate: null, pontos: 5 }],
        multiplicadores: { geral: 1.5 },
        punicoes: { por_reclamacao: 1, por_reembolso: 3 },
        lancamento: { previsto_para: "2027-05-15", bonus_por_cliente: 2, bonus_maximo: 20 },
      },
    }));
    expect(confirmar).toHaveBeenCalledWith("Vale para todos os profissionais na hora. Salvar?");
    expect(await within(caixa).findByRole("status")).toHaveTextContent("Salvo como versão 3");
    confirmar.mockRestore();
  });

  it("regras: multiplicador geral 0 ou teto menor pedem confirmação mais forte; cancelar não salva", async () => {
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<AdminImpulsionamentoSection />);
    const caixa = await screen.findByTestId("regras-do-impulsionamento");
    fireEvent.change(within(caixa).getByLabelText("Multiplicador geral"), { target: { value: "0" } });
    fireEvent.change(within(caixa).getByLabelText("Teto"), { target: { value: "80" } });
    fireEvent.change(within(caixa).getByPlaceholderText(/Motivo da mudança/), { target: { value: "Pausa geral" } });
    fireEvent.click(within(caixa).getByRole("button", { name: /Salvar como versão 3/ }));
    expect(confirmar).toHaveBeenCalledTimes(1);
    const pergunta = String(confirmar.mock.calls[0][0]);
    expect(pergunta).toMatch(/^Atenção: /);
    expect(pergunta).toContain("multiplicador geral fica 0");
    expect(pergunta).toContain("O teto desce de 100 para 80");
    expect(apiRequestMock.mock.calls.some(([m]) => m === "PUT")).toBe(false);
    confirmar.mockRestore();
  });

  it("regras: faixa fora de ordem trava o salvar; dá para tirar faixa e voltar às de fábrica", async () => {
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<AdminImpulsionamentoSection />);
    const caixa = await screen.findByTestId("regras-do-impulsionamento");
    fireEvent.change(within(caixa).getByLabelText("Até R$ (faixa 2)"), { target: { value: "500" } });
    fireEvent.change(within(caixa).getByPlaceholderText(/Motivo da mudança/), { target: { value: "teste" } });
    expect(within(caixa).getByText(/Precisa ficar maior que a faixa de cima/)).toBeInTheDocument();
    expect(within(caixa).getByRole("button", { name: /Salvar como versão/ })).toBeDisabled();

    fireEvent.click(within(caixa).getByRole("button", { name: "Tirar faixa 4" }));
    const faixas = within(caixa).getAllByTestId("faixa-de-pontos");
    expect(faixas).toHaveLength(3);
    expect(faixas[2]).toHaveTextContent("Acima disso");

    fireEvent.click(screen.getByRole("button", { name: /Versões \(2\)/ }));
    expect(within(caixa).getAllByTestId("versao-do-impulsionamento")[0]).toHaveTextContent("mudou: multiplicador geral");
    fireEvent.click(within(caixa).getByRole("button", { name: /Voltar às de fábrica/ }));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("POST", "/admin/impulsionamento/config/restaurar", { versao: 0 }));
    confirmar.mockRestore();
  });

  it("profissionais: lista com o número e os selos, abre a conta somada e lança bônus", async () => {
    render(<AdminImpulsionamentoSection />);
    const linhas = await screen.findAllByTestId("profissional-do-impulsionamento");
    expect(linhas[0]).toHaveTextContent("Carlos Pinto");
    expect(linhas[0]).toHaveTextContent("62,5%");
    expect(linhas[0]).toHaveTextContent("×1,5");
    expect(linhas[0]).toHaveTextContent("+2 bônus");
    expect(linhas[0]).toHaveTextContent("−4 punições");
    expect(linhas[1]).not.toHaveTextContent("bônus");

    fireEvent.click(linhas[0]);
    expect(await screen.findByTestId("soma-da-conta")).toHaveTextContent(
      "Começa em 50 · Fases: 4 fases = 3,5 pts × 1,5 × 1 = 5,3 · Lançamento: 3 clientes = 6 · Bônus +2 · Punições −4 · Total 59,3%",
    );
    expect(screen.getByLabelText("Multiplicador")).toHaveValue("1,5");
    expect(screen.getByLabelText("Multiplicador vale até")).toHaveValue("2026-12-31");
    const ajustes = screen.getAllByTestId("ajuste-do-profissional");
    expect(ajustes[1]).toHaveTextContent("revogado em");
    expect(within(ajustes[1]).queryByRole("button", { name: "Revogar" })).toBeNull();

    fireEvent.change(screen.getByLabelText("Pontos do ajuste"), { target: { value: "2,5" } });
    fireEvent.change(screen.getByLabelText("Motivo do ajuste"), { target: { value: "Ajudou no lançamento" } });
    fireEvent.click(screen.getByRole("button", { name: "Lançar bônus" }));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("POST", "/admin/impulsionamento/profissionais/7/ajustes", { tipo: "bonus", pontos: 2.5, motivo: "Ajudou no lançamento", valido_ate: "" }));
    expect(await screen.findByText("Bônus lançado.")).toBeInTheDocument();
    // depois de gravar, lê de novo a conta e a lista
    await waitFor(() => expect(apiRequestMock.mock.calls.filter(([m, r]) => m === "GET" && r === "/admin/impulsionamento/profissionais/7").length).toBeGreaterThan(1));
    expect(apiRequestMock.mock.calls.filter(([m, r]) => m === "GET" && String(r).startsWith("/admin/impulsionamento/profissionais?")).length).toBeGreaterThan(1);
  });

  it("profissionais: punição, erro da API no multiplicador e revogar com confirmação", async () => {
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<AdminImpulsionamentoSection />);
    fireEvent.click((await screen.findAllByTestId("profissional-do-impulsionamento"))[0]);
    await screen.findByTestId("soma-da-conta");

    fireEvent.click(screen.getByRole("button", { name: "Aplicar punição" }));
    fireEvent.change(screen.getByLabelText("Pontos do ajuste"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Ajuste vale até"), { target: { value: "2027-01-31" } });
    fireEvent.change(screen.getByLabelText("Motivo do ajuste"), { target: { value: "Sumiu da obra" } });
    fireEvent.click(screen.getByRole("button", { name: "Lançar punição" }));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("POST", "/admin/impulsionamento/profissionais/7/ajustes", { tipo: "punicao", pontos: 3, motivo: "Sumiu da obra", valido_ate: "2027-01-31" }));

    fireEvent.change(screen.getByLabelText("Multiplicador"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Motivo do multiplicador"), { target: { value: "Campanha" } });
    fireEvent.click(screen.getByRole("button", { name: /Salvar multiplicador/ }));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("PUT", "/admin/impulsionamento/profissionais/7/multiplicador", { multiplicador: 2, valido_ate: "2026-12-31", motivo: "Campanha" }));
    expect(await screen.findByText("O multiplicador vai de 0 a 10 (1 = normal).")).toBeInTheDocument();

    // multiplicador 0 pede confirmação; cancelar não grava
    confirmar.mockReturnValueOnce(false);
    const putsAntes = apiRequestMock.mock.calls.filter(([m]) => m === "PUT").length;
    fireEvent.change(screen.getByLabelText("Multiplicador"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: /Salvar multiplicador/ }));
    expect(confirmar).toHaveBeenLastCalledWith(expect.stringContaining("Multiplicador 0 zera os pontos das fases"));
    expect(apiRequestMock.mock.calls.filter(([m]) => m === "PUT").length).toBe(putsAntes);

    // "Vale até" não aceita data passada
    const hoje = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
    expect(screen.getByLabelText("Multiplicador vale até")).toHaveAttribute("min", hoje);
    expect(screen.getByLabelText("Ajuste vale até")).toHaveAttribute("min", hoje);

    fireEvent.click(within(screen.getAllByTestId("ajuste-do-profissional")[0]).getByRole("button", { name: "Revogar" }));
    expect(confirmar).toHaveBeenCalled();
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("DELETE", "/admin/impulsionamento/profissionais/7/ajustes/11"));
    confirmar.mockRestore();
  });
});
