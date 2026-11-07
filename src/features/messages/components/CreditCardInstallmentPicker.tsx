import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { formatPrice } from "@/lib/utils";

export type InstallmentOption = {
  installment_count: number;
  installment_value: number;
  last_installment_value?: number;
  total_amount: number;
};

type CreditCardInstallmentPickerProps = {
  amount?: number;
  /**
   * A opcao inteira vai junto porque o formulario de cartao precisa do TOTAL da parcela
   * escolhida, nao do valor base: no cartao o cliente paga base + taxa do gateway. Mostrar
   * o valor base no botao de pagar exibia um preco e cobrava outro.
   */
  onChange: (installmentCount: number | null, option: InstallmentOption | null) => void;
};

export function CreditCardInstallmentPicker({
  amount,
  onChange,
}: CreditCardInstallmentPickerProps) {
  const [options, setOptions] = useState<InstallmentOption[]>([]);
  const [selectedCount, setSelectedCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!amount || amount <= 0) {
        setOptions([]);
        setSelectedCount(null);
        onChange(null, null);
        return;
      }

      setLoading(true);
      setFailed(false);
      setSelectedCount(null);
      onChange(null, null);
      try {
        const response = await apiRequest("POST", "/payments/credit-card-installments", { amount });
        const payload = await response.json().catch(() => ({}));
        const nextOptions = Array.isArray(payload?.data?.options) ? payload.data.options : [];
        if (!response.ok || !nextOptions.length) throw new Error("Simulação indisponível");
        if (cancelled) return;

        setOptions(nextOptions);
        /**
         * NAO pre-seleciona nada de proposito.
         *
         * Antes a primeira opcao (1x) ja vinha marcada e o formulario de cartao aparecia
         * junto, entao dava para digitar o cartao inteiro sem nunca ter olhado para o
         * parcelamento — e o cliente pagava a vista achando que ia parcelar. Agora a
         * escolha e um passo consciente: os campos do cartao so aparecem depois dela.
         */
        setSelectedCount(null);
        onChange(null, null);
      } catch {
        if (!cancelled) {
          setOptions([]);
          setFailed(true);
          onChange(null, null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [amount, onChange]);

  return (
    <div className="rounded-md border border-brand-soft bg-brand-tint/40 p-3">
      <p className="text-sm font-medium text-ink-strong">Em quantas vezes você quer pagar?</p>
      <p className="mb-3 text-xs text-muted-foreground">
        {selectedCount == null
          ? "Escolha o parcelamento para continuar. Os valores abaixo já são os finais."
          : "Valores finais para pagamento no cartão."}
      </p>

      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-brand-dark" /></div>
      ) : failed ? (
        <p className="text-xs text-danger-dark">Não foi possível calcular as parcelas agora.</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {options.map((option) => {
            const active = option.installment_count === selectedCount;
            return (
              <Button
                key={option.installment_count}
                type="button"
                variant="outline"
                onClick={() => {
                  setSelectedCount(option.installment_count);
                  onChange(option.installment_count, option);
                }}
                className={active ? "h-auto justify-between border-brand bg-brand-tint px-3 py-2 text-left" : "h-auto justify-between px-3 py-2 text-left"}
              >
                <span>{option.installment_count}x de {formatPrice(option.installment_value)}</span>
                <span className="flex flex-col items-end text-xs font-normal text-muted-foreground">
                  {option.last_installment_value != null ? <span>Última {formatPrice(option.last_installment_value)}</span> : null}
                  <span>Total {formatPrice(option.total_amount)}</span>
                </span>
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}
