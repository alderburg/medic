import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Plus, Check, ChevronDown, Users, Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { usePatient } from "@/contexts/patient-context";
import { api } from "@/lib/api";

interface Patient {
  id: number;
  name: string;
  email: string;
  age?: number;
  photo?: string;
  profileType: 'patient' | 'caregiver' | 'doctor' | 'family' | 'nurse';
}

interface PatientSelectorProps {
  currentPatient?: Patient;
  onPatientChange?: (patient: Patient | null) => void;
}

export default function PatientSelector({ currentPatient, onPatientChange }: PatientSelectorProps) {
  const [open, setOpen] = useState(false);
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [loadingPatientName, setLoadingPatientName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInputRef, setSearchInputRef] = useState<HTMLInputElement | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { trocarPacienteContexto, limparContextoPaciente } = usePatient();
  const queryClient = useQueryClient();

  // ⚡ OTIMIZAÇÃO: Carregamento apenas quando há pesquisa
  const { data: patientsData, isLoading: loadingPatients } = useQuery({
    queryKey: ["/api/caregiver/patients/basic", searchTerm],
    queryFn: async () => {
      const response = await api.get("/api/caregiver/patients/basic");
      return response.data;
    },
    enabled: open && user?.profileType === 'caregiver' && searchTerm.length > 0,
  });

  const accessiblePatients: Patient[] = patientsData?.patients || [];
  
  // Filtrar pacientes baseado no termo de pesquisa (apenas se há dados carregados)
  const patients: Patient[] = searchTerm.length > 0 
    ? accessiblePatients.filter((patient: Patient) =>
        patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];
  
  const isLoading = loadingPatients;



  const handlePatientSelect = async (patient: Patient) => {
    try {
      // Show loading modal
      setLoadingPatientName(patient.name);
      setShowLoadingModal(true);
      setOpen(false);

      // Use patient context system to switch
      await trocarPacienteContexto(patient.id);

      // Call onPatientChange immediately to update the UI
      onPatientChange?.(patient);

      toast({
        title: "Paciente selecionado",
        description: `Agora visualizando dados de ${patient.name}`,
      });
    } catch (error) {
      console.error("Error switching patient:", error);
      toast({
        title: "Erro",
        description: "Erro ao trocar de paciente. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setShowLoadingModal(false);
    }
  };

  // Limpar campo de pesquisa quando modal é fechado
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setSearchTerm("");
    } else {
      // Focar no input quando modal abre
      setTimeout(() => {
        if (searchInputRef) {
          searchInputRef.focus();
        }
      }, 100);
    }
  };

  

  // Voltar aos dados do próprio cuidador
  const handleReturnToOwnData = async () => {
    try {
      // Show loading modal
      setLoadingPatientName(user?.name || "usuário");
      setShowLoadingModal(true);

      // Clear patient context first
      limparContextoPaciente();

      // Clear server-side context by calling a specific endpoint
      try {
        await api.delete('/api/caregiver/clear-patient-context');
      } catch (serverError) {
        console.warn('Could not clear server context, proceeding anyway:', serverError);
      }

      // Invalidate all medical data queries to force refresh with caregiver's data
      queryClient.removeQueries({
        predicate: (query) => {
          const queryKey = query.queryKey[0] as string;
          return [
            '/api/medications', 
            '/api/medication-logs',
            '/api/medication-logs/today',
            '/api/medication-history',
            '/api/tests',
            '/api/appointments', 
            '/api/notifications',
            '/api/prescriptions',
            '/api/vital-signs/blood-pressure',
            '/api/vital-signs/glucose',
            '/api/vital-signs/heart-rate',
            '/api/vital-signs/temperature',
            '/api/vital-signs/weight'
          ].includes(queryKey);
        }
      });

      // Refresh user context
      await queryClient.refetchQueries({ queryKey: ['/api/auth/me'] });

      // Call callback to notify parent component (clearing patient selection)
      onPatientChange?.(null);

      toast({
        title: "Dados Atualizados",
        description: "Voltando aos seus próprios dados médicos.",
      });

    } catch (error) {
      console.error("Error returning to own data:", error);
      toast({
        title: "Erro",
        description: "Não foi possível voltar aos seus dados.",
        variant: "destructive",
      });
    } finally {
      setShowLoadingModal(false);
    }
  };

  return (
    <>
      {/* Loading Modal */}
      <Dialog open={showLoadingModal} onOpenChange={() => {}}>
        <DialogContent className="w-[90vw] max-w-sm mx-auto rounded-xl" hideCloseButton>
          <DialogTitle className="sr-only">Carregando Dados do Paciente</DialogTitle>
          <DialogDescription className="sr-only">
            Aguarde enquanto carregamos os dados do paciente selecionado
          </DialogDescription>
          <div className="flex flex-col items-center justify-center py-8 px-4">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Carregando Dados
            </h3>
            <p className="text-sm text-gray-600 text-center">
              Carregando dados de <strong>{loadingPatientName}</strong>...
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Por favor, aguarde enquanto atualizamos os dados
            </p>
          </div>
        </DialogContent>
      </Dialog>
      {/* Patient Info Button */}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button 
            variant="ghost" 
            className="flex items-center space-x-3 p-0 h-auto hover:bg-transparent"
          >
            <Avatar className="w-10 h-10">
              <AvatarImage src={currentPatient?.photo || user?.photo || ""} alt={currentPatient?.name || user?.name} />
              <AvatarFallback>{(currentPatient?.name || user?.name)?.charAt(0) || "U"}</AvatarFallback>
            </Avatar>
            <div className="text-left flex-1">
              <h1 className="text-lg font-semibold text-slate-800">{currentPatient?.name || user?.name}</h1>
              <div className="flex items-center gap-2">
                <Badge 
                  variant={(currentPatient?.profileType || user?.profileType) === 'patient' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {(currentPatient?.profileType || user?.profileType) === 'patient' ? 'Paciente' : 
                   (currentPatient?.profileType || user?.profileType) === 'caregiver' ? 'Cuidador(a)' :
                   (currentPatient?.profileType || user?.profileType) === 'doctor' ? 'Médico(a)' :
                   (currentPatient?.profileType || user?.profileType) === 'family' ? 'Familiar' :
                   (currentPatient?.profileType || user?.profileType) === 'nurse' ? 'Enfermagem' : 'Usuário'}
                </Badge>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </div>
            </div>
            
            {/* Botão X para voltar aos dados do cuidador - só aparece quando um paciente está selecionado */}
            {user?.profileType === 'caregiver' && currentPatient && currentPatient.id !== user.id && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleReturnToOwnData();
                }}
                className="h-8 w-8 p-0 hover:bg-red-100 text-red-600 hover:text-red-700 ml-2"
                title="Voltar aos meus dados"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </Button>
        </DialogTrigger>

        <DialogContent className="w-[90vw] max-w-sm mx-auto rounded-xl p-4 max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-center text-base flex items-center justify-center gap-2">
              <Users className="w-5 h-5" />
              Selecionar Paciente
            </DialogTitle>
            <DialogDescription className="sr-only">
              Digite no campo de pesquisa para encontrar e selecionar um paciente
            </DialogDescription>
          </DialogHeader>

          {/* Campo de Pesquisa */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                ref={setSearchInputRef}
                placeholder="Pesquisar paciente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <ScrollArea className="flex-1 overflow-y-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : patients.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">
                  {searchTerm 
                    ? 'Nenhum paciente encontrado para a pesquisa' 
                    : 'Digite no campo acima para pesquisar pacientes'
                  }
                </p>
                {searchTerm ? (
                  <p className="text-sm text-gray-400 mt-2">
                    Tente pesquisar por outro nome ou email
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 mt-2">
                    Comece digitando o nome ou email do paciente
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {patients.map((patient: Patient) => (
                  <Card
                    key={patient.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      (currentPatient?.id || user?.id) === patient.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handlePatientSelect(patient)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={patient.photo || ""} alt={patient.name} />
                          <AvatarFallback>{patient.name.charAt(0)}</AvatarFallback>
                        </Avatar>

                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-900">{patient.name}</h4>
                            {(currentPatient?.id || user?.id) === patient.id && (
                              <Check className="w-4 h-4 text-blue-600" />
                            )}
                          </div>

                          <p className="text-sm text-gray-500">{patient.email}</p>

                          <div className="flex items-center gap-2 mt-1">
                            <Badge 
                              variant={patient.profileType === 'patient' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {patient.profileType === 'patient' ? 'Paciente' : 
                               patient.profileType === 'caregiver' ? 'Cuidador(a)' :
                               patient.profileType === 'doctor' ? 'Médico(a)' :
                               patient.profileType === 'family' ? 'Familiar' :
                               patient.profileType === 'nurse' ? 'Enfermagem' : 'Usuário'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>


    </>
  );
}