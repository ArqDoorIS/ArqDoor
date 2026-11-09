import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import type { CreateAdditionalPaymentRequest } from "@/lib/Interfaces";

export type AdditionalPaymentTicketOption = {
  id: number;
  label: string;
};

type CreateAdditionalPaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketId?: number;
  ticketOptions?: AdditionalPaymentTicketOption[];
  onCreate: (data: CreateAdditionalPaymentRequest) => Promise<void>;
  isCreating?: boolean;
};

export function CreateAdditionalPaymentDialog({
  open,
  onOpenChange,
  ticketId,
  ticketOptions = [],
  onCreate,
  isCreating = false,
}: CreateAdditionalPaymentDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedTicketId, setSelectedTicketId] = useState(
    ticketId ? String(ticketId) : ticketOptions[0] ? String(ticketOptions[0].id) : ""
  );
  const [errors, setErrors] = useState<{
    ticketId?: string;
    title?: string;
    description?: string;
    amount?: string;
  }>({});

  useEffect(() => {
    if (!open) return;
    if (ticketId) {
      setSelectedTicketId(String(ticketId));
      return;
    }
    if (ticketOptions.length === 0) {
      setSelectedTicketId("");
      return;
    }
    setSelectedTicketId((prev) => {
      if (ticketOptions.some((option) => String(option.id) === prev)) {
        return prev;
      }
      return String(ticketOptions[0].id);
    });
  }, [open, ticketId, ticketOptions]);

  const hasFixedTicket = typeof ticketId === "number" && ticketId > 0;
  const hasTicketOptions = ticketOptions.length > 0;
  const hasAnyTicketAvailable = hasFixedTicket || hasTicketOptions;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação
    const newErrors: typeof errors = {};
    const resolvedTicketId = hasFixedTicket
      ? Number(ticketId)
      : Number(selectedTicketId);

    if (!resolvedTicketId || Number.isNaN(resolvedTicketId)) {
      newErrors.ticketId = "Selecione uma proposta para vincular a cobrança";
    }
    if (!title.trim()) {
      newErrors.title = "Título é obrigatório";
    }
    if (!description.trim()) {
      newErrors.description = "Descrição é obrigatória";
    }
    const amountValue = parseFloat(amount.replace(/[^\d,.-]/g, "").replace(",", "."));
    if (!amount || isNaN(amountValue) || amountValue < 5) {
      newErrors.amount = "Valor mínimo é R$ 5,00";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    await onCreate({
      ticket_id: resolvedTicketId,
      title: title.trim(),
      description: description.trim(),
      amount: amountValue,
    });

    // Limpar formulário após sucesso
    setTitle("");
    setDescription("");
    setAmount("");
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Permite apenas números, vírgula e ponto
    const cleaned = value.replace(/[^\d,.-]/g, "");
    setAmount(cleaned);
  };

  const amountValue = parseFloat(amount.replace(/[^\d,.-]/g, "").replace(",", ".")) || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Criar Cobrança Adicional</DialogTitle>
          <DialogDescription>
            Crie uma cobrança adicional e vincule a uma proposta em andamento.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">
                Título da cobrança <span className="text-danger-dark">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Ex: Taxa de urgência"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isCreating}
                className={errors.title ? "border-danger" : ""}
              />
              {errors.title && (
                <p className="text-sm text-danger-dark">{errors.title}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                Descrição <span className="text-danger-dark">*</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Descreva o motivo da cobrança adicional..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isCreating}
                rows={4}
                className={errors.description ? "border-danger" : ""}
              />
              {errors.description && (
                <p className="text-sm text-danger-dark">{errors.description}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">
                Valor (R$) <span className="text-danger-dark">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  R$
                </span>
                <Input
                  id="amount"
                  type="text"
                  placeholder="0,00"
                  value={amount}
                  onChange={handleAmountChange}
                  disabled={isCreating}
                  className={`pl-8 ${errors.amount ? "border-danger" : ""}`}
                />
              </div>
              {amountValue > 0 && (() => {
                const PLATFORM_FEE_RATE = 0.05;
                const PLATFORM_FEE_CAP = 1500;
                const fee = Math.min(amountValue * PLATFORM_FEE_RATE, PLATFORM_FEE_CAP);
                const totalWithFee = amountValue + fee;
                const isCapped = fee >= PLATFORM_FEE_CAP;
                return (
                  <div className="rounded-xl border bg-muted/40 px-3 py-2 space-y-1">
                    <p className="text-xs text-brand-dark">
                      {formatPrice(amountValue)} + {formatPrice(fee)} (5%
                      {isCapped ? ", teto" : ""}) ={" "}
                      <span className="font-semibold">
                        {formatPrice(totalWithFee)}
                      </span>
                    </p>
                  </div>
                );
              })()}
              {errors.amount && (
                <p className="text-sm text-danger-dark">{errors.amount}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Valor mínimo: R$ 5,00
              </p>

              {amountValue > 0 && (
                <div className="rounded-xl border border-warning/30 bg-warning-bg px-3 py-2 text-xs text-warning-text leading-relaxed">
                  <strong className="font-semibold">Sobre a taxa:</strong> A
                  ArqDoor recebe apenas quando você recebe. A taxa de 5% (teto
                  de R$ 1.500) é descontada apenas no recebimento.
                </div>
              )}
            </div>

            {!hasFixedTicket && (
              <div className="space-y-2">
                <Label htmlFor="proposal">
                  Vincular à proposta <span className="text-danger-dark">*</span>
                </Label>
                <Select
                  value={selectedTicketId}
                  onValueChange={setSelectedTicketId}
                  disabled={isCreating || !hasTicketOptions}
                >
                  <SelectTrigger
                    id="proposal"
                    className={errors.ticketId ? "border-danger" : ""}
                  >
                    <SelectValue
                      placeholder={
                        hasTicketOptions
                          ? "Selecione uma proposta"
                          : "Nenhuma proposta em andamento disponível"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {ticketOptions.map((option) => (
                      <SelectItem key={option.id} value={String(option.id)}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.ticketId && (
                  <p className="text-sm text-danger-dark">{errors.ticketId}</p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isCreating || !hasAnyTicketAvailable}>
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                "Criar Cobrança"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
