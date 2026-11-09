import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Service } from "../types";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { setConversationStartIntent } from "@/lib/utils";


interface ProviderServicesSectionProps {
  services: Service[];
  loading: boolean;
  user: any; // UserApi
}

export function ProviderServicesSection({ services, loading, user }: ProviderServicesSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Serviços</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <Loader2 className="animate-spin w-6 h-6 mx-auto" />
        ) : services.length === 0 ? (
          <p className="text-muted-foreground">Nenhum serviço cadastrado.</p>
        ) : (
          services.map((s) => (
            <div key={s.id_serviceFreelancer} className="p-3 border rounded-lg space-y-2">
              <div>
                <h3 className="font-semibold">{s.title}</h3>
                <p className="text-muted-foreground line-clamp-2">{s.description}</p>
                <p className="text-brand-dark font-bold">R$ {s.price}</p>
              </div>
              <Link
                href={`/messages/${user.id}?text=${encodeURIComponent(`Olá ${user.name}, vi seu serviço "${s.title}" no seu perfil e gostaria de saber mais detalhes.`)}`}
                onClick={() => setConversationStartIntent(user.id)}
              >
                <Button className="w-full bg-brand hover:bg-brand-dark text-white h-8 text-xs font-medium rounded-md">
                  Ver Detalhes / Conversar
                </Button>
              </Link>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
