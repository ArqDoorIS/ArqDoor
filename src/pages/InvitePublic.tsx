import { useEffect, useMemo, useState } from "react";
import { useParams } from "wouter";
import { Loader2, Clock, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest, API_BASE_URL } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { falhaDoConvitePublico, formatInviteExpiry, type FalhaDoConvite } from "@/lib/invite-validity";

import { ConviteProgress } from "@/features/convite/ConviteProgress";
import { ConviteResumoAside } from "@/features/convite/ConviteResumoAside";
import { StepProposta } from "@/features/convite/StepProposta";
import { StepConta } from "@/features/convite/StepConta";
import { StepRevisar } from "@/features/convite/StepRevisar";
import { StepPagamento } from "@/features/convite/StepPagamento";
import { StepPronto } from "@/features/convite/StepPronto";
import type {
  AcceptAndSignResponse,
  FlowStep,
  InviteData,
  InviteStep,
  PaymentGroup,
  ProviderData,
} from "@/features/convite/types";

// Normaliza o campo "steps" que pode vir em varios formatos do backend
const normalizeInviteSteps = (raw: unknown): InviteStep[] => {
  if (Array.isArray(raw)) return raw as InviteStep[];
  if (!raw) return [];
  if (typeof raw === "string") {
    try {
      return normalizeInviteSteps(JSON.parse(raw));
    } catch {
      return [];
    }
  }
  if (typeof raw === "object") {
    const maybe = raw as Record<string, unknown>;
    if (Array.isArray(maybe.steps)) return maybe.steps as InviteStep[];
    if (Array.isArray(maybe.data)) return maybe.data as InviteStep[];
  }
  return [];
};

