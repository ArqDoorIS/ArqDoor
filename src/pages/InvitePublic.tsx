import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";
import { apiRequest, API_BASE_URL } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn, formatDate, formatPrice } from "@/lib/utils";
import { Clock, FileText, Loader2, SearchX } from "lucide-react";
import { falhaDoConvitePublico, formatInviteExpiry, type FalhaDoConvite } from "@/lib/invite-validity";
import { AuthModals } from "@/components/modals/AuthModals";

type InviteStep = {
  title: string;
  price: number;
  start_date?: string | null;
  end_date?: string | null;
  group_id?: number | null;
  payment_group_id?: number | null;
};

type PaymentGroup = {
  id: number;
  name: string;
  sequence: number;
};

type InviteData = {
  id: number;
  token: string;
  status: "draft" | "active" | "accepted" | "cancelled";
  steps: InviteStep[];
  contract_pdf_url?: string | null;
  has_contract_pdf?: boolean;
  payment_preference?: "custom";
  provider_receiving_method?: "escrow" | "standard";
  payment_groups?: PaymentGroup[];
  created_at?: string;
};

const RECEIVING_METHOD_LABELS: Record<string, string> = {
  escrow: "Escrow",
  standard: "Padrão",
};

const inviteJourney = [
  {
    id: "login",
    title: "Entrar",
    description: "Faça login ou crie sua conta para assumir este contrato.",
  },
  {
    id: "cpf",
    title: "Confirmar CPF",
    description: "Complete sua identificação antes da assinatura.",
  },
  {
    id: "review",
    title: "Revisar grupos",
    description: "Confira etapas, grupos e o PDF do contrato.",
  },
  {
    id: "sign",
    title: "Assinar",
    description: "Aceite o contrato para seguir direto para a conversa.",
  },
] as const;

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
    const maybe = raw as any;
    if (Array.isArray(maybe.steps)) return maybe.steps as InviteStep[];
    if (Array.isArray(maybe.data)) return maybe.data as InviteStep[];
  }
  return [];
};

