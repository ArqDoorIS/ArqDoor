import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { formatPrice, formatDate } from "@/lib/utils";
import { CheckCircle, XCircle, Clock, DollarSign, Loader2, RefreshCcw } from "lucide-react";
import type { AdditionalPayment } from "@/lib/Interfaces";
import type { PaymentMethod } from "@/features/messages/types";
import { CardForm } from "@/features/payments/components/CardForm";
import { cartaoDisponivel } from "@/lib/pagarme";

const PAID_PAYMENT_STATUSES = [
  "PAID",
  "RECEIVED",
  "RECEIVED_IN_CASH",
  "RECEIVED_MANUALLY",
  "CONFIRMED",
  "DUNNING_RECEIVED",
  "COMPENSATED",
];

const isPaidPaymentStatus = (status?: string) =>
  !!status && PAID_PAYMENT_STATUSES.includes(status.toUpperCase());

type AdditionalPaymentCardProps = {
  payment: AdditionalPayment;
  userType?: "prestador" | "contratante";
  /**
   * `cardToken` vem do CardForm e e obrigatorio quando o metodo e cartao: o backend
   * recusa cartao sem token, porque sem ele a cobranca cai no checkout hospedado, que
   * ignora a divisao com o profissional em silencio.
   */
  onAccept?: (id: number, method: PaymentMethod, cardToken?: string) => Promise<void>;
  onRefuse?: (id: number, reason: string) => Promise<void>;
  onResume?: (payment: AdditionalPayment) => Promise<void>;
  onRefreshStatus?: (id: number) => Promise<void>;
  isProcessing?: boolean;
};

const STATUS_CONFIG: Record<
  AdditionalPayment["status"],
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }
> = {
  PENDING: {
    label: "Pendente",
    variant: "outline",
    icon: Clock,
  },
  ACCEPTED: {
    label: "Aguardando pagamento",
    variant: "default",
    icon: CheckCircle,
  },
  REFUSED: {
    label: "Recusada",
    variant: "destructive",
    icon: XCircle,
  },
  PAID: {
    label: "Paga",
    variant: "default",
    icon: DollarSign,
  },
  CANCELLED: {
    label: "Cancelada",
    variant: "secondary",
    icon: XCircle,
  },
};

