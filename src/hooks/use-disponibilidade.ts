import { useCallback, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

/**
 * Gerencia a disponibilidade para trabalho do usuario logado (is_active).
 *
 * Faz update otimista: atualiza localmente antes da resposta do servidor.
 * Faz rollback com toast se o servidor retornar erro.
 *
 * Spec: 2026-10-presenca-no-chat (CA-01).
 */
export function useDisponibilidade() {
  const { user, updateUserLocal } = useAuth();
  const { toast } = useToast();
  const [salvando, setSalvando] = useState(false);

  const disponivel = user?.is_active !== false; // undefined = disponivel (padrao DB)

  const toggleDisponibilidade = useCallback(async () => {
    if (!user?.id) return;
    const novoValor = !disponivel;

    // Atualiza localmente antes de confirmar no servidor
    updateUserLocal({ is_active: novoValor });
    setSalvando(true);

    try {
      const res = await apiRequest("PUT", `/users/${user.id}`, {
        is_active: novoValor,
      });
      if (!res.ok) {
        throw new Error("Falha ao salvar disponibilidade");
      }
    } catch {
      // Rollback
      updateUserLocal({ is_active: disponivel });
      toast({
        title: "Erro",
        description: "Não foi possível salvar sua disponibilidade. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSalvando(false);
    }
  }, [user?.id, disponivel, updateUserLocal, toast]);

  return { disponivel, toggleDisponibilidade, salvando };
}
