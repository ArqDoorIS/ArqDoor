import { Link } from "wouter";
import {
  ClipboardList,
  RefreshCw,
  User,
  ArrowRight,
  CalendarDays,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { statusTone } from "@/lib/statusTone";
import { useKanban, type KanbanContract, type KanbanStep } from "@/hooks/use-kanban";
import { useAuth } from "@/hooks/use-auth";
import { getInitials } from "@/lib/utils";

/* ─── helpers ─────────────────────────────────────────────── */

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* ─── Column header ───────────────────────────────────────── */

interface ColHeaderProps {
  label: string;
  count: number;
  ponto: string;
}

function ColumnHeader({ label, count, ponto }: ColHeaderProps) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-3.5 rounded-t-xl border-b border-line bg-white text-ink-strong">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${ponto}`} aria-hidden="true" />
      <span className="font-semibold text-sm tracking-wide leading-none">{label}</span>
      <span className="ml-auto bg-surface-warm text-ink text-xs font-bold px-2.5 py-1 rounded-full min-w-[28px] text-center">
        {count}
      </span>
    </div>
  );
}

/* ─── Contract card ───────────────────────────────────────── */

function ContractCard({ item }: { item: KanbanContract }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-line p-5 flex flex-col gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 cursor-default">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-9 w-9 shrink-0 ring-2 ring-warning/30">
            <AvatarImage src={item.other_user?.perfil ?? undefined} className="object-cover" />
            <AvatarFallback className="text-xs bg-warning-bg text-warning-text font-semibold">
              {item.other_user ? getInitials(item.other_user.name) : <User className="w-4 h-4" />}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink-strong truncate leading-tight">
              {item.other_user?.name ?? "Usuário"}
            </p>
            <p className="text-xs text-muted-foreground capitalize leading-tight mt-0.5">
              {item.other_user?.type === "prestador" ? "Prestador" : "Cliente"}
            </p>
          </div>
        </div>
        <Badge variant="outline" className={`text-xs shrink-0 font-mono ${statusTone.aviso.selo}`}>
          #{item.ticket_id}
        </Badge>
      </div>

      {/* Status */}
      <div className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full shrink-0 ${statusTone.aviso.ponto}`} />
        <span className="text-xs text-muted-foreground font-medium capitalize">{item.ticket_status}</span>
      </div>

      {/* Date */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <CalendarDays className="w-3.5 h-3.5 shrink-0" />
        <span>Criado em {formatDate(item.created_at)}</span>
      </div>

      {/* Action */}
      <Link href="/messages">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs h-8 text-warning-text border-warning/30 hover:bg-warning-bg hover:border-warning/30 gap-1.5"
        >
          Ver conversa <ArrowRight className="w-3 h-3" />
        </Button>
      </Link>
    </div>
  );
}

/* ─── Step card ───────────────────────────────────────────── */

const variantConfig = {
  progress: { dot: statusTone.andamento.ponto, badge: statusTone.andamento.selo },
  done: { dot: statusTone.sucesso.ponto, badge: statusTone.sucesso.selo },
  "payment-pending": { dot: statusTone.aviso.ponto, badge: statusTone.aviso.selo },
  "payment-done": { dot: statusTone.sucesso.ponto, badge: statusTone.sucesso.selo },
} as const;

interface StepCardProps {
  item: KanbanStep;
  variant?: keyof typeof variantConfig;
}

function StepCard({ item, variant = "progress" }: StepCardProps) {
  const cfg = variantConfig[variant];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-line p-5 flex flex-col gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 cursor-default">
      {/* Title + ticket id */}
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-ink-strong leading-snug line-clamp-2 flex-1">
          {item.step_title}
        </p>
        <Badge variant="outline" className={`text-xs shrink-0 font-mono ${cfg.badge}`}>
          #{item.ticket_id}
        </Badge>
      </div>

      {/* Price */}
      {item.step_price > 0 && (
        <div className="flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-sm font-bold text-ink">
            {formatCurrency(item.step_price)}
          </span>
        </div>
      )}

      {/* Status dot */}
      <div className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
        <span className="text-xs text-muted-foreground font-medium">{item.step_status}</span>
      </div>

      {/* User */}
      <div className="flex items-center gap-2.5">
        <Avatar className="h-7 w-7 shrink-0 ring-1 ring-line">
          <AvatarImage src={item.other_user?.perfil ?? undefined} className="object-cover" />
          <AvatarFallback className="text-[10px] bg-surface-warm text-muted-foreground font-semibold">
            {item.other_user ? getInitials(item.other_user.name) : "?"}
          </AvatarFallback>
        </Avatar>
        <span className="text-xs text-muted-foreground truncate font-medium">
          {item.other_user?.name ?? "Usuário"}
        </span>
      </div>

      {/* Date */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <CalendarDays className="w-3.5 h-3.5 shrink-0" />
        <span>
          {item.started_at
            ? `Iniciado em ${formatDate(item.started_at)}`
            : `Criado em ${formatDate(item.created_at)}`}
        </span>
      </div>

      {/* Action */}
      <Link href="/messages">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs h-8 text-muted-foreground border-line hover:bg-surface-soft gap-1.5"
        >
          Ver contrato <ArrowRight className="w-3 h-3" />
        </Button>
      </Link>
    </div>
  );
}

/* ─── Empty state ─────────────────────────────────────────── */

function EmptyCol({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
      <div className="w-10 h-10 rounded-full bg-surface-warm flex items-center justify-center">
        <ClipboardList className="w-5 h-5 text-muted-foreground" />
      </div>
      <span className="text-xs text-muted-foreground text-center px-4">Sem itens em<br />"{label}"</span>
    </div>
  );
}

/* ─── Column skeleton ─────────────────────────────────────── */

function ColSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-3">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-36 w-full rounded-xl" />
      ))}
    </div>
  );
}

/* ─── Kanban column ───────────────────────────────────────── */

interface KanbanColumnProps {
  label: string;
  ponto: string;
  items: React.ReactNode[];
  isLoading: boolean;
}

function KanbanColumn({ label, ponto, items, isLoading }: KanbanColumnProps) {
  return (
    <div className="
      flex flex-col rounded-xl border border-line shadow-sm bg-surface-soft/80
      w-full
      sm:w-[calc(50%-8px)]
      lg:w-[calc(33.333%-11px)]
      xl:flex-1 xl:w-auto xl:min-w-0
      shrink-0 xl:shrink
    ">
      <ColumnHeader label={label} count={items.length} ponto={ponto} />
      <div className="flex-1 flex flex-col gap-3 p-3 overflow-y-auto"
           style={{ maxHeight: "calc(100vh - 196px)" }}>
        {isLoading ? (
          <ColSkeleton />
        ) : items.length === 0 ? (
          <EmptyCol label={label} />
        ) : (
          items
        )}
      </div>
    </div>
  );
}

/* ─── Main page ───────────────────────────────────────────── */

export default function KanbanPage() {
  const { user } = useAuth();
  const { kanban, isLoading, refetch } = useKanban();

  const columns: KanbanColumnProps[] = [
    {
      label: "Contratos Pendentes",
      ponto: statusTone.aviso.ponto,
      isLoading,
      items: kanban.pendingContracts.map((item) => (
        <ContractCard key={`contract-${item.ticket_id}`} item={item} />
      )),
    },
    {
      label: "Etapas em Andamento",
      ponto: statusTone.andamento.ponto,
      isLoading,
      items: kanban.stepsInProgress.map((item) => (
        <StepCard key={`step-prog-${item.step_id}`} item={item} variant="progress" />
      )),
    },
    {
      label: "Etapas Concluídas",
      ponto: statusTone.sucesso.ponto,
      isLoading,
      items: kanban.completedSteps.map((item) => (
        <StepCard key={`step-done-${item.step_id}`} item={item} variant="done" />
      )),
    },
    {
      label: "Pagamentos a Fazer",
      ponto: statusTone.aviso.ponto,
      isLoading,
      items: kanban.pendingPayments.map((item) => (
        <StepCard key={`pay-pend-${item.step_id}`} item={item} variant="payment-pending" />
      )),
    },
    {
      label: "Pagamentos Concluídos",
      ponto: statusTone.sucesso.ponto,
      isLoading,
      items: kanban.completedPayments.map((item) => (
        <StepCard key={`pay-done-${item.step_id}`} item={item} variant="payment-done" />
      )),
    },
  ];

  const totalItems =
    kanban.pendingContracts.length +
    kanban.stepsInProgress.length +
    kanban.completedSteps.length +
    kanban.pendingPayments.length +
    kanban.completedPayments.length;

  return (
    <div className="min-h-screen pt-20 pb-10">

      {/* Page header */}
      <div className="px-4 sm:px-6 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ink-strong">Kanban de Contratos</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {user?.type === "prestador"
                ? "Acompanhe o andamento dos seus contratos e etapas"
                : "Acompanhe o progresso dos serviços contratados"}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="flex items-center gap-1.5 text-muted-foreground"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Atualizar
          </Button>
        </div>

        {!isLoading && totalItems === 0 && (
          <div className="mt-6 rounded-xl border border-dashed border-line bg-white p-10 text-center">
            <ClipboardList className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">Nenhum contrato encontrado</p>
            <p className="text-muted-foreground text-sm mt-1">
              Quando você tiver contratos ativos, eles aparecerão aqui.
            </p>
            <Link href="/messages">
              <Button variant="default" size="sm" className="mt-4">
                Ir para Mensagens
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Kanban board — full width, horizontal scroll on narrow viewports */}
      {(isLoading || totalItems > 0) && (
        <div className="w-full overflow-x-auto px-4 sm:px-6">
          <div className="flex flex-wrap xl:flex-nowrap gap-4 min-w-0 pb-4">
            {columns.map((col) => (
              <KanbanColumn key={col.label} {...col} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
