/**
 * WEB-2: Telemetria do app - liga e desliga o envio de eventos ao PostHog.
 * WEB-3: Tarja "Descadastrado dos comunicados" no perfil do usuario e na escolha de destinatario.
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));
vi.mock("@/lib/queryClient", () => ({ apiRequest: apiRequestMock, API_BASE_URL: "https://api.test" }));

/* ---------- imports apos o mock ---------- */
import { AdminAppSection } from "@/features/admin/components/AdminAppSection";
import { AdminUserEditorPanel } from "@/features/admin/components/AdminUserEditorPanel";
import { EscolherConta } from "@/features/admin/components/notificacoes/Secoes";
import type { AdminUserProfile } from "@/features/admin/types";

const ok = (body: unknown) => ({ ok: true, json: async () => body });
const falha = (message: string) => ({ ok: false, json: async () => ({ success: false, message }) });

/* ================================================================
   WEB-2: Telemetria do app
   ================================================================ */
describe("Telemetria do app", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    apiRequestMock.mockImplementation((_m: string, rota: string) => {
      if (rota === "/admin/textos-do-app") return Promise.resolve(ok({ textos: [], limites: { titulo: 120, texto: 6000 } }));
      if (rota === "/admin/avaliacoes-do-app") return Promise.resolve(ok({ total: 0, media: null, distribuicao: {}, avaliacoes: [], pagina: 1, paginas: 1 }));
      if (rota === "/admin/telemetria" && _m === "GET") return Promise.resolve(ok({ telemetria_ligada: true }));
      if (rota === "/admin/telemetria" && _m === "PUT") return Promise.resolve(ok({ telemetria_ligada: false }));
      return Promise.resolve(ok({}));
    });
  });

  async function abrirAbaTelemetria() {
    render(<AdminAppSection />);
    const btn = screen.getByRole("button", { name: "Telemetria" });
    fireEvent.click(btn);
  }

  it("mostra a aba Telemetria no AdminAppSection", async () => {
    render(<AdminAppSection />);
    expect(screen.getByRole("button", { name: "Telemetria" })).toBeInTheDocument();
  });

  it("carrega o estado atual (ligada) e mostra o toggle", async () => {
    await abrirAbaTelemetria();
    const toggle = await screen.findByTestId("btn-telemetria");
    expect(toggle).toHaveAttribute("aria-pressed", "true");
  });

  it("chama PUT /admin/telemetria ao alternar", async () => {
    await abrirAbaTelemetria();
    const toggle = await screen.findByTestId("btn-telemetria");
    fireEvent.click(toggle);
    await waitFor(() =>
      expect(apiRequestMock).toHaveBeenCalledWith("PUT", "/admin/telemetria", { telemetria_ligada: false })
    );
  });

  it("mostra aviso de sucesso apos desligar", async () => {
    await abrirAbaTelemetria();
    const toggle = await screen.findByTestId("btn-telemetria");
    fireEvent.click(toggle);
    await screen.findByTestId("aviso-telemetria");
    expect(screen.getByTestId("aviso-telemetria")).toHaveTextContent("Telemetria do app desligada");
    expect(screen.getByTestId("aviso-telemetria")).toHaveTextContent("/eventos continua");
  });

  it("mostra erro quando PUT falha", async () => {
    apiRequestMock.mockImplementation((_m: string, rota: string) => {
      if (rota === "/admin/telemetria" && _m === "GET") return Promise.resolve(ok({ telemetria_ligada: true }));
      if (rota === "/admin/telemetria" && _m === "PUT") return Promise.resolve(falha("Nao autorizado"));
      return Promise.resolve(ok({}));
    });
    await abrirAbaTelemetria();
    const toggle = await screen.findByTestId("btn-telemetria");
    fireEvent.click(toggle);
    await screen.findByTestId("aviso-telemetria");
    expect(screen.getByTestId("aviso-telemetria")).toHaveTextContent("Nao autorizado");
  });

  it("nome do controle nao confunde com 'Ligar o PostHog'", async () => {
    await abrirAbaTelemetria();
    // Deve ter "Telemetria do app", nao "Ligar o PostHog"
    await screen.findByText("Telemetria do app");
    expect(screen.queryByText("Ligar o PostHog")).not.toBeInTheDocument();
  });
});

