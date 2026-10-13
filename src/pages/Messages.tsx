import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useLocation, useParams } from 'wouter';
import { useMessaging } from '@/hooks/use-messaging';
import { useContract } from '@/hooks/use-contract';
import { useSignature } from '@/hooks/use-signature';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  SIGNATURE_STEP_TITLE,
  PROPOSAL_STEP_MIN_PRICE,
  findSignatureContractStep,
  isSignatureContractStep,
} from "@/constants/contracts";
import { Button } from '@/components/ui/button';
import MessagesLayout from '@/components/layouts/MessagesLayout';
import { EmptyConversationState } from "@/features/messages/components/EmptyConversationState";
import { apiRequest, API_BASE_URL } from '@/lib/queryClient';
import type { AdditionalPayment, Step } from '@/lib/Interfaces';
import { ConversationsSidebar } from '@/features/messages/components/ConversationsSidebar';
import { ConversationHeader } from '@/features/messages/components/ConversationHeader';
import { ChatPanel } from '@/features/messages/components/ChatPanel';
import { ContractsPanel } from '@/features/messages/components/ContractsPanel';
import { ProposalCard } from '@/features/messages/components/ProposalCard';
import { sortTicketsDesc } from '@/features/messages/utils';
import { PdfViewerDialog } from '@/components/modals/PdfViewerDialog';
import { ProposalDetailsDialog } from '@/components/modals/ProposalDetailsDialog';
import { GroupedPaymentDialog } from '@/components/modals/GroupedPaymentDialog';
import { SignatureDialog } from '@/components/modals/SignatureDialog';
import { NewProposalDialog } from '@/components/modals/NewProposalDialog';
import { OlderContractsDialog } from '@/components/modals/OlderContractsDialog';
import {
  CreateAdditionalPaymentDialog,
  type AdditionalPaymentTicketOption,
} from '@/components/modals/CreateAdditionalPaymentDialog';
import { AdditionalPaymentsListDialog } from '@/components/modals/AdditionalPaymentsListDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StepPaymentDialog } from "@/features/messages/components/StepPaymentDialog";
import { usePdfViewer } from "@/features/messages/hooks/usePdfViewer";
import { useProposalComposer } from "@/features/messages/hooks/useProposalComposer";
import { ImagePlus, List, Plus, ReceiptText } from "lucide-react";
import type {
  GroupedPaymentDialogState,
  PaymentDialogState,
  PaymentMethod,
  ProposalStep,
  ProposalStepPayload,
  ProviderReceivingAccount,
  ProviderReceivingMethod,
} from "@/features/messages/types";

type SignatureDialogOverrides = {
  title?: string;
  description?: string;
  confirmLabel?: string;
  agreeLabel?: string;
  passwordPlaceholder?: string;
  requireAck?: boolean;
};

type SignatureFlow =
  | ({ type: 'contract'; ticket: any } & SignatureDialogOverrides)
  | ({ type: 'step-complete'; stepId: number; ticketId: number } & SignatureDialogOverrides)
  | ({ type: 'step-accept'; step: any } & SignatureDialogOverrides)
  | ({ type: 'proposal-first-step' } & SignatureDialogOverrides);

const buildImageUrl = (path?: string | null) => {
  if (!path) return "";
  const normalizedPath = path.replace(/\\/g, "/");
  return normalizedPath.startsWith("http")
    ? normalizedPath
    : `${API_BASE_URL}/${normalizedPath.replace(/^\/+/, "")}`;
};

