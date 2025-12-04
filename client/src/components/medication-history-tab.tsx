import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { History, Clock, CheckCircle, Trash2, Edit2, Search, Filter, ArrowLeft, AlertTriangle, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { formatDate, formatTime } from "@/lib/utils";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useFormValidation, ValidationRules } from "@/hooks/use-form-validation";
import { ValidatedTextarea } from "@/components/ui/validated-input";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { usePatient } from "@/contexts/patient-context";
import { useMedicalQueries } from "@/hooks/use-medical-queries";

interface MedicationHistory {
  id: number;
  medicationId: number;
  scheduledDateTime: string;
  actualDateTime?: string;
  notes?: string;
  sideEffects?: string;
  effectiveness?: string;
  symptoms?: string;
  additionalInfo?: string;
  createdAt: string;
  medication: {
    id: number;
    name: string;
    dosage: string;
  };
}

interface MedicationHistoryTabProps {
  searchTerm: string;
  filter: 'all' | 'taken' | 'missed';
  dateFilter: string;
  customStartDate: string;
  customEndDate: string;
  onSearchChange: (value: string) => void;
  onFilterChange: (value: 'all' | 'taken' | 'missed') => void;
}

// Funções para corrigir timezone especificamente no histórico
const formatHistoryTime = (dateTime: string) => {
  const date = new Date(dateTime);
  // Adicionar 3 horas para corrigir o timezone
  const correctedDate = new Date(date.getTime() + (3 * 60 * 60 * 1000));
  return correctedDate.toLocaleTimeString('pt-BR', { 
    hour: '2-digit', 
    minute: '2-digit'
  });
};

