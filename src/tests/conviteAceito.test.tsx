/**
 * Convite ja aceito: quem aceitou volta ao proprio contrato pelo link.
 * spec: 2026-10-convite-continuar-no-app
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as queryClientLib from "@/lib/queryClient";
import InvitePublic from "../pages/InvitePublic";

const mockNavigate = vi.fn();
vi.mock("wouter", () => ({
  useParams: () => ({ token: "tok-teste" }),
  useLocation: () => ["/convite/tok-teste", mockNavigate],
}));

vi.mock("@react-oauth/google", () => ({
  useGoogleLogin: () => vi.fn(),
}));

const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

let mockUser: any = null;
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: mockUser,
    isLoggedIn: !!mockUser,
    updateUserLocal: vi.fn(),
    login: vi.fn(),
    loginWithGoogle: vi.fn(),
  }),
}));

const conviteAceito = {
  success: true,
  invite: { status: "accepted", title: "Reforma total do apto", expires_at: "2026-01-01T00:00:00.000Z", steps: [] },
  provider: { name: "Ana Costa", profession: "Arquiteta", user: { name: "Ana Costa" } },
};

function mockApi(meuContrato: { status: number; body: unknown }) {
  const chamadas: string[] = [];
  vi.spyOn(queryClientLib, "apiRequest").mockImplementation(async (method: string, path: string) => {
    chamadas.push(`${method} ${path}`);
    const r = path.endsWith("/meu-contrato") ? meuContrato : { status: 200, body: conviteAceito };
    return { ok: r.status < 400, status: r.status, json: async () => r.body } as Response;
  });
  return chamadas;
}

afterEach(() => {
  vi.restoreAllMocks();
  mockNavigate.mockReset();
  mockUser = null;
});

describe("convite ja aceito", () => {
  it("cliente que aceitou abre o proprio contrato", async () => {
    mockUser = { id: 10, name: "Bruno", cpf: "12345678909" };
    mockApi({ status: 200, body: { data: { ticket_id: 31, conversation_id: 5, provider_user_id: 3 } } });

    render(<InvitePublic />);

    fireEvent.click(await screen.findByTestId("abrir-meu-contrato"));
    expect(mockNavigate).toHaveBeenCalledWith("/messages/3?ticket=31");
  });

  it("outra conta ve que o convite foi aceito por outra pessoa", async () => {
    mockUser = { id: 99, name: "Carla", cpf: "98765432100" };
    mockApi({ status: 404, body: { message: "Contrato não encontrado." } });

    render(<InvitePublic />);

    expect(await screen.findByTestId("aceito-por-outra-conta")).toBeTruthy();
    expect(screen.queryByTestId("abrir-meu-contrato")).toBeNull();
  });

  it("deslogado nao consulta o contrato e pede para entrar", async () => {
    const chamadas = mockApi({ status: 200, body: {} });

    render(<InvitePublic />);

    await waitFor(() => expect(screen.getByTestId("invite-already-accepted")).toBeTruthy());
    expect(screen.getByText(/entre na sua conta para ver o contrato/i)).toBeTruthy();
    expect(chamadas.some((c) => c.endsWith("/meu-contrato"))).toBe(false);
  });
});
