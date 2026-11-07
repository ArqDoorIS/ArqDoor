import React, { useCallback, useEffect, useState } from "react";
import {
  Barcode,
  Copy,
  CreditCard,
  Loader2,
  QrCode,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatPrice } from "@/lib/utils";
import type { PaymentDialogState, PaymentMethod } from "@/features/messages/types";
import {
  CreditCardInstallmentPicker,
  type InstallmentOption,
} from "@/features/messages/components/CreditCardInstallmentPicker";
import { CardForm } from "@/features/payments/components/CardForm";
import { cobrancaRecusada } from "@/features/payments/statusDaCobranca";
import { cartaoDisponivel } from "@/lib/pagarme";

type StepPaymentDialogProps = {
  dialog: PaymentDialogState | null;
  onOpenChange: (open: boolean) => void;
  onChangeMethod: (method: PaymentMethod) => void;
  onGeneratePayment: (installmentCount?: number, cardToken?: string) => void;
  onCopyPaymentCode: (value?: string, toastMessage?: string) => void;
};

// Boleto saiu em 2026-09-09, por decisão do Vitor: não é mais oferecido em lugar nenhum.
// O bloco que EXIBE um boleto continua logo abaixo, e é de propósito: produção tem
// cobranças antigas em boleto, e quem abrir uma delas ainda precisa da linha digitável.
// Deixar de oferecer é diferente de apagar o que já foi cobrado.
//
// Débito também não é oferecido: a Pagar.me, que passou a ser o gateway em 2026-09-09,
// não trabalha com débito.
const paymentOptions = [
  { value: "PIX", title: "PIX", description: "QR Code e copia e cola", icon: QrCode },
  { value: "CREDIT_CARD", title: "Crédito", description: "Checkout seguro", icon: CreditCard },
] as const;

