import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import ProviderHomeDashboard from "@/features/home/ProviderHomeDashboard";
import SocialFeed from "@/pages/SocialFeed";

export default function AppHome() {
  const { user, isInitialized } = useAuth();

  if (!isInitialized) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (user?.type === "prestador") {
    return <ProviderHomeDashboard />;
  }

  return <SocialFeed />;
}