export default function InvitePublic() {
  const { token } = useParams<{ token: string }>();
  const [, navigate] = useLocation();
  const { user, isLoggedIn, updateUserLocal } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [falha, setFalha] = useState<FalhaDoConvite | null>(null);
  const [provider, setProvider] = useState<any>(null);
  const [cpfInput, setCpfInput] = useState("");
  const [savingCpf, setSavingCpf] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [pendingAccept, setPendingAccept] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);

  useEffect(() => {
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
        } else {
          setInvite(null);
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

    if (token) {
      fetchInvite();
    }
  }, [token, toast]);

  const pdfUrl = useMemo(() => {
    if (!invite?.contract_pdf_url) return "";
    if (invite.contract_pdf_url.startsWith("http")) return invite.contract_pdf_url;
    return `${API_BASE_URL}/${invite.contract_pdf_url.replace(/^\/+/, "")}`;
  }, [invite]);

  const safeSteps = useMemo(() => normalizeInviteSteps(invite?.steps), [invite]);
  const total = useMemo(() => {
    return safeSteps.reduce((acc, step) => acc + (Number(step.price) || 0), 0);
  }, [safeSteps]);

  // Derive groups from steps (New Logic)
  const paymentGroups = useMemo(() => {
    // Check if groups are already provided (unlikely given backend)
    if (invite?.payment_groups && invite.payment_groups.length > 0) return invite.payment_groups;

    // Derive groups
    const groupsMap = new Map<number, PaymentGroup>();
    safeSteps.forEach(step => {
        const gid = step.group_id || step.payment_group_id;
         if (gid) {
             if (!groupsMap.has(gid)) {
                 groupsMap.set(gid, {
                     id: gid,
                     name: `Grupo ${gid}`, // Default name if not found
                     sequence: gid
                 });
             }
         }
    });
    return Array.from(groupsMap.values()).sort((a, b) => a.sequence - b.sequence);
  }, [invite, safeSteps]);

  const cpfDigits = (user?.cpf || "").toString().replace(/\D/g, "");
  const needsCpf = isLoggedIn && cpfDigits.length !== 11;
  const inviteUnavailable = invite?.status && invite.status !== "active";
  const currentJourneyStep = useMemo(() => {
    if (inviteUnavailable) return 4;
    if (!isLoggedIn) return 1;
    if (needsCpf) return 2;
    if (!pdfUrl) return 3;
    return 4;
  }, [inviteUnavailable, isLoggedIn, needsCpf, pdfUrl]);
  const journeySummary = useMemo(() => {
    if (inviteUnavailable) {
      return {
        title:
          invite?.status === "accepted"
            ? "Este convite já foi utilizado"
            : "Este convite não está mais disponível",
        description:
          invite?.status === "accepted"
            ? "O contrato já foi aceito anteriormente e não pode ser reutilizado."
            : "Peça ao prestador para gerar um novo link se você ainda precisar continuar.",
      };
    }

    if (!isLoggedIn) {
      return {
        title: "Primeiro passo: entrar na plataforma",
        description:
          "Você precisa estar autenticado para assumir o contrato e abrir a conversa com o prestador.",
      };
    }

    if (needsCpf) {
      return {
        title: "Segundo passo: confirmar seu CPF",
        description:
          "Esse dado é obrigatório para a assinatura e para a geração futura dos pagamentos do contrato.",
      };
    }

    if (!pdfUrl) {
      return {
        title: "Terceiro passo: aguardar o PDF do contrato",
        description:
          "As etapas já estão organizadas, mas o prestador ainda precisa anexar o PDF para a assinatura final.",
      };
    }

    return {
      title: "Último passo: assinar o contrato",
      description:
        "Você já revisou os grupos e está com o CPF em dia. Agora é só confirmar para seguir à conversa.",
    };
  }, [invite?.status, inviteUnavailable, isLoggedIn, needsCpf, pdfUrl]);

  const handleSaveCpf = async () => {
    const digits = cpfInput.replace(/\D/g, "").slice(0, 11);
    if (digits.length !== 11) {
      toast({
        title: "CPF inválido",
        description: "Informe os 11 dígitos do CPF.",
        variant: "destructive",
      });
      return;
    }
    try {
      setSavingCpf(true);
      const res = await apiRequest("PUT", `/users/${user?.id}`, { cpf: digits });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.success === false) {
        throw new Error(body?.message || "Erro ao salvar CPF.");
      }
      updateUserLocal({ cpf: digits });
      toast({ title: "CPF salvo com sucesso." });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar CPF",
        description: error?.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSavingCpf(false);
    }
  };

  const handleAccept = async () => {
    if (!isLoggedIn) {
      setPendingAccept(true);
      setRegisterOpen(true);
      return;
    }
    if (needsCpf) {
      toast({
        title: "CPF obrigatório",
        description: "Informe o CPF antes de assinar o contrato.",
        variant: "destructive",
      });
      return;
    }

    try {
      setAccepting(true);
      const res = await apiRequest("POST", `/invites/public/${token}/accept`, {});
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.success === false) {
        throw new Error(body?.message || "Erro ao aceitar convite.");
      }
      toast({
        title: "Proposta adicionada!",
        description: "Revise o contrato e assine para iniciar o projeto.",
      });
      if (body?.data?.provider_user_id) {
        navigate(`/messages/${body.data.provider_user_id}?ticket=${body.data.ticket_id}&view=contract`);
      }
    } catch (error: any) {
      toast({
        title: "Falha ao adicionar proposta",
        description: error?.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setAccepting(false);
    }
  };

  useEffect(() => {
    if (!pendingAccept || !isLoggedIn) return;
    if (needsCpf) return;
    setPendingAccept(false);
    handleAccept();
  }, [pendingAccept, isLoggedIn, needsCpf, handleAccept]);

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

  return (
    <div className="container mx-auto px-4 py-24">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="rounded-3xl border bg-white shadow-sm p-6 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Convite #{invite.id}
              </h1>
              <p className="text-sm text-muted-foreground">
                {invite.created_at || (invite as any)?.createdAt
                  ? `Criado em ${formatDate(invite.created_at || (invite as any).createdAt)}`
                  : "Convite ativo"}
              </p>
            </div>
            <Badge variant="outline">
              Pagamento em garantia
            </Badge>
          </div>

          {provider?.user && (
            <div className="text-sm text-muted-foreground">
              Prestador: <span className="font-medium text-gray-900">{provider.user.name}</span>{" "}
              {provider.profession ? `· ${provider.profession}` : ""}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-700">
            <span>Total: <strong>{formatPrice(total)}</strong></span>
            <span>Etapas: <strong>{safeSteps.length}</strong></span>
            <span>
              Recebimento:{" "}
              <strong>
                {RECEIVING_METHOD_LABELS[invite.provider_receiving_method || "escrow"] ||
                  "Escrow"}
              </strong>
            </span>
          </div>

          {pdfUrl ? (
            <Button variant="outline" onClick={() => window.open(pdfUrl, "_blank")}>
              <FileText className="h-4 w-4 mr-2" /> Ver contrato em PDF
            </Button>
          ) : (
            <p className="text-sm text-orange-600">
              Este convite ainda não possui contrato anexado.
            </p>
          )}
        </div>

        <div className="rounded-3xl border bg-white shadow-sm p-6 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Como aceitar este contrato</h2>
              <p className="text-sm text-muted-foreground">
                O fluxo abaixo mostra exatamente onde você está e o que falta para concluir.
              </p>
            </div>
            <Badge variant="outline">Etapa {currentJourneyStep} de 4</Badge>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            {inviteJourney.map((step, index) => {
              const stepNumber = index + 1;
              const isDone = !inviteUnavailable && stepNumber < currentJourneyStep;
              const isCurrent = stepNumber === currentJourneyStep;

              return (
                <div
                  key={step.id}
                  className={cn(
                    "rounded-2xl border p-4 transition-colors",
                    isCurrent
                      ? "border-orange-300 bg-orange-50"
                      : isDone
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-slate-200 bg-slate-50"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold",
                        isCurrent
                          ? "bg-orange-500 text-white"
                          : isDone
                            ? "bg-emerald-500 text-white"
                            : "bg-white text-slate-700 border border-slate-200"
                      )}
                    >
                      {isDone ? "OK" : stepNumber}
                    </div>
                    <span
                      className={cn(
                        "text-[11px] font-semibold uppercase tracking-[0.14em]",
                        isCurrent
                          ? "text-orange-700"
                          : isDone
                            ? "text-emerald-700"
                            : "text-slate-500"
                      )}
                    >
                      {isCurrent ? "Agora" : isDone ? "Concluído" : "Depois"}
                    </span>
                  </div>
                  <div className="mt-3 text-sm font-semibold text-slate-900">
                    {step.title}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-orange-700">
              Próximo passo
            </div>
            <div className="mt-1 text-sm font-semibold text-orange-900">
              {journeySummary.title}
            </div>
            <p className="mt-1 text-sm leading-relaxed text-slate-700">
              {journeySummary.description}
            </p>
          </div>
        </div>

        {paymentGroups.length > 0 ? (
          <div className="rounded-3xl border bg-white shadow-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">3. Revisão dos grupos de pagamento</h2>
            <p className="text-sm text-muted-foreground">
              Este contrato está organizado em {paymentGroups.length} grupo(s) de pagamento em garantia.
              Você pagará cada grupo completo em sequência.
            </p>
            <div className="space-y-4">
              {paymentGroups
                .map((group, groupIdx) => {
                  const groupSteps = safeSteps.filter(
                    (s) => (s.group_id || s.payment_group_id) === group.id
                  );
                  const groupTotal = groupSteps.reduce(
                    (sum, s) => sum + (Number(s.price) || 0),
                    0
                  );

                  return (
                    <div
                      key={group.id}
                      className="rounded-2xl border-2 border-orange-200 bg-gradient-to-br from-orange-50/50 to-white p-5 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-orange-500 flex items-center justify-center shrink-0">
                            <span className="text-white font-bold">{groupIdx + 1}</span>
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{group.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {groupSteps.length} etapa(s)
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-orange-600">
                            {formatPrice(groupTotal)}
                          </p>
                          <p className="text-xs text-muted-foreground">Total do grupo</p>
                        </div>
                      </div>

                      <div className="space-y-2 pl-13">
                        {groupSteps.map((step, stepIdx) => (
                          <div
                            key={`${step.title}-${stepIdx}`}
                            className="flex items-center justify-between gap-2 text-sm p-2 rounded-lg bg-white/50"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-orange-500">•</span>
                              <span className="text-gray-700">{step.title}</span>
                            </div>
                            <span className="font-medium text-gray-600">
                              {formatPrice(Number(step.price) || 0)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {(groupSteps[0]?.start_date || groupSteps[0]?.end_date) && (
                        <div className="text-xs text-muted-foreground pl-13 pt-2 border-t border-orange-100">
                          {groupSteps[0].start_date
                            ? `Início: ${formatDate(groupSteps[0].start_date)}`
                            : ""}
                          {groupSteps[0].end_date
                            ? ` · Fim: ${formatDate(groupSteps[0].end_date)}`
                            : ""}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        ) : (
          /* Regular step-by-step view */
          <div className="rounded-3xl border bg-white shadow-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">3. Revisão das etapas do contrato</h2>
            <div className="space-y-3">
              {safeSteps.map((step, idx) => (
                <div key={`${step.title}-${idx}`} className="rounded-2xl border p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-gray-900">Etapa {idx + 1}</p>
                      <p className="text-sm text-muted-foreground">{step.title}</p>
                    </div>
                    <span className="font-semibold text-gray-900">
                      {formatPrice(Number(step.price) || 0)}
                    </span>
                  </div>
                  {(step.start_date || step.end_date) && (
                    <div className="text-xs text-muted-foreground mt-2">
                      {step.start_date ? `Início: ${formatDate(step.start_date)}` : ""}
                      {step.end_date ? ` · Fim: ${formatDate(step.end_date)}` : ""}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-3xl border bg-white shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">4. Assinatura do contrato</h2>

          {inviteUnavailable ? (
            <p className="text-sm text-muted-foreground">
              {invite.status === "accepted"
                ? "Este convite já foi utilizado."
                : "Este convite não está mais disponível."}
            </p>
          ) : !pdfUrl ? (
            <p className="text-sm text-muted-foreground">
              O contrato ainda não foi anexado pelo prestador.
            </p>
          ) : !isLoggedIn ? (
            <>
              <p className="text-sm text-muted-foreground">
                Faça login ou cadastro (Google ou e-mail) para adicionar esta proposta aos seus contratos.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPendingAccept(true);
                    setLoginOpen(true);
                  }}
                >
                  Já tenho conta
                </Button>
                <Button
                  onClick={() => {
                    setPendingAccept(true);
                    setRegisterOpen(true);
                  }}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  Criar conta para assinar
                </Button>
              </div>
            </>
          ) : needsCpf ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Informe seu CPF para adicionar a proposta aos seus contratos.
              </p>
              <div className="flex flex-col md:flex-row gap-3">
                <Input
                  placeholder="CPF (somente números)"
                  value={cpfInput}
                  onChange={(e) => setCpfInput(e.target.value)}
                />
                <Button onClick={handleSaveCpf} disabled={savingCpf}>
                  {savingCpf ? "Salvando..." : "Salvar CPF"}
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={handleAccept} disabled={accepting} className="bg-orange-600 hover:bg-orange-700">
              {accepting ? "Adicionando..." : "Adicionar aos meus contratos"}
            </Button>
          )}
        </div>
      </div>

      <AuthModals
        isLoginOpen={loginOpen}
        isRegisterOpen={registerOpen}
        onLoginClose={() => {
          setLoginOpen(false);
          setPendingAccept(false);
        }}
        onRegisterClose={() => {
          setRegisterOpen(false);
          setPendingAccept(false);
        }}
        onSuccess={() => {
          setLoginOpen(false);
          setRegisterOpen(false);
        }}
        onSwitchToRegister={() => {
          setLoginOpen(false);
          setRegisterOpen(true);
        }}
        onSwitchToLogin={() => {
          setRegisterOpen(false);
          setLoginOpen(true);
        }}
      />
    </div>
  );
}
