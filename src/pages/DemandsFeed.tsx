// src/pages/DemandsPage.tsx
import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  User,
  Grid3X3,
  List
} from "lucide-react";
import { API_BASE_URL } from "@/lib/queryClient";
import { Demand, EnrichedDemand } from "@/lib/Interfaces";
import { getInitials } from "@/lib/utils";
import { buscarTodasAsDemandas } from "@/lib/demandasPublicas";

const buildImageUrl = (path?: string) => {
  if (!path) return "";
  const normalizedPath = path.replace(/\\/g, "/");
  return normalizedPath.startsWith("http")
    ? normalizedPath
    : `${API_BASE_URL}/${normalizedPath.replace(/^\/+/, "")}`;
};

export default function DemandsPage() {
  const [demands, setDemands] = useState<EnrichedDemand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "priceAsc" | "priceDesc">("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);
  const perPage = 12;

  useEffect(() => {
    (async () => {
      try {
        const fetchedDemands: Demand[] = await buscarTodasAsDemandas();

        const enriched: EnrichedDemand[] = fetchedDemands.map(d => {
          return {
            ...d,
            userName: d.User?.name || "Usuário Desconhecido",
            userEmail: d.User?.email || "N/A",
            userPerfil: (d.User as any)?.perfil,
            price: parseFloat((d as any).price || (d as any).budget || '0') // Garante que o preço é um número
          } as any;
        });

        setDemands(enriched);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="pt-6">
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-line border-t-brand mb-4"></div>
            <p className="text-muted-foreground font-medium">Carregando demandas...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-6">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center p-8 bg-white rounded-lg shadow-sm border border-line max-w-md">
            <div className="w-12 h-12 bg-danger-bg rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-danger-dark text-xl font-bold">!</span>
            </div>
            <h3 className="text-lg font-bold text-ink mb-2">Erro ao carregar</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline">Tentar novamente</Button>
          </div>
        </div>
      </div>
    );
  }

  let filtered = demands.filter(
    (d) =>
      d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (sortBy === "newest") {
    filtered.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } else if (sortBy === "priceAsc") {
    filtered.sort((a, b) => a.price - b.price);
  } else {
    filtered.sort((a, b) => b.price - a.price);
  }

  const totalPages = Math.ceil(filtered.length / perPage);
  const pageItems = filtered.slice((page - 1) * perPage, page * perPage);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  return (
    <div className="pt-6">
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-12">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-ink-strong tracking-tight">Demandas Recentes</h1>
              <p className="text-muted-foreground mt-2">Veja o que os clientes estão precisando agora</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar demandas..."
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
                Menor Valor
              </Button>
              <Button
                variant={sortBy === "priceDesc" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortBy("priceDesc")}
                className="text-xs h-8"
              >
                Maior Valor
              </Button>
            </div>
          </div>

          {/* Demands Grid/List */}
          <div
            className={`transition-all duration-300 ${viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              : "space-y-4"
              }`}
          >
            {pageItems.map((demand, index) => (
              <Card
                key={demand.id_demand}
                className={`group bg-white border border-line shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 overflow-hidden flex ${viewMode === 'list' ? 'flex-row' : 'flex-col'}`}
              >
                {/* Card Content */}
                <div className={`p-5 flex flex-col ${viewMode === 'list' ? 'flex-1' : 'h-full'}`}>
                  {/* Header: Author Info */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 border border-line">
                        <AvatarImage src={buildImageUrl((demand as any).userPerfil)} />
                        <AvatarFallback className="text-xs bg-brand-soft text-brand-dark">{getInitials(demand.userName)}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-ink leading-none">{demand.userName}</span>
                        <span className="text-[10px] text-muted-foreground leading-tight mt-1">{formatDate(demand.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="mb-4 flex-1">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <h3 className="font-semibold text-ink-strong leading-tight line-clamp-2 group-hover:text-brand-dark transition-colors">
                              {demand.title}
                            </h3>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                      {demand.description}
                    </p>
                    <p className="text-lg font-bold text-success-dark">
                      {formatPrice(demand.price)}
                    </p>
                  </div>

                  {/* Footer Actions */}
                  <div className="flex items-center gap-3 mt-auto pt-4 border-t border-line">
                    <Link
                      href={`/user/${demand.id_user}?demand=${demand.id_demand}`}
                      className="flex-1"
                    >
                      <Button className="w-full bg-brand hover:bg-brand-dark text-white h-9 text-xs font-medium rounded-md">
                        Ver cliente / solicitar conexão
                      </Button>
                    </Link>
                    <Link href={`/user/${demand.id_user}?demand=${demand.id_demand}`}>
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
              <h3 className="text-lg font-medium text-ink-strong mb-2">Nenhuma demanda encontrada</h3>
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
