import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Star } from "lucide-react";

interface RatingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  data: { average: number; count: number; list: any[] } | null;
  onReload: () => void;
  providerProfileId?: number | null;
}

export function RatingsModal({
  open,
  onOpenChange,
  loading,
  data,
  onReload,
  providerProfileId,
}: RatingsModalProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (next && !data && providerProfileId) {
          onReload();
        }
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Avaliações dos clientes</DialogTitle>
          <DialogDescription>Veja o feedback recebido pelos seus clientes.</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : data && data.count > 0 ? (
          <div className="space-y-4">
            <div>
              <p className="text-3xl font-bold">{data.average.toFixed(1)}</p>
              <p className="text-sm text-muted-foreground">
                {data.count} avaliação{data.count !== 1 ? "es" : ""}
              </p>
            </div>
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {data.list.map((rating: any) => (
                <div key={rating.id} className="border rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{rating.user?.name || "Cliente"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(rating.createdAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-warning-text font-semibold">
                      <Star className="w-4 h-4" />
                      {rating.grade}
                    </div>
                  </div>
                  {rating.comment && <p className="text-sm text-ink">{rating.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Ainda não há avaliações registradas.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
