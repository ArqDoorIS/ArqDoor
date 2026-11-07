// src/pages/SocialFeed.tsx
import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search,
  MapPin,
  Filter,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  UserCheck,
  Award,
  MessageCircle,
  Shield,
  User,
  Star,
  Eye,
} from "lucide-react";
import { apiRequest, API_BASE_URL } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { User as UserInterface } from "@/lib/Interfaces";
import { getInitials, setConversationStartIntent } from "@/lib/utils";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";

// Estados do Brasil para o filtro
const BR_STATES = [
  { sigla: "AC", nome: "Acre" }, { sigla: "AL", nome: "Alagoas" }, { sigla: "AP", nome: "Amapá" },
  { sigla: "AM", nome: "Amazonas" }, { sigla: "BA", nome: "Bahia" }, { sigla: "CE", nome: "Ceará" },
  { sigla: "DF", nome: "Distrito Federal" }, { sigla: "ES", nome: "Espírito Santo" }, { sigla: "GO", nome: "Goiás" },
  { sigla: "MA", nome: "Maranhão" }, { sigla: "MT", nome: "Mato Grosso" }, { sigla: "MS", nome: "Mato Grosso do Sul" },
  { sigla: "MG", nome: "Minas Gerais" }, { sigla: "PA", nome: "Pará" }, { sigla: "PB", nome: "Paraíba" },
  { sigla: "PR", nome: "Paraná" }, { sigla: "PE", nome: "Pernambuco" }, { sigla: "PI", nome: "Piauí" },
  { sigla: "RJ", nome: "Rio de Janeiro" }, { sigla: "RN", nome: "Rio Grande do Norte" }, { sigla: "RS", nome: "Rio Grande do Sul" },
  { sigla: "RO", nome: "Rondônia" }, { sigla: "RR", nome: "Roraima" }, { sigla: "SC", nome: "Santa Catarina" },
  { sigla: "SP", nome: "São Paulo" }, { sigla: "SE", nome: "Sergipe" }, { sigla: "TO", nome: "Tocantins" }
];

const carouselImages = [
  {
    src: "/bannerImages/01.jpg",
    title: "Painel operacional de projetos",
    subtitle: "Acompanhe contatos, perfis e fases em um só lugar"
  },
  {
    src: "/bannerImages/02.webp",
    title: "Fluxo técnico de seleção",
    subtitle: "Validação de dados e histórico em tempo real"
  },
  {
    src: "/bannerImages/03.webp",
    title: "Organização de demandas",
    subtitle: "Filtros por serviço, cidade e perfil"
  }
];

const buildImageUrl = (path?: string | null) => {
  if (!path) return null;
  const normalizedPath = path.replace(/\\/g, "/");
  return normalizedPath.startsWith("http")
    ? normalizedPath
    : `${API_BASE_URL}/${normalizedPath.replace(/^\/+/, "")}`;
};

// --- Components ---

const UserBanner = ({ user, className = '' }: { user: UserInterface; className?: string }) => {
  const imageUrl = buildImageUrl(user.banner);

  const bannerStyle = {
    width: '100%',
    height: 'clamp(60px, 8vw, 100px)', // Altura responsiva
    borderRadius: '12px 12px 0 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundColor: !imageUrl ? 'hsl(var(--muted))' : 'transparent',
    backgroundImage: imageUrl ? `url(${imageUrl})` : 'none'
  };

  return (
    <div className={`${className}`} style={bannerStyle}>
    </div>
  );
};

const UserAvatar = ({ user, className = '', size = 'md' }: { user: UserInterface; className?: string; size?: 'sm' | 'md' | 'lg' | 'xl' }) => {
  const imageUrl = buildImageUrl(user.perfil);

  const sizeClasses = {
    sm: 'w-10 h-10 sm:w-12 sm:h-12',
    md: 'w-14 h-14 sm:w-16 sm:h-16',
    lg: 'w-16 h-16 sm:w-20 sm:h-20',
    xl: 'w-20 h-20 sm:w-24 sm:h-24'
  };

  if (!imageUrl) {
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-brand-soft flex items-center justify-center ${className}`}>
        <User className="w-6 h-6 text-brand-dark" />
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} rounded-full overflow-hidden border-4 border-white shadow-lg ${className}`}>
      <img
        src={imageUrl}
        alt="Avatar do usuário"
        className="w-full h-full object-cover"
      />
    </div>
  );
};

