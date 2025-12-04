import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatTime, cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface MedicationHistoryModalProps {
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
  };
  onClose: () => void;
  isOverdue?: boolean;
}

export default function MedicationHistoryModal({ log, onClose, isOverdue = false }: MedicationHistoryModalProps) {
  const [notes, setNotes] = useState("");
  const [sideEffects, setSideEffects] = useState("");
  const [effectiveness, setEffectiveness] = useState("effective");
  const [symptoms, setSymptoms] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const markAsTakenMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post(`/api/medication-logs/${log.id}/mark-taken`, data);
      return response.data;
    },
    onSuccess: async () => {
      // Aguardar todas as invalidações serem processadas antes de fechar
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/medication-logs"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/medication-logs/today"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/medication-history"] })
      ]);
      
      // Aguardar um pequeno delay para garantir que os dados foram recarregados
      await new Promise(resolve => setTimeout(resolve, 500));
      
      onClose();
      toast({
        title: "Sucesso",
        description: "Histórico de medicamento salvo com sucesso!",
      });
    },
    onError: (error) => {
      
      toast({
        title: "Erro",
        description: "Erro ao salvar histórico de medicamento. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Para medicamentos atrasados, observações são obrigatórias
    if (isOverdue && !notes.trim()) {
      toast({
        title: "Erro",
        description: "O campo 'Motivo do atraso' é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    // Para medicamentos normais, os campos tradicionais são obrigatórios
    if (!isOverdue) {
      if (!sideEffects.trim()) {
        toast({
          title: "Erro",
          description: "O campo 'Efeitos Colaterais' é obrigatório.",
          variant: "destructive",
        });
        return;
      }

      if (!effectiveness) {
        toast({
          title: "Erro",
          description: "O campo 'Eficácia' é obrigatório.",
          variant: "destructive",
        });
        return;
      }

      if (!symptoms.trim()) {
        toast({
          title: "Erro",
          description: "O campo 'Sintomas' é obrigatório.",
          variant: "destructive",
        });
        return;
      }
    }


    markAsTakenMutation.mutate({
      notes,
      sideEffects,
      effectiveness,
      symptoms,
      additionalInfo,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-[90vw] max-w-sm mx-auto max-h-[90vh] overflow-y-auto relative">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onClose}
          className="absolute top-2 right-2 h-8 w-8 p-0 z-10 bg-white/80 hover:bg-white shadow-sm"
        >
          <X className="h-4 w-4" />
        </Button>
        <Card className="border-0 shadow-none">
          <CardHeader className="border-b pr-12">
            <div>
              <CardTitle className="text-lg">
                {isOverdue ? "Tomar Medicação Atrasada" : (log?.medication?.name || 'Medicamento não identificado')}
              </CardTitle>
              <CardDescription className="space-y-1">
                {isOverdue && (
                  <div className="text-base font-medium text-slate-800 mb-2">
                    {log?.medication?.name || 'Medicamento não identificado'}
                  </div>
                )}
                {log?.medication?.dosage && (
                  <div className="text-sm text-muted-foreground">
                    Dosagem: {log.medication.dosage}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>Programado: {log?.scheduledDateTime ? formatTime(log.scheduledDateTime) : 'Horário não disponível'}</span>
                </div>
                {isOverdue && (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="text-red-600">
                      Atrasado há {(() => {
                        if (!log?.scheduledDateTime) return 'tempo indeterminado';
                        const scheduled = new Date(log.scheduledDateTime);
                        const now = new Date();
                        // Ajustar para timezone brasileiro (UTC-3)
                        const diffMs = now.getTime() - scheduled.getTime() - (3 * 60 * 60 * 1000);
                        const diffMinutes = Math.floor(diffMs / (1000 * 60));
                        
                        if (diffMinutes <= 0) {
                          return '0 minutos';
                        }
                        
                        if (diffMinutes < 60) {
                          return `${diffMinutes} minutos`;
                        }
                        
                        const hours = Math.floor(diffMinutes / 60);
                        const minutes = diffMinutes % 60;
                        
                        if (minutes === 0) {
                          return `${hours}h`;
                        }
                        
                        return `${hours}h ${minutes}min`;
                      })()}
                    </span>
                  </div>
                )}
                {log?.actualDateTime && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Tomado às: {formatTime(log.actualDateTime)}</span>
                  </div>
                )}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {isOverdue && (
                <div className="space-y-2">
                  <Label htmlFor="notes">Motivo do atraso *</Label>
                  <Textarea
                    id="notes"
                    placeholder="Explique por que não tomou no horário..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    required={isOverdue}
                  />
                </div>
              )}

              {!isOverdue && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="effectiveness">Como foi a eficácia? *</Label>
                    <Select value={effectiveness} onValueChange={setEffectiveness} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a eficácia" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="very_effective">Muito Eficaz</SelectItem>
                        <SelectItem value="effective">Eficaz</SelectItem>
                        <SelectItem value="somewhat_effective">Parcialmente Eficaz</SelectItem>
                        <SelectItem value="not_effective">Não Eficaz</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sideEffects">Efeitos colaterais *</Label>
                    <Textarea
                      id="sideEffects"
                      placeholder="Descreva qualquer efeito colateral observado..."
                      value={sideEffects}
                      onChange={(e) => setSideEffects(e.target.value)}
                      rows={3}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="symptoms">Sintomas *</Label>
                    <Textarea
                      id="symptoms"
                      placeholder="Descreva sintomas relacionados..."
                      value={symptoms}
                      onChange={(e) => setSymptoms(e.target.value)}
                      rows={3}
                      required
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="additionalInfo">Informações adicionais</Label>
                <Textarea
                  id="additionalInfo"
                  placeholder="Outras informações importantes..."
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                  rows={3}
                />
              </div>

              {!isOverdue && (
                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    placeholder="Adicione observações sobre o medicamento..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={markAsTakenMutation.isPending}
                  className={cn("flex-1", isOverdue ? "bg-green-600 hover:bg-green-700 text-white" : "")}
                >
                  {markAsTakenMutation.isPending 
                    ? "Salvando..." 
                    : (isOverdue ? "Tomar" : "Salvar Histórico")
                  }
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}