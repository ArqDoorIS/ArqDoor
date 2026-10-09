import { useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE_URL, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  CLIENT_MESSAGE_PAGE_SIZE,
  CLIENT_PAGE_SIZE,
  EMPTY_FILTERS,
  INITIAL_PAGES,
  PAGE_SIZE_BY_TAB,
} from "../constants";
import type {
  AdminDirectConversation,
  AdminTab,
  AdminUserProfile,
  AdminUserProfileUpdate,
  AdminUserOperationsOverview,
  ConversationViewer,
  DashboardData,
  DashboardSection,
  FilterState,
  UserDetailTab,
} from "../types";
import { paginateClientSide, sortByNewest } from "../utils";

type UseAdminDashboardParams = {
  isAuthenticated: boolean;
  onUnauthorized: (message?: string) => void;
};

export function useAdminDashboard({
  isAuthenticated,
  onUnauthorized,
}: UseAdminDashboardParams) {
  const { toast } = useToast();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [draftFilters, setDraftFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [pageByTab, setPageByTab] = useState<Record<AdminTab, number>>(INITIAL_PAGES);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userDetailTab, setUserDetailTab] = useState<UserDetailTab>("perfil");
  const [userProfile, setUserProfile] = useState<AdminUserProfile | null>(null);
  const [loadingUserProfile, setLoadingUserProfile] = useState(false);
  const [userProfileError, setUserProfileError] = useState<string | null>(null);
  const [savingUserProfile, setSavingUserProfile] = useState(false);
  const [saveUserProfileError, setSaveUserProfileError] = useState<string | null>(null);
  const [operationsOverview, setOperationsOverview] =
    useState<AdminUserOperationsOverview | null>(null);
  const [loadingOperationsOverview, setLoadingOperationsOverview] = useState(false);
  const [operationsOverviewError, setOperationsOverviewError] = useState<string | null>(null);
  const [selectedOperationsConversationId, setSelectedOperationsConversationId] =
    useState<number | null>(null);
  const [selectedOperationsTicketId, setSelectedOperationsTicketId] = useState<number | null>(
    null
  );
  const [directConversation, setDirectConversation] = useState<AdminDirectConversation | null>(
    null
  );
  const [loadingDirectConversation, setLoadingDirectConversation] = useState(false);
  const [directConversationError, setDirectConversationError] = useState<string | null>(null);
  const [messageDraft, setMessageDraft] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [adminMessageError, setAdminMessageError] = useState<string | null>(null);

  const [payingTransferTicketId, setPayingTransferTicketId] = useState<number | null>(null);
  const [payTransferError, setPayTransferError] = useState<string | null>(null);
  const [verifyingUserId, setVerifyingUserId] = useState<number | null>(null);
  const [verifyUserError, setVerifyUserError] = useState<string | null>(null);

  const [updatingStepId, setUpdatingStepId] = useState<number | null>(null);
  const [updateStepError, setUpdateStepError] = useState<string | null>(null);

  const [suspendingUserId, setSuspendingUserId] = useState<number | null>(null);
  const [suspendUserError, setSuspendUserError] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  const [deleteUserError, setDeleteUserError] = useState<string | null>(null);

  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [conversationViewer, setConversationViewer] = useState<ConversationViewer | null>(null);
  const [loadingConversationViewer, setLoadingConversationViewer] = useState(false);
  const [conversationViewerError, setConversationViewerError] = useState<string | null>(null);
  const [userConversationsPage, setUserConversationsPage] = useState(1);
  const [userContractsPage, setUserContractsPage] = useState(1);
  const [userStepsPage, setUserStepsPage] = useState(1);
  const [adminMessagesPage, setAdminMessagesPage] = useState(1);
  const [conversationMessagesPage, setConversationMessagesPage] = useState(1);

  useEffect(() => {
    if (isAuthenticated) return;

    setDashboard(null);
    setLoading(false);
    setError(null);
    setActiveTab("dashboard");
    setDraftFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setPageByTab(INITIAL_PAGES);
    setRefreshKey(0);
    setShowFilters(false);

    setSelectedUserId(null);
    setUserDetailTab("perfil");
    setUserProfile(null);
    setLoadingUserProfile(false);
    setUserProfileError(null);
    setSavingUserProfile(false);
    setSaveUserProfileError(null);
    setOperationsOverview(null);
    setLoadingOperationsOverview(false);
    setOperationsOverviewError(null);
    setSelectedOperationsConversationId(null);
    setSelectedOperationsTicketId(null);
    setDirectConversation(null);
    setLoadingDirectConversation(false);
    setDirectConversationError(null);
    setMessageDraft("");
    setSendingMessage(false);
    setAdminMessageError(null);

    setSelectedConversationId(null);
    setConversationViewer(null);
    setLoadingConversationViewer(false);
    setConversationViewerError(null);
    setUserConversationsPage(1);
    setUserContractsPage(1);
    setUserStepsPage(1);
    setAdminMessagesPage(1);
    setConversationMessagesPage(1);
  }, [isAuthenticated]);

  const selectedUser = useMemo(
    () => dashboard?.users.find((user) => user.id === selectedUserId) || null,
    [dashboard?.users, selectedUserId]
  );

  const selectedConversationRow = useMemo(
    () =>
      dashboard?.conversations.find(
        (conversation) => conversation.conversation_id === selectedConversationId
      ) || null,
    [dashboard?.conversations, selectedConversationId]
  );

  const selectedOperationsConversation = useMemo(
    () =>
      operationsOverview?.conversations.find(
        (conversation) => conversation.conversation_id === selectedOperationsConversationId
      ) || null,
    [operationsOverview?.conversations, selectedOperationsConversationId]
  );

  const operationalContracts = useMemo(() => {
    const contracts =
      operationsOverview?.conversations.flatMap((conversation) =>
        conversation.contracts.map((ticket) => ({
          ...ticket,
          conversation_id: conversation.conversation_id,
        }))
      ) || [];

    return contracts.sort((left, right) => {
      const leftActive = left.status !== "cancelada" && left.status !== "concluída";
      const rightActive = right.status !== "cancelada" && right.status !== "concluída";

      if (leftActive !== rightActive) {
        return leftActive ? -1 : 1;
      }

      return sortByNewest(left.updated_at, right.updated_at);
    });
  }, [operationsOverview?.conversations]);

  const operationalSteps = useMemo(() => {
    const steps =
      operationalContracts.flatMap((ticket) =>
        ticket.steps.map((step) => ({
          ...step,
          ticket_id: ticket.id,
          ticket_status: ticket.status,
          provider_receiving_method: ticket.provider_receiving_method,
        }))
      ) || [];

    return steps
      .filter((step) => !step.signature)
      .sort((left, right) => sortByNewest(left.updated_at, right.updated_at));
  }, [operationalContracts]);

  const paginatedUserConversations = useMemo(
    () =>
      paginateClientSide(
        operationsOverview?.conversations || [],
        userConversationsPage,
        CLIENT_PAGE_SIZE
      ),
    [operationsOverview?.conversations, userConversationsPage]
  );

  const paginatedUserContracts = useMemo(
    () => paginateClientSide(operationalContracts, userContractsPage, CLIENT_PAGE_SIZE),
    [operationalContracts, userContractsPage]
  );

  const paginatedUserSteps = useMemo(
    () => paginateClientSide(operationalSteps, userStepsPage, CLIENT_PAGE_SIZE),
    [operationalSteps, userStepsPage]
  );

  const paginatedAdminMessages = useMemo(
    () =>
      paginateClientSide(
        directConversation?.messages || [],
        adminMessagesPage,
        CLIENT_MESSAGE_PAGE_SIZE
      ),
    [directConversation?.messages, adminMessagesPage]
  );

  const paginatedConversationMessages = useMemo(
    () =>
      paginateClientSide(
        conversationViewer?.messages || [],
        conversationMessagesPage,
        CLIENT_MESSAGE_PAGE_SIZE
      ),
    [conversationViewer?.messages, conversationMessagesPage]
  );

  const activePagination = useMemo(() => {
    if (!dashboard) return null;
    if (activeTab === "dashboard") return null;
    if (activeTab === "usuarios") return dashboard.meta.pagination.users;
    if (activeTab === "contratos") return dashboard.meta.pagination.tickets;
    if (activeTab === "pagamentos") return dashboard.meta.pagination.payments;
    if (activeTab === "transferencias") return dashboard.meta.pagination.transfers;
    if (activeTab === "documentos") return dashboard.meta.pagination.documents;
    if (activeTab === "conversas") return dashboard.meta.pagination.conversations;
    return null;
  }, [activeTab, dashboard]);

  const appliedFilterCount = useMemo(
    () => Object.values(appliedFilters).filter((value) => Boolean(value)).length,
    [appliedFilters]
  );

  const loadDirectConversation = useCallback(
    async (userId: number) => {
      if (!isAuthenticated) return;

      setDirectConversation(null);
      setDirectConversationError(null);
      setLoadingDirectConversation(true);

      try {
        const response = await apiRequest("GET", `/admin/messages/${userId}`);

        if (!response.ok) {
          if (response.status === 401) {
            onUnauthorized("Sessão administrativa expirada.");
            return;
          }
          throw new Error(await response.text());
        }

        const payload = (await response.json()) as { data: AdminDirectConversation };
        setDirectConversation(payload.data);
      } catch (loadError) {
        console.error(loadError);
        setDirectConversation(null);
        setDirectConversationError("Não foi possível carregar a conversa administrativa.");
      } finally {
        setLoadingDirectConversation(false);
      }
    },
    [isAuthenticated, onUnauthorized]
  );

  const loadUserOperations = useCallback(
    async (userId: number) => {
      if (!isAuthenticated) return;

      setOperationsOverview(null);
      setOperationsOverviewError(null);
      setLoadingOperationsOverview(true);

      try {
        const response = await apiRequest("GET", `/admin/users/${userId}/operations`);

        if (!response.ok) {
          if (response.status === 401) {
            onUnauthorized("Sessão administrativa expirada.");
            return;
          }
          throw new Error(await response.text());
        }

        const payload = (await response.json()) as { data: AdminUserOperationsOverview };
        setOperationsOverview(payload.data);
      } catch (loadError) {
        console.error(loadError);
        setOperationsOverview(null);
        setOperationsOverviewError(
          "Não foi possível carregar a visão operacional desse usuário."
        );
      } finally {
        setLoadingOperationsOverview(false);
      }
    },
    [isAuthenticated, onUnauthorized]
  );

  const loadUserProfile = useCallback(
    async (userId: number) => {
      if (!isAuthenticated) return;

      setUserProfile(null);
      setUserProfileError(null);
      setLoadingUserProfile(true);
      try {
        const response = await apiRequest("GET", `/admin/users/${userId}/profile`);
        if (!response.ok) {
          if (response.status === 401) {
            onUnauthorized("Sessão administrativa expirada.");
            return;
          }
          const body = await response.json().catch(() => ({}));
          throw new Error((body as { message?: string }).message || "Erro ao carregar cadastro.");
        }
        const payload = (await response.json()) as { data: AdminUserProfile };
        setUserProfile(payload.data);
      } catch (loadError) {
        console.error(loadError);
        setUserProfile(null);
        setUserProfileError("Não foi possível carregar o cadastro deste usuário.");
      } finally {
        setLoadingUserProfile(false);
      }
    },
    [isAuthenticated, onUnauthorized]
  );

  const selectUser = useCallback(
    async (userId: number) => {
      setSelectedUserId(userId);
      setUserDetailTab("perfil");
      setUserConversationsPage(1);
      setUserContractsPage(1);
      setUserStepsPage(1);
      setAdminMessagesPage(1);
      setSelectedOperationsConversationId(null);
      setSelectedOperationsTicketId(null);
      setDirectConversationError(null);
      setOperationsOverviewError(null);
      setAdminMessageError(null);
      setSaveUserProfileError(null);

      await Promise.allSettled([
        loadDirectConversation(userId),
        loadUserOperations(userId),
        loadUserProfile(userId),
      ]);
    },
    [loadDirectConversation, loadUserOperations, loadUserProfile]
  );

  const loadConversationViewer = useCallback(
    async (conversationId: number) => {
      if (!isAuthenticated) return;

      setSelectedConversationId(conversationId);
      setConversationViewer(null);
      setConversationViewerError(null);
      setLoadingConversationViewer(true);

      try {
        const response = await apiRequest("GET", `/admin/conversations/${conversationId}/messages`);

        if (!response.ok) {
          if (response.status === 401) {
            onUnauthorized("Sessão administrativa expirada.");
            return;
          }
          throw new Error(await response.text());
        }

        const payload = (await response.json()) as { data: ConversationViewer };
        setConversationViewer(payload.data);
      } catch (loadError) {
        console.error(loadError);
        setConversationViewer(null);
        setConversationViewerError("Não foi possível carregar essa conversa.");
      } finally {
        setLoadingConversationViewer(false);
      }
    },
    [isAuthenticated, onUnauthorized]
  );

  useEffect(() => {
    if (!isAuthenticated) return;

    const controller = new AbortController();
    /**
     * Abas que buscam os PROPRIOS dados nao tem secao correspondente no dashboard.
     * `verificacao` entra aqui junto de `indicacoes`: a fila de documentos vem de
     * `/admin/documents`, e pedir uma secao inexistente ao backend so renderia erro.
     * `equipe` pelo mesmo motivo: ela le `/admin/members`.
     */
    const requestedSection: DashboardSection =
      activeTab === "dashboard" ||
      activeTab === "indicacoes" ||
      activeTab === "verificacao" ||
      activeTab === "equipe"
        ? "all"
        : activeTab;
    const currentPage = pageByTab[activeTab];

    const fetchDashboard = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set("section", requestedSection);
        params.set("page", String(currentPage));
        params.set("pageSize", String(PAGE_SIZE_BY_TAB[activeTab]));

        Object.entries(appliedFilters).forEach(([key, value]) => {
          if (value) {
            params.set(key, value);
          }
        });

        const response = await fetch(`${API_BASE_URL}/admin/dashboard?${params.toString()}`, {
          credentials: "include",
          signal: controller.signal,
        });

        if (!response.ok) {
          if (response.status === 401) {
            onUnauthorized("Sessão administrativa expirada.");
            return;
          }
          throw new Error(await response.text());
        }

        const payload = (await response.json()) as { data: DashboardData };
        setDashboard(payload.data);
      } catch (fetchError) {
        if (controller.signal.aborted) return;
        console.error(fetchError);
        setDashboard(null);
        setError(fetchError instanceof Error ? fetchError.message : "Erro ao carregar o painel.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void fetchDashboard();

    return () => controller.abort();
  }, [activeTab, appliedFilters, isAuthenticated, onUnauthorized, pageByTab, refreshKey]);

  useEffect(() => {
    if (activeTab !== "usuarios" || !dashboard?.users.length) return;
    if (selectedUserId && dashboard.users.some((user) => user.id === selectedUserId)) return;
    void selectUser(dashboard.users[0].id);
  }, [activeTab, dashboard?.users, selectUser, selectedUserId]);

  useEffect(() => {
    if (activeTab !== "conversas" || !dashboard?.conversations.length) return;
    if (
      selectedConversationId &&
      dashboard.conversations.some(
        (conversation) => conversation.conversation_id === selectedConversationId
      )
    ) {
      return;
    }

    void loadConversationViewer(dashboard.conversations[0].conversation_id);
  }, [activeTab, dashboard?.conversations, loadConversationViewer, selectedConversationId]);

  useEffect(() => {
    setUserConversationsPage(1);
  }, [operationsOverview?.conversations]);

  useEffect(() => {
    setUserContractsPage(1);
  }, [operationalContracts.length]);

  useEffect(() => {
    setUserStepsPage(1);
  }, [operationalSteps.length]);

  useEffect(() => {
    setAdminMessagesPage(1);
  }, [directConversation?.messages?.length]);

  useEffect(() => {
    setConversationMessagesPage(1);
  }, [conversationViewer?.messages?.length, selectedConversationId]);

  useEffect(() => {
    if (!operationsOverview?.conversations.length) {
      setSelectedOperationsConversationId(null);
      setSelectedOperationsTicketId(null);
      return;
    }

    if (
      selectedOperationsConversationId &&
      operationsOverview.conversations.some(
        (conversation) => conversation.conversation_id === selectedOperationsConversationId
      )
    ) {
      return;
    }

    const firstConversation = operationsOverview.conversations[0];
    setSelectedOperationsConversationId(firstConversation.conversation_id);
    setSelectedOperationsTicketId(firstConversation.contracts[0]?.id ?? null);
  }, [operationsOverview?.conversations, selectedOperationsConversationId]);

  useEffect(() => {
    if (!selectedOperationsConversation) {
      setSelectedOperationsTicketId(null);
      return;
    }

    if (
      selectedOperationsTicketId &&
      selectedOperationsConversation.contracts.some(
        (ticket) => ticket.id === selectedOperationsTicketId
      )
    ) {
      return;
    }

    setSelectedOperationsTicketId(selectedOperationsConversation.contracts[0]?.id ?? null);
  }, [selectedOperationsConversation, selectedOperationsTicketId]);

  const refreshDashboard = useCallback(() => {
    setRefreshKey((value) => value + 1);
  }, []);

  const updateUserProfile = useCallback(
    async (data: AdminUserProfileUpdate) => {
      if (!isAuthenticated || !selectedUserId) return false;
      setSavingUserProfile(true);
      setSaveUserProfileError(null);
      try {
        const response = await apiRequest("PATCH", `/admin/users/${selectedUserId}/profile`, data);
        if (!response.ok) {
          if (response.status === 401) {
            onUnauthorized("Sessão administrativa expirada.");
            return false;
          }
          const body = await response.json().catch(() => ({}));
          throw new Error((body as { message?: string }).message || "Erro ao salvar cadastro.");
        }
        const payload = (await response.json()) as { data: AdminUserProfile; message?: string };
        setUserProfile(payload.data);
        refreshDashboard();
        toast({ title: "Cadastro atualizado", description: payload.message || "Alterações registradas." });
        return true;
      } catch (saveError) {
        console.error(saveError);
        const message = saveError instanceof Error ? saveError.message : "Erro ao salvar cadastro.";
        setSaveUserProfileError(message);
        toast({ title: "Não foi possível salvar", description: message, variant: "destructive" });
        return false;
      } finally {
        setSavingUserProfile(false);
      }
    },
    [isAuthenticated, onUnauthorized, refreshDashboard, selectedUserId, toast]
  );

  // Auto-refresh: pulse a cada 60s enquanto a aba estiver visível. Pausa
  // quando o painel está em background pra não consumir banda à toa, e
  // dispara um refresh imediato ao voltar pra aba. Usuário pode forçar
  // refresh manual pelo botão "Atualizar".
  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (intervalId) return;
      intervalId = setInterval(() => {
        if (document.visibilityState === "visible") refreshDashboard();
      }, 60_000);
    };
    const stop = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshDashboard();
        start();
      } else {
        stop();
      }
    };
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [isAuthenticated, refreshDashboard]);

  const applyFilters = useCallback(() => {
    setAppliedFilters(draftFilters);
    setPageByTab(INITIAL_PAGES);
    setShowFilters(false);
  }, [draftFilters]);

  const resetFilters = useCallback(() => {
    setDraftFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setPageByTab(INITIAL_PAGES);
  }, []);

  /** Remove um único filtro aplicado (usado pelos chips no header). */
  const clearAppliedFilter = useCallback(
    <K extends keyof FilterState>(key: K) => {
      setDraftFilters((prev) => ({ ...prev, [key]: EMPTY_FILTERS[key] }));
      setAppliedFilters((prev) => ({ ...prev, [key]: EMPTY_FILTERS[key] }));
      setPageByTab(INITIAL_PAGES);
    },
    []
  );

  const updateDraftFilter = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
      setDraftFilters((previous) => ({ ...previous, [key]: value }));
    },
    []
  );

  const goToPreviousPage = useCallback(() => {
    if (!activePagination) return;
    setPageByTab((previous) => ({
      ...previous,
      [activeTab]: Math.max(1, previous[activeTab] - 1),
    }));
  }, [activePagination, activeTab]);

  const goToNextPage = useCallback(() => {
    if (!activePagination) return;
    setPageByTab((previous) => ({
      ...previous,
      [activeTab]: Math.min(activePagination.total_pages, previous[activeTab] + 1),
    }));
  }, [activePagination, activeTab]);

  const sendAdminMessage = useCallback(async () => {
    if (!isAuthenticated || !selectedUserId || !messageDraft.trim()) return;

    setSendingMessage(true);
    setAdminMessageError(null);

    try {
      const response = await apiRequest("POST", "/admin/message", {
        userId: selectedUserId,
        content: messageDraft.trim(),
      });

      if (!response.ok) {
        if (response.status === 401) {
          onUnauthorized("Sessão administrativa expirada.");
          return;
        }
        throw new Error(await response.text());
      }

      setMessageDraft("");
      await loadDirectConversation(selectedUserId);
      refreshDashboard();
    } catch (sendError) {
      console.error(sendError);
      setAdminMessageError("Não foi possível enviar a mensagem administrativa.");
    } finally {
      setSendingMessage(false);
    }
  }, [
    isAuthenticated,
    loadDirectConversation,
    messageDraft,
    onUnauthorized,
    refreshDashboard,
    selectedUserId,
  ]);

  const payTransfer = useCallback(
    async (ticketId: number) => {
      if (!isAuthenticated) return;
      setPayingTransferTicketId(ticketId);
      setPayTransferError(null);
      try {
        const response = await apiRequest("POST", `/admin/transfers/${ticketId}/pay`);
        if (!response.ok) {
          if (response.status === 401) {
            onUnauthorized("Sessão administrativa expirada.");
            return;
          }
          const body = await response.json().catch(() => ({}));
          throw new Error((body as { message?: string }).message || "Erro ao registrar repasse.");
        }
        refreshDashboard();
      } catch (err) {
        console.error(err);
        setPayTransferError(err instanceof Error ? err.message : "Erro ao registrar repasse.");
      } finally {
        setPayingTransferTicketId(null);
      }
    },
    [isAuthenticated, onUnauthorized, refreshDashboard]
  );

  const updateStepStatus = useCallback(
    async (stepId: number, status: string, reason?: string) => {
      if (!isAuthenticated) return false;
      setUpdatingStepId(stepId);
      setUpdateStepError(null);
      try {
        const response = await apiRequest("POST", `/admin/steps/${stepId}/status`, {
          status,
          reason: reason || null,
        });
        if (!response.ok) {
          if (response.status === 401) {
            onUnauthorized("Sessão administrativa expirada.");
            return false;
          }
          const body = await response.json().catch(() => ({}));
          throw new Error(
            (body as { message?: string }).message || "Erro ao atualizar status."
          );
        }
        refreshDashboard();
        toast({
          title: "Status atualizado",
          description: `Etapa marcada como "${status}".`,
        });
        return true;
      } catch (err) {
        console.error(err);
        const msg = err instanceof Error ? err.message : "Erro ao atualizar status.";
        setUpdateStepError(msg);
        toast({ title: "Erro", description: msg, variant: "destructive" });
        return false;
      } finally {
        setUpdatingStepId(null);
      }
    },
    [isAuthenticated, onUnauthorized, refreshDashboard, toast]
  );

  const suspendUser = useCallback(
    async (userId: number, suspended: boolean, reason?: string) => {
      if (!isAuthenticated) return false;
      setSuspendingUserId(userId);
      setSuspendUserError(null);
      try {
        const response = await apiRequest("POST", `/admin/users/${userId}/suspend`, {
          suspended,
          reason: reason || null,
        });
        if (!response.ok) {
          if (response.status === 401) {
            onUnauthorized("Sessão administrativa expirada.");
            return false;
          }
          const body = await response.json().catch(() => ({}));
          throw new Error(
            (body as { message?: string }).message || "Erro ao atualizar suspensão."
          );
        }
        refreshDashboard();
        toast({
          title: suspended ? "Conta suspensa" : "Conta reativada",
          description: suspended
            ? "Usuário não consegue mais fazer login."
            : "Usuário liberado para acessar a plataforma novamente.",
        });
        return true;
      } catch (err) {
        console.error(err);
        const msg = err instanceof Error ? err.message : "Erro ao atualizar suspensão.";
        setSuspendUserError(msg);
        toast({ title: "Erro", description: msg, variant: "destructive" });
        return false;
      } finally {
        setSuspendingUserId(null);
      }
    },
    [isAuthenticated, onUnauthorized, refreshDashboard, toast]
  );

  const verifyUser = useCallback(
    async (userId: number, verified: boolean) => {
      if (!isAuthenticated) return;
      setVerifyingUserId(userId);
      setVerifyUserError(null);
      try {
        const response = await apiRequest("POST", `/admin/users/${userId}/verify`, {
          verified,
        });
        if (!response.ok) {
          if (response.status === 401) {
            onUnauthorized("Sessão administrativa expirada.");
            return;
          }
          const body = await response.json().catch(() => ({}));
          throw new Error(
            (body as { message?: string }).message || "Erro ao atualizar verificação."
          );
        }
        refreshDashboard();
        toast({
          title: verified ? "Usuário verificado" : "Verificação removida",
          description: verified
            ? "O badge verde aparece no perfil público agora."
            : "O badge de verificação foi removido.",
        });
      } catch (err) {
        console.error(err);
        const msg = err instanceof Error ? err.message : "Erro ao atualizar verificação.";
        setVerifyUserError(msg);
        toast({ title: "Erro", description: msg, variant: "destructive" });
      } finally {
        setVerifyingUserId(null);
      }
    },
    [isAuthenticated, onUnauthorized, refreshDashboard, toast]
  );

  const deleteEarlyUser = useCallback(
    async (userId: number) => {
      if (!isAuthenticated) return false;
      setDeletingUserId(userId);
      setDeleteUserError(null);
      try {
        const response = await apiRequest("DELETE", `/admin/users/${userId}`);
        if (!response.ok) {
          if (response.status === 401) {
            onUnauthorized("Sessão administrativa expirada.");
            return false;
          }
          const body = await response.json().catch(() => ({}));
          throw new Error((body as { message?: string }).message || "Erro ao remover conta.");
        }
        setSelectedUserId(null);
        refreshDashboard();
        toast({ title: "Conta removida", description: "A conta criada recentemente foi removida." });
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro ao remover conta.";
        setDeleteUserError(msg);
        toast({ title: "Erro", description: msg, variant: "destructive" });
        return false;
      } finally {
        setDeletingUserId(null);
      }
    },
    [isAuthenticated, onUnauthorized, refreshDashboard, toast]
  );

  const openConversationFromOverview = useCallback(
    (conversationId: number) => {
      setActiveTab("conversas");
      void loadConversationViewer(conversationId);
    },
    [loadConversationViewer]
  );

  const selectOperationsConversation = useCallback(
    (conversationId: number) => {
      setSelectedOperationsConversationId(conversationId);
      const conversation = operationsOverview?.conversations.find(
        (item) => item.conversation_id === conversationId
      );
      setSelectedOperationsTicketId(conversation?.contracts[0]?.id ?? null);
    },
    [operationsOverview?.conversations]
  );

  const selectOperationsTicket = useCallback(
    (ticketId: number) => {
      setSelectedOperationsTicketId(ticketId);
      const ticket = operationalContracts.find((item) => item.id === ticketId);
      if (ticket) {
        setSelectedOperationsConversationId(ticket.conversation_id);
      }
    },
    [operationalContracts]
  );

  return {
    dashboard,
    loading,
    error,
    activeTab,
    setActiveTab,
    showFilters,
    setShowFilters,
    draftFilters,
    appliedFilters,
    appliedFilterCount,
    activePagination,
    refreshDashboard,
    applyFilters,
    resetFilters,
    clearAppliedFilter,
    updateDraftFilter,
    goToPreviousPage,
    goToNextPage,
    openConversationFromOverview,
    selectedUserId,
    selectedUser,
    userDetailTab,
    setUserDetailTab,
    selectUser,
    userProfile,
    loadingUserProfile,
    userProfileError,
    savingUserProfile,
    saveUserProfileError,
    updateUserProfile,
    operationsOverview,
    loadingOperationsOverview,
    operationsOverviewError,
    selectedOperationsConversationId,
    selectOperationsConversation,
    selectedOperationsTicketId,
    selectOperationsTicket,
    paginatedUserConversations,
    paginatedUserContracts,
    paginatedUserSteps,
    prevUserConversationsPage: () =>
      setUserConversationsPage((page) => Math.max(1, page - 1)),
    nextUserConversationsPage: () =>
      setUserConversationsPage((page) =>
        Math.min(paginatedUserConversations.totalPages, page + 1)
      ),
    prevUserContractsPage: () =>
      setUserContractsPage((page) => Math.max(1, page - 1)),
    nextUserContractsPage: () =>
      setUserContractsPage((page) => Math.min(paginatedUserContracts.totalPages, page + 1)),
    prevUserStepsPage: () => setUserStepsPage((page) => Math.max(1, page - 1)),
    nextUserStepsPage: () =>
      setUserStepsPage((page) => Math.min(paginatedUserSteps.totalPages, page + 1)),
    directConversation,
    loadingDirectConversation,
    directConversationError,
    paginatedAdminMessages,
    prevAdminMessagesPage: () =>
      setAdminMessagesPage((page) => Math.max(1, page - 1)),
    nextAdminMessagesPage: () =>
      setAdminMessagesPage((page) => Math.min(paginatedAdminMessages.totalPages, page + 1)),
    messageDraft,
    setMessageDraft,
    sendingMessage,
    adminMessageError,
    sendAdminMessage,
    payTransfer,
    payingTransferTicketId,
    payTransferError,
    verifyUser,
    verifyingUserId,
    verifyUserError,
    updateStepStatus,
    updatingStepId,
    updateStepError,
    suspendUser,
    suspendingUserId,
    suspendUserError,
    deleteEarlyUser,
    deletingUserId,
    deleteUserError,
    selectedConversationId,
    selectedConversationRow,
    conversationViewer,
    loadingConversationViewer,
    conversationViewerError,
    paginatedConversationMessages,
    loadConversationViewer,
    prevConversationMessagesPage: () =>
      setConversationMessagesPage((page) => Math.max(1, page - 1)),
    nextConversationMessagesPage: () =>
      setConversationMessagesPage((page) =>
        Math.min(paginatedConversationMessages.totalPages, page + 1)
      ),
  };
}
