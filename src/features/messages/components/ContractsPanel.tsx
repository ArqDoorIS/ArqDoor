import { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Loader2, FileText } from 'lucide-react';
import { ProposalCard } from './ProposalCard';
import { cn } from '@/lib/utils';

interface ContractsPanelProps {
  tickets: any[];
  ticketStepsMap: Record<number, any[]>;
  loadingTickets: boolean;
  canCreateProposal: boolean;
  sortTicketsDesc: (a: any, b: any) => number;
  onOpenOlderContracts: () => void;
  onViewProposalDetails: (ticketId: number) => void;
  onViewPdf: (ticket: any) => void;
  onStartSignature: (ticket: any) => void;
  onRejectProposal?: (ticketId: number) => void;
  currentUserType?: string;
  /** Id da proposta a destacar e rolar ate ela. Nulo = nenhuma. */
  highlightTicketId?: number | null;
  /** Classe extra aplicada ao elemento raiz (controla largura e visibilidade). */
  className?: string;
}

export function ContractsPanel({
  tickets,
  ticketStepsMap,
  loadingTickets,
  canCreateProposal,
  sortTicketsDesc,
  onOpenOlderContracts,
  onViewProposalDetails,
  onViewPdf,
  onStartSignature,
  onRejectProposal,
  currentUserType,
  highlightTicketId,
  className,
}: ContractsPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!highlightTicketId || !containerRef.current) return;
    const timer = setTimeout(() => {
      const el = containerRef.current?.querySelector(
        `[data-ticket-id="${highlightTicketId}"]`
      ) as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 80);
    return () => clearTimeout(timer);
  }, [highlightTicketId]);

  const sortedTickets = tickets.slice().sort(sortTicketsDesc);

  return (
    <div
      ref={containerRef}
      className={cn(
        'w-80 bg-white border-l border-gray-200 flex flex-col overflow-hidden',
        className
      )}
    >
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <FileText className="h-5 w-5" /> Propostas
        </h3>
      </div>

      <ScrollArea className="flex-1 p-4">
        {loadingTickets ? (
          <div className="text-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-600">Carregando propostas...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Nenhuma proposta ainda</p>
            {canCreateProposal && (
              <p className="text-xs text-gray-500 mt-1">
                Crie uma proposta para começar
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {sortedTickets
              .slice(0, 2)
              .map((ticket, index) => (
                <ProposalCard
                  key={ticket.id ?? `ticket-${index}`}
                  ticket={ticket}
                  steps={ticketStepsMap[ticket.id] || []}
                  isLatest={index === 0}
                  currentUserType={currentUserType}
                  highlighted={highlightTicketId != null && ticket.id === highlightTicketId}
                  onViewDetails={onViewProposalDetails}
                  onViewPdf={onViewPdf}
                  onStartSignature={onStartSignature}
                  onRejectProposal={onRejectProposal}
                />
              ))}
          </div>
        )}
      </ScrollArea>

      {tickets.length > 2 && (
        <div className="p-4 border-t border-gray-200">
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenOlderContracts}
          >
            Acessar outros contratos
          </Button>
        </div>
      )}
    </div>
  );
}
