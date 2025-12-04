import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, Thermometer, ArrowLeft, Save, Trash2 } from "lucide-react";
import BottomNavigation from "@/components/bottom-navigation";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMedicalQueries } from "@/hooks/use-medical-queries";
import { usePatientRequired } from "@/hooks/use-patient-required";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useLocation } from "wouter";
import DeleteConfirmationModal from "@/components/delete-confirmation-modal";
import { useFormValidation, ValidationRules } from "@/hooks/use-form-validation";
import { ValidatedInput, ValidatedTextarea, ValidatedSelect } from "@/components/ui/validated-input";
import VitalSignsDesktopUnified from "@/components/vital-signs-desktop-unified";

export default function TemperaturePage() {
  const isMobile = useIsMobile();
  const { shouldShowPage, isRedirecting } = usePatientRequired();
  const [, navigate] = useLocation();

  // Se está redirecionando ou não deve mostrar a página
  if (isRedirecting || !shouldShowPage) {
    return null;
  }

  // Return desktop version if not mobile
  if (!isMobile) {
    return <VitalSignsDesktopUnified />;
  }
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { enableMedicalQueries } = useMedicalQueries();

  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingReading, setEditingReading] = useState<any>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [readingToDelete, setReadingToDelete] = useState<number | null>(null);
  const [readingToDeleteName, setReadingToDeleteName] = useState<string>("");
  const [deletingReadingId, setDeletingReadingId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  // Form validation rules
  const validationRules: ValidationRules = {
    temperature: { 
      required: true, 
      min: 25, 
      max: 50,
      custom: (value) => {
        const num = Number(value);
        if (isNaN(num)) return "Temperatura deve ser um número válido";
        return null;
      }
    },
    measurementMethod: { required: true },
    measuredAt: { 
      required: true,
      custom: (value) => {
        if (!value || value.trim() === '') return "Data e hora da medição é obrigatório";
        return null;
      }
    }
  };

  const { formData, errors, validateForm, updateField, resetForm: resetValidatedForm } = useFormValidation({
    temperature: "",
    measurementMethod: "oral",
    notes: "",
    measuredAt: (() => {
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      return now.toISOString().slice(0, 16);
    })()
  }, validationRules);

  // Fetch temperature readings
  const { data: readings = [], isLoading } = useQuery({
    queryKey: ["/api/vital-signs/temperature"],
    enabled: enableMedicalQueries,
  });

  // Add reading mutation
  const addReadingMutation = useMutation({
    mutationFn: async (readingData: any) => {
      const response = await apiRequest({
        url: "/api/vital-signs/temperature",
        method: "POST",
        data: readingData,
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
      
      // Fechar formulário apenas após a lista ser atualizada
      setShowAddForm(false);
      resetForm();
      
      toast({
        title: "Sucesso",
        description: "Medição de temperatura adicionada com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao adicionar medição de temperatura. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Edit reading mutation
  const editReadingMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      const response = await apiRequest({
        url: `/api/vital-signs/temperature/${id}`,
        method: "PUT",
        data,
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
      
      // Fechar formulário apenas após a lista ser atualizada
      setShowAddForm(false);
      setEditingReading(null);
      resetForm();
      
      toast({
        title: "Sucesso",
        description: "Medição de temperatura atualizada com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar medição de temperatura. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Delete reading mutation
  const deleteReadingMutation = useMutation({
    mutationFn: async (id: number) => {
      setDeletingReadingId(id);
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
      setReadingToDelete(null);
      setReadingToDeleteName("");
      
      setTimeout(() => {
        setDeletingReadingId(null);
      }, 1000);
      
      toast({
        title: "Sucesso",
        description: "Medição de temperatura removida com sucesso.",
      });
    },
    onError: () => {
      setDeletingReadingId(null);
      setDeleteModalOpen(false);
      setReadingToDelete(null);
      setReadingToDeleteName("");
      toast({
        title: "Erro",
        description: "Erro ao remover medição de temperatura. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    resetValidatedForm({
      temperature: "",
      measurementMethod: "oral",
      notes: "",
      measuredAt: now.toISOString().slice(0, 16)
    });
  };

  const handleEdit = (reading: any) => {
    setEditingReading(reading);
    updateField('temperature', reading.temperature.toString());
    updateField('measurementMethod', reading.measurementMethod || "oral");
    updateField('notes', reading.notes || "");
    
    // Preservar a data original sem conversão de timezone
    let formattedDate = '';
    try {
      const dateValue = reading.measuredAt;
      if (dateValue) {
        const dateStr = dateValue.toString();
        if (dateStr.includes('T')) {
          formattedDate = dateStr.substring(0, 16);
        } else {
          const date = new Date(dateValue);
          if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`;
          } else {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`;
          }
        }
      } else {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`;
      }
    } catch (error) {
      
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    
    updateField('measuredAt', formattedDate);
    setShowAddForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const { isValid, errorCount } = validateForm();
    
    if (!isValid) {
      toast({
        title: "Erro de validação",
        description: `Por favor, corrija ${errorCount} ${errorCount === 1 ? 'campo' : 'campos'} obrigatório${errorCount === 1 ? '' : 's'}.`,
        variant: "destructive",
      });
      return;
    }

    const readingData = {
      temperature: parseFloat(formData.temperature),
      measurementMethod: formData.measurementMethod,
      notes: formData.notes,
      measuredAt: formData.measuredAt + (formData.measuredAt.includes(':') ? ':00' : 'T12:00:00'),
    };

    if (editingReading) {
      editReadingMutation.mutate({ id: editingReading.id, data: readingData });
    } else {
      addReadingMutation.mutate(readingData);
    }
  };

  const handleDeleteClick = (id: number, temperature: string) => {
    setReadingToDelete(id);
    setReadingToDeleteName(`${temperature}°C`);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (readingToDelete) {
      deleteReadingMutation.mutate(readingToDelete);
      // Não fechar o modal aqui - será fechado no onSuccess da mutation
    }
  };

  // Filter readings based on search term
  const filteredReadings = (readings as any[]).filter((reading: any) =>
    reading.temperature?.toString().includes(searchTerm) ||
    reading.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    format(new Date(reading.measuredAt), "dd/MM/yyyy HH:mm", { locale: ptBR }).includes(searchTerm)
  );

  // Pagination logic
  const totalItems = filteredReadings.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedReadings = filteredReadings.slice(startIndex, endIndex);

  // Reset page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const getTemperatureStatus = (temp: number) => {
    if (temp < 35.0) return { status: "Hipotermia", color: "text-blue-600" };
    if (temp >= 35.0 && temp <= 37.5) return { status: "Normal", color: "text-green-600" };
    if (temp > 37.5 && temp <= 39.0) return { status: "Febre baixa", color: "text-yellow-600" };
    if (temp > 39.0) return { status: "Febre alta", color: "text-red-600" };
    return { status: "Normal", color: "text-green-600" };
  };

  if (isLoading) {
    return (
      <div className="mobile-container bg-gray-50">
        <div className="max-w-md mx-auto flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-container">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/home")}
              className="mr-3"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-slate-800">Temperatura</h1>
              <p className="text-sm text-slate-500">Monitore sua temperatura corporal</p>
            </div>
          </div>
          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
            <Thermometer className="w-5 h-5 text-orange-600" />
          </div>
        </div>
      </header>

      <main className="pb-36">
        {/* Add Form */}
        {showAddForm && (
          <Card className="m-4 mt-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingReading(null);
                    resetForm();
                  }}
                  className="mr-3"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                {editingReading ? "Editar Medição" : "Nova Medição"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <ValidatedInput
                  id="temperature"
                  label="Temperatura (°C)"
                  type="number"
                  step="0.1"
                  value={formData.temperature}
                  onChange={(e) => updateField('temperature', e.target.value)}
                  placeholder="36.5"
                  required
                  error={errors.temperature}
                />

                <ValidatedSelect
                  id="measurementMethod"
                  label="Método de Medição"
                  value={formData.measurementMethod}
                  onValueChange={(value) => updateField('measurementMethod', value)}
                  placeholder="Selecione o método"
                  required
                  error={errors.measurementMethod}
                  options={[
                    { value: "oral", label: "Oral" },
                    { value: "armpit", label: "Axilar" },
                    { value: "forehead", label: "Testa" },
                    { value: "ear", label: "Ouvido" }
                  ]}
                />

                <ValidatedInput
                  id="measuredAt"
                  label="Data e Hora da Medição"
                  type="datetime-local"
                  value={formData.measuredAt}
                  onChange={(e) => updateField('measuredAt', e.target.value)}
                  required
                  error={errors.measuredAt}
                />

                <ValidatedTextarea
                  id="notes"
                  label="Observações"
                  value={formData.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  placeholder="Ex: Febre, sintomas, medicamento tomado, etc."
                  rows={3}
                  error={errors.notes}
                />

                <div className="flex gap-3">
                  <Button type="submit" disabled={addReadingMutation.isPending || editReadingMutation.isPending} className="flex-1 bg-orange-600 hover:bg-orange-700 text-white">
                    {(addReadingMutation.isPending || editReadingMutation.isPending) ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {editingReading ? "Atualizar Medição" : "Salvar Medição"}
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingReading(null);
                      resetForm();
                    }}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Show content only when form is NOT open */}
        {!showAddForm && (
          <>
            {/* Search and Add Button */}
            <div className="flex gap-3 m-4 mt-6 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Buscar medições..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button 
                size="default" 
                onClick={() => setShowAddForm(true)}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nova
              </Button>
            </div>

            {/* Readings List */}
            <div className="space-y-4 m-4">
              {filteredReadings.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Thermometer className="w-8 h-8 text-orange-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">
                      {searchTerm ? "Nenhuma medição encontrada" : "Nenhuma medição cadastrada"}
                    </h3>
                    <p className="text-slate-600 mb-4">
                      {searchTerm 
                        ? "Tente buscar com outros termos"
                        : "Adicione sua primeira medição de temperatura"
                      }
                    </p>
                    {!searchTerm && (
                      <Button 
                        onClick={() => setShowAddForm(true)}
                        className="bg-orange-600 hover:bg-orange-700 text-white"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Medição
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <>
                  {paginatedReadings.map((reading: any) => {
                  const tempStatus = getTemperatureStatus(reading.temperature);
                  return (
                    <Card key={reading.id} className="shadow-md hover:shadow-lg transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div 
                            className="flex items-center space-x-3 flex-1 cursor-pointer"
                            onClick={() => handleEdit(reading)}
                          >
                            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                              <Thermometer className="w-6 h-6 text-orange-600" />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="text-xl font-semibold text-slate-800">
                                  {reading.temperature}°C
                                </span>
                                <span className={`text-sm font-medium ${tempStatus.color}`}>
                                  {tempStatus.status}
                                </span>
                                {reading.medicalEvolutionId && (
                                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                                    Evolução Nº {reading.medicalEvolutionId}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-slate-500">
                                {(() => {
                                  try {
                                    const dateValue = reading.measuredAt;
                                    if (!dateValue) return "Data não disponível";
                                    
                                    const dateStr = dateValue.toString();
                                    if (dateStr.includes('T')) {
                                      const [datePart, timePart] = dateStr.split('T');
                                      const [year, month, day] = datePart.split('-');
                                      const [hour, minute] = timePart.substring(0, 5).split(':');
                                      return `${day}/${month}/${year} às ${hour}:${minute}`;
                                    } else {
                                      const date = new Date(dateValue);
                                      if (isNaN(date.getTime())) return "Data inválida";
                                      return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
                                    }
                                  } catch (error) {
                                    return "Data inválida";
                                  }
                                })()}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(reading.id, reading.temperature);
                            }}
                            disabled={deletingReadingId === reading.id}
                            className="text-slate-400 hover:text-red-600"
                          >
                            {deletingReadingId === reading.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </div>

                        {reading.notes && (
                          <div 
                            className="mt-3 p-3 bg-slate-50 rounded-lg cursor-pointer"
                            onClick={() => handleEdit(reading)}
                          >
                            <p className="text-sm text-slate-700">{reading.notes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                  })}

                  {/* Pagination Controls */}
                  <div className="flex flex-row gap-4 items-center justify-between bg-slate-50 p-4 rounded-lg mt-6">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-600 hidden sm:block">
                        Itens por página:
                      </span>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="border border-slate-300 rounded px-2 py-1 text-sm"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1 || totalPages === 0}
                      >
                        Anterior
                      </Button>
                      
                      <span className="text-sm text-slate-600">
                        {totalPages === 0 ? "0 de 0" : `${currentPage} de ${totalPages}`}
                      </span>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages || totalPages === 0}
                      >
                        Próxima
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </main>

      <BottomNavigation />
      <DeleteConfirmationModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Excluir medição de temperatura"
        description={
          <>
            Tem certeza que deseja excluir a medição de temperatura "<strong>{readingToDeleteName}</strong>"? Esta ação não pode ser desfeita.
          </>
        }
        onConfirm={handleConfirmDelete}
        loading={deleteReadingMutation.isPending}
      />
    </div>
  );
}