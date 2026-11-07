import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdditionalPaymentList } from "./AdditionalPaymentList";
import type { AdditionalPayment } from "@/lib/Interfaces";
import type { PaymentMethod } from "@/features/messages/types";
import type { AdditionalPaymentTicketOption } from "./CreateAdditionalPaymentDialog";

type AdditionalPaymentsListDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketOptions: AdditionalPaymentTicketOption[];
  selectedTicketId?: number | null;
  onSelectedTicketChange: (ticketId: number) => void;
  ticketStatus?: string;
  payments: AdditionalPayment[];
  userType?: "prestador" | "contratante";
  onAccept?: (id: number, method: PaymentMethod, cardToken?: string) => Promise<void>;
  onRefuse?: (id: number, reason: string) => Promise<void>;
  onResume?: (payment: AdditionalPayment) => Promise<void>;
  onRefreshStatus?: (id: number) => Promise<void>;
  isProcessing?: boolean;
  processingPaymentId?: number | null;
  loading?: boolean;
};

export function AdditionalPaymentsListDialog({
  open,
  onOpenChange,
  ticketOptions,
  selectedTicketId,
  onSelectedTicketChange,
  ticketStatus,
  payments,
  userType,
  onAccept,
  onRefuse,
  onResume,
  onRefreshStatus,
  isProcessing = false,
  processingPaymentId = null,
  loading = false,
}: AdditionalPaymentsListDialogProps) {
  const hasTicketOptions = ticketOptions.length > 0;
  const selectedValue = selectedTicketId ? String(selectedTicketId) : undefined;
  const isClient = userType === "contratante";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pagamentos Adicionais</DialogTitle>
          <DialogDescription>
            {isClient
              ? "Selecione a proposta para visualizar cobranças e escolher PIX ou cartão."
              : "Selecione a proposta para visualizar e responder cobranças adicionais."}
          </DialogDescription>
        </DialogHeader>

        {!hasTicketOptions ? (
          <div className="text-sm text-muted-foreground border rounded-lg p-4 bg-surface-soft">
            Nenhuma proposta encontrada para listar cobranças adicionais.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="additional-payment-ticket">Proposta</Label>
              <Select
                value={selectedValue}
                onValueChange={(value) => onSelectedTicketChange(Number(value))}
              >
                <SelectTrigger id="additional-payment-ticket">
                  <SelectValue placeholder="Selecione a proposta" />
                </SelectTrigger>
                <SelectContent>
                  {ticketOptions.map((option) => (
                    <SelectItem key={option.id} value={String(option.id)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <AdditionalPaymentList
              payments={payments}
              userType={userType}
              ticketStatus={ticketStatus}
              onAccept={onAccept}
              onRefuse={onRefuse}
              onResume={onResume}
              onRefreshStatus={onRefreshStatus}
              isProcessing={isProcessing}
              processingPaymentId={processingPaymentId}
              loading={loading}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
