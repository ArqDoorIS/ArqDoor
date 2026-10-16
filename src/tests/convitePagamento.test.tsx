/**
 * Passo de pagamento do percurso do convite e link "Abrir no app".
 * spec: 2026-09-convite-percurso
 *
 * - "Ja paguei" so avanca quando o backend confirma o pagamento
 * - o link do app usa o esquema e o pacote da variante certa
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as queryClientLib from "@/lib/queryClient";
import { StepPagamento } from "@/features/convite/StepPagamento";
import { linkDoAppParaConvite, siteDeStaging } from "@/lib/invite-app-link";
import type { PagamentoAgora } from "@/features/convite/types";

const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

const pagamentoDeGrupo: PagamentoAgora = {
  modo: "protegido",
  assinado: true,
  devido: {
    tipo: "grupo",
    group_id: 7,
    nome: "Projeto",
    valor: 5000,
    etapas: [{ id: 41, title: "Projeto executivo", price: 5000 }],
  },
  motivo: "Pague o grupo Projeto para a obra começar.",
};

function mockApi(refreshBody: unknown) {
  const chamadas: string[] = [];
  vi.spyOn(queryClientLib, "apiRequest").mockImplementation(async (method: string, path: string) => {
    chamadas.push(`${method} ${path}`);
    const body =
      method === "POST"
        ? { success: true, data: { status: "PENDING", pix: { copy_and_paste: "000201pix" } } }
        : refreshBody;
    return { ok: true, status: 200, json: async () => body } as Response;
  });
  return chamadas;
}

async function gerarPixEClicarJaPaguei() {
  fireEvent.click(screen.getByRole("button", { name: /gerar cobrança/i }));
  await waitFor(() => expect(screen.getByTestId("ja-paguei")).toBeTruthy());
  fireEvent.click(screen.getByTestId("ja-paguei"));
}

afterEach(() => {
  vi.restoreAllMocks();
  mockToast.mockReset();
});

describe("Ja paguei", () => {
  it("nao avanca enquanto o backend diz que o pagamento esta pendente", async () => {
    const chamadas = mockApi({ success: true, data: { paid: false, status: "PENDING" } });
    const onSuccess = vi.fn();
    render(<StepPagamento pagamento={pagamentoDeGrupo} ticketId={31} onSuccess={onSuccess} onSkip={vi.fn()} />);

    await gerarPixEClicarJaPaguei();

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Pagamento ainda não confirmado" }))
    );
    expect(onSuccess).not.toHaveBeenCalled();
    expect(chamadas).toContain("GET /payments/steps/41/refresh");
  });

  it("avanca quando o refresh da etapa confirma o pagamento do grupo", async () => {
    mockApi({ success: true, data: { paid: true, status: "RECEIVED" } });
    const onSuccess = vi.fn();
    render(<StepPagamento pagamento={pagamentoDeGrupo} ticketId={31} onSuccess={onSuccess} onSkip={vi.fn()} />);

    await gerarPixEClicarJaPaguei();

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });

  it("deposito consulta o refresh do ticket", async () => {
    const chamadas = mockApi({ success: true, data: [{ id: 9, status: "CONFIRMED" }] });
    const onSuccess = vi.fn();
    const deposito: PagamentoAgora = {
      ...pagamentoDeGrupo,
      devido: { tipo: "deposito", valor: 5000 },
    };
    render(<StepPagamento pagamento={deposito} ticketId={31} onSuccess={onSuccess} onSkip={vi.fn()} />);

    await gerarPixEClicarJaPaguei();

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(chamadas).toContain("GET /payments/tickets/31/refresh");
  });
});

describe("link Abrir no app", () => {
  it("producao abre o ArqDoor da Play", () => {
    const link = linkDoAppParaConvite("tok", "arqdoor.com", "https://arqdoor.com/convite/tok");
    expect(link).toBe(
      "intent://convite/tok#Intent;scheme=arqdoormobile;package=com.arqdoor.app;" +
        "S.browser_fallback_url=https%3A%2F%2Farqdoor.com%2Fconvite%2Ftok;end"
    );
  });

  it("staging abre o ArqDoor Teste", () => {
    const link = linkDoAppParaConvite("tok", "staging.arqdoor.com", "https://staging.arqdoor.com/convite/tok");
    expect(link).toContain("scheme=arqdoormobile-staging;package=com.arqdoor.app.staging;");
  });

  it("reconhece os hosts de staging", () => {
    expect(siteDeStaging("staging.arqdoor.com")).toBe(true);
    expect(siteDeStaging("admin.staging.arqdoor.com")).toBe(true);
    expect(siteDeStaging("arqdoor.com")).toBe(false);
  });
});
