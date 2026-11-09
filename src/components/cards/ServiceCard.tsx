import { Link } from "wouter";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  User,
  Clock,
  DollarSign,
  Star,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/queryClient";
import { EnrichedService } from "@/lib/Interfaces";

interface ServiceCardProps {
  service: EnrichedService;
  currentUser?: any;
}

const buildImageUrl = (path?: string) => {
  if (!path) return "";
  const normalizedPath = path.replace(/\\/g, "/");
  return normalizedPath.startsWith("http")
    ? normalizedPath
    : `${API_BASE_URL}/${normalizedPath.replace(/^\/+/, "")}`;
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const formatPrice = (priceString: string) => {
  const price = parseFloat(priceString);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(price);
};

const isNewService = (dateString: string) => {
  const serviceDate = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - serviceDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= 7; 
};

export default function ServiceCard({ service, currentUser }: ServiceCardProps) {
  return (
    <Card
      className="group relative overflow-hidden bg-white/80 backdrop-blur-sm border-white/30 rounded-3xl shadow-lg hover:shadow-2xl hover:shadow-brand-soft/50 transition-all duration-500 hover:-translate-y-2 hover:scale-[1.02]"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>

      <CardHeader className="pb-4 relative z-10">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl font-bold text-ink group-hover:text-brand-dark transition-colors duration-300 line-clamp-2 mb-3">
              {service.title}
            </CardTitle>
            <div className="flex items-center space-x-2">
              <CardDescription className="text-2xl font-bold text-success-dark">
                {formatPrice(service.price)}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pb-6 relative z-10">
        <div className="flex items-center space-x-4 p-4 bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-sm">
          <Avatar className="w-12 h-12 border-2 border-white shadow-sm">
            <AvatarImage src={buildImageUrl((service as any).userPerfil)} alt={service.userName} className="object-cover" />
            <AvatarFallback className="bg-brand text-white">
              <User className="h-6 w-6" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-ink truncate text-lg">{service.userName}</p>
            <div className="flex items-center space-x-1">
              <Badge className="mt-1 bg-info-bg text-info-dark text-xs">
                {service.ServiceProvider.profession || "Não informado"}
              </Badge>
              {currentUser && service.ServiceProvider.user_id === currentUser.id && (
                <Badge className="mt-1 ml-2 bg-success-bg text-success-dark text-xs">
                  Seu serviço
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center text-sm text-muted-foreground">
          <Clock className="h-4 w-4 mr-2" />
          Publicado em {formatDate(service.createdAt)}
        </div>
      </CardContent>

      <CardFooter className="flex justify-between pt-6 border-t border-white/20 relative z-10">
        <Link href={`/providers/${service.ServiceProvider.provider_id}`}>
          <Button
            size="lg"
            variant="outline"
            className="bg-white/80 backdrop-blur-sm border-white/30 hover:border-brand hover:bg-brand-tint/50 transition-all duration-300 rounded-xl hover:scale-105 hover:shadow-lg focus:ring-2 focus:ring-brand-disabled"
          >
            <User className="h-4 w-4 mr-2" />
            Ver Perfil
          </Button>
        </Link>
        <Link href={`/providers/${service.id_serviceFreelancer}`}>
          <Button
            size="lg"
            className="bg-brand hover:bg-brand-dark text-white font-semibold shadow-lg rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-xl hover:-translate-y-1 focus:ring-2 focus:ring-brand-disabled"
          >
            Ver Detalhes
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
