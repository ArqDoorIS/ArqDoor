// src/pages/ServicesFeed.tsx
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ChevronLeft,
  ChevronRight,
  List,
  Grid3X3,
  SortAsc,
  SortDesc,
  Search,
  User,
  Star,
  Clock,
  DollarSign,
  Filter,
  TrendingUp,
  Award,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { apiRequest, API_BASE_URL } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { ServicesResponse, EnrichedService } from "@/lib/Interfaces";
import { setConversationStartIntent } from "@/lib/utils";

const buildImageUrl = (path?: string) => {
  if (!path) return "";
  const normalizedPath = path.replace(/\\/g, "/");
  return normalizedPath.startsWith("http")
    ? normalizedPath
    : `${API_BASE_URL}/${normalizedPath.replace(/^\/+/, "")}`;
};

export default function ServicesFeed() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "priceAsc" | "priceDesc">("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);
  // Increase perPage to accommodate larger grids
  const perPage = 12;
  const { user: currentUser } = useAuth();
  const {
    data: servicesData,
    isLoading: loadingServices,
    isError: errorServices,
    error: servicesError
  } = useQuery<ServicesResponse>({
    queryKey: ["services-freelancer"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/servicesfreelancer/getall");
      if (!res.ok) {
        throw new Error(`Erro ao buscar serviços: ${res.status}`);
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  const {
    data: enrichedServices,
    isLoading: loadingUsers,
    isError: errorUsers
  } = useQuery<EnrichedService[]>({
    queryKey: ["enriched-services", servicesData?.servicesFreelancer?.map((s: any) => s.id_serviceFreelancer), currentUser?.id],
    queryFn: async () => {
      if (!servicesData?.servicesFreelancer) return [];
      const services = servicesData.servicesFreelancer;

      // Deduplica user IDs para não buscar o mesmo usuário duas vezes
      // Array.from em vez de espalhar o Set: o `target` do tsconfig e menor que es2015
      // e o spread de Set nao compila (TS2802). Mesmo resultado, sem mexer no target.
      const uniqueUserIds = [
        ...Array.from(
          new Set(
            services
              .map((s: any) => s.ServiceProvider?.user_id)
              .filter((id: any) => id != null && id !== currentUser?.id)
          )
        ),
      ] as number[];

      // Busca todos os usuários em paralelo (1 RTT em vez de N sequenciais)
      const userResults = await Promise.all(
        uniqueUserIds.map(async (userId) => {
          try {
            const res = await apiRequest("GET", `/users/${userId}`);
            if (!res.ok) return [userId, null] as const;
            const body = await res.json();
            return [userId, body.user] as const;
          } catch {
            return [userId, null] as const;
          }
        })
      );

      const userMap = new Map<number, any>(userResults);
      if (currentUser) userMap.set(currentUser.id, currentUser);

      return services.map((service: any) => {
        const uid = service.ServiceProvider?.user_id;
        const userData = uid != null ? userMap.get(uid) : null;
        return {
          ...service,
          userName: userData?.name ?? service.ServiceProvider?.profession ?? "Prestador",
          userEmail: userData?.email ?? "Email não disponível",
          userType: userData?.type ?? "prestador",
          userPerfil: userData?.perfil ?? null,
        } as EnrichedService;
      });
    },
    enabled: !!servicesData?.servicesFreelancer && servicesData.servicesFreelancer.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const services = enrichedServices || [];
  const loading = loadingServices || loadingUsers;
  const error = errorServices || errorUsers;

  if (loading) {
    return (
      <div className="pt-6">
        <div className="min-h-screen ">
          <div className="flex items-center justify-center h-screen">
            <div className="text-center space-y-6 bg-white/80 backdrop-blur-sm p-8 rounded-3xl border border-white/20 shadow-xl">
              <Loader2 className="animate-spin h-16 w-16 text-brand-dark mx-auto" />
              <div className="space-y-2">
                <p className="text-xl font-semibold text-ink">Carregando serviços</p>
                <p className="text-muted-foreground">Aguarde enquanto buscamos os melhores profissionais</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-6">
        <div className="min-h-screen ">
          <div className="flex items-center justify-center h-screen">
            <div className="text-center space-y-6 bg-white/80 backdrop-blur-sm p-8 rounded-3xl border border-danger/30 shadow-xl">
              <div className="w-20 h-20 bg-danger-bg rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="h-12 w-12 text-danger-dark" />
              </div>
              <div className="space-y-2">
                <p className="text-xl font-semibold text-danger-dark">Ops! Algo deu errado</p>
                <p className="text-danger-dark">
                  {servicesError?.message || "Erro ao carregar serviços"}
                </p>
              </div>
              <Button
                onClick={() => window.location.reload()}
                className="bg-brand hover:bg-brand-dark text-white font-medium px-6 py-2 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
              >
                Tentar novamente
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Filtrar e ordenar serviços
  let filtered = services.filter(
    (s) =>
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.userName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (sortBy === "newest") {
    filtered.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } else if (sortBy === "priceAsc") {
    filtered.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
  } else {
    filtered.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
  }

  const totalPages = Math.ceil(filtered.length / perPage);
  const pageItems = filtered.slice((page - 1) * perPage, page * perPage);

  const getSortLabel = () => {
    switch (sortBy) {
      case "newest": return "Mais recentes";
      case "priceAsc": return "Menor preço";
      case "priceDesc": return "Maior preço";
      default: return "Ordenar";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatPrice = (priceString: string) => {
    const price = parseFloat(priceString);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const isNewService = (dateString: string) => {
    const serviceDate = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - serviceDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7; 
  };

  return (
    <div className="pt-6">
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-12">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-ink-strong tracking-tight">Serviços Disponíveis</h1>
              <p className="text-muted-foreground mt-2">Encontre profissionais qualificados para o seu projeto</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar serviços..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full md:w-64 bg-white"
                />
              </div>
              <div className="flex items-center bg-white border rounded-md p-1">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Sort & Filters Toolbar (Simplified) */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {filtered.length} resultados
              </span>
              {searchTerm && (
                <Badge variant="secondary" className="text-xs font-normal">
                  Busca: {searchTerm}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={sortBy === "newest" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortBy("newest")}
                className="text-xs h-8"
              >
                Mais Recentes
              </Button>
              <Button
                variant={sortBy === "priceAsc" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortBy("priceAsc")}
                className="text-xs h-8"
              >
                Menor Preço
              </Button>
              <Button
                variant={sortBy === "priceDesc" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortBy("priceDesc")}
                className="text-xs h-8"
              >
                Maior Preço
              </Button>
            </div>
          </div>

          {/* Services Grid/List */}
          <div
            className={`transition-all duration-300 ${viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              : "space-y-4"
              }`}
          >
            {pageItems.map((svc, index) => (
              <Card
                key={svc.id_serviceFreelancer}
                className={`group bg-white border border-line shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 overflow-hidden flex ${viewMode === 'list' ? 'flex-row' : 'flex-col'}`}
              >
                {/* Card Content */}
                <div className={`p-5 flex flex-col ${viewMode === 'list' ? 'flex-1' : 'h-full'}`}>
                  {/* Header: Author Info */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 border border-line">
                        <AvatarImage src={buildImageUrl((svc as any).userPerfil)} />
                        <AvatarFallback className="text-xs">{svc.userName.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-ink leading-none">{svc.userName}</span>
                        <span className="text-[10px] text-muted-foreground leading-tight mt-1">{formatDate(svc.createdAt)}</span>
                      </div>
                    </div>
                    {isNewService(svc.createdAt) && (
                      <Badge className="bg-success-bg text-success-dark hover:bg-success-bg border-success/30 text-[10px] px-2 py-0.5 h-5">
                        NOVO
                      </Badge>
                    )}
                  </div>

                  {/* Body */}
                  <div className="mb-4 flex-1">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <h3 className="font-semibold text-ink-strong leading-tight line-clamp-2 group-hover:text-brand-dark transition-colors">
                              {svc.title}
                      </h3>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                      {svc.description}
                    </p>
                    <p className="text-lg font-bold text-ink-strong">
                      {formatPrice(svc.price)}
                    </p>
                  </div>

                  {/* Footer Actions */}
                  <div className="flex items-center gap-3 mt-auto pt-4 border-t border-line">
                    <Link
                      href={`/messages/${svc.ServiceProvider.user_id}?text=${encodeURIComponent(`Olá ${svc.userName}, vi seu serviço "${svc.title}" no ArqDoor e gostaria de saber mais detalhes.`)}`}
                      className="flex-1"
                      onClick={() => setConversationStartIntent(svc.ServiceProvider.user_id)}
                    >
                      <Button className="w-full bg-brand hover:bg-brand-dark text-white h-9 text-xs font-medium rounded-md">
                        Ver Detalhes / Conversar
                      </Button>
                    </Link>
                    <Link href={`/providers/${svc.ServiceProvider.provider_id}`}>
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-brand-dark hover:bg-brand-tint rounded-md">
                        <User className="h-4 w-4" />
                            </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Empty State */}
          {pageItems.length === 0 && (
            <div className="text-center py-24">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-surface-warm mb-6">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-ink-strong mb-2">Nenhum serviço encontrado</h3>
              <p className="text-muted-foreground max-w-sm mx-auto mb-6">
                Não encontramos resultados para sua busca. Tente termos diferentes ou remova os filtros.
              </p>
              <Button
                onClick={() => {
                  setSearchTerm("");
                  setSortBy("newest");
                  setPage(1);
                }}
                variant="outline"
              >
                Limpar Filtros
              </Button>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-12">
              <Button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                variant="outline"
                size="icon"
                className="h-9 w-9"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-sm font-medium text-muted-foreground">
                Página {page} de {totalPages}
              </div>
              <Button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                variant="outline"
                size="icon"
                className="h-9 w-9"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
