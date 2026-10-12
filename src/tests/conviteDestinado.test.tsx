/**
 * Testes da feature "convite destinado a um CPF".
 * spec: 2026-10-convite-destinado
 *
 * Cobre:
 * - helpers puros (mascaraCpf, validarCpf, formatarCpfFinal, cpfBate)
 * - pagina publica mostra a faixa "Convite pessoal" quando invite.destinatario existe
 * - pre-checagem client-side: CPF diferente nao chama o aceite
 * - 403 CPF_DIFERENTE: mostra tela "outra pessoa"
 * - 423 no GET publico: mostra tela "bloqueado"
 * - convite sem destinatario: percurso identico ao de antes
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as queryClientLib from "@/lib/queryClient";
import InvitePublic from "../pages/InvitePublic";
import {
  mascaraCpf,
  validarCpf,
  formatarCpfFinal,
  cpfBate,
} from "@/lib/invite-cpf";

// --- Mocks de infra ---

vi.mock("wouter", () => ({
  useParams: () => ({ token: "tok-dest" }),
  useLocation: () => ["/convite/tok-dest", vi.fn()],
}));

vi.mock("@react-oauth/google", () => ({
  useGoogleLogin: () => vi.fn(),
}));

const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

const mockLogout = vi.fn().mockResolvedValue(undefined);
let mockUser: any = null;

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: mockUser,
    isLoggedIn: !!mockUser,
    updateUserLocal: vi.fn(),
    login: vi.fn().mockResolvedValue(true),
    loginWithGoogle: vi.fn(),
    logout: mockLogout,
  }),
}));

// --- Helpers de mock ---

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

function inviteDestinadoResponse(cpfFinal = "8901", overrides: object = {}) {
  return {
    success: true,
    invite: {
      id: 1,
      token: "tok-dest",
      title: "Reforma da sala",
      status: "active",
      steps: [{ title: "Projeto", price: 5000, group_id: 1 }],
      has_contract_pdf: true,
      contract_pdf_url: "/invites/public/tok-dest/pdf",
      provider_receiving_method: "escrow",
      expires_at: "2027-01-01T00:00:00.000Z",
      destinatario: { cpf_final: cpfFinal },
      ...overrides,
    },
    provider: { name: "Ana Ribeiro", profession: "Arquiteta", user: { name: "Ana Ribeiro" } },
  };
}

function inviteSemDestinatarioResponse(overrides: object = {}) {
  return {
    success: true,
    invite: {
      id: 2,
      token: "tok-dest",
      title: "Projeto de iluminacao",
      status: "active",
      steps: [{ title: "Execucao", price: 3000, group_id: 1 }],
      has_contract_pdf: true,
      contract_pdf_url: "/invites/public/tok-dest/pdf",
      provider_receiving_method: "escrow",
      expires_at: "2027-01-01T00:00:00.000Z",
      destinatario: null,
      ...overrides,
    },
    provider: { name: "Carlos Lima", profession: "Designer", user: { name: "Carlos Lima" } },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  mockToast.mockReset();
  mockLogout.mockReset();
  mockUser = null;
});

// ============================================================
// 1. Helpers puros
// ============================================================

describe("mascaraCpf", () => {
  it("formata 11 digitos com pontos e traco", () => {
    expect(mascaraCpf("12345678909")).toBe("123.456.789-09");
  });

  it("mascara parcial enquanto o usuario digita", () => {
    expect(mascaraCpf("123")).toBe("123");
    expect(mascaraCpf("1234")).toBe("123.4");
    expect(mascaraCpf("1234567")).toBe("123.456.7");
  });

  it("ignora caracteres nao-numericos no input", () => {
    expect(mascaraCpf("abc123def456ghi789ij01")).toBe("123.456.789-01");
  });

  it("limita a 11 digitos mesmo que o input tenha mais", () => {
    expect(mascaraCpf("123456789099999")).toBe("123.456.789-09");
  });
});

describe("validarCpf", () => {
  it("aceita um CPF valido com mascara", () => {
    // CPF valido gerado conforme algoritmo
    expect(validarCpf("529.982.247-25")).toBe(true);
  });

  it("aceita um CPF valido sem mascara", () => {
    expect(validarCpf("52998224725")).toBe(true);
  });

  it("rejeita CPF com todos os digitos iguais", () => {
    expect(validarCpf("111.111.111-11")).toBe(false);
    expect(validarCpf("00000000000")).toBe(false);
    expect(validarCpf("999.999.999-99")).toBe(false);
  });

  it("rejeita CPF com digito verificador errado", () => {
    expect(validarCpf("529.982.247-26")).toBe(false);
  });

  it("rejeita CPF com menos de 11 digitos", () => {
    expect(validarCpf("123.456")).toBe(false);
  });

  it("rejeita string vazia", () => {
    expect(validarCpf("")).toBe(false);
  });
});

describe("formatarCpfFinal", () => {
  it("formata 4 chars com hifen no meio", () => {
    expect(formatarCpfFinal("8901")).toBe("89-01");
    expect(formatarCpfFinal("0000")).toBe("00-00");
  });

  it("retorna vazio para string vazia", () => {
    expect(formatarCpfFinal("")).toBe("");
  });
});

describe("cpfBate", () => {
  it("retorna true quando os 4 ultimos digitos batem", () => {
    expect(cpfBate("52998224725", "4725")).toBe(true);
    expect(cpfBate("529.982.247-25", "4725")).toBe(true);
  });

  it("retorna false quando os 4 ultimos digitos nao batem", () => {
    expect(cpfBate("52998224725", "8901")).toBe(false);
  });

  it("retorna false para CPF vazio", () => {
    expect(cpfBate("", "8901")).toBe(false);
  });

  it("retorna false para CPF com menos de 4 digitos", () => {
    expect(cpfBate("123", "8901")).toBe(false);
  });
});

// ============================================================
// 2. Faixa "Convite pessoal" quando invite tem destinatario
// ============================================================

describe("faixa convite pessoal", () => {
  it("exibe a faixa quando o convite tem destinatario.cpf_final", async () => {
    mockApiRequest((method, path) => {
      if (method === "GET" && path.includes("/invites/public/")) {
        return { status: 200, ok: true, body: inviteDestinadoResponse("8901") };
      }
      return { status: 404, ok: false, body: {} };
    });

    render(<InvitePublic />);

    expect(await screen.findByTestId("faixa-convite-pessoal")).toBeInTheDocument();
    expect(screen.getByTestId("faixa-convite-pessoal")).toHaveTextContent("89-01");
  });

  it("nao exibe a faixa quando o convite nao tem destinatario", async () => {
    mockApiRequest((method, path) => {
      if (method === "GET" && path.includes("/invites/public/")) {
        return { status: 200, ok: true, body: inviteSemDestinatarioResponse() };
      }
      return { status: 404, ok: false, body: {} };
    });

    render(<InvitePublic />);

    await screen.findByTestId("step-proposta");
    expect(screen.queryByTestId("faixa-convite-pessoal")).not.toBeInTheDocument();
  });
});

// ============================================================
// 3. Pre-checagem client-side: CPF diferente nao chama o aceite
// ============================================================

describe("pre-checagem CPF diferente (client-side)", () => {
  it("usuario logado com CPF diferente ve tela 'outra pessoa' ao clicar em Continuar", async () => {
    // CPF 529.982.247-25 termina em "4725", nao "8901"
    mockUser = { id: 5, cpf: "52998224725", type: "contratante" };

    mockApiRequest((method, path) => {
      if (method === "GET" && path.includes("/invites/public/")) {
        return { status: 200, ok: true, body: inviteDestinadoResponse("8901") };
      }
      return { status: 404, ok: false, body: {} };
    });

    render(<InvitePublic />);

    await screen.findByTestId("step-proposta");
    fireEvent.click(screen.getByRole("button", { name: /continuar para assinar/i }));

    await waitFor(() => {
      expect(screen.getByTestId("convite-outra-pessoa")).toBeInTheDocument();
    });
  });

  it("a tela 'outra pessoa' nao chama o endpoint de aceite", async () => {
    mockUser = { id: 5, cpf: "52998224725", type: "contratante" };

    const chamadas: string[] = [];
    mockApiRequest((method, path) => {
      chamadas.push(`${method} ${path}`);
      if (method === "GET" && path.includes("/invites/public/tok-dest") && !path.includes("meu-contrato")) {
        return { status: 200, ok: true, body: inviteDestinadoResponse("8901") };
      }
      return { status: 404, ok: false, body: {} };
    });

    render(<InvitePublic />);

    await screen.findByTestId("step-proposta");
    fireEvent.click(screen.getByRole("button", { name: /continuar para assinar/i }));

    await waitFor(() => {
      expect(screen.getByTestId("convite-outra-pessoa")).toBeInTheDocument();
    });

    expect(chamadas.some((c) => c.includes("accept"))).toBe(false);
  });

  it("usuario logado com CPF correto passa para o passo Revisar", async () => {
    // CPF 529.982.247-25 termina em "4725"
    mockUser = { id: 6, cpf: "52998224725", type: "contratante" };

    mockApiRequest((method, path) => {
      if (method === "GET" && path.includes("/invites/public/")) {
        return { status: 200, ok: true, body: inviteDestinadoResponse("4725") };
      }
      return { status: 404, ok: false, body: {} };
    });

    render(<InvitePublic />);

    await screen.findByTestId("step-proposta");
    fireEvent.click(screen.getByRole("button", { name: /continuar para assinar/i }));

    await waitFor(() => {
      expect(screen.getByTestId("step-revisar")).toBeInTheDocument();
    });
  });
});

// ============================================================
// 4. 403 CPF_DIFERENTE do backend
// ============================================================

describe("403 CPF_DIFERENTE do backend", () => {
  it("mostra tela 'outra pessoa' quando o accept retorna 403 CPF_DIFERENTE", async () => {
    mockUser = {
      id: 7,
      cpf: "52998224725",
      type: "contratante",
      signature_password_set: true,
    };

    // invite com cpf_final que bate com "4725" do usuario (passa pre-checagem),
    // mas o backend rejeita com 403 CPF_DIFERENTE (simula verificacao server-side mais rigorosa)
    mockApiRequest((method, path) => {
      if (method === "GET" && path.includes("/invites/public/tok-dest") && !path.includes("accept")) {
        return { status: 200, ok: true, body: inviteDestinadoResponse("4725") };
      }
      if (method === "POST" && path.includes("accept-and-sign")) {
        return {
          status: 403,
          ok: false,
          body: { success: false, motivo: "CPF_DIFERENTE", message: "Este convite e para outra pessoa." },
        };
      }
      return { status: 404, ok: false, body: {} };
    });

    render(<InvitePublic />);

    await screen.findByTestId("step-proposta");
    fireEvent.click(screen.getByRole("button", { name: /continuar para assinar/i }));
    await screen.findByTestId("step-revisar");

    fireEvent.click(screen.getByLabelText(/li o contrato e concordo/i));
    fireEvent.click(screen.getByLabelText(/minha senha/i));
    fireEvent.change(screen.getByLabelText(/^Senha$/i), { target: { value: "senha123" } });
    fireEvent.click(screen.getByRole("button", { name: /aceitar e assinar/i }));

    await waitFor(() => {
      expect(screen.getByTestId("convite-outra-pessoa")).toBeInTheDocument();
    });
  });
});

// ============================================================
// 5. 423 no GET publico: tela bloqueado
// ============================================================

describe("423 no GET publico", () => {
  it("exibe tela 'bloqueado' quando o GET retorna 423", async () => {
    mockApiRequest((method, path) => {
      if (method === "GET" && path.includes("/invites/public/")) {
        return {
          status: 423,
          ok: false,
          body: {
            success: false,
            bloqueado: true,
            message: "Este link foi bloqueado.",
            invite: { title: "Reforma da sala" },
            provider: { name: "Ana Ribeiro", profession: "Arquiteta" },
          },
        };
      }
      return { status: 404, ok: false, body: {} };
    });

    render(<InvitePublic />);

    expect(await screen.findByTestId("invite-bloqueado")).toBeInTheDocument();
    expect(screen.getByText(/Este link foi bloqueado/i)).toBeInTheDocument();
    expect(screen.getByText(/Ana Ribeiro/i)).toBeInTheDocument();
  });
});

// ============================================================
// 6. Convite sem destinatario: percurso identico ao anterior
// ============================================================

describe("convite sem destinatario", () => {
  it("usuario logado com CPF vai direto para Revisar sem mostrar faixa nem tela de outra pessoa", async () => {
    mockUser = { id: 1, cpf: "52998224725", type: "contratante" };

    mockApiRequest((method, path) => {
      if (method === "GET" && path.includes("/invites/public/")) {
        return { status: 200, ok: true, body: inviteSemDestinatarioResponse() };
      }
      return { status: 404, ok: false, body: {} };
    });

    render(<InvitePublic />);

    await screen.findByTestId("step-proposta");
    expect(screen.queryByTestId("faixa-convite-pessoal")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /continuar para assinar/i }));

    await waitFor(() => {
      expect(screen.getByTestId("step-revisar")).toBeInTheDocument();
      expect(screen.queryByTestId("convite-outra-pessoa")).not.toBeInTheDocument();
    });
  });
});
