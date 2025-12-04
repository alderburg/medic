import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface MedicationCardProps {
  medication: {
    id: number;
    name: string;
    dosage: string;
    scheduledTime: string;
    actualTime?: string;
    status: 'taken' | 'pending' | 'overdue';
    delayMinutes?: number;
    isEarly?: boolean;
  };
  log?: any; // Objeto log completo para histórico
  onTake?: (id: number) => void;
  onOpenHistory?: (log: any) => void;
  isLoading?: boolean;
}

export default function MedicationCard({ medication, log, onTake, onOpenHistory, isLoading }: MedicationCardProps) {
  // Validações de segurança
  if (!medication || typeof medication.id !== 'number') {
    console.error('MedicationCard: medication ou medication.id inválido', medication);
    return null;
  }

  const formatActualTime = (actualTime: string) => {
    // Se é um timestamp ISO, converter para horário brasileiro
    if (actualTime.includes('T')) {
      const date = new Date(actualTime);
      // Usar diretamente o timezone brasileiro para mostrar o horário correto
      return date.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo'
      });
    }
    // Se já é um horário (HH:MM), retornar como está
    return actualTime;
  };

  const formatDelayTime = (delayMinutes: number) => {
    if (delayMinutes < 60) {
      return `${delayMinutes} min`;
    }

    const hours = Math.floor(delayMinutes / 60);
    const minutes = delayMinutes % 60;

    if (minutes === 0) {
      return `${hours}h`;
    }

    return `${hours}h ${minutes}min`;
  };

  const getStatusInfo = () => {
    switch (medication.status) {
      case 'taken':
        let timingMessage = '';
        if (medication.delayMinutes !== undefined && medication.delayMinutes !== null) {
          if (medication.delayMinutes < 0) {
            // Negativo = adiantado
            timingMessage = ` (${formatDelayTime(Math.abs(medication.delayMinutes))} adiantado)`;
          } else if (medication.delayMinutes > 0) {
            // Positivo = atrasado
            timingMessage = ` (${formatDelayTime(medication.delayMinutes)} atraso)`;
          } else if (medication.delayMinutes === 0) {
            timingMessage = ' (No horário ✓)';
          }
        }

        

        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-l-green-500',
          cardBg: 'bg-green-50',
          message: medication.actualTime 
            ? `✓ Tomado às ${formatActualTime(medication.actualTime)}${timingMessage}`
            : '✓ Tomado',
        };
      case 'pending':
        return {
          icon: Clock,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-l-blue-500',
          cardBg: 'bg-blue-50',
          message: 'Pendente',
        };
      case 'overdue':
        return {
          icon: AlertTriangle,
          color: 'text-red-700',
          bgColor: 'bg-red-100',
          borderColor: 'border-l-red-600',
          cardBg: 'bg-red-50 border border-red-200',
          message: `⚠️ Atrasado há ${formatDelayTime(medication.delayMinutes || 0)}`,
        };
      default:
        return {
          icon: XCircle,
          color: 'text-gray-400',
          bgColor: 'bg-gray-50',
          borderColor: 'border-l-gray-300',
          cardBg: 'bg-gray-50',
          message: 'Status desconhecido',
        };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  const handleCardClick = () => {
    if (medication.status === 'taken' && onOpenHistory && log) {
      onOpenHistory(log);
    }
  };

  return (
    <Card 
      className={cn(
        "shadow-sm transition-all duration-200",
        medication.status === 'taken' && "bg-green-50 border-green-200 cursor-pointer hover:bg-green-100",
        medication.status === 'overdue' && "bg-red-50 border-red-200",
        medication.status === 'pending' && "bg-white border-slate-200"
      )}
      onClick={handleCardClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", statusInfo.bgColor)}>
              <StatusIcon className={cn("w-5 h-5", statusInfo.color)} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">{medication.name}</h3>
              <p className="text-sm text-slate-500">
                Dose: {medication.dosage} • Programado: {medication.scheduledTime}
              </p>
              <p className={cn("text-xs font-medium", statusInfo.color)}>
                {statusInfo.message}
              </p>
            </div>
          </div>

          {medication.status !== 'taken' && onTake && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                try {
                  if (medication.id && !isLoading) {
                    onTake(medication.id);
                  }
                } catch (error) {
                  console.error('Erro ao executar onTake:', error);
                }
              }}
              disabled={isLoading || !medication.id}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-colors shadow-sm",
                medication.status === 'overdue' 
                  ? "bg-red-600 hover:bg-red-700 text-white animate-pulse"
                  : medication.status === 'pending'
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-gray-600 hover:bg-gray-700 text-white",
                (isLoading || !medication.id) && "opacity-50 cursor-not-allowed"
              )}
            >
              {isLoading ? 'Salvando...' : (medication.status === 'overdue' ? 'TOMAR AGORA!' : 'Tomar')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}