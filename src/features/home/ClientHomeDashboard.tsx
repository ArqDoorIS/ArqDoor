import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Briefcase,
  CheckCircle2,
  CreditCard,
  Filter,
  Loader2,
  MessageCircle,
  Search,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { apiRequest, API_BASE_URL } from "@/lib/queryClient";
import { formatPrice, getInitials } from "@/lib/utils";
import { ARQDOOR_WHATSAPP_URL } from "@/lib/whatsapp";
import { useAuth } from "@/hooks/use-auth";

type ClientDashboardPayload = {
  data: {
    summary: {
      providers_contacted: number;
      open_contracts: number;
      finished_contracts: number;
      completed_payments: number;
      completed_payments_volume: number;
    };
    recent_providers: Array<{
      id: number;
      name: string;
      perfil?: string | null;
      profession?: string | null;
      provider_id?: number | null;
      last_interaction_at: string;
      conversation_id: number;
    }>;
    recent_contracts: Array<{
      id: number;
      status: string;
      total_price: number;
      created_at: string;
      updated_at: string;
      conversation_id: number;
    }>;
    recent_payments: Array<{
      id: number;
      amount: number;
      method: string;
      paid_at?: string | null;
      ticket_id: number;
      status: string;
    }>;
    filters: {
      date_from?: string;
      date_to?: string;
    };
  };
};

const buildImageUrl = (path?: string | null) => {
  if (!path) return "";
  const normalizedPath = path.replace(/\\/g, "/");
  return normalizedPath.startsWith("http")
    ? normalizedPath
    : `${API_BASE_URL}/${normalizedPath.replace(/^\/+/, "")}`;
};

const formatDate = (iso?: string | null) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return "";
  }
};

type SummaryCardProps = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  helper?: string;
};

function SummaryCard({ icon: Icon, label, value, helper }: SummaryCardProps) {
  return (
    <Card className="border-slate-200">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-600">{label}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
            {helper && <p className="mt-1 text-xs text-slate-500">{helper}</p>}
          </div>
          <div className="rounded-full bg-amber-100 p-2 text-amber-700">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
    </div>
  );
}

