/**
 * A fila de verificação de identidade.
 *
 * Aprovar aqui sobe o nível de confiança de um perfil — que é o que um cliente olha antes
 * de contratar. A tela é feita para não deixar errar por distração, e é isso que estes
 * testes protegem.
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { AdminVerificationSection } from "@/features/admin/components/AdminVerificationSection";

const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));
vi.mock("@/lib/queryClient", () => ({
  apiRequest: apiRequestMock,
  API_BASE_URL: "https://api.test",
}));

const documento = (over = {}) => ({
  id: 1,
  type: "rg",
  label: "RG",
  status: "em_analise",
  created_at: "2026-09-10T12:00:00.000Z",
  file_url: "/admin/documents/1/file",
  user: { id: 7, name: "Fulano de Tal", email: "fulano@test.com", type: "prestador" },
  ...over,
});

const responderComFila = (docs: any[]) =>
  apiRequestMock.mockResolvedValue({
    ok: true,
    json: async () => ({ success: true, data: { documents: docs } }),
  });

beforeEach(() => {
  apiRequestMock.mockReset();
  vi.stubGlobal("open", vi.fn());
  vi.stubGlobal("confirm", vi.fn(() => true));
  vi.stubGlobal("alert", vi.fn());
});
afterEach(() => vi.unstubAllGlobals());

describe("conferir antes de decidir", () => {
  it("não deixa aprovar sem ter aberto o documento", async () => {
    responderComFila([documento()]);
    render(<AdminVerificationSection />);

    const aprovar = await screen.findByRole("button", { name: /aprovar/i });
    // Aprovar sem abrir o arquivo é aprovar no escuro.
    expect(aprovar).toBeDisabled();
    expect(screen.getByText(/abra o documento antes de decidir/i)).toBeInTheDocument();
  });

  it("destrava depois de conferir", async () => {
    responderComFila([documento()]);
    render(<AdminVerificationSection />);

    fireEvent.click(await screen.findByRole("button", { name: /conferir documento/i }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /aprovar/i })).not.toBeDisabled()
    );
  });

  it("abre o arquivo pela rota de ADMIN, que autentica por cookie", async () => {
    responderComFila([documento()]);
    render(<AdminVerificationSection />);

    fireEvent.click(await screen.findByRole("button", { name: /conferir documento/i }));
    // Se apontasse para `/documents/:id/file` (Bearer), o admin não veria nada.
    expect(window.open).toHaveBeenCalledWith(
      "https://api.test/admin/documents/1/file",
      "_blank",
      "noopener,noreferrer"
    );
  });
});

describe("recusar", () => {
  it("exige motivo antes de mandar qualquer coisa ao servidor", async () => {
    responderComFila([documento()]);
    render(<AdminVerificationSection />);

    fireEvent.click(await screen.findByRole("button", { name: /recusar/i }));

    expect(window.alert).toHaveBeenCalled();
    // Nada foi enviado: a recusa sem motivo nem sai da tela.
    expect(apiRequestMock).toHaveBeenCalledTimes(1); // só o GET da fila
  });

  it("com motivo, envia a decisão e o texto", async () => {
    responderComFila([documento()]);
    render(<AdminVerificationSection />);

    const campo = await screen.findByPlaceholderText(/motivo da recusa/i);
    fireEvent.change(campo, { target: { value: "Foto ilegível, reenvie com mais luz" } });
    fireEvent.click(screen.getByRole("button", { name: /recusar/i }));

    await waitFor(() => {
      const chamada = apiRequestMock.mock.calls.find((c) => c[0] === "POST");
      if (!chamada) throw new Error("o POST da decisão não foi enviado");
      expect(chamada[1]).toBe("/admin/documents/1/review");
      expect(chamada[2]).toMatchObject({ aprovar: false, motivo: "Foto ilegível, reenvie com mais luz" });
    });
  });
});

describe("a fila não pode mentir", () => {
  it("erro de carga NÃO vira 'nada esperando análise'", async () => {
    // Fila vazia por erro parece fila vazia por não ter nada — e um documento esperando
    // ficaria invisível, com a pessoa esperando do outro lado.
    apiRequestMock.mockResolvedValue({
      ok: false,
      json: async () => ({ success: false, message: "Falha ao consultar" }),
    });
    render(<AdminVerificationSection />);

    expect(await screen.findByText(/a fila não carregou/i)).toBeInTheDocument();
    expect(screen.getByText(/pode haver documento esperando/i)).toBeInTheDocument();
  });

  it("documento já decidido não mostra os botões", async () => {
    responderComFila([documento({ status: "aprovado" })]);
    render(<AdminVerificationSection />);

    expect(await screen.findByText(/aprovado/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^recusar$/i })).not.toBeInTheDocument();
  });
});
