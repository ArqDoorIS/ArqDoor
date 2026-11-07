import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, CreditCard } from "lucide-react";

interface PaymentPreferenceCardProps {
  paymentPreference: "per_step" | "at_end" | "custom" | null;
  onChange: (value: "per_step" | "at_end" | "custom") => void;
  loading?: boolean;
  saving?: boolean;
  onSave?: () => void;
}

export function PaymentPreferenceCard({
  paymentPreference,
  onChange,
  loading = false,
  saving = false,
  onSave,
}: PaymentPreferenceCardProps) {
  const displayValue = paymentPreference || "at_end";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-4 h-4" />
          Preferência de Pagamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-brand-tint"
                onClick={() => onChange("per_step")}
              >
                <RadioGroup value={displayValue} onValueChange={onChange}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="per_step" id="per_step" />
                    <div className="flex-1">
                      <Label htmlFor="per_step" className="cursor-pointer font-medium">
                        Pagamento por fase
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        O cliente paga por cada fase finalizada no momento da sua finalização.
                      </p>
                      <p className="text-xs text-brand-dark mt-2 font-medium">
                        ✓ Cobrança fase a fase conforme aprovação
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-brand-tint"
                onClick={() => onChange("at_end")}
              >
                <RadioGroup value={displayValue} onValueChange={onChange}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="at_end" id="at_end" />
                    <div className="flex-1">
                      <Label htmlFor="at_end" className="cursor-pointer font-medium">
                        Depósito em garantia
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Cliente paga o valor integral do contrato, ficando sob garantia da ArqDoor até o cumprimento das etapas. Os valores correspondentes a cada fase finalizada serão transferidos para o Arquiteto.
                      </p>
                      <p className="text-xs text-info-dark mt-2 font-medium">
                        ✓ Valor integral garantido desde a assinatura
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-brand-tint"
                onClick={() => onChange("custom")}
              >
                <RadioGroup value={displayValue} onValueChange={onChange}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="custom" id="custom" />
                    <div className="flex-1">
                      <Label htmlFor="custom" className="cursor-pointer font-medium">
                        Pagamento em garantia
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        O cliente paga os grupos definidos no contrato e o valor fica protegido no fluxo da plataforma.
                      </p>
                      <p className="text-xs text-success-dark mt-2 font-medium">
                        ✓ Liberação de datas por pagamento confirmado
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            </div>

            <div className="bg-info-bg border border-info/30 rounded p-3 text-sm text-info-dark">
              <p className="font-medium mb-1">ℹ️ Como funciona:</p>
              {displayValue === "per_step" ? (
                <ul className="list-disc list-inside space-y-1">
                  <li>O cliente paga por cada fase logo após a finalização e aprovação.</li>
                  <li>Cada aprovação gera a rota/cobrança específica daquela fase.</li>
                  <li>A próxima fase só inicia depois da confirmação do pagamento.</li>
                </ul>
              ) : displayValue === "custom" ? (
                <ul className="list-disc list-inside space-y-1">
                  <li>O cliente pode escolher quais fases deseja pagar em cada momento.</li>
                  <li>É possível pagar mais de uma etapa ao mesmo tempo (pagamento agrupado).</li>
                  <li>As datas das fases começam a contar após a confirmação do pagamento.</li>
                </ul>
              ) : (
                <ul className="list-disc list-inside space-y-1">
                  <li>Ao aceitar/assinar o contrato já emitimos a cobrança do valor total para depósito em garantia.</li>
                  <li>O valor fica com a ArqDoor e as liberações acontecem conforme as fases são finalizadas e validadas, mantendo o saldo protegido.</li>
                  <li>O projeto fica em "aguardando pagamento" e o prazo começa a contar após a confirmação do depósito.</li>
                  <li>No fim, o prestador marca o projeto como concluído e o cliente aceita ou pede ajustes; só após a aceitação liberamos o pagamento ao prestador.</li>
                </ul>
              )}
            </div>

            {onSave && (
              <Button
                onClick={onSave}
                className="w-full bg-brand hover:bg-brand-dark text-white"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Preferência"
                )}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
