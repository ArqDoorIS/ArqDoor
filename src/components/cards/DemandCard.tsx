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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Briefcase,
  Clock,
  User,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/queryClient";
import { EnrichedDemand } from "@/lib/Interfaces";
import { getInitials } from "@/lib/utils";

interface DemandCardProps {
  demand: EnrichedDemand;
  currentUser?: any;
}

const buildImageUrl = (path?: string) => {
  if (!path) return "";
  const normalizedPath = path.replace(/\\/g, "/");
  return normalizedPath.startsWith("http")
    ? normalizedPath
    : `${API_BASE_URL}/${normalizedPath.replace(/^\/+/, "")}`;
};

export default function DemandCard({ demand }: DemandCardProps) {
  return (
    <Card
      className="group relative overflow-hidden bg-white/80 backdrop-blur-sm border-white/30 rounded-3xl shadow-lg hover:shadow-2xl hover:shadow-brand-soft/50 transition-all duration-500 hover:-translate-y-2 hover:scale-[1.02]"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>

      <CardHeader className="pb-4 relative z-10">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl font-bold text-ink group-hover:text-brand-dark transition-colors duration-300 line-clamp-2 mb-3">
              {demand.title}
            </CardTitle>
            <div className="flex items-center space-x-2">
              <CardDescription className="text-2xl font-bold text-success-dark">
                R$ {demand.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pb-6 relative z-10">
        <p className="text-muted-foreground line-clamp-3 leading-relaxed text-base">
          {demand.description}
        </p>

        <div className="flex items-center space-x-4 p-4 bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-sm">
          <Avatar className="w-12 h-12 border-2 border-white shadow-sm">
            <AvatarImage src={buildImageUrl((demand as any).userPerfil)} alt={demand.userName} className="object-cover" />
            <AvatarFallback className="bg-brand-soft text-brand-dark">
              {getInitials(demand.userName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-ink truncate text-lg">{demand.userName}</p>
            <p className="text-sm text-muted-foreground truncate">{demand.userEmail}</p>
          </div>
        </div>

        <div className="flex items-center text-sm text-muted-foreground">
          <Clock className="h-4 w-4 mr-2" />
          Publicada em {demand.createdAt.split("T")[0].split("-").reverse().join("/")}
        </div>
      </CardContent>

      <CardFooter className="flex justify-between pt-2">
        <Link href={`/user/${demand.id_user}`}>
          <Button
            size="lg"
            variant="secondary"
            className="text-muted-foreground hover:text-brand-dark"
          >
            <Briefcase className="h-4 w-4 mr-2" />
            Ver perfil
          </Button>
        </Link>
        <Link href={`/demand/${demand.id_demand}`}>
          <Button
            size="lg"
            variant="default"
            className="bg-brand hover:bg-brand-dark text-white font-semibold shadow-lg rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-xl hover:-translate-y-1 focus:ring-2 focus:ring-brand-disabled"
          >
            <Briefcase className="h-4 w-4 mr-2" />
            Ver Detalhes
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
