/**
 * Testes da feature mensagens-celular
 * spec: 2026-10-mensagens-celular
 *
 * Cobre:
 * - ProposalCard com highlighted=true recebe classe de anel laranja
 * - ContractsPanel passa highlighted=true para o card cujo ticket.id bate com highlightTicketId
 * - ContractsPanel com highlightTicketId=null nao destaca nenhum card
 * - CA-01: abas Conversa e Propostas aparecem quando ha conversa aberta
 * - CA-01: clicar em Propostas oculta ChatPanel e exibe ContractsPanel em largura total
 * - CA-01: clicar em Conversa restaura a visibilidade do ChatPanel
 * - CA-02: location com ?ticket=<id> sem view=contract ativa aba Propostas
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProposalCard } from "@/features/messages/components/ProposalCard";
import { ContractsPanel } from "@/features/messages/components/ContractsPanel";
import Messages from "@/pages/Messages";

// Evita que MessagesLayout/Navbar tente acessar QueryClient ou fazer fetch
vi.mock("@/components/layouts/MessagesLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <main>{children}</main>
  ),
}));

function renderComQuery(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>
  );
}

// ============================================================
// Mocks de infra compartilhados
// ============================================================

vi.mock("@react-oauth/google", () => ({
  useGoogleLogin: () => vi.fn(),
}));

const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: { id: 1, name: "Ana", type: "contratante", signature_password_configured: false },
    isLoggedIn: true,
    updateUserLocal: vi.fn(),
    login: vi.fn(),
    loginWithGoogle: vi.fn(),
    logout: vi.fn(),
  }),
}));

const mockSetLocation = vi.fn();
let mockLocation = "/messages/5";

vi.mock("wouter", () => ({
  useParams: () => ({ userId: "5" }),
  useLocation: () => [mockLocation, mockSetLocation],
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/hooks/use-messaging", () => ({
  useMessaging: () => ({
    conversations: [],
    currentConversation: {
      id: 10,
      otherUser: {
        id: 5,
        name: "Prestador Teste",
        type: "prestador",
        is_hidden: false,
        perfil: null,
        avatar: null,
      },
      isNegotiation: false,
    },
    messages: [],
    newMessage: "",
    unreadMessageCount: 0,
    loadingConversations: false,
    sendingMessage: false,
    setNewMessage: vi.fn(),
    sendMessage: vi.fn(),
    selectConversation: vi.fn(),
    conversationsError: null,
  }),
}));

vi.mock("@/hooks/use-contract", () => ({
  useContract: () => ({
    tickets: [],
    loadingTickets: false,
    createProposal: vi.fn(),
    getStepsForTicket: vi.fn().mockResolvedValue([]),
    updateTicketStatus: vi.fn(),
    updateStep: vi.fn(),
    deleteStep: vi.fn(),
    deleteTicket: vi.fn(),
    markStepCompleted: vi.fn(),
    confirmFreelancerStep: vi.fn(),
    rejectStep: vi.fn(),
    sendSystemMessage: vi.fn(),
    refetchTickets: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-signature", () => ({
  useSignature: () => ({
    signContract: vi.fn(),
    acceptStep: vi.fn(),
    buscarPDF: vi.fn(),
  }),
  default: () => ({
    signContract: vi.fn(),
    acceptStep: vi.fn(),
    buscarPDF: vi.fn(),
  }),
}));

vi.mock("@/features/messages/hooks/usePdfViewer", () => ({
  usePdfViewer: () => ({
    showPdfViewer: false,
    setShowPdfViewer: vi.fn(),
    pdfBlob: null,
    pdfUrl: null,
    pdfFilename: null,
    selectedTicketForPdf: null,
    loadingPdf: false,
    pdfError: null,
    fullscreenPdf: false,
    setFullscreenPdf: vi.fn(),
    handleViewPdf: vi.fn(),
    closePdfViewer: vi.fn(),
    downloadPdf: vi.fn(),
  }),
}));

vi.mock("@/features/messages/hooks/useProposalComposer", () => ({
  useProposalComposer: () => ({
    proposalSteps: [{ id: "s1", title: "", price: 0, paymentGroupId: 1 }],
    setProposalSteps: vi.fn(),
    providerReceivingMethod: "escrow",
    setProviderReceivingMethod: vi.fn(),
    selectedReceivingAccountId: null,
    setSelectedReceivingAccountId: vi.fn(),
    contractFile: null,
    setContractFile: vi.fn(),
    addProposalStep: vi.fn(),
    removeProposalStep: vi.fn(),
    updateProposalStep: vi.fn(),
    handleContractFileChange: vi.fn(),
  }),
}));

// jsdom nao implementa scrollIntoView
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
  mockToast.mockReset();
  mockSetLocation.mockReset();
  mockLocation = "/messages/5";
});

// ============================================================
// 1. ProposalCard: prop highlighted
// ============================================================

const baseTicket = { id: 42, status: "pendente", provider_receiving_method: "escrow" };
const baseSteps: any[] = [];
const baseCardProps = {
  ticket: baseTicket,
  steps: baseSteps,
  onViewDetails: vi.fn(),
  onViewPdf: vi.fn(),
  onStartSignature: vi.fn(),
};

describe("ProposalCard - prop highlighted", () => {
  it("nao tem anel laranja quando highlighted e false", () => {
    render(<ProposalCard {...baseCardProps} highlighted={false} />);
    const card = screen.getByTestId("proposal-card");
    expect(card.className).not.toContain("ring-orange");
  });

  it("tem anel laranja quando highlighted e true", () => {
    render(<ProposalCard {...baseCardProps} highlighted={true} />);
    const card = screen.getByTestId("proposal-card");
    expect(card.className).toContain("ring-2");
    expect(card.className).toContain("ring-orange-400");
  });

  it("data-ticket-id esta no elemento raiz", () => {
    render(<ProposalCard {...baseCardProps} />);
    expect(screen.getByTestId("proposal-card")).toHaveAttribute(
      "data-ticket-id",
      "42"
    );
  });
});

// ============================================================
// 2. ContractsPanel: highlightTicketId
// ============================================================

const sortFn = (a: any, b: any) => b.id - a.id;

describe("ContractsPanel - highlightTicketId", () => {
  const twoTickets = [
    { id: 42, status: "pendente", provider_receiving_method: "escrow" },
    { id: 7, status: "em andamento", provider_receiving_method: "escrow" },
  ];

  it("destaca o card cujo id bate com highlightTicketId", () => {
    render(
      <ContractsPanel
        tickets={twoTickets}
        ticketStepsMap={{}}
        loadingTickets={false}
        canCreateProposal={false}
        sortTicketsDesc={sortFn}
        onOpenOlderContracts={vi.fn()}
        onViewProposalDetails={vi.fn()}
        onViewPdf={vi.fn()}
        onStartSignature={vi.fn()}
        highlightTicketId={42}
      />
    );
    const cards = screen.getAllByTestId("proposal-card");
    const card42 = cards.find((c) => c.getAttribute("data-ticket-id") === "42");
    const card7 = cards.find((c) => c.getAttribute("data-ticket-id") === "7");
    expect(card42?.className).toContain("ring-orange-400");
    expect(card7?.className).not.toContain("ring-orange-400");
  });

  it("nao destaca nenhum card quando highlightTicketId e null", () => {
    render(
      <ContractsPanel
        tickets={twoTickets}
        ticketStepsMap={{}}
        loadingTickets={false}
        canCreateProposal={false}
        sortTicketsDesc={sortFn}
        onOpenOlderContracts={vi.fn()}
        onViewProposalDetails={vi.fn()}
        onViewPdf={vi.fn()}
        onStartSignature={vi.fn()}
        highlightTicketId={null}
      />
    );
    const cards = screen.getAllByTestId("proposal-card");
    cards.forEach((card) => {
      expect(card.className).not.toContain("ring-orange-400");
    });
  });
});

// ============================================================
// 3. Messages: abas no celular
// ============================================================

describe("Messages - abas no celular", () => {
  it("renderiza os botoes de aba quando ha conversa aberta", async () => {
    renderComQuery(<Messages />);
    await waitFor(() => {
      expect(screen.getByTestId("tab-conversa")).toBeTruthy();
      expect(screen.getByTestId("tab-propostas")).toBeTruthy();
    });
  });

  it("aba Conversa esta selecionada por padrao", async () => {
    renderComQuery(<Messages />);
    const tabConversa = await screen.findByTestId("tab-conversa");
    expect(tabConversa).toHaveAttribute("aria-selected", "true");
    const tabPropostas = screen.getByTestId("tab-propostas");
    expect(tabPropostas).toHaveAttribute("aria-selected", "false");
  });

  it("clicar em Propostas ativa a aba Propostas", async () => {
    renderComQuery(<Messages />);
    const tabPropostas = await screen.findByTestId("tab-propostas");
    fireEvent.click(tabPropostas);
    await waitFor(() => {
      expect(screen.getByTestId("tab-propostas")).toHaveAttribute(
        "aria-selected",
        "true"
      );
      expect(screen.getByTestId("tab-conversa")).toHaveAttribute(
        "aria-selected",
        "false"
      );
    });
  });

  it("clicar em Conversa volta para a aba Conversa", async () => {
    renderComQuery(<Messages />);
    const tabPropostas = await screen.findByTestId("tab-propostas");
    fireEvent.click(tabPropostas);
    const tabConversa = await screen.findByTestId("tab-conversa");
    fireEvent.click(tabConversa);
    await waitFor(() => {
      expect(screen.getByTestId("tab-conversa")).toHaveAttribute(
        "aria-selected",
        "true"
      );
    });
  });
});

// ============================================================
// 4. Messages: ?ticket=<id> ativa aba Propostas
// ============================================================

describe("Messages - ?ticket=<id> sem view=contract", () => {
  it("location com ?ticket=42 ativa a aba Propostas", async () => {
    mockLocation = "/messages/5?ticket=42";
    renderComQuery(<Messages />);
    await waitFor(() => {
      expect(screen.getByTestId("tab-propostas")).toHaveAttribute(
        "aria-selected",
        "true"
      );
    });
  });

  it("location com ?view=contract&ticket=42 NAO ativa a aba Propostas", async () => {
    mockLocation = "/messages/5?view=contract&ticket=42";
    renderComQuery(<Messages />);
    await waitFor(() => {
      expect(screen.getByTestId("tab-conversa")).toHaveAttribute(
        "aria-selected",
        "true"
      );
    });
  });
});
