import React, { useState, useEffect, useRef } from "react";
import { Search, User, Check, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import { usePatient } from "@/contexts/patient-context";

interface Patient {
  id: number;
  name: string;
  email: string;
  age?: number;
  profileType: string;
  photo?: string;
  weight?: number;
  whatsapp?: string;
}

interface PatientSearchInlineProps {
  onPatientSelect: (patient: Patient | null) => void;
}

export default function PatientSearchInline({ onPatientSelect }: PatientSearchInlineProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { trocarPacienteContexto, selectedPatient: currentPatient, limparContextoPaciente } = usePatient();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [accessiblePatients, setAccessiblePatients] = useState<Patient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPatientName, setLoadingPatientName] = useState("");
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [loadingProgress, setLoadingProgress] = useState("");
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync selected patient with context
  useEffect(() => {
    if (currentPatient) {
      setSelectedPatient(currentPatient);
      setSearchQuery(currentPatient.name);
    }
  }, [currentPatient]);

  // Função para focar no input de pesquisa
  const focusSearchInput = () => {
    if (inputRef.current) {
      inputRef.current.focus();
      setShowDropdown(true);
    }
  };

  // Expor a função via window para acesso externo
  useEffect(() => {
    (window as any).focusPatientSearch = focusSearchInput;
    return () => {
      delete (window as any).focusPatientSearch;
    };
  }, []);

  // Load accessible patients only when component is opened/focused
  // This improves login performance
  useEffect(() => {
    // Only load when dropdown is first opened
    if (showDropdown && accessiblePatients.length === 0) {
      loadAccessiblePatients();
    }
  }, [showDropdown]);

  // Handle search with debounce
  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      const timeoutId = setTimeout(() => {
        performSearch(searchQuery.trim());
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadAccessiblePatients = async () => {
    try {
      setIsLoading(true);
      const response = await api.get("/api/caregiver/patients");
      setAccessiblePatients(response.data.patients || []);
    } catch (error) {
      console.error("Error loading accessible patients:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const performSearch = async (query: string) => {
    try {
      setIsSearching(true);
      const response = await api.get(`/api/users/search-patients?q=${encodeURIComponent(query)}`);
      setSearchResults(response.data.patients || []);
    } catch (error) {
      console.error("Error searching patients:", error);
      toast({
        title: "Erro na Busca",
        description: "Não foi possível realizar a busca de pacientes.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handlePatientSelect = async (patient: Patient) => {
    try {
      // Show loading modal
      setLoadingPatientName(patient.name);
      setShowLoadingModal(true);
      setLoadingProgress("Carregando dados médicos...");

      // 🔁 USAR FUNÇÃO CENTRAL OTIMIZADA
      await trocarPacienteContexto(patient.id);

      // Update local UI state
      setSelectedPatient(patient);
      setShowDropdown(false);
      setSearchQuery(patient.name);

      // Call callback se fornecido
      onPatientSelect(patient);

      // Hide loading modal
      setShowLoadingModal(false);

      // 🚦 Navegar para visão geral - dados carregam on-demand
      setLocation("/visao-geral");

    } catch (error) {
      console.error("Error switching patient:", error);
      setShowLoadingModal(false);
      toast({
        title: "Erro",
        description: "Não foi possível acessar os dados do paciente.",
        variant: "destructive",
      });
    }
  };

  const handleReturnToOwnData = async () => {
    try {
      // Show loading modal
      setLoadingPatientName(user?.name || "usuário");
      setShowLoadingModal(true);
      setLoadingProgress("Voltando aos seus dados...");

      // Clear selected patient context (this will make system return to caregiver's own data)
      limparContextoPaciente();

      // Clear server-side context - use session cleanup instead of switch
      try {
        // Clear session context without switching to a specific patient
        if (user?.id) {
          await api.delete('/api/caregiver/clear-patient-context');
        }
      } catch (serverError) {
        // This is expected if endpoint doesn't exist - not critical for functionality
        console.debug('Server context cleanup not available, proceeding with client-side cleanup');
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

      // Update local UI state
      setSelectedPatient(null);
      setSearchQuery("");
      setShowDropdown(false);

      // Call callback to notify parent component
      onPatientSelect(null);

      // Hide loading modal
      setShowLoadingModal(false);

      // Navigate to home where caregiver's own data will load
      setLocation("/home");

      toast({
        title: "Dados Atualizados",
        description: "Voltando aos seus próprios dados médicos.",
      });

    } catch (error) {
      console.error("Error returning to own data:", error);
      setShowLoadingModal(false);
      toast({
        title: "Erro",
        description: "Não foi possível voltar aos seus dados.",
        variant: "destructive",
      });
    }
  };

  const handleInputFocus = () => {
    setShowDropdown(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowDropdown(true);

    // Não limpar o paciente selecionado quando o usuário digita ou apaga texto
    // O paciente só deve ser alterado quando outro paciente for explicitamente selecionado
  };

  // Filter accessible patients based on search query
  const filteredAccessiblePatients = searchQuery.trim().length >= 2 
    ? accessiblePatients.filter(patient =>
        patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : accessiblePatients;

  // Show dropdown if there are results or accessible patients
  const shouldShowDropdown = showDropdown && (
    filteredAccessiblePatients.length > 0 || 
    searchResults.length > 0 ||
    (searchQuery.trim().length >= 2 && isSearching)
  );

  return (
    <>
      {/* Loading Modal */}
      <Dialog open={showLoadingModal} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" hideCloseButton>
          <DialogTitle className="sr-only">Carregando Dados do Paciente</DialogTitle>
          <DialogDescription className="sr-only">
            Aguarde enquanto carregamos os dados do paciente selecionado
          </DialogDescription>
          <div className="flex flex-col items-center justify-center py-8 px-4">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Alternando Paciente
            </h3>
            <p className="text-sm text-gray-600 text-center">
              Carregando dados de <strong>{loadingPatientName}</strong>...
            </p>
            <div className="text-xs text-gray-500 mt-3 text-center">
              <p className="font-medium">{loadingProgress}</p>
            </div>
            <p className="text-xs text-gray-400 mt-4 text-center">
              Este processo pode levar alguns segundos...
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex items-center w-full gap-4">
        {/* Selected Patient Indicator - Left Side */}
        {selectedPatient && (
          <div className="flex items-center gap-3 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center overflow-hidden">
              {selectedPatient.photo ? (
                <img 
                  src={selectedPatient.photo} 
                  alt={selectedPatient.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-4 h-4 text-green-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{selectedPatient.name}</p>
              <p className="text-xs text-gray-500 truncate">{selectedPatient.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-green-600 font-medium">
                {selectedPatient.age} anos
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReturnToOwnData}
                className="h-6 w-6 p-0 hover:bg-red-100 text-red-600 hover:text-red-700"
                title="Voltar aos meus dados"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Spacer to push search to the right */}
        <div className="flex-1"></div>

        {/* Search Input - Right Side */}
        <div ref={searchRef} className="relative">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Buscar pacientes..."
              value={searchQuery}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              className="pl-10 pr-4 w-80 text-sm"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>

      {/* Dropdown Results */}
      {shouldShowDropdown && (
        <div className="absolute top-full left-0 w-96 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {/* Search Results Section - Only shows filtered results from search API */}
          {searchQuery.trim().length >= 2 && searchResults.length > 0 && (
            <div className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <Search className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-gray-700">
                  Pacientes ({searchResults.length})
                </span>
              </div>
              <div className="space-y-1">
                {searchResults.map((patient: Patient) => (
                  <div
                    key={patient.id}
                    className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded cursor-pointer hover:bg-green-100 transition-colors"
                    onClick={() => handlePatientSelect(patient)}
                  >
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center overflow-hidden">
                      {patient.photo ? (
                        <img 
                          src={patient.photo} 
                          alt={patient.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-5 h-5 text-green-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{patient.name}</p>
                      <p className="text-xs text-gray-500 truncate">{patient.email}</p>
                    </div>
                    <div className="text-xs text-green-600 font-medium shrink-0">
                      {patient.age} anos
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Loading State */}
          {isSearching && (
            <div className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                Buscando pacientes...
              </div>
            </div>
          )}

          {/* No Results */}
          {searchQuery.trim().length >= 2 && !isSearching && searchResults.length === 0 && (
            <div className="p-4 text-center text-sm text-gray-500">
              Nenhum paciente encontrado para "{searchQuery}"
            </div>
          )}

          {/* Empty State */}
          {searchQuery.trim().length < 2 && !isLoading && (
            <div className="p-4 text-center text-sm text-gray-500">
              Digite pelo menos 2 caracteres para buscar pacientes
            </div>
          )}
        </div>
      )}
        </div>
      </div>
    </>
  );
}