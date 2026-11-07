// src/components/modals/ProposalDetailsDialog.tsx
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Shield,
  Check,
  X,
  MoreVertical,
  MessageCircle,
  AlertTriangle,
  QrCode,
  Loader2,
  Lock,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import * as React from "react"
import { Step } from "@/lib/Interfaces"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { formatDate } from "@/lib/utils"
import { useStepFeedbackActions } from "@/hooks/use-actions"
import { Textarea } from "@/components/ui/textarea"
import {
  SIGNATURE_STEP_TITLE,
  isSignatureContractStep,
} from "@/constants/contracts"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Timer } from "@/components/ui/timer"
import { AdditionalPaymentList } from "./AdditionalPaymentList"
import type { AdditionalPayment } from "@/lib/Interfaces"
import {
  getContractWorkflowSummary,
  getWorkflowToneClasses,
} from "@/features/messages/utils/contractWorkflow"

type ProposalDetailsDialogProps = {
  open: boolean
  onOpenChange: (v: boolean) => void
  steps: Step[]
  loading: boolean
  userType?: "prestador" | "contratante"
  tickets: any[]
  onMarkProviderCompleted: (stepId: number, ticketId: number) => void
  onEditStep: (step: Step) => void
  onDeleteStep: (stepId: number) => void
  editingStepId: number | null
  editStepData: { title: string; price: number }
  onEditStepDataChange: (data: { title: string; price: number }) => void
  onSaveStep: () => void
  onCancelEdit: () => void;
  onStartPhase: (stepId: number) => Promise<void>;
  onStartSignature: (ticket: any) => void
  onOpenSignature: (ticket: any) => void
  onRejectContract: (ticketId: number) => void
  onClientAccept: (step: Step) => Promise<void>
  onClientRejectStep: (step: Step) => Promise<boolean>
  onFeedbackCreated?: (step: Step, comment: string, isProblem: boolean) => void
  onPaySteps?: (steps: Step[]) => void
  payingStepId?: number | null
  onConfirmStepPayment?: (stepId: number) => void
  confirmingStepPaymentIds?: Record<number, boolean>
  currentIndex: number
  ticketStatus?: string
  ticketId?: number | null
  ticketHasLinkedPayments?: boolean
  onDeleteTicket?: (ticketId: number) => void
  deletingTicket?: boolean
  onRefreshPayment?: (ticketId: number) => void
  paymentPreference?: "custom" | null
  providerReceivingMethod?: "escrow" | "standard" | null
  allowGroupedPayment?: boolean
  onToggleGroupedPayment?: (ticketId: number, enabled: boolean) => void
  canPayStep?: (step: Step, allSteps: Step[]) => boolean
  // Pagamentos Adicionais
  additionalPayments?: any[]
  loadingAdditionalPayments?: boolean
  onAcceptAdditionalPayment?: (id: number, method: string) => Promise<void>
  onRefuseAdditionalPayment?: (id: number, reason: string) => Promise<void>
  onResumeAdditionalPayment?: (payment: AdditionalPayment) => Promise<void>
  onRefreshAdditionalPaymentStatus?: (id: number) => Promise<void>
  isProcessingAdditionalPayment?: boolean
  processingAdditionalPaymentId?: number | null
}

const normalizeStatus = (status?: string) => {
  if (!status) return '';
  return status.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  awaiting_steps: "Aguardando pagamento",
  partial_steps: "Pagamento parcial",
  steps_paid: "Pagamento finalizado",
};

const RECEIVING_METHOD_LABELS: Record<string, string> = {
  escrow: "Recebimento via Escrow",
  standard: "Recebimento padrão",
};

