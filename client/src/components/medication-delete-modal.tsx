import React, { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface MedicationDeleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medicationId: number;
  medicationName: string;
  onSuccess: () => void;
}

export default function MedicationDeleteModal({
  open,
  onOpenChange,
  medicationId,
  medicationName,
  onSuccess,
}: MedicationDeleteModalProps) {
  const [loading, setLoading] = useState(false);
  const [shouldInactivate, setShouldInactivate] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const { toast } = useToast();

  // Verificar se medicamento já foi tomado quando o modal abrir
  const handleCheckMedicationStatus = async () => {
    if (!open || checkingStatus || medicationId === 0) return;
    
    setCheckingStatus(true);
    try {
      const response = await apiRequest({
        url: `/api/medications/${medicationId}/has-taken-logs`,
        method: 'GET',
        on401: 'throw'
      });
      
      if (response.ok) {
        const data = await response.json();
        setShouldInactivate(data.hasTakenLogs);
      } else {
        // Se há erro na API, assumir que pode ser excluído
        setShouldInactivate(false);
      }
    } catch (error) {
      
      // Em caso de erro, assumir que pode ser excluído
      setShouldInactivate(false);
    } finally {
      setCheckingStatus(false);
    }
  };

  // Executar verificação quando o modal abrir
  React.useEffect(() => {
    if (open && medicationId > 0 && !checkingStatus) {
      // Reset states when modal opens
      setShouldInactivate(false);
      // Adicionar um pequeno delay para mostrar o modal primeiro
      setTimeout(() => {
        handleCheckMedicationStatus();
      }, 100);
    }
  }, [open, medicationId]);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await apiRequest({
        url: `/api/medications/${medicationId}`,
        method: 'DELETE',
        on401: 'throw'
      });
      
      toast({
        title: "Sucesso",
        description: "Medicamento excluído com sucesso",
      });
      
      // Aguardar que a lista seja atualizada antes de fechar
      await onSuccess();
      
      // Aguardar um pequeno delay para garantir que os dados foram recarregados
      await new Promise(resolve => setTimeout(resolve, 300));
      
      onOpenChange(false);
    } catch (error: any) {
      
      
      if (error.response?.data?.shouldInactivate) {
        setShouldInactivate(true);
        toast({
          title: "Não é possível excluir",
          description: "Este medicamento já foi tomado. Use a opção 'Inativar' para parar de tomar.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro",
          description: "Erro ao excluir medicamento",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInactivate = async () => {
    setLoading(true);
    try {
      await apiRequest({
        url: `/api/medications/${medicationId}/inactivate`,
        method: 'POST',
        on401: 'throw'
      });
      
      toast({
        title: "Sucesso",
        description: "Medicamento inativado com sucesso. Não aparecerá mais na agenda.",
      });
      
      // Aguardar que a lista seja atualizada antes de fechar
      await onSuccess();
      
      // Aguardar um pequeno delay para garantir que os dados foram recarregados
      await new Promise(resolve => setTimeout(resolve, 300));
      
      onOpenChange(false);
    } catch (error) {
      
      toast({
        title: "Erro",
        description: "Erro ao inativar medicamento",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onOpenChange(false);
      // Reset all states when closing
      setShouldInactivate(false);
      setCheckingStatus(false);
    }
  };

  if (checkingStatus) {
    return (
      <AlertDialog open={open} onOpenChange={handleClose}>
        <AlertDialogContent className="w-[90vw] max-w-sm mx-auto rounded-xl p-4">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-base">Verificando medicamento</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-sm">
              <div className="flex justify-center items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                Verificando se o medicamento pode ser excluído...
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent className="w-[90vw] max-w-sm mx-auto rounded-xl p-4">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-center text-base">
            {shouldInactivate ? "Inativar medicamento" : "Excluir medicamento"}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-sm">
            {shouldInactivate ? (
              <>
                O medicamento <strong>{medicationName}</strong> já foi tomado e não pode ser excluído.
                <br /><br />
                Deseja inativar? Isso irá:
                <br />• Remover da agenda futura
                <br />• Preservar histórico para relatórios
              </>
            ) : (
              <>
                Tem certeza que deseja excluir o medicamento <strong>{medicationName}</strong>?
                <br /><br />
                Esta ação não pode ser desfeita.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
          <AlertDialogCancel disabled={loading} className="w-full sm:w-auto">
            Cancelar
          </AlertDialogCancel>
          {shouldInactivate ? (
            <AlertDialogAction
              onClick={handleInactivate}
              disabled={loading}
              className="bg-orange-600 hover:bg-orange-700 w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Inativando...
                </>
              ) : (
                "Inativar"
              )}
            </AlertDialogAction>
          ) : (
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}