import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { nivelParaExibir, type EstadoDoItem, type NivelExibido } from "@/lib/nivel-de-confianca";

interface TrustCardProps {
  /** "me" no perfil do próprio prestador; o id do usuário no perfil público. */
  userId: number | "me";
}

const VARIANTE: Record<EstadoDoItem, "default" | "secondary" | "outline"> = {
  validado: "default",
  em_analise: "secondary",
  pendente: "outline",
};

/**
 * Nível de confiança com o número do servidor, o mesmo do app (spec 2026-10-confianca-site).
 *
 * O dono vê cada item com "em análise" e o que falta; o visitante vê só o que já foi
 * validado. Se a resposta não vier, o cartão diz isso em vez de inventar um número: a conta
 * local que existia aqui antes dava outro percentual para o mesmo prestador.
 */
export function TrustCard({ userId }: TrustCardProps) {
  const dono = userId === "me";
  const { data: nivel, isLoading, isError } = useQuery<NivelExibido>({
    queryKey: ["confianca", String(userId)],
    queryFn: async () => {
      const res = await apiRequest("GET", dono ? "/users/me/trust" : `/users/${userId}/trust`);
      if (!res.ok) throw new Error(`Nível de confiança indisponível (${res.status})`);
      const exibido = nivelParaExibir((await res.json())?.data);
      if (!exibido) throw new Error("Nível de confiança em formato inesperado");
      return exibido;
    },
    staleTime: 60_000,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nível de confiança</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-orange-600" />
          </div>
        ) : isError || !nivel ? (
          <p className="text-sm text-slate-600">Não foi possível carregar o nível de confiança agora.</p>
        ) : (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Dados validados</span>
              <span className="font-semibold text-slate-900">{nivel.percentual}%</span>
            </div>
            <Progress value={nivel.percentual} />
            <div className="space-y-1 text-sm text-slate-600">
              {nivel.linhas.map((linha) => (
                <div key={linha.chave} className="flex items-center gap-2">
                  <Badge variant={VARIANTE[linha.estado]}>{linha.rotulo}</Badge>
                  <span>{linha.texto}</span>
                </div>
              ))}
            </div>
            {dono ? (
              <p className="text-xs text-slate-500">
                Cada item só conta quando o documento que o comprova é aprovado. Os documentos
                são enviados pelo app ArqDoor, em Validação de dados.
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
