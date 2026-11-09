import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Save, Edit2, Trash2, X } from "lucide-react";

const onlyDigits = (v: string) => (v || '').toString().replace(/\D/g, '');

const formatCentsToDisplay = (cents: string) => {
  const digits = onlyDigits(cents);
  if (!digits) return '';
  const n = parseInt(digits, 10);
  return (n / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

interface ServicesSectionProps {
  userType: string;
  serviceItems: any[];
  loading: boolean;
  editingId: number | null;
  draftItem: any;
  setDraftItem: (item: any) => void;
  setEditingId: (id: number | null) => void;
  handleUpdate: (id: number) => void;
  handleDelete: (id: number) => void;
  isCreating: boolean;
  setIsCreating: (value: boolean) => void;
  newItem: { title: string; description: string; price: string };
  setNewItem: (item: any) => void;
  handleCreate: () => void;
  creatingItem: boolean;
}

export function ServicesSection({
  userType,
  serviceItems,
  loading,
  editingId,
  draftItem,
  setDraftItem,
  setEditingId,
  handleUpdate,
  handleDelete,
  isCreating,
  setIsCreating,
  newItem,
  setNewItem,
  handleCreate,
  creatingItem,
}: ServicesSectionProps) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>{userType === "prestador" ? "Meus Serviços" : "Minhas Demandas"}</CardTitle>
        <Button
          size="sm"
          onClick={() => setIsCreating(!isCreating)}
          className="bg-brand text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          {isCreating ? "Cancelar" : userType === "prestador" ? "Novo Serviço" : "Nova Demanda"}
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : (
          <>
            {isCreating && (
              <div className="space-y-3 mb-6 p-4 border rounded-lg bg-surface-soft">
                <Input
                  placeholder="Título"
                  value={newItem.title}
                  onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                />
               <div className="space-y-1">
                  <Textarea
                    placeholder="Descrição"
                    value={newItem.description}
                    onChange={(e) =>
                      setNewItem({ ...newItem, description: e.target.value })
                    }
                  />

                  <div className="flex justify-end">
                    <span className={`text-xs ${
                      newItem.description.length < 30
                        ? "text-danger-dark"
                        : "text-muted-foreground"
                    }`}>
                      {newItem.description.length} caracteres
                    </span>
                  </div>
                </div>
                  <Input
                    type="text"
                    placeholder="Preço"
                    value={formatCentsToDisplay(newItem.price)}
                    onChange={(e) => setNewItem({ ...newItem, price: onlyDigits(e.target.value) })}
                  />
                <Button onClick={handleCreate} disabled={creatingItem} className="w-full">
                  {creatingItem ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                  {creatingItem ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            )}
            {serviceItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {userType === "prestador"
                  ? "Você ainda não cadastrou serviços."
                  : "Você ainda não cadastrou demandas."}
              </p>
            ) : (
              <div className="flex flex-wrap gap-4">
                {serviceItems.map((item) => (
                  <div
                    key={item.id_serviceFreelancer || item.id_demand}
                    className="flex-1 min-w-[280px] p-4 border rounded-lg space-y-2 bg-white"
                  >
                    {editingId === (item.id_serviceFreelancer || item.id_demand) ? (
                      <>
                        <Input
                          value={draftItem.title}
                          onChange={(e) => setDraftItem({ ...draftItem, title: e.target.value })}
                        />
                        <Textarea
                          value={draftItem.description}
                          onChange={(e) => setDraftItem({ ...draftItem, description: e.target.value })}
                        />
                        {(userType === "prestador" || item.price !== undefined) && (
                          <Input
                            type="text"
                            value={formatCentsToDisplay(draftItem.price)}
                            onChange={(e) => setDraftItem({ ...draftItem, price: onlyDigits(e.target.value) })}
                          />
                        )}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleUpdate(item.id_serviceFreelancer || item.id_demand)}
                          >
                            <Save className="w-4 h-4 mr-1" /> Salvar
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                            <X className="w-4 h-4 mr-1" /> Cancelar
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <h4 className="font-semibold">{item.title}</h4>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                        {item.price !== undefined && item.price !== null && <p className="text-brand-dark font-bold">R$ {Number(item.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>}
                        <div className="flex  gap-2 mt-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              setEditingId(item.id_serviceFreelancer || item.id_demand);
                              setDraftItem({ ...item, price: item.price ? String(Math.round(Number(item.price) * 100)) : "" });
                            }}
                          >
                            <Edit2 className="w-4 h-4 mr-1" /> Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(item.id_serviceFreelancer || item.id_demand)}
                          >
                            <Trash2 className="w-4 h-4 mr-1" /> Remover
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
