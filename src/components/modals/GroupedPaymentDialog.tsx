import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
  } from '@/components/ui/dialog';
  import { Button } from '@/components/ui/button';
  import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
  import { useCallback, useEffect, useState } from 'react';
  import {
    QrCode,
    Copy,
    CreditCard,
    Barcode,
    Loader2,
  } from 'lucide-react';
  import { Step } from '@/lib/Interfaces';
  import { formatPrice } from '@/lib/utils';
  import {
    CreditCardInstallmentPicker,
    type InstallmentOption,
  } from '@/features/messages/components/CreditCardInstallmentPicker';
  import { CardForm } from '@/features/payments/components/CardForm';
  import { cobrancaRecusada } from '@/features/payments/statusDaCobranca';
  import { cartaoDisponivel } from '@/lib/pagarme';
  
  type PaymentMethod = 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'DEBIT_CARD';
  
  type GroupedPaymentDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    steps: Step[];
    data: any | null;
    method: PaymentMethod;
    loading: boolean;
    onMethodChange: (method: PaymentMethod) => void;
    onGeneratePayment: (installmentCount?: number, cardToken?: string) => void;
    onCopyCode: (code?: string, label?: string) => void;
  };
  
  // Boleto saiu em 2026-09-09, por decisão do Vitor: não é mais oferecido em lugar nenhum.
  // O bloco que EXIBE um boleto continua mais abaixo, e é de propósito: produção tem
  // cobranças antigas em boleto, e quem abrir uma delas ainda precisa da linha digitável.
  //
  // Débito também não é oferecido: a Pagar.me, gateway desde 2026-09-09, não trabalha com
  // débito. Ele ficava na tela e falhava depois de o cliente escolher.
  const paymentMethodOptions = [
    { value: "PIX", title: "PIX", description: "QR Code e copia e cola", icon: QrCode },
    { value: "CREDIT_CARD", title: "Crédito", description: "Em até 12x", icon: CreditCard },
  ];
  
  export function GroupedPaymentDialog({
    open,
    onOpenChange,
    steps,
    data,
    method,
    loading,
    onMethodChange,
    onGeneratePayment,
    onCopyCode,
  }: GroupedPaymentDialogProps) {
    const totalAmount = steps.reduce((acc, step) => acc + (step.price || 0), 0);
    const [installmentCount, setInstallmentCount] = useState<number | null>(null);
    const [installmentOption, setInstallmentOption] = useState<InstallmentOption | null>(null);
    const isCreditCard = method === 'CREDIT_CARD';
    const podeTokenizar = cartaoDisponivel();

    useEffect(() => {
      setInstallmentCount(null);
      setInstallmentOption(null);
    }, [method, totalAmount]);

    const escolherParcela = useCallback(
      (contagem: number | null, opcao: InstallmentOption | null) => {
        setInstallmentCount(contagem);
        setInstallmentOption(opcao);
      },
      []
    );

    // Recusada volta ao formulario: o token e de uso unico, entao retentar exige os
    // dados de novo. Aprovada ou em analise, nao: refazer geraria cobranca dobrada.
    const cobrancaDeCartaoEmPe = isCreditCard && !!data && !cobrancaRecusada(data);

    // O botão comum NUNCA dispara cartão: sem token a cobrança cai no checkout hospedado,
    // que ignora a divisão com o profissional em silêncio. Quem dispara cartão é o CardForm.
    const mostrarBotaoGerar = !isCreditCard;
  
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pagamento Agrupado</DialogTitle>
            <DialogDescription>
              {steps.length} etapa(s) selecionada(s) para pagamento.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Forma de pagamento</span>
                {totalAmount > 0 && (
                  <span className="text-muted-foreground">
                    Valor: {formatPrice(totalAmount)}
                  </span>
                )}
              </div>
              <RadioGroup
                value={method}
                onValueChange={(v) => onMethodChange(v as PaymentMethod)}
                className="grid gap-2 sm:grid-cols-2"
              >
                {paymentMethodOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <label
                      key={option.value}
                      htmlFor={`grouped-payment-${option.value}`}
                      className="flex cursor-pointer items-start gap-3 rounded-md border p-3 hover:border-brand"
                    >
                      <RadioGroupItem value={option.value} id={`grouped-payment-${option.value}`} />
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
              {isCreditCard ? (
                <CreditCardInstallmentPicker amount={totalAmount} onChange={escolherParcela} />
              ) : null}

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
                    onClick={() => onMethodChange("PIX")}
                    className="border-danger/30 text-danger-dark hover:bg-danger-bg"
                  >
                    Pagar com PIX
                  </Button>
                </div>
              ) : null}

              {isCreditCard && podeTokenizar && !cobrancaDeCartaoEmPe && installmentOption != null ? (
                <div className="rounded-md border p-3">
                  <CardForm
                    total={installmentOption?.total_amount ?? totalAmount}
                    enviando={loading}
                    onToken={(cartao) =>
                      onGeneratePayment(installmentCount ?? undefined, cartao.token)
                    }
                    onUsarPix={() => onMethodChange("PIX")}
                  />
                </div>
              ) : null}

              {mostrarBotaoGerar ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() => onGeneratePayment(installmentCount ?? undefined)}
                    disabled={loading}
                    className="bg-brand hover:bg-brand-dark"
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <QrCode className="mr-2 h-4 w-4" />
                    )}
                    {data ? "Atualizar cobrança" : "Gerar cobrança"}
                  </Button>
                  {data?.invoice_url && (
                    <Button asChild variant="outline">
                      <a href={data.invoice_url} target="_blank" rel="noreferrer">
                        Abrir cobrança
                      </a>
                    </Button>
                  )}
                </div>
              ) : null}
            </div>
  
            {(() => {
              if (!data) {
                return (
                  <p className="text-sm text-muted-foreground">
                    Clique em &quot;Gerar cobrança&quot; para ver os dados de pagamento.
                  </p>
                );
              }
  
              const pixData = data?.pix;
              const boletoData = data?.boleto;
              const checkoutUrl = data?.checkout_url || data?.invoice_url;
  
              if (method === "PIX") {
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
                          onClick={() => onCopyCode(pixData?.copy_and_paste, "Código PIX copiado")}
                          disabled={!pixData?.copy_and_paste}
                        >
                          <Copy className="h-3.5 w-3.5 mr-1" /> Copiar código
                        </Button>
                        {data?.invoice_url && (
                          <Button asChild size="sm" variant="outline">
                            <a href={data.invoice_url} target="_blank" rel="noreferrer">
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
  
              if (method === "BOLETO") {
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
                        onClick={() => onCopyCode(boletoData?.digitable_line, "Linha digitável copiada")}
                        disabled={!boletoData?.digitable_line}
                      >
                        <Copy className="h-3.5 w-3.5 mr-1" /> Copiar código
                      </Button>
                      {(boletoData?.pdf_url || data?.invoice_url) && (
                        <Button asChild size="sm" className="bg-brand hover:bg-brand-dark">
                          <a
                            href={boletoData?.pdf_url || data?.invoice_url}
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
                        Vencimento em {new Date(boletoData.due_date).toLocaleDateString("pt-BR")}
                      </p>
                    )}
                  </div>
                );
              }
  
              return (
                <div className="space-y-3">
                  {data?.credit_card_installment && (
                    <div className="flex items-center justify-between rounded-md bg-brand-tint px-3 py-2 text-sm">
                      <span className="font-medium text-brand-dark">
                        {data.credit_card_installment.installment_count}x de {formatPrice(data.credit_card_installment.installment_value)}
                      </span>
                      <span className="flex flex-col items-end text-xs text-muted-foreground">
                        {data.credit_card_installment.last_installment_value != null ? (
                          <span>Última {formatPrice(data.credit_card_installment.last_installment_value)}</span>
                        ) : null}
                        <span>Total {formatPrice(data.credit_card_installment.total_amount)}</span>
                      </span>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Cobrança no cartão registrada. O resultado aparece assim que a operadora
                    responder.
                  </p>
                  {/* Link do checkout hospedado só para cobranças ANTIGAS, nascidas por
                      aquele caminho. Cobrança nova é feita aqui, com token. */}
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
        </DialogContent>
      </Dialog>
    );
  }
  
