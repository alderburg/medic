import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ValidatedInput, ValidatedTextarea } from "@/components/ui/validated-input";
import { useFormValidation, ValidationRules } from "@/hooks/use-form-validation";
import {
  ArrowLeft,
  Plus,
  Search,
  Activity,
  Heart,
  Save,
  X,
  Trash2,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import DeleteConfirmationModal from "@/components/delete-confirmation-modal";

interface BloodPressureReading {
  id: number;
  patientId: number;
  systolic: number;
  diastolic: number;
  heartRate: number;
  notes: string | null;
  measuredAt: string;
  createdAt: string;
}

function PressureDesktop() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<'overview' | 'readings'>('overview');
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [readingToDelete, setReadingToDelete] = useState<number | null>(null);
  const [readingToDeleteName, setReadingToDeleteName] = useState<string>("");
  const [deletingReadingId, setDeletingReadingId] = useState<number | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const validationRules: ValidationRules = {
    systolic: { required: true, min: 60, max: 250 },
    diastolic: { required: true, min: 40, max: 150 },
    heartRate: { required: true, min: 30, max: 250 },
    measuredAt: { required: true },
  };

  const { formData, errors, updateField, resetForm, validateForm } = useFormValidation(
    {
      systolic: "",
      diastolic: "",
      heartRate: "",
      notes: "",
      measuredAt: (() => {
        const nowUTC = new Date();
        const nowBrasil = new Date(nowUTC.getTime() - (3 * 60 * 60 * 1000));
        return nowBrasil.toISOString().slice(0, 16);
      })(),
    },
    validationRules
  );

  const { data: pressureReadings = [], isLoading } = useQuery({
    queryKey: ["/api/vital-signs/blood-pressure"],
    queryFn: async () => {
      const response = await apiRequest({
        url: "/api/vital-signs/blood-pressure",
        method: "GET",
        on401: "throw"
      });
      return response.json();
    },
  });

  const addPressureReadingMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest({
        url: "/api/vital-signs/blood-pressure",
        method: "POST",
        data,
        on401: "throw"
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vital-signs/blood-pressure"] });
      toast({ title: "Sucesso", description: "Pressão arterial cadastrada com sucesso!" });
      resetForm();
      setShowAddForm(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao cadastrar pressão arterial",
        variant: "destructive",
      });
    },
  });

  const updatePressureReadingMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest({
        url: `/api/vital-signs/blood-pressure/${id}`,
        method: "PUT",
        data,
        on401: "throw"
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vital-signs/blood-pressure"] });
      toast({ title: "Sucesso", description: "Pressão arterial atualizada com sucesso!" });
      resetForm();
      setEditingId(null);
      setShowAddForm(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar pressão arterial",
        variant: "destructive",
      });
    },
  });

  const deletePressureReadingMutation = useMutation({
    mutationFn: async (id: number) => {
      setDeletingReadingId(id);
      const response = await apiRequest({
        url: `/api/vital-signs/blood-pressure/${id}`,
        method: "DELETE",
        on401: "throw"
      });
      return response.json();
    },
    onSuccess: async () => {
      // Aguardar a invalidação e refetch das queries
      await queryClient.invalidateQueries({ queryKey: ["/api/vital-signs/blood-pressure"] });
      await queryClient.refetchQueries({ queryKey: ["/api/vital-signs/blood-pressure"] });
      
      // Aguardar um delay para garantir que a lista foi atualizada
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Fechar modal apenas após a lista ser atualizada
      setDeleteModalOpen(false);
      setReadingToDelete(null);
      setReadingToDeleteName("");
      
      setTimeout(() => {
        setDeletingReadingId(null);
      }, 1000);
      
      toast({ title: "Sucesso", description: "Pressão arterial excluída com sucesso!" });
    },
    onError: (error: any) => {
      setDeletingReadingId(null);
      setDeleteModalOpen(false);
      setReadingToDelete(null);
      setReadingToDeleteName("");
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir pressão arterial",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      const errorCount = Object.keys(errors).length;
      toast({
        title: "Erro de validação",
        description: `Por favor, corrija ${errorCount} campo(s) obrigatório(s).`,
        variant: "destructive",
      });
      return;
    }

    const submitData = {
      systolic: parseInt(formData.systolic),
      diastolic: parseInt(formData.diastolic),
      heartRate: parseInt(formData.heartRate),
      notes: formData.notes || null,
      measuredAt: formData.measuredAt,
    };

    if (editingId) {
      updatePressureReadingMutation.mutate({ id: editingId, data: submitData });
    } else {
      addPressureReadingMutation.mutate(submitData);
    }
  };

  const handleEdit = (reading: BloodPressureReading) => {
    // Preservar a data original sem conversão de timezone
    let formattedDate = reading.measuredAt;
    
    // Se a data vier em formato ISO, extrair apenas a parte necessária
    if (reading.measuredAt.includes('T')) {
      formattedDate = reading.measuredAt.slice(0, 16);
    } else {
      // Se vier apenas a data, adicionar horário padrão
      const date = new Date(reading.measuredAt);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    resetForm({
      systolic: reading.systolic.toString(),
      diastolic: reading.diastolic.toString(),
      heartRate: reading.heartRate.toString(),
      notes: reading.notes || "",
      measuredAt: formattedDate,
    });
    setEditingId(reading.id);
    setShowAddForm(true);
  };

  const handleDelete = (reading: BloodPressureReading) => {
    setReadingToDelete(reading.id);
    setReadingToDeleteName(`${reading.systolic}/${reading.diastolic} mmHg`);
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (readingToDelete) {
      deletePressureReadingMutation.mutate(readingToDelete);
    }
  };

  const filteredReadings = Array.isArray(pressureReadings) ? pressureReadings.filter((reading: BloodPressureReading) =>
    reading.systolic.toString().includes(searchTerm) ||
    reading.diastolic.toString().includes(searchTerm) ||
    reading.heartRate.toString().includes(searchTerm)
  ) : [];

  const getStatusColor = (systolic: number, diastolic: number) => {
    if (systolic < 90 || diastolic < 60) return "bg-blue-100 text-blue-800";
    if (systolic <= 120 && diastolic <= 80) return "bg-green-100 text-green-800";
    if (systolic <= 139 || diastolic <= 89) return "bg-yellow-100 text-yellow-800";
    if (systolic <= 159 || diastolic <= 99) return "bg-orange-100 text-orange-800";
    return "bg-red-100 text-red-800";
  };

  const getStatusLabel = (systolic: number, diastolic: number) => {
    if (systolic < 90 || diastolic < 60) return "Baixa";
    if (systolic <= 120 && diastolic <= 80) return "Normal";
    if (systolic <= 139 || diastolic <= 89) return "Pré-hipertensão";
    if (systolic <= 159 || diastolic <= 99) return "Hipertensão 1";
    return "Hipertensão 2";
  };

  const isLoading_any = addPressureReadingMutation.isPending || updatePressureReadingMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const renderOverviewContent = () => {
    const recentReadings = Array.isArray(pressureReadings) ? pressureReadings.slice(0, 5) : [];

    return (
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Heart className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{pressureReadings.length}</div>
              <p className="text-xs text-muted-foreground">medições</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Normais</CardTitle>
              <Heart className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {Array.isArray(pressureReadings) ? pressureReadings.filter((r: BloodPressureReading) => r.systolic <= 120 && r.diastolic <= 80).length : 0}
              </div>
              <p className="text-xs text-muted-foreground">medições</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Alteradas</CardTitle>
              <Heart className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {Array.isArray(pressureReadings) ? pressureReadings.filter((r: BloodPressureReading) => r.systolic > 120 || r.diastolic > 80).length : 0}
              </div>
              <p className="text-xs text-muted-foreground">medições</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Readings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-red-600" />
              Medições Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentReadings.length === 0 ? (
              <div className="text-center py-8">
                <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Nenhuma medição encontrada</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentReadings.map((reading: BloodPressureReading) => (
                  <div key={reading.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <Heart className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-lg">{reading.systolic}/{reading.diastolic} mmHg</span>
                          <Badge className={getStatusColor(reading.systolic, reading.diastolic)}>
                            {getStatusLabel(reading.systolic, reading.diastolic)}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">Pulso: {reading.heartRate} bpm</p>
                        <p className="text-xs text-gray-500">
                          {(() => {
                            try {
                              if (reading.measuredAt) {
                                const date = new Date(reading.measuredAt);
                                if (!isNaN(date.getTime())) {
                                  return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
                                }
                              }
                              return "Data inválida";
                            } catch (error) {
                              return "Data inválida";
                            }
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderReadingsContent = () => {
    return (
      <div className="space-y-6">
        {/* Search and Actions */}
        <div className="flex justify-between items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Buscar por valores..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <Button
            onClick={() => setShowAddForm(true)}
            disabled={showAddForm || editingId !== null}
            className="bg-red-600 hover:bg-red-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Medição
          </Button>
        </div>

        {/* Add/Edit Form */}
        {showAddForm && (
          <Card>
            <CardHeader>
              <CardTitle>{editingId ? "Editar Medição" : "Nova Medição"}</CardTitle>
              <CardDescription>
                {editingId ? "Atualize os dados da medição" : "Adicione uma nova medição de pressão arterial"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <ValidatedInput
                    label="Sistólica (mmHg)"
                    placeholder="Ex: 120"
                    value={formData.systolic}
                    onChange={(e) => updateField("systolic", e.target.value)}
                    error={errors.systolic}
                    type="number"
                    min="60"
                    max="250"
                    required
                  />
                  <ValidatedInput
                    label="Diastólica (mmHg)"
                    placeholder="Ex: 80"
                    value={formData.diastolic}
                    onChange={(e) => updateField("diastolic", e.target.value)}
                    error={errors.diastolic}
                    type="number"
                    min="40"
                    max="150"
                    required
                  />
                  <ValidatedInput
                    label="Pulso (bpm)"
                    placeholder="Ex: 72"
                    value={formData.heartRate}
                    onChange={(e) => updateField("heartRate", e.target.value)}
                    error={errors.heartRate}
                    type="number"
                    min="30"
                    max="250"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ValidatedInput
                    label="Data e hora da medição"
                    type="datetime-local"
                    value={formData.measuredAt}
                    onChange={(e) => updateField("measuredAt", e.target.value)}
                    error={errors.measuredAt}
                    required
                  />
                  <ValidatedTextarea
                    label="Observações"
                    placeholder="Observações sobre a medição..."
                    value={formData.notes}
                    onChange={(e) => updateField("notes", e.target.value)}
                    error={errors.notes}
                    rows={3}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingId(null);
                      resetForm();
                    }}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading_any}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {isLoading_any ? (
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
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Readings List */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Medições</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredReadings.length === 0 ? (
              <div className="text-center py-8">
                <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Nenhuma medição encontrada</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredReadings.map((reading: BloodPressureReading) => (
                  <div key={reading.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <Heart className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-lg">{reading.systolic}/{reading.diastolic} mmHg</span>
                          <Badge className={getStatusColor(reading.systolic, reading.diastolic)}>
                            {getStatusLabel(reading.systolic, reading.diastolic)}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">Pulso: {reading.heartRate} bpm</p>
                        <p className="text-xs text-gray-500">
                          {(() => {
                            try {
                              if (reading.measuredAt) {
                                const date = new Date(reading.measuredAt);
                                if (!isNaN(date.getTime())) {
                                  return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
                                }
                              }
                              return "Data inválida";
                            } catch (error) {
                              return "Data inválida";
                            }
                          })()}
                        </p>
                        {reading.notes && (
                          <p className="text-xs text-gray-500 mt-1">{reading.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(reading)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(reading)}
                        disabled={deletingReadingId === reading.id}
                        className="text-red-600 hover:text-red-700"
                      >
                        {deletingReadingId === reading.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="flex h-16 items-center px-4 gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/vital-signs")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Pressão Arterial</h1>
            <p className="text-sm text-muted-foreground">
              Monitore sua pressão arterial
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-4 p-4">
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="readings">Medições</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-4">
            {renderOverviewContent()}
          </TabsContent>
          <TabsContent value="readings" className="space-y-4">
            {renderReadingsContent()}
          </TabsContent>
        </Tabs>
      </div>

      <DeleteConfirmationModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirm={confirmDelete}
        title="Excluir Medição"
        description={<>Tem certeza que deseja excluir a medição <strong>{readingToDeleteName}</strong>?</>}
        loading={deletingReadingId !== null}
      />
    </div>
  );
}

export default PressureDesktop;