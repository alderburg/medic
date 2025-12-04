import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, AlertTriangle, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatTime } from "@/lib/utils";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface MedicationHistoryInlineProps {
  log: {
    id: number;
    medicationId: number;
    scheduledDateTime: string;
    actualDateTime?: string;
    medication: {
      name: string;
      dosage: string;
    };
    status?: string;
    isEarly?: boolean;
  };
  onClose: () => void;
  isOverdue?: boolean;
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

export default function MedicationHistoryInline({ log, onClose, isOverdue = false }: MedicationHistoryInlineProps) {
  const [notes, setNotes] = useState("");
  const [sideEffects, setSideEffects] = useState("");
  const [effectiveness, setEffectiveness] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Definir cores baseadas no status
  const getStatusColors = () => {
    if (log.status === 'taken') {
      return {
        cardBg: "bg-green-50",
        cardBorder: "border-green-200",
        labelColor: "text-green-700",
        valueColor: "text-green-900",
        buttonColor: "bg-green-600 hover:bg-green-700"
      };
    } else if (log.status === 'overdue' || isOverdue) {
      return {
        cardBg: "bg-red-50",
        cardBorder: "border-red-200",
        labelColor: "text-red-700",
        valueColor: "text-red-900",
        buttonColor: "bg-red-600 hover:bg-red-700"
      };
    } else if (log.isEarly) {
      return {
        cardBg: "bg-blue-50",
        cardBorder: "border-blue-200",
        labelColor: "text-blue-700",
        valueColor: "text-blue-900",
        buttonColor: "bg-blue-600 hover:bg-blue-700"
      };
    } else {
      return {
        cardBg: "bg-blue-50",
        cardBorder: "border-blue-200",
        labelColor: "text-blue-700",
        valueColor: "text-blue-900",
        buttonColor: "bg-blue-600 hover:bg-blue-700"
      };
    }
  };

  const statusColors = getStatusColors();

  const addHistoryMutation = useMutation({
    mutationFn: async (historyData: any) => {
      const response = await api.post("/api/medication-history", historyData);
      return response.data;
    },
    onSuccess: async () => {
      // Invalidar queries e aguardar atualização
      await queryClient.invalidateQueries({ queryKey: ["/api/medication-history"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/medication-logs/today"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/medication-logs"] });
      
      // Aguardar um pouco para garantir que os dados foram atualizados
      await new Promise(resolve => setTimeout(resolve, 500));
      
      toast({
        title: "Medicação tomada!",
        description: "O histórico foi registrado e a medicação marcada como tomada.",
      });
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      console.error('Erro ao salvar histórico:', error);
      toast({
        title: "Erro",
        description: "Erro ao registrar medicação. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setNotes("");
    setSideEffects("");
    setEffectiveness("");
    setSymptoms("");
    setAdditionalInfo("");
  };

  const handleSubmit = () => {
    // Validação para medicamento atrasado
    if (isOverdue && !notes.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, explique o motivo do atraso.",
        variant: "destructive",
      });
      return;
    }

    // Validação para medicamento antecipado
    if (log.isEarly && !notes.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, explique o motivo da antecedência.",
        variant: "destructive",
      });
      return;
    }

    // Para históricos normais, validar se pelo menos um campo foi preenchido
    if (!isOverdue && !log.isEarly) {
      const hasAnyData = notes.trim() || 
                        sideEffects.trim() || 
                        effectiveness || 
                        symptoms.trim() || 
                        additionalInfo.trim();
      
      if (!hasAnyData) {
        toast({
          title: "Informações necessárias",
          description: "Por favor, preencha pelo menos um campo para salvar o histórico.",
          variant: "destructive",
        });
        return;
      }
    }

    const historyData = {
      medicationLogId: log.id,
      medicationId: log.medicationId,
      scheduledDateTime: log.scheduledDateTime, // Manter como string ISO
      actualDateTime: log.actualDateTime || new Date().toISOString(), // Manter como string ISO
      notes: notes.trim() || null,
      sideEffects: sideEffects.trim() || null,
      effectiveness: effectiveness || null,
      symptoms: symptoms.trim() || null,
      additionalInfo: additionalInfo.trim() || null,
    };

    addHistoryMutation.mutate(historyData);
  };

  return (
    <div className="space-y-4">
      {/* Header com botão voltar */}
      <div className="flex items-center space-x-3 mb-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onClose}
          className="h-8 w-8 p-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold text-slate-800">
          {isOverdue ? "Confirmar Medicação Atrasada" : 
           log.isEarly ? "Confirmar Medicação Antecipada" : 
           "Editar Histórico"}
        </h2>
      </div>

      {/* Card com informações da medicação - Layout igual à aba de histórico */}
      <Card className={`${statusColors.cardBg} ${statusColors.cardBorder}`}>
        <CardContent className="p-4">
          <h3 className="text-sm font-medium text-slate-800 mb-3">Editando Histórico:</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className={`${statusColors.labelColor} font-medium block`}>Medicamento:</span>
              <span className={statusColors.valueColor}>{log.medication.name}</span>
            </div>
            <div>
              <span className={`${statusColors.labelColor} font-medium block`}>Dose:</span>
              <span className={statusColors.valueColor}>{log.medication.dosage}</span>
            </div>
            <div>
              <span className={`${statusColors.labelColor} font-medium block`}>Horário Programado:</span>
              <span className={statusColors.valueColor}>
                {formatHistoryTime(log.scheduledDateTime)} - {formatHistoryDate(log.scheduledDateTime)}
              </span>
            </div>
            {log.actualDateTime && (
              <div>
                <span className={`${statusColors.labelColor} font-medium block`}>Tomado às:</span>
                <span className={statusColors.valueColor}>
                  {formatHistoryTime(log.actualDateTime)}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Formulário */}
      <div className="space-y-4">
        {(isOverdue || log.isEarly) ? (
          /* Formulário simplificado para medicamentos atrasados ou antecipados - apenas motivo */
          <div className="space-y-2">
            <Label htmlFor="notes">
              {isOverdue ? "Motivo do atraso *" : "Motivo da antecedência *"}
            </Label>
            <Textarea
              id="notes"
              placeholder="Explique por que não tomou no horário..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>
        ) : (
          /* Formulário completo para medicamentos normais */
          <>
            <div className="space-y-2">
              <Label htmlFor="effectiveness">Eficácia do Medicamento</Label>
              <Select value={effectiveness} onValueChange={setEffectiveness}>
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

            <div className="space-y-2">
              <Label htmlFor="sideEffects">Efeitos Colaterais</Label>
              <Textarea
                id="sideEffects"
                placeholder="Descreva qualquer efeito colateral observado..."
                value={sideEffects}
                onChange={(e) => setSideEffects(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="symptoms">Sintomas</Label>
              <Textarea
                id="symptoms"
                placeholder="Descreva os sintomas antes/depois da medicação..."
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="additionalInfo">Informações Adicionais</Label>
              <Textarea
                id="additionalInfo"
                placeholder="Outras informações relevantes..."
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                placeholder="Digite suas observações..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </>
        )}

        {/* Botões de ação */}
        <div className="flex space-x-3 pt-4">
          <Button
            onClick={handleSubmit}
            disabled={addHistoryMutation.isPending}
            className={`flex-1 ${statusColors.buttonColor} text-white`}
          >
            {addHistoryMutation.isPending 
              ? (isOverdue || log.isEarly ? "Tomando..." : "Salvando...") 
              : (isOverdue || log.isEarly ? "Tomar Medicação" : "Salvar Histórico")
            }
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={addHistoryMutation.isPending}
            className="flex-1"
          >
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}