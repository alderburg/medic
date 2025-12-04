import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pill, Calendar, ClipboardCheck, FlaskConical, Activity, Droplets, Heart, Thermometer, Weight } from "lucide-react";
import { useLocation } from "wouter";

interface AddDialogProps {
  onAdd?: (medication: any) => void;
  trigger?: React.ReactNode;
}

export default function AddDialog({ onAdd, trigger }: AddDialogProps) {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();

  const handleOptionSelect = (option: string) => {
    setOpen(false);

    switch (option) {
      case 'pressure':
        setLocation('/vital-signs/pressure');
        break;
      case 'glucose':
        setLocation('/vital-signs/glucose');
        break;
      case 'heart-rate':
        setLocation('/vital-signs/heart-rate');
        break;
      case 'temperature':
        setLocation('/vital-signs/temperature');
        break;
      case 'weight':
        setLocation('/vital-signs/weight');
        break;
      case 'medications':
        setLocation('/medications');
        break;
      case 'appointments':
        setLocation('/appointments');
        break;
      case 'prescriptions':
        setLocation('/prescriptions');
        break;
      case 'tests':
        setLocation('/tests');
        break;
      default:
        break;
    }
  };

  const options = [
    {
      id: 'pressure',
      title: 'Pressão Arterial',
      description: 'Registrar nova medição',
      icon: Activity,
      color: 'bg-red-100 text-red-600',
    },
    {
      id: 'glucose',
      title: 'Glicemia',
      description: 'Registrar nova medição',
      icon: Droplets,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      id: 'heart-rate',
      title: 'Batimentos',
      description: 'Registrar nova medição',
      icon: Heart,
      color: 'bg-rose-100 text-rose-600',
    },
    {
      id: 'temperature',
      title: 'Temperatura',
      description: 'Registrar nova medição',
      icon: Thermometer,
      color: 'bg-orange-100 text-orange-600',
    },
    {
      id: 'weight',
      title: 'Peso',
      description: 'Registrar nova medição',
      icon: Weight,
      color: 'bg-purple-100 text-purple-600',
    },
    {
      id: 'medications',
      title: 'Medicamentos',
      description: 'Cadastrar novo medicamento',
      icon: Pill,
      color: 'bg-emerald-100 text-emerald-600',
    },
    {
      id: 'appointments',
      title: 'Consultas',
      description: 'Agendar nova consulta',
      icon: Calendar,
      color: 'bg-cyan-100 text-cyan-600',
    },
    {
      id: 'prescriptions',
      title: 'Receitas',
      description: 'Adicionar nova receita',
      icon: ClipboardCheck,
      color: 'bg-green-100 text-green-600',
    },
    {
      id: 'tests',
      title: 'Exames',
      description: 'Cadastrar novo exame',
      icon: FlaskConical,
      color: 'bg-yellow-100 text-yellow-600',
    },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="w-14 h-14 rounded-full" size="icon">
            <Plus className="w-6 h-6" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-[90vw] max-w-sm mx-auto rounded-xl p-4 max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-center text-base">O que você gostaria de fazer?</DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto scrollbar-hide py-4 px-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <div className="grid gap-3">
            {options.map((option) => {
              const IconComponent = option.icon;
              return (
                <Button
                  key={option.id}
                  variant="outline"
                  className="flex items-center justify-start p-4 h-auto"
                  onClick={() => handleOptionSelect(option.id)}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 ${option.color}`}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-slate-800">{option.title}</h3>
                    <p className="text-sm text-slate-600">{option.description}</p>
                  </div>
                </Button>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}