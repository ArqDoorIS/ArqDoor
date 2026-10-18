import { describe, expect, it } from "vitest";
import { chavesDoAviso, intervaloDePolling, COBERTAS_PELO_TEMPO_REAL } from "@/lib/tempo-real";

// Tempo real no site (spec 2026-10-tempo-real). As chaves são prefixos das consultas de
// `use-messaging.tsx`: ["conversations", userId] e ["messages", conversaId, userId].

describe("chavesDoAviso", () => {
  it("mensagem nova atualiza a conversa e a lista", () => {
    expect(chavesDoAviso("mensagem:nova", { conversation_id: 95 })).toEqual([["messages", 95], ["conversations"]]);
  });

  it("conversa com id inválido atualiza só a lista", () => {
    expect(chavesDoAviso("mensagem:nova", { conversation_id: "abc" })).toEqual([["conversations"]]);
  });

  it("conversa nova e lida atualizam a lista; notificação, as notificações", () => {
    expect(chavesDoAviso("conversa:nova", { conversation_id: 1 })).toEqual([["conversations"]]);
    expect(chavesDoAviso("conversa:lida", { conversation_id: 1 })).toEqual([["conversations"]]);
    expect(chavesDoAviso("notificacao:nova", {})).toEqual([["notifications"]]);
  });

  it("evento desconhecido não atualiza nada", () => {
    expect(chavesDoAviso("outro", {})).toEqual([]);
  });

  it("reconexão cobre conversas, mensagens e notificações", () => {
    expect(COBERTAS_PELO_TEMPO_REAL).toEqual([["conversations"], ["messages"], ["notifications"]]);
  });
});

describe("intervaloDePolling", () => {
  it("cai para 60 s só com o tempo real de pé", () => {
    expect(intervaloDePolling(true, 3_000)).toBe(60_000);
    expect(intervaloDePolling(false, 5_000)).toBe(5_000);
  });
});
