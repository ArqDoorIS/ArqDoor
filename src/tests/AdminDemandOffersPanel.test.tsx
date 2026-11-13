/**
 * Ofertas de um pedido no painel admin: por enquanto é o admin quem escolhe os
 * profissionais e define o % de compatibilidade que o cliente vê nos cartões.
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { AdminDemandOffersPanel } from "@/features/admin/components/AdminDemandOffersPanel";

const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));
vi.mock("@/lib/queryClient", () => ({
  apiRequest: apiRequestMock,
  API_BASE_URL: "https://api.test",
}));

const resp = (body: unknown, ok = true) => ({ ok, json: async () => body });
const oferta = (over = {}) => ({
  id: 3,
  compatibilidade: 82,
  mensagem: "Faço esse tipo de obra toda semana.",
  prazo_dias: 12,
  versao_do_pedido: 1,
  arquivada: false,
  enviada_em: "2026-11-10T12:00:00.000Z",
  profissional: { user_id: 5, nome: "Wagner Lima", profissao: "Pedreiro", nota: 4.5, cidades: ["Cotia"] },
  ...over,
});

beforeEach(() => {
  apiRequestMock.mockReset();
  vi.stubGlobal("confirm", vi.fn(() => true));
});
afterEach(() => vi.unstubAllGlobals());

const abrir = async () => {
  render(<AdminDemandOffersPanel demandId={40} versaoAtual={2} />);
  fireEvent.click(screen.getByRole("button", { name: /ofertas e % de compatibilidade/i }));
};

describe("ofertas do pedido no admin", () => {
  it("só busca ao abrir e mostra o %, a versão respondida e as arquivadas", async () => {
    apiRequestMock.mockResolvedValue(resp({ ofertas: [oferta({ versao_do_pedido: 1 }), oferta({ id: 4, arquivada: true, profissional: { user_id: 6, nome: "Marina Costa" } })] }));
    render(<AdminDemandOffersPanel demandId={40} versaoAtual={2} />);
    expect(apiRequestMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /ofertas e % de compatibilidade/i }));
    expect(await screen.findByText("Wagner Lima")).toBeInTheDocument();
    expect(apiRequestMock).toHaveBeenCalledWith("GET", "/admin/demands/40/ofertas");
    expect(screen.getAllByText("82%").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Respondeu a versão 1").length).toBe(2);
    expect(screen.getByText("Arquivada pelo cliente")).toBeInTheDocument();
    expect(screen.getByText(/1 na caixa do cliente/)).toBeInTheDocument();
  });

  it("ajustar o % salva só o que mudou na rota do admin", async () => {
    apiRequestMock.mockResolvedValue(resp({ ofertas: [oferta()] }));
    await abrir();
    await screen.findByText("Wagner Lima");

    const salvar = screen.getByRole("button", { name: /salvar/i });
    expect(salvar).toBeDisabled();
    // o primeiro campo numérico é o % (o segundo é o prazo)
    fireEvent.change(screen.getAllByRole("spinbutton")[0], { target: { value: "64" } });
    fireEvent.click(salvar);

    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("PATCH", "/admin/ofertas/3", { compatibilidade: 64, mensagem: "Faço esse tipo de obra toda semana.", prazo_dias: 12 }));
  });

  it("busca profissionais e adiciona com 70% de partida", async () => {
    apiRequestMock
      .mockResolvedValueOnce(resp({ ofertas: [] }))
      .mockResolvedValueOnce(resp({ profissionais: [{ user_id: 9, nome: "Carlos Nogueira", profissao: "Pintor", email: "c@x" }] }))
      .mockResolvedValueOnce(resp({ success: true }, true))
      .mockResolvedValue(resp({ ofertas: [oferta({ id: 7, compatibilidade: 70, profissional: { user_id: 9, nome: "Carlos Nogueira" } })] }));
    await abrir();
    expect(await screen.findByText(/nenhuma oferta ainda/i)).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/nome, e-mail ou profissão/i), { target: { value: "carl" } });
    fireEvent.click(screen.getByRole("button", { name: /^buscar$/i }));
    expect(await screen.findByText("Carlos Nogueira")).toBeInTheDocument();
    expect(apiRequestMock).toHaveBeenCalledWith("GET", "/admin/demands/40/ofertas/candidatos?search=carl");

    fireEvent.click(screen.getByRole("button", { name: /adicionar$/i }));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("POST", "/admin/demands/40/ofertas", { provider_user_id: 9, compatibilidade: 70 }));
    expect(await screen.findByText("70%")).toBeInTheDocument();
  });

  it("remover pede confirmação e usa DELETE", async () => {
    apiRequestMock.mockResolvedValueOnce(resp({ ofertas: [oferta()] })).mockResolvedValueOnce(resp({ success: true })).mockResolvedValue(resp({ ofertas: [] }));
    await abrir();
    fireEvent.click(await screen.findByRole("button", { name: /remover/i }));
    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("DELETE", "/admin/ofertas/3"));
  });

  it("mostra o erro do servidor", async () => {
    apiRequestMock.mockResolvedValue(resp({ message: "Pedido não encontrado" }, false));
    await abrir();
    expect(await screen.findByText("Pedido não encontrado")).toBeInTheDocument();
  });
});