const formatHistoryDate = (dateTime: string) => {
  const date = new Date(dateTime);
  // Adicionar 3 horas para corrigir o timezone
  const correctedDate = new Date(date.getTime() + (3 * 60 * 60 * 1000));
  return correctedDate.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export default function MedicationHistoryTab({ 
  searchTerm, 
  filter, 
  dateFilter,
  customStartDate,
  customEndDate,
  onSearchChange, 
  onFilterChange
}: MedicationHistoryTabProps) {
  const [selectedHistory, setSelectedHistory] = useState<MedicationHistory | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<MedicationHistory>>({});
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { effectivePatientId } = usePatient();
  const { enableMedicalQueries } = useMedicalQueries();

  const { data: history = [], isLoading } = useQuery<MedicationHistory[]>({
    queryKey: ["/api/medication-history", effectivePatientId],
    queryFn: async () => {
      const response = await api.get("/api/medication-history");
      return response.data;
    },
    enabled: enableMedicalQueries,
  });

  const updateHistoryMutation = useMutation({
    mutationFn: (data: { id: number; updates: Partial<MedicationHistory> }) =>
      api.put(`/api/medication-history/${data.id}`, data.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medication-history", effectivePatientId] });
      toast({
        title: "Histórico atualizado",
        description: "As informações foram salvas com sucesso.",
      });
      // Fechar o formulário e voltar para a lista
      setSelectedHistory(null);
      setIsEditing(false);
      setEditForm({});
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    },
  });

  // Função para filtrar por data
  const filterByDate = (entry: MedicationHistory) => {
    const entryDate = new Date(entry.actualDateTime || entry.scheduledDateTime);
    const today = new Date();

    switch (dateFilter) {
      case '7d':
        const sevenDaysAgo = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000));
        return entryDate >= sevenDaysAgo;
      case '30d':
        const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
        return entryDate >= thirtyDaysAgo;
      case '90d':
        const ninetyDaysAgo = new Date(today.getTime() - (90 * 24 * 60 * 60 * 1000));
        return entryDate >= ninetyDaysAgo;
      case 'custom':
        if (!customStartDate && !customEndDate) return true;
        const startDate = customStartDate ? new Date(customStartDate + 'T00:00:00') : null;
        const endDate = customEndDate ? new Date(customEndDate + 'T23:59:59') : null;

        if (startDate && endDate) {
          return entryDate >= startDate && entryDate <= endDate;
        } else if (startDate) {
          return entryDate >= startDate;
        } else if (endDate) {
          return entryDate <= endDate;
        }
        return true;
      default:
        return true;
    }
  };

  const handleCardClick = (entry: MedicationHistory) => {
    setSelectedHistory(entry);
    // Apenas campos editáveis
    const formData = {
      effectiveness: entry.effectiveness || "",
      notes: entry.notes || "",
      sideEffects: entry.sideEffects || "",
      symptoms: entry.symptoms || "",
      additionalInfo: entry.additionalInfo || ""
    };
    setEditForm(formData);

    // Limpar erros de validação
    setValidationErrors({});

    setIsEditing(true); // Ir direto para edição
  };

  const handleSaveEdit = () => {
    if (selectedHistory && editForm) {
      // Para históricos de atraso/antecedência, validar apenas o motivo
      const isDelayOnly = isDelayHistory(selectedHistory);
      const isEarly = isEarlyHistory(selectedHistory);

      if (isDelayOnly || isEarly) {
        // Para históricos de atraso/antecedência, validar apenas se o campo notes está vazio
        if (!editForm.notes || editForm.notes.trim().length < 2) {
          // Definir erro no estado para mostrar vermelho no componente
          setValidationErrors({
            notes: "Motivo é obrigatório"
          });

          toast({
            title: "Erro de validação",
            description: "Por favor, preencha o motivo obrigatório.",
            variant: "destructive",
          });
          return;
        }

        // Usar dados do formulário de edição
        const validatedData = {
          ...editForm
        };

        updateHistoryMutation.mutate({
          id: selectedHistory.id,
          updates: validatedData,
        });
      } else {
        // Para históricos completos, usar validação existente
        updateHistoryMutation.mutate({
          id: selectedHistory.id,
          updates: editForm,
        });
      }
    }
  };

  const handleClose = () => {
    setSelectedHistory(null);
    setIsEditing(false);
    setEditForm({});
    setValidationErrors({});
  };

  const formatDelayTime = (scheduledTime: string, actualTime?: string) => {
    if (!actualTime) return null;

    const scheduled = new Date(scheduledTime);
    const actual = new Date(actualTime);
    const diffMs = actual.getTime() - scheduled.getTime();
    const delayMinutes = Math.floor(diffMs / (1000 * 60));

    if (delayMinutes === 0) return "No horário ✓";

    const absDelay = Math.abs(delayMinutes);
    if (absDelay < 60) {
      return delayMinutes < 0 ? `${absDelay} min adiantado` : `${absDelay} min atraso`;
    }

    const hours = Math.floor(absDelay / 60);
    const minutes = absDelay % 60;
    const timeStr = minutes === 0 ? `${hours}h` : `${hours}h ${minutes}min`;

    return delayMinutes < 0 ? `${timeStr} adiantado` : `${timeStr} atraso`;
  };

  const isDetailedHistory = (entry: MedicationHistory) => {
    return entry.notes || entry.sideEffects || entry.effectiveness || entry.symptoms || entry.additionalInfo;
  };

  // Função para detectar se é um histórico de medicamento atrasado (apenas motivo)
  const isDelayHistory = (entry: MedicationHistory) => {
    // Se não tem medication (histórico adicional de medicamento já tomado), nunca é atraso
    if (!entry.medication) return false;
    
    // É histórico de atraso se tem apenas notes (motivo) e não tem outros campos preenchidos
    return !!(entry.notes && !entry.sideEffects && !entry.symptoms && !entry.additionalInfo && !entry.effectiveness);
  };

  // Função para detectar se foi tomado com antecedência
  const isEarlyHistory = (entry: MedicationHistory) => {
    // Se não tem medication (histórico adicional de medicamento já tomado), nunca é antecipado
    if (!entry.medication) return false;
    
    if (!entry.actualDateTime) return false;
    
    const scheduled = new Date(entry.scheduledDateTime);
    const actual = new Date(entry.actualDateTime);
    const diffMs = actual.getTime() - scheduled.getTime();
    const delayMinutes = Math.floor(diffMs / (1000 * 60));
    
    // Só considera antecipado se foi realmente tomado >60 minutos antes do programado
    // E se tem apenas o campo notes preenchido (indicando motivo da antecedência)
    return delayMinutes < -60 && entry.notes && !entry.sideEffects && !entry.symptoms && !entry.additionalInfo && !entry.effectiveness;
  };



  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-48"></div>
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-32"></div>
                  </div>
                  <div className="h-6 bg-gray-200 rounded animate-pulse w-20"></div>
                </div>
                <div className="h-3 bg-gray-200 rounded animate-pulse w-24"></div>
                <div className="h-3 bg-gray-200 rounded animate-pulse w-full"></div>
                <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-12">
        <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Nenhum Histórico Encontrado
        </h3>
        <p className="text-gray-600 max-w-md mx-auto">
          Quando você marcar medicamentos como tomados e adicionar informações sobre eficácia e efeitos, 
          eles aparecerão aqui no seu histórico.
        </p>
      </div>
    );
  }

  // Se tem histórico selecionado, mostrar formulário de edição
  if (selectedHistory) {
    const isDelayOnly = isDelayHistory(selectedHistory);
    const isEarly = isEarlyHistory(selectedHistory);

    // Cores baseadas no tipo de histórico
    const formColors = isDelayOnly && !isEarly ? {
      // Medicamento atrasado (vermelho)
      cardBg: "bg-red-50",
      cardBorder: "border-red-200",
      labelColor: "text-red-700",
      valueColor: "text-red-600",
      buttonColor: "bg-red-600 hover:bg-red-700"
    } : isEarly ? {
      // Medicamento antecipado (azul)
      cardBg: "bg-blue-50",
      cardBorder: "border-blue-200",
      labelColor: "text-blue-700",
      valueColor: "text-blue-600",
      buttonColor: "bg-blue-600 hover:bg-blue-700"
    } : {
      // Medicamento normal (verde)
      cardBg: "bg-green-50", 
      cardBorder: "border-green-200",
      labelColor: "text-green-700",
      valueColor: "text-green-600",
      buttonColor: "bg-emerald-600 hover:bg-emerald-700"
    };

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleClose}
              className="mr-3"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            {isDelayOnly && !isEarly ? "Editar Medicação Atrasada" : isEarly ? "Editar Medicação Antecipada" : "Editar Histórico"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Informações do Medicamento */}
          <div className={`${formColors.cardBg} border ${formColors.cardBorder} rounded-lg p-4 mb-6`}>
            <h4 className={`font-semibold ${formColors.labelColor} mb-2`}>Editando Histórico:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <span className={`font-medium ${formColors.labelColor}`}>Medicamento:</span>
                <p className={formColors.valueColor}>{selectedHistory.medication.name}</p>
              </div>
              <div>
                <span className={`font-medium ${formColors.labelColor}`}>Dose:</span>
                <p className={formColors.valueColor}>{selectedHistory.medication.dosage}</p>
              </div>
              <div>
                <span className={`font-medium ${formColors.labelColor}`}>Horário Programado:</span>
                <p className={formColors.valueColor}>
                  {formatHistoryTime(selectedHistory.scheduledDateTime)} - {formatHistoryDate(selectedHistory.scheduledDateTime)}
                </p>
              </div>
              <div>
                <span className={`font-medium ${formColors.labelColor}`}>Tomado às:</span>
                <p className={formColors.valueColor}>
                  {formatHistoryTime(selectedHistory.actualDateTime || selectedHistory.scheduledDateTime)} - {formatHistoryDate(selectedHistory.actualDateTime || selectedHistory.scheduledDateTime)}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }} className="space-y-4">
            {isDelayOnly ? (
              /* Formulário simplificado para históricos de atraso/antecedência - apenas motivo */
              <ValidatedTextarea
                id="notes"
                label={isEarly ? "Motivo da antecedência" : "Motivo do atraso"}
                value={editForm.notes || ""}
                onChange={(e) => {
                  const value = e.target.value;
                  setEditForm({...editForm, notes: value});

                  // Limpar erro quando usuário começar a digitar
                  if (validationErrors.notes && value.trim().length >= 2) {
                    setValidationErrors({});
                  }
                }}
                placeholder={isEarly ? "Explique por que tomou antecipadamente..." : "Explique por que não tomou no horário..."}
                rows={4}
                required
                error={validationErrors.notes}
              />
            ) : (
              /* Formulário completo para históricos normais */
              <>
                <div>
                  <Label htmlFor="effectiveness">Eficácia do Medicamento</Label>
                  <Select 
                    value={editForm.effectiveness || ""} 
                    onValueChange={(value) => setEditForm({...editForm, effectiveness: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a eficácia" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="very_effective">Muito Eficaz</SelectItem>
                      <SelectItem value="effective">Eficaz</SelectItem>
                      <SelectItem value="somewhat_effective">Pouco Eficaz</SelectItem>
                      <SelectItem value="not_effective">Não Eficaz</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="sideEffects">Efeitos Colaterais</Label>
                  <Textarea
                    id="sideEffects"
                    value={editForm.sideEffects || ""}
                    onChange={(e) => setEditForm({...editForm, sideEffects: e.target.value})}
                    placeholder="Descreva qualquer efeito colateral..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="symptoms">Sintomas</Label>
                  <Textarea
                    id="symptoms"
                    value={editForm.symptoms || ""}
                    onChange={(e) => setEditForm({...editForm, symptoms: e.target.value})}
                    placeholder="Descreva os sintomas antes/depois do medicamento..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="additionalInfo">Informações Adicionais</Label>
                  <Textarea
                    id="additionalInfo"
                    value={editForm.additionalInfo || ""}
                    onChange={(e) => setEditForm({...editForm, additionalInfo: e.target.value})}
                    placeholder="Outras informações relevantes..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={editForm.notes || ""}
                    onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                    placeholder="Adicione suas observações..."
                    rows={3}
                  />
                </div>
              </>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                type="submit"
                disabled={updateHistoryMutation.isPending}
                className={`flex-1 ${formColors.buttonColor}`}
              >
                {updateHistoryMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Atualizando...
                  </>
                ) : (
                  "Atualizar Histórico"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={updateHistoryMutation.isPending}
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  // Lista normal de histórico
  const filteredHistory = history.filter((entry) => {
    // Filtro por termo de pesquisa
    const searchMatch = !searchTerm || 
      entry.medication.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.medication.dosage.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entry.notes && entry.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    // Filtro por data
    const dateMatch = filterByDate(entry);

    // Filtro por status
    let statusMatch = true;
    if (filter === 'taken') {
      statusMatch = entry.actualDateTime !== null;
    } else if (filter === 'missed') {
      statusMatch = entry.actualDateTime === null;
    }

    return searchMatch && dateMatch && statusMatch;
  });

  // Ordenar por data de criação do histórico (mais recente primeiro)
  const sortedHistory = filteredHistory.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Lógica de paginação
  const totalItems = sortedHistory.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = sortedHistory.slice(startIndex, endIndex);

  // Reset para primeira página quando filtros mudarem
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  // Função para mudar página
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Função para mudar itens por página
  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1); // Reset para primeira página
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {totalItems === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
              <FileText className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-700 mb-2">Nenhum histórico encontrado</h3>
            <p className="text-slate-500 max-w-sm mx-auto">
              Não foram encontrados registros de histórico que correspondam aos filtros aplicados.
            </p>
          </div>
        ) : (
          currentItems.map((entry) => {
            const delayInfo = formatDelayTime(entry.scheduledDateTime, entry.actualDateTime);
            const hasDetailedInfo = isDetailedHistory(entry);
            const isDelayOnly = isDelayHistory(entry);
            const isEarly = isEarlyHistory(entry);

            // Definir cores baseadas no tipo de histórico
            const cardColors = isDelayOnly && !isEarly ? {
              // Medicamento atrasado (vermelho)
              cardBg: "bg-red-50",
              cardBorder: "border-red-200",
              cardHover: "hover:bg-red-100",
              iconBg: "bg-red-100",
              iconColor: "text-red-600",
              textColor: "text-red-600"
            } : isEarly ? {
              // Medicamento antecipado (azul)
              cardBg: "bg-blue-50",
              cardBorder: "border-blue-200",
              cardHover: "hover:bg-blue-100",
              iconBg: "bg-blue-100",
              iconColor: "text-blue-600",
              textColor: "text-blue-600"
            } : {
              // Medicamento normal (verde)
              cardBg: "bg-green-50",
              cardBorder: "border-green-200", 
              cardHover: "hover:bg-green-100",
              iconBg: "bg-green-100",
              iconColor: "text-green-600",
              textColor: "text-green-600"
            };

            return (
              <Card 
                key={entry.id} 
                className={`${cardColors.cardBg} ${cardColors.cardBorder} cursor-pointer ${cardColors.cardHover} transition-all duration-200 shadow-sm`}
                onClick={() => handleCardClick(entry)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-12 rounded-full ${cardColors.iconBg} flex items-center justify-center`}>
                        {isDelayOnly && !isEarly ? (
                          <AlertTriangle className={`w-5 h-5 ${cardColors.iconColor}`} />
                        ) : isEarly ? (
                          <Clock className={`w-5 h-5 ${cardColors.iconColor}`} />
                        ) : hasDetailedInfo ? (
                          <FileText className={`w-5 h-5 ${cardColors.iconColor}`} />
                        ) : delayInfo && delayInfo !== "No horário ✓" && !isEarly ? (
                          <AlertTriangle className="w-5 h-5 text-orange-600" />
                        ) : (
                          <CheckCircle className={`w-5 h-5 ${cardColors.iconColor}`} />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800">{entry.medication.name}</h3>
                        <p className="text-sm text-slate-500">
                          Dose: {entry.medication.dosage} • Programado: {formatHistoryTime(entry.scheduledDateTime)}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className={`text-xs font-medium ${cardColors.textColor}`}>
                            ✓ Tomado às {formatHistoryTime(entry.actualDateTime || entry.scheduledDateTime)}
                            {delayInfo && ` (${delayInfo})`}
                          </p>
                        </div>
                        {isDelayOnly && !isEarly && (
                          <Badge variant="outline" className="text-xs mt-1 bg-red-50 text-red-700 border-red-200">
                            Medicação Atrasada
                          </Badge>
                        )}
                        {isEarly && (
                          <Badge variant="outline" className="text-xs mt-1 bg-blue-50 text-blue-700 border-blue-200">
                            Medicação Antecipada
                          </Badge>
                        )}
                        {!hasDetailedInfo && !isDelayOnly && !isEarly && delayInfo && delayInfo !== "No horário ✓" && (
                          <Badge variant="outline" className="text-xs mt-1 bg-orange-50 text-orange-700 border-orange-200">
                            Tomada com Atraso
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <Badge variant="outline" className="text-xs mb-2">
                        {formatHistoryDate(entry.actualDateTime || entry.scheduledDateTime)}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Controles de paginação abaixo da lista */}
      <div className="flex flex-row gap-4 items-center justify-between bg-slate-50 p-4 rounded-lg">
        <div className="flex items-center gap-2">
          <Label htmlFor="itemsPerPage" className="text-sm font-medium text-slate-600 hidden sm:block">
            Itens por página:
          </Label>
          <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Paginação Previous/Next */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1 || totalPages === 0}
            className="flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">Anterior</span>
          </Button>

          <span className="text-sm text-slate-600 px-3">
            {totalPages === 0 ? "0 de 0" : `${currentPage} de ${totalPages}`}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="flex items-center gap-1"
          >
            <span className="hidden sm:inline">Próxima</span>
            <ChevronRight className="w-4 h-4 sm:ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}