export default function ClientHomeDashboard() {
  const { user } = useAuth();
  const isVerified = (user as any)?.is_verified === true;

  const [draftFilters, setDraftFilters] = useState({ dateFrom: "", dateTo: "" });
  const [activeFilters, setActiveFilters] = useState({ dateFrom: "", dateTo: "" });

  const dashboardQuery = useQuery<ClientDashboardPayload>({
    queryKey: ["client-home-dashboard", activeFilters.dateFrom, activeFilters.dateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeFilters.dateFrom) params.set("dateFrom", activeFilters.dateFrom);
      if (activeFilters.dateTo) params.set("dateTo", activeFilters.dateTo);
      const response = await apiRequest(
        "GET",
        `/users/me/dashboard${params.toString() ? `?${params.toString()}` : ""}`
      );
      if (!response.ok) throw new Error(`Erro ${response.status}`);
      return response.json();
    },
    staleTime: 60_000,
  });

  const dashboard = dashboardQuery.data?.data;
  const isLoading = dashboardQuery.isLoading;
  const isError = dashboardQuery.isError;

  const applyFilters = () => setActiveFilters(draftFilters);
  const resetFilters = () => {
    setDraftFilters({ dateFrom: "", dateTo: "" });
    setActiveFilters({ dateFrom: "", dateTo: "" });
  };

  const visibleProviders = useMemo(
    () => (dashboard?.recent_providers || []).slice(0, 3),
    [dashboard?.recent_providers]
  );
  const visibleContracts = useMemo(
    () => (dashboard?.recent_contracts || []).slice(0, 2),
    [dashboard?.recent_contracts]
  );
  const visiblePayments = useMemo(
    () => (dashboard?.recent_payments || []).slice(0, 2),
    [dashboard?.recent_payments]
  );

  return (
    <div className="pt-6">
      <div className="bg-white xl:h-[calc(100dvh-5.5rem)] xl:overflow-hidden">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 pb-0 pt-8">
          <div className="flex items-center justify-between gap-3 px-1 py-1">
            <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
              Dashboard do Cliente
            </h1>
            <div className="flex items-center gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Filtrar datas
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 space-y-4">
                  <div className="space-y-1">
                    <p className="font-medium text-slate-900">Período das métricas</p>
                    <p className="text-xs text-slate-500">
                      Filtre por intervalo de datas.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-600">De</label>
                      <Input
                        type="date"
                        value={draftFilters.dateFrom}
                        onChange={(event) =>
                          setDraftFilters((current) => ({
                            ...current,
                            dateFrom: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-600">Até</label>
                      <Input
                        type="date"
                        value={draftFilters.dateTo}
                        onChange={(event) =>
                          setDraftFilters((current) => ({
                            ...current,
                            dateTo: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <Button variant="ghost" size="sm" onClick={resetFilters}>
                      Limpar
                    </Button>
                    <Button size="sm" onClick={applyFilters}>
                      Aplicar
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {isLoading ? (
            <Card className="border-slate-200">
              <CardContent className="flex items-center justify-center p-12 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Carregando dashboard...
              </CardContent>
            </Card>
          ) : isError || !dashboard ? (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-6 text-sm text-red-700">
                Não foi possível carregar o dashboard agora. Tente novamente em instantes.
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Banner pra cliente não-verificado — orienta a buscar profissionais */}
              {!isVerified && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 md:p-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm md:text-base font-semibold text-amber-900">
                      Encontre profissionais verificados pela ArqDoor
                    </p>
                    <p className="text-xs md:text-sm text-amber-800 leading-relaxed">
                      Procure por arquitetos, engenheiros e outros profissionais
                      verificados pela nossa equipe. Em caso de dúvidas, fale com a
                      gente pelo WhatsApp.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      asChild
                      variant="outline"
                      className="whitespace-nowrap"
                    >
                      <Link href="/services">
                        <Search className="h-4 w-4 mr-2" />
                        Buscar profissionais
                      </Link>
                    </Button>
                    <Button
                      asChild
                      className="bg-amber-600 hover:bg-amber-700 text-white whitespace-nowrap"
                    >
                      <a
                        href={ARQDOOR_WHATSAPP_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Entrar em contato
                      </a>
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                  icon={Users}
                  label="Profissionais em contato"
                  value={dashboard.summary.providers_contacted}
                  helper="Prestadores com conversa ativa"
                />
                <SummaryCard
                  icon={Briefcase}
                  label="Serviços em aberto"
                  value={dashboard.summary.open_contracts}
                  helper="Pendentes ou em andamento"
                />
                <SummaryCard
                  icon={CheckCircle2}
                  label="Serviços finalizados"
                  value={dashboard.summary.finished_contracts}
                  helper="Serviços concluídos no período"
                />
                <SummaryCard
                  icon={CreditCard}
                  label="Pagamentos realizados"
                  value={dashboard.summary.completed_payments}
                  helper={formatPrice(dashboard.summary.completed_payments_volume || 0)}
                />
              </div>

              <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
                <div className="self-start xl:w-[62%]">
                  <Card className="h-fit border-slate-200 shadow-sm">
                    <CardHeader className="p-5">
                      <SectionHeader
                        title="Profissionais com interação recente"
                        description="Últimos prestadores com quem você já tem conversa liberada."
                      />
                    </CardHeader>
                    <CardContent className="space-y-3 p-5 pt-0">
                      {visibleProviders.length ? (
                        visibleProviders.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-sm font-semibold text-amber-800 overflow-hidden">
                                {p.perfil ? (
                                  <img
                                    src={buildImageUrl(p.perfil)}
                                    alt={p.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  getInitials(p.name)
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-slate-900">{p.name}</p>
                                <p className="text-xs text-slate-500">
                                  {p.profession || "Profissional"}
                                  {" • Última interação em "}
                                  {formatDate(p.last_interaction_at)}
                                </p>
                              </div>
                            </div>
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/messages/${p.id}`}>Abrir conversa</Link>
                            </Button>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                          Você ainda não tem conversas com profissionais.
                          <Link href="/services" className="ml-1 underline text-amber-700">
                            Buscar profissionais
                          </Link>
                          .
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-5 xl:w-[38%]">
                  <Card className="h-fit border-slate-200 shadow-sm">
                    <CardHeader className="p-5">
                      <SectionHeader
                        title="Serviços recentes"
                        description="Os serviços mais recentes ligados ao seu perfil."
                      />
                    </CardHeader>
                    <CardContent className="space-y-3 p-5 pt-0">
                      {visibleContracts.length ? (
                        visibleContracts.map((contract) => (
                          <div
                            key={contract.id}
                            className="rounded-2xl border border-slate-200 px-4 py-3"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="font-medium text-slate-900">
                                  Contrato #{contract.id}
                                </p>
                                <p className="text-xs text-slate-500">
                                  Criado em {formatDate(contract.created_at)}
                                </p>
                              </div>
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                                {contract.status}
                              </span>
                            </div>
                            <p className="mt-3 text-sm font-semibold text-green-700">
                              {formatPrice(contract.total_price || 0)}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                          Nenhum serviço recente.
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="h-fit border-slate-200 shadow-sm">
                    <CardHeader className="p-5">
                      <SectionHeader
                        title="Pagamentos realizados"
                        description="Últimos pagamentos confirmados nos seus serviços."
                      />
                    </CardHeader>
                    <CardContent className="space-y-3 p-5 pt-0">
                      {visiblePayments.length ? (
                        visiblePayments.map((payment) => (
                          <div
                            key={payment.id}
                            className="rounded-2xl border border-slate-200 px-4 py-3"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="font-medium text-slate-900">
                                  Pagamento #{payment.id}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {payment.method} • pago em {formatDate(payment.paid_at)}
                                </p>
                              </div>
                              <p className="text-sm font-semibold text-green-700">
                                {formatPrice(payment.amount || 0)}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                          Nenhum pagamento realizado.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