export function ProposalDetailsDialog({
  open,
  onOpenChange,
  steps,
  loading,
  userType,
  tickets,
  onMarkProviderCompleted,
  onEditStep,
  onDeleteStep,
  editingStepId,
  editStepData,
  onEditStepDataChange,
  onSaveStep,
  onCancelEdit,
  onStartPhase,
  onStartSignature: _onStartSignature,
  onOpenSignature: _onOpenSignature,
  onRejectContract,
  onClientAccept,
  onClientRejectStep,
  onFeedbackCreated,
  onPaySteps,
  payingStepId,
  onConfirmStepPayment,
  confirmingStepPaymentIds,
  ticketStatus,
  ticketId,
  ticketHasLinkedPayments = false,
  onDeleteTicket,
  deletingTicket,
  onRefreshPayment,
  currentIndex: _currentIndex,
  paymentPreference = "custom",
  providerReceivingMethod = null,
  allowGroupedPayment = false,
  onToggleGroupedPayment,
  canPayStep,
  // Pagamentos Adicionais
  additionalPayments = [],
  loadingAdditionalPayments = false,
  onAcceptAdditionalPayment,
  onRefuseAdditionalPayment,
  onResumeAdditionalPayment,
  onRefreshAdditionalPaymentStatus,
  isProcessingAdditionalPayment = false,
  processingAdditionalPaymentId = null,
}: ProposalDetailsDialogProps) {
  const [feedbackModalStep, setFeedbackModalStep] = React.useState<Step | null>(null);
  const [feedbackModalType, setFeedbackModalType] = React.useState<'feedback' | 'problem'>('feedback');
  const [feedbackModalInput, setFeedbackModalInput] = React.useState("");
  const [editingFeedbackId, setEditingFeedbackId] = React.useState<number | null>(null);
  const [pendingRejectStep, setPendingRejectStep] = React.useState<Step | null>(null);

  const {
    feedbackData,
    isLoadingFeedback,
    createStepFeedback,
    updateStepFeedback,
    deleteStepFeedback,
    isCreatingFeedback,
    isUpdatingFeedback,
    isDeletingFeedback,
  } = useStepFeedbackActions(feedbackModalStep?.id);

  const activeTicket = tickets.find(t => t.id === ticketId);
  const currentTicketStatus = activeTicket?.status || ticketStatus;
  const displayPaymentPreference =
    paymentPreference ||
    (activeTicket as any)?.payment_preference ||
    (activeTicket as any)?.paymentPreference ||
    null;
  const paymentStatusKey = ((activeTicket as any)?.payment_status ||
    (activeTicket as any)?.paymentStatus ||
    "")
    .toString()
    .toLowerCase();
  const paymentStatusLabel = PAYMENT_STATUS_LABELS[paymentStatusKey];
  const paymentModeLabel = "Pagamento em garantia";
  const displayReceivingMethod =
    providerReceivingMethod ||
    (activeTicket as any)?.provider_receiving_method ||
    null;
  const receivingMethodLabel = displayReceivingMethod
    ? RECEIVING_METHOD_LABELS[displayReceivingMethod] || "Recebimento configurado"
    : null;
  const workflowSummary = React.useMemo(
    () =>
      getContractWorkflowSummary({
        ticket: activeTicket || { status: currentTicketStatus },
        steps,
        currentUserType: userType,
      }),
    [activeTicket, currentTicketStatus, steps, userType]
  );
  const workflowToneClasses = getWorkflowToneClasses(workflowSummary.tone);

  const isCustomPayment = true;
  const isStepPayment = true;
  const requiresSequentialPayment = false;
  const isProvider = userType === "prestador";

  const groupedSteps = React.useMemo(() => {
    if (steps.length === 0) return [];

    const groups: { id: string; name?: string; steps: Step[]; total: number; paid: boolean }[] = [];
    
    steps.forEach((step) => {
      let groupId = `step-${step.id}`;
      let groupName: string | undefined;

      if (isCustomPayment) {
        // Try group_sequence first (from invite), then group_id (from manual)
        const groupSeq = (step as any).group_sequence;
        const pgId = (step as any).group_id || (step as any).payment_group_id;

        if (groupSeq) {
          groupId = `group-seq-${groupSeq}`;
          groupName = `Grupo ${groupSeq}`;
        } else if (pgId) {
          groupId = `group-${pgId}`;
          const rawName = (step as any).payment_group?.name || (step as any).paymentGroup?.name;
          groupName = rawName || `Grupo ${pgId}`;
        } else {
          groupId = `step-${step.id}`;
        }
      }

      let group = groups.find(g => g.id === groupId);
      if (!group) {
        group = { id: groupId, name: groupName, steps: [], total: 0, paid: true };
        groups.push(group);
      }
      group.steps.push(step);
      group.total += Number(step.price || 0);
      
      const stepPaid = Boolean((step as any).is_financially_cleared) || Boolean((step as any).paid);
      if (!stepPaid && Number(step.price || 0) > 0 && !isSignatureContractStep(step)) {
        group.paid = false;
      }
    });

    return groups;
  }, [steps, isCustomPayment]);

  // Contagem de fases de pagamento concluídas para mostrar progresso no header.
  // Substitui o badge "Pagamento parcial" por uma informação mais útil.
  const paymentPhasesProgress = React.useMemo(() => {
    if (!groupedSteps.length) return null;
    const billable = groupedSteps.filter((g) => g.total > 0);
    if (!billable.length) return null;
    const paid = billable.filter((g) => g.paid).length;
    return { paid, total: billable.length };
  }, [groupedSteps]);

  // Itens da sidebar de progresso. Emite um badge "Grupo X — R$ Y" antes do
  // primeiro step de cada grupo, depois lista os steps na sequência.
  const progressSidebarItems = React.useMemo(() => {
    type SidebarItem =
      | { kind: "group"; key: string; name: string; total: number; paid: boolean }
      | { kind: "step"; key: string; step: Step; status: "concluido" | "andamento" | "pendente" };

    const items: SidebarItem[] = [];
    const seenGroups = new Set<string>();

    steps.forEach((step) => {
      const groupKey =
        (step as any).group_id ||
        (step as any).payment_group_id ||
        (step as any).group_sequence ||
        null;

      if (groupKey != null) {
        const gid = String(groupKey);
        if (!seenGroups.has(gid)) {
          seenGroups.add(gid);
          const group = groupedSteps.find((g) => {
            const stepGroup =
              (step as any).group_id ||
              (step as any).payment_group_id ||
              (step as any).group_sequence;
            return g.steps.some((s: any) => {
              const sg =
                (s as any).group_id ||
                (s as any).payment_group_id ||
                (s as any).group_sequence;
              return sg === stepGroup;
            });
          });
          if (group && group.total > 0) {
            items.push({
              kind: "group",
              key: `group-${gid}`,
              name: group.name || `Grupo ${gid}`,
              total: group.total,
              paid: group.paid,
            });
          }
        }
      }

      const normalizedStatus = String(step.status || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "");
      let status: "concluido" | "andamento" | "pendente" = "pendente";
      if (normalizedStatus === "concluido") status = "concluido";
      else if (normalizedStatus === "em andamento") status = "andamento";

      items.push({
        kind: "step",
        key: `step-${step.id}`,
        step,
        status,
      });
    });

    return items;
  }, [steps, groupedSteps]);

  // Total e duração do contrato pra exibir no rodapé da sidebar.
  const contractSummary = React.useMemo(() => {
    const total = steps.reduce((sum, s) => sum + Number(s.price || 0), 0);

    let durationDays: number | null = null;
    const dates = steps
      .flatMap((s) => [(s as any).start_date, (s as any).end_date])
      .filter(Boolean)
      .map((d) => new Date(d).getTime())
      .filter((t) => !Number.isNaN(t));

    if (dates.length >= 2) {
      const min = Math.min(...dates);
      const max = Math.max(...dates);
      durationDays = Math.max(1, Math.ceil((max - min) / (1000 * 60 * 60 * 24)));
    }

    return { total, durationDays };
  }, [steps]);


  const resetFeedbackModal = () => {
    setFeedbackModalStep(null);
    setFeedbackModalInput("");
    setEditingFeedbackId(null);
    setPendingRejectStep(null);
    setFeedbackModalType('feedback');
  };

  const openFeedbackModal = (step: Step, type: 'feedback' | 'problem', rejectAfterSubmit?: boolean) => {
    setFeedbackModalStep(step);
    setFeedbackModalType(type);
    setFeedbackModalInput("");
    setEditingFeedbackId(null);
    setPendingRejectStep(rejectAfterSubmit ? step : null);
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackModalStep || !feedbackModalInput.trim()) return;
    const isProblem = feedbackModalType === 'problem';
    let ok = false;
    if (editingFeedbackId) {
      ok = await updateStepFeedback(editingFeedbackId, feedbackModalInput.trim(), { isProblem });
    } else {
      ok = await createStepFeedback(feedbackModalStep.id, feedbackModalInput.trim(), { isProblem });
    }
    if (ok) {
      onFeedbackCreated?.(feedbackModalStep, feedbackModalInput.trim(), isProblem);
      setFeedbackModalInput("");
      setEditingFeedbackId(null);
      if (pendingRejectStep && pendingRejectStep.id === feedbackModalStep.id && isProblem) {
        await onClientRejectStep(pendingRejectStep);
        setPendingRejectStep(null);
      }
    }
  };

  const handleEditFeedback = (fb: any) => {
    setEditingFeedbackId(fb.id);
    setFeedbackModalInput(fb.comment || "");
  };

  const handleDeleteFeedback = async (fb: any) => {
    await deleteStepFeedback(fb.id);
    if (editingFeedbackId === fb.id) {
      setEditingFeedbackId(null);
      setFeedbackModalInput("");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => {
        onOpenChange(v);
      }}>
        <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <DialogTitle>Detalhes do Serviço</DialogTitle>
                <DialogDescription>Veja o status e as ações disponíveis para cada etapa.</DialogDescription>
              </div>
              {userType === "prestador" &&
                ticketId &&
                !ticketHasLinkedPayments &&
                ["pendente", "cancelada"].includes((ticketStatus || "").toLowerCase()) && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-2"
                    onClick={() => onDeleteTicket?.(ticketId)}
                    disabled={deletingTicket}
                  >
                    <Trash2 className="h-4 w-4" />
                    {deletingTicket ? "Excluindo..." : "Excluir proposta"}
                  </Button>
                )}
            </div>
            {(paymentModeLabel || receivingMethodLabel || paymentPhasesProgress) && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {paymentModeLabel && (
                  <Badge variant="outline">{paymentModeLabel}</Badge>
                )}
                {receivingMethodLabel && (
                  <Badge variant="outline">{receivingMethodLabel}</Badge>
                )}
                {paymentPhasesProgress && (
                  <span className="text-sm font-semibold text-ink-strong">
                    {paymentPhasesProgress.paid} de {paymentPhasesProgress.total} {paymentPhasesProgress.total === 1 ? "Fase" : "Fases"} de pagamento {paymentPhasesProgress.paid === 1 ? "realizada" : "realizadas"}
                  </span>
                )}
              </div>
            )}
            <div className={`mt-4 rounded-2xl border px-4 py-3 ${workflowToneClasses.container}`}>
              <div
                className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${workflowToneClasses.label}`}
              >
                {workflowSummary.label}
              </div>
              <div className={`mt-1 text-sm font-semibold ${workflowToneClasses.title}`}>
                {workflowSummary.title}
              </div>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {workflowSummary.description}
              </p>
            </div>
          </DialogHeader>

          <div className="flex-1 flex flex-col md:flex-row gap-4 overflow-hidden">
            {/* Sidebar de progresso — empilha em cima do conteúdo em mobile */}
            {steps.length > 0 && (
              <aside className="md:w-72 md:flex-shrink-0 md:overflow-y-auto rounded-xl border border-line bg-surface-soft/60 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-4">
                  Progresso
                </h3>
                <div>
                  {progressSidebarItems.map((item, idx) => {
                    const isLast = idx === progressSidebarItems.length - 1;

                    // Cor da linha: verde se a etapa atual está concluída
                    // (pinta o trecho até a próxima etapa). Caso contrário cinza.
                    const lineColorClass =
                      item.kind === "step" && item.status === "concluido"
                        ? "bg-success"
                        : item.kind === "group" && item.paid
                          ? "bg-success"
                          : "bg-line";

                    if (item.kind === "group") {
                      return (
                        <div key={item.key} className="relative flex items-stretch gap-3">
                          {/* Coluna da linha — mesma largura da coluna do dot pra alinhar */}
                          <div className="relative w-5 flex-shrink-0">
                            {!isLast && (
                              <div className={`absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 ${lineColorClass}`} />
                            )}
                          </div>
                          <div className="flex-1 py-2">
                            <div
                              className={`inline-block rounded-md px-2.5 py-1 text-xs font-medium ${
                                item.paid
                                  ? "bg-success-bg text-success-dark"
                                  : "bg-surface-warm text-muted-foreground"
                              }`}
                            >
                              {item.name} —{" "}
                              {new Intl.NumberFormat("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              }).format(item.total)}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    const dotClass =
                      item.status === "concluido"
                        ? "bg-success-dark border-success-dark text-white"
                        : item.status === "andamento"
                          ? "bg-info border-info"
                          : "bg-white border-line";

                    const statusLabel =
                      item.status === "concluido"
                        ? "Concluído"
                        : item.status === "andamento"
                          ? "Em andamento"
                          : "Pendente";

                    return (
                      <div key={item.key} className="relative flex items-stretch gap-3">
                        <div className="relative w-5 flex-shrink-0">
                          {/* Linha de cima — só renderiza se não é o primeiro item */}
                          {idx > 0 && (
                            <div
                              className={`absolute top-0 left-1/2 -translate-x-1/2 w-0.5 ${
                                progressSidebarItems[idx - 1].kind === "step" &&
                                (progressSidebarItems[idx - 1] as any).status === "concluido"
                                  ? "bg-success"
                                  : progressSidebarItems[idx - 1].kind === "group" &&
                                    (progressSidebarItems[idx - 1] as any).paid
                                    ? "bg-success"
                                    : "bg-line"
                              }`}
                              style={{ height: "calc(50% - 10px)" }}
                            />
                          )}
                          {/* Bolinha de status no centro vertical */}
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                            <div
                              className={`h-5 w-5 rounded-full border-2 flex items-center justify-center text-[10px] ${dotClass}`}
                            >
                              {item.status === "concluido" && "✓"}
                            </div>
                          </div>
                          {/* Linha de baixo — só renderiza se não é o último item */}
                          {!isLast && (
                            <div
                              className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-0.5 ${lineColorClass}`}
                              style={{ height: "calc(50% - 10px)" }}
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 py-2">
                          <p
                            className={`text-sm font-medium truncate ${
                              item.status === "pendente" ? "text-muted-foreground" : "text-ink-strong"
                            }`}
                            title={item.step.title}
                          >
                            {item.step.title}
                          </p>
                          <p className="text-xs text-muted-foreground">{statusLabel}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {(contractSummary.total > 0 || contractSummary.durationDays) && (
                  <div className="mt-6 pt-4 border-t border-line">
                    {contractSummary.total > 0 && (
                      <p className="text-xs text-muted-foreground">Total do contrato</p>
                    )}
                    {contractSummary.total > 0 && (
                      <p className="text-base font-semibold text-ink-strong">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(contractSummary.total)}
                      </p>
                    )}
                    {contractSummary.durationDays && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {contractSummary.durationDays} {contractSummary.durationDays === 1 ? "dia" : "dias"} de duração
                      </p>
                    )}
                  </div>
                )}
              </aside>
            )}

            <div className="flex-1 overflow-y-auto pr-2">

          {loading ? (
            <div className="text-center py-8">Carregando…</div>
          ) : steps.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Nenhuma etapa encontrada para este ticket.
            </div>
          ) : (
            <div className="space-y-4">
              {groupedSteps.map((group) => (
                <div key={group.id} className="space-y-2">
                  {isCustomPayment && group.name && (
                    <h3 className="text-base font-semibold text-ink-strong px-1">
                      {group.name}
                    </h3>
                  )}
                  <div
                    className={`space-y-2 ${
                      isCustomPayment
                        ? `border rounded-xl p-4 ${
                            group.paid ? "bg-success-bg border-success/30" : "bg-surface-soft"
                          }`
                        : ""
                    }`}
                  >
                  {isCustomPayment && group.total > 0 && (
                    <div className="mb-2 pb-2 border-b border-line flex justify-between items-center">
                      <span className="text-sm font-medium text-ink">
                        Total do grupo: {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL"
                        }).format(group.total)}
                      </span>

                      <div className="flex items-center gap-2">
                        {userType === "contratante" && !group.paid && (
                          <Button
                            size="sm"
                            className="bg-brand hover:bg-brand-dark text-white h-8"
                            onClick={() => onPaySteps?.(group.steps)}
                          >
                            <QrCode className="h-3.5 w-3.5 mr-1.5" />
                            Pagar Grupo
                          </Button>
                        )}
                        {userType === "contratante" && group.paid && (
                          <span className="text-sm text-success-dark flex items-center shrink-0" title="Pagamento realizado">
                            <CheckCircle className="h-4 w-4 mr-1" /> Pagamento realizado
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {group.steps.map((step) => {
                const index = steps.findIndex(s => s.id === step.id);
                const isSignatureStep = isSignatureContractStep(step)
                const signatureSigned =
                  isSignatureStep &&
                  ((step as any)?.confirm_contractor ||
                    (step as any)?.confirmContractor ||
                    ((step.status || "") as string).toLowerCase() === "concluido")
                const ticketIsActive = (currentTicketStatus || "").toLowerCase() === "em andamento"

                const paid =
                  Boolean((step as any).is_financially_cleared) ||
                  Boolean((step as any).paid);
               
              const prev = steps[index - 1];
                const prevIsSignature = !!(prev && isSignatureContractStep(prev));
                const prevDone = prev && ((prev.status || '').toLowerCase() === 'concluido' || ((prev as any).confirm_freelancer && (prev as any).confirm_contractor));
                const prevPaid = prevIsSignature
                  ? true
                  : Boolean((prev as any)?.is_financially_cleared || (prev as any)?.paid);             
                const prevBlocking = !!(
                  prev && (!prevDone || (requiresSequentialPayment && !prevPaid))
                );
                let prevBlockReason: string | null = null;
                if (prev && !prevDone) {
                  prevBlockReason = prevIsSignature ? 'Aguardando assinatura do contrato' : 'Aguardando a conclusão da etapa anterior';
                } else if (requiresSequentialPayment && prevDone && !prevPaid && !prevIsSignature) {
                  prevBlockReason = 'Aguardando pagamento do cliente.';
                }

                // helpers para auxiliar
                const isConcluded = (s: any) =>
                  normalizeStatus(s?.status) === 'concluido' ||
                  (s?.confirm_freelancer && s?.confirm_contractor);
                const providerMarkedDone = !!step.confirm_freelancer;

                // variáveis pra controle de bloqueio de botões de feedback/problema
                const reworks = Number((step as any).rework_count) || 0;
                const isRework = reworks > 0;
                
                // padroniza status
                const normalizedStatus = normalizeStatus(step.status);
                const status =
                  isRework && normalizedStatus === 'pendente'
                    ? 'em andamento'
                    : normalizedStatus;

                const stepConcluded = isConcluded(step);
                const stepPrice = Number(step.price || 0);
                const isRejected = status === "recusado";

                const statusLabel = isConcluded(step)
                  ? "Concluído"
                  : status === "em andamento"
                    ? "Em Andamento"
                  : status === "pendente"
                    ? "Pendente"
                    : status === "recusado"
                      ? "Recusado"
                      : "—"

                // adiciona cores de fundo com base no status da etapa
                  const stepBackgroundClass = (() => {
                    if (stepConcluded) return "bg-success-bg border-success/30";
                    if (isRejected) return "bg-danger-bg border-danger/30";
                    if (status === "em andamento") return "bg-info-bg border-info/30";
                    return "bg-white border-line";
                  })();

                // condições de bloqueio
                const needsPaymentToStart =
                  isCustomPayment &&
                  !paid &&
                  !isSignatureStep &&
                  stepPrice > 0;
                const waitingStart =
                  isStepPayment &&
                  !providerMarkedDone &&
                  status !== "recusado" &&
                  !isRework;
                const isBlocked = prevBlocking || waitingStart;

                return (
                  <div key={step.id} className={`border rounded-lg p-4 shadow-sm ${stepBackgroundClass}`}>
                    <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium">Etapa {index + 1}</h4>
                      </div>
                      <Badge variant="outline">{statusLabel}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDate((step as any).start_date)} – {formatDate((step as any).end_date)}
                    </p>
                    <p className="text-ink mb-2">{step.title}</p>
                    <p className="font-semibold text-lg">
                      {isSignatureStep
                        ? "Contrato PDF (sem custo)"
                        : new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL"
                          }).format(step.price || 0)}
                    </p>

                    {userType === "contratante" && paid && !group.paid &&(
                      <span className="mt-[10px] inline-block text-s text-success-dark" title="Etapa Paga">
                        <CheckCircle className="inline mr-1" /> Pagamento realizado
                      </span>
                    )}
                      
                    {/* Timer para etapa em andamento */}
                    {isStepPayment && (step as any).started_at && !stepConcluded && (
                      <Timer 
                        startDate={(step as any).started_at}
                        label="Tempo nesta etapa"
                        variant="compact"
                      />
                    )}
                    
                    {/* Timer para etapa concluída */}
                    {stepConcluded && (step as any).started_at && (
                      <Timer 
                        startDate={(step as any).started_at}
                        endDate={(step as any).updated_at}
                        variant="compact"
                      />
                    )}
                      
                    <div className="mt-3 flex flex-wrap gap-2">
                      {userType === "prestador" && !isSignatureStep && (() => {
                        if (requiresSequentialPayment && prev && !prevDone) {
                          return (
                            <div className="w-full">
                              <p className="text-sm text-muted-foreground mb-2">
                                {prevIsSignature ? 'Aguardando assinatura do contrato' : 'Aguardando a conclusão da etapa anterior.'}
                              </p>
                            </div>
                          )
                        }

                        if (requiresSequentialPayment && prevDone && !prevPaid && !prevIsSignature) {
                          return (
                            <div className="w-full">
                              <p className="text-sm text-muted-foreground mb-2">
                                Aguardando pagamento do cliente.
                              </p>
                            </div>
                          )
                        }

                        if (isCustomPayment && needsPaymentToStart && !providerMarkedDone) {
                          return (
                            <div className="w-full">
                              <p className="text-sm text-muted-foreground mb-2">
                                Aguardando pagamento do cliente para iniciar a etapa.
                              </p>
                            </div>
                          )
                        }

                        if (isStepPayment && status === 'em andamento' && !providerMarkedDone) {
                          const endDate = (step as any).end_date ? new Date((step as any).end_date) : null;
                          if (endDate) {
                            const now = new Date();
                            const diffTime = endDate.getTime() - now.getTime();
                            let countdownMessage: string;
                            if (diffTime > 0) {
                              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                              countdownMessage = `${diffDays} dia${diffDays !== 1 ? 's' : ''} até a data de entrega.`;
                            } else {
                              countdownMessage = "Prazo de entrega expirado.";
                            }
                            return (
                              <div className="w-full">
                                <p className="text-sm text-muted-foreground mb-2">{countdownMessage}</p>
                              </div>
                            );
                          }
                        }

                        if (providerMarkedDone && !isConcluded(step)) {
                          return (
                            <div className="w-full">
                              <p className="text-sm text-muted-foreground mb-2">
                                Aguardando a confirmação do cliente.
                              </p>
                            </div>
                          )
                        }

                        if (requiresSequentialPayment && (step as any).confirm_contractor && !paid) {
                          return (
                            <div className="w-full">
                              <p className="text-sm text-muted-foreground mb-2">
                                Aguardando pagamento do cliente.
                              </p>
                            </div>
                          )
                        }

                        return null
                      })()}

                      {userType === "prestador" && !isSignatureStep && (
                        <>
                          {!stepConcluded && !providerMarkedDone && (
                            isStepPayment && status === 'pendente' && !isRework ? (
                            <Button
                              size="sm"
                              className="bg-success-dark hover:bg-success-dark/90 text-white"
                              onClick={() => onStartPhase(step.id)}
                              disabled={!ticketIsActive || prevBlocking || needsPaymentToStart}
                              title={
                                needsPaymentToStart
                                  ? "Pagamento necessário para iniciar a etapa."
                                  : prevBlockReason || undefined
                              }
                            >
                              {prevBlocking ? <Lock className="h-4 w-4 mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                              Iniciar fase
                            </Button>
                            ) : (
                              <Button
                                size="sm"
                                className="bg-success-dark hover:bg-success-dark/90 text-white"
                                onClick={() => onMarkProviderCompleted(step.id, (step as any).ticket_id)}
                                disabled={
                                  !ticketIsActive ||
                                  needsPaymentToStart ||
                                  (status !== 'em andamento' && prevBlocking)
                                }
                                title={
                                  needsPaymentToStart
                                    ? "Pagamento necessário para iniciar a etapa."
                                    : status !== 'em andamento'
                                      ? prevBlockReason || undefined
                                      : undefined
                                }
                              >
                                {status !== 'em andamento' && prevBlocking ? <Lock className="h-4 w-4 mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                                {isRework ? `Concluir novamente (${reworks + 1}ª vez)` : 'Marcar como concluído'}
                              </Button>
                            )
                          )}

                        {/* mostrar os botões de feedback/problema só na etapa ativa ou em etapas já concluídas */}   
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openFeedbackModal(step, 'feedback')}
                              disabled={isBlocked || (!ticketIsActive && !stepConcluded)}
                            >
                              {isBlocked ? (
                                <Lock className="h-4 w-4 mr-2" />
                              ) : (
                                <MessageCircle className="h-4 w-4 mr-2" />
                              )}
                              Feedbacks
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              className="border-danger text-danger-dark hover:text-danger-dark hover:border-danger disabled:border-line disabled:text-muted-foreground"
                              onClick={() => openFeedbackModal(step, 'problem')}
                              disabled={isBlocked || (!ticketIsActive && !stepConcluded)}
                            >
                              {isBlocked ? (
                                <Lock className="h-4 w-4 mr-2" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 mr-2" />
                              )}
                              Problemas
                            </Button>
                          </>
                         
                         {/* O botão de editar não funciona */}
                          {userType === "prestador" && !isSignatureStep && ["pendente", "cancelada"].includes((currentTicketStatus || "").toLowerCase()) && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="sm" variant="outline">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => onEditStep(step)}>
                                    <Edit2 className="h-4 w-4 mr-2" /> Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-danger-dark"
                                    onClick={() => onDeleteStep(step.id)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" /> Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                          )}
                        </>
                      )}

                      {userType === "contratante" &&
                        isStepPayment &&
                        !isSignatureStep &&
                        !isSignatureStep &&
                        !paid &&
                        stepPrice > 0 &&
                        !isRejected &&
                        (isCustomPayment
                          ? false // Hide individual buttons for custom (group) payment
                          : canPayStep
                            ? canPayStep(step, steps)
                            : stepConcluded) && (
                          <>
                          <Button
                            size="sm"
                            className="bg-brand hover:bg-brand-dark text-white"
                            onClick={() => onPaySteps?.([step])}
                            // disabled={!ticketIsActive}
                          >
                            <QrCode className="h-4 w-4 mr-2" /> Pagar esta etapa
                          </Button>
                          <Button
                          className="bg-success-dark hover:bg-success-dark/90 text-white"
                            variant="outline"
                            onClick={() => onConfirmStepPayment?.(step.id)}
                            disabled={!!confirmingStepPaymentIds?.[step.id]}
                          >
                            {confirmingStepPaymentIds?.[step.id] ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4 mr-2" />
                            )}
                            Confirmar pagamento
                          </Button>
                          </>
                        )}

                      {userType === "contratante" && !isSignatureStep && (() => {
                        const prev = steps[index - 1]
                        const prevDone = prev && ((prev.status || '').toLowerCase() === "concluido" || (prev.confirm_freelancer && prev.confirm_contractor))

                        if (isRework && !providerMarkedDone && !isConcluded(step)) {
                          return (
                            <p className="text-sm text-muted-foreground">
                              Aguardando o prestador realizar uma reentrega.
                            </p>
                          );
                        }

                        if (isStepPayment && status === 'em andamento' && !providerMarkedDone) {
                          return (
                            <p className="text-sm text-muted-foreground">
                              Aguardando finalização do prestador.
                            </p>
                          );
                        }
                        if (prevDone && providerMarkedDone && !isConcluded(step)) {
                          return (
                            <div className="flex flex-col gap-2 w-full">
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  className="bg-success-dark hover:bg-success-dark/90 text-white"
                                  onClick={() => onClientAccept(step)}
                                  disabled={!ticketIsActive}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Aceitar Etapa
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => openFeedbackModal(step, 'problem', true)}
                                  disabled={!ticketIsActive}
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Relatar problema e recusar etapa
                                </Button>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openFeedbackModal(step, 'feedback')}
                                  disabled={!ticketIsActive}
                                >
                                  <MessageCircle className="h-4 w-4 mr-2" />
                                  Feedbacks
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-danger text-danger-dark hover:text-danger-dark hover:border-danger"
                                  onClick={() => openFeedbackModal(step, 'problem')}
                                  disabled={!ticketIsActive}
                                >
                                  <AlertTriangle className="h-4 w-4 mr-2" />
                                  Problemas
                                </Button>
                              </div> 
                            </div>
                          );
                        }

                        if (isConcluded(step) && (!isStepPayment || paid)) {
                          const conclusionDate = (step as any).updated_at || (step as any).updatedAt;
                          return (
                            <p className="text-sm text-success-dark font-medium">
                              Fase finalizada em: {conclusionDate ? formatDate(conclusionDate) : 'data indisponível'}.
                            </p>
                          );
                        }
                        
                        if (prevDone && !providerMarkedDone && status !== 'em andamento') {
                          return (
                            <p className="text-sm text-muted-foreground">
                              Aguardando o prestador iniciar a etapa.
                            </p>
                          );
                        }

                        return null
                      })()}

                      {userType === "prestador" && !isSignatureStep && (() => {
                        const prev = steps[index - 1]
                        const prevDone = prev && ((prev.status || '').toLowerCase() === "concluido" || (prev.confirm_freelancer && prev.confirm_contractor))

                        if (prevDone && providerMarkedDone && !isConcluded(step)) {
                          return null
                        }
                        return null
                      })()}

                      {userType === "contratante" && isSignatureStep && !signatureSigned && (currentTicketStatus || "").toLowerCase() === "pendente" && (() => {
                        const ticketId = (step as any)?.ticket_id;
                        return (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => ticketId && onRejectContract(ticketId)}
                            className="w-full"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Recusar proposta
                          </Button>
                        )
                      })()}

                      {userType === "contratante" && isSignatureStep && signatureSigned && (
                        <p className="text-sm text-muted-foreground">
                          Contrato assinado. Não é mais possível recusar esta proposta.
                        </p>
                      )}

                    </div>

                    {/* Editor inline */}
                    {editingStepId === step.id && (
                      <div className="mt-3 space-y-2">
                        <Input
                          value={editStepData.title}
                          onChange={(e) =>
                            onEditStepDataChange({
                              ...editStepData,
                              title: e.target.value
                            })
                          }
                          placeholder="Título da etapa"
                        />
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editStepData.price}
                          onChange={(e) =>
                            onEditStepDataChange({
                              ...editStepData,
                              price: parseFloat(e.target.value) || 0
                            })
                          }
                          placeholder="Valor"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={onSaveStep}>
                            <Check className="h-4 w-4 mr-2" /> Salvar
                          </Button>
                          <Button size="sm" variant="outline" onClick={onCancelEdit}>
                            <X className="h-4 w-4 mr-2" /> Cancelar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                )
                  })}
                </div>
              </div>
              ))}

              <div className="bg-surface-soft p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total:</span>
                  <span className="text-xl font-bold">
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL"
                    }).format(
                      steps.reduce((s, it) => s + (it.price || 0), 0)
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Seção de Pagamentos Adicionais */}
          {ticketId && currentTicketStatus?.toLowerCase() === "em andamento" && (
            <div className="mt-6 pt-6 border-t">
              <AdditionalPaymentList
                payments={additionalPayments}
                userType={userType}
                ticketStatus={currentTicketStatus}
                onAccept={onAcceptAdditionalPayment}
                onRefuse={onRefuseAdditionalPayment}
                onResume={onResumeAdditionalPayment}
                onRefreshStatus={onRefreshAdditionalPaymentStatus}
                isProcessing={isProcessingAdditionalPayment}
                processingPaymentId={processingAdditionalPaymentId}
                loading={loadingAdditionalPayments}
              />
            </div>
          )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!feedbackModalStep}
        onOpenChange={(open) => {
          if (!open) resetFeedbackModal();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {feedbackModalType === 'problem' ? 'Problemas da etapa' : 'Feedbacks da etapa'}{" "}
              {feedbackModalStep ? steps.findIndex(s => s.id === feedbackModalStep.id) + 1 : ''}
            </DialogTitle>
            <DialogDescription>{feedbackModalStep?.title}</DialogDescription>
          </DialogHeader>
          <div className="max-h-60 overflow-y-auto space-y-3 pr-2">
            {isLoadingFeedback ? (
              <p>Carregando...</p>
            ) : (() => {
              const filtered = (feedbackData || []).filter(fb =>
                feedbackModalType === 'problem' ? fb.isProblem : !fb.isProblem
              );
              if (filtered.length === 0) {
                return (
                  <p className="text-sm text-muted-foreground">
                    {feedbackModalType === 'problem'
                      ? 'Nenhum problema relatado para esta etapa.'
                      : 'Nenhum feedback encontrado para esta etapa.'}
                  </p>
                );
              }
              return filtered.map(fb => (
                <div
                  key={fb.id}
                  className={`border p-3 rounded-lg flex justify-between gap-3 ${
                    fb.isProblem
                      ? 'border-danger/30 bg-danger-bg text-danger-dark'
                      : 'border-line bg-surface-soft'
                  }`}
                >
                  <div>
                    <p className="text-sm">{fb.comment}</p>
                    <p className={`text-xs mt-1 ${fb.isProblem ? 'text-danger-dark/80' : 'text-muted-foreground'}`}>
                      {formatDate(fb.createdAt)}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {!isProvider ? (
                      <>
                        <Button variant="outline" size="sm" onClick={() => handleEditFeedback(fb)}>
                          Editar
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteFeedback(fb)}
                          disabled={isDeletingFeedback}
                        >
                          Excluir
                        </Button>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">Somente visualização</span>
                    )}
                  </div>
                </div>
              ));
            })()}
          </div>

          {!isProvider ? (
            <div className="space-y-3 pt-3 border-t">
              <p className="text-sm font-medium">
                {editingFeedbackId
                  ? `Editar ${feedbackModalType === 'problem' ? 'problema' : 'feedback'}`
                  : `Novo ${feedbackModalType === 'problem' ? 'problema' : 'feedback'}`}
              </p>
              <Textarea
                value={feedbackModalInput}
                onChange={(e) => setFeedbackModalInput(e.target.value)}
                placeholder={
                  feedbackModalType === 'problem'
                    ? 'Descreva o problema encontrado nesta etapa...'
                    : 'Deixe seu feedback sobre esta etapa...'
                }
                rows={4}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSubmitFeedback}
                  disabled={isCreatingFeedback || isUpdatingFeedback || !feedbackModalInput.trim()}
                >
                  {editingFeedbackId ? "Salvar alterações" : "Enviar"}
                </Button>
                {editingFeedbackId && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingFeedbackId(null);
                      setFeedbackModalInput("");
                    }}
                  >
                    Cancelar edição
                  </Button>
                )}
              </div>
              {pendingRejectStep && feedbackModalType === 'problem' && (
                <p className="text-xs text-danger-dark">
                  Ao enviar o problema a etapa será recusada automaticamente.
                </p>
              )}
            </div>
          ) : (
            <div className="pt-3 border-t">
              <p className="text-sm text-muted-foreground">Somente visualização — você não pode adicionar, editar ou excluir feedbacks.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
