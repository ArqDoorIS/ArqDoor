import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BadgeCheck, Eye, MessageCircle, Star } from "lucide-react";
import { ProviderApi, UserApi } from "../types";
import { API_BASE_URL } from "@/lib/queryClient";

const buildImageUrl = (path?: string) => {
  if (!path) return "";
  const normalizedPath = path.replace(/\\/g, "/");
  return normalizedPath.startsWith("http")
    ? normalizedPath
    : `${API_BASE_URL}/${normalizedPath.replace(/^\/+/, "")}`;
};

interface ProviderHeaderCardProps {
  user: UserApi;
  provider: ProviderApi;
  ratings: { average: number; count: number };
  onMessage: () => void;
  viewerAvatar?: string | null;
}

export function ProviderHeaderCard({
  user,
  provider,
  ratings,
  onMessage,
}: ProviderHeaderCardProps) {
  const getInitials = (n: string) =>
    n
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  const bannerUrl = buildImageUrl((user as any)?.banner);

  return (
    <Card className="overflow-hidden">
      {/* Banner */}
      <div
        className="h-32 sm:h-48 w-full bg-surface-warm bg-cover bg-center"
        style={{
          backgroundImage: bannerUrl ? `url(${bannerUrl})` : undefined,
        }}
      />

      <div className="p-6 flex flex-col sm:flex-row items-center sm:items-end gap-6 -mt-12 md:-mt-16">
        <Avatar className="w-24 h-24 sm:w-32 sm:h-32 border-4 border-white shadow-md z-10">
          <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          <AvatarImage src={buildImageUrl((user as any)?.perfil)} alt={user.name} className="object-cover" />
        </Avatar>

        <div className="flex-1 text-center sm:text-left pt-2 sm:pt-0">
          <h1 className="text-2xl font-bold mt-2">{user.name}</h1>
          <p className="text-muted-foreground font-medium">{provider.profession}</p>
          <div className="flex gap-2 mt-2 justify-center sm:justify-start flex-wrap">
            {/* Badge de rating só aparece se houver avaliações. Antes mostrava "Nova"
                quando count=0; agora some pra dar espaço pro selo de verificação. */}
            {ratings.count > 0 && (
              <Badge className="gap-1 bg-warning-bg text-warning-text hover:bg-warning-bg">
                <Star className="w-3 h-3" />
                {ratings.average.toFixed(1)} ({ratings.count})
              </Badge>
            )}
            {/* Selo de "Verificado": só aparece quando admin marca via WhatsApp */}
            {(user as any)?.is_verified === true && (
              <Badge className="gap-1 bg-success-bg text-success-dark hover:bg-success-bg">
                <BadgeCheck className="w-3 h-3" />
                Verificado
              </Badge>
            )}
            <Badge className="gap-1 bg-info-bg text-info-dark hover:bg-info-bg">
              <Eye className="w-3 h-3" />
              {provider.views_profile || 0} visualizações
            </Badge>
          </div>
        </div>

        <Button size="sm" onClick={onMessage} className="mt-4 sm:mt-0 mb-2">
          <MessageCircle className="w-4 h-4 mr-1" /> Enviar mensagem
        </Button>
      </div>
    </Card>
  );
}
