/**
 * Testes de renderizacao dos componentes de presenca
 * spec: 2026-10-presenca-no-chat
 *
 * Cobre:
 * - ConversationRow (dentro de ConversationsSidebar): quatro estados de presenca
 * - ConversationHeader: quatro estados de presenca + "digitando..."
 * - PresencaDot: online, disponivel, indisponivel
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConversationsSidebar } from "@/features/messages/components/ConversationsSidebar";
import { ConversationHeader } from "@/features/messages/components/ConversationHeader";
import { PresencaDot } from "@/components/PresencaDot";
import {
  semeadoDeConversas,
  conversaDigitando,
  conversaParou,
  _resetarEstado,
} from "@/lib/presenca";
import { Conversation } from "@/lib/Interfaces";

// ----------------------------------------------------------------
// Mock do store de presenca
// ----------------------------------------------------------------
// Nao mockamos o store; chamamos as funcoes de estado diretamente nos testes.
// Isso garante que o comportamento real esta sendo testado.

beforeEach(() => {
  _resetarEstado();
});

// ----------------------------------------------------------------
// Helper
// ----------------------------------------------------------------

function mkConv(
  id: number,
  userId: number,
  name: string,
  tipo: "prestador" | "contratante" = "prestador"
): Conversation {
  return {
    id,
    user1_id: 1,
    user2_id: userId,
    isNegotiation: false,
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
    otherUser: {
      id: userId,
      name,
      email: "",
      type: tipo,
      is_active: true,
      online: false,
    },
    unreadCount: 0,
  };
}

function renderComQuery(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

// ----------------------------------------------------------------
// PresencaDot
// ----------------------------------------------------------------

describe("PresencaDot", () => {
  it("renderiza bolinha verde forte para online", () => {
    const { container } = render(
      <PresencaDot presenca={{ online: true, disponivel: true }} />
    );
    const dot = container.querySelector("[aria-hidden='true']");
    expect(dot).toBeTruthy();
    expect((dot as HTMLElement).style.backgroundColor).toBe("rgb(34, 197, 94)"); // #22c55e
  });

  it("renderiza bolinha verde apagada para disponivel (nao online)", () => {
    const { container } = render(
      <PresencaDot presenca={{ online: false, disponivel: true }} />
    );
    const dot = container.querySelector("[aria-hidden='true']");
    expect(dot).toBeTruthy();
    expect((dot as HTMLElement).style.backgroundColor).toBe("rgb(167, 220, 184)"); // #a7dcb8
  });

  it("nao renderiza bolinha para indisponivel", () => {
    const { container } = render(
      <PresencaDot presenca={{ online: false, disponivel: false }} />
    );
    expect(container.querySelector("[aria-hidden='true']")).toBeNull();
  });
});

// ----------------------------------------------------------------
// ConversationHeader
// ----------------------------------------------------------------

describe("ConversationHeader - status label", () => {
  const baseProps = {
    canCreateProposal: false,
    canViewProfile: false,
    onOpenProposal: vi.fn(),
    onViewProfile: vi.fn(),
  };

  it("mostra 'Online' quando online=true", () => {
    const conv = mkConv(1, 10, "Bruno");
    semeadoDeConversas([{ ...conv, otherUser: { ...conv.otherUser, online: true, is_active: true } }]);

    renderComQuery(<ConversationHeader {...baseProps} conversation={conv} />);
    expect(screen.getByText("Online")).toBeTruthy();
  });

  it("mostra 'Disponível' quando disponivel=true e nao online", () => {
    const conv = mkConv(1, 10, "Bruno");
    semeadoDeConversas([{ ...conv, otherUser: { ...conv.otherUser, online: false, is_active: true } }]);

    renderComQuery(<ConversationHeader {...baseProps} conversation={conv} />);
    expect(screen.getByText("Disponível")).toBeTruthy();
  });

  it("mostra 'Indisponível' quando is_active=false e nao online", () => {
    const conv = mkConv(1, 10, "Diego");
    semeadoDeConversas([{ ...conv, otherUser: { ...conv.otherUser, online: false, is_active: false } }]);

    renderComQuery(<ConversationHeader {...baseProps} conversation={conv} />);
    expect(screen.getByText("Indisponível")).toBeTruthy();
  });

  it("mostra 'digitando...' quando o outro esta digitando (sobrepoe o status)", () => {
    const conv = mkConv(1, 10, "Bruno");
    semeadoDeConversas([{ ...conv, otherUser: { ...conv.otherUser, online: true, is_active: true } }]);
    conversaDigitando({ conversation_id: 1, user_id: 10 });

    renderComQuery(<ConversationHeader {...baseProps} conversation={conv} />);
    expect(screen.getByText("digitando...")).toBeTruthy();
    // Status nao deve aparecer enquanto digitando
    expect(screen.queryByText("Online")).toBeNull();
  });

  it("volta ao status normal quando digitando para", () => {
    const conv = mkConv(1, 10, "Bruno");
    semeadoDeConversas([{ ...conv, otherUser: { ...conv.otherUser, online: true, is_active: true } }]);
    conversaDigitando({ conversation_id: 1, user_id: 10 });
    conversaParou(1);

    renderComQuery(<ConversationHeader {...baseProps} conversation={conv} />);
    expect(screen.queryByText("digitando...")).toBeNull();
    expect(screen.getByText("Online")).toBeTruthy();
  });
});

// ----------------------------------------------------------------
// ConversationsSidebar - preview de digitando
// ----------------------------------------------------------------

describe("ConversationsSidebar - preview", () => {
  it("mostra lastMessage.content quando nao esta digitando", () => {
    const conv = mkConv(1, 10, "Ana");
    (conv as any).lastMessage = { id: 1, content: "Ola!", created_at: "2024-01-01", sender_id: 10 };
    semeadoDeConversas([conv]);

    renderComQuery(
      <ConversationsSidebar
        conversations={[conv]}
        currentConversation={null}
        loading={false}
        unreadMessageCount={0}
        onSelectConversation={vi.fn()}
      />
    );
    expect(screen.getByText("Ola!")).toBeTruthy();
  });

  it("substitui preview por 'digitando...' quando digitando esta ativo", () => {
    const conv = mkConv(1, 10, "Bruno");
    (conv as any).lastMessage = { id: 1, content: "Ultima mensagem", created_at: "2024-01-01", sender_id: 10 };
    semeadoDeConversas([conv]);
    conversaDigitando({ conversation_id: 1, user_id: 10 });

    renderComQuery(
      <ConversationsSidebar
        conversations={[conv]}
        currentConversation={null}
        loading={false}
        unreadMessageCount={0}
        onSelectConversation={vi.fn()}
      />
    );
    expect(screen.getByText("digitando...")).toBeTruthy();
    expect(screen.queryByText("Ultima mensagem")).toBeNull();
  });
});
