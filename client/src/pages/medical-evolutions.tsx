import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileText } from "lucide-react";
import BottomNavigation from "@/components/bottom-navigation";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMedicalQueries } from "@/hooks/use-medical-queries";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import MedicalEvolutionForm from "@/components/medical-evolution-form";
import MedicalEvolutionsList from "@/components/medical-evolutions-list";

interface MedicalEvolution {
  id: number;
  patientId: number;
  doctorId: number;
  doctorName: string;
  doctorCrm?: string;
  appointmentId?: number;
  chiefComplaint: string;
  currentIllnessHistory?: string;
  physicalExam?: string;
  vitalSigns?: string;
  diagnosticHypotheses?: string;
  therapeuticPlan?: string;
  prescribedMedications?: string;
  requestedExams?: string;
  generalRecommendations?: string;
  additionalObservations?: string;
  isConfirmed: boolean;
  digitalSignature?: string;
  createdAt: string;
  updatedAt: string;
}

export default function MedicalEvolutions() {
  const isMobile = useIsMobile();
  const [, navigate] = useLocation();
  
  const [showEvolutionForm, setShowEvolutionForm] = useState(false);
  const [editingEvolutionId, setEditingEvolutionId] = useState<number | null>(null);
  const [selectedEvolution, setSelectedEvolution] = useState<MedicalEvolution | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { enableMedicalQueries } = useMedicalQueries();

  // Get user from useAuth - same pattern as prescriptions
  const { user: currentUser } = useAuth();
  
  // Fix: Use the user from useAuth which has the correct profileType
  const userProfileType = currentUser?.profileType || 'patient';

  const { data: evolutions = [], isLoading: evolutionsLoading } = useQuery({
    queryKey: ["/api/medical-evolutions"],
    enabled: enableMedicalQueries,
  });

  // Medical Evolution Mutations
  const addEvolutionMutation = useMutation({
    mutationFn: async (evolutionData: any) => {
      const response = await apiRequest({
        url: "/api/medical-evolutions",
        method: "POST",
        data: evolutionData,
        on401: "throw"
      });
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/medical-evolutions"] });
      await queryClient.refetchQueries({ queryKey: ["/api/medical-evolutions"] });
      
      setShowEvolutionForm(false);
      setEditingEvolutionId(null);
      
      toast({
        title: "Evolução médica criada",
        description: "A evolução médica foi registrada com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao criar evolução médica. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const updateEvolutionMutation = useMutation({
    mutationFn: async ({ id, ...evolutionData }: any) => {
      const response = await apiRequest({
        url: `/api/medical-evolutions/${id}`,
        method: "PUT",
        data: evolutionData,
        on401: "throw"
      });
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/medical-evolutions"] });
      await queryClient.refetchQueries({ queryKey: ["/api/medical-evolutions"] });
      
      setShowEvolutionForm(false);
      setEditingEvolutionId(null);
      
      toast({
        title: "Evolução médica atualizada",
        description: "A evolução médica foi atualizada com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar evolução médica. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteEvolutionMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest({
        url: `/api/medical-evolutions/${id}`,
        method: "DELETE",
        on401: "throw"
      });
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/medical-evolutions"] });
      await queryClient.refetchQueries({ queryKey: ["/api/medical-evolutions"] });
      
      toast({
        title: "Evolução médica removida",
        description: "A evolução médica foi removida com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao remover evolução médica. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Medical Evolution Handlers
  const handleAddEvolution = () => {
    setSelectedEvolution(null);
    setEditingEvolutionId(null);
    setShowEvolutionForm(true);
  };

  const handleViewEvolution = (evolution: MedicalEvolution) => {
    setSelectedEvolution(evolution);
    setShowEvolutionForm(true);
    setEditingEvolutionId(null);
  };

  const handleEditEvolution = (evolution: MedicalEvolution) => {
    setSelectedEvolution(evolution);
    setEditingEvolutionId(evolution.id);
    setShowEvolutionForm(true);
  };

  const handleDeleteEvolution = (id: number, doctorName: string) => {
    if (window.confirm(`Tem certeza de que deseja remover a evolução médica criada por Dr(a). ${doctorName}?`)) {
      deleteEvolutionMutation.mutate(id);
    }
  };

  const handleSaveEvolution = (evolutionData: any) => {
    if (editingEvolutionId) {
      updateEvolutionMutation.mutate({ id: editingEvolutionId, ...evolutionData });
    } else {
      addEvolutionMutation.mutate(evolutionData);
    }
  };

  const handleCancelEvolution = () => {
    setShowEvolutionForm(false);
    setSelectedEvolution(null);
    setEditingEvolutionId(null);
  };

  if (evolutionsLoading) {
    return (
      <div className="mobile-container flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="mobile-container">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-40">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/home")}
              className="mr-3"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                {userProfileType === 'doctor' ? 'Evoluções Médicas' : 'Registros Médicos'}
              </h1>
              <p className="text-sm text-slate-500">
                {userProfileType === 'doctor' ? 'Gerencie evoluções médicas dos pacientes' : 'Visualize seus registros médicos'}
              </p>
            </div>
          </div>
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-slate-800">
                {Array.isArray(evolutions) ? evolutions.length : 0}
              </div>
              <div className="text-sm text-slate-600">Total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-slate-800">
                {Array.isArray(evolutions) ? evolutions.filter((e: MedicalEvolution) => e.isConfirmed).length : 0}
              </div>
              <div className="text-sm text-slate-600">Confirmadas</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-slate-800">
                {Array.isArray(evolutions) ? evolutions.filter((e: MedicalEvolution) => new Date(e.createdAt) >= new Date(new Date().setDate(new Date().getDate() - 30))).length : 0}
              </div>
              <div className="text-sm text-slate-600">Este Mês</div>
            </CardContent>
          </Card>
        </div>
      </header>

      <main className="pb-36 px-4 py-6">
        {/* Evolution Form */}
        {showEvolutionForm && (
          <div className="mb-6">
            <MedicalEvolutionForm
              evolution={selectedEvolution}
              onSave={handleSaveEvolution}
              onCancel={handleCancelEvolution}
              isSubmitting={addEvolutionMutation.isPending || updateEvolutionMutation.isPending}
              userProfileType={userProfileType}
              currentUser={currentUser}
            />
          </div>
        )}

        {/* Evolutions List */}
        {!showEvolutionForm && (
          <MedicalEvolutionsList
            evolutions={evolutions as MedicalEvolution[]}
            isLoading={evolutionsLoading}
            userProfileType={userProfileType}
            onAddEvolution={handleAddEvolution}
            onViewEvolution={handleViewEvolution}
            onEditEvolution={handleEditEvolution}
            onDeleteEvolution={handleDeleteEvolution}
          />
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}