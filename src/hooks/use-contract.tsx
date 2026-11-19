import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  PROPOSAL_STEP_MIN_PRICE,
  SIGNATURE_STEP_TITLE,
} from "@/constants/contracts";
import {
  Ticket,
  Step,
  CreateStepRequest,
  UpdateStepRequest,
  Message,
} from "@/lib/Interfaces";
import type {
  ProviderReceivingMethod,
} from "@/features/messages/types";

const norm = (v?: string) => (v || "").toLowerCase();
const truthy = (v: any) => v === true || v === 1 || v === "1" || v === "true";

const normalizeStep = (s: any): Step & {
  confirm_freelancer?: boolean;
  confirmFreelancer?: boolean;
  confirm_contractor?: boolean;
  confirmContractor?: boolean;
  indexInTicket?: number;
} => {
  const cf = truthy(
    s?.confirm_freelancer ??
      s?.confirmFreelancer ??
      s?.freelancer_confirm ??
      s?.confirmed_by_freelancer
  );
  const cc = truthy(
    s?.confirm_contractor ??
      s?.confirmContractor ??
      s?.contractor_confirm ??
      s?.confirmed_by_contractor
  );
  return {
    ...s,
    confirm_freelancer: cf,
    confirmFreelancer: cf,
    confirm_contractor: cc,
    confirmContractor: cc,
  };
};

