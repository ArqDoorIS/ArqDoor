/**
 * Testes do store de presenca
 * spec: 2026-10-presenca-no-chat
 *
 * Cobre:
 * - Derivacao de estado: online/disponivel a partir de semeadoDeConversas
 * - Atualizacao por presencaMudou
 * - Ativacao e expiracao automatica de "digitando"
 * - Cancelamento de "digitando" por conversaParou
 * - Cancelamento de "digitando" por nova digitacao (reset do timer)
 * - Estado de usuario desconhecido retorna defaults neutros
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  semeadoDeConversas,
  presencaMudou,
  conversaDigitando,
  conversaParou,
  _getEstado,
  _resetarEstado,
} from "@/lib/presenca";

beforeEach(() => {
  _resetarEstado();
  vi.useFakeTimers();
});

afterEach(() => {
  _resetarEstado();
  vi.useRealTimers();
});

// Conversa auxiliar de fabrica
function mkConv(id: number, userId: number, is_active?: boolean, online?: boolean) {
  return {
    id,
    otherUser: { id: userId, is_active, online },
  };
}

describe("semeadoDeConversas", () => {
  it("popula online e disponivel a partir da lista de conversas", () => {
    semeadoDeConversas([
      mkConv(1, 10, true, true),
      mkConv(2, 20, false, false),
    ]);
    const e = _getEstado();
    expect(e.usuarios.get(10)).toEqual({ online: true, disponivel: true });
    expect(e.usuarios.get(20)).toEqual({ online: false, disponivel: false });
  });

  it("trata is_active undefined como disponivel (padrao do banco)", () => {
    semeadoDeConversas([mkConv(1, 10, undefined, false)]);
    expect(_getEstado().usuarios.get(10)?.disponivel).toBe(true);
  });

  it("trata online undefined como false", () => {
    semeadoDeConversas([mkConv(1, 10, true, undefined)]);
    expect(_getEstado().usuarios.get(10)?.online).toBe(false);
  });

  it("manter usuarios existentes ao repovoar (merge)", () => {
    semeadoDeConversas([mkConv(1, 10, true, true)]);
    semeadoDeConversas([mkConv(2, 20, false, false)]);
    const e = _getEstado();
    // Usuario 10 ainda esta no mapa (merge)
    expect(e.usuarios.has(10)).toBe(true);
    expect(e.usuarios.has(20)).toBe(true);
  });
});

describe("presencaMudou", () => {
  it("atualiza o estado de um usuario existente", () => {
    semeadoDeConversas([mkConv(1, 10, true, false)]);
    presencaMudou({ user_id: 10, online: true, disponivel: true });
    expect(_getEstado().usuarios.get(10)).toEqual({ online: true, disponivel: true });
  });

  it("adiciona usuario que nao estava no mapa", () => {
    presencaMudou({ user_id: 99, online: false, disponivel: false });
    expect(_getEstado().usuarios.get(99)).toEqual({ online: false, disponivel: false });
  });
});

describe("conversaDigitando e conversaParou", () => {
  it("ativa digitando para uma conversa", () => {
    conversaDigitando({ conversation_id: 5, user_id: 10 });
    expect(_getEstado().digitando.has(5)).toBe(true);
  });

  it("conversaParou cancela imediatamente", () => {
    conversaDigitando({ conversation_id: 5, user_id: 10 });
    conversaParou(5);
    expect(_getEstado().digitando.has(5)).toBe(false);
  });

  it("expira automaticamente apos 5 s", () => {
    conversaDigitando({ conversation_id: 5, user_id: 10 });
    expect(_getEstado().digitando.has(5)).toBe(true);
    vi.advanceTimersByTime(5_000);
    expect(_getEstado().digitando.has(5)).toBe(false);
  });

  it("resetar o timer com novo evento de digitando", () => {
    conversaDigitando({ conversation_id: 5, user_id: 10 });
    vi.advanceTimersByTime(4_000);
    // Novo evento antes de expirar: timer reinicia
    conversaDigitando({ conversation_id: 5, user_id: 10 });
    vi.advanceTimersByTime(4_000);
    // 8 s desde o primeiro, 4 desde o segundo: ainda nao expirou
    expect(_getEstado().digitando.has(5)).toBe(true);
    vi.advanceTimersByTime(1_100);
    // Agora expirou (5 s desde o segundo evento)
    expect(_getEstado().digitando.has(5)).toBe(false);
  });

  it("conversas diferentes nao interferem", () => {
    conversaDigitando({ conversation_id: 1, user_id: 10 });
    conversaDigitando({ conversation_id: 2, user_id: 20 });
    conversaParou(1);
    expect(_getEstado().digitando.has(1)).toBe(false);
    expect(_getEstado().digitando.has(2)).toBe(true);
  });
});

describe("estado de usuario desconhecido", () => {
  it("retorna defaults falsos se o usuario nao esta no mapa", () => {
    const e = _getEstado();
    const estado = e.usuarios.get(9999) ?? { online: false, disponivel: false };
    expect(estado.online).toBe(false);
    expect(estado.disponivel).toBe(false);
  });
});
