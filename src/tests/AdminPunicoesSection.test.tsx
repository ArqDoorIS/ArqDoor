/**
 * Painel > Punições: as que estão valendo, aplicar (aviso, fora do algoritmo, congelar, banir)
 * em profissional ou cliente, histórico da pessoa e revogar.
 */
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { AdminPunicoesSection } from "@/features/admin/components/AdminPunicoesSection";
import { TABS } from "@/features/admin/constants";

const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));
vi.mock("@/lib/queryClient", () => ({ apiRequest: apiRequestMock, API_BASE_URL: "https://api.test" }));

const ok = (body: unknown) => ({ ok: true, json: async () => body });
const falha = (message: string) => ({ ok: false, json: async () => ({ success: false, message }) });

const EM_VIGOR = {
  punicoes: [
    { id: 3, user_id: 9, nivel: "congelada", motivo: "Cobrou por fora da plataforma", nota_interna: "Print no suporte", valido_ate: "2027-01-01T02:59:59.000Z", criado_por: "rafael@arqdoor.com", created_at: "2026-11-20T10:00:00Z", visto_em: null, pessoa: { id: 9, name: "Gil Souza", email: "gil@x.com", type: "prestador" } },
    { id: 2, user_id: 5, nivel: "aviso", motivo: "Linguagem agressiva no chat", nota_interna: null, valido_ate: null, criado_por: "rafael@arqdoor.com", created_at: "2026-11-19T10:00:00Z", visto_em: null, pessoa: { id: 5, name: "Ana Lima", email: "ana@x.com", type: "contratante" } },
  ],
};
const HISTORICO_ANA = {
  punicoes: [
    { ...EM_VIGOR.punicoes[1], revogada_em: null, revogada_por: null },
    { id: 1, user_id: 5, nivel: "aviso", motivo: "Aviso antigo", nota_interna: null, valido_ate: null, criado_por: "rafael@arqdoor.com", created_at: "2026-10-01T10:00:00Z", visto_em: "2026-10-02T10:00:00Z", revogada_em: "2026-10-05T10:00:00Z", revogada_por: "ana@arqdoor.com" },
  ],
};
const ACHADOS = { total: 1, pagina: 1, pessoas: [{ id: 9, nome: "Gil Souza", papel: "profissional", cidade: "Campinas", uf: "SP", profissao: "Eletricista" }] };

beforeEach(() => {
  apiRequestMock.mockReset();
  apiRequestMock.mockImplementation((m: string, rota: string) => {
    if (rota === "/admin/punicoes") return Promise.resolve(ok(EM_VIGOR));
    if (rota === "/admin/users/5/punicoes" && m === "GET") return Promise.resolve(ok(HISTORICO_ANA));
    if (rota === "/admin/users/9/punicoes" && m === "GET") return Promise.resolve(ok({ punicoes: [] }));
    if (rota.endsWith("/punicoes") && m === "POST") return Promise.resolve({ ok: true, status: 201, json: async () => ({ success: true, punicao: { id: 50 } }) });
    if (/\/admin\/users\/\d+\/punicoes\/\d+/.test(rota) && m === "DELETE") return Promise.resolve(ok({ success: true }));
    if (rota.startsWith("/admin/analise/pessoas?")) return Promise.resolve(ok(ACHADOS));
    return Promise.resolve(ok({}));
  });
});

const ANA = { id: 5, nome: "Ana Lima", papel: "cliente" as const };
const GIL = { id: 9, nome: "Gil Souza", papel: "profissional" as const };

