import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, Scale, Save, X, Trash2, ArrowLeft, BarChart3, Activity } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import DeleteConfirmationModal from "@/components/delete-confirmation-modal";
import { ValidatedInput, ValidatedTextarea } from "@/components/ui/validated-input";
import { useFormValidation } from "@/hooks/use-form-validation";

interface WeightReading {
  id: number;
  weight: number;
  measurementDateTime: string;
  notes?: string;
}

export default function WeightDesktop() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<'overview' | 'readings'>('overview');
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [weightToDelete, setWeightToDelete] = useState<number | null>(null);
  const [weightToDeleteValue, setWeightToDeleteValue] = useState<string>("");
  const [deletingWeightId, setDeletingWeightId] = useState<number | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: weightReadings = [], isLoading } = useQuery({
    queryKey: ["/api/vital-signs/weight"],
  });

  const validationRules = {
    weight: {
      required: true,
      min: 1,
      max: 300,
      message: "Peso deve estar entre 1 e 300 kg"
    },
    measurementDateTime: {
      required: true,
      message: "Data e hora da medição são obrigatórias"
    }
  };

  const { formData, errors, updateField, validateForm, resetForm } = useFormValidation({
    weight: "",
    measurementDateTime: (() => {
      const now = new Date();
      const timeZoneOffsetMs = now.getTimezoneOffset() * 60000;
      const localTime = new Date(now.getTime() - timeZoneOffsetMs);
      return localTime.toISOString().slice(0, 16);
    })(),
    notes: ""
  }, validationRules);

  const addWeightMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/vital-signs/weight", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vital-signs/weight"] });
      resetForm();
      setShowAddForm(false);
      toast({
        title: "Sucesso",
        description: "Medição de peso adicionada com sucesso",
        className: "bg-green-50 border-green-200 text-green-800"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao adicionar medição",
        variant: "destructive"
      });
    }
  });

  const updateWeightMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiRequest(`/api/vital-signs/weight/${id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vital-signs/weight"] });
      resetForm();
      setEditingId(null);
      toast({
        title: "Sucesso",
        description: "Medição de peso atualizada com sucesso",
        className: "bg-green-50 border-green-200 text-green-800"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar medição",
        variant: "destructive"
      });
    }
  });

  const deleteWeightReadingMutation = useMutation({
    mutationFn: async (id: number) => {
      setDeletingWeightId(id);
      const response = await apiRequest({
        url: `/api/vital-signs/weight/${id}`,
        method: "DELETE",
        on401: "throw"
      });
      return response.json();
    },
    onSuccess: async () => {
      // Aguardar a invalidação e refetch das queries
      await queryClient.invalidateQueries({ queryKey: ["/api/vital-signs/weight"] });
      await queryClient.refetchQueries({ queryKey: ["/api/vital-signs/weight"] });

      // Aguardar um delay para garantir que a lista foi atualizada
      await new Promise(resolve => setTimeout(resolve, 500));

      // Fechar modal apenas após a lista ser atualizada
      setDeleteModalOpen(false);
      setWeightToDelete(null);
      setWeightToDeleteValue("");

      setTimeout(() => {
        setDeletingWeightId(null);
      }, 1000);

      toast({ title: "Sucesso", description: "Peso excluído com sucesso!" });
    },
    onError: (error: any) => {
      setDeletingWeightId(null);
      setDeleteModalOpen(false);
      setWeightToDelete(null);
      setWeightToDeleteValue("");
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir peso",
        variant: "destructive",
      });
    },
  });

  const isLoading = addWeightMutation.isPending || updateWeightMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      const errorCount = Object.keys(errors).filter(key => errors[key]).length;
      toast({
        title: "Erro de validação",
        description: `Por favor, corrija ${errorCount} campo(s) antes de continuar`,
        variant: "destructive"
      });
      return;
    }

    const submitData = {
      weight: parseFloat(formData.weight),
      measurementDateTime: formData.measurementDateTime,
      notes: formData.notes || null
    };

    if (editingId) {
      updateWeightMutation.mutate({ id: editingId, data: submitData });
    } else {
      addWeightMutation.mutate(submitData);
    }
  };

  const handleEdit = (weight: WeightReading) => {
    updateField('weight', weight.weight.toString());
    updateField('measurementDateTime', weight.measurementDateTime.slice(0, 16));
    updateField('notes', weight.notes || '');
    setEditingId(weight.id);
    setShowAddForm(true);
  };

  const handleDelete = (weight: WeightReading) => {
    setWeightToDelete(weight.id);
    setWeightToDeleteValue(`${weight.weight} kg`);
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (weightToDelete) {
      deleteWeightReadingMutation.mutate(weightToDelete);
    }
  };

  const handleCancel = () => {
    resetForm();
    setShowAddForm(false);
    setEditingId(null);
  };

  const filteredReadings = Array.isArray(weightReadings) ? weightReadings.filter((reading: WeightReading) =>
    reading.weight.toString().includes(searchTerm) ||
    (reading.notes && reading.notes.toLowerCase().includes(searchTerm.toLowerCase()))
  ) : [];

  const getWeightTrend = (currentWeight: number, previousWeight?: number) => {
    if (!previousWeight) return { color: "text-gray-600", trend: "stable", text: "Primeira medição" };

    const difference = currentWeight - previousWeight;
    if (Math.abs(difference) < 0.5) return { color: "text-gray-600", trend: "stable", text: "Estável" };
    if (difference > 0) return { color: "text-red-600", trend: "up", text: `+${difference.toFixed(1)} kg` };
    return { color: "text-green-600", trend: "down", text: `${difference.toFixed(1)} kg` };
  };

  const sortedReadings = [...filteredReadings].sort((a, b) => 
    new Date(b.measurementDateTime).getTime() - new Date(a.measurementDateTime).getTime()
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Peso</h1>
          <p className="text-gray-600">Monitore sua evolução de peso</p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            onClick={() => setShowAddForm(true)}
            className="bg-violet-600 hover:bg-violet-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Medição
          </Button>
          <div className="w-12 h-12 bg-violet-100 rounded-full flex items-center justify-center">
            <Scale className="w-6 h-6 text-violet-600" />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Pesquisar por peso ou observações..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              {editingId ? "Editar Medição de Peso" : "Nova Medição de Peso"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="weight">Peso (kg) *</Label>
                  <ValidatedInput
                    id="weight"
                    type="number"
                    value={formData.weight}
                    onChange={(e) => updateField('weight', e.target.value)}
                    error={errors.weight}
                    placeholder="Ex: 75.5"
                    min="1"
                    max="300"
                    step="0.1"
                  />
                </div>
                <div>
                  <Label htmlFor="measurementDateTime">Data e Hora da Medição *</Label>
                  <ValidatedInput
                    id="measurementDateTime"
                    type="datetime-local"
                    value={formData.measurementDateTime}
                    onChange={(e) => updateField('measurementDateTime', e.target.value)}
                    error={errors.measurementDateTime}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Observações</Label>
                <ValidatedTextarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  error={errors.notes}
                  placeholder="Observações adicionais..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-violet-600 hover:bg-violet-700"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Readings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedReadings.map((reading: WeightReading, index: number) => {
          const previousReading = sortedReadings[index + 1];
          const trend = getWeightTrend(reading.weight, previousReading?.weight);

          return (
            <Card key={reading.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-2xl font-bold text-violet-600">
                    {reading.weight} kg
                  </div>
                  <Badge className={`${trend.color} bg-opacity-10`}>
                    {trend.text}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center justify-between">
                    <span>Data:</span>
                    <span className="font-medium">
                      {format(new Date(reading.measurementDateTime), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  {reading.notes && (
                    <div className="pt-2 border-t">
                      <p className="text-gray-700 text-sm">{reading.notes}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(reading);
                    }}
                    className="flex-1"
                  >
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(reading);
                    }}
                    className="text-red-600 hover:text-red-700"
                    disabled={deletingWeightId === reading.id}
                  >
                    {deletingWeightId === reading.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredReadings.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <Scale className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma medição encontrada</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? "Tente uma pesquisa diferente" : "Comece adicionando sua primeira medição de peso"}
          </p>
          {!searchTerm && (
            <Button
              onClick={() => setShowAddForm(true)}
              className="bg-violet-600 hover:bg-violet-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Medição
            </Button>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirm={confirmDelete}
        title="Excluir Medição"
        description={<>Tem certeza que deseja excluir a medição <strong>{weightToDeleteValue}</strong>?</>}
        loading={deletingWeightId !== null}
      />
    </div>
  );
}