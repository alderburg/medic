
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Power } from "lucide-react";

interface MedicationReactivateConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medicationName: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function MedicationReactivateConfirmation({
  open,
  onOpenChange,
  medicationName,
  onConfirm,
  onCancel,
  loading = false
}: MedicationReactivateConfirmationProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <AlertTriangle className="w-5 h-5" />
            Medicamento Inativado
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 mb-4">
            <p className="text-sm text-orange-800">
              O medicamento <strong>{medicationName}</strong> está atualmente inativado.
            </p>
          </div>
          
          <div className="space-y-3 text-sm text-slate-600">
            <p>Para que as edições façam efeito, o medicamento será automaticamente:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Reativado no sistema</li>
              <li>Incluído novamente na agenda de medicamentos</li>
              <li>Disponível para novos lembretes</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Salvando...
              </>
            ) : (
              <>
                <Power className="w-4 h-4 mr-2" />
                Reativar e Salvar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
