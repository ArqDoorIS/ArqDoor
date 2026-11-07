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
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ARQDOOR_WHATSAPP_URL } from "@/lib/whatsapp";
import { useAuth } from "@/hooks/use-auth";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiRequest, API_BASE_URL } from "@/lib/queryClient";
import { formatPrice, getInitials } from "@/lib/utils";

type ProviderDashboardPayload = {
  data: {
    summary: {
      clients_contacted: number;
      open_contracts: number;
      finished_contracts: number;
      completed_payments: number;
      completed_payments_volume: number;
    };
    recent_clients: Array<{
      id: number;
      name: string;
      perfil?: string | null;
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

type HistoryModalType = "clients" | "contracts" | "payments" | null;

const buildImageUrl = (path?: string | null) => {
  if (!path) return "";
  const normalizedPath = path.replace(/\\/g, "/");
  return normalizedPath.startsWith("http")
    ? normalizedPath
    : `${API_BASE_URL}/${normalizedPath.replace(/^\/+/, "")}`;
};

const formatDate = (value?: string | null) => {
  if (!value) return "Sem registro";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sem registro";
  return date.toLocaleDateString("pt-BR");
};

const SummaryCard = ({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: any;
  label: string;
  value: string | number;
  helper: string;
}) => (
  <Card className="border-line shadow-sm">
    <CardContent className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold text-ink-strong">{value}</p>
          <p className="text-xs text-muted-foreground">{helper}</p>
        </div>
        <div className="rounded-2xl bg-brand-tint p-2.5 text-brand-dark">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const SectionHeader = ({
  title,
  description,
  showMore,
  onShowMore,
}: {
  title: string;
  description: string;
  showMore: boolean;
  onShowMore: () => void;
}) => (
  <div className="flex items-start justify-between gap-3">
    <div className="space-y-1">
      <CardTitle>{title}</CardTitle>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
    {showMore ? (
      <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={onShowMore}>
        Mostrar mais
      </Button>
    ) : null}
  </div>
);

export default function ProviderHomeDashboard() {
  const { user } = useAuth();
  const isVerified = (user as any)?.is_verified === true;

  const [draftFilters, setDraftFilters] = useState({
    dateFrom: "",
    dateTo: "",
  });
  const [activeFilters, setActiveFilters] = useState({
    dateFrom: "",
    dateTo: "",
  });
  const [historyModal, setHistoryModal] = useState<HistoryModalType>(null);

  const dashboardQuery = useQuery<ProviderDashboardPayload>({
    queryKey: ["provider-home-dashboard", activeFilters.dateFrom, activeFilters.dateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeFilters.dateFrom) params.set("dateFrom", activeFilters.dateFrom);
      if (activeFilters.dateTo) params.set("dateTo", activeFilters.dateTo);
      const response = await apiRequest(
        "GET",
        `/providers/me/dashboard${params.toString() ? `?${params.toString()}` : ""}`
      );
      if (!response.ok) {
        throw new Error("Não foi possível carregar o painel do prestador.");
      }
      return response.json();
    },
  });

  const dashboard = dashboardQuery.data?.data;

  const visibleClients = dashboard?.recent_clients.slice(0, 2) || [];
  const visibleContracts = dashboard?.recent_contracts.slice(0, 2) || [];
  const visiblePayments = dashboard?.recent_payments.slice(0, 2) || [];

  const historyModalMeta = useMemo(() => {
    if (!dashboard || !historyModal) return null;

    if (historyModal === "clients") {
      return {
        title: "Histórico de clientes",
        description: "Todos os clientes com quem você já teve interação no período filtrado.",
      };
    }

    if (historyModal === "contracts") {
      return {
        title: "Histórico de contratos",
        description: "Lista completa dos contratos recentes ligados ao seu perfil.",
      };
    }

    return {
      title: "Histórico de pagamentos",
      description: "Lista completa dos pagamentos confirmados no período filtrado.",
    };
  }, [dashboard, historyModal]);

  return (
    <div className="pt-6">
      <div>
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 pb-0 pt-8">
          <div className="flex items-center justify-between gap-3 px-1 py-1">
            <h1 className="text-xl font-semibold text-ink-strong sm:text-2xl">
              Dashboard do Profissional
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
                    <p className="font-medium text-ink-strong">Período das métricas</p>
                    <p className="text-xs text-muted-foreground">
                      Os contatos usam a data da conversa, contratos usam criação/finalização e pagamentos usam a data de quitação.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">De</label>
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
                      <label className="text-xs font-medium text-muted-foreground">Até</label>
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
                  <div className="flex items-center justify-between gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setDraftFilters({ dateFrom: "", dateTo: "" });
                        setActiveFilters({ dateFrom: "", dateTo: "" });
                      }}
                    >
                      Limpar
                    </Button>
                    <Button onClick={() => setActiveFilters(draftFilters)}>Aplicar filtro</Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {dashboardQuery.isLoading ? (
            <div className="flex min-h-[40vh] items-center justify-center rounded-3xl border border-line bg-white text-muted-foreground shadow-sm">
              <Loader2 className="mr-3 h-5 w-5 animate-spin" />
              Carregando resumo do prestador...
            </div>
          ) : dashboardQuery.isError || !dashboard ? (
            <Card className="border-danger/30 bg-danger-bg shadow-sm">
              <CardContent className="p-6 text-sm text-danger-dark">
                Não foi possível carregar o dashboard agora. Tente novamente em instantes.
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Aviso laranja sobre verificação + atalho pro WhatsApp.
                  Some quando admin já marcou a conta como verificada. */}
              {!isVerified && (
                <div className="rounded-2xl border border-brand-disabled bg-brand-tint p-4 md:p-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm md:text-base font-semibold text-brand-dark">
                      Consiga novos clientes usando a ArqDoor
                    </p>
                    <p className="text-xs md:text-sm text-brand-dark leading-relaxed">
                      Se ainda não verificou a sua conta, envie uma mensagem para o
                      nosso WhatsApp e solicite a verificação para que o seu perfil
                      esteja visível para novos clientes. Enquanto a sua conta é
                      verificada, edite o seu perfil para aumentar as suas chances
                      de receber novos clientes.
                    </p>
                  </div>
                  <Button
                    asChild
                    className="bg-brand hover:bg-brand-dark text-white whitespace-nowrap"
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
              )}

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                  icon={Users}
                  label="Clientes em contato"
                  value={dashboard.summary.clients_contacted}
                  helper="Clientes com conversa ativa no período"
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
                  label="Pagamentos concluídos"
                  value={dashboard.summary.completed_payments}
                  helper={formatPrice(dashboard.summary.completed_payments_volume || 0)}
                />
              </div>

              <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
                <div className="self-start xl:w-[62%]">
                <Card className="h-fit border-line shadow-sm">
                  <CardHeader className="p-5">
                    <SectionHeader
                      title="Clientes com interação recente"
                      description="Últimos clientes com quem você já tem conversa liberada."
                      showMore={dashboard.recent_clients.length > 2}
                      onShowMore={() => setHistoryModal("clients")}
                    />
                  </CardHeader>
                  <CardContent className="space-y-4 p-5 pt-0">
                    {visibleClients.length ? (
                      visibleClients.map((client) => (
                        <div
                          key={client.id}
                          className="flex items-center justify-between gap-4 rounded-2xl border border-line px-4 py-3"
                        >
                          <div className="flex items-center gap-3">
                            {client.perfil ? (
                              <img
                                src={buildImageUrl(client.perfil)}
                                alt={client.name}
                                className="h-11 w-11 rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand-dark">
                                {getInitials(client.name)}
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-ink-strong">{client.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Última interação em {formatDate(client.last_interaction_at)}
                              </p>
                            </div>
                          </div>
                          <Link href={`/messages/${client.id}`}>
                            <Button variant="outline">Abrir conversa</Button>
                          </Link>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-line px-4 py-6 text-sm text-muted-foreground">
                        Ainda não há clientes com conversa nesse período.
                      </div>
                    )}
                  </CardContent>
                </Card>
                </div>

                <div className="space-y-5 xl:w-[38%]">
                  <Card className="h-fit border-line shadow-sm">
                    <CardHeader className="p-5">
                      <SectionHeader
                        title="Serviços recentes"
                        description="Os serviços mais recentes ligados ao seu perfil."
                        showMore={dashboard.recent_contracts.length > 2}
                        onShowMore={() => setHistoryModal("contracts")}
                      />
                    </CardHeader>
                    <CardContent className="space-y-3 p-5 pt-0">
                      {visibleContracts.length ? (
                        visibleContracts.map((contract) => (
                          <div
                            key={contract.id}
                            className="rounded-2xl border border-line px-4 py-3"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="font-medium text-ink-strong">Contrato #{contract.id}</p>
                                <p className="text-xs text-muted-foreground">
                                  Criado em {formatDate(contract.created_at)}
                                </p>
                              </div>
                              <span className="rounded-full bg-surface-warm px-3 py-1 text-xs font-medium text-ink">
                                {contract.status}
                              </span>
                            </div>
                            <p className="mt-3 text-sm font-semibold text-success-dark">
                              {formatPrice(contract.total_price || 0)}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-dashed border-line px-4 py-6 text-sm text-muted-foreground">
                          Nenhum contrato recente nesse recorte.
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="h-fit border-line shadow-sm">
                    <CardHeader className="p-5">
                      <SectionHeader
                        title="Pagamentos concluídos"
                        description="Últimos pagamentos já confirmados para os seus serviços."
                        showMore={dashboard.recent_payments.length > 2}
                        onShowMore={() => setHistoryModal("payments")}
                      />
                    </CardHeader>
                    <CardContent className="space-y-3 p-5 pt-0">
                      {visiblePayments.length ? (
                        visiblePayments.map((payment) => (
                          <div
                            key={payment.id}
                            className="flex items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3"
                          >
                            <div>
                              <p className="font-medium text-ink-strong">
                                Pagamento #{payment.id}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {payment.method} • pago em {formatDate(payment.paid_at)}
                              </p>
                            </div>
                            <p className="font-semibold text-success-dark">
                              {formatPrice(payment.amount || 0)}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-dashed border-line px-4 py-6 text-sm text-muted-foreground">
                          Nenhum pagamento concluído nesse período.
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
      <Dialog open={historyModal !== null} onOpenChange={(open) => !open && setHistoryModal(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{historyModalMeta?.title}</DialogTitle>
            <DialogDescription>{historyModalMeta?.description}</DialogDescription>
          </DialogHeader>

          {historyModal === "clients" ? (
            <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
              {dashboard?.recent_clients.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-line px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    {client.perfil ? (
                      <img
                        src={buildImageUrl(client.perfil)}
                        alt={client.name}
                        className="h-11 w-11 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand-dark">
                        {getInitials(client.name)}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-ink-strong">{client.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Última interação em {formatDate(client.last_interaction_at)}
                      </p>
                    </div>
                  </div>
                  <Link href={`/messages/${client.id}`}>
                    <Button variant="outline">Abrir conversa</Button>
                  </Link>
                </div>
              ))}
            </div>
          ) : null}

          {historyModal === "contracts" ? (
            <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
              {dashboard?.recent_contracts.map((contract) => (
                <div
                  key={contract.id}
                  className="rounded-2xl border border-line px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-ink-strong">Contrato #{contract.id}</p>
                      <p className="text-xs text-muted-foreground">
                        Criado em {formatDate(contract.created_at)}
                      </p>
                    </div>
                    <span className="rounded-full bg-surface-warm px-3 py-1 text-xs font-medium text-ink">
                      {contract.status}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-success-dark">
                    {formatPrice(contract.total_price || 0)}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          {historyModal === "payments" ? (
            <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
              {dashboard?.recent_payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-ink-strong">
                      Pagamento #{payment.id}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {payment.method} • pago em {formatDate(payment.paid_at)}
                    </p>
                  </div>
                  <p className="font-semibold text-success-dark">
                    {formatPrice(payment.amount || 0)}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
