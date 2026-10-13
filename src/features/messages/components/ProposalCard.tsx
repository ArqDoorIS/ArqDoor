import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Eye, FileText, Shield, CheckCircle, XCircle } from 'lucide-react';
import { formatTotalDurationFromDays } from '@/lib/utils';
import {
  findSignatureContractStep,
  isSignatureContractStep,
} from '@/constants/contracts';
import { useMemo } from 'react';
import {
  getContractWorkflowSummary,
  getWorkflowToneClasses,
} from '@/features/messages/utils/contractWorkflow';

interface ProposalCardProps {
  ticket: any;
  steps: any[];
  isLatest?: boolean;
  currentUserType?: string;
  highlighted?: boolean;
  onViewDetails: (ticketId: number) => void;
  onViewPdf: (ticket: any) => void;
  onStartSignature: (ticket: any) => void;
  onRejectProposal?: (ticketId: number) => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const calculateProposalTotal = (steps: any[]) =>
  steps.reduce((sum, step) => sum + (step.price || 0), 0);

const STATUS_CONFIG = {
  pendente: {
    label: 'Pendente',
    badgeClass: 'bg-orange-100 text-orange-800 border-orange-300',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    color: 'text-orange-700',
    icon: Clock,
  },
  'em andamento': {
    label: 'Em Andamento',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    color: 'text-blue-700',
    icon: Clock,
  },
  concluída: {
    label: 'Concluída',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    color: 'text-emerald-700',
    icon: CheckCircle,
  },
  cancelada: {
    label: 'Cancelada',
    badgeClass: 'bg-red-100 text-red-800 border-red-300',
    bg: 'bg-red-50',
    border: 'border-red-200',
    color: 'text-red-700',
    icon: XCircle,
  },
} as const;

const RECEIVING_METHOD_LABELS: Record<string, string> = {
  escrow: "Escrow",
  standard: "Padrão",
};

const PAYMENT_STATUS_CONFIG: Record<
  string,
  {
    label: string;
    containerClass: string;
    labelClass: string;
    dotClass: string;
  }
> = {
  awaiting_steps: {
    label: "Aguardando pagamento",
    containerClass: "border-sky-200 bg-sky-50",
    labelClass: "text-sky-800",
    dotClass: "bg-sky-500",
  },
  partial_steps: {
    label: "Pagamento parcial",
    containerClass: "border-indigo-200 bg-indigo-50",
    labelClass: "text-indigo-800",
    dotClass: "bg-indigo-500",
  },
  steps_paid: {
    label: "Pagamento finalizado",
    containerClass: "border-emerald-200 bg-emerald-50",
    labelClass: "text-emerald-800",
    dotClass: "bg-emerald-500",
  },
};

const getStatusConfig = (status?: string) => {
  const normalized = (status || '').toLowerCase() as keyof typeof STATUS_CONFIG;
  return STATUS_CONFIG[normalized] ?? STATUS_CONFIG.pendente;
};

const normalizeStatus = (value?: string) =>
  (value || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const getPaymentStatus = (ticket: any, steps: any[]) => {
  const raw =
    (ticket.payment_status || ticket.paymentStatus || "").toString().toLowerCase();
  if (raw && PAYMENT_STATUS_CONFIG[raw]) return raw;

  const payableSteps = (steps || []).filter((step) => {
    const price = Number(step?.price || 0);
    return !isSignatureContractStep(step) && price > 0;
  });
  if (payableSteps.length === 0) return "steps_paid";

  const paidCount = payableSteps.filter(
    (step) => step?.is_financially_cleared || step?.paid
  ).length;
  if (paidCount === 0) return "awaiting_steps";
  if (paidCount < payableSteps.length) return "partial_steps";
  return "steps_paid";
};

export function ProposalCard({
  ticket,
  steps,
  isLatest = false,
  currentUserType,
  highlighted = false,
  onViewDetails,
  onViewPdf,
  onStartSignature,
  onRejectProposal,
}: ProposalCardProps) {
  const total = useMemo(() => calculateProposalTotal(steps), [steps]);
  const cfg = getStatusConfig(ticket.status);
  const paymentStatusKey = getPaymentStatus(ticket, steps);
  const paymentCfg = PAYMENT_STATUS_CONFIG[paymentStatusKey];
  const receivingMethodKey = (ticket.provider_receiving_method || "escrow")
    .toString()
    .toLowerCase();
  const receivingMethodLabel =
    RECEIVING_METHOD_LABELS[receivingMethodKey] || "Escrow";
  const normalizedTicketStatus = normalizeStatus(ticket.status);
  const signatureStep = useMemo(() => {
    if (!steps?.length) return null;
    return findSignatureContractStep(steps);
  }, [steps]);
  const signatureStepSigned = Boolean(
    signatureStep?.confirm_contractor ||
      signatureStep?.confirmContractor ||
      signatureStep?.signature ||
      normalizeStatus(signatureStep?.status) === 'concluido'
  );
  const isTicketClosed = ['concluida', 'concluido', 'cancelado', 'cancelada'].includes(
    normalizedTicketStatus
  );
  const canSign =
    currentUserType === 'contratante' &&
    normalizedTicketStatus === 'pendente' &&
    !signatureStepSigned &&
    !isTicketClosed;

  const formattedDuration = formatTotalDurationFromDays(ticket.total_date);
  const workflowSummary = useMemo(
    () => getContractWorkflowSummary({ ticket, steps, currentUserType }),
    [ticket, steps, currentUserType]
  );
  const workflowToneClasses = getWorkflowToneClasses(workflowSummary.tone);

  return (
    <div
      data-ticket-id={ticket.id}
      data-testid="proposal-card"
      className={`flex flex-col justify-between p-3 shadow-sm border transition-all duration-200 hover:shadow-md ${cfg.bg} ${cfg.border}${highlighted ? ' ring-2 ring-orange-400 ring-offset-1' : ''}`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-1 rounded-lg bg-white shadow-sm">
            <cfg.icon className={`h-5 w-5 ${cfg.color}`} />
          </div>
          <h3 className="font-semibold text-gray-900">Proposta #{ticket.id}</h3>
        </div>
        <div className="flex shrink-0 items-start">
          <Badge className={cfg.badgeClass}>{cfg.label}</Badge>
        </div>
      </div>

      <div className="space-y-2">
        {paymentCfg && (
          <div className={`rounded-xl border px-3 py-2 ${paymentCfg.containerClass}`}>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Pagamento
            </div>
            <div className={`mt-1 flex items-center gap-2 ${paymentCfg.labelClass}`}>
              <span className={`h-2.5 w-2.5 rounded-full ${paymentCfg.dotClass}`} />
              <span className="text-sm font-semibold leading-tight">
                {paymentCfg.label}
              </span>
            </div>
          </div>
        )}

        <div className={`rounded-xl border px-3 py-3 ${workflowToneClasses.container}`}>
          <div
            className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${workflowToneClasses.label}`}
          >
            {workflowSummary.label}
          </div>
          <div className={`mt-1 text-sm font-semibold ${workflowToneClasses.title}`}>
            {workflowSummary.title}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            {workflowSummary.description}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">{steps.length} etapas</span>
          <span className="text-lg font-bold text-gray-900">
            {formatCurrency(total)}
          </span>
        </div>

        {formattedDuration && (
          <div className="flex items-center text-sm text-gray-600">
            <Clock className="h-4 w-4 mr-1.5 opacity-70" />
            Duração total: {formattedDuration}
          </div>
        )}
        <div className="text-xs text-gray-600">
          Cobrança: <span className="font-medium">Em garantia por grupos</span>
        </div>
        <div className="text-xs text-gray-600">
          Recebimento: <span className="font-medium">{receivingMethodLabel}</span>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails(ticket.id)}
            className="flex-1 min-w-[120px]"
          >
            <Eye className="h-4 w-4 mr-2" /> Detalhes
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewPdf(ticket)}
            className="flex-1 min-w-[120px]"
          >
            <FileText className="h-4 w-4 mr-2" /> Ver PDF
          </Button>
          {canSign && (
            <>
              <Button
                size="sm"
                onClick={() => onStartSignature(ticket)}
                className="bg-purple-600 hover:bg-purple-700 text-white flex-1 min-w-[160px]"
              >
                <Shield className="h-4 w-4 mr-2" /> Eu assino e confirmo os termos
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onRejectProposal?.(ticket.id)}
                className="flex-1 min-w-[120px]"
              >
                <XCircle className="h-4 w-4 mr-2" /> Recusar proposta
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
