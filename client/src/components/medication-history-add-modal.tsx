import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { Loader2 } from "lucide-react";

interface MedicationHistoryAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  medicationLog: any;
  medicationName: string;
  isOverdue?: boolean;
}

export default function MedicationHistoryAddModal({ 
  isOpen, 
  onClose, 
  medicationLog, 
  medicationName, 
  isOverdue = false 
}: MedicationHistoryAddModalProps) {
  const [notes, setNotes] = useState("");
  const [sideEffects, setSideEffects] = useState("");
  const [effectiveness, setEffectiveness] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addHistoryMutation = useMutation({
    mutationFn: async (historyData: any) => {
      const response = await api.post("/api/medication-history", historyData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medication-history"] });
      toast({
        title: "Histórico adicionado",
        description: "O histórico da medicação foi registrado com sucesso.",
      });
      onClose();
      resetForm();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao adicionar histórico. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const confirmMedicationMutation = useMutation({
    mutationFn: async () => {
      const response = await api.put(`/api/medication-logs/${medicationLog.id}`, {
        status: "taken",
        actualDateTime: new Date(),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medication-logs/today"] });
    },
  });

  const resetForm = () => {
    setNotes("");
    setSideEffects("");
    setEffectiveness("");
    setSymptoms("");
    setAdditionalInfo("");
  };

  const handleSubmit = async () => {
    try {
      // Primeiro adiciona o histórico
      await addHistoryMutation.mutateAsync({
        medicationLogId: medicationLog.id,
        medicationId: medicationLog.medicationId,
        patientId: medicationLog.patientId,
        scheduledDateTime: medicationLog.scheduledDateTime,
        actualDateTime: new Date(),
        notes,
        sideEffects,
        effectiveness,
        symptoms,
        additionalInfo,
      });

      // Se for um medicamento atrasado, marca como tomado
      if (isOverdue) {
        await confirmMedicationMutation.mutateAsync();
      }
    } catch (error) {
      
    }
  };

  const isLoading = addHistoryMutation.isPending || confirmMedicationMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isOverdue ? "Confirmar Medicação Atrasada" : "Adicionar Histórico"}
          </DialogTitle>
          <DialogDescription>
            {isOverdue 
              ? `Descreva o motivo do atraso para ${medicationName}` 
              : `Adicione informações sobre a medicação ${medicationName}`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notes">
              {isOverdue ? "Motivo do atraso *" : "Observações"}
            </Label>
            <Textarea
              id="notes"
              placeholder={isOverdue ? "Explique por que não tomou no horário..." : "Digite suas observações..."}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {!isOverdue && (
            <>
              <div className="space-y-2">
                <Label htmlFor="effectiveness">Eficácia</Label>
                <Select value={effectiveness} onValueChange={setEffectiveness}>
                  <SelectTrigger>
                    <SelectValue placeholder="Como você se sente?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="very_effective">Muito eficaz</SelectItem>
                    <SelectItem value="effective">Eficaz</SelectItem>
                    <SelectItem value="somewhat_effective">Parcialmente eficaz</SelectItem>
                    <SelectItem value="not_effective">Não eficaz</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="side-effects">Efeitos colaterais</Label>
                <Textarea
                  id="side-effects"
                  placeholder="Descreva qualquer efeito colateral..."
                  value={sideEffects}
                  onChange={(e) => setSideEffects(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="symptoms">Sintomas</Label>
                <Textarea
                  id="symptoms"
                  placeholder="Descreva seus sintomas..."
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="additional-info">Informações adicionais</Label>
                <Textarea
                  id="additional-info"
                  placeholder="Outras informações relevantes..."
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                  rows={2}
                />
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading || (isOverdue && !notes.trim())}
            className="bg-blue-500 hover:bg-blue-600"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isOverdue ? "Confirmar e Registrar" : "Adicionar Histórico"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}