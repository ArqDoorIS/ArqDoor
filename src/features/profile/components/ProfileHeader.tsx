import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Camera, Trash2, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, API_BASE_URL } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ProfileHeaderProps {
  user: {
    id: number;
    name: string;
    email?: string;
    perfil?: string;
    banner?: string;
    type: string;
  };
  onLogout: () => void;
}

const buildImageUrl = (path?: string) => {
  if (!path) return "";
  const normalizedPath = path.replace(/\\/g, "/");
  return normalizedPath.startsWith("http")
    ? normalizedPath
    : `${API_BASE_URL}/${normalizedPath.replace(/^\/+/, "")}`;
};

export function ProfileHeader({ user, onLogout }: ProfileHeaderProps) {
  const { updateUserLocal } = useAuth();
  const { toast } = useToast();
  
  const [uploadingPerfil, setUploadingPerfil] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [removingPerfil, setRemovingPerfil] = useState(false);
  const [removingBanner, setRemovingBanner] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<"perfil" | "banner" | null>(null);

  const perfilInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: "perfil" | "banner") => {
    const file = e.target.files?.[0];
    if (!file) return;

    // validação de tipo de arquivo
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Erro no upload",
        description: "Certifique-se de mandar uma imagem JPG, PNG ou WebP.",
        variant: "destructive",
      });
      if (e.target) e.target.value = "";
      return;
    }

    const isPerfil = type === "perfil";
    const setLoading = isPerfil ? setUploadingPerfil : setUploadingBanner;
    
    // o backend espera "perfil" e "banner"
    const backendType = type;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", backendType);

      const res = await apiRequest("POST", "/upload/image", formData);
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(body.message || "Falha no upload.");
      }

      const imagePath = body.userImage?.image_path || body.path || body.url;
      
      if (imagePath) {
         await apiRequest("PUT", `/users/${user.id}`, { [type]: imagePath });
         
         updateUserLocal({ [type]: imagePath } as any);
         toast({ title: "Sucesso", description: `${isPerfil ? "Foto de perfil" : "Capa"} atualizada.` });
      } else {
         toast({ title: "Aviso", description: "Upload realizado, mas não foi possível atualizar a visualização imediatamente." });
      }

    } catch (error: any) {
      console.error(error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível enviar a imagem.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      if (e.target) e.target.value = ""; 
    }
  };

  const handleRemove = (type: "perfil" | "banner") => {
    setDeleteConfirmation(type);
  };

  const executeRemoval = async () => {
    if (!deleteConfirmation) return;
    const type = deleteConfirmation;
    const isPerfil = type === "perfil";
    const setLoading = isPerfil ? setRemovingPerfil : setRemovingBanner;
    
    const backendType = type;

    setDeleteConfirmation(null);
    setLoading(true);
    try {
        const res = await apiRequest("DELETE", "/upload/image", { type: backendType });
        
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.message || "Falha ao remover imagem.");
        }

        await apiRequest("PUT", `/users/${user.id}`, { [type]: null });

        updateUserLocal({ [type]: null } as any);
        toast({ title: "Imagem removida." });

    } catch (error: any) {
        toast({
            title: "Erro",
            description: error.message,
            variant: "destructive"
        });
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="w-full overflow-hidden rounded-lg border bg-white shadow-sm group">
      <div className="relative h-32 bg-surface-warm">
        {user.banner ? (
            <img 
                src={buildImageUrl(user.banner)} 
                alt="Capa" 
                className="w-full h-full object-cover"
            />
        ) : (
            <div className="w-full h-full bg-brand" />
        )}
        
        {/* Banner Controls */}
        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <input 
                type="file" 
                ref={bannerInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={(e) => handleFileChange(e, "banner")}
            />
            <Button 
                size="sm" 
                variant="secondary" 
                className="h-8 bg-white/80 hover:bg-white backdrop-blur-sm shadow-sm"
                onClick={() => bannerInputRef.current?.click()}
                disabled={uploadingBanner}
            >
                {uploadingBanner ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4 mr-2" />}
                {user.banner ? "Alterar capa" : "Adicionar capa"}
            </Button>
            {user.banner && (
                <Button 
                    size="icon" 
                    variant="destructive" 
                    className="h-8 w-8 shadow-sm"
                    onClick={() => handleRemove("banner")}
                    disabled={removingBanner}
                >
                    {removingBanner ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </Button>
            )}
        </div>

        <div className="absolute -bottom-16 left-8 group/avatar">
          <div className="relative">
            <Avatar className="w-32 h-32 border-4 border-white shadow-lg bg-white">
                <AvatarImage src={buildImageUrl(user.perfil)} alt={user.name} className="object-cover" />
            <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
            
            {/* Avatar Controls */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                <input 
                    type="file" 
                    ref={perfilInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, "perfil")}
                />
                <div className="flex gap-2">
                    <Button 
                        size="icon" 
                        variant="ghost" 
                        className="text-white hover:text-white hover:bg-white/20 rounded-full"
                        onClick={() => perfilInputRef.current?.click()}
                        disabled={uploadingPerfil}
                        title="Alterar foto"
                    >
                        {uploadingPerfil ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                    </Button>
                    {user.perfil && (
                        <Button 
                            size="icon" 
                            variant="ghost" 
                            className="text-danger hover:text-danger hover:bg-white/20 rounded-full"
                            onClick={() => handleRemove("perfil")}
                            disabled={removingPerfil}
                            title="Remover foto"
                        >
                            {removingPerfil ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                        </Button>
                    )}
                </div>
            </div>
          </div>
        </div>
      </div>
      <div className="pt-20 pb-8 px-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{user.name}</h1>
          <p className="text-muted-foreground">
            {user.type === "prestador" ? "Prestador de Serviços" : "Cliente"}
          </p>
        </div>
        <Button variant="outline" onClick={onLogout}>
          <LogOut className="w-4 h-4 mr-2" /> Sair
        </Button>
      </div>

      <Dialog open={!!deleteConfirmation} onOpenChange={(open) => !open && setDeleteConfirmation(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover imagem</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover a {deleteConfirmation === "perfil" ? "foto de perfil" : "foto de capa"}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmation(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={executeRemoval}>
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