describe("aba Punições", () => {
  it("existe no menu, só para o owner", () => {
    expect(TABS.find((t) => t.key === "punicoes")).toMatchObject({ label: "Punições", papeis: ["owner"] });
  });

  it("mostra as punições em vigor e revoga depois de confirmar", async () => {
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<AdminPunicoesSection />);
    const linhas = await screen.findAllByTestId("punicao-em-vigor");
    expect(linhas).toHaveLength(2);
    expect(linhas[0]).toHaveTextContent("Gil Souza");
    expect(linhas[0]).toHaveTextContent("Profissional");
    expect(linhas[0]).toHaveTextContent("Conta congelada");
    expect(linhas[0]).toHaveTextContent("Nota interna: Print no suporte");
    expect(linhas[0]).toHaveTextContent("até 31/12/2026");
    expect(linhas[1]).toHaveTextContent("Cliente");
    expect(linhas[1]).toHaveTextContent("ainda não viu");

    fireEvent.click(within(linhas[0]).getByRole("button", { name: "Revogar" }));
    expect(confirmar).toHaveBeenCalled();
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("DELETE", "/admin/users/9/punicoes/3"));
    await waitFor(() => expect(apiRequestMock.mock.calls.filter(([, r]) => r === "/admin/punicoes").length).toBeGreaterThan(1));
    confirmar.mockRestore();
  });

  it("busca a pessoa e aplica \"fora do algoritmo\" com o corpo certo", async () => {
    render(<AdminPunicoesSection />);
    fireEvent.change(screen.getByLabelText("Buscar pessoa"), { target: { value: "Gil" } });
    fireEvent.click(await screen.findByTestId("pessoa-achada"));
    expect(screen.getByTestId("pessoa-escolhida")).toHaveTextContent("Gil Souza");
    expect(apiRequestMock).toHaveBeenCalledWith("GET", "/admin/analise/pessoas?pagina=1&busca=Gil", undefined, undefined, 60000);

    const caixa = screen.getByTestId("aplicar-punicao");
    const aplicar = within(caixa).getByRole("button", { name: "Aplicar punição" });
    fireEvent.click(within(caixa).getByRole("radio", { name: "Fora do algoritmo" }));
    fireEvent.change(within(caixa).getByLabelText("Motivo"), { target: { value: "curto" } });
    expect(aplicar).toBeEnabled();
    fireEvent.change(within(caixa).getByLabelText("Motivo"), { target: { value: "oi" } });
    expect(aplicar).toBeDisabled();
    fireEvent.change(within(caixa).getByLabelText("Motivo"), { target: { value: "Recusou três obras seguidas sem aviso" } });
    fireEvent.change(within(caixa).getByLabelText("Nota interna"), { target: { value: "Clientes reclamaram" } });
    fireEvent.change(within(caixa).getByLabelText("Válido até"), { target: { value: "2027-02-01" } });
    fireEvent.click(aplicar);
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("POST", "/admin/users/9/punicoes", {
      nivel: "fora_do_algoritmo", motivo: "Recusou três obras seguidas sem aviso", nota_interna: "Clientes reclamaram", valido_ate: "2027-02-01",
    }));
    expect(await within(caixa).findByRole("status")).toHaveTextContent("Fora do algoritmo aplicado a Gil Souza");
  });

  it("cliente não pode ficar fora do algoritmo; histórico mostra revogadas", async () => {
    render(<AdminPunicoesSection pessoaInicial={ANA} />);
    const caixa = await screen.findByTestId("aplicar-punicao");
    expect(within(caixa).getByRole("radio", { name: "Fora do algoritmo" })).toBeDisabled();
    const historico = await screen.findAllByTestId("punicao-do-historico");
    expect(historico[0]).toHaveTextContent("em vigor");
    expect(historico[1]).toHaveTextContent("revogada em");
    expect(within(historico[1]).queryByRole("button", { name: "Revogar" })).toBeNull();
  });

  it("banida pede confirmação a mais, esconde a data e manda sem prazo", async () => {
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<AdminPunicoesSection pessoaInicial={GIL} />);
    const caixa = await screen.findByTestId("aplicar-punicao");
    fireEvent.change(within(caixa).getByLabelText("Válido até"), { target: { value: "2027-02-01" } });
    fireEvent.click(within(caixa).getByRole("radio", { name: "Banida" }));
    expect(within(caixa).queryByLabelText("Válido até")).toBeNull();
    fireEvent.change(within(caixa).getByLabelText("Motivo"), { target: { value: "Golpe confirmado com dois clientes" } });

    fireEvent.click(within(caixa).getByRole("button", { name: "Banir conta" }));
    expect(confirmar).toHaveBeenCalledWith(expect.stringContaining("Banir Gil Souza?"));
    expect(apiRequestMock.mock.calls.some(([m]) => m === "POST")).toBe(false);

    confirmar.mockReturnValue(true);
    fireEvent.click(within(caixa).getByRole("button", { name: "Banir conta" }));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("POST", "/admin/users/9/punicoes", {
      nivel: "banida", motivo: "Golpe confirmado com dois clientes", nota_interna: "", valido_ate: "",
    }));
    confirmar.mockRestore();
  });

  it("congelada pede confirmação explicando o que trava", async () => {
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<AdminPunicoesSection pessoaInicial={GIL} />);
    const caixa = await screen.findByTestId("aplicar-punicao");
    fireEvent.click(within(caixa).getByRole("radio", { name: "Conta congelada" }));
    fireEvent.change(within(caixa).getByLabelText("Motivo"), { target: { value: "Cobrou por fora da plataforma" } });
    fireEvent.click(within(caixa).getByRole("button", { name: "Aplicar punição" }));
    expect(confirmar).toHaveBeenCalledWith(expect.stringContaining("Congelar a conta de Gil Souza?"));
    expect(String(confirmar.mock.calls[0][0])).toContain("não envia convites, propostas nem pedidos");
    expect(apiRequestMock.mock.calls.some(([m]) => m === "POST")).toBe(false);

    confirmar.mockReturnValue(true);
    fireEvent.click(within(caixa).getByRole("button", { name: "Aplicar punição" }));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("POST", "/admin/users/9/punicoes", expect.objectContaining({ nivel: "congelada" })));
    confirmar.mockRestore();
  });

  it("avisa quem guardou a pessoa inicial depois de usá-la", async () => {
    const aoUsar = vi.fn();
    render(<AdminPunicoesSection pessoaInicial={GIL} aoUsarPessoaInicial={aoUsar} />);
    expect(await screen.findByTestId("pessoa-escolhida")).toHaveTextContent("Gil Souza");
    expect(aoUsar).toHaveBeenCalledTimes(1);
  });

  it("mostra o erro da API ao aplicar", async () => {
    apiRequestMock.mockImplementation((m: string, rota: string) => {
      if (rota === "/admin/users/5/punicoes" && m === "POST") return Promise.resolve(falha("Só profissionais aparecem no algoritmo."));
      if (rota === "/admin/users/5/punicoes") return Promise.resolve(ok({ punicoes: [] }));
      return Promise.resolve(ok({ punicoes: [] }));
    });
    render(<AdminPunicoesSection pessoaInicial={ANA} />);
    const caixa = await screen.findByTestId("aplicar-punicao");
    fireEvent.change(within(caixa).getByLabelText("Motivo"), { target: { value: "Aviso de teste para a Ana" } });
    fireEvent.click(within(caixa).getByRole("button", { name: "Aplicar punição" }));
    expect(await within(caixa).findByRole("status")).toHaveTextContent("Só profissionais aparecem no algoritmo.");
  });
});
