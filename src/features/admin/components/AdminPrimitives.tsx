import type { ComponentType, ReactNode } from "react";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn, formatCompact } from "../utils";

type Tone = "emerald" | "amber" | "rose" | "slate" | "sky";

type StatusBadgeProps = {
  label: string;
  tone: Tone;
};

/**
 * Ícone "i" com a explicação ao passar o mouse (ou ao focar com o teclado). Usar só nos
 * pontos que pedem explicação, não em cada pedaço da tela (pedido do Rafael, 19/11/2026).
 */
export function Dica({ texto, className }: { texto: ReactNode; className?: string }) {
  return (
    <TooltipPrimitive.Provider delayDuration={150}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          <button type="button" aria-label="O que é isto?" className={cn("inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full align-middle text-slate-400 hover:text-orange-600 focus:text-orange-600 focus:outline-none", className)}>
            <Info className="h-3.5 w-3.5" />
          </button>
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content side="top" sideOffset={6} collisionPadding={12}
            className="z-[60] max-w-xs rounded-lg bg-slate-900 px-3 py-2 text-xs font-normal normal-case leading-relaxed tracking-normal text-white shadow-lg data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0">
            {texto}
            <TooltipPrimitive.Arrow className="fill-slate-900" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

type SectionCardProps = {
  title: string;
  /** explicação no ícone "i" ao lado do título */
  dica?: ReactNode;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

type StatCardProps = {
  label: string;
  value: number;
  helper: string;
  icon: ComponentType<{ className?: string }>;
  /**
   * Quando definido, o card vira clicável (botão) e ganha hover + cursor pointer.
   * Use para cards que representam "trabalho a fazer" (transferências prontas,
   * cobranças com problema, etc.).
   */
  onClick?: () => void;
  /**
   * "alert" pinta o card em amber (chama atenção). "danger" em rose.
   * "default" é o neutro de sempre.
   */
  tone?: "default" | "alert" | "danger";
  /**
   * Como formatar o valor (default: número formatado compacto).
   * "currency" usa formatação BRL.
   */
  valueFormat?: "compact" | "currency";
};

type EmptyStateProps = {
  title: string;
  description: string;
};

type PaginationControlsProps = {
  page: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
};

const badgeTone = (tone: Tone) =>
  ({
    emerald: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    amber: "bg-amber-100 text-amber-800 ring-amber-200",
    rose: "bg-rose-100 text-rose-700 ring-rose-200",
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
    sky: "bg-sky-100 text-sky-700 ring-sky-200",
  })[tone];

export function StatusBadge({ label, tone }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
        badgeTone(tone)
      )}
    >
      {label}
    </span>
  );
}

export function SectionCard({
  title,
  dica,
  subtitle,
  action,
  children,
  className,
}: SectionCardProps) {
  return (
    <section className={cn("rounded-2xl border border-slate-200 bg-white", className)}>
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-3 py-2">
        <div>
          <h2 className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-700">{title}{dica ? <Dica texto={dica} /> : null}</h2>
          {subtitle ? <p className="mt-0.5 text-[11px] text-slate-500">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      <div className="p-3">{children}</div>
    </section>
  );
}

const STAT_CARD_TONES: Record<NonNullable<StatCardProps["tone"]>, string> = {
  // default mantém slate neutro pra cards de contexto (métricas frias)
  default: "border-slate-200 bg-white",
  // alert = cor de marca ArqDoor — sinaliza "tem trabalho a fazer"
  alert: "border-orange-300 bg-orange-50",
  // danger = ações que precisam de atenção imediata
  danger: "border-rose-300 bg-rose-50",
};

const STAT_CARD_ICON_TONES: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "border-slate-200 bg-slate-50 text-slate-600",
  alert: "border-orange-200 bg-orange-100 text-orange-700",
  danger: "border-rose-200 bg-rose-100 text-rose-700",
};

const STAT_CARD_LABEL_TONES: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "text-slate-500",
  alert: "text-orange-700",
  danger: "text-rose-700",
};

const formatStatValue = (value: number, format?: StatCardProps["valueFormat"]) => {
  if (format === "currency") {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  }
  return formatCompact(value);
};

export function StatCard({
  label,
  value,
  helper,
  icon: Icon,
  onClick,
  tone = "default",
  valueFormat,
}: StatCardProps) {
  const isInteractive = typeof onClick === "function";
  const body = (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p
          className={cn(
            "text-[11px] font-medium uppercase tracking-wide",
            STAT_CARD_LABEL_TONES[tone]
          )}
        >
          {label}
        </p>
        <p className="mt-1 text-lg font-semibold tracking-tight text-slate-950">
          {formatStatValue(value, valueFormat)}
        </p>
        <p className="mt-0.5 text-[11px] text-slate-500 truncate">{helper}</p>
      </div>
      <div className={cn("rounded-lg border p-1.5", STAT_CARD_ICON_TONES[tone])}>
        <Icon className="h-3.5 w-3.5" />
      </div>
    </div>
  );

  const baseClasses = cn(
    "rounded-xl border p-2.5 transition",
    STAT_CARD_TONES[tone],
    isInteractive && "cursor-pointer hover:shadow-sm hover:-translate-y-0.5 text-left w-full"
  );

  if (isInteractive) {
    return (
      <button type="button" onClick={onClick} className={baseClasses}>
        {body}
      </button>
    );
  }

  return <div className={baseClasses}>{body}</div>;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
      <p className="text-base font-semibold text-slate-900">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">{description}</p>
    </div>
  );
}

export function PaginationControls({
  page,
  totalPages,
  onPrevious,
  onNext,
}: PaginationControlsProps) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm text-slate-500">
      <span>
        Página {page} de {totalPages}
      </span>
      <div className="flex gap-2">
        <button
          onClick={onPrevious}
          disabled={page <= 1}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </button>
        <button
          onClick={onNext}
          disabled={page >= totalPages}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 disabled:opacity-40"
        >
          Próxima
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
