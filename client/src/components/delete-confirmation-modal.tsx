import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface DeleteConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string | React.ReactNode;
  onConfirm: () => void;
  loading?: boolean;
}

export default function DeleteConfirmationModal({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  loading = false,
}: DeleteConfirmationModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={loading ? undefined : onOpenChange}>
      <AlertDialogContent className="w-[90vw] max-w-sm mx-auto rounded-xl p-4">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-center text-base">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-center text-sm">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
          <AlertDialogCancel disabled={loading} className="w-full sm:w-auto">
            Cancelar
          </AlertDialogCancel>
          <Button
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
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
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}