export default function InvitePublic() {
  const { token } = useParams<{ token: string }>();
  const { user, isLoggedIn } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [provider, setProvider] = useState<ProviderData | null>(null);
  const [falha, setFalha] = useState<FalhaDoConvite | null>(null);

  const [step, setStep] = useState<FlowStep>(1);
  const [acceptResult, setAcceptResult] = useState<AcceptAndSignResponse | null>(null);
  const [paymentDone, setPaymentDone] = useState(false);
  const [ownerError, setOwnerError] = useState(false);

  // Busca os dados do convite
  useEffect(() => {
    if (!token) return;

    const fetchInvite = async () => {
      try {
        setLoading(true);
        const res = await apiRequest("GET", `/invites/public/${token}`);
        const body = await res.json().catch(() => ({}));

        const falhaConhecida = res.ok ? null : falhaDoConvitePublico(res.status, body);
        if (falhaConhecida) {
          setFalha(falhaConhecida);
          setInvite(null);
          return;
        }
        if (!res.ok || body?.success === false) {
          throw new Error(body?.message || "Convite não encontrado.");
        }

        if (body?.invite) {
          setInvite({
            ...body.invite,
            steps: normalizeInviteSteps(body.invite.steps),
          });
        }
        setProvider(body.provider || null);
      } catch (error: any) {
        toast({
          title: "Convite indisponível",
          description: error?.message || "Verifique o link.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchInvite();
  }, [token, toast]);

  // Derivados
  const pdfUrl = useMemo(() => {
    if (!invite?.contract_pdf_url) return "";
    if (invite.contract_pdf_url.startsWith("http")) return invite.contract_pdf_url;
    return `${API_BASE_URL}/${invite.contract_pdf_url.replace(/^\/+/, "")}`;
  }, [invite]);

  const safeSteps = useMemo(() => normalizeInviteSteps(invite?.steps), [invite]);

  const total = useMemo(
    () => safeSteps.reduce((acc, s) => acc + (Number(s.price) || 0), 0),
    [safeSteps]
  );

  const paymentGroups = useMemo<PaymentGroup[]>(() => {
    const map = new Map<number, PaymentGroup>();
    safeSteps.forEach((s) => {
      const gid = s.group_id || s.payment_group_id;
      if (gid && !map.has(gid)) {
        map.set(gid, { id: gid, name: `Grupo ${gid}`, sequence: gid });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.sequence - b.sequence);
  }, [safeSteps]);

  // Avanca para passo 2 ou pula direto para o 3 se logado com CPF
  const handleContinuarProposta = () => {
    if (!isLoggedIn) {
      setStep(2);
      return;
    }
    const cpfDigits = (user?.cpf || "").replace(/\D/g, "");
    if (cpfDigits.length !== 11) {
      setStep(2); // vai para a tela de conta, que mostra o campo de CPF inline
      return;
    }
    setStep(3);
  };

  // Chamado pelo StepConta quando auth conclui com sucesso
  const handleContaSuccess = () => {
    setStep(3);
  };

  // Chamado pelo StepRevisar quando o accept-and-sign funciona
  const handleRevisarSuccess = (result: AcceptAndSignResponse) => {
    setAcceptResult(result);
    // Se nao ha pagamento devido, vai direto para o Pronto
    if (!result.pagamento?.devido) {
      setStep(5);
      return;
    }
    setStep(4);
  };

  // Chamado pelo StepRevisar quando CPF esta faltando (resposta 400 motivo=CPF_OBRIGATORIO)
  const handleCpfRequired = () => {
    setStep(2);
  };

  // Chamado pelo StepRevisar quando o prestador tenta assinar o proprio convite (403)
  const handleOwnerError = () => {
    setOwnerError(true);
  };

  // Chamado pelo StepPagamento quando pagamento e confirmado
  const handlePagamentoSuccess = () => {
    setPaymentDone(true);
    setStep(5);
  };

  // Chamado pelo StepPagamento quando o usuario opta por pagar depois
  const handlePagarDepois = () => {
    setStep(5);
  };

  // --- Estados de erro ---

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-24 text-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin inline-block mr-2" />
        Carregando convite...
      </div>
    );
  }

  if (falha?.tipo === "expirado") {
    const venceuEm = formatInviteExpiry(falha.expiraEm);
    return (
      <div className="container mx-auto px-4 py-24" data-testid="invite-expired">
        <div className="mx-auto max-w-md space-y-3 rounded-3xl border bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
            <Clock className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Este convite expirou</h1>
          <p className="text-sm text-muted-foreground">{falha.titulo}</p>
          {venceuEm ? <p className="text-xs text-muted-foreground">Venceu em {venceuEm}</p> : null}
          <p className="text-sm text-gray-900">
            {falha.prestador
              ? `Peça um novo link a ${falha.prestador}.`
              : "Peça um novo link a quem enviou a proposta."}
          </p>
        </div>
      </div>
    );
  }

  if (falha?.tipo === "nao_encontrado") {
    return (
      <div className="container mx-auto px-4 py-24" data-testid="invite-not-found">
        <div className="mx-auto max-w-md space-y-3 rounded-3xl border bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
            <SearchX className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Convite não encontrado</h1>
          <p className="text-sm text-muted-foreground">
            Confira se o link está completo. Se copiou de uma mensagem, copie de novo inteiro.
          </p>
        </div>
      </div>
    );
  }

  if (ownerError) {
    return (
      <div className="container mx-auto px-4 py-24" data-testid="invite-owner-error">
        <div className="mx-auto max-w-md space-y-3 rounded-3xl border bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900">Você é o prestador deste contrato</h1>
          <p className="text-sm text-muted-foreground">
            O prestador não pode assinar o próprio convite. Compartilhe o link com o cliente.
          </p>
        </div>
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="container mx-auto px-4 py-24 text-center text-muted-foreground space-y-3">
        <p>Não foi possível carregar o convite.</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Tentar de novo
        </Button>
      </div>
    );
  }

  // Convite aceito (status != active) e o flow nao chegou ao Pronto
  if (invite.status !== "active" && step < 5) {
    return (
      <div className="container mx-auto px-4 py-24" data-testid="invite-already-accepted">
        <div className="mx-auto max-w-md space-y-3 rounded-3xl border bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900">
            {invite.status === "accepted"
              ? "Este convite já foi aceito"
              : "Este convite não está mais disponível"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {invite.status === "accepted"
              ? "Para acompanhar o contrato e os pagamentos, entre na sua conta e abra a conversa com quem enviou a proposta."
              : "Peça ao prestador um novo link."}
          </p>
        </div>
      </div>
    );
  }

  // --- Layout principal com barra de progresso ---

  return (
    <div className="min-h-screen bg-stone-50">
      <ConviteProgress currentStep={step} />

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Conteudo principal */}
          <div className="lg:col-span-2">
            {step === 1 && (
              <div className="rounded-3xl border bg-white shadow-sm p-6 sm:p-8">
                <StepProposta
                  invite={invite}
                  provider={provider}
                  pdfUrl={pdfUrl}
                  total={total}
                  steps={safeSteps}
                  paymentGroups={paymentGroups}
                  token={token!}
                  onContinue={handleContinuarProposta}
                />
              </div>
            )}

            {step === 2 && (
              <div className="rounded-3xl border bg-white shadow-sm p-6 sm:p-8">
                <StepConta user={user} onSuccess={handleContaSuccess} />
              </div>
            )}

            {step === 3 && (
              <div className="rounded-3xl border bg-white shadow-sm p-6 sm:p-8">
                <StepRevisar
                  invite={invite}
                  provider={provider}
                  token={token!}
                  pdfUrl={pdfUrl}
                  total={total}
                  onSuccess={handleRevisarSuccess}
                  onCpfRequired={handleCpfRequired}
                  onOwnerError={handleOwnerError}
                />
              </div>
            )}

            {step === 4 && acceptResult && (
              <div className="rounded-3xl border bg-white shadow-sm p-6 sm:p-8">
                <StepPagamento
                  pagamento={acceptResult.pagamento}
                  ticketId={acceptResult.ticket_id}
                  onSuccess={handlePagamentoSuccess}
                  onSkip={handlePagarDepois}
                />
              </div>
            )}

            {step === 5 && acceptResult && (
              <div className="rounded-3xl border bg-white shadow-sm p-6 sm:p-8">
                <StepPronto
                  result={acceptResult}
                  paymentDone={paymentDone}
                  token={token!}
                  pdfUrl={pdfUrl}
                />
              </div>
            )}
          </div>

          {/* Aside de resumo - apenas desktop, passos 1 a 4 */}
          {step < 5 && (
            <div className="hidden lg:block">
              <div className="sticky top-20">
                <ConviteResumoAside
                  invite={invite}
                  provider={provider}
                  total={total}
                  currentStep={step}
                  onContinue={step === 1 ? handleContinuarProposta : undefined}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
