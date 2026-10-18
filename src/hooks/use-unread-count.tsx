import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { intervaloDePolling, useTempoRealConectado } from "@/lib/tempo-real";

export function useUnreadCount() {
  const { isLoggedIn, user } = useAuth();
  const tempoReal = useTempoRealConectado();

  const { data } = useQuery({
    queryKey: ["conversations", user?.id],
    enabled: isLoggedIn && !!user,
    staleTime: 5_000,
    refetchInterval: intervaloDePolling(tempoReal, 15_000),
    queryFn: async () => {
      const response = await apiRequest("GET", "/conversation");
      if (!response.ok) return { conversations: [] };
      return response.json();
    },
  });

  const totalUnread = (data?.conversations || []).reduce((acc: number, conv: any) => {
    // Handle potential casing from backend
    const count = conv.unread_count || conv.unreadCount || 0;
    return acc + Number(count);
  }, 0);

  return totalUnread;
}
