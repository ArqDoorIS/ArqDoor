import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProviderInfoCardProps {
  createdAt: string;
  about?: string | null;
}

export function ProviderInfoCard({ createdAt, about }: ProviderInfoCardProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p>
            <span className="inline-flex items-center gap-2">
              <span className="inline-block w-4 h-4 rounded-full bg-brand" aria-hidden />
              Desde {new Date(createdAt).toLocaleDateString()}
            </span>
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Sobre mim</CardTitle>
        </CardHeader>
        <CardContent className="text-ink">
          <p className="whitespace-pre-wrap break-words">
            {about || "Este prestador ainda não adicionou uma descrição."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
