import React from "react";
import { AdditionalPaymentCard } from "./AdditionalPaymentCard";
import { Receipt } from "lucide-react";
import type { AdditionalPayment } from "@/lib/Interfaces";
import type { PaymentMethod } from "@/features/messages/types";

type AdditionalPaymentListProps = {
  payments: AdditionalPayment[];
  userType?: "prestador" | "contratante";
  ticketStatus?: string;
  onAccept?: (id: number, method: PaymentMethod, cardToken?: string) => Promise<void>;
  onRefuse?: (id: number, reason: string) => Promise<void>;
  onResume?: (payment: AdditionalPayment) => Promise<void>;
  onRefreshStatus?: (id: number) => Promise<void>;
  isProcessing?: boolean;
  processingPaymentId?: number | null;
  loading?: boolean;
};

export function AdditionalPaymentList({
  payments,
  userType,
  ticketStatus,
  onAccept,
  onRefuse,
  onResume,
  onRefreshStatus,
  isProcessing = false,
  processingPaymentId = null,
  loading = false,
}: AdditionalPaymentListProps) {
  const isProvider = userType === "prestador";
  const isTicketActive =
    ticketStatus?.toLowerCase() === "em andamento";

  const isPaymentProcessing = (paymentId: number) => {
    if (processingPaymentId !== null) {
      return Number(paymentId) === Number(processingPaymentId);
    }
    return isProcessing;
  };

  // Separar por status
  const pendingPayments = payments.filter((p) => p.status === "PENDING");
  const acceptedPayments = payments.filter((p) => p.status === "ACCEPTED");
  const refusedPayments = payments.filter((p) => p.status === "REFUSED");
  const paidPayments = payments.filter((p) => p.status === "PAID");
  const otherPayments = payments.filter(
    (p) => !["PENDING", "ACCEPTED", "REFUSED", "PAID"].includes(p.status)
  );

  if (loading) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground">
        Carregando pagamentos adicionais...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Receipt className="h-5 w-5 text-brand-dark" />
        <h3 className="font-semibold text-lg">Pagamentos Adicionais</h3>
        {payments.length > 0 && (
          <span className="text-sm text-muted-foreground">({payments.length})</span>
        )}
      </div>

      {/* Lista de Pagamentos */}
      {payments.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-lg">
          {isProvider ? (
            <>
              <Receipt className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p>Nenhuma cobrança adicional criada ainda.</p>
              {isTicketActive && <p className="text-xs mt-1">Crie uma cobrança no chat.</p>}
            </>
          ) : (
            <>
              <Receipt className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p>Nenhuma cobrança adicional pendente.</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Pendentes */}
          {pendingPayments.length > 0 && (
            <div className="space-y-2">
              {pendingPayments.length > 1 && (
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Pendentes ({pendingPayments.length})
                </p>
              )}
              {pendingPayments.map((payment) => (
                <AdditionalPaymentCard
                  key={payment.id}
                  payment={payment}
                  userType={userType}
                  onAccept={onAccept}
                  onRefuse={onRefuse}
                  onResume={onResume}
                  onRefreshStatus={onRefreshStatus}
                  isProcessing={isPaymentProcessing(payment.id)}
                />
              ))}
            </div>
          )}

          {/* Aceitas */}
          {acceptedPayments.length > 0 && (
            <div className="space-y-2">
              {pendingPayments.length > 0 && (
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mt-4">
                  Aceitas ({acceptedPayments.length})
                </p>
              )}
              {acceptedPayments.map((payment) => (
                <AdditionalPaymentCard
                  key={payment.id}
                  payment={payment}
                  userType={userType}
                  onAccept={onAccept}
                  onRefuse={onRefuse}
                  onResume={onResume}
                  onRefreshStatus={onRefreshStatus}
                  isProcessing={isPaymentProcessing(payment.id)}
                />
              ))}
            </div>
          )}

          {/* Pagas */}
          {paidPayments.length > 0 && (
            <div className="space-y-2">
              {(pendingPayments.length > 0 || acceptedPayments.length > 0) && (
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mt-4">
                  Pagas ({paidPayments.length})
                </p>
              )}
              {paidPayments.map((payment) => (
                <AdditionalPaymentCard
                  key={payment.id}
                  payment={payment}
                  userType={userType}
                  onAccept={onAccept}
                  onRefuse={onRefuse}
                  onResume={onResume}
                  onRefreshStatus={onRefreshStatus}
                  isProcessing={isPaymentProcessing(payment.id)}
                />
              ))}
            </div>
          )}

          {/* Recusadas */}
          {refusedPayments.length > 0 && (
            <div className="space-y-2">
              {(pendingPayments.length > 0 ||
                acceptedPayments.length > 0 ||
                paidPayments.length > 0) && (
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mt-4">
                  Recusadas ({refusedPayments.length})
                </p>
              )}
              {refusedPayments.map((payment) => (
                <AdditionalPaymentCard
                  key={payment.id}
                  payment={payment}
                  userType={userType}
                  onAccept={onAccept}
                  onRefuse={onRefuse}
                  onResume={onResume}
                  onRefreshStatus={onRefreshStatus}
                  isProcessing={isPaymentProcessing(payment.id)}
                />
              ))}
            </div>
          )}

          {/* Outros status */}
          {otherPayments.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mt-4">
                Outros ({otherPayments.length})
              </p>
              {otherPayments.map((payment) => (
                <AdditionalPaymentCard
                  key={payment.id}
                  payment={payment}
                  userType={userType}
                  onAccept={onAccept}
                  onRefuse={onRefuse}
                  onResume={onResume}
                  onRefreshStatus={onRefreshStatus}
                  isProcessing={isPaymentProcessing(payment.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
