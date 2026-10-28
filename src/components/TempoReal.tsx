import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
  COBERTAS_PELO_TEMPO_REAL,
  chavesDoAviso,
  conectarTempoReal,
  desconectarTempoReal,
  emitirVisivel,
} from "@/lib/tempo-real";
import {
  presencaMudou,
  conversaDigitando,
  conversaParou,
} from "@/lib/presenca";

/**
 * Liga o tempo real enquanto ha sessao.
 * A reconexao do Socket.IO cuida de queda de rede.
 *
 * Estendido em 2026-10-presenca-no-chat:
 *   - Conecta com `auth.visivel` baseado em `document.hidden`.
 *   - Depois de 2 min com a aba escondida, emite `presenca:visivel { visivel: false }`.
 *   - Quando a aba volta, emite `presenca:visivel { visivel: true }`.
 *   - Encaminha eventos de presenca e digitando para o store `src/lib/presenca.ts`.
 */
const OCULTO_TIMEOUT_MS = 2 * 60 * 1_000; // 2 minutos

export function TempoReal() {
  const { isLoggedIn, user } = useAuth();
  const queryClient = useQueryClient();
  const userId = isLoggedIn ? user?.id : undefined;
  const timerOcultoRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (userId == null) {
      desconectarTempoReal();
      return;
    }

    conectarTempoReal(
      (evento, dados) => {
        // Encaminha invalidacoes de cache para React Query
        for (const chave of chavesDoAviso(evento, dados)) {
          void queryClient.invalidateQueries({ queryKey: chave });
        }
        // Encaminha eventos de presenca para o store
        if (evento === "presenca:mudou") {
          const p = dados as { user_id: number; online: boolean; disponivel: boolean };
          presencaMudou(p);
        } else if (evento === "conversa:digitando") {
          const p = dados as { conversation_id: number; user_id: number };
          conversaDigitando(p);
        } else if (evento === "conversa:parou") {
          const p = dados as { conversation_id: number };
          conversaParou(p.conversation_id);
        } else if (evento === "mensagem:nova") {
          // Mensagem nova cancela "digitando" para aquela conversa
          const p = dados as { conversation_id?: number };
          if (p.conversation_id) conversaParou(p.conversation_id);
        }
      },
      () => {
        for (const chave of COBERTAS_PELO_TEMPO_REAL) {
          void queryClient.invalidateQueries({ queryKey: chave });
        }
      },
    );

    // Visibilidade da aba: 2 min oculta -> nao online; volta -> online de novo
    function handleVisibility() {
      if (document.hidden) {
        timerOcultoRef.current = setTimeout(() => {
          emitirVisivel(false);
        }, OCULTO_TIMEOUT_MS);
      } else {
        if (timerOcultoRef.current) {
          clearTimeout(timerOcultoRef.current);
          timerOcultoRef.current = null;
        }
        emitirVisivel(true);
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      desconectarTempoReal();
      document.removeEventListener("visibilitychange", handleVisibility);
      if (timerOcultoRef.current) {
        clearTimeout(timerOcultoRef.current);
        timerOcultoRef.current = null;
      }
    };
  }, [userId, queryClient]);

  return null;
}
