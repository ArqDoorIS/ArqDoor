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
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 space-y-4">
      {/* Provider */}
      {providerName && (
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Prestador</p>
          <p className="font-semibold text-slate-800 mt-0.5">{providerName}</p>
          {provider?.profession && (
            <p className="text-xs text-slate-500">{provider.profession}</p>
          )}
        </div>
      )}

      {/* Titulo */}
      <div>
        <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Proposta</p>
        <p className="font-semibold text-slate-800 mt-0.5 leading-snug">{invite.title}</p>
      </div>

      {/* Total */}
      <div>
        <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Total</p>
        <p className="text-xl font-bold text-orange-600 mt-0.5">{formatPrice(total)}</p>
      </div>

      {/* CTA "Continuar" - visivel apenas no passo 1 */}
      {currentStep === 1 && onContinue && (
        <Button
          onClick={onContinue}
          className="w-full bg-orange-600 hover:bg-orange-700 text-sm font-semibold h-11 rounded-xl"
        >
          Continuar
        </Button>
      )}
    </div>
  );
}
