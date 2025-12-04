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
import { Search, Plus, Thermometer, Save, X, Trash2, ArrowLeft, BarChart3, Activity } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import DeleteConfirmationModal from "@/components/delete-confirmation-modal";
import { ValidatedInput, ValidatedSelect, ValidatedTextarea } from "@/components/ui/validated-input";
import { useFormValidation } from "@/hooks/use-form-validation";

interface TemperatureReading {
  id: number;
  temperature: number;
  measurementMethod: string;
  measurementDateTime: string;
  notes?: string;
}

export default function TemperatureDesktop() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<'overview' | 'readings'>('overview');
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [temperatureToDelete, setTemperatureToDelete] = useState<number | null>(null);
  const [temperatureToDeleteValue, setTemperatureToDeleteValue] = useState<string>("");
  const [deletingTemperatureId, setDeletingTemperatureId] = useState<number | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: temperatureReadings = [], isLoading: temperatureReadingsLoading } = useQuery({
    queryKey: ["/api/vital-signs/temperature"],
  });

  const validationRules = {
    temperature: {
      required: true,
      min: 25,
      max: 50,
      message: "Temperatura deve estar entre 25°C e 50°C"
    },
    measurementMethod: {
      required: true,
      message: "Método de medição é obrigatório"
    },
    measurementDateTime: {
      required: true,
      message: "Data e hora da medição são obrigatórias"
    }
  };

  const { formData, errors, updateField, validateForm, resetForm } = useFormValidation({
    temperature: "",
    measurementMethod: "",
    measurementDateTime: (() => {
      const now = new Date();
      const timeZoneOffsetMs = now.getTimezoneOffset() * 60000;
      const localTime = new Date(now.getTime() - timeZoneOffsetMs);
      return localTime.toISOString().slice(0, 16);
    })(),
    notes: ""
  }, validationRules);

  const addTemperatureMutation = useMutation({
    mutationFn: (data: any) => apiRequest({ url: "/api/vital-signs/temperature", method: "POST", data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vital-signs/temperature"] });
      resetForm();
      setShowAddForm(false);
      toast({
        title: "Sucesso",
        description: "Medição de temperatura adicionada com sucesso",
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

  const updateTemperatureMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiRequest({ url: `/api/vital-signs/temperature/${id}`, method: "PUT", data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vital-signs/temperature"] });
      resetForm();
      setEditingId(null);
      toast({
        title: "Sucesso",
        description: "Medição de temperatura atualizada com sucesso",
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

  const deleteTemperatureReadingMutation = useMutation({
    mutationFn: async (id: number) => {
      setDeletingTemperatureId(id);
      const response = await apiRequest({
        url: `/api/vital-signs/temperature/${id}`,
        method: "DELETE",
        on401: "throw"
      });
      return response.json();
    },
    onSuccess: async () => {
      // Aguardar a invalidação e refetch das queries
      await queryClient.invalidateQueries({ queryKey: ["/api/vital-signs/temperature"] });
      await queryClient.refetchQueries({ queryKey: ["/api/vital-signs/temperature"] });

      // Aguardar um delay para garantir que a lista foi atualizada
      await new Promise(resolve => setTimeout(resolve, 500));

      // Fechar modal apenas após a lista ser atualizada
      setDeleteModalOpen(false);
      setTemperatureToDelete(null);
      setTemperatureToDeleteValue("");

      setTimeout(() => {
        setDeletingTemperatureId(null);
      }, 1000);

      toast({ title: "Sucesso", description: "Temperatura excluída com sucesso!" });
    },
    onError: (error: any) => {
      setDeletingTemperatureId(null);
      setDeleteModalOpen(false);
      setTemperatureToDelete(null);
      setTemperatureToDeleteValue("");
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir temperatura",
        variant: "destructive",
      });
    },
  });

  const isSubmitting = addTemperatureMutation.isPending || updateTemperatureMutation.isPending;

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
      temperature: parseFloat(formData.temperature),
      measurementMethod: formData.measurementMethod,
      measurementDateTime: formData.measurementDateTime,
      notes: formData.notes || null
    };

    if (editingId) {
      updateTemperatureMutation.mutate({ id: editingId, data: submitData });
    } else {
      addTemperatureMutation.mutate(submitData);
    }
  };

  const handleEdit = (temperature: TemperatureReading) => {
    updateField('temperature', temperature.temperature.toString());
    updateField('measurementMethod', temperature.measurementMethod);
    updateField('measurementDateTime', temperature.measurementDateTime.slice(0, 16));
    updateField('notes', temperature.notes || '');
    setEditingId(temperature.id);
    setShowAddForm(true);
  };

  const handleDelete = (temperature: TemperatureReading) => {
    setTemperatureToDelete(temperature.id);
    setTemperatureToDeleteValue(`${temperature.temperature}°C`);
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (temperatureToDelete) {
      setDeletingTemperatureId(temperatureToDelete);
      deleteTemperatureReadingMutation.mutate(temperatureToDelete);
    }
  };

  const handleCancel = () => {
    resetForm();
    setShowAddForm(false);
    setEditingId(null);
  };

  const filteredReadings = Array.isArray(temperatureReadings) ? temperatureReadings.filter((reading: TemperatureReading) =>
    reading.temperature.toString().includes(searchTerm) ||
    reading.measurementMethod.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (reading.notes && reading.notes.toLowerCase().includes(searchTerm.toLowerCase()))
  ) : [];

  const getTemperatureColor = (temperature: number) => {
    if (temperature < 36.0) return "text-blue-600";
    if (temperature <= 37.5) return "text-green-600";
    if (temperature <= 38.5) return "text-yellow-600";
    return "text-red-600";
  };

  const getTemperatureStatus = (temperature: number) => {
    if (temperature < 36.0) return "Baixa";
    if (temperature <= 37.5) return "Normal";
    if (temperature <= 38.5) return "Febre Baixa";
    return "Febre Alta";
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Temperatura</h1>
          <p className="text-gray-600">Monitore suas medições de temperatura corporal</p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            onClick={() => setShowAddForm(true)}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Medição
          </Button>
          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
            <Thermometer className="w-6 h-6 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Pesquisar por temperatura, método ou observações..."
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
              {editingId ? "Editar Medição de Temperatura" : "Nova Medição de Temperatura"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <ValidatedInput
                    label="Temperatura (°C) *"
                    id="temperature"
                    type="number"
                    value={formData.temperature}
                    onChange={(e) => updateField('temperature', e.target.value)}
                    error={errors.temperature}
                    placeholder="Ex: 37.2"
                    min="25"
                    max="50"
                    step="0.1"
                  />
                </div>
                <div>
                  <ValidatedSelect
                    label="Método de Medição *"
                    value={formData.measurementMethod}
                    onValueChange={(value) => updateField('measurementMethod', value)}
                    error={errors.measurementMethod}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o método" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="oral">Oral</SelectItem>
                      <SelectItem value="axillary">Axilar</SelectItem>
                      <SelectItem value="rectal">Retal</SelectItem>
                      <SelectItem value="tympanic">Timpânica</SelectItem>
                      <SelectItem value="temporal">Temporal</SelectItem>
                    </SelectContent>
                  </ValidatedSelect>
                </div>
              </div>
              <div>
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
                  className="bg-orange-600 hover:bg-orange-700"
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
        {filteredReadings.map((reading: TemperatureReading) => (
          <Card key={reading.id} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className={`text-2xl font-bold ${getTemperatureColor(reading.temperature)}`}>
                  {reading.temperature}°C
                </div>
                <Badge className={`${getTemperatureColor(reading.temperature)} bg-opacity-10`}>
                  {getTemperatureStatus(reading.temperature)}
                </Badge>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center justify-between">
                  <span>Método:</span>
                  <span className="font-medium">
                    {reading.measurementMethod === 'oral' ? 'Oral' :
                     reading.measurementMethod === 'axillary' ? 'Axilar' :
                     reading.measurementMethod === 'rectal' ? 'Retal' :
                     reading.measurementMethod === 'tympanic' ? 'Timpânica' :
                     reading.measurementMethod === 'temporal' ? 'Temporal' : reading.measurementMethod}
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
                  disabled={deletingTemperatureId === reading.id}
                >
                  {deletingTemperatureId === reading.id ? (
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
      {filteredReadings.length === 0 && !temperatureReadingsLoading && (
        <div className="text-center py-12">
          <Thermometer className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma medição encontrada</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? "Tente uma pesquisa diferente" : "Comece adicionando sua primeira medição de temperatura"}
          </p>
          {!searchTerm && (
            <Button
              onClick={() => setShowAddForm(true)}
              className="bg-orange-600 hover:bg-orange-700"
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
        description={<>Tem certeza que deseja excluir a medição <strong>{temperatureToDeleteValue}</strong>?</>}
        loading={deletingTemperatureId !== null}
      />
    </div>
  );
}