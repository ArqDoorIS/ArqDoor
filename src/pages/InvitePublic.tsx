import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";
import { Loader2, Clock, Lock, SearchX, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest, API_BASE_URL } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { falhaDoConvitePublico, formatInviteExpiry, type FalhaDoConvite } from "@/lib/invite-validity";
import { cpfBate, formatarCpfFinal } from "@/lib/invite-cpf";

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
  const { user, isLoggedIn, logout } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [provider, setProvider] = useState<ProviderData | null>(null);
  const [falha, setFalha] = useState<FalhaDoConvite | null>(null);

  const [step, setStep] = useState<FlowStep>(1);
  const [acceptResult, setAcceptResult] = useState<AcceptAndSignResponse | null>(null);
  const [paymentDone, setPaymentDone] = useState(false);
  const [ownerError, setOwnerError] = useState(false);
  // Convite destinado a outro CPF: pre-checagem client-side ou 403 do backend
  const [cpfDiferente, setCpfDiferente] = useState(false);
  const [, navigate] = useLocation();
  // Convite aceito: contrato de quem aceitou (spec 2026-10-convite-continuar-no-app).
  // undefined = ainda nao consultado; null = aceito por outra conta.
  const [meuContrato, setMeuContrato] = useState<
    { ticket_id: number; provider_user_id: number | null } | null | undefined
  >(undefined);

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

  useEffect(() => {
    if (!token || invite?.status !== "accepted" || !isLoggedIn || acceptResult) return;
    let ativo = true;
    apiRequest("GET", `/invites/public/${token}/meu-contrato`)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (ativo) setMeuContrato(res.ok ? body?.data ?? null : null);
      })
      .catch(() => {
        if (ativo) setMeuContrato(null);
      });
    return () => {
      ativo = false;
    };
  }, [token, invite?.status, isLoggedIn, acceptResult]);

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
    // Pre-checagem client-side para convite destinado a um CPF especifico
    if (invite?.destinatario?.cpf_final) {
      if (!cpfBate(cpfDigits, invite.destinatario.cpf_final)) {
        setCpfDiferente(true);
        return;
      }
    }
    setStep(3);
  };

  // Chamado pelo StepRevisar quando o backend retorna 403 CPF_DIFERENTE
  const handleCpfDiferente = () => {
    setCpfDiferente(true);
  };

  // Chamado pelo StepRevisar quando o backend retorna 423 (link bloqueado no aceite)
  const handleBloqueadoNoAceite = () => {
    setFalha({
      tipo: "bloqueado",
      titulo: invite?.title || "Proposta",
      prestador: provider?.name || provider?.user?.name || null,
    });
  };

  // Logout e volta ao passo 1 do convite (para "Entrar com outra conta")
  const handleEntrarComOutraConta = async () => {
    await logout();
    setCpfDiferente(false);
    setStep(1);
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

  if (falha?.tipo === "bloqueado") {
    const prestadorNome = falha.prestador || "o prestador";
    return (
      <div className="container mx-auto px-4 py-24" data-testid="invite-bloqueado">
        <div className="mx-auto max-w-md space-y-4 rounded-3xl border bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600">
            <ShieldOff className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Este link foi bloqueado</h1>
          <p className="text-sm text-muted-foreground">
            Peça a <span className="font-medium text-gray-900">{prestadorNome}</span> um link novo.
          </p>
          <Button variant="outline" onClick={() => navigate("/")}>
            Ir para o início
          </Button>
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

  // Convite aceito: quem aceitou volta ao proprio contrato pelo link
  if (invite.status === "accepted" && step < 5) {
    return (
      <div className="container mx-auto px-4 py-24" data-testid="invite-already-accepted">
        <div className="mx-auto max-w-md space-y-4 rounded-3xl border bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900">Este convite já foi aceito</h1>
          {!isLoggedIn ? (
            <>
              <p className="text-sm text-muted-foreground">
                Se foi você quem aceitou, entre na sua conta para ver o contrato.
              </p>
              <div className="text-left">
                <StepConta user={user} onSuccess={() => setMeuContrato(undefined)} />
              </div>
            </>
          ) : meuContrato === undefined ? (
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
          ) : meuContrato ? (
            <Button
              data-testid="abrir-meu-contrato"
              onClick={() =>
                navigate(
                  meuContrato.provider_user_id
                    ? `/messages/${meuContrato.provider_user_id}?ticket=${meuContrato.ticket_id}`
                    : "/messages"
                )
              }
              className="w-full bg-orange-600 hover:bg-orange-700 h-11"
            >
              Abrir meu contrato
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground" data-testid="aceito-por-outra-conta">
              Este convite já foi aceito por outra conta.
            </p>
          )}
        </div>
      </div>
    );
  }

  // Cancelado ou rascunho: nao ha o que fazer pelo link
  if (invite.status !== "active" && step < 5) {
    return (
      <div className="container mx-auto px-4 py-24" data-testid="invite-unavailable">
        <div className="mx-auto max-w-md space-y-3 rounded-3xl border bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900">Este convite não está mais disponível</h1>
          <p className="text-sm text-muted-foreground">Peça ao prestador um novo link.</p>
        </div>
      </div>
    );
  }

  // Convite destinado a outro CPF
  if (cpfDiferente) {
    const prestadorNome = provider?.name || provider?.user?.name || "o prestador";
    return (
      <div className="min-h-screen bg-stone-50" data-testid="convite-outra-pessoa">
        <div className="container mx-auto px-4 py-24">
          <div className="mx-auto max-w-md rounded-3xl border bg-white shadow-sm">
            <div className="p-8 text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50">
                <Lock className="h-8 w-8 text-orange-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Este convite é para outra pessoa</h1>
              <p className="text-sm leading-relaxed text-slate-600">
                {prestadorNome} enviou esta proposta para um CPF diferente do que está na sua conta. Nada foi aceito nem assinado.
              </p>
              <p className="text-sm leading-relaxed text-slate-600">
                Se a proposta é para você, peça a {prestadorNome} um link novo com o seu CPF.
              </p>
            </div>
            <div className="border-t border-slate-100 p-6 space-y-3">
              <Button
                onClick={() => navigate("/")}
                className="w-full bg-orange-600 hover:bg-orange-700 h-11"
              >
                Ir para o início
              </Button>
              <Button
                variant="ghost"
                onClick={handleEntrarComOutraConta}
                className="w-full text-slate-600 hover:text-slate-900"
              >
                Entrar com outra conta
              </Button>
            </div>
          </div>
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
            {step === 1 && invite.destinatario?.cpf_final && (
              <div
                data-testid="faixa-convite-pessoal"
                className="mb-4 flex items-start gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3"
              >
                <Lock className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                <span className="text-sm text-orange-900">
                  <strong className="font-semibold">Convite pessoal.</strong>{" "}
                  Destinado ao CPF terminado em{" "}
                  <strong>{formatarCpfFinal(invite.destinatario.cpf_final)}</strong>.{" "}
                  Só essa pessoa consegue aceitar.
                </span>
              </div>
            )}

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
                  onCpfDiferente={handleCpfDiferente}
                  onBloqueado={handleBloqueadoNoAceite}
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
