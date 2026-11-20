/**
 * Página do convite na estética do app (20/11/2026): ver, criar a conta, assinar, pagar e
 * acompanhar pelo link. Depois que a conta entra pelo link, só ela vê a proposta.
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as queryClientLib from "@/lib/queryClient";
import InvitePublic from "../pages/InvitePublic";

vi.mock("wouter", () => ({
  useParams: () => ({ token: "tok" }),
  useLocation: () => ["/convite/tok", vi.fn()],
}));
vi.mock("@react-oauth/google", () => ({ useGoogleLogin: () => vi.fn() }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

let mockUser: any = null;
const mockLogout = vi.fn();
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: mockUser,
    isLoggedIn: !!mockUser,
    logout: mockLogout,
    login: vi.fn(),
    loginWithGoogle: vi.fn(),
    updateUserLocal: vi.fn(),
  }),
}));

type Resp = { status?: number; body: unknown };
let rotas: Record<string, Resp | ((corpo: any) => Resp)> = {};
const chamadas: { metodo: string; caminho: string; corpo: any }[] = [];

function api() {
  vi.spyOn(queryClientLib, "apiRequest").mockImplementation(async (metodo: string, caminho: string, corpo?: unknown) => {
    chamadas.push({ metodo, caminho, corpo });
    const chave = Object.keys(rotas).filter((k) => `${metodo} ${caminho}`.startsWith(k)).sort((a, b) => b.length - a.length)[0];
    const r0 = chave ? rotas[chave] : { status: 404, body: {} };
    const r = typeof r0 === "function" ? r0(corpo) : r0;
    const status = r.status ?? 200;
    return { ok: status < 400, status, json: async () => r.body, text: async () => JSON.stringify(r.body) } as Response;
  });
}

const convite = (extra: object = {}) => ({
  success: true,
  invite: {
    id: 1, token: "tok", title: "Reforma do banheiro", description: "Troca de piso", status: "active",
    steps: [], has_contract_pdf: false, expires_at: "2027-01-01T00:00:00.000Z", ...extra,
  },
  provider: { id: 7, name: "Carlos Mendes", profession: "Pedreiro", verificado: true },
});

const precos = {
  success: true,
  data: {
    prazo_conferencia_dias: 3,
    grupos: [
      { nome: "Demolição", fases: [{ titulo: "Retirar piso", valor: 1000, inicio: "2026-12-01", fim: "2026-12-05" }], precos: { cartao: 1100, pix: 1050, parcelas: { vezes: 6, valor: 190 } } },
      { nome: "Acabamento", fases: [{ titulo: "Assentar piso", valor: 2000, inicio: "2026-12-10", fim: "2026-12-20" }], precos: { cartao: 2200, pix: 2100, parcelas: { vezes: 12, valor: 200 } } },
    ],
  },
};

beforeEach(() => {
  vi.restoreAllMocks();
  mockUser = null;
  mockLogout.mockReset();
  chamadas.length = 0;
  rotas = { "GET /invites/public/tok/precos": { body: precos }, "GET /invites/public/tok": { body: convite() } };
  api();
});

describe("antes de assinar", () => {
  it("mostra o nome do projeto, o aviso do app e o total no fim dos pagamentos", async () => {
    render(<InvitePublic />);
    expect(await screen.findByRole("heading", { level: 1, name: "Reforma do banheiro" })).toBeInTheDocument();
    const app = screen.getByTestId("aviso-do-app");
    expect(app.querySelector("a")?.getAttribute("href")).toBe("https://play.google.com/store/apps/details?id=com.arqdoor.app");
    expect(await screen.findAllByTestId("bloco-pagamento")).toHaveLength(2);
    expect(screen.getByTestId("convite-total")).toHaveTextContent("Total dos 2 pagamentos");
    expect(screen.getByTestId("convite-total")).toHaveTextContent(/3\.300,00/);
    // limites de parcela diferentes: a nota explica cada um
    expect(screen.getByText(/Demolição em até 6×, Acabamento em até 12×/)).toBeInTheDocument();
    // o valor grande não fica no topo
    expect(screen.getByTestId("convite-hero")).not.toHaveTextContent("R$");
  });

  it("deslogado: assinar abre a criação da conta", async () => {
    render(<InvitePublic />);
    fireEvent.click((await screen.findAllByTestId("acao-principal"))[0]);
    expect(await screen.findByRole("dialog", { name: "Entre para assinar" })).toBeInTheDocument();
    expect(screen.getByTestId("step-conta")).toBeInTheDocument();
  });

  it("logado: assinar prende a conta ao convite e abre a assinatura", async () => {
    mockUser = { id: 5, name: "Ana Costa", cpf: "11122233344", signature_password_set: true };
    rotas["POST /invites/public/tok/vincular"] = { body: { success: true } };
    render(<InvitePublic />);
    fireEvent.click((await screen.findAllByTestId("acao-principal"))[0]);
    await waitFor(() => expect(chamadas.some((c) => c.metodo === "POST" && c.caminho === "/invites/public/tok/vincular")).toBe(true));
    expect(await screen.findByTestId("step-revisar")).toBeInTheDocument();
  });

  it("já vinculado a esta conta: vai direto para revisar e assinar", async () => {
    mockUser = { id: 5, name: "Ana Costa", cpf: "11122233344", signature_password_set: true };
    rotas["GET /invites/public/tok"] = { body: convite({ vinculado_a_mim: true }) };
    render(<InvitePublic />);
    expect((await screen.findAllByText("Revise e assine")).length).toBeGreaterThan(0);
  });

  it("outra conta pelo mesmo link: não vê a proposta", async () => {
    mockUser = { id: 6, name: "Bruno" };
    rotas["GET /invites/public/tok"] = { status: 403, body: { motivo: "CONVITE_VINCULADO", invite: { title: "Reforma do banheiro" } } };
    render(<InvitePublic />);
    expect(await screen.findByText("Esta proposta já está ligada a uma conta")).toBeInTheDocument();
    expect(chamadas.some((c) => c.caminho.endsWith("/precos"))).toBe(false);
    fireEvent.click(screen.getByText("Sair desta conta"));
    expect(mockLogout).toHaveBeenCalled();
  });

  it("vincular devolve 409: mostra que é de outra conta", async () => {
    mockUser = { id: 6, name: "Bruno", cpf: "11122233344" };
    rotas["POST /invites/public/tok/vincular"] = { status: 409, body: { motivo: "CONVITE_DE_OUTRA_CONTA" } };
    render(<InvitePublic />);
    fireEvent.click((await screen.findAllByTestId("acao-principal"))[0]);
    expect(await screen.findByText("Esta proposta já está ligada a uma conta")).toBeInTheDocument();
  });
});

describe("convite destinado a um CPF", () => {
  beforeEach(() => {
    rotas["GET /invites/public/tok"] = { body: convite({ destinatario: { cpf_final: "3344" } }) };
  });

  it("mostra a faixa de convite pessoal antes da conta", async () => {
    render(<InvitePublic />);
    expect(await screen.findByTestId("faixa-convite-pessoal")).toHaveTextContent("33-44");
  });

  it("conta com outro CPF: tela de outra pessoa, sem gastar tentativa", async () => {
    mockUser = { id: 5, name: "Ana", cpf: "999.888.777-66" };
    render(<InvitePublic />);
    fireEvent.click((await screen.findAllByTestId("acao-principal"))[0]);
    expect(await screen.findByText("Esta proposta é para outra pessoa")).toBeInTheDocument();
    expect(chamadas.some((c) => c.caminho.endsWith("/vincular"))).toBe(false);
  });

  it("o servidor recusa o CPF: mesma tela", async () => {
    mockUser = { id: 5, name: "Ana", cpf: null };
    rotas["POST /invites/public/tok/vincular"] = { status: 403, body: { motivo: "CPF_DIFERENTE" } };
    render(<InvitePublic />);
    fireEvent.click((await screen.findAllByTestId("acao-principal"))[0]);
    expect(await screen.findByText("Esta proposta é para outra pessoa")).toBeInTheDocument();
  });
});

describe("link indisponível", () => {
  it("vencido", async () => {
    rotas["GET /invites/public/tok"] = { status: 410, body: { expired: true, invite: { title: "Reforma" }, provider: { name: "Carlos Mendes" } } };
    render(<InvitePublic />);
    expect(await screen.findByRole("heading", { name: "Este link venceu" })).toBeInTheDocument();
  });
  it("não encontrado", async () => {
    rotas["GET /invites/public/tok"] = { status: 404, body: {} };
    render(<InvitePublic />);
    expect(await screen.findByRole("heading", { name: "Proposta não encontrada" })).toBeInTheDocument();
  });
  it("bloqueado", async () => {
    rotas["GET /invites/public/tok"] = { status: 423, body: { bloqueado: true, invite: { title: "Reforma" } } };
    render(<InvitePublic />);
    expect(await screen.findByRole("heading", { name: "Este link foi bloqueado" })).toBeInTheDocument();
  });
});

describe("depois de assinado", () => {
  const grupos = {
    success: true,
    data: {
      groups: [
        { group_id: 1, name: "Demolição", is_fully_paid: true, paid_at: "2026-11-25", paid_method: "PIX", paid_amount: 1050, total_price: 1000,
          steps: [{ id: 11, title: "Retirar piso", price: 1000, start_date: "2026-12-01", end_date: "2026-12-05", status: "Em andamento", confirm_freelancer: true, confirm_contractor: false }] },
        { group_id: 2, name: "Acabamento", is_fully_paid: false, total_price: 2000,
          steps: [{ id: 12, title: "Assentar piso", price: 2000, start_date: "2026-12-10", end_date: "2026-12-20", status: "Pendente" }] },
      ],
      loose_steps: [],
    },
  };

  beforeEach(() => {
    rotas["GET /invites/public/tok"] = { body: convite({ status: "accepted" }) };
    rotas["GET /invites/public/tok/meu-contrato"] = { body: { data: { ticket_id: 90, provider_user_id: 70 } } };
    rotas["GET /ticket/90/payment-groups"] = { body: grupos };
    rotas["GET /payments/options"] = { body: { data: { options: [{ method: "credit_card_1", installments: 1, total: 2200 }, { method: "pix", total: 2100 }] } } };
  });

  it("deslogado: pede para entrar e não consulta o contrato", async () => {
    render(<InvitePublic />);
    expect(await screen.findByText(/Entre com a conta que assinou/)).toBeInTheDocument();
    expect(chamadas.some((c) => c.caminho.endsWith("/meu-contrato"))).toBe(false);
  });

  it("logado com a conta que assinou: vê a fase entregue e aprova com a senha", async () => {
    mockUser = { id: 5, name: "Ana Costa", signature_password_set: true };
    rotas["PATCH /step/signature/11"] = { body: { success: true } };
    render(<InvitePublic />);
    expect((await screen.findAllByText("Carlos entregou: Retirar piso")).length).toBeGreaterThan(0);
    expect(screen.getByText(/Pago no Pix/)).toBeInTheDocument();
    fireEvent.click(screen.getAllByText("Aprovar fase")[0]);
    const senha = await screen.findByLabelText("Confirme com a sua senha");
    fireEvent.change(senha, { target: { value: "segredo" } });
    fireEvent.click(screen.getByText("Aprovar e liberar"));
    await waitFor(() => expect(chamadas.find((c) => c.metodo === "PATCH")?.corpo).toEqual({ password: "segredo" }));
  });

  it("pedir ajuste manda a fase de volta com o motivo", async () => {
    mockUser = { id: 5, name: "Ana Costa", signature_password_set: true };
    rotas["PATCH /step/11"] = { body: { success: true } };
    render(<InvitePublic />);
    fireEvent.click((await screen.findAllByText("Pedir ajuste"))[0]);
    fireEvent.change(await screen.findByLabelText("O que está errado"), { target: { value: "O rejunte ficou manchado perto do ralo." } });
    fireEvent.click(screen.getByText("Enviar pedido de ajuste"));
    await waitFor(() => expect(chamadas.find((c) => c.metodo === "PATCH" && c.caminho === "/step/11")?.corpo).toEqual({ status: "Recusado", motivo: "O rejunte ficou manchado perto do ralo." }));
  });

  it("outra conta logada: o contrato não abre", async () => {
    mockUser = { id: 6, name: "Bruno" };
    rotas["GET /invites/public/tok/meu-contrato"] = { status: 404, body: {} };
    render(<InvitePublic />);
    expect(await screen.findByText(/assinado com outra conta/)).toBeInTheDocument();
    expect(chamadas.some((c) => c.caminho.startsWith("/ticket/"))).toBe(false);
  });
});

describe("assinatura só com senha", () => {
  it("não oferece assinar pela conta Google", async () => {
    mockUser = { id: 5, name: "Ana", cpf: "11122233344", signature_password_set: true, signature_password_configured: false };
    rotas["GET /invites/public/tok"] = { body: convite({ vinculado_a_mim: true }) };
    render(<InvitePublic />);
    fireEvent.click((await screen.findAllByTestId("acao-principal"))[0]);
    await screen.findByTestId("step-revisar");
    expect(screen.queryByText(/conta Google/)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Confirme com a sua senha")).toBeInTheDocument();
  });

  it("conta do Google cria a senha de assinatura e assina com ela", async () => {
    mockUser = { id: 5, name: "Ana", cpf: "11122233344", provider: "google", signature_password_set: false, signature_password_configured: false };
    rotas["GET /invites/public/tok"] = { body: convite({ vinculado_a_mim: true }) };
    rotas["PUT /users/me/signature-password"] = { body: { success: true, signature_password_configured: true } };
    rotas["POST /invites/public/tok/accept-and-sign"] = { body: { success: true, pagamento: { devido: null } } };
    render(<InvitePublic />);
    fireEvent.click((await screen.findAllByTestId("acao-principal"))[0]);
    await screen.findByTestId("step-revisar");
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.change(screen.getByLabelText("Senha de assinatura"), { target: { value: "minhasenha" } });
    fireEvent.change(screen.getByLabelText("Repita a senha"), { target: { value: "minhasenha" } });
    fireEvent.click(screen.getByText("Aceitar e assinar"));
    await waitFor(() => expect(chamadas.find((c) => c.caminho.endsWith("/accept-and-sign"))?.corpo).toEqual({ li_e_concordo: true, password: "minhasenha" }));
    const ordem = chamadas.map((c) => c.caminho);
    expect(ordem.indexOf("/users/me/signature-password")).toBeLessThan(ordem.indexOf("/invites/public/tok/accept-and-sign"));
  });
});

describe("correções da revisão", () => {
  it("a folha de conta não quebra quando a pessoa entra sem CPF com ela aberta", async () => {
    const { StepConta } = await import("@/features/convite/StepConta");
    const { rerender } = render(<StepConta user={null} onSuccess={vi.fn()} />);
    rerender(<StepConta user={{ id: 5, name: "Ana", cpf: null } as any} onSuccess={vi.fn()} />);
    expect(await screen.findByTestId("step-conta")).toBeInTheDocument();
  });

  it("rede caiu: mostra tentar de novo em vez de carregar para sempre", async () => {
    vi.spyOn(queryClientLib, "apiRequest").mockRejectedValue(new Error("rede"));
    render(<InvitePublic />);
    expect(await screen.findByText("Não foi possível abrir agora")).toBeInTheDocument();
  });

  it("pagamento por fase confere a própria fase no Já paguei", async () => {
    const { StepPagamento } = await import("@/features/convite/StepPagamento");
    rotas["POST /payments/steps/31"] = { body: { success: true, data: { status: "PENDING", pix: { qr_code: "000201", copia_e_cola: "000201" } } } };
    rotas["GET /payments/steps/31/refresh"] = { body: { success: true, data: { paid: false } } };
    const onSuccess = vi.fn();
    render(<StepPagamento ticketId={90} onSuccess={onSuccess} onSkip={vi.fn()}
      pagamento={{ modo: "protegido", assinado: true, motivo: "", devido: { tipo: "etapa", step_id: 31, nome: "Pintura", valor: 500, etapas: [{ id: 31, title: "Pintura", price: 500 }] } }} />);
    fireEvent.click(screen.getByText("Gerar cobrança"));
    await waitFor(() => expect(chamadas.some((c) => c.metodo === "POST" && c.caminho === "/payments/steps/31")).toBe(true));
    fireEvent.click(await screen.findByTestId("ja-paguei"));
    await waitFor(() => expect(chamadas.some((c) => c.caminho === "/payments/steps/31/refresh")).toBe(true));
    expect(chamadas.some((c) => c.caminho.startsWith("/payments/tickets/"))).toBe(false);
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
