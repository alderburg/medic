import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Search, Users, UserPlus, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";

interface Patient {
  id: number;
  name: string;
  email: string;
  age?: number;
  profileType: string;
}

interface PatientSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onPatientSelect?: (patient: Patient) => void;
}

export default function PatientSearch({ isOpen, onClose, onPatientSelect }: PatientSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();
  const { user, switchUser } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // OTIMIZAÇÃO CRÍTICA: Desabilitar carregamento automático para melhorar performance do login
  // Dados de pacientes só devem ser carregados quando explicitamente solicitados
  const accessiblePatients: Patient[] = [];
  const loadingPatients = false;

  // Search for patients by name or email
  const searchPatientsMutation = useMutation({
    mutationFn: async (searchQuery: string) => {
      if (!searchQuery.trim()) return [];
      const response = await api.get(`/api/users/search-patients?q=${encodeURIComponent(searchQuery)}`);
      return response.data.patients || [];
    },
    onSuccess: (data) => {
      setIsSearching(false);
    },
    onError: () => {
      setIsSearching(false);
      toast({
        title: "Erro na busca",
        description: "Erro ao buscar pacientes. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Switch to selected patient
  const handlePatientSelect = async (patient: Patient) => {
    try {
      await switchUser(patient.id);
      if (onPatientSelect) {
        onPatientSelect(patient);
      }
      onClose();
      // Navegar para a tela de visão geral após selecionar paciente
      setLocation('/visao-geral');
      toast({
        title: "Paciente selecionado",
        description: `Visualizando dados de ${patient.name}`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao selecionar paciente",
        variant: "destructive",
      });
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    if (value.trim().length >= 2) {
      setIsSearching(true);
      searchPatientsMutation.mutate(value.trim());
    }
  };

  const searchResults = searchPatientsMutation.data || [];
  const filteredAccessiblePatients = accessiblePatients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20">
      <Card className="w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden">
        <CardContent className="p-0">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Pesquisar Pacientes</h2>
                <p className="text-sm text-gray-600">Encontre pacientes que liberaram acesso para você</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Search Input */}
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Digite o nome ou email do paciente..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
                autoFocus
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                </div>
              )}
            </div>
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {/* Accessible Patients */}
            {filteredAccessiblePatients.length > 0 && (
              <div className="p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  Pacientes com Acesso Liberado ({filteredAccessiblePatients.length})
                </h3>
                <div className="space-y-2">
                  {filteredAccessiblePatients.map((patient: Patient) => (
                    <div
                      key={patient.id}
                      className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 cursor-pointer transition-colors"
                      onClick={() => handlePatientSelect(patient)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-green-700 font-medium text-sm">
                            {patient.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{patient.name}</p>
                          <p className="text-sm text-gray-600">{patient.email}</p>
                          {patient.age && (
                            <p className="text-xs text-gray-500">{patient.age} anos</p>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        Selecionar
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Search Results */}
            {searchTerm.trim().length >= 2 && searchResults.length > 0 && (
              <div className="p-4 border-t border-gray-100">
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Search className="w-4 h-4 text-blue-600" />
                  Resultados da Busca ({searchResults.length})
                </h3>
                <div className="space-y-2">
                  {searchResults.map((patient: Patient) => (
                    <div
                      key={patient.id}
                      className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-700 font-medium text-sm">
                            {patient.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{patient.name}</p>
                          <p className="text-sm text-gray-600">{patient.email}</p>
                          {patient.age && (
                            <p className="text-xs text-gray-500">{patient.age} anos</p>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        Sem acesso liberado
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty States */}
            {searchTerm.trim().length >= 2 && searchResults.length === 0 && !isSearching && (
              <div className="p-8 text-center">
                <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Nenhum paciente encontrado</p>
                <p className="text-sm text-gray-400 mt-1">
                  Tente buscar por outro nome ou email
                </p>
              </div>
            )}

            {filteredAccessiblePatients.length === 0 && searchTerm.trim().length < 2 && (
              <div className="p-8 text-center">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Digite para pesquisar pacientes</p>
                <p className="text-sm text-gray-400 mt-1">
                  Busque pelo nome ou email do paciente
                </p>
              </div>
            )}

            {loadingPatients && (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                <p className="text-gray-500">Carregando pacientes...</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}