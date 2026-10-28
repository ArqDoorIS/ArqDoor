import { useSyncExternalStore } from "react";
import { io, type Socket } from "socket.io-client";
import { API_BASE_URL } from "@/lib/queryClient";

/**
 * Conexao em tempo real com a API (spec specs/features/2026-10-tempo-real, fase do chat).
 * Estendido em 2026-10-presenca-no-chat: suporte a presenca, digitando e visibilidade de aba.
 *
 * O servidor avisa o que mudou (mensagem nova, conversa nova, lida, notificacao, presenca,
 * digitando) e o site busca de novo so aquela consulta. Autentica pelo cookie de sessao
 * (`withCredentials`).
 */
export type ChaveDeConsulta = readonly unknown[];

export const EVENTOS_DO_CHAT = ["mensagem:nova", "conversa:nova", "conversa:lida", "notificacao:nova"] as const;
export const EVENTOS_DE_PRESENCA = ["presenca:mudou", "conversa:digitando", "conversa:parou"] as const;

/** Consultas que voltam a buscar a cada (re)conexao: aviso pode ter se perdido no caminho. */
export const COBERTAS_PELO_TEMPO_REAL: ChaveDeConsulta[] = [["conversations"], ["messages"], ["notifications"]];

const idValido = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

/** Chaves do site: `["conversations", userId]` e `["messages", conversaId, userId]`. */
export function chavesDoAviso(evento: string, dados: unknown): ChaveDeConsulta[] {
  const conversa = idValido((dados as any)?.conversation_id);
  switch (evento) {
    case "mensagem:nova":
      return conversa ? [["messages", conversa], ["conversations"]] : [["conversations"]];
    case "conversa:nova":
    case "conversa:lida":
      return [["conversations"]];
    case "notificacao:nova":
      return [["notifications"]];
    default:
      return [];
  }
}

/** Polling lento com o tempo real de pe; o de sempre sem ele. */
export function intervaloDePolling(conectado: boolean, semTempoReal: number): number {
  return conectado ? Math.max(60_000, semTempoReal) : semTempoReal;
}

let socket: Socket | null = null;
let conectado = false;
const ouvintes = new Set<() => void>();

function marcarConexao(agora: boolean) {
  if (conectado === agora) return;
  conectado = agora;
  ouvintes.forEach((avisar) => avisar());
}

type AvisoHandler = (evento: string, dados: unknown) => void;

export function conectarTempoReal(aoAvisar: AvisoHandler, aoConectar: () => void) {
  desconectarTempoReal();
  const visivel = !document.hidden;
  const novo = io(API_BASE_URL, {
    path: "/socket.io",
    withCredentials: true,
    timeout: 20_000,
    reconnectionDelayMax: 30_000,
    // Informa ao servidor se a aba ja abre escondida (spec: auth.visivel)
    auth: { visivel },
  });
  novo.on("connect", () => {
    marcarConexao(true);
    aoConectar();
  });
  novo.on("disconnect", () => marcarConexao(false));
  novo.on("connect_error", () => marcarConexao(false));
  for (const evento of EVENTOS_DO_CHAT) {
    novo.on(evento, (dados: unknown) => aoAvisar(evento, dados));
  }
  for (const evento of EVENTOS_DE_PRESENCA) {
    novo.on(evento, (dados: unknown) => aoAvisar(evento, dados));
  }
  socket = novo;
}

export function desconectarTempoReal() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  marcarConexao(false);
}

/** Emite `conversa:digitando` se o socket estiver conectado. */
export function emitirDigitando(conversationId: number) {
  if (socket?.connected) {
    socket.emit("conversa:digitando", { conversation_id: conversationId });
  }
}

/** Emite `conversa:parou` se o socket estiver conectado. */
export function emitirParou(conversationId: number) {
  if (socket?.connected) {
    socket.emit("conversa:parou", { conversation_id: conversationId });
  }
}

/** Emite `presenca:visivel` (site apenas: aba ficou escondida/voltou). */
export function emitirVisivel(visivel: boolean) {
  if (socket?.connected) {
    socket.emit("presenca:visivel", { visivel });
  }
}

export function useTempoRealConectado(): boolean {
  return useSyncExternalStore(
    (avisar) => {
      ouvintes.add(avisar);
      return () => ouvintes.delete(avisar);
    },
    () => conectado,
    () => false,
  );
}
