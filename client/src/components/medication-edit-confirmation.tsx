import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock, CheckCircle } from "lucide-react";
import { format } from "date-fns";

interface TakenMedication {
  id: number;
  scheduledDateTime: string;
  actualDateTime: string | null;
  status: string;
  medicationName: string;
  scheduledTime: string;
}

interface MedicationEditConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  takenMedications: TakenMedication[];
  onConfirm: (selectedMedications: number[]) => void;
  loading?: boolean;
  medicationName?: string;
}

export default function MedicationEditConfirmation({
  open,
  onOpenChange,
  takenMedications,
  onConfirm,
  loading = false,
  medicationName
}: MedicationEditConfirmationProps) {
  const [selectedMedications, setSelectedMedications] = useState<number[]>([]);

  // Pré-selecionar todos os medicamentos quando o diálogo abrir
  useEffect(() => {
    if (open && takenMedications.length > 0) {
      setSelectedMedications(takenMedications.map(med => med.id));
    }
  }, [open, takenMedications]);

  const handleMedicationToggle = (medicationId: number) => {
    setSelectedMedications(prev => 
      prev.includes(medicationId)
        ? prev.filter(id => id !== medicationId)
        : [...prev, medicationId]
    );
  };

  const handleConfirm = () => {
    onConfirm(selectedMedications);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-sm mx-auto rounded-xl p-4 max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {medicationName ? `${medicationName} já foi tomado hoje` : 'Medicamento já foi tomado hoje'}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-gray-600 mb-4">
            Selecione os horários que deseja manter como tomado:
          </p>

          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {takenMedications
              .sort((a, b) => {
                // Converter UTC para horário brasileiro antes de ordenar
                const utcDateA = new Date(a.scheduledDateTime);
                const utcDateB = new Date(b.scheduledDateTime);
                const brasilDateA = new Date(utcDateA.getTime() + (3 * 60 * 60 * 1000));
                const brasilDateB = new Date(utcDateB.getTime() + (3 * 60 * 60 * 1000));
                
                const hoursA = brasilDateA.getHours();
                const hoursB = brasilDateB.getHours();
                const minutesA = brasilDateA.getMinutes();
                const minutesB = brasilDateB.getMinutes();
                
                // Tratar horários de 00:00 a 05:59 como início do dia (prioridade)
                const getAdjustedTime = (hours: number, minutes: number) => {
                  if (hours >= 0 && hours <= 5) {
                    // Madrugada: 00:00-05:59 = 0-359 minutos (prioridade máxima)
                    return hours * 60 + minutes;
                  } else {
                    // Resto do dia: 06:00-23:59 = 360-1799 minutos
                    return (hours * 60 + minutes) + 360;
                  }
                };
                
                const timeA = getAdjustedTime(hoursA, minutesA);
                const timeB = getAdjustedTime(hoursB, minutesB);
                
                return timeA - timeB;
              })
              .map((med) => (
              <div key={med.id} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                <Checkbox
                  checked={selectedMedications.includes(med.id)}
                  onCheckedChange={() => handleMedicationToggle(med.id)}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm flex-wrap">
                    <Clock className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span className="font-medium break-words">
                      Horário programado: {(() => {
                        // Converter UTC para horário brasileiro (UTC-3) - adicionar 3 horas
                        const utcDate = new Date(med.scheduledDateTime);
                        const brasilDate = new Date(utcDate.getTime() + (3 * 60 * 60 * 1000));
                        return brasilDate.toLocaleTimeString('pt-BR', { 
                          hour: '2-digit', 
                          minute: '2-digit'
                        });
                      })()}
                    </span>
                  </div>
                  {med.actualDateTime && (
                    <div className="text-xs text-gray-500 mt-1">
                      Tomado às: {(() => {
                        // Converter UTC para horário brasileiro (UTC-3) e adicionar 3 horas
                        const utcDate = new Date(med.actualDateTime);
                        const brasilDate = new Date(utcDate.getTime() + (3 * 60 * 60 * 1000));
                        return brasilDate.toLocaleTimeString('pt-BR', { 
                          hour: '2-digit', 
                          minute: '2-digit'
                        });
                      })()}
                    </div>
                  )}
                </div>
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 w-full"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Salvando...
              </>
            ) : (
              'Salvar Atualização'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}