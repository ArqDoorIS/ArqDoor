
// src/pages/ClientProfile.tsx
import React, { useMemo, useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, API_BASE_URL } from "@/lib/queryClient";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  MessageCircle,
  Reply,
  User,
  UserRoundPlus,
} from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { setConversationStartIntent } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface UserApi {
  id: number;
  name: string;
  email: string;
  createdAt: string;
  perfil_completo?: boolean;
  cpf?: string;
  perfil?: string;
}

export interface Demand {
  id_demand: number;
  id_user: number;
  title: string;
  description: string;
  price: number;
  status: string;
  created_at: string;
}

const buildImageUrl = (path?: string) => {
  if (!path) return "";
  const normalizedPath = path.replace(/\\/g, "/");
  return normalizedPath.startsWith("http")
    ? normalizedPath
    : `${API_BASE_URL}/${normalizedPath.replace(/^\/+/, "")}`;
};

export default function ClientProfile() {
  const { user_id } = useParams<{ user_id: string }>();
  const [location, setLocation] = useLocation();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [detailsDemand, setDetailsDemand] = useState<Demand | null>(null);
  const [showReplyBlockedModal, setShowReplyBlockedModal] = useState(false);

  const selectedDemandId = useMemo(() => {
    const queryString = location.includes("?") ? location.split("?")[1] : "";
    const params = new URLSearchParams(queryString);
    const demandParam = Number(params.get("demand"));
    return Number.isInteger(demandParam) && demandParam > 0 ? demandParam : null;
  }, [location]);

  const { data: userEnv, isLoading: loadingUsers } = useQuery<{ user: UserApi }>({
    queryKey: ["user", user_id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/users/${user_id}`);
      return res.json();
    },
  });

  const user = userEnv?.user;

  const [demands, setDemands] = useState<Demand[]>([]);
  const [loadingDm, setLoadingDm] = useState(true);
  const isProviderViewer = currentUser?.type === "prestador";
  const activeDemands = useMemo(
    () =>
      demands.filter((demand) =>
        ["pendente", "em andamento"].includes(String(demand.status || "").toLowerCase())
      ),
    [demands]
  );

  useEffect(() => {
    (async () => {
      try {
        const res = await apiRequest("GET", "/demands/getall");
        const body = await res.json();
        setDemands(
          (Array.isArray(body.demands) ? body.demands : []).filter(
            (d: Demand) => String(d.id_user) === user_id
          )
        );
      } finally {
        setLoadingDm(false);
      }
    })();
  }, [user_id]);

  const connectionStatusQuery = useQuery<{
    status: "none" | "pending" | "accepted" | "rejected" | "unavailable";
    can_request: boolean;
    can_resend?: boolean;
    can_message: boolean;
    client_has_active_demand: boolean;
    eligible_demand_id?: number | null;
  }>({
    queryKey: ["client-connection-status", currentUser?.id, user_id, selectedDemandId],
    enabled: isProviderViewer && !!currentUser?.id && !!user_id,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedDemandId) {
        params.set("demand_id", String(selectedDemandId));
      }
      const response = await apiRequest(
        "GET",
        `/connections/status/${user_id}${params.toString() ? `?${params.toString()}` : ""}`
      );
      if (!response.ok) {
        throw new Error("Não foi possível verificar o status da conexão.");
      }
      return response.json();
    },
  });

  const createConnectionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/connections", {
        client_user_id: Number(user_id),
        demand_id: selectedDemandId,
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body?.success === false) {
        throw new Error(
          body?.message || "Não foi possível enviar a solicitação de conexão."
        );
      }
      return body;
    },
    onSuccess: (body) => {
      queryClient.invalidateQueries({ queryKey: ["client-connection-status"] });
      queryClient.invalidateQueries({ queryKey: ["connections-page"] });
      toast({
        title: "Solicitação enviada",
        description:
          body?.message ||
          "Agora o cliente precisa aceitar para liberar a conversa.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Não foi possível solicitar conexão",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const replyToDemandMutation = useMutation({
    mutationFn: async (demand: Demand) => {
      const conversationResponse = await apiRequest("POST", "/conversation", {
        user1_id: Number(currentUser?.id),
        user2_id: Number(user_id),
      });
      const conversationBody = await conversationResponse.json().catch(() => ({}));
      if (!conversationResponse.ok || conversationBody?.success === false) {
        throw new Error(
          conversationBody?.message || "Não foi possível iniciar a conversa."
        );
      }

      const conversationId = Number(conversationBody?.conversation?.conversation_id);
      if (!conversationId) {
        throw new Error("Conversa inválida para enviar a resposta da demanda.");
      }

      const initialMessage = `Olá ${user?.name}, referente ao projeto postado "${demand.title}", gostaria de prestar esse serviço.`;

      const messageResponse = await apiRequest("POST", "/message", {
        conversation_id: conversationId,
        content: initialMessage,
      });
      const messageBody = await messageResponse.json().catch(() => ({}));
      if (!messageResponse.ok || messageBody?.success === false) {
        throw new Error(
          messageBody?.message || "Não foi possível enviar a resposta da demanda."
        );
      }

      return {
        demand,
        conversationId,
      };
    },
    onSuccess: ({ demand }) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      setConversationStartIntent(Number(user_id));
      toast({
        title: "Resposta enviada",
        description: `A conversa foi iniciada a partir da demanda "${demand.title}".`,
      });
      setLocation(`/messages/${user_id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Não foi possível responder a demanda",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (loadingUsers) {
    return (
      <>
        <div className="flex justify-center items-center min-h-screen">
          <Loader2 className="animate-spin w-8 h-8 text-orange-600" />
        </div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <div className="flex justify-center items-center min-h-screen">
          <p className="text-slate-600">Contratante não encontrado.</p>
        </div>
      </>
    );
  }

  const getInitials = (n: string) =>
    n
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  const canShowEmail =
    !currentUser ||
    currentUser.id === user.id ||
    currentUser.type !== "prestador";

  const hasCpf = !!(user.cpf || "").replace(/\D/g, "").trim();
  const trustPercent = hasCpf && user.perfil_completo ? 100 : 60;
  const trustLabel = hasCpf && user.perfil_completo
    ? "Informações completas"
    : "Informações pendentes";

  const connectionStatus = connectionStatusQuery.data?.status || "none";
  const canMessage = connectionStatusQuery.data?.can_message;
  const canRequestConnection = connectionStatusQuery.data?.can_request;
  const canResendConnection = connectionStatusQuery.data?.can_resend;
  const hasDemandContext = !!selectedDemandId;

  const handleReplyToDemand = (demand: Demand) => {
    if (!canMessage) {
      setShowReplyBlockedModal(true);
      return;
    }
    replyToDemandMutation.mutate(demand);
  };

  const renderPrimaryAction = () => {
    if (!isProviderViewer) return null;

    if (canMessage) {
      return (
        <Button
          size="sm"
          onClick={() => {
            setConversationStartIntent(user.id);
            setLocation(`/messages/${user.id}`);
          }}
          className="mt-4 sm:mt-0 mb-2"
        >
          <MessageCircle className="w-4 h-4 mr-1" /> Conversar
        </Button>
      );
    }

    if (connectionStatus === "pending") {
      return (
        <Button size="sm" disabled className="mt-4 sm:mt-0 mb-2">
          <UserRoundPlus className="w-4 h-4 mr-1" /> Solicitação pendente
        </Button>
      );
    }

    if (canRequestConnection || canResendConnection) {
      return (
        <Button
          size="sm"
          onClick={() => createConnectionMutation.mutate()}
          disabled={createConnectionMutation.isPending}
          className="mt-4 sm:mt-0 mb-2"
        >
          {createConnectionMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <UserRoundPlus className="w-4 h-4 mr-1" />
          )}
          {connectionStatus === "rejected" ? "Solicitar novamente" : "Adicionar cliente"}
        </Button>
      );
    }

    return (
      <Button size="sm" disabled className="mt-4 sm:mt-0 mb-2">
        <UserRoundPlus className="w-4 h-4 mr-1" />
        {hasDemandContext
          ? "Aguardando demanda elegível"
          : "Selecione uma demanda abaixo"}
      </Button>
    );
  };

  return (
    <>
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Header */}
        {/* Header */}
        <Card className="overflow-hidden">
           {/* Banner */}
           <div 
             className="h-32 sm:h-48 w-full bg-slate-100 bg-cover bg-center"
             style={{ 
               backgroundImage: (user as any).banner ? `url(${buildImageUrl((user as any).banner)})` : undefined,
               backgroundColor: !(user as any).banner ? '#FEF8C3' : undefined 
             }} 
           />

          <div className="p-6 flex flex-col sm:flex-row items-center sm:items-end gap-6 -mt-12 md:-mt-16">
            <Avatar className="w-24 h-24 sm:w-32 sm:h-32 border-4 border-white shadow-md z-10">
              <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
              <AvatarImage src={buildImageUrl((user as any).perfil)} alt={user.name} className="object-cover" />
            </Avatar>
            <div className="flex-1 text-center sm:text-left pt-2 sm:pt-0">
              <h1 className="text-2xl font-bold mt-1">{user.name}</h1>
              <p className="text-slate-600">Contratante</p>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <Badge className="text-xs">Membro desde {new Date(user.createdAt).toLocaleDateString()}</Badge>
                {isProviderViewer && canMessage ? (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Conexão aceita
                  </Badge>
                ) : null}
                {isProviderViewer && connectionStatus === "pending" ? (
                  <Badge variant="secondary">Solicitação pendente</Badge>
                ) : null}
                {isProviderViewer && selectedDemandId ? (
                  <Badge variant="outline">Demanda #{selectedDemandId} selecionada</Badge>
                ) : null}
              </div>
              {isProviderViewer ? (
                <p className="mt-3 max-w-2xl text-sm text-slate-500">
                  {canMessage
                    ? "Esse cliente já aceitou sua conexão, então a conversa está liberada."
                    : hasDemandContext
                      ? "Você está visualizando o cliente a partir de uma demanda ativa. Envie a solicitação para que ele decida se quer liberar o contato."
                      : "Para pedir conexão, abra o perfil por uma demanda ativa ou selecione uma das demandas abaixo."}
                </p>
              ) : null}
            </div>
            {renderPrimaryAction()}
          </div>
        </Card>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Esquerda */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Informações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {canShowEmail ? (
                  <p><User className="w-4 h-4 inline mr-2" /> {user.email}</p>
                ) : (
                  <p className="text-sm text-slate-500">Email oculto para prestadores.</p>
                )}
                <p><Clock className="w-4 h-4 inline mr-2" /> Desde {new Date(user.createdAt).toLocaleDateString()}</p>
                <div className="pt-2">
                  <p className="text-sm font-medium">Nível de confiança</p>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="font-semibold text-slate-900">{trustPercent}%</span>
                    <span>{trustLabel}</span>
                  </div>
                  <Progress value={trustPercent} className="mt-2" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Direita */}
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Demandas Publicadas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {loadingDm ? (
                  <Loader2 className="animate-spin w-6 h-6 mx-auto" />
                ) : demands.length === 0 ? (
                  <p className="text-slate-500">Nenhuma demanda publicada.</p>
                ) : (
                  demands.map((d) => (
                    <div key={d.id_demand} className="p-3 border rounded-lg space-y-2">
                      <div>
                        <h3 className="font-semibold">{d.title}</h3>
                        <p className="text-slate-600 line-clamp-2">{d.description}</p>
                        <p className="text-green-600 font-bold">R$ {d.price}</p>
                      </div>
                      {isProviderViewer ? (
                        <div className="space-y-2">
                          <Link href={`/user/${user.id}?demand=${d.id_demand}`}>
                            <Button
                              variant={selectedDemandId === d.id_demand ? "secondary" : "default"}
                              className="w-full h-8 text-xs font-medium rounded-md"
                            >
                              {selectedDemandId === d.id_demand
                                ? "Demanda selecionada para conexão"
                                : "Usar esta demanda para solicitar conexão"}
                            </Button>
                          </Link>
                          <p className="text-[11px] text-slate-500">
                            O contato só será liberado se o cliente aceitar a solicitação.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs"
                              disabled={!canMessage}
                              onClick={() => setDetailsDemand(d)}
                            >
                              <FileText className="mr-1 h-3.5 w-3.5" />
                              Ver detalhes
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              className="h-8 text-xs"
                              disabled={replyToDemandMutation.isPending}
                              onClick={() => handleReplyToDemand(d)}
                            >
                              {replyToDemandMutation.isPending ? (
                                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Reply className="mr-1 h-3.5 w-3.5" />
                              )}
                              Reply
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">
                          Perfil visível apenas para acompanhamento do contratante.
                        </p>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={!!detailsDemand} onOpenChange={(open) => !open && setDetailsDemand(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da demanda</DialogTitle>
            <DialogDescription>
              Veja o contexto completo da postagem antes de responder.
            </DialogDescription>
          </DialogHeader>
          {detailsDemand ? (
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                  Projeto
                </p>
                <h3 className="text-xl font-semibold text-slate-900">
                  {detailsDemand.title}
                </h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Status</p>
                  <p className="mt-1 font-medium capitalize text-slate-900">
                    {detailsDemand.status}
                  </p>
                </div>
                <div className="rounded-lg border bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Valor</p>
                  <p className="mt-1 font-medium text-slate-900">R$ {detailsDemand.price}</p>
                </div>
                <div className="rounded-lg border bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Publicada em</p>
                  <p className="mt-1 font-medium text-slate-900">
                    {new Date(detailsDemand.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="rounded-xl border p-4">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                  Descrição
                </p>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
                  {detailsDemand.description}
                </p>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={showReplyBlockedModal} onOpenChange={setShowReplyBlockedModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Conexão necessária</DialogTitle>
            <DialogDescription>
              Você ainda não está conectado com o cliente, envie a conexão e após aceita você poderá responder sobre a postagem.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReplyBlockedModal(false)}>
              Entendi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
