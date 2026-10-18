// Public provider profile page
import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ApplicationLayout from "@/components/layouts/ApplicationLayout";
import { apiRequest, API_BASE_URL } from "@/lib/queryClient";
import PortfolioModal, { PortfolioComment } from "@/components/modals/PortfolioModal";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { ProviderApi, UserApi, Service, PortfolioItem } from "./types";
import { ProviderHeaderCard } from "./components/ProviderHeaderCard";
import { ProviderInfoCard } from "./components/ProviderInfoCard";
import { TrustCard } from "./components/TrustCard";
import { ProviderServicesSection } from "./components/ProviderServicesSection";
import { ProviderPortfolioSection } from "./components/ProviderPortfolioSection";
import { ProviderRatingsSection } from "./components/ProviderRatingsSection";
import { setConversationStartIntent } from "@/lib/utils";

export default function ProviderProfilePage() {
  const { provider_id } = useParams<{ provider_id: string }>();
  const [location, setLocation] = useLocation();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: providerEnv, isLoading: loadingProvider } = useQuery<{ provider: ProviderApi }>({
    queryKey: ["provider", provider_id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/providers/${provider_id}`);
      return res.json();
    },
  });

  const provider = providerEnv?.provider;

  const { data: userEnv, isLoading: loadingUser } = useQuery<{ user: UserApi }>({
    queryKey: ["user", provider?.user_id],
    enabled: !!provider,
    queryFn: async () => {
      const res = await apiRequest("GET", `/users/${provider?.user_id}`);
      return res.json();
    },
  });

  const user = userEnv?.user;

  const [services, setServices] = useState<Service[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loadingExtra, setLoadingExtra] = useState(true);
  const [portfolioModalOpen, setPortfolioModalOpen] = useState(false);
  const [selectedPortfolioItem, setSelectedPortfolioItem] = useState<PortfolioItem | null>(null);
  const [portfolioMeta, setPortfolioMeta] = useState<Record<number, { likes: number; liked: boolean; comments: PortfolioComment[] }>>({});
  const [ratings, setRatings] = useState<any>({ average: 0, count: 0, viewerRating: null, list: [] });
  const [ratingGrade, setRatingGrade] = useState<number>(0);
  const [ratingComment, setRatingComment] = useState<string>("");
  const [savingRating, setSavingRating] = useState(false);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [showRatingsList, setShowRatingsList] = useState(false);

  useEffect(() => {
    if (provider) {
      loadExtras();
    }
  }, [provider]);

  useEffect(() => {
    const addView = async () => {
      const providerData = provider;
      if (!providerData || !currentUser?.id) return;
      const providerPrimary = providerData.id_provider ?? providerData.provider_id;
      if (!providerPrimary) return;
      if (providerData.user_id === currentUser.id) return;
      try {
        await apiRequest("PATCH", `/providers/addview/${providerPrimary}`);
        await queryClient.invalidateQueries({ queryKey: ["provider", provider_id] });
      } catch (err) {
        console.error("Erro ao registrar view", err);
      }
    };
    addView();
  }, [provider?.id_provider, provider?.provider_id, provider?.user_id, currentUser?.id, provider_id, queryClient]);

  useEffect(() => {
    const owner =
      !!currentUser &&
      !!provider &&
      currentUser.id === provider.user_id;
    if (!ratings.count || !owner) {
      setShowRatingsList(false);
    }
  }, [ratings.count, currentUser?.id, provider?.user_id]);

  const loadExtras = async () => {
    if (!provider) return;
    setLoadingExtra(true);
    try {
      const res = await apiRequest("GET", "/servicesfreelancer/getall");
      const body = await res.json();
      setServices((body.servicesFreelancer || []).filter((s: Service) => String(s.id_provider) === provider_id));

      const portRes = await apiRequest("GET", `/portfolio?user=${provider.user_id}`);
      if (portRes.ok) {
        const portBody = await portRes.json();
        const posts = portBody.posts || [];
        setPortfolio(posts);
        setPortfolioMeta((prev) => {
          const next = { ...prev };
          posts.forEach((p: any) => {
            if (!next[p.id]) {
              next[p.id] = { likes: p.likes_count || 0, liked: false, comments: [] };
            } else {
              next[p.id] = {
                ...next[p.id],
                likes: p.likes_count || next[p.id].likes || 0,
              };
            }
          });
          return next;
        });
      }
      const providerPrimaryId = provider.id_provider ?? provider.provider_id;
      if (providerPrimaryId) {
        await loadRatings(providerPrimaryId);
      }
    } finally {
      setLoadingExtra(false);
    }
  };

  const loadRatings = async (providerId: number) => {
    try {
      const res = await apiRequest("GET", `/providers/${providerId}/ratings`);
      if (!res.ok) return;
      const data = await res.json();
      setRatings({
        average: data.average || 0,
        count: data.count || 0,
        viewerRating: data.viewerRating || null,
        list: data.ratings || [],
      });
      if (data.viewerRating) {
        setRatingGrade(data.viewerRating.grade);
        setRatingComment(data.viewerRating.comment || "");
      } else {
        setRatingGrade(0);
        setRatingComment("");
      }
    } catch (err) {
      console.error("Erro ao carregar avaliações", err);
    }
  };

  const fetchPortfolioEngagement = async (id: number) => {
    try {
      const res = await apiRequest("GET", `/portfolio/${id}/engagement`);
      if (!res.ok) return;
      const data = await res.json();
      setPortfolioMeta((prev) => ({
        ...prev,
        [id]: {
          likes: data.likes || 0,
          liked: !!data.liked,
          comments:
            data.comments?.map((c: any) => ({
              id: c.id,
              user: c.user?.name || "Usuário",
              avatar: c.user?.avatar,
              text: c.comment,
              date: c.createdAt,
            })) || [],
        },
      }));
    } catch (err) {
      console.error("Erro ao buscar engajamento do portfólio", err);
    }
  };

  const openPortfolioModal = (item: PortfolioItem) => {
    setSelectedPortfolioItem(item);
    setPortfolioModalOpen(true);
    fetchPortfolioEngagement(item.id);
  };

  const handleToggleLikePortfolio = async (id: number, liked: boolean) => {
    try {
      const endpoint = `/portfolio/${id}/like`;
      const res = await apiRequest(liked ? "POST" : "DELETE", endpoint);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || "Falha ao atualizar like");
      }
      await fetchPortfolioEngagement(id);
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Erro",
        description: err?.message || "Não foi possível atualizar o like",
        variant: "destructive",
      });
      throw err;
    }
  };

  const handleAddCommentPortfolio = async (id: number, text: string) => {
    try {
      const res = await apiRequest("POST", `/portfolio/${id}/comments`, {
        comment: text,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || "Falha ao comentar");
      }
      await fetchPortfolioEngagement(id);
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Erro",
        description: err?.message || "Não foi possível adicionar o comentário",
        variant: "destructive",
      });
      throw err;
    }
  };

  const providerPrimaryId = provider?.id_provider ?? provider?.provider_id;
  const canRate = !!currentUser && provider && currentUser.id !== provider.user_id;

  const handleSaveRating = async () => {
    if (!providerPrimaryId) return;
    if (!ratingGrade || ratingGrade < 1 || ratingGrade > 5) {
      toast({
        title: "Informe uma nota válida",
        description: "A nota deve estar entre 1 e 5.",
        variant: "destructive",
      });
      return;
    }
    setSavingRating(true);
    try {
      const method = ratings.viewerRating ? "PUT" : "POST";
      const res = await apiRequest(method, `/providers/${providerPrimaryId}/ratings`, {
        grade: ratingGrade,
        comment: ratingComment,
      });
      if (!res.ok) throw new Error(await res.text());
      toast({
        title: ratings.viewerRating ? "Avaliação atualizada" : "Avaliação salva",
        description: "Obrigado pelo feedback!",
      });
      await loadRatings(providerPrimaryId);
    } catch (err: any) {
      console.error("Erro ao salvar avaliação", err);
      toast({
        title: "Erro",
        description: err?.message || "Não foi possível salvar sua avaliação.",
        variant: "destructive",
      });
    } finally {
      setSavingRating(false);
    }
  };

  const handleDeleteRating = async () => {
    if (!providerPrimaryId) return;
    setSavingRating(true);
    try {
      const res = await apiRequest("DELETE", `/providers/${providerPrimaryId}/ratings`);
      if (!res.ok) throw new Error(await res.text());
      setRatingGrade(0);
      setRatingComment("");
      toast({ title: "Avaliação removida" });
      await loadRatings(providerPrimaryId);
    } catch (err: any) {
      console.error("Erro ao remover avaliação", err);
      toast({
        title: "Erro",
        description: err?.message || "Não foi possível remover sua avaliação.",
        variant: "destructive",
      });
    } finally {
      setSavingRating(false);
    }
  };


  if (loadingProvider || loadingUser) {
    return (
      <ApplicationLayout>
        <div className="flex justify-center items-center min-h-screen">
          <Loader2 className="animate-spin w-8 h-8 text-orange-600" />
        </div>
      </ApplicationLayout>
    );
  }

  if (!provider || !user) {
    return (
      <ApplicationLayout>
        <div className="flex justify-center items-center min-h-screen">
          <p className="text-slate-600">Prestador não encontrado.</p>
        </div>
      </ApplicationLayout>
    );
  }

  return (
    <ApplicationLayout>
      <div className="w-full max-w-7xl mx-auto p-6 space-y-8">
        <ProviderHeaderCard
          user={user}
          provider={provider}
          ratings={ratings}
          onMessage={() => {
            setConversationStartIntent(user.id);
            setLocation(`/messages/${user.id}`);
          }}
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,_320px)_minmax(0,_1fr)_minmax(0,_320px)]">
          <div className="space-y-4">
            <TrustCard userId={Number(user.id)} />
            <ProviderInfoCard createdAt={user.createdAt} about={provider.about} />
          </div>

          <div className="space-y-6">
            <ProviderServicesSection services={services} loading={loadingExtra} user={user} />
            <ProviderPortfolioSection
              portfolio={portfolio}
              loading={loadingExtra}
              onOpen={openPortfolioModal}
            />
          </div>

          <ProviderRatingsSection
            ratings={ratings}
            ratingGrade={ratingGrade}
            ratingComment={ratingComment}
            hoveredStar={hoveredStar}
            showRatingsList={showRatingsList}
            canRate={!!canRate}
            isOwner={!!currentUser && currentUser.id === provider.user_id}
            savingRating={savingRating}
            onSave={handleSaveRating}
            onDelete={handleDeleteRating}
            setRatingGrade={setRatingGrade}
            setRatingComment={setRatingComment}
            setHoveredStar={setHoveredStar}
            toggleList={() => setShowRatingsList((prev) => !prev)}
          />
        </div>
      </div>
      <PortfolioModal
        isOpen={portfolioModalOpen}
        onClose={() => {
          setPortfolioModalOpen(false);
          setSelectedPortfolioItem(null);
        }}
        item={selectedPortfolioItem}
        imageUrl={buildImageUrl(selectedPortfolioItem?.UserImage?.image_path)}
        userName={user.name}
        userAvatar={buildImageUrl((user as any)?.perfil)}
        viewerName={currentUser?.name || "Convidado"}
        viewerAvatar={buildImageUrl((currentUser as any)?.perfil)}
        initialLikes={
          selectedPortfolioItem
            ? portfolioMeta[selectedPortfolioItem.id]?.likes || 0
            : 0
        }
        initialLiked={
          selectedPortfolioItem
            ? portfolioMeta[selectedPortfolioItem.id]?.liked || false
            : false
        }
        initialComments={
          selectedPortfolioItem
            ? portfolioMeta[selectedPortfolioItem.id]?.comments || []
            : []
        }
        onToggleLike={(liked) => {
          if (!selectedPortfolioItem) return;
          return handleToggleLikePortfolio(selectedPortfolioItem.id, liked);
        }}
        onAddComment={(text) => {
          if (!selectedPortfolioItem) return;
          return handleAddCommentPortfolio(selectedPortfolioItem.id, text);
        }}
      />
    </ApplicationLayout>
  );
}

const buildImageUrl = (path?: string) => {
  if (!path) return "";
  const normalizedPath = path.replace(/\\/g, "/");
  return normalizedPath.startsWith("http")
    ? normalizedPath
    : `${API_BASE_URL}/${normalizedPath.replace(/^\/+/, "")}`;
};
