import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import type { FlowStep, InviteData, ProviderData } from "./types";

type Props = {
  invite: InviteData;
  provider: ProviderData | null;
  total: number;
  currentStep: FlowStep;
  onContinue?: () => void;
};

export function ConviteResumoAside({ invite, provider, total, currentStep, onContinue }: Props) {
  const providerName = provider?.name || provider?.user?.name || null;

  return (
    <div className="rounded-2xl border border-line bg-white shadow-sm p-5 space-y-4">
      {/* Provider */}
      {providerName && (
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Prestador</p>
          <p className="font-semibold text-ink mt-0.5">{providerName}</p>
          {provider?.profession && (
            <p className="text-xs text-muted-foreground">{provider.profession}</p>
          )}
        </div>
      )}

      {/* Titulo */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Proposta</p>
        <p className="font-semibold text-ink mt-0.5 leading-snug">{invite.title}</p>
      </div>

      {/* Total */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total</p>
        <p className="text-xl font-bold text-brand-dark mt-0.5">{formatPrice(total)}</p>
      </div>

      {/* CTA "Continuar" - visivel apenas no passo 1 */}
      {currentStep === 1 && onContinue && (
        <>
          <Button
            onClick={onContinue}
            className="w-full bg-brand hover:bg-brand-dark text-sm font-semibold h-11 rounded-xl"
          >
            Continuar
          </Button>
          {invite.destinatario?.cpf_final && (
            <p className="text-xs text-muted-foreground text-center">
              O CPF é conferido quando você aceitar.
            </p>
          )}
        </>
      )}
    </div>
  );
}
