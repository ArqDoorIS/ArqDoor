import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Save, X } from "lucide-react";

interface DocumentsCardProps {
  data: { cpf: string; cnpj: string };
  onChangeCpf: (value: string) => void;
  onChangeCnpj: (value: string) => void;
  loading: boolean;
  saving: boolean;
  changed: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export function DocumentsCard({
  data,
  onChangeCpf,
  onChangeCnpj,
  loading,
  saving,
  changed,
  onSave,
  onCancel,
}: DocumentsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Documentos para preencher cadastro</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando dados...
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">CPF</label>
              <Input
                value={data.cpf}
                onChange={(e) => onChangeCpf(e.target.value)}
                placeholder="Somente números"
                maxLength={14}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">CNPJ</label>
              <Input
                value={data.cnpj}
                onChange={(e) => onChangeCnpj(e.target.value)}
                placeholder="Somente números"
                maxLength={18}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Essas informações são usadas apenas para processar pagamentos e não são exibidas para outros usuários.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-brand text-white"
                onClick={onSave}
                disabled={!changed || saving}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Salvar documentos
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onCancel}
                disabled={!changed || saving}
              >
                <X className="w-4 h-4 mr-1" /> Cancelar
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
