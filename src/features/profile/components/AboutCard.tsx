import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, X, Edit2 } from "lucide-react";

interface AboutCardProps {
  about: string;
  isEditing: boolean;
  setIsEditing: (value: boolean) => void;
  setAbout: (value: string) => void;
  loading: boolean;
  error?: string | null;
  saving: boolean;
  providerProfile?: any;
  onSave: () => void;
}

export function AboutCard({
  about,
  isEditing,
  setIsEditing,
  setAbout,
  loading,
  error,
  saving,
  providerProfile,
  onSave,
}: AboutCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sobre mim</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Carregando descrição...
          </div>
        ) : error ? (
          <p className="text-sm text-danger-dark">{error}</p>
        ) : isEditing ? (
          <div className="space-y-3">
            <Textarea value={about} onChange={(e) => setAbout(e.target.value)} rows={4} />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={onSave}
                disabled={saving || !providerProfile}
                className="bg-success-dark text-white"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                {saving ? "Salvando..." : "Salvar"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                <X className="w-4 h-4 mr-1" /> Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-ink whitespace-pre-wrap break-words">
              {about && about.trim() !== "" ? about : "Nenhum 'Sobre mim' cadastrado ainda."}
            </p>
            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)} className="w-fit">
              <Edit2 className="w-4 h-4 mr-1" /> {about && about.trim() !== "" ? "Editar" : "Adicionar"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
