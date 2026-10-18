import { useSyncExternalStore } from "react";
import { io, type Socket } from "socket.io-client";
import { API_BASE_URL } from "@/lib/queryClient";

/**
 * Conexão em tempo real com a API (spec specs/features/2026-10-tempo-real, fase do chat).
 *
 * O servidor avisa o que mudou (mensagem nova, conversa nova, lida, notificação) e o site
 * busca de novo só aquela consulta. O aviso não traz conteúdo: a busca passa pela API de
 * sempre, que confere permissão. Autentica pelo cookie de sessão (`withCredentials`).
 */
export type ChaveDeConsulta = readonly unknown[];

export const EVENTOS_DO_CHAT = ["mensagem:nova", "conversa:nova", "conversa:lida", "notificacao:nova"] as const;

/** Consultas que voltam a buscar a cada (re)conexão: aviso pode ter se perdido no caminho. */
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

/** Polling lento com o tempo real de pé; o de sempre sem ele. */
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

export function conectarTempoReal(aoAvisar: (evento: string, dados: unknown) => void, aoConectar: () => void) {
  desconectarTempoReal();
  const novo = io(API_BASE_URL, {
    path: "/socket.io",
    withCredentials: true,
    timeout: 20_000,
    reconnectionDelayMax: 30_000,
  });
  novo.on("connect", () => {
    marcarConexao(true);
    aoConectar();
  });
  novo.on("disconnect", () => marcarConexao(false));
  novo.on("connect_error", () => marcarConexao(false));
  for (const evento of EVENTOS_DO_CHAT) novo.on(evento, (dados: unknown) => aoAvisar(evento, dados));
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
