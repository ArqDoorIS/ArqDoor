import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Loader2, Save, Star, X } from "lucide-react";
import { PortfolioComment } from "@/components/modals/PortfolioModal";
import { API_BASE_URL } from "@/lib/queryClient";

const buildImageUrl = (path?: string) => {
  if (!path) return "";
  const normalizedPath = path.replace(/\\/g, "/");
  return normalizedPath.startsWith("http")
    ? normalizedPath
    : `${API_BASE_URL}/${normalizedPath.replace(/^\/+/, "")}`;
};

interface RatingItem {
  id: number;
  grade: number;
  comment?: string | null;
  createdAt: string;
  user?: {
    name?: string;
    perfil?: string;
  } | null;
}

interface ProviderRatingsSectionProps {
  ratings: { average: number; count: number; viewerRating: any; list: RatingItem[] };
  ratingGrade: number;
  ratingComment: string;
  hoveredStar: number | null;
  showRatingsList: boolean;
  canRate: boolean;
  isOwner: boolean;
  savingRating: boolean;
  onSave: () => void;
  onDelete: () => void;
  setRatingGrade: (value: number) => void;
  setRatingComment: (value: string) => void;
  setHoveredStar: (value: number | null) => void;
  toggleList: () => void;
}

export function ProviderRatingsSection({
  ratings,
  ratingGrade,
  ratingComment,
  hoveredStar,
  showRatingsList,
  canRate,
  isOwner,
  savingRating,
  onSave,
  onDelete,
  setRatingGrade,
  setRatingComment,
  setHoveredStar,
  toggleList,
}: ProviderRatingsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Avaliações</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-4 justify-between">
          <div>
            <p className="text-3xl font-bold">{ratings.count > 0 ? ratings.average.toFixed(1) : "—"}</p>
            <p className="text-sm text-muted-foreground">
              {ratings.count} avaliação{ratings.count !== 1 ? "es" : ""}
            </p>
          </div>
          {isOwner && (
            <Button
              size="sm"
              variant="outline"
              disabled={!ratings.count}
              onClick={toggleList}
            >
              {ratings.count ? (showRatingsList ? "Ocultar avaliações" : "Ver avaliações") : "Sem avaliações"}
            </Button>
          )}
        </div>
        {canRate && (
          <div className="mt-4 space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Sua nota</label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((value) => {
                  const highlighted = (hoveredStar ?? ratingGrade) >= value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onMouseEnter={() => setHoveredStar(value)}
                      onMouseLeave={() => setHoveredStar(null)}
                      onClick={() => setRatingGrade(value)}
                      className={`p-1 rounded transition-colors ${highlighted ? "text-warning-text" : "text-muted-foreground"}`}
                      aria-label={`${value} estrela${value > 1 ? "s" : ""}`}
                    >
                      <Star
                        className="w-6 h-6"
                        fill={highlighted ? "currentColor" : "none"}
                        strokeWidth={highlighted ? 0 : 2}
                      />
                    </button>
                  );
                })}
              </div>
              {ratings.viewerRating && (
                <p className="text-xs text-muted-foreground">
                  Você já avaliou este prestador. Atualize a nota ou exclua sua avaliação existente.
                </p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Comentário</label>
              <Textarea
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                placeholder="Compartilhe sua experiência"
                rows={3}
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 w-full">
              <Button
                onClick={onSave}
                disabled={savingRating || !ratingGrade}
                className="w-full sm:flex-1 bg-brand text-white"
              >
                {savingRating ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {savingRating
                  ? "Salvando..."
                  : ratings.viewerRating
                    ? "Atualizar avaliação"
                    : "Salvar avaliação"}
              </Button>
              {ratings.viewerRating && (
                <Button
                  variant="outline"
                  onClick={onDelete}
                  disabled={savingRating}
                  className="w-full sm:flex-1"
                >
                  Remover avaliação
                </Button>
              )}
            </div>
          </div>
        )}

        {isOwner && showRatingsList && (
          <div className="mt-6 space-y-4">
            {ratings.list.length === 0 ? (
              <p className="text-muted-foreground text-sm">Ainda não há avaliações.</p>
            ) : (
              ratings.list.map((rating: RatingItem) => (
                <div key={rating.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={buildImageUrl(rating.user?.perfil)} alt={rating.user?.name} className="object-cover" />
                        <AvatarFallback>
                          {(rating.user?.name || "??").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{rating.user?.name || "Usuário"}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(rating.createdAt).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-warning-text font-semibold">
                      <Star className="w-4 h-4" />
                      {rating.grade}
                    </div>
                  </div>
                  {rating.comment && (
                    <p className="text-sm text-ink mt-2">{rating.comment}</p>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
