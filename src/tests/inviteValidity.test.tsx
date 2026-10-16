import { render, screen } from "@testing-library/react";
import InvitePublic from "../pages/InvitePublic";
import * as queryClientLib from "@/lib/queryClient";
import {
  VALIDADES_DO_CONVITE,
  VALIDADE_PADRAO,
  falhaDoConvitePublico,
  formatInviteExpiry,
} from "@/lib/invite-validity";

// Validade do link de proposta (spec 2026-09-convite-validade).

vi.mock("wouter", () => ({
  useParams: () => ({ token: "token-e2e" }),
  useLocation: () => ["/convite/token-e2e", vi.fn()],
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: null, isLoggedIn: false, updateUserLocal: vi.fn() }),
}));

vi.mock("@/components/modals/AuthModals", () => ({ AuthModals: () => null }));

function responder(status: number, body: unknown) {
  vi.spyOn(queryClientLib, "apiRequest").mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response);
}

afterEach(() => vi.restoreAllMocks());

describe("validade do convite", () => {
  it("oferece 1h, 24h, 3d e 7d, com 24h de padrao (igual ao backend)", () => {
    expect(VALIDADES_DO_CONVITE.map((v) => v.value)).toEqual(["1h", "24h", "3d", "7d"]);
    expect(VALIDADE_PADRAO).toBe("24h");
  });

  it("formata no horario de Brasilia e ignora data invalida", () => {
    expect(formatInviteExpiry("2026-09-28T17:30:00.000Z")).toBe("28/09, 14:30");
    expect(formatInviteExpiry("nada")).toBeNull();
    expect(formatInviteExpiry(null)).toBeNull();
  });

  it("so 404 e 410 viram falha conhecida", () => {
    expect(falhaDoConvitePublico(404, {})).toEqual({ tipo: "nao_encontrado" });
    expect(falhaDoConvitePublico(410, { expired: true, invite: { title: "X" } })).toMatchObject({ tipo: "expirado", titulo: "X" });
    expect(falhaDoConvitePublico(500, {})).toBeNull();
  });
});

describe("pagina publica do convite", () => {
  it("link vencido diz que expirou e de quem pedir outro", async () => {
    responder(410, {
      code: 410,
      success: false,
      expired: true,
      message: "Este convite expirou.",
      invite: { title: "Reforma apto 32", expires_at: "2026-09-28T17:30:00.000Z" },
      provider: { name: "Ana Prestadora", profession: "Arquiteta" },
    });

    render(<InvitePublic />);

    expect(await screen.findByRole("heading", { name: "Este convite expirou" })).toBeInTheDocument();
    expect(screen.getByText("Reforma apto 32")).toBeInTheDocument();
    expect(screen.getByText("Venceu em 28/09, 14:30")).toBeInTheDocument();
    expect(screen.getByText("Peça um novo link a Ana Prestadora.")).toBeInTheDocument();
  });

  it("link inexistente diz que nao encontrou, sem falar em expirado", async () => {
    responder(404, { code: 404, success: false, message: "Convite não encontrado." });

    render(<InvitePublic />);

    expect(await screen.findByRole("heading", { name: "Convite não encontrado" })).toBeInTheDocument();
    expect(screen.queryByText(/expirou/i)).not.toBeInTheDocument();
  });
});
