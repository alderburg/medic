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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Droplets, Calendar, Clock, Save, X, Trash2, ArrowLeft, BarChart3, Activity } from "lucide-react";
import DeleteConfirmationModal from "@/components/delete-confirmation-modal";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useFormValidation, ValidationRules } from "@/hooks/use-form-validation";
import { ValidatedInput, ValidatedSelect, ValidatedTextarea } from "@/components/ui/validated-input";

interface GlucoseReading {
  id: number;
  value: number;
  period: string;
  notes?: string;
  reading_date: string;
}

export default function GlucoseDesktop() {
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
    value: { required: true, min: 50, max: 600 },
    period: { required: true },
    reading_date: { required: true },
  };

  const { formData, errors, updateField, resetForm, validateForm } = useFormValidation(
    {
      value: "",
      period: "",
      notes: "",
      reading_date: (() => {
        const nowUTC = new Date();
        const nowBrasil = new Date(nowUTC.getTime() - (3 * 60 * 60 * 1000));
        return nowBrasil.toISOString().slice(0, 16);
      })(),
    },
    validationRules
  );

  const { data: glucoseReadings = [], isLoading } = useQuery({
    queryKey: ["/api/vital-signs/glucose"],
  });

  const addGlucoseReadingMutation = useMutation({
    mutationFn: (data: any) => apiRequest({ url: "/api/vital-signs/glucose", method: "POST", data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vital-signs/glucose"] });
      toast({ title: "Sucesso", description: "Glicemia cadastrada com sucesso!" });
      resetForm();
      setShowAddForm(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao cadastrar glicemia",
        variant: "destructive",
      });
    },
  });

  const updateGlucoseReadingMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest({ url: `/api/vital-signs/glucose/${id}`, method: "PUT", data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vital-signs/glucose"] });
      toast({ title: "Sucesso", description: "Glicemia atualizada com sucesso!" });
      resetForm();
      setEditingId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar glicemia",
        variant: "destructive",
      });
    },
  });

  const deleteGlucoseReadingMutation = useMutation({
    mutationFn: (id: number) => apiRequest({ url: `/api/vital-signs/glucose/${id}`, method: "DELETE" }),
    onSuccess: async () => {
      // Aguardar a invalidação e refetch das queries
      await queryClient.invalidateQueries({ queryKey: ["/api/vital-signs/glucose"] });
      await queryClient.refetchQueries({ queryKey: ["/api/vital-signs/glucose"] });
      
      // Aguardar um delay para garantir que a lista foi atualizada
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Fechar modal apenas após a lista ser atualizada
      setDeleteModalOpen(false);
      setReadingToDelete(null);
      setReadingToDeleteName("");
      
      setTimeout(() => {
        setDeletingReadingId(null);
      }, 1500);
      
      toast({ title: "Sucesso", description: "Glicemia excluída com sucesso!" });
    },
    onError: (error: any) => {
      setDeletingReadingId(null);
      setDeleteModalOpen(false);
      setReadingToDelete(null);
      setReadingToDeleteName("");
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir glicemia",
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
      value: parseFloat(formData.value),
      period: formData.period,
      notes: formData.notes || null,
      reading_date: formData.reading_date,
    };

    if (editingId) {
      updateGlucoseReadingMutation.mutate({ id: editingId, data: submitData });
    } else {
      addGlucoseReadingMutation.mutate(submitData);
    }
  };

  const handleEdit = (reading: GlucoseReading) => {
    const date = new Date(reading.reading_date);
    const formattedDate = format(date, "yyyy-MM-dd'T'HH:mm");
    
    resetForm({
      value: reading.value.toString(),
      period: reading.period,
      notes: reading.notes || "",
      reading_date: formattedDate,
    });
    setEditingId(reading.id);
    setShowAddForm(true);
  };

  const handleDelete = (reading: GlucoseReading) => {
    setReadingToDelete(reading.id);
    setReadingToDeleteName(`${reading.value} mg/dL`);
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (readingToDelete) {
      setDeletingReadingId(readingToDelete);
      deleteGlucoseReadingMutation.mutate(readingToDelete);
    }
  };

  const filteredReadings = Array.isArray(glucoseReadings) ? glucoseReadings.filter((reading: GlucoseReading) =>
    reading.value.toString().includes(searchTerm) ||
    reading.period.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const getStatusColor = (value: number) => {
    if (value < 70) return "bg-red-100 text-red-800";
    if (value >= 70 && value <= 100) return "bg-green-100 text-green-800";
    if (value > 100 && value <= 140) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const getStatusLabel = (value: number) => {
    if (value < 70) return "Baixo";
    if (value >= 70 && value <= 100) return "Normal";
    if (value > 100 && value <= 140) return "Alto";
    return "Muito Alto";
  };

  const isLoading_any = addGlucoseReadingMutation.isPending || updateGlucoseReadingMutation.isPending;

  const renderOverviewContent = () => {
    return (
      <div className="space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Droplets className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{filteredReadings.length}</div>
              <p className="text-xs text-muted-foreground">medições</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Normais</CardTitle>
              <Droplets className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {Array.isArray(glucoseReadings) ? glucoseReadings.filter((r: GlucoseReading) => r.value >= 70 && r.value <= 100).length : 0}
              </div>
              <p className="text-xs text-muted-foreground">medições</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Alteradas</CardTitle>
              <Droplets className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {Array.isArray(glucoseReadings) ? glucoseReadings.filter((r: GlucoseReading) => r.value < 70 || r.value > 100).length : 0}
              </div>
              <p className="text-xs text-muted-foreground">medições</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Readings */}
        <Card>
          <CardHeader>
            <CardTitle>Medições Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {Array.isArray(glucoseReadings) && glucoseReadings.length > 0 ? (
              <div className="space-y-3">
                {glucoseReadings.slice(0, 5).map((reading: GlucoseReading) => (
                  <div key={reading.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Droplets className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{reading.value} mg/dL</span>
                          <Badge className={getStatusColor(reading.value)}>
                            {getStatusLabel(reading.value)}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          {format(new Date(reading.reading_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Droplets className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Nenhuma medição encontrada</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderReadingsContent = () => {
    if (showAddForm) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Editar Medição" : "Nova Medição"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ValidatedInput
                  label="Valor (mg/dL)"
                  placeholder="Ex: 120"
                  value={formData.value}
                  onChange={(e) => updateField("value", e.target.value)}
                  error={errors.value}
                  type="number"
                  min="50"
                  max="600"
                  required
                />
                <ValidatedSelect
                  label="Período"
                  placeholder="Selecione o período"
                  value={formData.period}
                  onValueChange={(value) => updateField("period", value)}
                  error={errors.period}
                  required
                >
                  <SelectItem value="fasting">Jejum</SelectItem>
                  <SelectItem value="pre_meal">Pré-refeição</SelectItem>
                  <SelectItem value="post_meal">Pós-refeição</SelectItem>
                  <SelectItem value="bedtime">Antes de dormir</SelectItem>
                  <SelectItem value="random">Aleatória</SelectItem>
                </ValidatedSelect>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ValidatedInput
                  label="Data e hora da medição"
                  type="datetime-local"
                  value={formData.reading_date}
                  onChange={(e) => updateField("reading_date", e.target.value)}
                  error={errors.reading_date}
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
                  className="bg-blue-600 hover:bg-blue-700"
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
      );
    }

    return (
      <div className="space-y-6">
        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar medições..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-80"
              />
            </div>
          </div>
          <Button
            onClick={() => setShowAddForm(true)}
            disabled={showAddForm || editingId !== null}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Medição
          </Button>
        </div>

        {/* Readings List */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Medições</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg animate-pulse">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                        <div className="h-3 bg-gray-200 rounded w-32"></div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <div className="h-8 bg-gray-200 rounded w-16"></div>
                      <div className="h-8 bg-gray-200 rounded w-16"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredReadings.length === 0 ? (
              <div className="text-center py-8">
                <Droplets className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Nenhuma medição encontrada</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredReadings.map((reading: GlucoseReading) => (
                  <div key={reading.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Droplets className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-lg">{reading.value} mg/dL</span>
                          <Badge className={getStatusColor(reading.value)}>
                            {getStatusLabel(reading.value)}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          {reading.period === "fasting" && "Jejum"}
                          {reading.period === "pre_meal" && "Pré-refeição"}
                          {reading.period === "post_meal" && "Pós-refeição"}
                          {reading.period === "bedtime" && "Antes de dormir"}
                          {reading.period === "random" && "Aleatória"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(reading.reading_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
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
                        className="text-blue-600 hover:text-blue-700"
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
                  <Droplets className="h-4 w-4" />
                  Medições
                </TabsTrigger>
              </TabsList>

              {activeTab === 'readings' && (
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
                    className="bg-blue-600 hover:bg-blue-700"
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
            
            <TabsContent value="readings" className="h-full m-0">
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
        onOpenChange={setDeleteModalOpen}
        onConfirm={confirmDelete}
        title="Excluir Medição"
        description={<>Tem certeza que deseja excluir a medição <strong>{readingToDeleteName}</strong>?</>}
        loading={deletingReadingId !== null}
      />
    </div>
  );
}