/**
 * Aba "IA" do admin: a chave da API do assistente de orçamentos.
 *
 * O que protege: a chave nunca aparece na tela, o campo vazio não apaga a chave gravada e
 * ligar/desligar manda só o que muda.
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { AdminAiSection } from "@/features/admin/components/AdminAiSection";

const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));
vi.mock("@/lib/queryClient", () => ({ apiRequest: apiRequestMock, API_BASE_URL: "https://api.test" }));

const estado = (over = {}) => ({
  enabled: false,
  model: "claude-sonnet-5-5",
  models: ["claude-sonnet-5-5", "claude-haiku-5-5", "claude-opus-5-5"],
  has_key: false,
  key_last4: null,
  ready: false,
  updated_by: null,
  updated_at: null,
  ...over,
});
const resposta = (data: unknown) => ({ ok: true, json: async () => ({ success: true, data }) });

beforeEach(() => apiRequestMock.mockReset());

describe("aba IA do admin", () => {
  it("sem chave: não deixa ligar nem testar", async () => {
    apiRequestMock.mockResolvedValueOnce(resposta(estado()));
    render(<AdminAiSection />);
    expect(await screen.findByText("Sem chave")).toBeTruthy();
    expect((screen.getByText("Ligar no app").closest("button") as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByText("Testar a chave").closest("button") as HTMLButtonElement).disabled).toBe(true);
  });

  it("grava a chave, limpa o campo e mostra só o final", async () => {
    apiRequestMock
      .mockResolvedValueOnce(resposta(estado()))
      .mockResolvedValueOnce(resposta(estado({ has_key: true, key_last4: "WXYZ" })));
    render(<AdminAiSection />);
    const campo = (await screen.findByPlaceholderText("sk-ant-...")) as HTMLInputElement;
    expect(campo.type).toBe("password");
    fireEvent.change(campo, { target: { value: "sk-ant-api03-segredo-WXYZ" } });
    fireEvent.click(screen.getByText("Salvar"));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("PUT", "/admin/ai-settings", { api_key: "sk-ant-api03-segredo-WXYZ", model: "claude-sonnet-5-5" }));
    expect(await screen.findByText("Chave gravada.")).toBeTruthy();
    expect(document.body.innerHTML).not.toContain("segredo");
    expect((screen.getByPlaceholderText(/termina em WXYZ/) as HTMLInputElement).value).toBe("");
  });

  it("ligar manda só enabled, sem reenviar chave", async () => {
    apiRequestMock
      .mockResolvedValueOnce(resposta(estado({ has_key: true, key_last4: "WXYZ" })))
      .mockResolvedValueOnce(resposta(estado({ has_key: true, key_last4: "WXYZ", enabled: true, ready: true })));
    render(<AdminAiSection />);
    fireEvent.click(await screen.findByText("Ligar no app"));
    await waitFor(() => expect(apiRequestMock).toHaveBeenLastCalledWith("PUT", "/admin/ai-settings", { enabled: true }));
    expect(await screen.findByText("Ligada no app")).toBeTruthy();
  });

  it("mostra o erro do servidor", async () => {
    apiRequestMock
      .mockResolvedValueOnce(resposta(estado()))
      .mockResolvedValueOnce({ ok: false, json: async () => ({ message: "A chave não parece uma chave da Anthropic (começa com sk-ant-)." }) });
    render(<AdminAiSection />);
    fireEvent.change(await screen.findByPlaceholderText("sk-ant-..."), { target: { value: "abc" } });
    fireEvent.click(screen.getByText("Salvar"));
    expect(await screen.findByText(/não parece uma chave/)).toBeTruthy();
  });
});