export default function Messages() {
  const [location, setLocation] = useLocation();
  const search = window.location.search; // wouter doesn't have useSearch hook built-in easily accessible 
  const { userId } = useParams<{ userId?: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const initialPartnerId = userId;


  const {
    conversations,
    currentConversation,
    messages,
    newMessage,
    unreadMessageCount,
    loadingConversations,
    sendingMessage,
    setNewMessage,
    sendMessage,
    selectConversation,
    conversationsError,
  } = useMessaging(initialPartnerId);

  useEffect(() => {
    const params = new URLSearchParams(search);
    const text = params.get("text");
    if (text) {
      if (!newMessage) {
        setNewMessage(text);
      }
      // Limpar o parametro da URL visualmente e para evitar re-uso
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [search, newMessage]);

  const {
    tickets,
    loadingTickets,
    createProposal,
    getStepsForTicket,
    updateTicketStatus,
    updateStep,
    deleteStep,
    deleteTicket,
    markStepCompleted,
    confirmFreelancerStep,
    rejectStep,
    sendSystemMessage,
    refetchTickets,
  } = useContract(currentConversation?.id);

  const {
    signContract,
    acceptStep,
    buscarPDF,
  } = useSignature(currentConversation?.id);

  const canCreateProposal = () =>
    user?.type === 'prestador' &&
    currentConversation?.isNegotiation === true &&
    currentConversation?.otherUser.type !== 'prestador';

  /**
   * Nao existe mais guard de "senha de assinatura configurada" antes de abrir o dialogo.
   *
   * O antigo bloqueava quem tivesse `signature_password_set !== true` e mandava para o
   * perfil. Duas coisas erradas: essa flag e ligada pelo backend em QUALQUER login, entao
   * nunca significou "definiu senha de assinatura"; e conta Google nao tem senha alguma
   * para digitar (nasce com uma aleatoria que o usuario nunca ve). Na pratica, conta
   * Google ficava sem conseguir assinar, sem saida.
   * Quem decide o caminho agora e o proprio dialogo: conta Google escolhe entre confirmar
   * pela conta ou por uma senha de assinatura; conta local usa a senha de login.
   */
  const isGoogleAccount = (user as any)?.provider === "google";

  const signaturePasswordHint = isGoogleAccount
    ? "Sua conta entrou pelo Google: confirme pela própria conta, ou cadastre uma senha de assinatura no perfil."
    : "Use a sua senha de login, ou a senha de assinatura, se você tiver cadastrado uma no perfil.";

  // ---------- state ----------
  const [showProposalModal, setShowProposalModal] = useState(false);
  const {
    proposalSteps,
    setProposalSteps,
    providerReceivingMethod,
    setProviderReceivingMethod,
    selectedReceivingAccountId,
    setSelectedReceivingAccountId,
    contractFile,
    setContractFile,
    addProposalStep,
    removeProposalStep,
    updateProposalStep,
    handleContractFileChange,
  } = useProposalComposer({ toast });

  // Grupos de pagamento ficam controlados aqui pra persistir nomes customizados.
  const [paymentGroups, setPaymentGroups] = useState<{ id: number; name: string }[]>([
    { id: 1, name: "Grupo 1" },
  ]);

  // ---------- draft (rascunho) da proposta ----------
  const draftKey = currentConversation?.id
    ? `arqdoor:proposal-draft:${currentConversation.id}`
    : null;
  const [draftRestoredName, setDraftRestoredName] = useState<string | null>(null);
  const draftLoadedRef = React.useRef(false);

  // Restaura ao trocar de conversa ou montar
  React.useEffect(() => {
    draftLoadedRef.current = false;
    if (!draftKey) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.proposalSteps && Array.isArray(parsed.proposalSteps)) {
        setProposalSteps(parsed.proposalSteps);
      }
      if (Array.isArray(parsed?.paymentGroups)) {
        setPaymentGroups(parsed.paymentGroups);
      }
      if (parsed?.providerReceivingMethod) {
        setProviderReceivingMethod(parsed.providerReceivingMethod);
      }
      if (parsed?.selectedReceivingAccountId !== undefined) {
        setSelectedReceivingAccountId(parsed.selectedReceivingAccountId);
      }
      if (parsed?.contractFileName) {
        setDraftRestoredName(parsed.contractFileName);
      }
    } catch (e) {
      console.warn("Falha ao restaurar rascunho de proposta:", e);
    } finally {
      // próxima persistência só dispara após primeiro render-pós-load
      setTimeout(() => { draftLoadedRef.current = true; }, 0);
    }
  }, [draftKey]);

  // Persiste a cada mudança (debounced via mecânica natural do React)
  React.useEffect(() => {
    if (!draftKey || !draftLoadedRef.current) return;
    try {
      const hasContent =
        proposalSteps.some((s) => s.title || s.price || s.startDate || s.endDate) ||
        contractFile;
      if (!hasContent) {
        localStorage.removeItem(draftKey);
        return;
      }
      const payload = {
        proposalSteps,
        paymentGroups,
        providerReceivingMethod,
        selectedReceivingAccountId,
        contractFileName: contractFile?.name || draftRestoredName || null,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(draftKey, JSON.stringify(payload));
    } catch (e) {
      // localStorage cheio ou desabilitado — silencia
    }
  }, [
    draftKey,
    proposalSteps,
    paymentGroups,
    providerReceivingMethod,
    selectedReceivingAccountId,
    contractFile,
    draftRestoredName,
  ]);

  const clearProposalDraft = useCallback(() => {
    if (draftKey) localStorage.removeItem(draftKey);
    setDraftRestoredName(null);
    setProposalSteps([{ id: crypto.randomUUID(), title: '', price: 0, paymentGroupId: 1 }]);
    setPaymentGroups([{ id: 1, name: "Grupo 1" }]);
    setProviderReceivingMethod("escrow");
    setSelectedReceivingAccountId(null);
    setContractFile(null);
  }, [
    draftKey,
    setContractFile,
    setProposalSteps,
    setProviderReceivingMethod,
    setSelectedReceivingAccountId,
  ]);
  const [pendingProposalData, setPendingProposalData] = useState<{
    steps: ProposalStepPayload[];
    contractFile?: File | null;
    receivingMethod: ProviderReceivingMethod;
    selectedReceivingAccountId: number | null;
    paymentGroups?: { id: number; name: string }[];
  } | null>(null);
  const [sendingProposal, setSendingProposal] = useState(false);
  const [receivingAccounts, setReceivingAccounts] = useState<
    ProviderReceivingAccount[]
  >([]);
  const [loadingReceivingAccounts, setLoadingReceivingAccounts] =
    useState(false);

  const [showProposalDetails, setShowProposalDetails] = useState(false);
  const [selectedTicketSteps, setSelectedTicketSteps] = useState<any[]>([]);
  const [loadingSteps, setLoadingSteps] = useState(false);
  const [ticketStepsMap, setTicketStepsMap] = useState<Record<number, any[]>>({});
  const [editingStep, setEditingStep] = useState<number | null>(null);
  const [editStepData, setEditStepData] = useState({ title: '', price: 0 });

  const {
    showPdfViewer,
    pdfBlob,
    pdfUrl,
    pdfFilename,
    selectedTicketForPdf,
    loadingPdf,
    pdfError,
    fullscreenPdf,
    setFullscreenPdf,
    handleViewPdf,
    closePdfViewer,
    downloadPdf,
  } = usePdfViewer({ fetchPdf: buscarPDF });
  const [deletingTicket, setDeletingTicket] = useState(false);

  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [selectedTicketForSignature, setSelectedTicketForSignature] = useState<any>(null);
  const [signaturePassword, setSignaturePassword] = useState('');
  const [ackChecked, setAckChecked] = useState(false);
  const [signingDocument, setSigningDocument] = useState(false);
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [signatureFlow, setSignatureFlow] = useState<SignatureFlow | null>(null);

  const [showOlderTickets, setShowOlderTickets] = useState(false);

  // Mobile tab: "chat" ou "propostas"
  const [mobileTab, setMobileTab] = useState<'chat' | 'propostas'>('chat');
  // Id da proposta destacada (rolar + anel laranja)
  const [highlightTicketId, setHighlightTicketId] = useState<number | null>(null);
  const [paymentDialog, setPaymentDialog] = useState<PaymentDialogState | null>(null);
  const [groupedPaymentDialog, setGroupedPaymentDialog] = useState<GroupedPaymentDialogState | null>(null);
  const [groupedPaymentEnabledByTicket, setGroupedPaymentEnabledByTicket] = useState<Record<number, boolean>>({});
  const [payingStepId, setPayingStepId] = useState<number | null>(null);
  const [lastPaymentMethod, setLastPaymentMethod] = useState<PaymentMethod>("PIX");
  const [confirmingStepPaymentIds, setConfirmingStepPaymentIds] = useState<Record<number, boolean>>({});
  const confirmingStepPaymentRef = useRef<Record<number, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  
  // Pagamentos Adicionais
  const [additionalPayments, setAdditionalPayments] = useState<AdditionalPayment[]>([]);
  const [loadingAdditionalPayments, setLoadingAdditionalPayments] = useState(false);
  const [isCreatingAdditionalPayment, setIsCreatingAdditionalPayment] = useState(false);
  const [processingAdditionalPaymentId, setProcessingAdditionalPaymentId] = useState<number | null>(null);
  const [showCreateAdditionalPaymentDialog, setShowCreateAdditionalPaymentDialog] =
    useState(false);
  const [showAdditionalPaymentsListDialog, setShowAdditionalPaymentsListDialog] =
    useState(false);
  const [selectedAdditionalPaymentsTicketId, setSelectedAdditionalPaymentsTicketId] =
    useState<number | null>(null);
  const isProcessingAdditionalPayment =
    isCreatingAdditionalPayment || processingAdditionalPaymentId !== null;

  const paymentMethodLabels = useMemo<Record<PaymentMethod, string>>(
    () => ({
      PIX: "PIX",
      BOLETO: "Boleto",
      CREDIT_CARD: "Cartão de crédito",
      DEBIT_CARD: "Cartão de débito",
    }),
    []
  );

  const loadReceivingAccounts = useCallback(async () => {
    if (!showProposalModal || user?.type !== "prestador" || !user?.id) {
      setReceivingAccounts([]);
      setLoadingReceivingAccounts(false);
      return;
    }

    try {
      setLoadingReceivingAccounts(true);
      const res = await apiRequest("GET", `/providers/me/accounts`);
      const body = await res.json().catch(() => ({}));

      if (res.status === 403 || res.status === 404) {
        setReceivingAccounts([]);
        return;
      }
      if (!res.ok || body?.success === false) {
        throw new Error(body?.message || "Erro ao carregar carteira.");
      }

      setReceivingAccounts(Array.isArray(body.accounts) ? body.accounts : []);
    } catch (error: any) {
      setReceivingAccounts([]);
    } finally {
      setLoadingReceivingAccounts(false);
    }
  }, [showProposalModal, user?.id, user?.type]);

  useEffect(() => {
    loadReceivingAccounts();
  }, [loadReceivingAccounts]);

  useEffect(() => {
    if (
      providerReceivingMethod === "standard" &&
      !selectedReceivingAccountId &&
      receivingAccounts.length === 1
    ) {
      setSelectedReceivingAccountId(receivingAccounts[0].id);
    }
  }, [
    providerReceivingMethod,
    receivingAccounts,
    selectedReceivingAccountId,
    setSelectedReceivingAccountId,
  ]);

  const getGroupedPaymentEnabled = (ticket: any) => {
    if (!ticket) return undefined;
    if (typeof ticket.allow_grouped_payment === "boolean") return ticket.allow_grouped_payment;
    if (typeof ticket.allowGroupedPayment === "boolean") return ticket.allowGroupedPayment;
    if (typeof ticket.grouped_payment === "boolean") return ticket.grouped_payment;
    if (typeof ticket.groupedPayment === "boolean") return ticket.groupedPayment;
    if (typeof ticket.grouped_payment_enabled === "boolean") return ticket.grouped_payment_enabled;
    if (typeof ticket.groupedPaymentEnabled === "boolean") return ticket.groupedPaymentEnabled;
    return undefined;
  };

  const processedConversations = useMemo(() => (conversations || []).map((c: any) => {
    const otherUser = c.otherUser || {};
    const img = otherUser.perfil || otherUser.avatar;
    const url = buildImageUrl(img);
    return {
      ...c,
      otherUser: {
        ...otherUser,
        perfil: url,
        avatar: url,
      }
    };
  }), [conversations]);

  const processedCurrentConversation = useMemo(() => {
    if (!currentConversation) return null;
    const otherUser = currentConversation.otherUser || {};
    const img = otherUser.perfil || otherUser.avatar;
    const url = buildImageUrl(img);
    return {
      ...currentConversation,
      otherUser: {
        ...otherUser,
        perfil: url,
        avatar: url,
      }
    };
  }, [currentConversation]);

  const processedMessages = useMemo(() => (messages || []).map((m: any) => {
    if (!m.sender) return m;
    const sender = m.sender;
    const img = sender.perfil || sender.avatar;
    const url = buildImageUrl(img);
    return {
      ...m,
      sender: {
        ...sender,
        perfil: url,
        avatar: url,
      }
    };
  }), [messages]);

  const additionalPaymentCreateTicketOptions = useMemo<AdditionalPaymentTicketOption[]>(
    () =>
      tickets
        .filter(
          (ticket: any) =>
            String(ticket?.status || "").toLowerCase() === "em andamento"
        )
        .slice()
        .sort(sortTicketsDesc)
        .map((ticket: any) => ({
          id: ticket.id,
          label: `Proposta #${ticket.id}`,
        })),
    [tickets]
  );

  const additionalPaymentListTicketOptions = useMemo<AdditionalPaymentTicketOption[]>(
    () =>
      tickets
        .slice()
        .sort(sortTicketsDesc)
        .map((ticket: any) => ({
          id: ticket.id,
          label: `Proposta #${ticket.id} (${ticket.status || "sem status"})`,
        })),
    [tickets]
  );

  // ---------- efeitos ----------
  useEffect(() => {
    const loadAllTicketSteps = async () => {
      if (tickets.length === 0) return;
      const map: Record<number, any[]> = {};
      for (const t of tickets) {
        try {
          map[t.id] = await getStepsForTicket(t.id);
        } catch {
          map[t.id] = [];
        }
      }
      setTicketStepsMap(map);
    };
    loadAllTicketSteps();
  }, [tickets, getStepsForTicket]);

  useEffect(() => {
    const ticketId = (selectedTicketSteps[0] as any)?.ticket_id;
    if (!ticketId) return;
    const ticket = tickets.find((t: any) => t.id === ticketId);
    if (!ticket) return;
    const enabled = getGroupedPaymentEnabled(ticket);
    if (typeof enabled !== "boolean") return;
    setGroupedPaymentEnabledByTicket((prev) => {
      if (prev[ticketId] === enabled) return prev;
      return { ...prev, [ticketId]: enabled };
    });
  }, [selectedTicketSteps, tickets]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (additionalPaymentListTicketOptions.length === 0) {
      setSelectedAdditionalPaymentsTicketId(null);
      return;
    }
    setSelectedAdditionalPaymentsTicketId((prev) => {
      if (
        prev &&
        additionalPaymentListTicketOptions.some((option) => option.id === prev)
      ) {
        return prev;
      }
      return additionalPaymentListTicketOptions[0].id;
    });
  }, [additionalPaymentListTicketOptions]);

  // ---------- handlers: chat ----------
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentConversation?.id) return;
    await sendMessage();
  };
  const handleConversationClick = (conversation: any) => {
    if (!conversation.id) return;
    selectConversation(conversation);
    setLocation(`/messages/${conversation.otherUser.id}`);
  };

  const handleOpenCreateAdditionalPaymentDialog = useCallback(() => {
    if (user?.type !== "prestador") return;
    if (additionalPaymentCreateTicketOptions.length === 0) {
      toast({
        title: "Sem proposta em andamento",
        description:
          "Nenhuma proposta em andamento foi encontrada para vincular a cobrança adicional.",
        variant: "destructive",
      });
      return;
    }
    setShowCreateAdditionalPaymentDialog(true);
  }, [additionalPaymentCreateTicketOptions.length, toast, user?.type]);

  const handleOpenAdditionalPaymentsListDialog = useCallback(() => {
    if (user?.type !== "prestador" && user?.type !== "contratante") return;
    if (additionalPaymentListTicketOptions.length === 0) {
      toast({
        title: "Sem propostas",
        description: "Nenhuma proposta foi encontrada para listar cobranças adicionais.",
        variant: "destructive",
      });
      return;
    }
    setShowAdditionalPaymentsListDialog(true);
  }, [additionalPaymentListTicketOptions.length, toast, user?.type]);

  // ---------- handlers: proposta nova ----------
  const handleSendProposal = (groups?: { id: number; name: string }[]) => {
    if (!currentConversation || !user || !canCreateProposal()) return;
    if (!contractFile) {
      toast({
        title: 'Contrato obrigatório',
        description: 'Anexe o PDF do contrato para enviar a proposta.',
        variant: 'destructive',
      });
      return;
    }

    const filledSteps = proposalSteps
      .map((step, index) => ({ ...step, originalIndex: index }))
      .filter((step) => {
        const title = step.title.trim();
        return Boolean(
          title ||
            Number(step.price || 0) > 0 ||
            step.startDate?.trim() ||
            step.endDate?.trim()
        );
      });

    const invalidStep = filledSteps.find((step) => {
      const title = step.title.trim();
      const price = Number(step.price || 0);
      return !title || price < PROPOSAL_STEP_MIN_PRICE;
    });

    if (invalidStep) {
      toast({
        title: 'Etapa inválida',
        description: `A etapa ${invalidStep.originalIndex + 1} precisa ter título e valor mínimo de R$ ${PROPOSAL_STEP_MIN_PRICE.toFixed(2)}.`,
        variant: 'destructive',
      });
      return;
    }

    const valid: ProposalStep[] = filledSteps.map(({ originalIndex, ...step }) => step);

    if (valid.length < 1) {
      toast({
        title: 'Erro',
        description: `Adicione pelo menos 1 etapa com título e valor mínimo de R$ ${PROPOSAL_STEP_MIN_PRICE.toFixed(2)}.`,
        variant: 'destructive',
      });
      return;
    }

    if (providerReceivingMethod === "standard" && loadingReceivingAccounts) {
      toast({
        title: "Carteira em carregamento",
        description: "Aguarde as contas cadastradas carregarem antes de enviar a proposta.",
        variant: "destructive",
      });
      return;
    }

    if (providerReceivingMethod === "standard" && !selectedReceivingAccountId) {
      if (receivingAccounts.length === 0) {
        toast({
          title: "Conta obrigatória",
          description:
            "Você não tem bancos cadastrado para selecionar esse método, cadastre um no seu perfil.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Conta obrigatória",
        description:
          "Selecione uma conta cadastrada na sua carteira para usar o recebimento padrão.",
        variant: "destructive",
      });
      return;
    }

    // O dialog agora usa <input type="date"> e mantém ISO yyyy-mm-dd no estado.
    // Mantemos suporte a dd/mm/aaaa por compatibilidade com qualquer caller legado.
    const toIso = (value?: string) => {
      if (!value) return undefined;
      const trimmed = value.trim();
      if (!trimmed) return undefined;
      if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
      const parts = trimmed.split('/');
      if (parts.length === 3) {
        const [d, m, y] = parts;
        return `${y.length === 2 ? `20${y}` : y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
      return trimmed;
    };

    const payloadSteps: ProposalStepPayload[] = valid.map(step => ({
      title: step.title.trim(),
      price: step.price,
      startDate: toIso(step.startDate),
      endDate: toIso(step.endDate),
      payment_group_id: (step as any).paymentGroupId,
    }));
    setPendingProposalData({
      steps: payloadSteps,
      contractFile,
      receivingMethod: providerReceivingMethod,
      selectedReceivingAccountId,
      paymentGroups: groups,
    });
    openProposalSignatureDialog();
  };

  // ---------- handlers: detalhes / steps ----------
  // ---------- handlers: pagamentos adicionais ----------
  const normalizeAdditionalPayment = useCallback((rawPayment: any): AdditionalPayment => {
    const normalizedStatus = String(rawPayment?.status || "PENDING").toUpperCase();
    const allowedStatuses: AdditionalPayment["status"][] = [
      "PENDING",
      "ACCEPTED",
      "REFUSED",
      "PAID",
      "CANCELLED",
    ];
    const safeStatus = allowedStatuses.includes(
      normalizedStatus as AdditionalPayment["status"]
    )
      ? (normalizedStatus as AdditionalPayment["status"])
      : "PENDING";

    const linkedPayment = rawPayment?.payment
      ? {
          ...rawPayment.payment,
          id: Number(rawPayment.payment.id),
          status: String(rawPayment.payment.status || "").toUpperCase(),
        }
      : null;

    return {
      ...rawPayment,
      id: Number(rawPayment.id),
      ticket_id: Number(rawPayment.ticket_id),
      provider_id: Number(rawPayment.provider_id),
      contractor_id: Number(rawPayment.contractor_id),
      payment_id:
        rawPayment.payment_id === null || rawPayment.payment_id === undefined
          ? null
          : Number(rawPayment.payment_id),
      status: safeStatus,
      payment: linkedPayment,
    };
  }, []);

  const buildAdditionalDialogData = useCallback(
    (
      additionalPayment: AdditionalPayment,
      backendPayment: any,
      backendPix?: any,
      fallbackMethod?: PaymentMethod
    ) => {
      if (!backendPayment) return null;
      const method = ((backendPayment.method || fallbackMethod || "PIX") as string).toUpperCase() as PaymentMethod;
      return {
        payment_id: backendPayment.id,
        asaas_payment_id: backendPayment.asaas_payment_id,
        status: backendPayment.status,
        amount: Number(backendPayment.amount ?? additionalPayment.amount ?? 0),
        method,
        invoice_url:
          backendPayment.asaas_invoice_url || backendPayment.checkout_url,
        checkout_url:
          backendPayment.checkout_url || backendPayment.asaas_invoice_url,
        pix:
          method === "PIX"
            ? {
                copy_and_paste:
                  backendPix?.payload || backendPayment.pix_payload || undefined,
                qr_code_image:
                  backendPix?.image || backendPayment.pix_image || undefined,
                expires_at:
                  backendPix?.expires_at || backendPayment.pix_expires_at || undefined,
              }
            : undefined,
        boleto:
          method === "BOLETO"
            ? {
                digitable_line: backendPayment.boleto_barcode,
                pdf_url:
                  backendPayment.boleto_url || backendPayment.asaas_invoice_url,
                due_date: backendPayment.due_date,
              }
            : undefined,
      };
    },
    []
  );

  const loadAdditionalPayments = useCallback(async (ticketId: number) => {
    if (!ticketId) return;
    setLoadingAdditionalPayments(true);
    try {
      const response = await apiRequest("GET", `/additional-payments/ticket/${ticketId}`);
      if (response.ok) {
        const data = await response.json();
        const normalizedPayments = Array.isArray(data?.data)
          ? data.data.map((payment: any) => normalizeAdditionalPayment(payment))
          : [];
        setAdditionalPayments(normalizedPayments);
      } else {
        setAdditionalPayments([]);
      }
    } catch (error) {
      console.error("Erro ao carregar pagamentos adicionais:", error);
      setAdditionalPayments([]);
    } finally {
      setLoadingAdditionalPayments(false);
    }
  }, [normalizeAdditionalPayment]);

  useEffect(() => {
    if (!showAdditionalPaymentsListDialog || !selectedAdditionalPaymentsTicketId) {
      return;
    }
    void loadAdditionalPayments(selectedAdditionalPaymentsTicketId);
  }, [
    loadAdditionalPayments,
    selectedAdditionalPaymentsTicketId,
    showAdditionalPaymentsListDialog,
  ]);

  const handleCreateAdditionalPayment = useCallback(async (data: {
    ticket_id: number;
    title: string;
    description: string;
    amount: number;
  }) => {
    setIsCreatingAdditionalPayment(true);
    try {
      const response = await apiRequest("POST", "/additional-payments", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao criar pagamento adicional");
      }
      const result = await response.json();
      toast({
        title: "Sucesso",
        description: "Pagamento adicional criado com sucesso!",
        variant: "default",
      });
      // Recarregar pagamentos
      await loadAdditionalPayments(data.ticket_id);
      return result.data;
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar pagamento adicional",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsCreatingAdditionalPayment(false);
    }
  }, [loadAdditionalPayments, toast]);

  const handleAcceptAdditionalPayment = useCallback(async (id: number, method: string, cardToken?: string) => {
    const normalizedId = Number(id);
    setProcessingAdditionalPaymentId(normalizedId);
    try {
      const normalizedMethod = (method || "PIX").toUpperCase() as PaymentMethod;
      // O aceite JA gera a cobranca. Sem `card_token` a de cartao cai no checkout
      // hospedado, que aceita o campo de divisao e o ignora calado: o cliente pagaria e
      // a parte do profissional ficaria retida. O backend recusa, e e assim que deve ser.
      const response = await apiRequest("PATCH", `/additional-payments/${id}/respond`, {
        action: "accept",
        method: normalizedMethod,
        card_token: normalizedMethod === "CREDIT_CARD" ? cardToken : undefined,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao aceitar pagamento adicional");
      }
      const result = await response.json();
      const refreshedAdditionalPayment = result?.data?.additional_payment
        ? normalizeAdditionalPayment({
            ...result.data.additional_payment,
            payment: result?.data?.payment || null,
          })
        : null;
      const backendPayment = result?.data?.payment;

      setAdditionalPayments((prev) =>
        prev.map((payment) =>
          Number(payment.id) === normalizedId
            ? {
                ...payment,
                status: "ACCEPTED",
                payment_id: result?.data?.payment?.id ?? payment.payment_id,
                payment: backendPayment
                  ? {
                      ...backendPayment,
                      id: Number(backendPayment.id),
                      status: String(backendPayment.status || "").toUpperCase(),
                    }
                  : payment.payment ?? null,
              }
            : payment
        )
      );

      const resolvedTicketId = Number(
        result?.data?.additional_payment?.ticket_id ??
          result?.data?.ticket_id ??
          additionalPayments.find((payment) => Number(payment.id) === normalizedId)?.ticket_id ??
          selectedAdditionalPaymentsTicketId ??
          0
      );
      const currentPayment =
        refreshedAdditionalPayment ??
        additionalPayments.find((payment) => Number(payment.id) === normalizedId);

      if (resolvedTicketId) {
        await loadAdditionalPayments(resolvedTicketId);
      }
      
      toast({
        title: "Sucesso",
        description: "Pagamento adicional aceito! Gerando cobrança...",
        variant: "default",
      });
      
      // O backend já retorna pagamento/pix no aceite da cobrança adicional.
      if (currentPayment) {
        const dialogData = buildAdditionalDialogData(
          currentPayment,
          backendPayment,
          result?.data?.pix,
          normalizedMethod
        );

        setPaymentDialog({
          type: "additional",
          step: {
            id: currentPayment.id,
            ticket_id: currentPayment.ticket_id,
            title: currentPayment.title,
            price: Number(currentPayment.amount || 0),
          } as any,
          data: dialogData,
          method: normalizedMethod,
          loading: false,
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao aceitar pagamento adicional",
        variant: "destructive",
      });
    } finally {
      setProcessingAdditionalPaymentId(null);
    }
  }, [additionalPayments, buildAdditionalDialogData, loadAdditionalPayments, normalizeAdditionalPayment, selectedAdditionalPaymentsTicketId, toast]);

  const handleRefreshAdditionalPaymentStatus = useCallback(async (id: number) => {
    const normalizedId = Number(id);
    setProcessingAdditionalPaymentId(normalizedId);
    try {
      const response = await apiRequest("GET", `/additional-payments/${normalizedId}/refresh`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao verificar pagamento adicional");
      }
      const result = await response.json();
      const refreshedAdditionalPayment = result?.data?.additional_payment
        ? normalizeAdditionalPayment({
            ...result.data.additional_payment,
            payment: result?.data?.payment || null,
          })
        : null;

      if (refreshedAdditionalPayment) {
        setAdditionalPayments((prev) =>
          prev.map((payment) =>
            Number(payment.id) === normalizedId ? refreshedAdditionalPayment : payment
          )
        );
      }

      const resolvedTicketId = Number(
        refreshedAdditionalPayment?.ticket_id ??
          additionalPayments.find((payment) => Number(payment.id) === normalizedId)?.ticket_id ??
          selectedAdditionalPaymentsTicketId ??
          0
      );
      if (resolvedTicketId) {
        await loadAdditionalPayments(resolvedTicketId);
      }

      toast({
        title: "Status atualizado",
        description: result?.data?.paid
          ? "Pagamento confirmado."
          : "Pagamento ainda pendente.",
      });
      return result;
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível verificar o pagamento.",
        variant: "destructive",
      });
    } finally {
      setProcessingAdditionalPaymentId(null);
    }
  }, [additionalPayments, loadAdditionalPayments, normalizeAdditionalPayment, selectedAdditionalPaymentsTicketId, toast]);

  const handleResumeAdditionalPayment = useCallback(async (payment: AdditionalPayment) => {
    const normalizedId = Number(payment.id);
    setProcessingAdditionalPaymentId(normalizedId);
    try {
      let targetPayment = payment;
      let refreshedBackendPayment = payment.payment || null;

      try {
        const response = await apiRequest("GET", `/additional-payments/${normalizedId}/refresh`);
        if (response.ok) {
          const result = await response.json();
          if (result?.data?.additional_payment) {
            targetPayment = normalizeAdditionalPayment({
              ...result.data.additional_payment,
              payment: result?.data?.payment || null,
            });
            refreshedBackendPayment = result?.data?.payment || null;
            setAdditionalPayments((prev) =>
              prev.map((item) => (Number(item.id) === normalizedId ? targetPayment : item))
            );
          }
        }
      } catch (refreshError) {
        console.warn("Não foi possível atualizar status antes de continuar pagamento:", refreshError);
      }

      if (targetPayment.status === "PAID") {
        toast({
          title: "Pagamento já confirmado",
          description: "Esta cobrança adicional já foi paga.",
        });
        return;
      }

      const dialogData = buildAdditionalDialogData(
        targetPayment,
        refreshedBackendPayment,
        undefined,
        (refreshedBackendPayment?.method || "PIX") as PaymentMethod
      );

      if (!dialogData) {
        toast({
          title: "Cobrança sem dados de pagamento",
          description: "Não foi possível recuperar os dados desta cobrança. Tente verificar novamente.",
          variant: "destructive",
        });
        return;
      }

      setPaymentDialog({
        type: "additional",
        step: {
          id: targetPayment.id,
          ticket_id: targetPayment.ticket_id,
          title: targetPayment.title,
          price: Number(targetPayment.amount || 0),
        } as any,
        data: dialogData,
        method: (dialogData.method as PaymentMethod),
        loading: false,
      });
    } finally {
      setProcessingAdditionalPaymentId(null);
    }
  }, [buildAdditionalDialogData, normalizeAdditionalPayment, toast]);

  const handleRefuseAdditionalPayment = useCallback(async (id: number, reason: string) => {
    const normalizedId = Number(id);
    setProcessingAdditionalPaymentId(normalizedId);
    try {
      const response = await apiRequest("PATCH", `/additional-payments/${id}/respond`, {
        action: "refuse",
        reason,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao recusar pagamento adicional");
      }
      const result = await response.json();
      setAdditionalPayments((prev) =>
        prev.map((payment) =>
          Number(payment.id) === normalizedId
            ? {
                ...payment,
                status: "REFUSED",
                refusal_reason: reason,
              }
            : payment
        )
      );
      toast({
        title: "Sucesso",
        description: "Pagamento adicional recusado.",
        variant: "default",
      });
      const resolvedTicketId = Number(
        result?.data?.additional_payment?.ticket_id ??
          result?.data?.ticket_id ??
          additionalPayments.find((payment) => Number(payment.id) === normalizedId)?.ticket_id ??
          selectedAdditionalPaymentsTicketId ??
          0
      );
      if (resolvedTicketId) {
        await loadAdditionalPayments(resolvedTicketId);
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao recusar pagamento adicional",
        variant: "destructive",
      });
    } finally {
      setProcessingAdditionalPaymentId(null);
    }
  }, [additionalPayments, loadAdditionalPayments, selectedAdditionalPaymentsTicketId, toast]);

  const handleViewProposalDetails = async (ticketId: number) => {
    setShowProposalDetails(true);
    setLoadingSteps(true);
    setSelectedTicketSteps([]);
    try {
      const withPayments = await getStepsWithPayment(ticketId);
      setSelectedTicketSteps(withPayments);
      // Carregar pagamentos adicionais
      await loadAdditionalPayments(ticketId);
    } catch (e: any) {
      toast({
        title: 'Erro',
        description: e?.message || 'Não foi possível carregar os detalhes.',
        variant: 'destructive',
      });
    } finally {
      setLoadingSteps(false);
    }
  };
  const getStepsWithPayment = useCallback(
    async (ticketId: number) => {
      const steps = await getStepsForTicket(ticketId);
      return await Promise.all(
        (Array.isArray(steps) ? steps : []).map(async (s: any) => {
          try {
            const payRes = await apiRequest("GET", `/payments/steps/${s.id}`);
            if (!payRes.ok) return s;
            const payJson = await payRes.json();
            const paid = !!payJson?.data?.summary?.has_successful_payment;
            return { ...s, paid };
          } catch {
            return s;
          }
        })
      );
    },
    [getStepsForTicket]
  );

  useEffect(() => {
    if (!showProposalDetails || !selectedTicketSteps.length) return;
    const allPaid = selectedTicketSteps.every((s: any) => s.paid);
    if (allPaid) {
      void refetchTickets();
    }
  }, [selectedTicketSteps, showProposalDetails, refetchTickets]);

  const handleEditStep = (step: any) => {
    if (!step) return;
    const isSignatureStep = isSignatureContractStep(step);
    if (isSignatureStep) {
      toast({
        title: "Etapa protegida",
        description: "A etapa de assinatura não pode ser editada.",
        variant: "warning",
      });
      return;
    }
    setEditingStep(step.id);
    setEditStepData({ title: step.title, price: step.price });
  };
  const handleSaveStep = async () => {
    if (!editingStep) return;
    const ok = await updateStep(editingStep, {
      title: editStepData.title,
      price: editStepData.price,
    });
    if (ok) {
      setEditingStep(null);
      const updated = await getStepsForTicket(selectedTicketSteps[0]?.ticket_id);
      setSelectedTicketSteps(updated);
    }
  };
  const handleDeleteStep = async (stepId: number) => {
    const target = selectedTicketSteps.find((s) => s.id === stepId);
    const isSignatureStep = isSignatureContractStep(target);
    if (isSignatureStep) {
      toast({
        title: "Etapa protegida",
        description: "A etapa de assinatura não pode ser excluída.",
        variant: "warning",
      });
      return;
    }
    const ok = await deleteStep(stepId);
    if (ok) {
      const updated = await getStepsForTicket(selectedTicketSteps[0]?.ticket_id);
      setSelectedTicketSteps(updated);
    }
  };
  
  const handleMarkStepCompleted = async (
    stepId: number,
    password: string,
    ticketId: number,
    signatureMethod?: 'google',
  ) => markStepCompleted(stepId, password, ticketId, signatureMethod);

  const handleStartPhase = async (stepId: number) => {
    const step = selectedTicketSteps.find((s: any) => s.id === stepId);
    const ticket = tickets.find(
      (t: any) => t.id === (step as any)?.ticket_id
    );
    // No modo `standard` o cliente paga DEPOIS da entrega, e a cobrança só é liberada
    // com o projeto concluído. Exigir pagamento para iniciar fecha o ciclo em si mesmo:
    // sem pagar não começa, sem concluir não paga. Espelha `requiresPaymentBeforeWork`
    // do backend (services/payment/paymentTimingService), que olha SÓ o modo de
    // recebimento — não a preferência de parcelamento.
    const recebimento =
      ticket?.provider_receiving_method || ticket?.providerReceivingMethod;
    const pagaAntes = recebimento !== "standard";

    if (
      pagaAntes &&
      step &&
      !step.is_financially_cleared &&
      !step.paid &&
      Number(step.price || 0) > 0
    ) {
      toast({
        title: "Pagamento obrigatório",
        description: "A etapa só pode iniciar após a confirmação do pagamento.",
        variant: "warning",
      });
      return;
    }
    const ok = await updateStep(stepId, { status: 'em andamento' });
    if (ok) {
      const ticketId = selectedTicketSteps.find((s: any) => s.id === stepId)?.ticket_id;
      if (ticketId) {
        setSelectedTicketSteps(currentSteps =>
          currentSteps.map(s => (s.id === stepId ? { ...s, status: 'em andamento' } : s))
        );
        const updated = await getStepsWithPayment(ticketId);
        setSelectedTicketSteps(updated);
      }
    }
  };

  // Cliente REJEITA um step especifico
  const handleRejectStep = async (step: any) => {
    try {
      const ok = await rejectStep(step.id, step.ticket_id, step.indexInTicket);
      if (ok) {
        const updated = await getStepsForTicket(step.ticket_id);
        setSelectedTicketSteps(updated);
      }
      return ok;
    } catch (e: any) {
      toast({
        title: 'Erro',
        description: e?.message || 'Não foi possível recusar a etapa.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const handleFeedbackCreated = async (step: Step, comment: string, isProblem: boolean) => {
    if (!currentConversation?.id) return;
    const steps = selectedTicketSteps || [];
    const index = steps.findIndex((s: any) => s.id === step.id);
    const stepNumber = index >= 0 ? index + 1 : undefined;
    const title = step?.title?.trim();
    const snippet = comment.length > 160 ? `${comment.slice(0, 157)}...` : comment;
    const stepLabel = stepNumber ? `na etapa ${stepNumber}` : 'em uma etapa';
    const titleLabel = title ? ` (${title})` : '';
    const icon = isProblem ? '­ƒÜ¿' : '­ƒôØ';
    const contextLabel = isProblem ? 'problema relatado' : 'feedback adicionado';
    const messageContent = `${icon} Novo ${contextLabel} ${stepLabel}${titleLabel}: "${snippet}"`;
    void sendSystemMessage(messageContent);

    // se for problema, atualiza a lista de etapas para refletir rollback
    if (isProblem) {
      const ticketId =
        (step as any).ticket_id ??
        (step as any).ticketId ??
        selectedTicketSteps[0]?.ticket_id;

      // atualização otimista local: libera o botão pro prestador refazer
      setSelectedTicketSteps((prev = []) =>
        prev.map((s: any) =>
          s.id === step.id
            ? {
                ...s,
                confirm_freelancer: false,
                confirm_contractor: false,
                status: 'em andamento',
              }
            : s
        )
      );

      if (ticketId) {
        try {
          const updated = await getStepsForTicket(ticketId);
          setSelectedTicketSteps(updated);
        } catch (e) {
          console.warn('Falha ao atualizar etapas após problema relatado', e);
        }
      }
    }
  };

  // Cliente ACEITA step (precisa da senha vinda do Dialog)
  const handleAcceptStep = async (step: any, password: string, signatureMethod?: 'google') => {
    if (!step?.confirm_freelancer) {
      toast({
        title: 'Aguardando prestador',
        description: 'O prestador precisa marcar a etapa como concluída antes da sua aprovação.',
        variant: 'warning',
      });
      return false;
    }
    try {
      const ok = await acceptStep(step.id, password, signatureMethod);
      if (ok) {
        const updated = await getStepsWithPayment(step.ticket_id);
        setSelectedTicketSteps(updated);
        const refreshed = updated.find((s: any) => s.id === step.id) || step;
        const isPaid = (refreshed as any).paid || (refreshed as any).is_financially_cleared;
        toast({
          title: 'Etapa aceita',
          description: isPaid ? 'Etapa concluída com sucesso.' : 'Gere o pagamento para liberar a próxima etapa.',
        });
      }
      return ok;
    } catch (e: any) {
      toast({
        title: 'Erro',
        description: e?.message || 'Não foi possível aceitar a etapa.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const handleCopyPaymentCode = useCallback(
    async (code?: string, label: string = 'Código copiado') => {
      if (!code) return;
      try {
        await navigator.clipboard.writeText(code);
        toast({ title: label, description: 'Copiado para a área de transferência.' });
      } catch {
        toast({
          title: 'Não foi possível copiar',
          description: 'Copie manualmente o código exibido.',
          variant: 'destructive',
        });
      }
    },
    [toast]
  );

  const openPaymentModal = useCallback(
    (step: Step, type: 'step' | 'deposit' = 'step') => {
      setPaymentDialog({
        step,
        type,
        data: null,
        method: lastPaymentMethod,
        loading: false,
      });
    },
    [lastPaymentMethod]
  );

  const openGroupedPaymentModal = useCallback(
    (steps: Step[]) => {
      const uniqueSteps = (steps || []).filter(
        (step, index, list) =>
          step?.id &&
          list.findIndex((item) => item?.id === step.id) === index
      );
      if (!uniqueSteps.length) return;
      setGroupedPaymentDialog({
        steps: uniqueSteps,
        data: null,
        method: lastPaymentMethod,
        loading: false,
      });
    },
    [lastPaymentMethod]
  );

  /**
   * `cardToken` NAO e opcional na pratica quando o metodo e cartao: o backend recusa
   * (CARD_TOKEN_REQUIRED) cobranca de cartao sem token, porque sem ele a cobranca cai no
   * checkout hospedado, que aceita o campo de divisao e o IGNORA em silencio. Seria o
   * cliente pagando, a tela confirmando, e o profissional recebendo zero.
   * Quem produz o token e o CardForm, no proprio dialogo.
   */
  const requestPayment = useCallback(
    async (target: PaymentDialogState, installmentCount?: number, cardToken?: string) => {
      let endpoint: string;
      let description: string;

      if (target.type === "deposit") {
        endpoint = `/payments/tickets/${target.step.ticket_id}`;
        description = `Depósito em garantia do ticket #${target.step.ticket_id}`;
      } else if (target.type === "additional") {
        throw new Error(
          "A cobrança adicional já é gerada no aceite. Atualize a lista para ver os dados."
        );
      } else {
        endpoint = `/payments/steps/${target.step.id}`;
        description = `Pagamento da etapa "${target.step.title}"`;
      }

      const response = await apiRequest("POST", endpoint, {
        description,
        method: target.method,
        installment_count: target.method === "CREDIT_CARD" ? installmentCount : undefined,
        card_token: target.method === "CREDIT_CARD" ? cardToken : undefined,
      });

      let payload: any = {};
      try {
        payload = await response.json();
      } catch {
        payload = {};
      }

      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.message || "Não foi possível gerar o pagamento.");
      }

      return payload.data;
    },
    []
  );

  const requestGroupedPayment = useCallback(
    async (target: GroupedPaymentDialogState, installmentCount?: number, cardToken?: string) => {
      const stepIds = (target.steps || []).map((step) => step?.id).filter(Boolean);
      if (stepIds.length === 0) {
        throw new Error("Selecione ao menos uma etapa para pagamento.");
      }

      const ticketId = (target.steps[0] as any)?.ticket_id;
      const groupId = target.groupId || (target.steps[0] as any)?.group_id || (target.steps[0] as any)?.payment_group_id;

      let response;
      if (groupId) {
         response = await apiRequest("POST", `/payments/groups/${groupId}`, {
          description: `Pagamento do Grupo ${groupId}`,
          method: target.method,
          installment_count: target.method === "CREDIT_CARD" ? installmentCount : undefined,
          card_token: target.method === "CREDIT_CARD" ? cardToken : undefined,
        });
      } else {
        response = await apiRequest("POST", "/payments", {
          description: ticketId
            ? `Pagamento agrupado do ticket #${ticketId}`
            : "Pagamento agrupado de etapas",
          method: target.method,
          installment_count: target.method === "CREDIT_CARD" ? installmentCount : undefined,
          card_token: target.method === "CREDIT_CARD" ? cardToken : undefined,
          step_ids: stepIds,
        });
      }

      let payload: any = {};
      try {
        payload = await response.json();
      } catch {
        payload = {};
      }

      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.message || "Nao foi possivel gerar o pagamento.");
      }

      return payload.data;
    },
    []
  );

  const handleGeneratePayment = useCallback(async (installmentCount?: number, cardToken?: string) => {
    if (!paymentDialog) return;
    const current = paymentDialog;
    if (current.type === "additional") {
      toast({
        title: "Cobrança já gerada",
        description:
          "O pagamento adicional é criado no momento do aceite da cobrança.",
      });
      return;
    }
    setPaymentDialog({ ...current, loading: true });
    try {
      const data = await requestPayment(current, installmentCount, cardToken);
      setPaymentDialog((prev) => (prev ? { ...prev, data, loading: false } : prev));
      toast({
        title: `${paymentMethodLabels[current.method]} gerado`,
        description: "Exibindo os dados para pagamento.",
      });
    } catch (error: any) {
      setPaymentDialog((prev) => (prev ? { ...prev, loading: false } : prev));
      toast({
        title: "Erro ao gerar pagamento",
        description: error?.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    }
  }, [paymentDialog, requestPayment, toast, paymentMethodLabels]);

  const handleChangePaymentMethod = useCallback((method: PaymentMethod) => {
    setLastPaymentMethod(method);
    setPaymentDialog((prev) => {
      if (!prev) return prev;
      if (prev.type === "additional") {
        // No adicional o pagamento é criado no aceite; não limpamos os dados existentes.
        return { ...prev, method };
      }
      return { ...prev, method, data: null };
    });
  }, []);

  const handleGroupedPaymentMethodChange = useCallback((method: PaymentMethod) => {
    setLastPaymentMethod(method);
    setGroupedPaymentDialog((prev) => (prev ? { ...prev, method, data: null } : prev));
  }, []);

  const handleGenerateGroupedPayment = useCallback(async (installmentCount?: number, cardToken?: string) => {
    if (!groupedPaymentDialog) return;
    const current = groupedPaymentDialog;
    setGroupedPaymentDialog({ ...current, loading: true });
    try {
      const data = await requestGroupedPayment(current, installmentCount, cardToken);
      setGroupedPaymentDialog((prev) => (prev ? { ...prev, data, loading: false } : prev));
      toast({
        title: `${paymentMethodLabels[current.method]} gerado`,
        description: "Exibindo os dados para pagamento.",
      });
    } catch (error: any) {
      setGroupedPaymentDialog((prev) => (prev ? { ...prev, loading: false } : prev));
      toast({
        title: "Erro ao gerar pagamento",
        description: error?.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    }
  }, [groupedPaymentDialog, requestGroupedPayment, toast, paymentMethodLabels]);

  const handleClientPayStep = useCallback(
    async (step: Step) => {
      if (!step?.id) return;
      if (user?.type !== 'contratante') {
        toast({
          title: 'Acesso negado',
          description: 'Somente contratantes podem gerar pagamentos.',
          variant: 'destructive',
        });
        return;
      }

      const status = (step.status || "").toLowerCase();
      if (status === "recusado") {
        toast({
          title: "Etapa recusada",
          description: "Esta etapa não pode receber pagamento.",
          variant: "warning",
        });
        return;
      }

      let freshUser: any = user;
      try {
        if (user?.id) {
          const userRes = await apiRequest("GET", `/users/${user.id}`);
          if (userRes.ok) {
            const body = await userRes.json();
            freshUser = body?.user || freshUser;
          }
        }
      } catch {
        /* se falhar, usa os dados atuais */
      }

      const hasDocs =
        !!(freshUser as any)?.cpf?.trim?.() ||
        !!(freshUser as any)?.cnpj?.trim?.();
      if (!hasDocs) {
        toast({
          title: 'CPF/CNPJ obrigatório',
          description: 'Cadastre CPF ou CNPJ no seu perfil antes de gerar pagamento.',
          variant: 'destructive',
        });
        return;
      }

      openPaymentModal(step, "step");
      toast({
        title: "Gerar pagamento",
        description: "Escolha PIX, boleto ou cartão para finalizar o pagamento.",
      });
    },
    [openPaymentModal, toast, user]
  );

  const handlePaySteps = useCallback(
    async (steps: Step[]) => {
      const cleaned = Array.isArray(steps) ? steps.filter(Boolean) : [];
      if (!cleaned.length) return;

      const payableSteps = cleaned.filter((step: any) => {
        const isSignature = isSignatureContractStep(step);
        const paid = Boolean(step?.paid) || Boolean(step?.is_financially_cleared);
        const price = Number(step?.price) || 0;
        const rejected = (step?.status || "").toLowerCase() === "recusado";
        if (isSignature || paid || price <= 0 || rejected) return false;
        return true;
      });

      if (payableSteps.length !== cleaned.length) {
        toast({
          title: "Etapas inválidas",
          description: "Selecione apenas etapas pendentes e ainda não pagas.",
          variant: "warning",
        });
        return;
      }

      if (user?.type !== "contratante") {
        toast({
          title: "Acesso negado",
          description: "Somente contratantes podem gerar pagamentos.",
          variant: "destructive",
        });
        return;
      }

      const ticketId = (cleaned[0] as any)?.ticket_id;
      const mixedTickets = cleaned.some(
        (step) => (step as any)?.ticket_id !== ticketId
      );
      if (mixedTickets) {
        toast({
          title: "Etapas invalidas",
          description: "Selecione etapas do mesmo ticket.",
          variant: "destructive",
        });
        return;
      }

      const ticket = tickets.find((t: any) => t.id === ticketId);

      let freshUser: any = user;
      try {
        if (user?.id) {
          const userRes = await apiRequest("GET", `/users/${user.id}`);
          if (userRes.ok) {
            const body = await userRes.json();
            freshUser = body?.user || freshUser;
          }
        }
      } catch {
        /* se falhar, usa os dados atuais */
      }

      const hasDocs =
        !!(freshUser as any)?.cpf?.trim?.() ||
        !!(freshUser as any)?.cnpj?.trim?.();
      if (!hasDocs) {
        toast({
          title: "CPF/CNPJ obrigatorio",
          description: "Cadastre CPF ou CNPJ no seu perfil antes de gerar pagamento.",
          variant: "destructive",
        });
        return;
      }

      openGroupedPaymentModal(payableSteps);
      toast({
        title: "Gerar pagamento",
        description: "Escolha PIX, boleto ou cartao para finalizar o pagamento.",
      });
    },
    [openGroupedPaymentModal, tickets, toast, user]
  );

  const handleRefreshStepPayment = useCallback(
    async (step: Step) => {
      if (!step?.id) return;
      if (user?.type !== 'contratante') {
        toast({
          title: 'Acesso negado',
          description: 'Somente contratantes podem confirmar o pagamento.',
          variant: 'destructive',
        });
        return;
      }
      try {
        setPayingStepId(step.id);
        const response = await apiRequest('GET', `/payments/steps/${step.id}/refresh`);
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload?.success === false) {
          throw new Error(payload?.message || 'Não foi possível atualizar o pagamento.');
        }
        const ticketId = (step as any)?.ticket_id || (step as any)?.ticketId;
        if (ticketId) {
          const steps = await getStepsWithPayment(ticketId);
          setSelectedTicketSteps(steps);
          const allPaid = Array.isArray(steps) && steps.length > 0 && steps.every((s: any) => s.paid);
          if (allPaid) {
            await refetchTickets();
          }
        }
        toast({
          title: payload?.data?.paid ? 'Pagamento confirmado' : 'Pagamento ainda pendente',
          description: payload?.message || '',
        });
      } catch (error: any) {
        toast({
          title: 'Erro ao atualizar pagamento',
          description: error?.message || 'Tente novamente mais tarde.',
          variant: 'destructive',
        });
      } finally {
        setPayingStepId(null);
      }
    },
    [getStepsWithPayment, refetchTickets, toast, user]
  );

  const handleConfirmStepPayment = useCallback(
    async (stepId: number) => {
      if (!stepId) return;
      if (confirmingStepPaymentRef.current[stepId]) return;
      const step = selectedTicketSteps.find((s: any) => s.id === stepId);
      if (!step) return;

      confirmingStepPaymentRef.current = {
        ...confirmingStepPaymentRef.current,
        [stepId]: true,
      };
      setConfirmingStepPaymentIds((prev) => ({ ...prev, [stepId]: true }));

      try {
        await handleRefreshStepPayment(step);
      } finally {
        confirmingStepPaymentRef.current = {
          ...confirmingStepPaymentRef.current,
          [stepId]: false,
        };
        setConfirmingStepPaymentIds((prev) => ({ ...prev, [stepId]: false }));
      }
    },
    [handleRefreshStepPayment, selectedTicketSteps]
  );

  const handleDeleteTicket = useCallback(
    async (ticketId: number) => {
      const ticket = tickets.find((t: any) => t.id === ticketId);
      if (!ticket) {
        toast({
          title: 'Ticket não encontrado',
          description: 'Reabra a tela e tente novamente.',
          variant: 'destructive',
        });
        return;
      }
      const status = (ticket.status || '').toLowerCase();
      if (status === 'em andamento' || status === 'concluída') {
        toast({
          title: 'Ação não permitida',
          description: 'Não é possível excluir propostas já aceitas ou em andamento.',
          variant: 'destructive',
        });
        return;
      }
      if (ticket.has_linked_payments) {
        toast({
          title: 'Ação não permitida',
          description:
            'Não é possível excluir um contrato que já possui pagamento vinculado.',
          variant: 'destructive',
        });
        return;
      }
      try {
        setDeletingTicket(true);
        const ok = await deleteTicket(ticketId);
        if (ok) {
          toast({
            title: 'Proposta excluída',
            description: 'Ela não aparecerá mais na lista.',
          });
          setShowProposalDetails(false);
          setSelectedTicketSteps([]);
          await refetchTickets();
        }
      } catch (error: any) {
        toast({
          title: 'Erro ao excluir',
          description: error?.message || 'Não foi possível excluir a proposta.',
          variant: 'destructive',
        });
      } finally {
        setDeletingTicket(false);
      }
    },
    [deleteTicket, refetchTickets, tickets, toast]
  );

  const handleRefreshTicketPayment = useCallback(
    async (ticketId: number) => {
      try {
        const res = await apiRequest("GET", `/payments/tickets/${ticketId}/refresh`);
        const body = await res.json().catch(() => ({}));
        if (!res.ok || body?.success === false) {
          throw new Error(body?.message || "Não foi possível verificar o pagamento.");
        }
        await refetchTickets();
        const steps = await getStepsWithPayment(ticketId);
        setSelectedTicketSteps(steps);
        toast({
          title: body?.data?.paid ? "Pagamento confirmado" : "Pagamento pendente",
          description: body?.message || "",
        });
      } catch (error: any) {
        toast({
          title: "Pagamento nÆo encontrado",
          description: error?.message || "Nenhum pagamento registrado ainda. Tente novamente mais tarde.",
          variant: "warning",
        });
      }
    },
    [getStepsForTicket, refetchTickets, toast]
  );

  const handleToggleGroupedPayment = useCallback(
    async (ticketId: number, enabled: boolean) => {
      const previousValue = groupedPaymentEnabledByTicket[ticketId] ?? false;
      setGroupedPaymentEnabledByTicket((prev) => ({ ...prev, [ticketId]: enabled }));
      try {
        const res = await apiRequest("PATCH", `/ticket/${ticketId}`, {
          allow_grouped_payment: enabled,
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || body?.success === false) {
          throw new Error(body?.message || "Nao foi possivel atualizar.");
        }
        await refetchTickets();
      } catch (error: any) {
        setGroupedPaymentEnabledByTicket((prev) => ({
          ...prev,
          [ticketId]: previousValue,
        }));
        toast({
          title: "Erro ao atualizar permissao",
          description: error?.message || "Tente novamente mais tarde.",
          variant: "destructive",
        });
      }
    },
    [groupedPaymentEnabledByTicket, refetchTickets, toast]
  );

  useEffect(() => {
    if (!showProposalDetails || !selectedTicketSteps.length) return;
    const ticketId = (selectedTicketSteps[0] as any)?.ticket_id;
    if (!ticketId) return;
    const hasUnpaid = selectedTicketSteps.some((s: any) => !s.paid);
    if (!hasUnpaid) return;

    const interval = setInterval(async () => {
      try {
        // força sincronizar pagamentos no backend antes de ler
        await apiRequest("GET", `/payments/tickets/${ticketId}/refresh`);
        const steps = await getStepsWithPayment(ticketId);
        setSelectedTicketSteps(steps);
        const allPaid = Array.isArray(steps) && steps.length > 0 && steps.every((s: any) => s.paid);
        if (allPaid) {
          await refetchTickets();
        }
      } catch {
        /* ignore polling errors */
      }
    }, 5000);

    return () => clearInterval(interval); // Cleanup to prevent memory leaks
  }, [showProposalDetails, selectedTicketSteps, getStepsWithPayment, refetchTickets]);

  // ---------- handlers: recusar contrato ----------
  const handleRejectContract = async (ticketId: number) => {
    try {
      const steps = await getStepsForTicket(ticketId);
      const signatureStep = findSignatureContractStep(steps);
      const alreadySigned =
        signatureStep?.confirm_contractor ||
        (signatureStep?.status || '').toLowerCase() === 'concluido';

      if (alreadySigned) {
        toast({
          title: 'Contrato já assinado',
          description: 'Após a assinatura não é possível recusar a proposta.',
          variant: 'destructive',
        });
        return;
      }

      // Apenas cancela o ticket, não deleta - permite que seja refeito
      await updateTicketStatus(ticketId, 'cancelada');
      
      await sendSystemMessage(
        'Proposta recusada. O prestador pode enviar uma nova proposta.',
        'text',
        { ticket_id: ticketId, action: 'proposal_rejected' }
      );
      
      toast({
        title: 'Proposta recusada',
        description: 'O prestador pode enviar uma nova proposta.',
      });
      setShowProposalDetails(false);
    } catch (e: any) {
      toast({
        title: 'Erro',
        description: e?.message || 'Não foi possível recusar a proposta.',
        variant: 'destructive',
      });
    }
  };

  const resetSignatureDialogState = () => {
    setSignaturePassword('');
    setAckChecked(false);
    setShowPasswordField(false);
    setSignatureFlow(null);
    setSelectedTicketForSignature(null);
  };

  const openContractSignatureDialog = (ticket: any) => {
    if (!ticket) return;
    resetSignatureDialogState();
    setSelectedTicketForSignature(ticket);
    setSignatureFlow({
      type: 'contract',
      ticket,
      title: 'Assinatura Digital',
      description: `Confirme os termos e insira sua senha. ${signaturePasswordHint}`,
      confirmLabel: 'Assinar',
      agreeLabel: 'Prosseguir',
      passwordPlaceholder: 'Digite sua senha',
      requireAck: true,
    });
    setSignaturePassword('');
    setAckChecked(false);
    setShowPasswordField(false);
    setShowSignatureModal(true);
  };

  const openFreelancerStepSignature = (stepId: number, ticketId: number) => {
    resetSignatureDialogState();
    setSignatureFlow({
      type: 'step-complete',
      stepId,
      ticketId,
      title: 'Concluir etapa',
      description: `Confirme sua senha para concluir esta etapa. ${signaturePasswordHint}`,
      confirmLabel: 'Concluir etapa',
      passwordPlaceholder: 'Digite sua senha',
      requireAck: false,
    });
    setSignaturePassword('');
    setAckChecked(true);
    setShowPasswordField(true);
    setShowSignatureModal(true);
  };

  const openClientStepSignature = (
    step: any,
  ) => {
    resetSignatureDialogState();
    setSignatureFlow({
      type: 'step-accept',
      step,
      title: 'Aceitar etapa',
      description: `Informe sua senha para aceitar esta etapa. ${signaturePasswordHint}`,
      confirmLabel: 'Aceitar etapa',
      passwordPlaceholder: 'Digite sua senha',
      requireAck: false,
    });
    setSignaturePassword('');
    setAckChecked(true);
    setShowPasswordField(true);
    setShowSignatureModal(true);
  };

  const openProposalSignatureDialog = () => {
    resetSignatureDialogState();
    setSignatureFlow({
      type: 'proposal-first-step',
      title: 'Confirmar envio',
      description: `Informe sua senha para validar o contrato em PDF. ${signaturePasswordHint}`,
      confirmLabel: 'Enviar proposta',
      passwordPlaceholder: 'Digite sua senha',
      requireAck: false,
    });
    setAckChecked(true);
    setShowPasswordField(true);
    setShowSignatureModal(true);
  };

  const handleSignatureModalChange = (open: boolean) => {
    setShowSignatureModal(open);
    if (!open) {
      resetSignatureDialogState();
      setSigningDocument(false);
      setPendingProposalData(null);
      setSendingProposal(false);
    }
  };

  // ---------- handlers: assinatura (contrato) ----------
  const handleStartSignature = (ticket: any) => {
    if (!ticket) return;
    if (['concluída', 'concluida'].includes((ticket.status || '').toLowerCase())) {
      toast({
        title: 'Documento já assinado',
        description: 'Este documento já foi assinado.',
        variant: 'destructive',
      });
      return;
    }
    openContractSignatureDialog(ticket);
  };
  const handleAgreeAndAskPassword = () => {
    const requireAck = signatureFlow
      ? signatureFlow.requireAck ?? (signatureFlow.type === 'contract')
      : true;
    if (requireAck && !ackChecked) {
      toast({
        title: 'Confirmação necessária',
        description: 'Você deve concordar com os termos.',
        variant: 'destructive',
      });
      return;
    }
    setShowPasswordField(true);
  };
  /**
   * `metodo: 'google'` confirma sem senha, e por isso a checagem de senha obrigatoria
   * abaixo e pulada nesse caminho. O servidor confere o `provider` do usuario, entao
   * conta local nao consegue usar isso para assinar sem provar nada.
   */
  const handleConfirmSignature = async (metodo?: 'google') => {
    if (!signatureFlow) return;

    const requireAck =
      signatureFlow.requireAck ?? (signatureFlow.type === 'contract');
    const password = signaturePassword.trim();
    const semSenha = metodo === 'google';

    if (requireAck && !ackChecked) {
      toast({
        title: 'Confirmação necessária',
        description: 'Você deve concordar com os termos.',
        variant: 'destructive',
      });
      return;
    }

    if (!semSenha && !password) {
      toast({
        title: 'Senha obrigatória',
        description: 'Digite sua senha para continuar.',
        variant: 'destructive',
      });
      return;
    }

    if (signatureFlow.type === 'contract' && !selectedTicketForSignature) {
      toast({
        title: 'Contrato inválido',
        description: 'Não foi possível identificar o contrato para assinatura.',
        variant: 'destructive',
      });
      return;
    }

    setSigningDocument(true);

    try {
      if (signatureFlow.type === 'proposal-first-step') {
        if (!pendingProposalData || pendingProposalData.steps.length === 0) {
          toast({
            title: 'Dados inválidos',
            description: 'Não foi possível recuperar as etapas da proposta.',
            variant: 'destructive',
          });
          return;
        }
        setSendingProposal(true);
        try {
          const ok = await createProposal(
            pendingProposalData.steps,
            pendingProposalData.contractFile || undefined,
            password,
            pendingProposalData.receivingMethod,
            pendingProposalData.selectedReceivingAccountId,
            pendingProposalData.paymentGroups,
          );
          if (!ok) return;
          setShowSignatureModal(false);
          resetSignatureDialogState();
          setPendingProposalData(null);
          setShowProposalModal(false);
          // limpa o rascunho do localStorage e o state local
          clearProposalDraft();
          return;
        } finally {
          setSendingProposal(false);
        }
      }

      if (signatureFlow.type === 'contract') {
        const ticketId = selectedTicketForSignature!.id as number;
        const ok = await signContract(ticketId, password, {
          setStatus: true,
          signatureMethod: metodo,
        });
        if (!ok) return;

        toast({
          title: 'Documento assinado',
          description: 'O contrato foi assinado e registrado.',
        });
        setShowSignatureModal(false);
        resetSignatureDialogState();
        await handleViewPdf(ticketId);
        return;
      }

      if (signatureFlow.type === 'step-complete') {
        const ok = await handleMarkStepCompleted(
          signatureFlow.stepId,
          password,
          signatureFlow.ticketId,
          metodo,
        );
        if (ok === false) return;
        setShowSignatureModal(false);
        resetSignatureDialogState();
        return;
      }

      if (signatureFlow.type === 'step-accept') {
        const ok = await handleAcceptStep(signatureFlow.step, password, metodo);
        if (ok === false) return;
        setShowSignatureModal(false);
        resetSignatureDialogState();
      }
    } finally {
      setSigningDocument(false);
    }
  };

  const handleConfirmStepCompletion = async (stepId: number, password: string) => {
    await confirmFreelancerStep(stepId, password);
  };

  const inviteTicketRef = useRef<number | null>(null);
  useEffect(() => {
    const [, queryString] = location.split("?");
    if (!queryString) return;
    const params = new URLSearchParams(queryString);
    const view = params.get("view");
    const ticketParam = params.get("ticket");
    if (view !== "contract" || !ticketParam) return;
    const ticketId = Number(ticketParam);
    if (!Number.isFinite(ticketId) || ticketId <= 0) return;
    if (inviteTicketRef.current === ticketId) return;
    inviteTicketRef.current = ticketId;
    handleViewPdf(ticketId);
  }, [location, handleViewPdf]);

  // Lida com ?ticket=<id> SEM view=contract: destaca o card e, no celular, abre a aba Propostas
  const highlightTicketRef = useRef<number | null>(null);
  useEffect(() => {
    const [, queryString] = location.split("?");
    if (!queryString) return;
    const params = new URLSearchParams(queryString);
    const view = params.get("view");
    const ticketParam = params.get("ticket");
    // So age quando tem ticket mas NAO tem view=contract
    if (!ticketParam || view === "contract") return;
    const ticketId = Number(ticketParam);
    if (!Number.isFinite(ticketId) || ticketId <= 0) return;
    if (highlightTicketRef.current === ticketId) return;
    highlightTicketRef.current = ticketId;
    setHighlightTicketId(ticketId);
    setMobileTab('propostas');
  }, [location]);

  // Limpa o destaque apos 4 segundos
  useEffect(() => {
    if (!highlightTicketId) return;
    const timer = setTimeout(() => setHighlightTicketId(null), 4000);
    return () => clearTimeout(timer);
  }, [highlightTicketId]);

  const signatureRequiresAck = signatureFlow
    ? signatureFlow.requireAck ?? (signatureFlow.type === 'contract')
    : true;
  const signatureAgreeHandler = signatureRequiresAck
    ? handleAgreeAndAskPassword
    : () => setShowPasswordField(true);

  const handleViewProfile = useCallback(async () => {
    if (!currentConversation?.otherUser) return;
    const target = currentConversation.otherUser as any;
    if (target.is_hidden) {
      toast({
        title: "Perfil indisponível",
        description: "Este perfil está oculto no momento.",
      });
      return;
    }
    try {
      if (target.type === "prestador") {
        let providerId = target.provider_id;
        if (!providerId) {
          const res = await apiRequest("GET", `/providers/user/${target.id}`);
          if (res.ok) {
            const body = await res.json().catch(() => ({}));
            providerId =
              body?.provider?.provider_id ||
              body?.provider_id ||
              body?.id_provider;
          }
        }
        if (providerId) {
          setLocation(`/providers/${providerId}`);
          return;
        }
      }
      setLocation(`/user/${target.id}`);
    } catch {
      setLocation(`/user/${target.id}`);
    }
  }, [currentConversation?.otherUser, setLocation, toast]);

  return (
    <MessagesLayout>
      <div className="flex p-0 md:p-4 bg-gray-100 h-[calc(100dvh-58px)]">
        <div className={`flex flex-col h-full w-full md:w-80 bg-white border-r border-gray-200 ${processedCurrentConversation ? 'hidden md:flex' : 'flex'}`}>
          <ConversationsSidebar
            conversations={processedConversations}
            currentConversation={processedCurrentConversation}
            loading={loadingConversations}
            conversationsError={conversationsError}
            unreadMessageCount={unreadMessageCount}
            onSelectConversation={handleConversationClick}
          />
        </div>

        <div className={`flex-1 flex-col overflow-hidden w-full ${!processedCurrentConversation ? 'hidden md:flex' : 'flex'}`}>
          {processedCurrentConversation ? (
            <>
              <ConversationHeader
                conversation={processedCurrentConversation}
                canCreateProposal={canCreateProposal()}
                canViewProfile={!processedCurrentConversation.otherUser.is_hidden}
                onOpenProposal={() => setShowProposalModal(true)}
                onViewProfile={handleViewProfile}
                onBack={() => {
                  selectConversation(null as any); // hack to deselect
                  // Or navigate to /messages root if using router
                  setLocation('/messages');
                }}
              />
              {/* Abas de navegacao - visivel apenas abaixo de md */}
              <div
                className="flex md:hidden border-b border-gray-200 bg-white"
                role="tablist"
                aria-label="Seções da conversa"
              >
                <button
                  role="tab"
                  aria-selected={mobileTab === 'chat'}
                  data-testid="tab-conversa"
                  className={`flex-1 py-3 text-sm font-medium transition-colors focus:outline-none${mobileTab === 'chat' ? ' border-b-2 border-orange-500 text-orange-600' : ' text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setMobileTab('chat')}
                >
                  Conversa
                </button>
                <button
                  role="tab"
                  aria-selected={mobileTab === 'propostas'}
                  data-testid="tab-propostas"
                  className={`flex-1 py-3 text-sm font-medium transition-colors focus:outline-none${mobileTab === 'propostas' ? ' border-b-2 border-orange-500 text-orange-600' : ' text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setMobileTab('propostas')}
                >
                  Propostas ({tickets.length})
                </button>
              </div>

              <div className="flex-1 flex overflow-hidden">
                {/* ChatPanel: oculto no celular quando a aba ativa e Propostas */}
                <div className={`flex-1 flex flex-col overflow-hidden min-w-0${mobileTab === 'propostas' ? ' hidden md:flex' : ''}`}>
                  <ChatPanel
                    messages={processedMessages}
                    currentUserId={user?.id}
                    newMessage={newMessage}
                    sendingMessage={sendingMessage}
                    onMessageChange={setNewMessage}
                    onSendMessage={handleSendMessage}
                    messagesEndRef={messagesEndRef}
                    composerAction={
                      user?.type === "prestador" || user?.type === "contratante" ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              disabled={
                                isProcessingAdditionalPayment ||
                                additionalPaymentListTicketOptions.length === 0
                              }
                              className="border-orange-200 text-orange-700 hover:bg-orange-50 hover:text-orange-800"
                            >
                              <Plus className="h-4 w-4" />
                              <span className="sr-only">Ações adicionais</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent side="top" align="start" className="w-64">
                            {user?.type === "prestador" && (
                              <DropdownMenuItem
                                onClick={handleOpenCreateAdditionalPaymentDialog}
                                disabled={additionalPaymentCreateTicketOptions.length === 0}
                              >
                                <ReceiptText className="h-4 w-4" />
                                Criar pagamento adicional
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={handleOpenAdditionalPaymentsListDialog}
                              disabled={additionalPaymentListTicketOptions.length === 0}
                            >
                              <List className="h-4 w-4" />
                              Listar pagamentos adicionais
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled
                              className="text-gray-400"
                            >
                              <ImagePlus className="h-4 w-4" />
                              Adicionar imagem
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null
                    }
                  />
                </div>
                {/* ContractsPanel: oculto no celular quando a aba ativa e Conversa; largura total no celular */}
                <ContractsPanel
                  className={mobileTab === 'chat' ? 'hidden md:flex' : 'flex w-full md:w-80 md:flex-none'}
                  tickets={tickets}
                  ticketStepsMap={ticketStepsMap}
                  loadingTickets={loadingTickets}
                  canCreateProposal={canCreateProposal()}
                  sortTicketsDesc={sortTicketsDesc}
                  onOpenOlderContracts={() => setShowOlderTickets(true)}
                  onViewProposalDetails={handleViewProposalDetails}
                  onViewPdf={handleViewPdf}
                  onStartSignature={handleStartSignature}
                  onRejectProposal={handleRejectContract}
                  currentUserType={user?.type}
                  highlightTicketId={highlightTicketId}
                />
              </div>
            </>
          ) : (
            <EmptyConversationState />
          )}
        </div>
      </div>

      {/* ===== Modais ===== */}

      <NewProposalDialog
        open={showProposalModal}
        onOpenChange={setShowProposalModal}
        proposalSteps={proposalSteps}
        onAddStep={addProposalStep}
        onRemoveStep={removeProposalStep}
        onUpdateStep={updateProposalStep}
        onContractFileChange={handleContractFileChange}
        onSendProposal={handleSendProposal}
        sendingProposal={sendingProposal}
        receivingMethod={providerReceivingMethod}
        onReceivingMethodChange={setProviderReceivingMethod}
        receivingAccounts={receivingAccounts}
        loadingReceivingAccounts={loadingReceivingAccounts}
        selectedReceivingAccountId={selectedReceivingAccountId}
        onSelectedReceivingAccountIdChange={setSelectedReceivingAccountId}
        paymentGroups={paymentGroups}
        onPaymentGroupsChange={setPaymentGroups}
        draftRestoredFileName={draftRestoredName}
        onClearDraft={clearProposalDraft}
        showToast={({ title, description, variant }) =>
          toast({ title, description, variant: variant ?? 'default' })
        }
      />

      <ProposalDetailsDialog
        open={showProposalDetails}
        onOpenChange={v => {
          setShowProposalDetails(v);
          if (!v) {
            setEditingStep(null);
            setEditStepData({ title: '', price: 0 });
          }
        }}
        steps={selectedTicketSteps}
        loading={loadingSteps}
        userType={user?.type as 'prestador' | 'contratante' | undefined}
        tickets={tickets}
        ticketStatus={
          selectedTicketSteps[0]
            ? tickets.find((t: any) => t.id === selectedTicketSteps[0].ticket_id)?.status
            : undefined
        }
        paymentPreference="custom"
        providerReceivingMethod={
          selectedTicketSteps[0]
            ? tickets.find((t: any) => t.id === selectedTicketSteps[0].ticket_id)
                ?.provider_receiving_method || null
            : null
        }
        ticketId={selectedTicketSteps[0]?.ticket_id}
        ticketHasLinkedPayments={
          selectedTicketSteps[0]
            ? !!tickets.find((t: any) => t.id === selectedTicketSteps[0].ticket_id)
                ?.has_linked_payments
            : false
        }
        onDeleteTicket={handleDeleteTicket}
        deletingTicket={deletingTicket}
        onRefreshPayment={handleRefreshTicketPayment}
        onEditStep={step => handleEditStep(step)}
        onDeleteStep={id => handleDeleteStep(id)}
        editingStepId={editingStep}
        editStepData={editStepData}
        onEditStepDataChange={setEditStepData}
        onSaveStep={handleSaveStep}
        onCancelEdit={() => setEditingStep(null)}
        onMarkProviderCompleted={(id, ticketId) =>
          openFreelancerStepSignature(id, ticketId)
        }
        onStartPhase={handleStartPhase}
        onClientAccept={async (step) => {
          openClientStepSignature(step);
        }}

        onClientRejectStep={(step) => handleRejectStep(step)}
        onFeedbackCreated={handleFeedbackCreated}
        onPaySteps={handlePaySteps}
        onConfirmStepPayment={handleConfirmStepPayment}
        confirmingStepPaymentIds={confirmingStepPaymentIds}
        allowGroupedPayment={
          !!groupedPaymentEnabledByTicket[selectedTicketSteps[0]?.ticket_id ?? 0]
        }
        onToggleGroupedPayment={handleToggleGroupedPayment}
        payingStepId={payingStepId}
        currentIndex={(() => {
          const firstNotDone = selectedTicketSteps.findIndex(
            s => (s.status || '').toLowerCase() !== 'concluido',
          );
          return firstNotDone === -1
            ? Math.max(selectedTicketSteps.length - 1, 0)
            : firstNotDone;
        })()}
        onStartSignature={handleStartSignature}
        onOpenSignature={(ticketId: any) =>
          openContractSignatureDialog({ id: ticketId, status: 'pendente' })
        }
        onRejectContract={ticketId => handleRejectContract(ticketId)}
        additionalPayments={additionalPayments}
        loadingAdditionalPayments={loadingAdditionalPayments}
        onAcceptAdditionalPayment={handleAcceptAdditionalPayment}
        onRefuseAdditionalPayment={handleRefuseAdditionalPayment}
        onResumeAdditionalPayment={handleResumeAdditionalPayment}
        onRefreshAdditionalPaymentStatus={handleRefreshAdditionalPaymentStatus}
        isProcessingAdditionalPayment={isProcessingAdditionalPayment}
        processingAdditionalPaymentId={processingAdditionalPaymentId}
      />

      <CreateAdditionalPaymentDialog
        open={showCreateAdditionalPaymentDialog}
        onOpenChange={setShowCreateAdditionalPaymentDialog}
        ticketOptions={additionalPaymentCreateTicketOptions}
        onCreate={async (data) => {
          await handleCreateAdditionalPayment(data);
          setShowCreateAdditionalPaymentDialog(false);
        }}
        isCreating={isCreatingAdditionalPayment}
      />

      <AdditionalPaymentsListDialog
        open={showAdditionalPaymentsListDialog}
        onOpenChange={setShowAdditionalPaymentsListDialog}
        ticketOptions={additionalPaymentListTicketOptions}
        selectedTicketId={selectedAdditionalPaymentsTicketId}
        onSelectedTicketChange={setSelectedAdditionalPaymentsTicketId}
        ticketStatus={
          selectedAdditionalPaymentsTicketId
            ? tickets.find((t: any) => t.id === selectedAdditionalPaymentsTicketId)
                ?.status
            : undefined
        }
        payments={additionalPayments}
        userType={user?.type as 'prestador' | 'contratante' | undefined}
        onAccept={handleAcceptAdditionalPayment}
        onRefuse={handleRefuseAdditionalPayment}
        onResume={handleResumeAdditionalPayment}
        onRefreshStatus={handleRefreshAdditionalPaymentStatus}
        isProcessing={isProcessingAdditionalPayment}
        processingPaymentId={processingAdditionalPaymentId}
        loading={loadingAdditionalPayments}
      />

      <OlderContractsDialog
        open={showOlderTickets}
        onOpenChange={setShowOlderTickets}
        tickets={tickets
          .slice()
          .sort(sortTicketsDesc)
          .slice(2)
          .map((t: any, i: number) => (
            <ProposalCard
              key={t.id ?? `ticket-old-${i}`}
              ticket={t}
              steps={ticketStepsMap[t.id] || []}
              currentUserType={user?.type}
              onViewDetails={handleViewProposalDetails}
              onViewPdf={handleViewPdf}
              onStartSignature={handleStartSignature}
            />
          ))}
      />

      <SignatureDialog
        open={showSignatureModal}
        onOpenChange={handleSignatureModalChange}
        ackChecked={ackChecked}
        setAckChecked={setAckChecked}
        signaturePassword={signaturePassword}
        setSignaturePassword={setSignaturePassword}
        showPasswordField={showPasswordField}
        signingDocument={signingDocument}
        onAgree={signatureAgreeHandler}
        onConfirm={handleConfirmSignature}
        title={signatureFlow?.title}
        description={signatureFlow?.description}
        confirmLabel={signatureFlow?.confirmLabel}
        agreeLabel={signatureFlow?.agreeLabel}
        passwordPlaceholder={signatureFlow?.passwordPlaceholder}
        requireAck={signatureRequiresAck}
        signaturePasswordConfigured={(user as any)?.signature_password_configured === true}
        isGoogleAccount={isGoogleAccount}
        onConfirmWithGoogle={() => handleConfirmSignature('google')}
      />

      <GroupedPaymentDialog
        open={!!groupedPaymentDialog}
        onOpenChange={(open) => {
          if (!open) setGroupedPaymentDialog(null);
        }}
        steps={groupedPaymentDialog?.steps || []}
        data={groupedPaymentDialog?.data || null}
        method={groupedPaymentDialog?.method || lastPaymentMethod}
        loading={groupedPaymentDialog?.loading || false}
        onMethodChange={handleGroupedPaymentMethodChange}
        onGeneratePayment={handleGenerateGroupedPayment}
        onCopyCode={handleCopyPaymentCode}
      />

      <StepPaymentDialog
        dialog={paymentDialog}
        onOpenChange={(open) => {
          if (!open) setPaymentDialog(null);
        }}
        onChangeMethod={handleChangePaymentMethod}
        onGeneratePayment={handleGeneratePayment}
        onCopyPaymentCode={handleCopyPaymentCode}
      />

      <PdfViewerDialog
        open={showPdfViewer}
        onOpenChange={closePdfViewer}
        pdfUrl={pdfUrl}
        pdfBlob={pdfBlob}
        pdfFilename={pdfFilename}
        loading={loadingPdf}
        error={pdfError}
        onReload={() =>
          selectedTicketForPdf && handleViewPdf(selectedTicketForPdf)
        }
        onOpenNew={() => {
          if (pdfUrl) window.open(pdfUrl, '_blank', 'noopener,noreferrer');
        }}
        onDownload={downloadPdf}
        fullscreen={fullscreenPdf}
        setFullscreen={setFullscreenPdf}
      />
    </MessagesLayout>
  );
}
