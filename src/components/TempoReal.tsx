import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
  COBERTAS_PELO_TEMPO_REAL,
  chavesDoAviso,
  conectarTempoReal,
  desconectarTempoReal,
} from "@/lib/tempo-real";

/** Liga o tempo real enquanto há sessão. A reconexão do Socket.IO cuida de queda de rede. */
export function TempoReal() {
  const { isLoggedIn, user } = useAuth();
  const queryClient = useQueryClient();
  const userId = isLoggedIn ? user?.id : undefined;

  useEffect(() => {
    if (userId == null) {
      desconectarTempoReal();
      return;
    }
    conectarTempoReal(
      (evento, dados) => {
        for (const chave of chavesDoAviso(evento, dados)) void queryClient.invalidateQueries({ queryKey: chave });
      },
      () => {
        for (const chave of COBERTAS_PELO_TEMPO_REAL) void queryClient.invalidateQueries({ queryKey: chave });
      },
    );
    return () => desconectarTempoReal();
  }, [userId, queryClient]);

  return null;
}