// ----------------------------------

export default function SocialFeed() {
  const PAGE_SIZE = 6;
  const whatsappUrl = "https://wa.me/message/WYONYONWQG5XG1";
  const [search, setSearch] = useState("");
  const [searchType, setSearchType] = useState<"keyword" | "location">("keyword");
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const { user: currentUser } = useAuth();
  const [, setLocation] = useLocation(); 

  // Carousel Logic
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + carouselImages.length) % carouselImages.length);

  // Data Fetching
  const targetType = currentUser?.type === "prestador" ? "contratante" : "prestador";

  // Busca e filtros vão para o servidor (spec 2026-11-site-ganhos-rapidos). Antes o site
  // filtrava só os 6 perfis da página que tinha em mãos: "arquiteto Recife" dizia "nenhum
  // perfil" com resultado em outra página. A espera de 300 ms evita uma consulta por tecla.
  const [filtros, setFiltros] = useState({ q: "", state: "", city: "" });
  useEffect(() => {
    const relogio = setTimeout(() => {
      setFiltros(
        searchType === "location"
          ? { q: "", state: selectedState, city: selectedCity.trim() }
          : { q: search.trim(), state: "", city: "" }
      );
    }, 300);
    return () => clearTimeout(relogio);
  }, [search, searchType, selectedState, selectedCity]);

  useEffect(() => {
    setCurrentPage(1);
  }, [targetType, filtros]);

  const { data: usersRes, isLoading: loadingUsers } = useQuery<{
    users: UserInterface[];
    pagination?: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }>({
    queryKey: ["allUsers", currentPage, targetType, filtros.q, filtros.state, filtros.city],
    // Mantém a lista anterior na tela enquanto a busca nova chega, sem piscar "carregando".
    placeholderData: (anterior) => anterior,
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(PAGE_SIZE),
        type: targetType,
      });
      if (filtros.q) params.set("q", filtros.q);
      if (filtros.state) params.set("state", filtros.state);
      if (filtros.city) params.set("city", filtros.city);
      const response = await apiRequest("GET", `/users?${params.toString()}`);
      const data = await response.json();
      return data;
    },
  });

  const allUsers = usersRes?.users || [];
  const providerUserIds = useMemo(
    () => allUsers.filter((u) => u.type === "prestador").map((u) => u.id),
    [allUsers]
  );

  const { data: providerMap = {}, isLoading: loadingProv } = useQuery<Record<number, any>>({
    queryKey: ["providersByUsers", providerUserIds.join(",")],
    enabled: providerUserIds.length > 0,
    queryFn: async () => {
      const entries = await Promise.all(
        providerUserIds.map(async (userId) => {
          const response = await apiRequest("GET", `/providers/user/${userId}`);
          if (!response.ok) return [userId, null] as const;
          const data = await response.json().catch(() => null);
          return [userId, data?.provider || null] as const;
        })
      );
      return Object.fromEntries(entries);
    },
  });
  const loadingProviders = providerUserIds.length > 0 && loadingProv;

  // Logic to determine what to show (Profiles)
  const isFreelancer = currentUser?.type === "prestador";

  // Process Data for Profiles
  const displayList = useMemo(() => {
    if (loadingUsers || loadingProviders) return [];

    // Combine Data
    const combined = allUsers.map(user => {
      const providerData = providerMap[user.id] || null;
      return { user, provider: providerData || null };
    }).filter(item => {
      // Logic:
      // If Freelancer -> Show Clients (contratante)
      // If Client (or empty) -> Show Freelancers (prestador)
      if (isFreelancer) {
        return item.user.type === "contratante";
      } else {
        return item.user.type === "prestador" && item.provider;
      }
    });

    return combined;
  }, [allUsers, providerMap, isFreelancer, loadingUsers, loadingProviders]);

  const totalPages = usersRes?.pagination?.totalPages || 1;
  const pageButtons = useMemo(() => {
    const pages: number[] = [];
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, start + 4);
    for (let page = start; page <= end; page++) pages.push(page);
    return pages;
  }, [currentPage, totalPages]);


  const getProfileLink = (item: { user: UserInterface; provider: any }) => {
    if (item.provider) return `/providers/${item.provider.provider_id}`;
    return `/user/${item.user.id}`;
  };

  const handleStartChat = (targetUserId: number) => {
    setConversationStartIntent(targetUserId);
    setLocation(`/messages/${targetUserId}`);
  };

  return (
    <div className="pt-6">
      <div className="min-h-screen ">

        {/* Hero Carousel */}
        <div className="relative h-48 sm:h-64 lg:h-72 overflow-hidden">
          {carouselImages.map((image, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? "opacity-100" : "opacity-0"}`}
            >
              <div
                className="w-full h-full bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url(${image.src})` }}
              >
                <div className="absolute inset-0 bg-black/40" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white px-4 max-w-4xl">
                    <motion.h1
                      key={`title-${currentSlide}`}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                      className="text-2xl sm:text-4xl lg:text-5xl font-bold mb-4"
                    >
                      {image.title}
                    </motion.h1>
                    <motion.p
                      key={`subtitle-${currentSlide}`}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: 0.4 }}
                      className="text-lg sm:text-xl lg:text-2xl text-white/90"
                    >
                      {image.subtitle}
                    </motion.p>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full"><ChevronLeft className="h-6 w-6" /></button>
          <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full"><ChevronRight className="h-6 w-6" /></button>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-8">

            {/* Sidebar (With Filter Widget) */}
            <div className="lg:w-80 space-y-6">

              {/* Filter Widget */}
              <Card className="border border-line bg-white shadow-sm sticky top-24">
                <CardHeader>
                  <div className="flex items-center gap-2 text-brand-dark mb-2">
                    <Filter className="h-5 w-5" />
                    <span className="font-bold uppercase tracking-wider text-xs">Filtros</span>
                  </div>
                  <CardTitle className="text-xl text-ink">
                    Encontre Profissionais
                  </CardTitle>
                  <CardDescription>
                    {isFreelancer ? "Busque por clientes potenciais" : "Encontre arquitetos e designers"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Toggle Mode */}
                  <div className="flex p-1 bg-brand-soft/50 rounded-xl">
                    <button
                      onClick={() => setSearchType("keyword")}
                      className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${searchType === "keyword"
                        ? "bg-white text-brand-dark shadow-sm"
                        : "text-muted-foreground hover:text-brand"
                        }`}
                    >
                      Busca
                    </button>
                    <button
                      onClick={() => setSearchType("location")}
                      className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${searchType === "location"
                        ? "bg-white text-brand-dark shadow-sm"
                        : "text-muted-foreground hover:text-brand"
                        }`}
                    >
                      Local
                    </button>
                  </div>

                  {/* Inputs */}
                  {searchType === "keyword" ? (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">Palavras-chave</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Nome, profissão, cidade..."
                          className="pl-9 bg-white/50 border-brand-disabled focus:border-brand focus:ring-brand-soft"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase">Estado (UF)</label>
                        <select 
                            value={selectedState}
                            onChange={(e) => setSelectedState(e.target.value)}
                            className="w-full h-10 px-3 rounded-md border border-brand-disabled bg-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-soft focus:border-brand"
                          >
                            <option value="">Selecione...</option>
                            {BR_STATES.map((uf) => (
                              <option key={uf.sigla} value={uf.sigla}>{uf.nome}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-muted-foreground uppercase">Cidade</label>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              value={selectedCity}
                              onChange={(e) => setSelectedCity(e.target.value)}
                              placeholder="Digite a cidade..."
                              className="pl-9 bg-white/50 border-brand-disabled focus:border-brand focus:ring-brand-soft"
                            />
                          </div>
                        </div>
                      </div>
                  )}

                </CardContent>
              </Card>
            </div>

            {/* Main Content Feed (Original Card Design) */}
            <div className="flex-1 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-ink">
                  {isFreelancer ? "Clientes Disponíveis" : "Profissionais em Destaque"}
                </h2>
                <Badge variant="outline" className="text-muted-foreground border-line">
                  {usersRes?.pagination?.totalItems ?? displayList.length} encontrados
                </Badge>
              </div>

              {(loadingUsers || loadingProviders) ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="h-10 w-10 text-brand animate-spin" />
                </div>
              ) : displayList.length > 0 ? (
                <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {displayList.map((item) => (
                    <Card
                      key={item.user.id}
                      className="group relative overflow-hidden bg-white/80 backdrop-blur-sm border-white/30 rounded-xl shadow-lg flex flex-col h-full"
                    >
                      {/* Banner + Avatar Overlapping */}
                      <UserBanner user={item.user} />

                      <CardContent className="pt-0 flex-1 flex flex-col items-center -mt-8 relative z-10 px-4">
                        <UserAvatar user={item.user} />

                        <div className="mt-3 text-center w-full">
                          <h3 className="text-lg font-bold text-ink truncate px-2">{item.user.name}</h3>

                          {/* Profession Badge (Explicit) */}
                          {item.provider && (
                            <Badge variant="secondary" className="mt-1 bg-brand-soft text-brand-dark hover:bg-brand-soft">
                              {item.provider.profession}
                            </Badge>
                          )}
                          {!item.provider && (
                            <Badge variant="secondary" className="mt-1 bg-info-bg text-info-dark hover:bg-info-bg">
                              Cliente
                            </Badge>
                          )}

                          {item.provider?.about && (
                            <p className="text-sm text-muted-foreground mt-3 line-clamp-3 leading-relaxed">
                              {item.provider.about}
                            </p>
                          )}
                        </div>

                        <div className="w-full mt-auto pt-6 pb-2">
                          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground mb-4">
                            {/* New City Display */}
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {(item.user as any).LocationUser?.city || "Brasil"}
                            </span>

                            {item.provider?.views_profile !== undefined && (
                              <span className="flex items-center gap-1">
                                <Eye className="h-3 w-3" /> {item.provider.views_profile}
                              </span>
                              )}
                          </div>

                          <div className="flex gap-2">
                            <Link href={getProfileLink(item)} className="flex-1">
                              <Button className="w-full bg-surface-warm hover:bg-brand-soft text-ink hover:text-brand-dark font-semibold border border-transparent hover:border-brand-disabled transition-all rounded-xl h-10 px-0">
                                Ver Perfil
                              </Button>
                            </Link>
                            <Button
                              onClick={() => handleStartChat(item.user.id)}
                              className="bg-brand hover:bg-brand-dark text-white shadow-md rounded-xl h-10 w-10 p-0 flex items-center justify-center"
                              title="Enviar mensagem"
                            >
                              <MessageCircle className="h-5 w-5" />
                            </Button>
                          </div>

                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="mt-8 flex flex-col items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="h-9 px-3"
                      >
                        <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
                      </Button>

                      {pageButtons.map((page) => (
                        <Button
                          key={page}
                          variant={page === currentPage ? "default" : "outline"}
                          onClick={() => setCurrentPage(page)}
                          className={`h-9 w-9 p-0 ${page === currentPage ? "bg-brand hover:bg-brand-dark" : ""}`}
                        >
                          {page}
                        </Button>
                      ))}

                      <Button
                        variant="outline"
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="h-9 px-3"
                      >
                        Próxima <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Página {currentPage} de {totalPages}
                    </p>
                  </div>
                )}
                </>
                ) : (
                  <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-10 text-center border-2 border-dashed border-line">
                    <Search className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-ink">Nenhum perfil encontrado</h3>
                    <p className="text-muted-foreground mt-2">Ajuste os filtros para encontrar o que precisa.</p>
                    <Button 
                        variant="link"
                        className="mt-4 text-brand-dark"
                        onClick={() => { setSearch(""); setSearchType("keyword"); }}
                  >
                        Limpar filtros
                  </Button>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-5 right-5 z-50 inline-flex items-center rounded-full bg-success-dark px-5 py-3 text-sm font-semibold text-white shadow-none transition hover:bg-success-dark"
      >
        <WhatsAppIcon className="mr-2 h-5 w-5 text-white" />
        Entrar em contato
      </a>
    </div>
  );
}