export function AdditionalPaymentCard({
  payment,
  userType,
  onAccept,
  onRefuse,
  onResume,
  onRefreshStatus,
  isProcessing = false,
}: AdditionalPaymentCardProps) {
  const [showRefuseModal, setShowRefuseModal] = useState(false);
  const [refuseReason, setRefuseReason] = useState("");
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("PIX");
  const refuseReasonId = `refuse-reason-${payment.id}`;
  const paymentMethodGroupName = `payment-method-${payment.id}`;

  const normalizedStatus = (payment.status || "PENDING") as AdditionalPayment["status"];
  const statusConfig = STATUS_CONFIG[normalizedStatus] ?? STATUS_CONFIG.PENDING;
  const StatusIcon = statusConfig.icon;
  const isClient = userType === "contratante";
  const canRespond = isClient && normalizedStatus === "PENDING" && !isProcessing;
  const paymentStatus = (payment.payment?.status || "").toUpperCase();
  const canResumePayment =
    isClient &&
    normalizedStatus === "ACCEPTED" &&
    !!payment.payment &&
    !isPaidPaymentStatus(paymentStatus) &&
    !isProcessing;

  const handleRefuse = async () => {
    if (!refuseReason.trim()) return;
    await onRefuse?.(payment.id, refuseReason.trim());
    setShowRefuseModal(false);
    setRefuseReason("");
  };

  const handleAccept = async (cardToken?: string) => {
    await onAccept?.(payment.id, selectedMethod, cardToken);
    setShowAcceptModal(false);
  };

  return (
    <>
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-sm">{payment.title}</h4>
              <Badge variant={statusConfig.variant} className="text-xs">
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{payment.description}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-brand-dark">
              {formatPrice(payment.amount)}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDate(payment.created_at)}
            </p>
          </div>
        </div>

        {payment.refusal_reason && normalizedStatus === "REFUSED" && (
          <div className="rounded-md bg-danger-bg border border-danger/30 p-2">
            <p className="text-xs font-medium text-danger-dark">Motivo da recusa:</p>
            <p className="text-xs text-danger-dark">{payment.refusal_reason}</p>
          </div>
        )}

        {canRespond && (
          <div className="flex gap-2 pt-2 border-t">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => setShowRefuseModal(true)}
              disabled={isProcessing}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Recusar
            </Button>
            <Button
              size="sm"
              className="flex-1 bg-brand hover:bg-brand-dark"
              onClick={() => setShowAcceptModal(true)}
              disabled={isProcessing}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Aceitar
            </Button>
          </div>
        )}

        {canResumePayment && (
          <div className="flex gap-2 pt-2 border-t">
            <Button
              size="sm"
              className="flex-1 bg-brand hover:bg-brand-dark"
              onClick={() => onResume?.(payment)}
              disabled={isProcessing}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Continuar pagamento
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onRefreshStatus?.(payment.id)}
              disabled={isProcessing}
            >
              <RefreshCcw className="h-4 w-4 mr-1" />
              Verificar
            </Button>
          </div>
        )}
      </div>

      {/* Modal de Recusar */}
      <Dialog open={showRefuseModal} onOpenChange={setShowRefuseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recusar Cobrança Adicional</DialogTitle>
            <DialogDescription>
              Informe o motivo da recusa desta cobrança.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={refuseReasonId}>
                Motivo da recusa <span className="text-danger-dark">*</span>
              </Label>
              <Textarea
                id={refuseReasonId}
                placeholder="Explique o motivo da recusa..."
                value={refuseReason}
                onChange={(e) => setRefuseReason(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRefuseModal(false);
                  setRefuseReason("");
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleRefuse}
                disabled={!refuseReason.trim() || isProcessing}
                variant="destructive"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  "Confirmar Recusa"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Aceitar */}
      <Dialog open={showAcceptModal} onOpenChange={setShowAcceptModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aceitar Cobrança Adicional</DialogTitle>
            <DialogDescription>
              Escolha a forma de pagamento para esta cobrança.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border p-3 bg-surface-soft">
              <p className="text-sm font-medium mb-1">{payment.title}</p>
              <p className="text-xs text-muted-foreground mb-2">{payment.description}</p>
              <p className="text-lg font-bold text-brand-dark">
                {formatPrice(payment.amount)}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Forma de pagamento</Label>
              <div className="grid gap-2">
                {/* Boleto saiu em 2026-09-09, por decisão do Vitor. Débito nunca chegou
                    a funcionar: a Pagar.me, gateway desde 2026-09-09, não trabalha com
                    ele, e a opção só produzia uma recusa depois da escolha. */}
                {[
                  { value: "PIX", label: "PIX" },
                  { value: "CREDIT_CARD", label: "Cartão de Crédito" },
                ].map((method) => (
                  <label
                    key={method.value}
                    className="flex items-center gap-2 p-3 rounded-md border cursor-pointer hover:bg-surface-soft"
                  >
                    <input
                      type="radio"
                      name={paymentMethodGroupName}
                      value={method.value}
                      checked={selectedMethod === method.value}
                      onChange={(e) =>
                        setSelectedMethod(e.target.value as PaymentMethod)
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{method.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Cartão: o aceite JÁ gera a cobrança, então os dados precisam vir aqui.
                Quem dispara é o formulário, depois de tokenizar. Nunca o botão comum. */}
            {selectedMethod === "CREDIT_CARD" && cartaoDisponivel() ? (
              <div className="rounded-md border p-3">
                <CardForm
                  total={Number(payment.amount || 0)}
                  enviando={isProcessing}
                  onToken={(cartao) => void handleAccept(cartao.token)}
                  onUsarPix={() => setSelectedMethod("PIX")}
                />
              </div>
            ) : null}

            {selectedMethod === "CREDIT_CARD" && !cartaoDisponivel() ? (
              <div className="space-y-2 rounded-md bg-danger-bg px-3 py-2">
                <p className="text-xs leading-relaxed text-danger-dark">
                  O pagamento com cartão está indisponível nesta versão do site. Use PIX
                  para concluir agora.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedMethod("PIX")}
                  className="border-danger/30 text-danger-dark hover:bg-danger-bg"
                >
                  Pagar com PIX
                </Button>
              </div>
            ) : null}

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowAcceptModal(false)}
              >
                Cancelar
              </Button>
              {selectedMethod === "CREDIT_CARD" ? null : (
                <Button
                  onClick={() => void handleAccept()}
                  disabled={isProcessing}
                  className="bg-brand hover:bg-brand-dark"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    "Aceitar e Gerar Pagamento"
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
