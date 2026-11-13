/**
 * Publicações no painel admin: demandas de clientes e ofertas de profissionais.
 *
 * Ocultar e apagar são poderes diferentes. Ocultar é reversível e não pede mais que um
 * motivo opcional; apagar é definitivo e exige confirmação explícita. Estes testes
 * garantem que um clique não vira o outro.
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { AdminListingsSection } from "@/features/admin/components/AdminListingsSection";

const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));
vi.mock("@/lib/queryClient", () => ({
  apiRequest: apiRequestMock,
  API_BASE_URL: "https://api.test",
}));

const demanda = (over = {}) => ({
  id: 11,
  type: "demand",
  title: "Reforma da cozinha",
  description: "Trocar piso e bancada",
  price: 5000,
  status: "pendente",
  created_at: "2026-11-01T12:00:00.000Z",
  images: [],
  invites_count: 2,
  author: { user_id: 7, name: "Cliente Teste", email: "cli@test.com", type: "contratante", is_hidden: false, suspended: false },
  admin_hidden: false,
  admin_hidden_at: null,
  admin_hidden_reason: null,
  ...over,
});

const lista = (rows: any[]) => ({
  ok: true,
  json: async () => ({
    success: true,
    data: rows,
    counts: { demands: { total: rows.length, hidden: 0 }, offers: { total: 3, hidden: 1 } },
    pagination: { page: 1, pageSize: 20, total: rows.length, total_pages: 1 },
  }),
});

const ok = { ok: true, json: async () => ({ success: true }) };

beforeEach(() => {
  apiRequestMock.mockReset();
  vi.stubGlobal("confirm", vi.fn(() => true));
  vi.stubGlobal("prompt", vi.fn(() => "Contato por fora"));
});
afterEach(() => vi.unstubAllGlobals());

describe("publicações no admin", () => {
  it("lista as demandas com autor e valor", async () => {
    apiRequestMock.mockResolvedValue(lista([demanda()]));
    render(<AdminListingsSection />);

    expect(await screen.findByText("Reforma da cozinha")).toBeInTheDocument();
    expect(screen.getByText(/Cliente Teste/)).toBeInTheDocument();
    expect(apiRequestMock.mock.calls[0][1]).toMatch(/^\/admin\/listings\?type=demands/);
  });

  it("pedido mostra pontos, faixa de preço privada e o painel de ofertas", async () => {
    apiRequestMock.mockResolvedValue(
      lista([demanda({ versao: 3, pontos_importantes: ["Piso porcelanato"], faixa_preco: { ideal_ate: 4000, negociavel_ate: 5500 } })])
    );
    render(<AdminListingsSection />);

    expect(await screen.findByText("Piso porcelanato")).toBeInTheDocument();
    expect(screen.getByText(/faixa de preço \(privada\)/i)).toBeInTheDocument();
    expect(screen.getByText("versão 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ofertas e % de compatibilidade/i })).toBeInTheDocument();
  });

  it("troca para ofertas de profissionais", async () => {
    apiRequestMock.mockResolvedValue(lista([]));
    render(<AdminListingsSection />);

    fireEvent.click(await screen.findByRole("button", { name: /ofertas de profissionais/i }));
    await waitFor(() =>
      expect(apiRequestMock.mock.calls.some((c) => String(c[1]).includes("type=offers"))).toBe(true)
    );
  });

  it("ocultar chama a rota de visibilidade, nunca a de apagar", async () => {
    apiRequestMock.mockResolvedValueOnce(lista([demanda()])).mockResolvedValueOnce(ok).mockResolvedValue(lista([demanda({ admin_hidden: true })]));
    render(<AdminListingsSection />);

    fireEvent.click(await screen.findByRole("button", { name: /ocultar/i }));
    await waitFor(() =>
      expect(apiRequestMock).toHaveBeenCalledWith("PATCH", "/admin/listings/demands/11/visibility", {
        hidden: true,
        reason: "Contato por fora",
      })
    );
    expect(apiRequestMock.mock.calls.some((c) => c[0] === "DELETE")).toBe(false);
    expect(window.confirm).not.toHaveBeenCalled();
  });

  it("apagar exige confirmação e não chama nada se o admin desistir", async () => {
    vi.stubGlobal("confirm", vi.fn(() => false));
    apiRequestMock.mockResolvedValue(lista([demanda()]));
    render(<AdminListingsSection />);

    fireEvent.click(await screen.findByRole("button", { name: /apagar/i }));
    expect(window.confirm).toHaveBeenCalled();
    expect(apiRequestMock.mock.calls.some((c) => c[0] === "DELETE")).toBe(false);
  });

  it("apagar confirmado chama a rota de exclusão", async () => {
    apiRequestMock.mockResolvedValueOnce(lista([demanda()])).mockResolvedValueOnce(ok).mockResolvedValue(lista([]));
    render(<AdminListingsSection />);

    fireEvent.click(await screen.findByRole("button", { name: /apagar/i }));
    await waitFor(() =>
      expect(apiRequestMock).toHaveBeenCalledWith("DELETE", "/admin/listings/demands/11", { reason: "Contato por fora" })
    );
  });

  it("publicação oculta mostra o selo e oferece reexibir", async () => {
    apiRequestMock.mockResolvedValue(
      lista([demanda({ admin_hidden: true, admin_hidden_at: "2026-11-02T10:00:00.000Z", admin_hidden_reason: "Spam" })])
    );
    render(<AdminListingsSection />);

    expect(await screen.findByText("Oculta")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reexibir/i })).toBeInTheDocument();
    expect(screen.getByText(/Spam/)).toBeInTheDocument();
  });
});
