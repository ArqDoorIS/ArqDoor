/**
 * Fila de verificação de identidade.
 *
 * É o que aprova ou recusa RG, CNH, contrato social, situação cadastral e comprovante de
 * endereço de gente real. Cada decisão mexe no nível de confiança do perfil — que é o que
 * um cliente olha antes de contratar —, então a tela é feita para NÃO deixar errar por
 * distração:
 *
 *   - conferir o arquivo é obrigatório antes de decidir. O botão de aprovar só destrava
 *     depois de o documento ter sido aberto;
 *   - recusar exige motivo escrito, que vai inteiro para a pessoa. O backend também
 *     recusa sem motivo, mas descobrir isso depois de digitar seria trabalho perdido;
 *   - aprovar pede confirmação, com o nome de quem está sendo aprovado à vista. Aprovar o
 *     documento errado é o tipo de engano que ninguém percebe depois.
 *
 * NÃO existe "aprovar tudo". A análise é documento a documento por decisão do Vitor
 * (10/09/2026), e um botão de lote transformaria a conferência em um clique.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Clock,
  ExternalLink,
  Loader2,
  RefreshCcw,
  XCircle,
} from "lucide-react";

import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, SectionCard, StatusBadge } from "./AdminPrimitives";
import { formatDateTime, getFileUrl } from "../utils";

type StatusDoDocumento = "em_analise" | "aprovado" | "recusado";

type DocumentoDaFila = {
  id: number;
  type: string;
  label: string;
  status: StatusDoDocumento;
  created_at?: string;
  file_url: string;
  user: { id: number; name: string; email: string; type: string } | null;
};

const FILTROS: { chave: StatusDoDocumento | "todos"; rotulo: string }[] = [
  { chave: "em_analise", rotulo: "Em análise" },
  { chave: "aprovado", rotulo: "Aprovados" },
  { chave: "recusado", rotulo: "Recusados" },
  { chave: "todos", rotulo: "Todos" },
];

const MOTIVO_MINIMO = 5;

export function AdminVerificationSection() {
  const [documentos, setDocumentos] = useState<DocumentoDaFila[]>([]);
  const [filtro, setFiltro] = useState<StatusDoDocumento | "todos">("em_analise");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  /** Documentos cujo arquivo o admin já abriu nesta sessão. */
  const [conferidos, setConferidos] = useState<Set<number>>(new Set());
  const [motivos, setMotivos] = useState<Record<number, string>>({});
  const [decidindo, setDecidindo] = useState<number | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const res = await apiRequest("GET", `/admin/documents?status=${filtro}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.success === false) {
        throw new Error(body?.message || "Não foi possível carregar a fila.");
      }
      setDocumentos(body?.data?.documents ?? []);
    } catch (e: any) {
      // Fila vazia por erro parece fila vazia por não ter nada: sem esta distinção, um
      // documento esperando análise ficaria invisível.
      setErro(e?.message || "Não foi possível carregar a fila.");
      setDocumentos([]);
    } finally {
      setCarregando(false);
    }
  }, [filtro]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const abrirArquivo = (doc: DocumentoDaFila) => {
    const url = getFileUrl(doc.file_url);
    if (!url) {
      window.alert("Arquivo indisponível.");
      return;
    }
    // A rota é `/admin/documents/:id/file`, protegida por COOKIE de sessão de admin —
    // por isso `window.open` funciona e um fetch com Bearer não funcionaria.
    window.open(url, "_blank", "noopener,noreferrer");
    setConferidos((antes) => new Set(antes).add(doc.id));
  };

  const decidir = async (doc: DocumentoDaFila, aprovar: boolean) => {
    const motivo = (motivos[doc.id] ?? "").trim();

    if (!aprovar && motivo.length < MOTIVO_MINIMO) {
      window.alert("Escreva o motivo da recusa. É o texto que a pessoa lê para corrigir.");
      return;
    }
    if (aprovar) {
      const nome = doc.user?.name ?? `usuário #${doc.user?.id}`;
      const ok = window.confirm(
        `Aprovar o ${doc.label} de ${nome}?\n\nIsso sobe o nível de confiança do perfil dela.`
      );
      if (!ok) return;
    }

    setDecidindo(doc.id);
    try {
      const res = await apiRequest("POST", `/admin/documents/${doc.id}/review`, {
        aprovar,
        motivo: aprovar ? undefined : motivo,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.success === false) {
        throw new Error(body?.message || "Não foi possível registrar a decisão.");
      }
      setMotivos((antes) => ({ ...antes, [doc.id]: "" }));
      await carregar();
    } catch (e: any) {
      window.alert(e?.message || "Não foi possível registrar a decisão.");
    } finally {
      setDecidindo(null);
    }
  };

  const emAnalise = useMemo(
    () => documentos.filter((d) => d.status === "em_analise").length,
    [documentos]
  );

  return (
    <div className="mt-2 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {FILTROS.map(({ chave, rotulo }) => (
          <Button
            key={chave}
            size="sm"
            variant={filtro === chave ? "default" : "outline"}
            onClick={() => setFiltro(chave)}
          >
            {rotulo}
          </Button>
        ))}
        <Button size="sm" variant="ghost" onClick={() => void carregar()} disabled={carregando}>
          {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
        </Button>
        {filtro === "em_analise" && emAnalise > 0 ? (
          <span className="text-sm text-slate-600">
            {emAnalise} esperando análise
          </span>
        ) : null}
      </div>

      {erro ? (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-sm text-amber-900">
            <p className="font-semibold">A fila não carregou.</p>
            <p className="mt-1">{erro}</p>
            <p className="mt-1">
              Pode haver documento esperando análise que não está aparecendo aqui.
            </p>
          </div>
        </div>
      ) : null}

      {!carregando && !erro && documentos.length === 0 ? (
        <EmptyState
          title="Nenhum documento nesta fila"
          description={
            filtro === "em_analise"
              ? "Nada esperando análise no momento."
              : "Nenhum documento com este status."
          }
        />
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        {documentos.map((doc) => {
          const conferido = conferidos.has(doc.id);
          const ocupado = decidindo === doc.id;
          const pendente = doc.status === "em_analise";

          return (
            <SectionCard key={doc.id} title={doc.user?.name ?? "Usuário removido"} subtitle={doc.label}>
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-600">
                      {doc.user?.email ?? "sem e-mail"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {doc.user?.type === "prestador" ? "Prestador" : "Cliente"}
                      {doc.created_at ? ` · enviado em ${formatDateTime(doc.created_at)}` : ""}
                    </p>
                  </div>
                  <StatusBadge
                    label={
                      doc.status === "aprovado"
                        ? "Aprovado"
                        : doc.status === "recusado"
                          ? "Recusado"
                          : "Em análise"
                    }
                    tone={
                      doc.status === "aprovado"
                        ? "emerald"
                        : doc.status === "recusado"
                          ? "rose"
                          : "amber"
                    }
                  />
                </div>

                <Button variant="outline" size="sm" onClick={() => abrirArquivo(doc)}>
                  <ExternalLink className="mr-1 h-4 w-4" />
                  {conferido ? "Abrir de novo" : "Conferir documento"}
                </Button>

                {pendente ? (
                  <>
                    {!conferido ? (
                      <p className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Clock className="h-3.5 w-3.5" />
                        Abra o documento antes de decidir.
                      </p>
                    ) : null}

                    <Textarea
                      value={motivos[doc.id] ?? ""}
                      onChange={(e) =>
                        setMotivos((antes) => ({ ...antes, [doc.id]: e.target.value }))
                      }
                      placeholder="Motivo da recusa — a pessoa lê este texto para corrigir"
                      rows={2}
                    />

                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                        // Aprovar sem ter aberto o arquivo e aprovar no escuro.
                        disabled={!conferido || ocupado}
                        onClick={() => void decidir(doc, true)}
                      >
                        {ocupado ? (
                          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        ) : (
                          <BadgeCheck className="mr-1 h-4 w-4" />
                        )}
                        Aprovar
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                        disabled={ocupado}
                        onClick={() => void decidir(doc, false)}
                      >
                        <XCircle className="mr-1 h-4 w-4" />
                        Recusar
                      </Button>
                    </div>
                  </>
                ) : null}
              </div>
            </SectionCard>
          );
        })}
      </div>
    </div>
  );
}
