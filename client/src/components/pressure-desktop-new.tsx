import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Heart, Calendar, Clock, Save, X, Trash2, ArrowLeft, BarChart3, Activity } from "lucide-react";
import DeleteConfirmationModal from "@/components/delete-confirmation-modal";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useFormValidation, ValidationRules } from "@/hooks/use-form-validation";
import { ValidatedInput, ValidatedTextarea } from "@/components/ui/validated-input";

interface BloodPressureReading {
  id: number;
  systolic: number;
  diastolic: number;
  heartRate: number;
  notes?: string;
  reading_date: string;
}

export default function PressureDesktop() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<'overview' | 'pressure' | 'glucose' | 'heart-rate' | 'temperature' | 'weight'>('pressure');
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
    reading_date: { required: true },
  };

  const { formData, errors, updateField, resetForm, validateForm } = useFormValidation(
    {
      systolic: "",
      diastolic: "",
      heartRate: "",
      notes: "",
      reading_date: (() => {
        const nowUTC = new Date();
        const nowLocal = new Date(nowUTC.getTime() - nowUTC.getTimezoneOffset() * 60000);
        return nowLocal.toISOString().slice(0, 16);
      })(),
    },
    validationRules
  );

  const { data: pressureReadings, isLoading } = useQuery({
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

  const filteredReadings = Array.isArray(pressureReadings) ? pressureReadings.filter((reading: BloodPressureReading) =>
    reading.systolic.toString().includes(searchTerm) ||
    reading.diastolic.toString().includes(searchTerm) ||
    reading.heartRate.toString().includes(searchTerm) ||
    (reading.notes && reading.notes.toLowerCase().includes(searchTerm.toLowerCase()))
  ) : [];

  const addReadingMutation = useMutation({
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
      setShowAddForm(false);
      resetForm();
      toast({
        title: "Medição adicionada",
        description: "A medição foi adicionada com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao adicionar medição. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const updateReadingMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
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
      setShowAddForm(false);
      setEditingId(null);
      resetForm();
      toast({
        title: "Medição atualizada",
        description: "A medição foi atualizada com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar medição. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteReadingMutation = useMutation({
    mutationFn: async (id: number) => {
      setDeletingReadingId(id);
      const response = await apiRequest({
        url: `/api/vital-signs/blood-pressure/${id}`,
        method: "DELETE",
        on401: "throw"
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vital-signs/blood-pressure"] });
      setDeleteModalOpen(false);
      setReadingToDelete(null);
      setReadingToDeleteName("");
      setTimeout(() => {
        setDeletingReadingId(null);
      }, 1500);
      toast({
        title: "Medição excluída",
        description: "A medição foi excluída com sucesso.",
      });
    },
    onError: () => {
      setDeletingReadingId(null);
      toast({
        title: "Erro",
        description: "Erro ao excluir medição. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const { isValid } = validateForm();
    if (!isValid) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    if (editingId) {
      updateReadingMutation.mutate({ id: editingId, ...formData });
    } else {
      addReadingMutation.mutate(formData);
    }
  };

  const handleEdit = (reading: BloodPressureReading) => {
    setEditingId(reading.id);
    const readingDate = new Date(reading.reading_date);
    const formattedDate = readingDate.toISOString().slice(0, 16);
    
    updateField('systolic', reading.systolic.toString());
    updateField('diastolic', reading.diastolic.toString());
    updateField('heartRate', reading.heartRate.toString());
    updateField('reading_date', formattedDate);
    updateField('notes', reading.notes || '');
    
    setShowAddForm(true);
  };

  const handleDelete = (reading: BloodPressureReading) => {
    setReadingToDelete(reading.id);
    setReadingToDeleteName(`${reading.systolic}/${reading.diastolic} mmHg`);
    setDeleteModalOpen(true);
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingId(null);
    resetForm();
  };

  const confirmDelete = () => {
    if (readingToDelete) {
      deleteReadingMutation.mutate(readingToDelete);
    }
  };

  const renderOverviewContent = () => {
    const normalReadings = Array.isArray(pressureReadings) ? pressureReadings.filter((r: BloodPressureReading) => r.systolic <= 120 && r.diastolic <= 80) : [];
    const highReadings = Array.isArray(pressureReadings) ? pressureReadings.filter((r: BloodPressureReading) => r.systolic > 120 || r.diastolic > 80) : [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total de Medições</p>
                  <p className="text-2xl font-bold text-red-600">{Array.isArray(pressureReadings) ? pressureReadings.length : 0}</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-red-100 flex items-center justify-center">
                  <Heart className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Normais</p>
                  <p className="text-2xl font-bold text-green-600">{normalReadings.length}</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <Heart className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Alteradas</p>
                  <p className="text-2xl font-bold text-orange-600">{highReadings.length}</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Heart className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Última Medição</p>
                  <p className="text-xs text-gray-500">
                    {Array.isArray(pressureReadings) && pressureReadings.length > 0
                      ? format(new Date(pressureReadings[0].reading_date), "dd/MM/yyyy", { locale: ptBR })
                      : "Nenhuma"}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-red-600" />
                Ações Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                className="w-full justify-start gap-2 bg-red-600 hover:bg-red-700" 
                onClick={() => setShowAddForm(true)}
              >
                <Heart className="h-4 w-4" />
                Adicionar Nova Medição
              </Button>
              <Button 
                className="w-full justify-start gap-2" 
                variant="outline"
                onClick={() => navigate('/vital-signs/glucose')}
              >
                <Activity className="h-4 w-4" />
                Ver Glicemia
              </Button>
              <Button 
                className="w-full justify-start gap-2" 
                variant="outline"
                onClick={() => navigate('/reports')}
              >
                <BarChart3 className="h-4 w-4" />
                Ver Relatórios
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-red-600" />
                Últimas Medições
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.isArray(pressureReadings) && pressureReadings.slice(0, 5).map((reading: BloodPressureReading) => (
                  <div key={reading.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <Heart className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <div className="font-semibold">{reading.systolic}/{reading.diastolic} mmHg</div>
                        <div className="text-sm text-gray-600">{reading.heartRate} bpm</div>
                        <div className="text-xs text-gray-500">
                          {format(new Date(reading.reading_date), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                      </div>
                    </div>
                    <Badge variant={reading.systolic > 120 || reading.diastolic > 80 ? "destructive" : "secondary"}>
                      {reading.systolic > 120 || reading.diastolic > 80 ? "Alterada" : "Normal"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const renderReadingsContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="h-8 w-16 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Add/Edit Form */}
        {showAddForm && (
          <Card>
            <CardHeader>
              <CardTitle>{editingId ? "Editar Medição" : "Nova Medição"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <ValidatedInput
                    label="Sistólica (mmHg)"
                    type="number"
                    value={formData.systolic}
                    onChange={(e) => updateField('systolic', e.target.value)}
                    error={errors.systolic}
                    required
                  />
                  <ValidatedInput
                    label="Diastólica (mmHg)"
                    type="number"
                    value={formData.diastolic}
                    onChange={(e) => updateField('diastolic', e.target.value)}
                    error={errors.diastolic}
                    required
                  />
                  <ValidatedInput
                    label="Batimentos/min"
                    type="number"
                    value={formData.heartRate}
                    onChange={(e) => updateField('heartRate', e.target.value)}
                    error={errors.heartRate}
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ValidatedInput
                    label="Data e hora da medição"
                    type="datetime-local"
                    value={formData.reading_date}
                    onChange={(e) => updateField('reading_date', e.target.value)}
                    error={errors.reading_date}
                    required
                  />
                  <ValidatedTextarea
                    label="Observações"
                    value={formData.notes}
                    onChange={(e) => updateField('notes', e.target.value)}
                    error={errors.notes}
                    placeholder="Observações sobre a medição (opcional)"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-red-600 hover:bg-red-700">
                    {editingId ? "Salvar Alterações" : "Salvar Medição"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Readings List */}
        <Card>
          <CardHeader>
            <CardTitle>Medições de Pressão Arterial</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredReadings.length === 0 ? (
              <div className="text-center py-8">
                <Heart className="mx-auto h-12 w-12 text-gray-400 mb-4" />
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
                        <div className="font-semibold">
                          {reading.systolic}/{reading.diastolic} mmHg
                        </div>
                        <div className="text-sm text-gray-600">
                          {reading.heartRate} bpm
                        </div>
                        <div className="text-xs text-gray-500">
                          {format(new Date(reading.reading_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </div>
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
    <div className="h-full flex flex-col bg-gray-50">
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="h-full flex flex-col">
          <div className="border-b border-gray-200 px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <TabsList className="h-12">
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Visão Geral
                </TabsTrigger>
                <TabsTrigger value="readings" className="flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  Medições
                </TabsTrigger>
              </TabsList>

              {activeTab === 'pressure' && (
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Pesquisar medições..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-80"
                    />
                  </div>
                  <Button 
                    onClick={() => setShowAddForm(true)} 
                    disabled={showAddForm || editingId !== null}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Medição
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <TabsContent value="overview" className="h-full m-0">
              <div className="p-6">
                {renderOverviewContent()}
              </div>
            </TabsContent>
            
            <TabsContent value="pressure" className="h-full m-0">
              <div className="p-6">
                {renderReadingsContent()}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        itemName={readingToDeleteName}
        itemType="medição"
      />
    </div>
  );
}