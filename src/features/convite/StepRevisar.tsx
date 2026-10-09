import { useState } from "react";
import { Loader2, FileText, ExternalLink, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { formatPrice } from "@/lib/utils";
import type { InviteData, ProviderData, AcceptAndSignResponse } from "./types";

type Props = {
  invite: InviteData;
  provider: ProviderData | null;
  token: string;
  pdfUrl: string;
  total: number;
  onSuccess: (result: AcceptAndSignResponse) => void;
  onCpfRequired: () => void;
  onOwnerError: () => void;
};

type SignMethod = "password" | "google";

function PasswordInput({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Sua senha de login"
        autoComplete="current-password"
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        tabIndex={-1}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function StepRevisar({ invite, provider, token, pdfUrl, total, onSuccess, onCpfRequired, onOwnerError }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();

  // Conta Google nao tem senha de login utilizavel: so pode assinar pela sessao Google
  const isGoogleAccount = !user?.signature_password_set && !user?.signature_password_configured;

  const [concordo, setConcordo] = useState(false);
  // Para conta Google, pre-seleciona o metodo Google
  const [signMethod, setSignMethod] = useState<SignMethod>(isGoogleAccount ? "google" : "password");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [assinadoFalhou, setAssinadoFalhou] = useState(false);
  const [assinadoResult, setAssinadoResult] = useState<AcceptAndSignResponse | null>(null);
  const providerName = provider?.name || provider?.user?.name || "o prestador";

  const handleSign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!concordo) {
      toast({ title: "Confirme que leu o contrato antes de assinar.", variant: "destructive" });
      return;
    }
    if (signMethod === "password" && !password) {
      toast({ title: "Digite sua senha para assinar.", variant: "destructive" });
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const body =
        signMethod === "google"
          ? { li_e_concordo: true, signature_method: "google" }
          : { li_e_concordo: true, password };

      const res = await apiRequest("POST", `/invites/public/${token}/accept-and-sign`, body);
      const data = await res.json().catch(() => null);

      if (res.status === 403) {
        onOwnerError();
        return;
      }

      if (res.status === 400) {
        if (data?.motivo === "CPF_OBRIGATORIO") {
          onCpfRequired();
          return;
        }
        setErrorMsg(data?.message || "Nao foi possivel assinar. Verifique a senha.");
        return;
      }

      if (res.status === 409) {
        setErrorMsg("Este convite ja foi aceito por outra conta. Contate " + providerName + " para um novo link.");
        return;
      }

      if (res.status === 410) {
        setErrorMsg("Este convite expirou. Peca um novo link a " + providerName + ".");
        return;
      }

      if (!res.ok || !data?.success) {
        setErrorMsg(data?.message || "Erro ao processar. Tente novamente.");
        return;
      }

      // Aceite OK, mas assinatura falhou (improvavel, backend avisa)
      if (data?.assinado === false) {
        setAssinadoFalhou(true);
        setAssinadoResult(data as AcceptAndSignResponse);
        return;
      }

      onSuccess(data as AcceptAndSignResponse);
    } catch (err: any) {
      setErrorMsg(err?.message || "Erro de rede. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // Fallback: aceite ok mas assinatura falhou
  if (assinadoFalhou && assinadoResult) {
    return (
      <div className="space-y-5" data-testid="step-revisar">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 space-y-3">
          <h2 className="font-semibold text-amber-900">Proposta aceita, mas assinatura pendente</h2>
          <p className="text-sm text-slate-700">
            {assinadoResult.mensagem || "O aceite foi registrado, mas a assinatura nao foi concluida neste momento."}
          </p>
          <Button
            variant="outline"
            onClick={() => window.open(pdfUrl, "_blank")}
            className="gap-2"
          >
            <FileText className="h-4 w-4" /> Assinar pelo PDF
          </Button>
        </div>
        <Button
          onClick={() => onSuccess(assinadoResult)}
          className="bg-orange-600 hover:bg-orange-700"
        >
          Continuar mesmo assim
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSign} className="space-y-5" data-testid="step-revisar">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Revisar e assinar</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Revise os detalhes do contrato e assine para continuar.
        </p>
      </div>

      {/* Resumo */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
        <p className="text-sm font-semibold text-slate-800">{invite.title}</p>
        {provider?.name || provider?.user?.name ? (
          <p className="text-sm text-slate-500">
            {provider.name || provider.user?.name}
            {provider.profession ? ` - ${provider.profession}` : ""}
          </p>
        ) : null}
        <p className="text-lg font-bold text-orange-600">{formatPrice(total)}</p>
      </div>

      {/* Link PDF */}
      {pdfUrl && (
        <a
          href={pdfUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700 font-medium"
        >
          <FileText className="h-4 w-4" />
          Abrir contrato em PDF
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}

      {/* Checkbox de concordancia */}
      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <Checkbox
          id="concordo"
          checked={concordo}
          onCheckedChange={(v) => setConcordo(v === true)}
          className="mt-0.5"
        />
        <Label htmlFor="concordo" className="text-sm leading-relaxed text-slate-700 cursor-pointer">
          Li o contrato e concordo com as etapas, os valores e as condicoes.
        </Label>
      </div>

      {/* Metodo de confirmacao */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-slate-700">Confirmar com:</p>
        <RadioGroup
          value={signMethod}
          onValueChange={(v) => setSignMethod(v as SignMethod)}
          className="space-y-2"
        >
          {!isGoogleAccount && (
            <label
              htmlFor="method-password"
              className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 cursor-pointer hover:border-orange-300 transition-colors has-[:checked]:border-orange-400 has-[:checked]:bg-orange-50"
            >
              <RadioGroupItem value="password" id="method-password" className="mt-0.5" />
              <div>
                <p className="font-medium text-sm text-slate-800">Senha da minha conta</p>
                <p className="text-xs text-slate-500">Use a mesma senha do seu login</p>
              </div>
            </label>
          )}
          <label
            htmlFor="method-google"
            className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 cursor-pointer hover:border-orange-300 transition-colors has-[:checked]:border-orange-400 has-[:checked]:bg-orange-50"
          >
            <RadioGroupItem value="google" id="method-google" className="mt-0.5" />
            <div>
              <p className="font-medium text-sm text-slate-800">Minha conta Google</p>
              <p className="text-xs text-slate-500">Valida pela sua sessao ativa</p>
            </div>
          </label>
        </RadioGroup>

        {signMethod === "password" && !isGoogleAccount && (
          <div className="space-y-1.5 pt-1">
            <Label htmlFor="sign-password">Senha</Label>
            <PasswordInput id="sign-password" value={password} onChange={setPassword} />
          </div>
        )}
      </div>

      {/* Erro */}
      {errorMsg && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {errorMsg}
        </div>
      )}

      {/* Icone de seguranca + botao */}
      <div className="flex items-center gap-3 pt-1">
        <ShieldCheck className="h-5 w-5 text-orange-500 shrink-0" />
        <p className="text-xs text-slate-500 flex-1">
          Sua assinatura gera um PDF com hash de verificacao, guardado de forma segura.
        </p>
      </div>

      <Button
        type="submit"
        disabled={loading || !concordo}
        className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 h-12 px-8 text-base font-semibold rounded-xl"
      >
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Aceitar e assinar
      </Button>
    </form>
  );
}
