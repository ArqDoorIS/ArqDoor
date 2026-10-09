/**
 * Testes do percurso guiado do link de proposta.
 * spec: 2026-09-convite-percurso
 *
 * Cobre:
 * - progressao de passos: deslogado -> conta -> assinar
 * - payload correto de accept-and-sign (senha e google)
 * - CPF_OBRIGATORIO volta para o passo de conta
 * - pagamento pulado quando devido e null
 * - cartao Android para baixar o app
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as queryClientLib from "@/lib/queryClient";
import InvitePublic from "../pages/InvitePublic";

// --- Mocks de infra ---

vi.mock("wouter", () => ({
  useParams: () => ({ token: "tok-teste" }),
  useLocation: () => ["/convite/tok-teste", vi.fn()],
}));

vi.mock("@react-oauth/google", () => ({
  useGoogleLogin: () => vi.fn(),
}));

const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Usuario deslogado por padrao; testes que precisam de usuario logado sobrescrevem
const mockUpdateUserLocal = vi.fn();
const mockLogin = vi.fn().mockResolvedValue(true);
const mockLoginWithGoogle = vi.fn();
let mockUser: any = null;

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: mockUser,
    isLoggedIn: !!mockUser,
    updateUserLocal: mockUpdateUserLocal,
    login: mockLogin,
    loginWithGoogle: mockLoginWithGoogle,
  }),
}));

// --- Helpers ---

function mockApiRequest(
  resolveFn: (method: string, path: string, body?: unknown) => { status: number; ok: boolean; body: unknown }
) {
  vi.spyOn(queryClientLib, "apiRequest").mockImplementation(
    async (method: string, path: string, data?: unknown) => {
      const r = resolveFn(method, path, data);
      return {
        ok: r.ok,
        status: r.status,
        json: async () => r.body,
        text: async () => JSON.stringify(r.body),
      } as Response;
    }
  );
}

function inviteOkResponse(overrides: object = {}) {
  return {
    success: true,
    invite: {
      id: 1,
      token: "tok-teste",
      title: "Reforma total do apto",
      description: "Descricao do projeto",
      status: "active",
      steps: [{ title: "Projeto", price: 5000, group_id: 1 }],
      has_contract_pdf: true,
      contract_pdf_url: "/invites/public/tok-teste/pdf",
      provider_receiving_method: "escrow",
      expires_at: "2027-01-01T00:00:00.000Z",
      ...overrides,
    },
    provider: { name: "Ana Costa", profession: "Arquiteta", user: { name: "Ana Costa" } },
  };
}

function acceptAndSignOkResponse(overrides: object = {}) {
  return {
    success: true,
    ticket_id: 31,
    conversation_id: 12,
    provider_user_id: 3,
    assinado: true,
    pagamento: {
      modo: "protegido",
      assinado: true,
      devido: {
        tipo: "grupo",
        group_id: 7,
        nome: "Projeto",
        valor: 5000,
        etapas: [{ id: 41, title: "Projeto executivo", price: 5000 }],
      },
      motivo: "Pague o grupo Projeto para a obra comecar.",
    },
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  mockUser = null;
});

// ============================================================
// 1. Progressao de passos deslogado -> conta -> assinar
// ============================================================

describe("progressao de passos", () => {
  it("usuario deslogado ve a proposta e ao clicar em Continuar vai para o passo Conta", async () => {
    mockApiRequest((method, path) => {
      if (method === "GET" && path.includes("/invites/public/")) {
        return { status: 200, ok: true, body: inviteOkResponse() };
      }
      return { status: 404, ok: false, body: {} };
    });

    render(<InvitePublic />);

    expect(await screen.findByTestId("step-proposta")).toBeInTheDocument();
    expect(screen.queryByTestId("step-conta")).not.toBeInTheDocument();

    // Clica em "Continuar para assinar"
    fireEvent.click(screen.getByRole("button", { name: /continuar para assinar/i }));

    await waitFor(() => {
      expect(screen.getByTestId("step-conta")).toBeInTheDocument();
    });
  });

  it("usuario logado com CPF vai direto para o passo Revisar ao clicar em Continuar", async () => {
    mockUser = { id: 1, cpf: "12345678901", type: "contratante" };

    mockApiRequest((method, path) => {
      if (method === "GET" && path.includes("/invites/public/")) {
        return { status: 200, ok: true, body: inviteOkResponse() };
      }
      return { status: 404, ok: false, body: {} };
    });

    render(<InvitePublic />);

    expect(await screen.findByTestId("step-proposta")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /continuar para assinar/i }));

    await waitFor(() => {
      expect(screen.getByTestId("step-revisar")).toBeInTheDocument();
    });
  });
});

// ============================================================
// 2. Payload de accept-and-sign: senha
// ============================================================

describe("accept-and-sign com senha", () => {
  it("envia li_e_concordo=true e password quando confirmado por senha", async () => {
    mockUser = {
      id: 1,
      cpf: "12345678901",
      type: "contratante",
      signature_password_set: true,
    };

    const requests: Array<{ method: string; path: string; body: unknown }> = [];

    mockApiRequest((method, path, body) => {
      requests.push({ method, path, body });
      if (method === "GET" && path.includes("/invites/public/")) {
        return { status: 200, ok: true, body: inviteOkResponse() };
      }
      if (method === "POST" && path.includes("accept-and-sign")) {
        return { status: 201, ok: true, body: acceptAndSignOkResponse() };
      }
      return { status: 404, ok: false, body: {} };
    });

    render(<InvitePublic />);

    // Vai direto para revisar (usuario logado com CPF)
    await screen.findByTestId("step-proposta");
    fireEvent.click(screen.getByRole("button", { name: /continuar para assinar/i }));
    await screen.findByTestId("step-revisar");

    // Marca o checkbox de concordancia
    fireEvent.click(screen.getByLabelText(/li o contrato e concordo/i));

    // Seleciona "Senha da minha conta"
    const radioSenha = screen.getByLabelText(/senha da minha conta/i);
    fireEvent.click(radioSenha);

    // Digita a senha
    const passwordInput = screen.getByLabelText(/^Senha$/i);
    fireEvent.change(passwordInput, { target: { value: "minha-senha-123" } });

    // Clica em "Aceitar e assinar"
    fireEvent.click(screen.getByRole("button", { name: /aceitar e assinar/i }));

    await waitFor(() => {
      const req = requests.find((r) => r.path.includes("accept-and-sign"));
      expect(req).toBeDefined();
      expect(req?.body).toMatchObject({ li_e_concordo: true, password: "minha-senha-123" });
    });
  });
});

// ============================================================
// 3. Payload de accept-and-sign: google
// ============================================================

describe("accept-and-sign com google", () => {
  it("envia signature_method=google quando confirmado pela conta Google", async () => {
    // Conta Google: signature_password_set = false
    mockUser = {
      id: 2,
      cpf: "12345678901",
      type: "contratante",
      signature_password_set: false,
    };

    const requests: Array<{ method: string; path: string; body: unknown }> = [];

    mockApiRequest((method, path, body) => {
      requests.push({ method, path, body });
      if (method === "GET" && path.includes("/invites/public/")) {
        return { status: 200, ok: true, body: inviteOkResponse() };
      }
      if (method === "POST" && path.includes("accept-and-sign")) {
        return { status: 201, ok: true, body: acceptAndSignOkResponse() };
      }
      return { status: 404, ok: false, body: {} };
    });

    render(<InvitePublic />);

    await screen.findByTestId("step-proposta");
    fireEvent.click(screen.getByRole("button", { name: /continuar para assinar/i }));
    await screen.findByTestId("step-revisar");

    // Marca concordancia
    fireEvent.click(screen.getByLabelText(/li o contrato e concordo/i));

    // Verifica que o metodo Google esta disponivel e selecionado por padrao (unica opcao)
    expect(screen.getByLabelText(/minha conta google/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/senha da minha conta/i)).not.toBeInTheDocument();

    // Clica em assinar
    fireEvent.click(screen.getByRole("button", { name: /aceitar e assinar/i }));

    await waitFor(() => {
      const req = requests.find((r) => r.path.includes("accept-and-sign"));
      expect(req).toBeDefined();
      expect(req?.body).toMatchObject({
        li_e_concordo: true,
        signature_method: "google",
      });
    });
  });
});

// ============================================================
// 4. CPF_OBRIGATORIO volta para o passo de conta
// ============================================================

describe("CPF obrigatorio", () => {
  it("quando backend retorna CPF_OBRIGATORIO volta para o passo Conta", async () => {
    mockUser = {
      id: 3,
      cpf: "12345678901",
      type: "contratante",
      signature_password_set: true,
    };

    mockApiRequest((method, path) => {
      if (method === "GET" && path.includes("/invites/public/")) {
        return { status: 200, ok: true, body: inviteOkResponse() };
      }
      if (method === "POST" && path.includes("accept-and-sign")) {
        return {
          status: 400,
          ok: false,
          body: { success: false, motivo: "CPF_OBRIGATORIO", message: "CPF obrigatorio." },
        };
      }
      return { status: 404, ok: false, body: {} };
    });

    render(<InvitePublic />);

    await screen.findByTestId("step-proposta");
    fireEvent.click(screen.getByRole("button", { name: /continuar para assinar/i }));
    await screen.findByTestId("step-revisar");

    fireEvent.click(screen.getByLabelText(/li o contrato e concordo/i));
    const radioSenha = screen.getByLabelText(/senha da minha conta/i);
    fireEvent.click(radioSenha);
    fireEvent.change(screen.getByLabelText(/^Senha$/i), {
      target: { value: "qualquer-senha" },
    });
    fireEvent.click(screen.getByRole("button", { name: /aceitar e assinar/i }));

    await waitFor(() => {
      expect(screen.getByTestId("step-conta")).toBeInTheDocument();
    });
  });
});

// ============================================================
// 5. Passo de pagamento pulado quando devido e null
// ============================================================

describe("pagamento pulado quando devido e null", () => {
  it("vai direto para o Pronto quando pagamento.devido e null", async () => {
    mockUser = {
      id: 1,
      cpf: "12345678901",
      type: "contratante",
      signature_password_set: true,
    };

    mockApiRequest((method, path) => {
      if (method === "GET" && path.includes("/invites/public/")) {
        return { status: 200, ok: true, body: inviteOkResponse() };
      }
      if (method === "POST" && path.includes("accept-and-sign")) {
        return {
          status: 201,
          ok: true,
          body: acceptAndSignOkResponse({
            pagamento: {
              modo: "direto",
              assinado: true,
              devido: null,
              motivo: "Voce paga cada etapa quando ela for concluida.",
            },
          }),
        };
      }
      return { status: 404, ok: false, body: {} };
    });

    render(<InvitePublic />);

    await screen.findByTestId("step-proposta");
    fireEvent.click(screen.getByRole("button", { name: /continuar para assinar/i }));
    await screen.findByTestId("step-revisar");

    fireEvent.click(screen.getByLabelText(/li o contrato e concordo/i));
    fireEvent.click(screen.getByLabelText(/senha da minha conta/i));
    fireEvent.change(screen.getByLabelText(/^Senha$/i), {
      target: { value: "qualquer-senha" },
    });
    fireEvent.click(screen.getByRole("button", { name: /aceitar e assinar/i }));

    await waitFor(() => {
      expect(screen.getByTestId("step-pronto")).toBeInTheDocument();
      expect(screen.queryByTestId("step-pagamento")).not.toBeInTheDocument();
    });
  });
});

// ============================================================
// 6. Cartao Android para baixar o app - apenas em Android
// ============================================================

describe("cartao de download do app (Android)", () => {
  const originalUserAgent = navigator.userAgent;

  afterEach(() => {
    Object.defineProperty(navigator, "userAgent", {
      value: originalUserAgent,
      configurable: true,
    });
  });

  it("exibe o cartao de download no Pronto em navegador Android", async () => {
    Object.defineProperty(navigator, "userAgent", {
      value:
        "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/112.0.0.0 Mobile Safari/537.36",
      configurable: true,
    });

    mockUser = {
      id: 1,
      cpf: "12345678901",
      type: "contratante",
      signature_password_set: true,
    };

    mockApiRequest((method, path) => {
      if (method === "GET" && path.includes("/invites/public/")) {
        return { status: 200, ok: true, body: inviteOkResponse() };
      }
      if (method === "POST" && path.includes("accept-and-sign")) {
        return {
          status: 201,
          ok: true,
          body: acceptAndSignOkResponse({
            pagamento: {
              modo: "direto",
              assinado: true,
              devido: null,
              motivo: "Modo direto.",
            },
          }),
        };
      }
      return { status: 404, ok: false, body: {} };
    });

    render(<InvitePublic />);

    await screen.findByTestId("step-proposta");
    fireEvent.click(screen.getByRole("button", { name: /continuar para assinar/i }));
    await screen.findByTestId("step-revisar");
    fireEvent.click(screen.getByLabelText(/li o contrato e concordo/i));
    fireEvent.click(screen.getByLabelText(/senha da minha conta/i));
    fireEvent.change(screen.getByLabelText(/^Senha$/i), {
      target: { value: "qualquer" },
    });
    fireEvent.click(screen.getByRole("button", { name: /aceitar e assinar/i }));

    await waitFor(() => {
      expect(screen.getByTestId("android-app-card")).toBeInTheDocument();
    });
  });

  it("nao exibe o cartao de download no Pronto em navegador nao-Android", async () => {
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120",
      configurable: true,
    });

    mockUser = {
      id: 1,
      cpf: "12345678901",
      type: "contratante",
      signature_password_set: true,
    };

    mockApiRequest((method, path) => {
      if (method === "GET" && path.includes("/invites/public/")) {
        return { status: 200, ok: true, body: inviteOkResponse() };
      }
      if (method === "POST" && path.includes("accept-and-sign")) {
        return {
          status: 201,
          ok: true,
          body: acceptAndSignOkResponse({
            pagamento: {
              modo: "direto",
              assinado: true,
              devido: null,
              motivo: "Modo direto.",
            },
          }),
        };
      }
      return { status: 404, ok: false, body: {} };
    });

    render(<InvitePublic />);

    await screen.findByTestId("step-proposta");
    fireEvent.click(screen.getByRole("button", { name: /continuar para assinar/i }));
    await screen.findByTestId("step-revisar");
    fireEvent.click(screen.getByLabelText(/li o contrato e concordo/i));
    fireEvent.click(screen.getByLabelText(/senha da minha conta/i));
    fireEvent.change(screen.getByLabelText(/^Senha$/i), {
      target: { value: "qualquer" },
    });
    fireEvent.click(screen.getByRole("button", { name: /aceitar e assinar/i }));

    await waitFor(() => {
      expect(screen.queryByTestId("android-app-card")).not.toBeInTheDocument();
    });
  });
});
