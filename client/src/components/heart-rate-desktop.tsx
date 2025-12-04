import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, Activity, Save, X, Trash2, ArrowLeft, BarChart3, Heart } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import DeleteConfirmationModal from "@/components/delete-confirmation-modal";
import { ValidatedInput, ValidatedSelect, ValidatedTextarea } from "@/components/ui/validated-input";
import { useFormValidation } from "@/hooks/use-form-validation";

interface HeartRateReading {
  id: number;
  heartRate: number;
  measurementType: string;
  measurementDateTime: string;
  notes?: string;
}

export default function HeartRateDesktop() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<'overview' | 'readings'>('overview');
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [heartRateToDelete, setHeartRateToDelete] = useState<number | null>(null);
  const [heartRateToDeleteValue, setHeartRateToDeleteValue] = useState<string>("");
  const [deletingHeartRateId, setDeletingHeartRateId] = useState<number | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: heartRateReadings = [], isLoading: heartRateReadingsLoading } = useQuery({
    queryKey: ["/api/vital-signs/heart-rate"],
  });

  const validationRules = {
    heartRate: {
      required: true,
      min: 30,
      max: 250,
      message: "Batimentos devem estar entre 30 e 250 bpm"
    },
    measurementType: {
      required: true,
      message: "Tipo de medição é obrigatório"
    },
    measurementDateTime: {
      required: true,
      message: "Data e hora da medição são obrigatórias"
    }
  };

  const { formData, errors, updateField, validateForm, resetForm } = useFormValidation({
    heartRate: "",
    measurementType: "",
    measurementDateTime: (() => {
      const now = new Date();
      const timeZoneOffsetMs = now.getTimezoneOffset() * 60000;
      const localTime = new Date(now.getTime() - timeZoneOffsetMs);
      return localTime.toISOString().slice(0, 16);
    })(),
    notes: ""
  }, validationRules);

  const addHeartRateMutation = useMutation({
    mutationFn: (data: any) => apiRequest({ url: "/api/vital-signs/heart-rate", method: "POST", data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vital-signs/heart-rate"] });
      resetForm();
      setShowAddForm(false);
      toast({
        title: "Sucesso",
        description: "Medição de batimentos cardíacos adicionada com sucesso",
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

  const updateHeartRateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiRequest({ url: `/api/vital-signs/heart-rate/${id}`, method: "PUT", data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vital-signs/heart-rate"] });
      resetForm();
      setEditingId(null);
      toast({
        title: "Sucesso",
        description: "Medição de batimentos cardíacos atualizada com sucesso",
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

  const deleteHeartRateReadingMutation = useMutation({
    mutationFn: async (id: number) => {
      setDeletingHeartRateId(id);
      const response = await apiRequest({
        url: `/api/vital-signs/heart-rate/${id}`,
        method: "DELETE",
        on401: "throw"
      });
      return response.json();
    },
    onSuccess: async () => {
      // Aguardar a invalidação e refetch das queries
      await queryClient.invalidateQueries({ queryKey: ["/api/vital-signs/heart-rate"] });
      await queryClient.refetchQueries({ queryKey: ["/api/vital-signs/heart-rate"] });

      // Aguardar um delay para garantir que a lista foi atualizada
      await new Promise(resolve => setTimeout(resolve, 500));

      // Fechar modal apenas após a lista ser atualizada
      setDeleteModalOpen(false);
      setHeartRateToDelete(null);
      setHeartRateToDeleteValue("");

      setTimeout(() => {
        setDeletingHeartRateId(null);
      }, 1000);

      toast({ title: "Sucesso", description: "Batimento cardíaco excluído com sucesso!" });
    },
    onError: (error: any) => {
      setDeletingHeartRateId(null);
      setDeleteModalOpen(false);
      setHeartRateToDelete(null);
      setHeartRateToDeleteValue("");
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir batimento cardíaco",
        variant: "destructive",
      });
    },
  });

  const isSubmitting = addHeartRateMutation.isPending || updateHeartRateMutation.isPending;

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
      heartRate: parseInt(formData.heartRate),
      measurementType: formData.measurementType,
      measurementDateTime: formData.measurementDateTime,
      notes: formData.notes || null
    };

    if (editingId) {
      updateHeartRateMutation.mutate({ id: editingId, data: submitData });
    } else {
      addHeartRateMutation.mutate(submitData);
    }
  };

  const handleEdit = (heartRate: HeartRateReading) => {
    updateField('heartRate', heartRate.heartRate.toString());
    updateField('measurementType', heartRate.measurementType);
    updateField('measurementDateTime', heartRate.measurementDateTime.slice(0, 16));
    updateField('notes', heartRate.notes || '');
    setEditingId(heartRate.id);
    setShowAddForm(true);
  };

  const handleDelete = (heartRate: HeartRateReading) => {
    setHeartRateToDelete(heartRate.id);
    setHeartRateToDeleteValue(`${heartRate.heartRate} bpm`);
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (heartRateToDelete) {
      setDeletingHeartRateId(heartRateToDelete);
      deleteHeartRateReadingMutation.mutate(heartRateToDelete);
    }
  };

  const handleCancel = () => {
    resetForm();
    setShowAddForm(false);
    setEditingId(null);
  };

  const filteredReadings = Array.isArray(heartRateReadings) ? heartRateReadings.filter((reading: HeartRateReading) =>
    reading.heartRate.toString().includes(searchTerm) ||
    reading.measurementType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (reading.notes && reading.notes.toLowerCase().includes(searchTerm.toLowerCase()))
  ) : [];

  const getHeartRateColor = (heartRate: number) => {
    if (heartRate < 60) return "text-blue-600";
    if (heartRate <= 100) return "text-green-600";
    if (heartRate <= 120) return "text-yellow-600";
    return "text-red-600";
  };

  const getHeartRateStatus = (heartRate: number) => {
    if (heartRate < 60) return "Bradicardia";
    if (heartRate <= 100) return "Normal";
    if (heartRate <= 120) return "Elevada";
    return "Taquicardia";
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Batimentos Cardíacos</h1>
          <p className="text-gray-600">Monitore sua frequência cardíaca</p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            onClick={() => setShowAddForm(true)}
            className="bg-rose-600 hover:bg-rose-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Medição
          </Button>
          <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center">
            <Activity className="w-6 h-6 text-rose-600" />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Pesquisar por batimentos, tipo ou observações..."
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
              {editingId ? "Editar Medição de Batimentos Cardíacos" : "Nova Medição de Batimentos Cardíacos"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="heartRate">Batimentos (bpm) *</Label>
                  <ValidatedInput
                    label="Batimentos (bpm) *"
                    id="heartRate"
                    type="number"
                    value={formData.heartRate}
                    onChange={(e) => updateField('heartRate', e.target.value)}
                    error={errors.heartRate}
                    placeholder="Ex: 72"
                    min="30"
                    max="250"
                    step="1"
                  />
                </div>
                <div>
                  <Label htmlFor="measurementType">Tipo de Medição *</Label>
                  <ValidatedSelect
                    label="Tipo de Medição *"
                    value={formData.measurementType}
                    onValueChange={(value) => updateField('measurementType', value)}
                    error={errors.measurementType}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="resting">Repouso</SelectItem>
                      <SelectItem value="exercise">Exercício</SelectItem>
                      <SelectItem value="post-exercise">Pós-exercício</SelectItem>
                      <SelectItem value="stress">Estresse</SelectItem>
                      <SelectItem value="medication">Medicação</SelectItem>
                    </SelectContent>
                  </ValidatedSelect>
                </div>
              </div>
              <div>
                <Label htmlFor="measurementDateTime">Data e Hora da Medição *</Label>
                <ValidatedInput
                  label="Data e Hora da Medição *"
                  id="measurementDateTime"
                  type="datetime-local"
                  value={formData.measurementDateTime}
                  onChange={(e) => updateField('measurementDateTime', e.target.value)}
                  error={errors.measurementDateTime}
                />
              </div>
              <div>
                <Label htmlFor="notes">Observações</Label>
                <ValidatedTextarea
                  label="Observações"
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
                  disabled={isSubmitting}
                  className="bg-rose-600 hover:bg-rose-700"
                >
                  {isSubmitting ? (
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
                  disabled={isSubmitting}
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
        {filteredReadings.map((reading: HeartRateReading) => (
          <Card key={reading.id} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className={`text-2xl font-bold ${getHeartRateColor(reading.heartRate)}`}>
                  {reading.heartRate} bpm
                </div>
                <Badge className={`${getHeartRateColor(reading.heartRate)} bg-opacity-10`}>
                  {getHeartRateStatus(reading.heartRate)}
                </Badge>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center justify-between">
                  <span>Tipo:</span>
                  <span className="font-medium">
                    {reading.measurementType === 'resting' ? 'Repouso' :
                     reading.measurementType === 'exercise' ? 'Exercício' :
                     reading.measurementType === 'post-exercise' ? 'Pós-exercício' :
                     reading.measurementType === 'stress' ? 'Estresse' :
                     reading.measurementType === 'medication' ? 'Medicação' : reading.measurementType}
                  </span>
                </div>
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
                  disabled={deletingHeartRateId === reading.id}
                >
                  {deletingHeartRateId === reading.id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredReadings.length === 0 && !heartRateReadingsLoading && (
        <div className="text-center py-12">
          <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma medição encontrada</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? "Tente uma pesquisa diferente" : "Comece adicionando sua primeira medição de batimentos cardíacos"}
          </p>
          {!searchTerm && (
            <Button
              onClick={() => setShowAddForm(true)}
              className="bg-rose-600 hover:bg-rose-700"
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
        description={<>Tem certeza que deseja excluir a medição <strong>{heartRateToDeleteValue}</strong>?</>}
        loading={deletingHeartRateId !== null}
      />
    </div>
  );
}