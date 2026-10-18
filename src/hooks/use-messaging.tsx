import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { intervaloDePolling, useTempoRealConectado } from "@/lib/tempo-real";
import {
  Conversation,
  Message,
  CreateMessageRequest,
  CreateConversationRequest,
} from "@/lib/Interfaces";
import { useContract } from "./use-contract";
import {
  clearConversationStartIntent,
  getLastMessagePartnerId,
  hasConversationStartIntent,
  setConversationStartIntent,
  setLastMessagePartnerId,
} from "@/lib/utils";

export function useMessaging(initialPartnerId?: string | null) {
  const { user, isLoggedIn, isInitialized } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isVisible, setIsVisible] = useState<boolean>(!document.hidden);
  const tempoReal = useTempoRealConectado();

  useEffect(() => {
    const onVisibility = () => setIsVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isInitializing, setIsInitializing] = useState(false);

  const {
    data: conversationsData,
    isLoading: loadingConversations,
    error: conversationsError,
    refetch: refetchConversations,
  } = useQuery({
    queryKey: ["conversations", user?.id],
    enabled: isInitialized && isLoggedIn && !!user?.id,
    staleTime: 5_000,
    // Com o tempo real de pé a mensagem nova chega como aviso; o polling vira conferência.
    refetchInterval: intervaloDePolling(tempoReal, isVisible ? 5_000 : 30_000),
    queryFn: async () => {
      const response = await apiRequest("GET", "/conversation");
      if (!response.ok) throw new Error("Erro ao buscar conversas");
      const data = await response.json();
      return data;
    },
  });

  const userIds = useMemo(() => {
    if (!conversationsData?.conversations || !user) return [];
    return conversationsData.conversations
      .filter((conv: any) => !conv.other_user && !conv.otherUser)
      .map((conv: any) =>
        conv.user1_id === user.id ? conv.user2_id : conv.user1_id
      );
  }, [conversationsData, user]);

  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: ["users", userIds],
    enabled: isInitialized && userIds.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (userIds.length === 0) return {};
      const userPromises = userIds.map(async (userId: number) => {
        try {
          const response = await apiRequest("GET", `/users/${userId}`);
          if (!response.ok) return { id: userId, data: null };
          const data = await response.json();
          return { id: userId, data: data.user };
        } catch {
          return { id: userId, data: null };
        }
      });
      const results = await Promise.all(userPromises);
      const usersMap: Record<number, any> = {};
      results.forEach(({ id, data }) => {
        usersMap[id] =
          data || ({
            id,
            name: "Usuário",
            email: "",
            type: "contratante" as const,
          } as any);
      });
      return usersMap;
    },
  });

  const conversations: Conversation[] = useMemo(() => {
    if (!conversationsData?.conversations || !user) return [];
    return conversationsData.conversations
      .map((conv: any) => {
        const otherUserId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;
        const otherUser = conv.other_user || conv.otherUser || usersData?.[otherUserId];
        const processed: Conversation = {
          id: conv.conversation_id,
          user1_id: conv.user1_id,
          user2_id: conv.user2_id,
          isNegotiation: Boolean(conv.is_negotiation ?? conv.isNegotiation),
          created_at: conv.createdAt,
          updated_at: conv.updatedAt,
          otherUser:
            otherUser ||
            ({
              id: otherUserId,
              name: "Contato",
              email: "",
              type: "contratante" as const,
            } as any),
          unreadCount: conv.unread_count || conv.unreadCount || 0,
        };
        if (!processed.id || typeof processed.id !== "number") return null;
        return processed;
      })
      .filter(Boolean) as Conversation[];
  }, [conversationsData, user, usersData]);

  const {
    data: messages = [],
    isLoading: loadingMessages,
    error: messagesError,
  } = useQuery<Message[]>({
    queryKey: ["messages", currentConversation?.id, user?.id],
    enabled: isInitialized && !!currentConversation?.id && isLoggedIn,
    staleTime: 1_000,
    refetchInterval: intervaloDePolling(tempoReal, isVisible ? 3_000 : 30_000),
    queryFn: async () => {
      if (!currentConversation?.id) return [];
      const response = await apiRequest("GET", `/message/conversation/${currentConversation.id}`);
      if (!response.ok) throw new Error(`Erro ao buscar mensagens: ${response.status}`);
      const data = await response.json();
      const processed = (data.messages || []).map((msg: any) => {
        if (msg.content?.includes("📋") && msg.content?.includes("**") && msg.content?.includes("Total:")) {
          return { ...msg, type: "proposal" };
        }
        return { ...msg, type: "text" };
      });
      return processed;
    },
  });

  /**
   * Ler a conversa apaga o "nova mensagem" NA HORA.
   *
   * O servidor ja marcava lida: `GET /message/conversation/:id` faz isso como efeito
   * colateral. Faltava o cliente saber. A lista de conversas — que alimenta o badge de
   * nao lidas — so era invalidada ao ENVIAR mensagem, nunca ao ler, entao o contador
   * ficava aceso ate o proprio ciclo dela (15s). Quem abria e voltava rapido via o badge
   * de uma conversa que acabou de ler.
   *
   * Depende do numero de mensagens, e nao so do id: mensagem que chega com a conversa
   * ABERTA tambem nasce lida, e sem isso o badge subiria para algo que esta na tela.
   */
  useEffect(() => {
    if (!currentConversation?.id || loadingMessages) return;
    queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] });
  }, [currentConversation?.id, messages.length, loadingMessages, queryClient, user?.id]);

  const sendMessageMutation = useMutation({
    mutationFn: async (data: CreateMessageRequest) => {
      const response = await apiRequest("POST", "/message", {
        conversation_id: data.conversation_id,
        content: data.content.trim(),
        type: data.type || "text",
        proposal_data: data.proposal_data,
      });
      if (!response.ok) throw new Error(`Erro ao enviar mensagem: ${response.status}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", currentConversation?.id, user?.id] });
      queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] });
      setNewMessage("");
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível enviar a mensagem. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const sendMessage = useCallback(async () => {
    if (!currentConversation || !newMessage.trim()) return;
    await sendMessageMutation.mutateAsync({
      conversation_id: currentConversation.id,
      content: newMessage.trim(),
      type: "text",
    });
  }, [currentConversation, newMessage, sendMessageMutation]);

  const selectConversation = useCallback((conversation: Conversation) => {
    if (!conversation || !conversation.id || typeof conversation.id !== "number") return;
    setCurrentConversation(conversation);
    setLastMessagePartnerId(conversation.otherUser?.id);
  }, []);

  const createConversationMutation = useMutation({
    mutationFn: async (data: CreateConversationRequest) => {
      const response = await apiRequest("POST", "/conversation", data);
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body?.success === false) {
        throw new Error(body?.message || `Erro ao criar conversa: ${response.status}`);
      }
      return body;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setTimeout(async () => {
        await refetchConversations();
      }, 500);
    },
  });

  const startConversation = useCallback(
    async (targetUserId: number) => {
      if (!isInitialized) return false;
      if (!user || !isLoggedIn) {
        toast({
          title: "Login necessário",
          description: "Você precisa estar logado para iniciar uma conversa.",
          variant: "destructive",
        });
        return false;
      }
      if (isInitializing) return false;

      try {
        setIsInitializing(true);
        const existing = conversations.find((c) => c.otherUser.id === targetUserId);
        if (existing) {
          setCurrentConversation(existing);
          setLastMessagePartnerId(existing.otherUser?.id);
          clearConversationStartIntent();
          return true;
        }
        await createConversationMutation.mutateAsync({
          user1_id: user.id,
          user2_id: targetUserId,
        });
        clearConversationStartIntent();
        return true;
      } catch (err: any) {
        console.error("❌ Erro ao iniciar conversa:", err);
        clearConversationStartIntent();
        toast({
          title: "Conversa indisponível",
          description:
            err?.message ||
            "Não foi possível iniciar essa conversa na plataforma.",
          variant: "destructive",
        });
        return false;
      } finally {
        setIsInitializing(false);
      }
    },
    [isInitialized, user, isLoggedIn, isInitializing, conversations, createConversationMutation, toast]
  );

  const startConversationAndNavigate = useCallback(
    async (targetUserId: number, setLocation: (path: string) => void) => {
      setConversationStartIntent(targetUserId);
      const ok = await startConversation(targetUserId);
      if (ok) setLocation(`/messages/${targetUserId}`);
    },
    [startConversation]
  );

  useEffect(() => {
    if (!isInitialized || loadingConversations || loadingUsers || isInitializing) return;

    if (initialPartnerId) {
      const targetId = parseInt(initialPartnerId);
      if (Number.isNaN(targetId)) return;
      const found = conversations.find((c) => c.otherUser.id === targetId);
      if (found) {
        setCurrentConversation(found);
        setLastMessagePartnerId(found.otherUser?.id);
        clearConversationStartIntent();
      } else if (!isInitializing && hasConversationStartIntent(targetId)) {
        startConversation(targetId);
      } else {
        setCurrentConversation(null);
        setLastMessagePartnerId(null);
        clearConversationStartIntent();
      }
    } else if (!currentConversation && conversations.length > 0) {
      const storedPartnerId = getLastMessagePartnerId();
      const storedConversation =
        typeof storedPartnerId === "number"
          ? conversations.find((conversation) => conversation.otherUser.id === storedPartnerId)
          : null;
      const mostRecent = conversations
        .slice()
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];
      const conversationToRestore = storedConversation || mostRecent;
      if (conversationToRestore) {
        setCurrentConversation(conversationToRestore);
        setLastMessagePartnerId(conversationToRestore.otherUser?.id);
      }
    }
  }, [
    isInitialized,
    initialPartnerId,
    conversations,
    currentConversation,
    loadingConversations,
    loadingUsers,
    isInitializing,
    startConversation,
  ]);

  useEffect(() => {
    if (
      isInitialized &&
      initialPartnerId &&
      !loadingConversations &&
      !loadingUsers &&
      conversations.length > 0
    ) {
      const targetId = parseInt(initialPartnerId);
      if (Number.isNaN(targetId)) return;
      const nextConv = conversations.find((c) => c.otherUser.id === targetId);
      if (nextConv && (!currentConversation || currentConversation.id !== nextConv.id)) {
        setCurrentConversation(nextConv);
        setLastMessagePartnerId(nextConv.otherUser?.id);
      }
    }
  }, [isInitialized, conversations, initialPartnerId, currentConversation, loadingConversations, loadingUsers]);

  const contract = useContract(currentConversation?.id);

  return {
    conversations,
    currentConversation,
    messages,
    newMessage,
    tickets: contract.tickets,
    unreadMessageCount: 0,
    loadingConversations,
    loadingMessages,
    loadingTickets: contract.loadingTickets,
    sendingMessage: (sendMessageMutation as any).isPending,
    setNewMessage,
    sendMessage,
    selectConversation,
    startConversation,
    startConversationAndNavigate,
    createProposal: contract.createProposal,
    getStepsForTicket: contract.getStepsForTicket,
    getActiveTicket: contract.getActiveTicket,
    updateTicketStatus: contract.updateTicketStatus,
    updateStep: contract.updateStep,
    markStepCompleted: contract.markStepCompleted,
    confirmStepCompletion: contract.confirmStepCompletion,
    conversationsError,
    messagesError,
  };
}

export default useMessaging;