/* ================================================================
   WEB-3: Tarja "Descadastrado dos comunicados"
   ================================================================ */

const PERFIL_DESCADASTRADO: AdminUserProfile = {
  account: {
    id: 42,
    name: "Marcos Ramos",
    email: "marcos@x.com",
    phone: null,
    birth: null,
    gender: "Masculino",
    cpf: null,
    cnpj: null,
    type: "contratante",
    auth_provider: "local",
    password_configured: true,
    perfil_completo: true,
    is_active: true,
    is_hidden: false,
    is_email_verified: true,
    is_verified: false,
    suspended: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: null,
    comunicados_descadastrado_em: "2026-11-10T09:00:00Z",
  },
  provider: null,
  location: null,
};

const PERFIL_NORMAL: AdminUserProfile = {
  ...PERFIL_DESCADASTRADO,
  account: {
    ...PERFIL_DESCADASTRADO.account,
    comunicados_descadastrado_em: null,
  },
};

describe("Tarja no perfil do usuario", () => {
  beforeEach(() => { apiRequestMock.mockReset(); });

  it("mostra a tarja quando comunicados_descadastrado_em esta preenchido", () => {
    render(
      <AdminUserEditorPanel
        profile={PERFIL_DESCADASTRADO}
        loading={false}
        error={null}
        saving={false}
        saveError={null}
        onSave={async () => {}}
      />
    );
    expect(screen.getByTestId("tarja-descadastrada-perfil")).toBeInTheDocument();
    expect(screen.getByTestId("tarja-descadastrada-perfil")).toHaveTextContent("Descadastrado dos comunicados em");
    // data no formato brasileiro
    expect(screen.getByTestId("tarja-descadastrada-perfil")).toHaveTextContent("10/11/2026");
  });

  it("nao mostra a tarja quando comunicados_descadastrado_em e nulo", () => {
    render(
      <AdminUserEditorPanel
        profile={PERFIL_NORMAL}
        loading={false}
        error={null}
        saving={false}
        saveError={null}
        onSave={async () => {}}
      />
    );
    expect(screen.queryByTestId("tarja-descadastrada-perfil")).not.toBeInTheDocument();
  });
});

describe("Tarja na escolha de destinatario (Notificacoes)", () => {
  it("mostra a tarja quando a pessoa escolhida esta descadastrada", () => {
    const pessoa = {
      id: 42,
      nome: "Marcos Ramos",
      papel: "cliente" as const,
      comunicados_descadastrado_em: "2026-11-10T09:00:00Z",
    };
    render(<EscolherConta pessoa={pessoa} escolher={() => {}} />);
    expect(screen.getByTestId("tarja-descadastrada")).toBeInTheDocument();
    expect(screen.getByTestId("tarja-descadastrada")).toHaveTextContent("Descadastrado dos comunicados em 10/11/2026");
  });

  it("nao mostra a tarja quando a pessoa nao esta descadastrada", () => {
    const pessoa = {
      id: 10,
      nome: "Ana Costa",
      papel: "cliente" as const,
      comunicados_descadastrado_em: null,
    };
    render(<EscolherConta pessoa={pessoa} escolher={() => {}} />);
    expect(screen.queryByTestId("tarja-descadastrada")).not.toBeInTheDocument();
  });

  it("mostra a busca de pessoa quando nenhuma foi escolhida", async () => {
    apiRequestMock.mockResolvedValue(ok({ pessoas: [] }));
    render(<EscolherConta pessoa={null} escolher={() => {}} />);
    expect(screen.getByRole("textbox", { name: "Buscar pessoa" })).toBeInTheDocument();
  });
});
