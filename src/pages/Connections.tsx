import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Check, Link2, Loader2, UserRoundPlus, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, API_BASE_URL } from "@/lib/queryClient";
import { getInitials } from "@/lib/utils";

type ClientConnection = {
  id: number;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  updated_at: string;
  provider_profile_id?: number | null;
  counterpart?: {
    id: number;
    name: string;
    email?: string | null;
    type: "contratante" | "prestador";
    perfil?: string | null;
  } | null;
};

type ConnectionsResponse = {
  incoming_requests: ClientConnection[];
  accepted_connections: ClientConnection[];
  pending_connections: ClientConnection[];
  connections: ClientConnection[];
};

const buildImageUrl = (path?: string | null) => {
  if (!path) return "";
  const normalizedPath = path.replace(/\\/g, "/");
  return normalizedPath.startsWith("http")
    ? normalizedPath
    : `${API_BASE_URL}/${normalizedPath.replace(/^\/+/, "")}`;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "Sem data";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sem data";
  return date.toLocaleString("pt-BR");
};

export default function ConnectionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const connectionsQuery = useQuery<ConnectionsResponse>({
    queryKey: ["connections-page", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const response = await apiRequest("GET", "/connections");
      if (!response.ok) {
        throw new Error("Não foi possível carregar as conexões.");
      }
      return response.json();
    },
  });

  const respondMutation = useMutation({
    mutationFn: async ({
      connectionId,
      status,
    }: {
      connectionId: number;
      status: "accepted" | "rejected";
    }) => {
      const response = await apiRequest(
        "PATCH",
        `/connections/${connectionId}/respond`,
        { status }
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body?.success === false) {
        throw new Error(body?.message || "Não foi possível responder a solicitação.");
      }
      return body;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["connections-page"] });
      toast({
        title:
          variables.status === "accepted"
            ? "Conexão aprovada"
            : "Solicitação recusada",
        description:
          variables.status === "accepted"
            ? "O prestador já pode falar com você pela plataforma."
            : "A solicitação foi encerrada.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const incoming =
    user?.type === "contratante"
      ? connectionsQuery.data?.incoming_requests || []
      : connectionsQuery.data?.pending_connections || [];
  const accepted = connectionsQuery.data?.accepted_connections || [];

  return (
    <div className="pt-6">
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-orange-600">
                  Conexões
                </p>
                <h1 className="text-3xl font-semibold text-slate-900">
                  {user?.type === "contratante"
                    ? "Gerencie quem quer se conectar com você"
                    : "Acompanhe os clientes que você solicitou"}
                </h1>
                <p className="max-w-2xl text-sm text-slate-600">
                  {user?.type === "contratante"
                    ? "Aprove pedidos de conexão para liberar conversa com prestadores quando fizer sentido para você."
                    : "As solicitações ficam pendentes até o cliente aceitar. Depois disso, a conversa passa a ser liberada."}
                </p>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <Link2 className="h-4 w-4" />
                <span>{incoming.length} pendente(s)</span>
              </div>
            </div>
          </div>

          {connectionsQuery.isLoading ? (
            <div className="flex min-h-[40vh] items-center justify-center rounded-3xl border border-slate-200 bg-white text-slate-500 shadow-sm">
              <Loader2 className="mr-3 h-5 w-5 animate-spin" />
              Carregando conexões...
            </div>
          ) : connectionsQuery.isError ? (
            <Card className="border-red-200 bg-red-50 shadow-sm">
              <CardContent className="p-6 text-sm text-red-700">
                Não foi possível carregar as conexões agora.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle>
                    {user?.type === "contratante"
                      ? "Pedidos recebidos"
                      : "Solicitações enviadas"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {incoming.length ? (
                    incoming.map((connection) => {
                      const counterpart = connection.counterpart;
                      const profileHref =
                        connection.provider_profile_id && counterpart?.type === "prestador"
                          ? `/providers/${connection.provider_profile_id}`
                          : counterpart
                            ? `/user/${counterpart.id}`
                            : "#";

                      return (
                        <div
                          key={connection.id}
                          className="rounded-2xl border border-slate-200 px-4 py-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-12 w-12">
                                <AvatarImage src={buildImageUrl(counterpart?.perfil)} />
                                <AvatarFallback>
                                  {getInitials(counterpart?.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-slate-900">
                                  {counterpart?.name || "Prestador"}
                                </p>
                                <p className="text-sm text-slate-500">
                                  Pedido em {formatDateTime(connection.created_at)}
                                </p>
                              </div>
                            </div>
                            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                              {connection.status === "pending" ? "Pendente" : "Em análise"}
                            </span>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <Link href={profileHref}>
                              <Button variant="outline">Ver perfil</Button>
                            </Link>
                            {user?.type === "contratante" ? (
                              <>
                                <Button
                                  onClick={() =>
                                    respondMutation.mutate({
                                      connectionId: connection.id,
                                      status: "accepted",
                                    })
                                  }
                                  disabled={respondMutation.isPending}
                                  className="gap-2"
                                >
                                  <Check className="h-4 w-4" />
                                  Aceitar
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={() =>
                                    respondMutation.mutate({
                                      connectionId: connection.id,
                                      status: "rejected",
                                    })
                                  }
                                  disabled={respondMutation.isPending}
                                  className="gap-2"
                                >
                                  <X className="h-4 w-4" />
                                  Recusar
                                </Button>
                              </>
                            ) : null}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-sm text-slate-500">
                      {user?.type === "contratante"
                        ? "Você ainda não recebeu pedidos de conexão."
                        : "Você ainda não enviou solicitações pendentes."}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle>Conexões aprovadas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {accepted.length ? (
                    accepted.map((connection) => {
                      const counterpart = connection.counterpart;
                      const profileHref =
                        connection.provider_profile_id && counterpart?.type === "prestador"
                          ? `/providers/${connection.provider_profile_id}`
                          : counterpart
                            ? `/user/${counterpart.id}`
                            : "#";
                      return (
                        <div
                          key={connection.id}
                          className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 px-4 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-11 w-11">
                              <AvatarImage src={buildImageUrl(counterpart?.perfil)} />
                              <AvatarFallback>
                                {getInitials(counterpart?.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-slate-900">
                                {counterpart?.name || "Conexão"}
                              </p>
                              <p className="text-xs text-slate-500">
                                Atualizado em {formatDateTime(connection.updated_at)}
                              </p>
                            </div>
                          </div>
                          <Link href={profileHref}>
                            <Button variant="outline">Ver perfil</Button>
                          </Link>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-sm text-slate-500">
                      Nenhuma conexão aprovada até o momento.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
