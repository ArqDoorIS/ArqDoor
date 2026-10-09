import { useCallback, useEffect, useState } from "react";
import {
  QrCode,
  CreditCard,
  Copy,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatPrice } from "@/lib/utils";
import {
  CreditCardInstallmentPicker,
  type InstallmentOption,
} from "@/features/messages/components/CreditCardInstallmentPicker";
import { CardForm } from "@/features/payments/components/CardForm";
import { cobrancaRecusada } from "@/features/payments/statusDaCobranca";
import { cartaoDisponivel } from "@/lib/pagarme";
import type { PagamentoAgora, PagamentoDevido } from "./types";

type PaymentMethod = "PIX" | "CREDIT_CARD";

type Props = {
  pagamento: PagamentoAgora;
  ticketId: number;
  onSuccess: () => void;
  onSkip: () => void;
};

function CobrancaResult({
  data,
  method,
  onCopy,
}: {
  data: any;
  method: PaymentMethod;
  onCopy: (text: string, label: string) => void;
}) {
  if (!data) return null;

  if (method === "PIX") {
    const pixData = data?.pix;
    const src = pixData?.qr_code_image
      ? pixData.qr_code_image.startsWith("data:image")
        ? pixData.qr_code_image
        : `data:image/png;base64,${pixData.qr_code_image}`
      : null;

    return (
      <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        {src && (
          <div className="flex flex-col items-center gap-2">
            <img src={src} alt="QR Code PIX" className="w-44 h-44 object-contain rounded-lg" />
            <span className="text-xs text-slate-500">Escaneie para pagar</span>
          </div>
        )}
        <div>
          <p className="text-sm font-medium mb-1">Codigo copia e cola</p>
          <div className="rounded-lg bg-white border border-slate-200 p-2 text-xs text-slate-700 break-all font-mono">
            {pixData?.copy_and_paste || "Indisponivel"}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2 gap-1.5"
            onClick={() => onCopy(pixData?.copy_and_paste || "", "Codigo PIX copiado")}
            disabled={!pixData?.copy_and_paste}
          >
            <Copy className="h-3.5 w-3.5" /> Copiar codigo
          </Button>
        </div>
        {pixData?.expires_at && (
          <p className="text-xs text-slate-400">
            Expira em {new Date(pixData.expires_at).toLocaleString("pt-BR")}
          </p>
        )}
      </div>
    );
  }

  if (method === "CREDIT_CARD") {
    return (
      <div className="space-y-2 rounded-xl border border-green-200 bg-green-50 p-4">
        {data?.credit_card_installment && (
          <p className="text-sm font-medium text-green-800">
            {data.credit_card_installment.installment_count}x de{" "}
            {formatPrice(data.credit_card_installment.installment_value)}
          </p>
        )}
        <p className="text-sm text-slate-700">
          Cobranca no cartao registrada. O resultado aparece assim que a operadora responder.
        </p>
      </div>
    );
  }

  return null;
}

