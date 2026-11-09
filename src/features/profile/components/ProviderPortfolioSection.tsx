import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Image as ImageIcon } from "lucide-react";
import { PortfolioItem } from "../types";
import { API_BASE_URL } from "@/lib/queryClient";

interface ProviderPortfolioSectionProps {
  portfolio: PortfolioItem[];
  loading: boolean;
  onOpen: (item: PortfolioItem) => void;
}

const buildImageUrl = (path?: string) => {
  if (!path) return "";
  return path.startsWith("http") ? path : `${API_BASE_URL}/${path.replace(/^\/+/, "")}`;
};

export function ProviderPortfolioSection({ portfolio, loading, onOpen }: ProviderPortfolioSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Portfólio</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <Loader2 className="animate-spin w-6 h-6 mx-auto" />
        ) : portfolio.length === 0 ? (
          <p className="text-muted-foreground">Nenhum projeto no portfólio.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {portfolio.map((p) => (
              <div
                key={p.id}
                className="border rounded-lg cursor-pointer hover:shadow overflow-hidden group"
                onClick={() => onOpen(p)}
              >
                {p.UserImage?.image_path ? (
                  <div className="relative h-32 bg-surface-warm">
                    <img
                      src={buildImageUrl(p.UserImage.image_path)}
                      alt={p.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
                      <p className="text-white text-sm p-2">{p.title}</p>
                    </div>
                  </div>
                ) : (
                  <div className="h-32 flex flex-col items-center justify-center text-muted-foreground">
                    <ImageIcon className="w-6 h-6" />
                    <p className="text-sm mt-2 text-center">{p.title}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