export function useContract(conversationId?: number) {
  const { user, isLoggedIn, updateUserLocal } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isVisible, setIsVisible] = useState<boolean>(!document.hidden);

  useEffect(() => {
    const onVisibility = () => setIsVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  /** =================== TICKETS =================== */
  const {
    data: tickets = [],
    isLoading: loadingTickets,
    refetch: refetchTickets,
  } = useQuery<Ticket[]>({
    queryKey: ["tickets", conversationId],
    enabled: !!conversationId && !!isLoggedIn,
    staleTime: 5_000,
    refetchInterval: (query) => {
      const data = query.state.data as Ticket[] | undefined;
      const list = Array.isArray(data) ? data : [];
      const critical = list.some((t) =>
        ["pendente", "em andamento"].includes((t.status || "").toLowerCase())
      );
      if (!isVisible) return 15_000;
      return critical ? 3_000 : 30_000;
    },
    queryFn: async () => {
      if (!conversationId) return [];
      const res = await apiRequest("GET", `/ticket/conversation/${conversationId}`);
      if (!res.ok) throw new Error(`Erro ao buscar tickets: ${res.status}`);
      const json = await res.json();
      return json.tickets || [];
    },
  });

  /** =================== MENSAGEM DE SISTEMA =================== */
  const sendSystemMessage = useCallback(
    async (
      content: string,
      type: Message["type"] = "text",
      proposal_data?: any
    ) => {
      if (!conversationId) return;
      try {
        const res = await apiRequest("POST", "/message", {
          conversation_id: conversationId,
          content,
          type,
          proposal_data,
        });
        if (res.ok) {
          queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
        } else {
          console.error("❌ Erro ao enviar mensagem de sistema:", await res.text());
        }
      } catch (e) {
        console.error("❌ Erro de rede ao enviar mensagem:", e);
      }
    },
    [conversationId, queryClient]
  );

  /** =================== STEPS =================== */
  const getStepsForTicket = useCallback(async (ticketId: number): Promise<Step[]> => {

    if (!ticketId) {
      return [];
    }
    try {
      const res = await apiRequest("GET", `/tickets/${ticketId}/steps`);
      if (res.status === 404) return []; 
      if (!res.ok) throw new Error(`Erro ao buscar steps: ${res.status}`);
      const json = await res.json();
      
      let rawSteps = json.steps || json.data || (Array.isArray(json) ? json : []);
      
      if (!Array.isArray(rawSteps) && rawSteps && typeof rawSteps === 'object') {
         if (Array.isArray(rawSteps.steps)) rawSteps = rawSteps.steps;
         else if (Array.isArray(rawSteps.data)) rawSteps = rawSteps.data;
      }

      if (!Array.isArray(rawSteps)) {
         console.warn(`[getStepsForTicket] Formato inesperado para ticket ${ticketId}:`, json);
         return [];
      }

      const normalized: Step[] = rawSteps.map(normalizeStep);
      return normalized.map((s: any, idx: number) => ({ ...s, indexInTicket: idx }));
    } catch (e) {
      console.error("❌ Erro ao buscar steps:", e);
      return [];
    }
  }, []);

  const getStepMeta = useCallback(
    async (stepId: number, hintedTicketId?: number) => {
      if (hintedTicketId) {
        const steps = await getStepsForTicket(hintedTicketId);
        const idx = steps.findIndex(s => s.id === stepId);
        if (idx >= 0) {
          const s = steps[idx];
          return {
            ticketId: hintedTicketId,
            index: idx + 1, 
            title: s.title,
            price: s.price,
          };
        }
      }
      for (const tk of tickets || []) {
        const steps = await getStepsForTicket(tk.id);
        const idx = steps.findIndex(s => s.id === stepId);
        if (idx >= 0) {
          const s = steps[idx];
          return {
            ticketId: tk.id,
            index: idx + 1,
            title: s.title,
            price: s.price,
          };
        }
      }
      return null;
    },
    [tickets, getStepsForTicket]
  );

  const updateStep = useCallback(
    async (stepId: number, updateData: UpdateStepRequest) => {
      try {
        const res = await apiRequest("PATCH", `/step/${stepId}`, updateData);
        const data = await res.json();
        console.log("Atualização de step geral pelo PATCH", data)
        queryClient.invalidateQueries({ queryKey: ["tickets", conversationId] });
        return true;
      } catch (err: any) {
        console.error("❌ Erro ao atualizar step:", err);
        return false;
      }
    },
    [conversationId, queryClient]
  );

  const deleteStep = useCallback(
    async (stepId: number) => {
      try {
        const res = await apiRequest("DELETE", `/step/${stepId}`);
        const data = await res.json();
        console.log("Step removido pelo DELETE", data)
        queryClient.invalidateQueries({ queryKey: ["tickets", conversationId] });
        return true;
      } catch (err: any) {
        console.error("❌ Erro ao deletar step:", err);
        return false;
      }
    },
    [conversationId, queryClient]
  );

  /** =================== TICKET: STATUS =================== */
  const updateTicketStatus = useCallback(
    async (
      ticketId: number,
      status: "pendente" | "em andamento" | "concluída" | "cancelada"
    ) => {
      try {
        const res = await apiRequest("PATCH", `/ticket/${ticketId}`, { status });
        const data = await res.json();
        console.log("Atualização de ticket geral pelo PATCH", data)
        queryClient.invalidateQueries({ queryKey: ["tickets", conversationId] });
        queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
        return true;
      } catch (err: any) {
        console.error("❌ Erro ao atualizar status do ticket:", err);
        toast({
          title: "Erro",
          description: err?.message || "Erro ao atualizar proposta",
          variant: "destructive",
        });
        return false;
      }
    },
    [conversationId, queryClient, toast]
  );

  const maybeFinishStep = useCallback(
    async (stepOrId: number | any) => {
      let step = stepOrId as any;
      let ticketId: number | undefined =
        Number(step?.ticket_id ?? step?.ticketId) || undefined;
      const sNorm = normalizeStep(step);
      const bothConfirmed =
        (truthy(sNorm.confirmContractor) || truthy(sNorm.confirm_contractor)) &&
        (truthy(sNorm.confirmFreelancer) || truthy(sNorm.confirm_freelancer));
      const isConcluded = norm(sNorm.status) === "Concluido";
      const isFree = Number(sNorm.price || 0) <= 0;
      if (bothConfirmed && !isConcluded && isFree) {
        await updateStep(sNorm.id, { status: "Concluido" } as any);
      }
      try {
        if (!ticketId) {
          for (const tk of tickets || []) {
            const sts = await getStepsForTicket(tk.id);
            if (sts.some((st: any) => st.id === sNorm.id)) {
              ticketId = tk.id;
              break;
            }
          }
        }
        if (ticketId) {
          const allSteps = await getStepsForTicket(ticketId);
          const allDone = allSteps.every((st: any) => norm(st.status) === "Concluido");
          if (allDone) {
            await updateTicketStatus(ticketId, "concluída");
          }
        }
        await sendSystemMessage(
          `🎉 Ticket #${ticketId} concluído! Todas as etapas foram finalizadas.`,
          "text",
          { ticket_id: ticketId, action: "ticket_concluded" }
        );
        queryClient.invalidateQueries({ queryKey: ["tickets", conversationId] });
        return bothConfirmed && !isConcluded; 
      } catch (e) {
        console.warn("Falha ao avaliar conclusão de ticket:", e);
        return false;
      }
    },
    [tickets, getStepsForTicket, updateStep, updateTicketStatus, queryClient, conversationId, sendSystemMessage]
  );

  const deleteTicket = useCallback(
    async (ticketId: number) => {
      try {
        const res = await apiRequest("DELETE", `/ticket/${ticketId}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.success === false) {
          throw new Error(
            data?.message || "Não foi possível excluir a proposta."
          );
        }
        console.log("Ticket removido pelo DELETE", data)
        queryClient.invalidateQueries({ queryKey: ["tickets", conversationId] });
        return true;
      } catch (err: any) {
        console.error("❌ Erro ao deletar ticket:", err);
        throw err;
      }
    },
    [conversationId, queryClient]
  );

  /** =================== FLUXOS DE ETAPAS =================== */
  const checkAndConcludeTicket = useCallback(
    async (ticketId: number) => {
      try {
        const steps = await getStepsForTicket(ticketId);
        const allDone = steps.every(s => s.status === 'Concluido');
        if (allDone) {
          await updateTicketStatus(ticketId, 'concluída');
        }
        queryClient.invalidateQueries({ queryKey: ['tickets', conversationId] });
      } catch (e) {
        console.warn('checkAndConcludeTicket falhou:', e);
      }
    },
    [getStepsForTicket, updateTicketStatus, queryClient, conversationId]
  );

  // prestador marca etapa como concluída (libera aceite do cliente)
  const markStepCompleted = useCallback(
    /**
     * `signatureMethod: 'google'` confirma pela própria sessão, sem senha. Conta criada
     * pelo Google nasce com senha aleatória que o usuário nunca vê, então pedir "sua
     * senha" a ela é pedir algo que ela não tem. O servidor não confia neste campo:
     * confere o `provider` gravado no usuário.
     */
    async (stepId: number, password: string, ticketId?: number, signatureMethod?: 'google') => {
      try {
        const res = await apiRequest("PATCH", `/step/confirmfreelancer/${stepId}`, {
          confirm_freelancer: true,
          confirmFreelancer: true,
          ...(signatureMethod ? { signature_method: signatureMethod } : { password }),
        });
        if (!res.ok) throw new Error(await res.text());

        // tenta encerrar automaticamente se o cliente já confirmou
        try { await maybeFinishStep(stepId); } catch { }

        try {
          const meta = await getStepMeta(stepId, ticketId);
          if (meta) {
            await sendSystemMessage(
              `🛠️ Prestador marcou concluída a etapa ${meta.index}: _${meta.title}_ (Ticket #${meta.ticketId}).`,
              "text",
              { ticket_id: meta.ticketId, step_id: stepId, action: "freelancer_concluded" }
            );
          }
        } catch { }

        if (ticketId) {
          await checkAndConcludeTicket(ticketId);
        }
        toast({ title: "Etapa marcada como concluída", description: "Aguardando aprovação do cliente." });
        queryClient.invalidateQueries({ queryKey: ["tickets", conversationId] });
        return true;
      } catch (err: any) {
        console.error("❌ Erro ao marcar etapa como concluída:", err);
        let description = err?.message || "Erro ao marcar etapa como concluída";
        let variant: "destructive" | "warning" | "default" = "destructive";
        try {
          const parsed = JSON.parse(err?.message || "{}");
          if (parsed?.message) description = parsed.message;
        } catch { /* keep original */ }
        if (description.toLowerCase().includes("pagamento pendente")) {
          description = "Cliente não efetuou o pagamento da etapa anterior. Entre em contato com o suporte.";
          variant = "warning";
        }
        toast({ title: "Erro", description, variant });
        return false;
      }
    },
    [conversationId, queryClient, toast, maybeFinishStep, getStepMeta, sendSystemMessage, checkAndConcludeTicket]
  );

  const confirmFreelancerStep = useCallback(
    async (stepId: number, password: string, signatureMethod?: 'google') => {
      try {
        const res = await apiRequest("PATCH", `/step/confirmfreelancer/${stepId}`, {
          confirmFreelancer: true,
          confirm_freelancer: true,
          ...(signatureMethod ? { signature_method: signatureMethod } : { password }),
        });
        if (!res.ok) throw new Error(await res.text());

        try { await maybeFinishStep(stepId); } catch { }

        try {
          const meta = await getStepMeta(stepId);
          if (meta) {
            await sendSystemMessage(
              `✅ Cliente aceitou a etapa ${meta.index}: _${meta.title}_ (Ticket #${meta.ticketId}).`,
              "text",
              { ticket_id: meta.ticketId, step_id: stepId, action: "client_accepted" }
            );
          }
        } catch { }

        toast({ title: "Etapa aceita", description: "A próxima etapa foi liberada." });
        queryClient.invalidateQueries({ queryKey: ["tickets", conversationId] });
        return true;
      } catch (err: any) {
        console.error("❌ Erro ao aceitar etapa:", err);
        toast({
          title: "Erro",
          description: err?.message || "Erro ao aceitar a etapa",
          variant: "destructive",
        });
        return false;
      }
    },
    [conversationId, queryClient, toast, maybeFinishStep, getStepMeta, sendSystemMessage]
  );

  const confirmStepCompletion = confirmFreelancerStep; 

  // cliente assina/aceita etapa formalmente (usa /step/signature/{id})
  const preConfirmFirstStepFreelancer = useCallback(
    async (stepId: number, password: string) => {
      const sanitizedPassword = (password || "").trim();
      if (!sanitizedPassword) {
        console.warn("Senha não fornecida para pré-confirmar a primeira etapa.");
        return { ok: false, message: "Senha não informada." };
      }
      try {
        const res = await apiRequest(
          "PATCH",
          `/step/confirmfreelancer/${stepId}`,
          {
            confirm_freelancer: true,
            confirmFreelancer: true,
            password: sanitizedPassword,
          }
        );
        if (!res.ok) {
          let msg = "";
          try {
            const parsed = await res.json();
            msg = parsed?.message || parsed?.error_message || "";
          } catch {
            msg = await res.text();
          }
          console.warn("Falha ao pré-confirmar etapa de assinatura:", msg);
          return { ok: false, message: msg || "Falha ao confirmar etapa" };
        }
        return { ok: true };
      } catch (e) {
        console.warn("Não consegui pré-confirmar o contrato pelo freelancer:", e);
        return { ok: false, message: (e as any)?.message || "Erro inesperado ao confirmar etapa" };
      }
    },
    []
  );

  /** =================== PROPOSTA (createProposal) =================== */
  const uploadPDF = useCallback(
    async (ticketId: number, file: File | Blob) => {
      try {
        const fd = new FormData();
        fd.append("file", file, (file as File).name || `ticket-${ticketId}.pdf`);
        const res = await apiRequest("POST", `/upload/pdf/${ticketId}`, fd);
        if (!res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const body = await res.json();
            throw new Error(body.message || "Erro ao enviar contrato PDF");
          } else {
            const text = await res.text();
            if (text.includes("ENOENT")) {
              throw new Error("Erro interno: Diretório de uploads não encontrado no servidor.");
            }
            throw new Error(`Erro no upload: ${res.status} ${res.statusText}`);
          }
        }
        const json = await res.json();
        queryClient.invalidateQueries({ queryKey: ["tickets", conversationId] });
        toast({ title: "Contrato enviado", description: "Contrato PDF enviado com sucesso!" });
        return json;
      } catch (err: any) {
        console.error("❌ Erro no upload do PDF:", err);
        toast({
          title: "Erro no upload",
          description: err?.message || "Erro ao enviar contrato PDF",
          variant: "destructive",
        });
        return null;
      }
    },
    [conversationId, queryClient, toast]
  );

  const createProposal = useCallback(
    async (
      steps: Omit<CreateStepRequest, "ticket_id">[],
      contractFile?: File | Blob,
      signaturePassword?: string,
      receivingMethod: ProviderReceivingMethod = "escrow",
      selectedReceivingAccountId?: number | null,
      paymentGroups?: { id: number; name: string }[]
    ) => {
      console.log(
        "createProposal chamado. Método:",
        receivingMethod,
        "Grupos:",
        paymentGroups
      );
      if (!conversationId) return false;
      if (!user) return false;

      let effectiveUserType = user.type;
      if (effectiveUserType !== "prestador" && user.id) {
        try {
          const userRes = await apiRequest("GET", `/users/${user.id}`);
          if (userRes.ok) {
            const userBody = await userRes.json().catch(() => null);
            const freshType = userBody?.user?.type;
            if (freshType === "prestador" || freshType === "contratante") {
              effectiveUserType = freshType;
              if (freshType !== user.type) {
                updateUserLocal({ type: freshType });
              }
            }
          }
        } catch (error) {
          console.warn("Falha ao atualizar tipo do usuário antes de criar proposta:", error);
        }
      }

      if (effectiveUserType !== "prestador") {
        toast({
          title: "Perfil não habilitado",
          description: "Apenas prestadores podem criar propostas.",
          variant: "warning",
        });
        return false;
      }
      if (!contractFile) {
        toast({
          title: "Contrato obrigatório",
          description: "Anexe o PDF do contrato antes de enviar a proposta.",
          variant: "warning",
        });
        return false;
      }
      const sanitizedPassword = (signaturePassword || "").trim();
      if (!sanitizedPassword) {
        toast({
          title: "Senha obrigatória",
          description: "Informe sua senha para confirmar a etapa de assinatura.",
          variant: "warning",
        });
        return false;
      }
      const filledSteps = steps
        .map((step, index) => ({
          ...step,
          title: step.title?.trim() || "",
          price: Number(step.price || 0),
          originalIndex: index,
        }))
        .filter((step) =>
          Boolean(
            step.title ||
              step.price > 0 ||
              (step as any).startDate ||
              (step as any).start_date ||
              (step as any).endDate ||
              (step as any).end_date
          )
        );
      const invalidStep = filledSteps.find(
        (step) => !step.title || step.price < PROPOSAL_STEP_MIN_PRICE
      );
      if (invalidStep) {
        toast({
          title: "Etapa inválida",
          description: `A etapa ${invalidStep.originalIndex + 1} precisa ter título e valor mínimo de R$ ${PROPOSAL_STEP_MIN_PRICE.toFixed(2)}.`,
          variant: "warning",
        });
        return false;
      }
      const validSteps = filledSteps.map(({ originalIndex, ...step }) => step);
      if (validSteps.length < 1) {
        toast({
          title: "Erro na Proposta",
          description: `Adicione pelo menos uma etapa com título e preço mínimo de R$ ${PROPOSAL_STEP_MIN_PRICE.toFixed(2)}.`,
          variant: "warning",
        });
        return false;
      }
      if (
        receivingMethod === "standard" &&
        (!selectedReceivingAccountId || selectedReceivingAccountId <= 0)
      ) {
        toast({
          title: "Conta obrigatória",
          description:
            "Selecione uma conta cadastrada na sua carteira para usar o recebimento padrão.",
          variant: "warning",
        });
        return false;
      }

      const toIsoDate = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      };
      const extractIsoDate = (value: string) => value.split("T")[0] || value;

      const getFutureDateIso = (daysToAdd: number): string => {
        const date = new Date();
        date.setHours(12, 0, 0, 0);
        date.setDate(date.getDate() + daysToAdd);
        return toIsoDate(date);
      };

      const addDaysToIsoDate = (isoDate: string, days: number): string => {
        const date = new Date(extractIsoDate(isoDate) + "T12:00:00");
        date.setDate(date.getDate() + days);
        return toIsoDate(date);
      };

      const parseBrToIso = (brDate: string): string | null => {
        if (!brDate || !/^\d{2}\/\d{2}\/\d{4}$/.test(brDate)) return null;
        const [d, m, y] = brDate.split('/');
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      };

      const normalizeDateInput = (value?: string | null): string | null => {
        if (!value || typeof value !== 'string') return null;
        const trimmed = value.trim();
        if (!trimmed) return null;
        const isoPart = extractIsoDate(trimmed);
        if (/^\d{4}-\d{2}-\d{2}$/.test(isoPart)) return isoPart;
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return parseBrToIso(trimmed);
        return null;
      };

      const formatIsoToBr = (iso: string) => {
        const [y, m, d] = iso.split('-');
        return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
      };
      const toDateAtNoon = (iso?: string | null): Date | null => {
        if (!iso) return null;
        const datePart = extractIsoDate(iso);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return null;
        return new Date(`${datePart}T12:00:00`);
      };

      // Etapa de assinatura: ocupa apenas o dia de hoje (janela zero).
      // Hoje em dia assinatura digital + PIX são instantâneos, não há motivo
      // pra reservar dias. A primeira etapa real pode começar a partir de amanhã.
      const todayDate = getFutureDateIso(0);
      const SIGN_STEP: Omit<CreateStepRequest, "ticket_id"> & { start_date: string; end_date: string; is_signature_step?: boolean } = {
        title: SIGNATURE_STEP_TITLE,
        price: 0,
        start_date: todayDate,
        end_date: todayDate,
        is_signature_step: true,
      };
      const stepsToCreate = [SIGN_STEP, ...validSteps] as (Omit<CreateStepRequest, "ticket_id"> & { start_date?: string | null, endDate?: string | null })[];
      const totalPrice = stepsToCreate.reduce((acc, s, index) => {
        if (index === 0) return acc; // ignora a etapa de assinatura gratuita
        return acc + (s.price || 0);
      }, 0);

      let createdTicketId: number | null = null;
      const cleanupAndThrow = async (message: string) => {
        if (createdTicketId) {
          try { await deleteTicket(createdTicketId); } catch { /* ignore */ }
          createdTicketId = null;
        }
        throw new Error(message);
      };
      try {
        const ticketPayload: Record<string, any> = {
          conversation_id: conversationId,
          payment_preference: "custom",
          provider_receiving_method: receivingMethod,
        };
        if (receivingMethod === "standard") {
          ticketPayload.provider_receiving_account_id =
            selectedReceivingAccountId;
        }
        const tRes = await apiRequest("POST", "/ticket", ticketPayload);
        if (!tRes.ok) throw new Error(await tRes.text());
        const tJson = await tRes.json();
        const ticketId: number = tJson.ticketService?.id || tJson.ticket?.id;
        createdTicketId = ticketId;
        if (!ticketId) throw new Error("ID do ticket não retornado pela API");

        // criar grupos de pagamento do fluxo em garantia
        // Filtra grupos sem etapas (grupos vazios criados pelo prestador no UI
        // não devem ser persistidos para não confundir o cliente).
        const referencedGroupIds = new Set(
          stepsToCreate
            .map((s: any) => s.payment_group_id ?? s.paymentGroupId)
            .filter((id: any): id is number => typeof id === "number")
        );
        const usedGroups = (paymentGroups || []).filter((g) =>
          referencedGroupIds.has(g.id)
        );

        const groupIdMap = new Map<number, number>();
        if (usedGroups.length > 0) {
          console.log("Processando grupos de pagamento:", usedGroups);
          for (const group of usedGroups) {
            try {
              console.log("Criando grupo:", group);
              const gRes = await apiRequest("POST", "/payment-groups", {
                ticket_id: ticketId,
                name: group.name,
                sequence: group.id,
              });
              if (gRes.ok) {
                const gJson = await gRes.json();
                console.log("Grupo criado com sucesso:", gJson);
                const realId = gJson.id || gJson.data?.id || gJson.paymentGroup?.id;
                if (realId) groupIdMap.set(group.id, realId);
              } else {
                console.error("Falha ao criar grupo:", await gRes.text());
              }
            } catch (e) {
              console.error("Erro ao criar grupo de pagamento", e);
            }
          }
        }

        // criar as etapas
        const createdSteps: any[] = [];
        let previousEndIso: string | null = null;
        for (let index = 0; index < stepsToCreate.length; index++) {
          const s = stepsToCreate[index];
          const isSignatureStep = index === 0;

          let startIso = normalizeDateInput((s as any).startDate ?? s.start_date ?? null);
          let endIso = normalizeDateInput((s as any).endDate ?? (s as any).end_date ?? null);

          if (isSignatureStep) {
            startIso = SIGN_STEP.start_date;
            endIso = SIGN_STEP.end_date;
          } else {
            const minimumStartIso = previousEndIso || getFutureDateIso(1);
            if (!startIso) {
              startIso = minimumStartIso;
            } else if (
              previousEndIso &&
              new Date(startIso) < new Date(previousEndIso)
            ) {
              toast({
                title: "Sequência de datas inválida",
                description: `A etapa "${s.title}" deve iniciar a partir de ${formatIsoToBr(previousEndIso)}.`,
                variant: "warning",
              });
              await cleanupAndThrow(`Sequência de datas inválida na etapa "${s.title}".`);
            }

            if (!endIso) {
              endIso = addDaysToIsoDate(startIso, 1);
            }
          }

          if (!startIso) {
            startIso = getFutureDateIso(1);
          }
          if (!endIso) {
            endIso = addDaysToIsoDate(startIso, 1);
          }

          let startDateAtNoon = toDateAtNoon(startIso);
          let endDateAtNoon = toDateAtNoon(endIso);

          if (!startDateAtNoon) {
            toast({
              title: "Data de Início Inválida",
              description: `Não foi possível interpretar a data de início da etapa "${s.title}".`,
              variant: "warning",
            });
            await cleanupAndThrow(`Data de início inválida na etapa "${s.title}".`);
            return false;
          }

          const todayAtStart = new Date();
          todayAtStart.setHours(0, 0, 0, 0);
          if (startDateAtNoon && startDateAtNoon < todayAtStart) {
            toast({
              title: "Data de Início Inválida",
              description: `A data de início da etapa "${s.title}" (${formatIsoToBr(startIso)}) não pode ser anterior a hoje.`,
              variant: "warning",
            });
            await cleanupAndThrow(`Data de início anterior a hoje na etapa "${s.title}".`);
          }

          if (!endDateAtNoon) {
            endIso = addDaysToIsoDate(startIso, 1);
            endDateAtNoon = toDateAtNoon(endIso);
          }
          if (!endDateAtNoon) {
            endDateAtNoon = startDateAtNoon;
          }

          if (endDateAtNoon < startDateAtNoon) {
            toast({
              title: "Datas inválidas",
              description: `A data final da etapa "${s.title}" não pode ser anterior à data inicial.`,
              variant: "warning",
            });
            await cleanupAndThrow(`Data final anterior à inicial na etapa "${s.title}".`);
          }

          const safeStartDate = startDateAtNoon;
          const safeEndDate = endDateAtNoon;

          const localGroupId = (s as any).payment_group_id;
          const realGroupId = localGroupId ? groupIdMap.get(localGroupId) : null;

          const stepPayload: any = {
            ticket_id: ticketId,
            title: s.title,
            price: s.price || 0,
            start_date: safeStartDate.toISOString(),
            end_date: safeEndDate.toISOString(),
            group_id: realGroupId,
            // Apenas a primeira etapa (assinatura) recebe a flag.
            // Etapas comuns omitem o campo (default false no banco).
            ...(isSignatureStep ? { is_signature_step: true } : {}),
          };

          const sRes = await apiRequest("POST", "/step", stepPayload);
          if (!sRes.ok) {
            const errorBody = await sRes.text();
            console.error("Erro ao criar step:", errorBody, "Payload:", stepPayload);
            throw new Error(`Erro ao criar etapa "${s.title}": ${errorBody || sRes.statusText}`);
          }
          const sJson = await sRes.json();
          createdSteps.push({
            id: sJson.step?.id || sJson.id,
            title: s.title,
            price: s.price || 0,
            start_date: safeStartDate.toISOString(),
            end_date: safeEndDate.toISOString(),
          });
          previousEndIso = endIso;
        }
        if (createdSteps[0]?.id) {
          const confirmed = await preConfirmFirstStepFreelancer(
            createdSteps[0].id,
            sanitizedPassword
          );
          if (!confirmed?.ok) {
            await cleanupAndThrow(
              confirmed?.message ||
                "Não foi possível confirmar a etapa de assinatura. Verifique sua senha."
            );
          }
        }

        // Aplica a taxa de plataforma de 5% (teto R$ 1.500) sobre as etapas
        // cobráveis. Backend redistribui o valor — preço de cada etapa passa
        // a incluir sua parcela da taxa. Falha aqui é não-fatal: a proposta
        // funciona mas sem a taxa aplicada (admin pode reaplicar depois).
        try {
          const feeRes = await apiRequest("POST", `/ticket/${ticketId}/finalize-fee`);
          if (!feeRes.ok) {
            console.warn(
              "[finalize-fee] Falha ao aplicar taxa de plataforma:",
              await feeRes.text().catch(() => "")
            );
          }
        } catch (feeError) {
          console.warn("[finalize-fee] Erro de rede ao aplicar taxa:", feeError);
        }

        const uploaded = await uploadPDF(ticketId, contractFile);
        if (!uploaded || (uploaded as any)?.success === false) {
          await deleteTicket(ticketId);
          createdTicketId = null;
          throw new Error("Falha ao enviar o contrato PDF. A proposta foi cancelada.");
        }
        await sendSystemMessage(
          `📋 Nova proposta enviada! Ticket #${ticketId} - Etapas: ${stepsToCreate.length} - Total: R$ ${totalPrice.toFixed(2)}`,
          "proposal",
          { ticket_id: ticketId, steps: createdSteps, total: totalPrice, status: "pendente" }
        );

        queryClient.invalidateQueries({ queryKey: ["tickets", conversationId] });
        toast({
          title: "Proposta enviada",
          description: "Etapa 1 (assinatura) foi adicionada automaticamente.",
        });
        return true;
      } catch (err: any) {
        console.error("❌ Erro ao criar proposta:", err);
        toast({
          title: "Erro ao criar proposta",
          description: err?.message || "Verifique os dados e tente novamente.",
          variant: "destructive",
        });
        if (createdTicketId) {
          try { await deleteTicket(createdTicketId); } catch (cleanupErr) {
            console.warn("Falha ao remover ticket após erro:", cleanupErr);
          }
        }
        return false;
      }
    },
    [conversationId, user, updateUserLocal, queryClient, toast, sendSystemMessage, uploadPDF, preConfirmFirstStepFreelancer, deleteTicket] // Adicionei as dependências que faltavam
  );

  /** =================== PDF/CONTRATO =================== */

  // --- Cliente recusa etapa ---
  // Recusar é reclamar por escrito: o texto vai junto e o servidor recusa sem ele (19/11/2026).
  const rejectStep = useCallback(
    async (stepId: number, ticketId: number, indexInTicket: number, motivo?: string) => {
      try {
        const res = await apiRequest("PATCH", `/step/${stepId}`, { status: "Recusado", motivo });
        if (!res.ok) {
          const corpo = await res.json().catch(() => ({}));
          throw new Error((corpo as { message?: string }).message || "Não foi possível recusar a etapa.");
        }

        queryClient.invalidateQueries({ queryKey: ["tickets", conversationId] });
        return true;
      } catch (err: any) {
        console.error("❌ Erro ao recusar etapa:", err);
        toast({
          title: "Erro",
          description: err?.message || "Erro ao recusar a etapa",
          variant: "destructive",
        });
        return false;
      }
    },
    [conversationId, getStepsForTicket, updateStep, queryClient, toast]
  );

  const computeCurrentIndex = useCallback((steps: Step[]) => {
    const refused = steps.findIndex((s: any) => norm(s.status) === "recusado");
    if (refused > 0) return refused - 1;
    const firstNotDone = steps.findIndex((s: any) => norm(s.status) !== "concluido");
    return firstNotDone === -1 ? Math.max(steps.length - 1, 0) : firstNotDone;
  }, []);

  const getActiveTicket = useCallback(() => {
    if (!conversationId || !tickets?.length) return null;
    return tickets.find((tk) => tk.conversation_id === conversationId) || null;
  }, [conversationId, tickets]);

  return {
    tickets,
    loadingTickets,
    getStepsForTicket,
    updateStep,
    deleteStep,
    markStepCompleted,
    confirmFreelancerStep,
    confirmStepCompletion, // alias
    rejectStep,

    createProposal,
    updateTicketStatus,
    deleteTicket,
    sendSystemMessage,

    // utils
    getActiveTicket,
    refetchTickets,
    computeCurrentIndex,
  };
}

export default useContract;