export function StepPagamento({ pagamento, ticketId, onSuccess, onSkip }: Props) {
  const { toast } = useToast();
  const [method, setMethod] = useState<PaymentMethod>("PIX");
  const [loading, setLoading] = useState(false);
  const [cobrancaData, setCobrancaData] = useState<any>(null);
  const [installmentCount, setInstallmentCount] = useState<number | null>(null);
  const [installmentOption, setInstallmentOption] = useState<InstallmentOption | null>(null);
  const podeTokenizar = cartaoDisponivel();

  const devido = pagamento.devido as PagamentoDevido;
  const isCreditCard = method === "CREDIT_CARD";
  const cobrancaDeCartaoEmPe = isCreditCard && !!cobrancaData && !cobrancaRecusada(cobrancaData);

  useEffect(() => {
    setInstallmentCount(null);
    setInstallmentOption(null);
    setCobrancaData(null);
  }, [method]);

  const escolherParcela = useCallback(
    (contagem: number | null, opcao: InstallmentOption | null) => {
      setInstallmentCount(contagem);
      setInstallmentOption(opcao);
    },
    []
  );

  const gerarCobranca = async (cardToken?: string) => {
    setLoading(true);
    try {
      let endpoint: string;
      let description: string;

      if (devido.tipo === "grupo" && devido.group_id) {
        endpoint = `/payments/groups/${devido.group_id}`;
        description = `Pagamento do grupo ${devido.nome || devido.group_id}`;
      } else {
        endpoint = `/payments/tickets/${ticketId}`;
        description = `Deposito em garantia`;
      }

      const res = await apiRequest("POST", endpoint, {
        description,
        method,
        installment_count: isCreditCard ? (installmentCount ?? undefined) : undefined,
        card_token: isCreditCard ? cardToken : undefined,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "Nao foi possivel gerar o pagamento.");
      }

      setCobrancaData(data?.data || data);
    } catch (err: any) {
      toast({ title: "Erro ao gerar cobranca", description: err?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const onCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).catch(() => null);
    toast({ title: label });
  };

  const pagamentoConcluido =
    cobrancaData &&
    (method === "PIX" ? !!cobrancaData?.pix : method === "CREDIT_CARD");

  const paymentOptions = [
    { value: "PIX" as const, title: "PIX", description: "QR Code e copia e cola", icon: QrCode },
    { value: "CREDIT_CARD" as const, title: "Credito", description: "Em ate 12x", icon: CreditCard },
  ];

  return (
    <div className="space-y-5" data-testid="step-pagamento">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Pagamento</h2>
        {pagamento.motivo && (
          <p className="text-sm text-slate-600 mt-0.5">{pagamento.motivo}</p>
        )}
      </div>

      {/* Detalhe do que vai ser pago */}
      <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 space-y-1">
        <p className="text-sm font-semibold text-orange-800">
          {devido.nome || (devido.tipo === "deposito" ? "Deposito em garantia" : "Grupo")}
        </p>
        <p className="text-2xl font-bold text-slate-900">{formatPrice(devido.valor)}</p>
        {devido.etapas && devido.etapas.length > 0 && (
          <div className="pt-1 space-y-0.5">
            {devido.etapas.map((etapa) => (
              <div key={etapa.id} className="flex justify-between gap-2 text-xs text-slate-600">
                <span>{etapa.title}</span>
                <span>{formatPrice(etapa.price)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Metodo de pagamento */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-slate-700">Forma de pagamento</p>
        <RadioGroup
          value={method}
          onValueChange={(v) => setMethod(v as PaymentMethod)}
          className="grid grid-cols-2 gap-3"
        >
          {paymentOptions.map((opt) => {
            const Icon = opt.icon;
            return (
              <label
                key={opt.value}
                htmlFor={`pay-${opt.value}`}
                className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 cursor-pointer hover:border-orange-300 transition-colors has-[:checked]:border-orange-400 has-[:checked]:bg-orange-50"
              >
                <RadioGroupItem value={opt.value} id={`pay-${opt.value}`} className="mt-0.5" />
                <div>
                  <div className="flex items-center gap-1.5 font-medium text-sm text-slate-800">
                    <Icon className="h-4 w-4 text-orange-600" />
                    {opt.title}
                  </div>
                  <p className="text-xs text-slate-500">{opt.description}</p>
                </div>
              </label>
            );
          })}
        </RadioGroup>

        {isCreditCard && (
          <CreditCardInstallmentPicker
            amount={devido.valor}
            onChange={escolherParcela}
          />
        )}
      </div>

      {/* Aviso quando cartao nao disponivel */}
      {isCreditCard && !podeTokenizar && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 space-y-2">
          <p className="text-xs text-red-700">
            O pagamento com cartao nao esta disponivel nesta versao. Use PIX para continuar agora.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMethod("PIX")}
            className="border-red-200 text-red-700 hover:bg-red-100"
          >
            Pagar com PIX
          </Button>
        </div>
      )}

      {/* CardForm quando cartao disponivel e parcela escolhida */}
      {isCreditCard && podeTokenizar && !cobrancaDeCartaoEmPe && installmentOption != null && (
        <div className="rounded-xl border border-slate-200 p-4">
          <CardForm
            total={installmentOption?.total_amount ?? devido.valor}
            enviando={loading}
            onToken={(cartao) => gerarCobranca(cartao.token)}
            onUsarPix={() => setMethod("PIX")}
          />
        </div>
      )}

      {/* Resultado da cobranca */}
      {cobrancaData && (
        <CobrancaResult data={cobrancaData} method={method} onCopy={onCopy} />
      )}

      {/* Botao gerar (apenas PIX) */}
      {!isCreditCard && !cobrancaData && (
        <Button
          type="button"
          onClick={() => gerarCobranca()}
          disabled={loading}
          className="bg-orange-600 hover:bg-orange-700 gap-2"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
          Gerar cobranca
        </Button>
      )}

      {/* Acoes apos cobranca gerada */}
      {pagamentoConcluido && (
        <Button
          type="button"
          onClick={onSuccess}
          className="w-full bg-orange-600 hover:bg-orange-700 h-11 gap-2"
        >
          <CheckCircle2 className="h-4 w-4" />
          Ja paguei
        </Button>
      )}

      <Button
        type="button"
        variant="ghost"
        onClick={onSkip}
        className="text-slate-500 hover:text-slate-700 text-sm"
      >
        Pagar depois
      </Button>
    </div>
  );
}
