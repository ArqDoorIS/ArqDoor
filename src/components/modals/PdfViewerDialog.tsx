import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Loader2,
  AlertTriangle,
  Maximize2,
  Minimize2,
  Download,
  ExternalLink,
  RefreshCcw,
} from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pdfUrl?: string;
  pdfBlob?: Blob | null;
  pdfFilename?: string;
  loading: boolean;
  error?: string;
  onReload: () => void;
  onOpenNew: () => void;
  onDownload: () => void;
  fullscreen: boolean;
  setFullscreen: (v: boolean) => void;
};

export function PdfViewerDialog({
  open,
  onOpenChange,
  pdfUrl,
  pdfBlob,
  pdfFilename,
  loading,
  error,
  onReload,
  onOpenNew,
  onDownload,
  fullscreen,
  setFullscreen,
}: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  // Se vier um Blob, criamos um ObjectURL para embutir no iframe.
  useEffect(() => {
    if (!pdfBlob) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(pdfBlob);
    setObjectUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [pdfBlob]);

  // Prioriza Blob; se não houver, usa a URL direta.
  const viewerSrc = useMemo(
    () => objectUrl || pdfUrl || null,
    [objectUrl, pdfUrl],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={[
          fullscreen
            ? "max-w-[95vw] w-[95vw] h-[95vh]"
            : "w-full max-w-4xl h-[85vh] sm:h-[80vh]",
          "p-0 flex flex-col",
        ].join(" ")}
      >
        {/* Header fixo (sticky) com controles */}
        <DialogHeader className="sticky top-0 z-10 bg-white border-b p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-2 truncate">
                <FileText className="h-5 w-5 shrink-0" />
                <span className="truncate">{pdfFilename ?? "Contrato"}</span>
              </DialogTitle>
              <DialogDescription id="pdf-desc" className="sr-only">
                Visualizador de PDF do contrato.
              </DialogDescription>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={onReload}
                disabled={loading}
                title="Recarregar PDF"
              >
                <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Recarregar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenNew}
                disabled={!viewerSrc}
                title="Abrir em nova aba"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Nova aba
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onDownload}
                disabled={!pdfBlob && !pdfUrl}
                title="Baixar PDF"
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFullscreen(!fullscreen)}
                title={fullscreen ? "Sair da tela cheia" : "Tela cheia"}
              >
                {fullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Área rolável do PDF */}
        <div ref={scrollRef} className="flex-1 overflow-auto bg-surface-soft">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Carregando PDF...</p>
              </div>
            </div>
          ) : error ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-lg">
                <AlertTriangle className="h-8 w-8 text-danger-dark mx-auto mb-4" />
                <p className="text-danger-dark font-medium">Erro ao carregar PDF</p>
                <p className="text-muted-foreground mt-2 break-words">{error}</p>
              </div>
            </div>
          ) : viewerSrc ? (
            <div className="h-full w-full p-3 sm:p-4">
              <div className="h-full w-full rounded-md border bg-white shadow-inner">
                <iframe
                  key={viewerSrc}
                  src={viewerSrc}
                  title={pdfFilename ?? "Contrato"}
                  className="h-full w-full rounded-md"
                />
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-muted-foreground">Nenhum PDF disponível</div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
