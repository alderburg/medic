
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Pill, AlertTriangle } from "lucide-react";

interface MedicationInactiveEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medicationName: string;
  onConfirm: () => void;
  loading?: boolean;
}

export default function MedicationInactiveEditModal({
  open,
  onOpenChange,
  medicationName,
  onConfirm,
  loading = false
}: MedicationInactiveEditModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="w-[90vw] max-w-sm mx-auto rounded-xl p-4">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <AlertDialogTitle className="text-lg">
                Medicamento Inativo
              </AlertDialogTitle>
            </div>
          </div>
          
          <AlertDialogDescription className="text-slate-600 space-y-3">
            <p>
              O medicamento <strong>{medicationName}</strong> está atualmente <strong>inativo</strong>.
            </p>
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Pill className="w-4 h-4 text-amber-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800 mb-1">
                    Para que as edições tenham efeito:
                  </p>
                  <p className="text-amber-700">
                    O medicamento será automaticamente <strong>reativado</strong> e os novos horários de administração serão criados.
                  </p>
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processando...
              </>
            ) : (
              <>
                <Pill className="w-4 h-4 mr-2" />
                Reativar e Salvar
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