export function StepPaymentDialog({
  dialog,
  onOpenChange,
  onChangeMethod,
  onGeneratePayment,
  onCopyPaymentCode,
}: StepPaymentDialogProps) {
  const isAdditionalPaymentDialog = dialog?.type === "additional";
  const [installmentCount, setInstallmentCount] = useState<number | null>(null);
  const [installmentOption, setInstallmentOption] = useState<InstallmentOption | null>(null);
  const isCreditCard = dialog?.method === "CREDIT_CARD";

  const podeTokenizar = cartaoDisponivel();

  useEffect(() => {
    setInstallmentCount(null);
    setInstallmentOption(null);
  }, [dialog?.step?.id, dialog?.method]);

  const escolherParcela = useCallback(
    (contagem: number | null, opcao: InstallmentOption | null) => {
      setInstallmentCount(contagem);
      setInstallmentOption(opcao);
    },
    []
  );

  // Cartao aprovado ou em analise nao volta ao formulario: refazer so geraria uma
  // segunda cobranca. RECUSADO volta, e precisa voltar: o token e de uso unico, entao
  // tentar de novo exige digitar os dados outra vez.
  const cobrancaDeCartaoEmPe =
    isCreditCard &&
    !!dialog?.data &&
    (dialog.data.method ?? dialog.method) === "CREDIT_CARD" &&
    !cobrancaRecusada(dialog.data);

  // O botao comum NUNCA dispara cartao: sem token a cobranca cai no checkout hospedado,
  // que ignora a divisao com o profissional em silencio. Quem dispara cartao e o CardForm,
  // depois de tokenizar.
  const mostrarBotaoGerar = !isCreditCard;

  return (
    <Dialog open={!!dialog} onOpenChange={onOpenChange}>
      <DialogContent
        onInteractOutside={(event) => {
          if (isAdditionalPaymentDialog) {
            event.preventDefault();
          }
        }}
        onEscapeKeyDown={(event) => {
          if (isAdditionalPaymentDialog) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {dialog?.type === "deposit" 
              ? "Depósito em garantia" 
              : dialog?.type === "additional"
              ? "Pagamento adicional"
              : "Pagamento da etapa"}
            {dialog?.step?.title ? ` - ${dialog.step.title}` : ""}
          </DialogTitle>
          <DialogDescription>
            Escolha a forma de pagamento e gere a cobrança.
          </DialogDescription>
        </DialogHeader>
        {dialog && (
          <div className="space-y-4">
            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Forma de pagamento</span>
                {(() => {
                  const amountToShow = dialog.data?.amount ?? dialog.step?.price;
                  if (typeof amountToShow !== "number" || amountToShow <= 0) return null;
                  return (
                    <span className="text-muted-foreground">
                      Valor: {formatPrice(amountToShow || 0)}
                    </span>
                  );
                })()}
              </div>
              <RadioGroup
                value={dialog.method}
                onValueChange={(v) => onChangeMethod(v as PaymentMethod)}
                className="grid gap-2 sm:grid-cols-2"
              >
                {paymentOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <label
                      key={option.value}
                      htmlFor={`payment-${option.value}`}
                      className="flex cursor-pointer items-start gap-3 rounded-md border p-3 hover:border-brand"
                    >
                      <RadioGroupItem value={option.value} id={`payment-${option.value}`} />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 font-medium">
                          <Icon className="h-4 w-4 text-brand-dark" />
                          {option.title}
                        </div>
                        <p className="text-xs text-muted-foreground">{option.description}</p>
                      </div>
                    </label>
                  );
                })}
              </RadioGroup>
              {/* Sempre o valor BASE, nunca `data.amount`.
                  Cobranca antiga criada pelo gateway anterior gravou o valor JA com a
                  taxa do cartao embutida. Simular em cima dele, ao retentar depois de uma
                  recusa, calcularia taxa sobre taxa e cobraria a mais do cliente. */}
              {isCreditCard ? (
                <CreditCardInstallmentPicker
                  amount={dialog.amount ?? dialog.step?.price ?? dialog.data?.amount}
                  onChange={escolherParcela}
                />
              ) : null}

              {/* Cartao sem chave de tokenizacao neste build: bloco explicito e caminho
                  para o PIX. Nunca um botao que dispara cobranca sem token. */}
              {isCreditCard && !podeTokenizar ? (
                <div className="space-y-2 rounded-md bg-danger-bg px-3 py-2">
                  <p className="text-xs leading-relaxed text-danger-dark">
                    O pagamento com cartão está indisponível nesta versão do site. Use PIX
                    para concluir agora.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onChangeMethod("PIX")}
                    className="border-danger/30 text-danger-dark hover:bg-danger-bg"
                  >
                    Pagar com PIX
                  </Button>
                </div>
              ) : null}

              {/* Cartao: formulario proprio. E o unico caminho que divide o valor com o
                  prestador. O token e de uso unico, entao cada tentativa pede os dados
                  de novo. */}
              {isCreditCard && podeTokenizar && !cobrancaDeCartaoEmPe && installmentOption != null ? (
                <div className="rounded-md border p-3">
                  <CardForm
                    // O total da PARCELA escolhida, nao o valor base: no cartao o cliente
                    // paga base + taxa do gateway. Mostrar `amount` exibia um preco e
                    // cobrava outro.
                    total={
                      installmentOption?.total_amount ??
                      dialog.amount ??
                      dialog.step?.price ??
                      dialog.data?.amount
                    }
                    enviando={dialog.loading}
                    onToken={(cartao) =>
                      onGeneratePayment(installmentCount ?? undefined, cartao.token)
                    }
                    onUsarPix={() => onChangeMethod("PIX")}
                  />
                </div>
              ) : null}

              {mostrarBotaoGerar ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() => onGeneratePayment(installmentCount ?? undefined)}
                    disabled={dialog.loading}
                    className="bg-brand hover:bg-brand-dark"
                  >
                    {dialog.loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <QrCode className="mr-2 h-4 w-4" />
                    )}
                    {dialog.data ? "Atualizar cobrança" : "Gerar cobrança"}
                  </Button>
                </div>
              ) : null}
            </div>

            {(() => {
              const paymentData = dialog.data;
              const activeMethod = (paymentData?.method as PaymentMethod) || dialog.method;

              if (!paymentData) {
                return (
                  <p className="text-sm text-muted-foreground">
                    Clique em &quot;Gerar cobrança&quot; para ver os dados de pagamento.
                  </p>
                );
              }

              const pixData = paymentData?.pix;
              const boletoData = paymentData?.boleto;
              const checkoutUrl = paymentData?.checkout_url || paymentData?.invoice_url;

              if (activeMethod === "PIX") {
                const enc = pixData?.qr_code_image;
                const src = enc
                  ? enc.startsWith("data:image")
                    ? enc
                    : `data:image/png;base64,${enc}`
                  : null;
                return (
                  <div className="space-y-3">
                    {src && (
                      <div className="flex flex-col items-center gap-2">
                        <img src={src} alt="QR Code PIX" className="w-44 h-44 object-contain" />
                        <span className="text-xs text-muted-foreground">Escaneie para pagar</span>
                      </div>
                    )}

                    <div>
                      <p className="text-sm font-medium mb-1">Código copia e cola</p>
                      <div className="bg-surface-warm rounded-md p-2 text-xs break-all">
                        {pixData?.copy_and_paste || "Não disponível"}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            onCopyPaymentCode(pixData?.copy_and_paste, "Código PIX copiado")
                          }
                          disabled={!pixData?.copy_and_paste}
                        >
                          <Copy className="h-3.5 w-3.5 mr-1" /> Copiar código
                        </Button>
                        {paymentData?.invoice_url && (
                          <Button asChild size="sm" variant="outline">
                            <a href={paymentData.invoice_url} target="_blank" rel="noreferrer">
                              <QrCode className="h-3.5 w-3.5 mr-1" /> Abrir cobrança
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>

                    {pixData?.expires_at && (
                      <p className="text-xs text-muted-foreground">
                        Expira em {new Date(pixData.expires_at).toLocaleString("pt-BR")}
                      </p>
                    )}
                  </div>
                );
              }

              if (activeMethod === "BOLETO") {
                return (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Use a linha digitável ou abra o boleto para finalizar o pagamento.
                    </p>
                    <div className="bg-surface-warm rounded-md p-2 text-xs break-all">
                      {boletoData?.digitable_line || "Não disponível"}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          onCopyPaymentCode(
                            boletoData?.digitable_line,
                            "Linha digitável copiada"
                          )
                        }
                        disabled={!boletoData?.digitable_line}
                      >
                        <Copy className="h-3.5 w-3.5 mr-1" /> Copiar código
                      </Button>
                      {(boletoData?.pdf_url || paymentData?.invoice_url) && (
                        <Button asChild size="sm" className="bg-brand hover:bg-brand-dark">
                          <a
                            href={boletoData?.pdf_url || paymentData?.invoice_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Barcode className="h-3.5 w-3.5 mr-1" /> Abrir boleto
                          </a>
                        </Button>
                      )}
                    </div>
                    {boletoData?.due_date && (
                      <p className="text-xs text-muted-foreground">
                        Vencimento em{" "}
                        {new Date(boletoData.due_date).toLocaleDateString("pt-BR")}
                      </p>
                    )}
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {paymentData?.credit_card_installment && (
                    <div className="flex items-center justify-between rounded-md bg-brand-tint px-3 py-2 text-sm">
                      <span className="font-medium text-brand-dark">
                        {paymentData.credit_card_installment.installment_count}x de {formatPrice(paymentData.credit_card_installment.installment_value)}
                      </span>
                      <span className="flex flex-col items-end text-xs text-muted-foreground">
                        {paymentData.credit_card_installment.last_installment_value != null ? (
                          <span>Última {formatPrice(paymentData.credit_card_installment.last_installment_value)}</span>
                        ) : null}
                        <span>Total {formatPrice(paymentData.credit_card_installment.total_amount)}</span>
                      </span>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Cobrança no cartão registrada. O resultado aparece assim que a operadora
                    responder.
                  </p>
                  {/* O link do checkout hospedado so aparece para cobrancas ANTIGAS, que
                      nasceram por aquele caminho. Cobranca nova de cartao e feita aqui
                      mesmo, com token, porque o checkout hospedado ignora a divisao com o
                      profissional em silencio. */}
                  {checkoutUrl && (
                    <Button asChild className="bg-brand hover:bg-brand-dark">
                      <a href={checkoutUrl} target="_blank" rel="noreferrer">
                        <CreditCard className="h-4 w-4 mr-2" />
                        Abrir cobrança
                      </a>
                    </Button>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
