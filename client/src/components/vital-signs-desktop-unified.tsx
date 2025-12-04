import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Heart, Droplets, Activity, Thermometer, Weight, ArrowLeft, Filter, Trash2, Save, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DesktopPageHeader from "@/components/desktop-page-header";
import DeleteConfirmationModal from "@/components/delete-confirmation-modal";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useFormValidation, ValidationRules } from "@/hooks/use-form-validation";
import { ValidatedInput, ValidatedSelect, ValidatedTextarea } from "@/components/ui/validated-input";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMedicalQueries } from "@/hooks/use-medical-queries";
import { useLocation } from "wouter";

interface BloodPressureReading {
  id: number;
  systolic: number;
  diastolic: number;
  heartRate: number;
  notes?: string;
  measuredAt: string;
}

interface GlucoseReading {
  id: number;
  glucoseLevel: number;
  measurementType: string;
  notes?: string;
  measuredAt: string;
}

interface HeartRateReading {
  id: number;
  heartRate: number;
  measurementType: string;
  notes?: string;
  measuredAt: string;
}

interface TemperatureReading {
  id: number;
  temperature: number;
  method: string;
  notes?: string;
  measuredAt: string;
}

interface WeightReading {
  id: number;
  weight: number;
  notes?: string;
  measuredAt: string;
}

export default function VitalSignsDesktopUnified() {
  const getInitialTab = (): 'overview' | 'pressure' | 'glucose' | 'heart-rate' | 'temperature' | 'weight' => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam === 'pressure') return 'pressure';
    if (tabParam === 'glucose') return 'glucose';
    if (tabParam === 'heart-rate') return 'heart-rate';
    if (tabParam === 'temperature') return 'temperature';
    if (tabParam === 'weight') return 'weight';
    return 'overview';
  };

  const [activeTab, setActiveTab] = useState<'overview' | 'pressure' | 'glucose' | 'heart-rate' | 'temperature' | 'weight'>(getInitialTab());
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [readingToDelete, setReadingToDelete] = useState<number | null>(null);
  const [readingToDeleteName, setReadingToDeleteName] = useState<string>("");
  const [deletingReadingId, setDeletingReadingId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const isMobile = useIsMobile();
  const [, setLocation] = useLocation();
  const mountedRef = useRef(true);

  // Cleanup effect to prevent memory leaks and infinite loops
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Disable queries when not mounted or when switching tabs rapidly
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    // Small delay when changing tabs to prevent rapid query execution
    if (mountedRef.current) {
      timeout = setTimeout(() => {
        // This ensures queries are stable after tab changes
      }, 100);
    }
    
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [activeTab]);

  // Escutar mudanças no histórico do navegador
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      let newTab: 'overview' | 'pressure' | 'glucose' | 'heart-rate' | 'temperature' | 'weight' = 'overview';
      if (tabParam === 'pressure') newTab = 'pressure';
      else if (tabParam === 'glucose') newTab = 'glucose';
      else if (tabParam === 'heart-rate') newTab = 'heart-rate';
      else if (tabParam === 'temperature') newTab = 'temperature';
      else if (tabParam === 'weight') newTab = 'weight';
      setActiveTab(newTab);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Redirecionar para mobile quando mudar de desktop para mobile
  useEffect(() => {
    if (isMobile) {
      // Mapear abas do desktop para páginas mobile correspondentes
      const mobileRoutes = {
        'overview': '/vital-signs/pressure', // Aba geral abre pressão no mobile
        'pressure': '/vital-signs/pressure',
        'glucose': '/vital-signs/glucose',
        'heart-rate': '/vital-signs/heart-rate',
        'temperature': '/vital-signs/temperature',
        'weight': '/vital-signs/weight'
      };

      const targetRoute = mobileRoutes[activeTab];
      if (targetRoute) {
        setLocation(targetRoute);
      }
    }
  }, [isMobile, activeTab, setLocation]);

  // Helper function to format dates safely
  const formatDate = (dateValue: any) => {
    try {
      if (!dateValue) return "Data não disponível";

      // Tratar como string ISO e extrair componentes diretamente para evitar conversão de timezone
      const dateStr = dateValue.toString();
      if (dateStr.includes('T')) {
        // Extrair data e hora da string ISO
        const [datePart, timePart] = dateStr.split('T');
        const [year, month, day] = datePart.split('-');
        const [hour, minute] = timePart.substring(0, 5).split(':');
        return `${day}/${month}/${year} ${hour}:${minute}`;
      } else {
        // Fallback para conversão normal se não for ISO
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return "Data inválida";
        return format(date, "dd/MM/yyyy HH:mm", { locale: ptBR });
      }
    } catch (error) {
      return "Data inválida";
    }
  };

  // Form validation rules for each type
  const getValidationRules = (type: string) => {
    switch (type) {
      case 'pressure':
        return {
          systolic: { required: true, min: 60, max: 250, message: "Sistólica deve estar entre 60 e 250 mmHg" },
          diastolic: { required: true, min: 40, max: 150, message: "Diastólica deve estar entre 40 e 150 mmHg" },
          heartRate: { required: true, min: 30, max: 250, message: "Batimentos devem estar entre 30 e 250 bpm" },
          measuredAt: { required: true, message: "Data e hora são obrigatórias" }
        };
      case 'glucose':
        return {
          glucoseLevel: { required: true, min: 50, max: 600, message: "Glicose deve estar entre 50 e 600 mg/dL" },
          measurementType: { required: true, message: "Tipo de medição é obrigatório" },
          measuredAt: { required: true, message: "Data e hora são obrigatórias" }
        };
      case 'heart-rate':
        return {
          heartRate: { required: true, min: 30, max: 250, message: "Batimentos devem estar entre 30 e 250 bpm" },
          measurementType: { required: true, message: "Tipo de medição é obrigatório" },
          measuredAt: { required: true, message: "Data e hora são obrigatórias" }
        };
      case 'temperature':
        return {
          temperature: { required: true, min: 25, max: 50, message: "Temperatura deve estar entre 25°C e 50°C" },
          method: { required: true, message: "Método de medição é obrigatório" },
          measuredAt: { required: true, message: "Data e hora são obrigatórias" }
        };
      case 'weight':
        return {
          weight: { required: true, min: 1, max: 300, message: "Peso deve estar entre 1 e 300 kg" },
          measuredAt: { required: true, message: "Data e hora são obrigatórias" }
        };
      default:
        return {};
    }
  };

  const getInitialFormData = (type: string) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const defaultDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;

    switch (type) {
      case 'pressure':
        return {
          systolic: "",
          diastolic: "",
          heartRate: "",
          notes: "",
          measuredAt: defaultDateTime
        };
      case 'glucose':
        return {
          glucoseLevel: "",
          measurementType: "",
          notes: "",
          measuredAt: defaultDateTime
        };
      case 'heart-rate':
        return {
          heartRate: "",
          measurementType: "",
          notes: "",
          measuredAt: defaultDateTime
        };
      case 'temperature':
        return {
          temperature: "",
          method: "",
          notes: "",
          measuredAt: defaultDateTime
        };
      case 'weight':
        return {
          weight: "",
          notes: "",
          measuredAt: defaultDateTime
        };
      default:
        return {};
    }
  };

  const initialFormData = React.useMemo(() => getInitialFormData(activeTab), [activeTab]);
  const validationRules = React.useMemo(() => getValidationRules(activeTab), [activeTab]);

  const { formData, errors, updateField, validateForm, resetForm, setFormData } = useFormValidation(
    initialFormData,
    validationRules
  );

  // Close form when tab changes (always close, even during editing)
  const prevActiveTab = React.useRef(activeTab);
  React.useEffect(() => {
    if (prevActiveTab.current !== activeTab) {
      setShowAddForm(false);
      setEditingId(null);
      resetForm(); // Reset form data
      setCurrentPage(1); // Reset paginação ao mudar de aba
      setSearchTerm(""); // Reset busca ao mudar de aba
    }
    prevActiveTab.current = activeTab;
  }, [activeTab, resetForm]);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { enableMedicalQueries } = useMedicalQueries();

  // Add mutation for creating readings
  const addReadingMutation = useMutation({
    mutationFn: async (data: any) => {
      const endpoint = getApiEndpoint(activeTab);
      const response = await apiRequest({
        url: endpoint,
        method: "POST",
        data,
        on401: "throw"
      });
      return response.json();
    },
    onSuccess: async () => {
      // Aguardar a invalidação e refetch das queries
      const endpoint = getApiEndpoint(activeTab);
      await queryClient.invalidateQueries({ queryKey: [endpoint] });
      await queryClient.refetchQueries({ queryKey: [endpoint] });
      
      // Aguardar um delay para garantir que a lista foi atualizada
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Fechar formulário apenas após a lista ser atualizada
      resetForm();
      setShowAddForm(false);
      setEditingId(null);
      
      toast({
        title: "Sucesso",
        description: "Medição adicionada com sucesso"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao adicionar medição",
        variant: "destructive"
      });
    }
  });

  // Update mutation for editing readings
  const updateReadingMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const endpoint = getApiEndpoint(activeTab);
      const response = await apiRequest({
        url: `${endpoint}/${id}`,
        method: "PUT",
        data,
        on401: "throw"
      });
      return response.json();
    },
    onSuccess: async () => {
      // Aguardar a invalidação e refetch das queries
      const endpoint = getApiEndpoint(activeTab);
      await queryClient.invalidateQueries({ queryKey: [endpoint] });
      await queryClient.refetchQueries({ queryKey: [endpoint] });
      
      // Aguardar um delay para garantir que a lista foi atualizada
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Fechar formulário apenas após a lista ser atualizada
      resetForm();
      setShowAddForm(false);
      setEditingId(null);
      
      toast({
        title: "Sucesso",
        description: "Medição atualizada com sucesso"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar medição",
        variant: "destructive"
      });
    }
  });

  // Delete mutation
  const deleteReadingMutation = useMutation({
    mutationFn: async (id: number) => {
      setDeletingReadingId(id);
      const endpoint = getApiEndpoint(activeTab);
      const response = await apiRequest({
        url: `${endpoint}/${id}`,
        method: "DELETE",
        on401: "throw"
      });
      return response.json();
    },
    onSuccess: async () => {
      // Aguardar a invalidação e refetch das queries
      await queryClient.invalidateQueries({ queryKey: [getApiEndpoint(activeTab)] });
      await queryClient.refetchQueries({ queryKey: [getApiEndpoint(activeTab)] });
      
      // Aguardar um delay para garantir que a lista foi atualizada
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Fechar modal apenas após a lista ser atualizada
      setDeleteModalOpen(false);
      setReadingToDelete(null);
      
      setTimeout(() => {
        setDeletingReadingId(null);
      }, 1000);
      
      toast({
        title: "Sucesso",
        description: "Medição excluída com sucesso"
      });
    },
    onError: () => {
      setDeletingReadingId(null);
      setDeleteModalOpen(false);
      setReadingToDelete(null);
      toast({
        title: "Erro",
        description: "Erro ao excluir medição",
        variant: "destructive"
      });
    }
  });

  const getApiEndpoint = (tab: string) => {
    switch (tab) {
      case 'pressure':
        return '/api/vital-signs/blood-pressure';
      case 'glucose':
        return '/api/vital-signs/glucose';
      case 'heart-rate':
        return '/api/vital-signs/heart-rate';
      case 'temperature':
        return '/api/vital-signs/temperature';
      case 'weight':
        return '/api/vital-signs/weight';
      default:
        return '';
    }
  };

  // Only fetch data when component is mounted and prevent infinite loops
  // Overview tab needs all data, other tabs only need their specific data
  const shouldFetchAll = activeTab === 'overview';

  const { data: pressureReadings, isLoading: pressureLoading } = useQuery({
    queryKey: ["/api/vital-signs/blood-pressure"],
    queryFn: async () => {
      if (!mountedRef.current) return [];
      const response = await apiRequest({
        url: "/api/vital-signs/blood-pressure",
        method: "GET",
        on401: "throw"
      });
      return response.json();
    },
    enabled: enableMedicalQueries && mountedRef.current && (shouldFetchAll || activeTab === 'pressure'),
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    retry: false,
  });

  const { data: glucoseReadings, isLoading: glucoseLoading } = useQuery({
    queryKey: ["/api/vital-signs/glucose"],
    queryFn: async () => {
      if (!mountedRef.current) return [];
      const response = await apiRequest({
        url: "/api/vital-signs/glucose",
        method: "GET",
        on401: "throw"
      });
      return response.json();
    },
    enabled: enableMedicalQueries && mountedRef.current && (shouldFetchAll || activeTab === 'glucose'),
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    retry: false,
  });

  const { data: heartRateReadings, isLoading: heartRateLoading } = useQuery({
    queryKey: ["/api/vital-signs/heart-rate"],
    queryFn: async () => {
      if (!mountedRef.current) return [];
      const response = await apiRequest({
        url: "/api/vital-signs/heart-rate",
        method: "GET",
        on401: "throw"
      });
      return response.json();
    },
    enabled: enableMedicalQueries && mountedRef.current && (shouldFetchAll || activeTab === 'heart-rate'),
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    retry: false,
  });

  const { data: temperatureReadings, isLoading: temperatureLoading } = useQuery({
    queryKey: ["/api/vital-signs/temperature"],
    queryFn: async () => {
      if (!mountedRef.current) return [];
      const response = await apiRequest({
        url: "/api/vital-signs/temperature",
        method: "GET",
        on401: "throw"
      });
      return response.json();
    },
    enabled: enableMedicalQueries && mountedRef.current && (shouldFetchAll || activeTab === 'temperature'),
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    retry: false,
  });

  const { data: weightReadings, isLoading: weightLoading } = useQuery({
    queryKey: ["/api/vital-signs/weight"],
    queryFn: async () => {
      if (!mountedRef.current) return [];
      const response = await apiRequest({
        url: "/api/vital-signs/weight",
        method: "GET",
        on401: "throw"
      });
      return response.json();
    },
    enabled: enableMedicalQueries && mountedRef.current && (shouldFetchAll || activeTab === 'weight'),
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    retry: false,
  });

  // Check if any query is loading (for overview tab skeleton)
  const isLoading = pressureLoading || glucoseLoading || heartRateLoading || temperatureLoading || weightLoading;

  const getCurrentReadings = () => {
    let readings = [];

    switch (activeTab) {
      case 'pressure':
        readings = Array.isArray(pressureReadings) ? pressureReadings : [];
        break;
      case 'glucose':
        readings = Array.isArray(glucoseReadings) ? glucoseReadings : [];
        break;
      case 'heart-rate':
        readings = Array.isArray(heartRateReadings) ? heartRateReadings : [];
        break;
      case 'temperature':
        readings = Array.isArray(temperatureReadings) ? temperatureReadings : [];
        break;
      case 'weight':
        readings = Array.isArray(weightReadings) ? weightReadings : [];
        break;
      default:
        return [];
    }

    // Filtrar por termo de busca
    const filteredReadings = readings.filter((reading: any) => {
      if (!searchTerm) return true;

      const searchLower = searchTerm.toLowerCase();

      // Buscar por notas/observações
      if (reading.notes && reading.notes.toLowerCase().includes(searchLower)) {
        return true;
      }

      // Buscar por valores específicos de cada tipo
      switch (activeTab) {
        case 'pressure':
          return (
            reading.systolic?.toString().includes(searchLower) ||
            reading.diastolic?.toString().includes(searchLower) ||
            reading.heartRate?.toString().includes(searchLower)
          );
        case 'glucose':
          return (
            reading.glucoseLevel?.toString().includes(searchLower) ||
            reading.measurementType?.toLowerCase().includes(searchLower)
          );
        case 'heart-rate':
          return (
            reading.heartRate?.toString().includes(searchLower) ||
            reading.measurementType?.toLowerCase().includes(searchLower)
          );
        case 'temperature':
          return (
            reading.temperature?.toString().includes(searchLower) ||
            reading.measurementMethod?.toLowerCase().includes(searchLower) ||
            reading.method?.toLowerCase().includes(searchLower)
          );
        case 'weight':
          return reading.weight?.toString().includes(searchLower);
        default:
          return false;
      }
    });

    // Ordenar por data mais recente primeiro
    return filteredReadings.sort((a, b) => {
      const dateField = 'measuredAt';
      const dateA = new Date(a[dateField]);
      const dateB = new Date(b[dateField]);
      return dateB.getTime() - dateA.getTime();
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      const errorCount = Object.keys(errors).filter(key => errors[key]).length;
      toast({
        title: "Erro de validação",
        description: `Por favor, corrija ${errorCount} campo(s) antes de continuar`,
        variant: "destructive"
      });
      return;
    }

    const submitData = formatSubmitData();

    if (editingId) {
      updateReadingMutation.mutate({ id: editingId, data: submitData });
    } else {
      addReadingMutation.mutate(submitData);
    }
  };

  const formatSubmitData = () => {
    switch (activeTab) {
      case 'pressure':
        return {
          systolic: parseInt(formData.systolic),
          diastolic: parseInt(formData.diastolic),
          heartRate: parseInt(formData.heartRate),
          notes: formData.notes || null,
          measuredAt: formData.measuredAt
        };
      case 'glucose':
        return {
          glucoseLevel: parseFloat(formData.glucoseLevel),
          measurementType: formData.measurementType,
          notes: formData.notes || null,
          measuredAt: formData.measuredAt
        };
      case 'heart-rate':
        return {
          heartRate: parseInt(formData.heartRate),
          measurementType: formData.measurementType,
          notes: formData.notes || null,
          measuredAt: formData.measuredAt
        };
      case 'temperature':
        return {
          temperature: parseFloat(formData.temperature),
          measurementMethod: formData.method,
          notes: formData.notes || null,
          measuredAt: formData.measuredAt
        };
      case 'weight':
        return {
          weight: parseFloat(formData.weight),
          notes: formData.notes || null,
          measuredAt: formData.measuredAt
        };
      default:
        return {};
    }
  };

  const handleEdit = React.useCallback((reading: any) => {



    const dateField = 'measuredAt'; // All vital signs use measuredAt field

    // Handle date formatting preserving original timezone
    let formattedDate = '';
    try {
      const dateValue = reading[dateField] || reading.dateField;

      if (dateValue) {
        // Tratar a string como ISO e extrair os componentes diretamente
        const dateStr = dateValue.toString();
        if (dateStr.includes('T')) {
          // Se é uma string ISO válida, usar substring para extrair data/hora
          formattedDate = dateStr.substring(0, 16); // YYYY-MM-DDTHH:mm
        } else {
          // Se não é ISO, tentar converter normalmente
          const date = new Date(dateValue);
          if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`;
          } else {
            // Fallback to current date if invalid
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`;
          }
        }
      } else {
        // Fallback to current date if no date
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`;
      }
    } catch (error) {

      // Fallback to current date
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    let editData = {};

    // Use reading.type to determine which data to load
    const readingType = reading.type || activeTab;

    switch (readingType) {
      case 'pressure':
        editData = {
          systolic: reading.systolic?.toString() || '',
          diastolic: reading.diastolic?.toString() || '',
          heartRate: reading.heartRate?.toString() || '',
          notes: reading.notes || '',
          measuredAt: formattedDate
        };
        break;
      case 'glucose':
        editData = {
          glucoseLevel: reading.glucoseLevel?.toString() || '',
          measurementType: reading.measurementType || '',
          notes: reading.notes || '',
          measuredAt: formattedDate
        };
        break;
      case 'heart-rate':
        editData = {
          heartRate: reading.heartRate?.toString() || '',
          measurementType: reading.measurementType || '',
          notes: reading.notes || '',
          measuredAt: formattedDate
        };
        break;
      case 'temperature':
        editData = {
          temperature: reading.temperature?.toString() || '',
          method: reading.measurementMethod || reading.method || '',
          notes: reading.notes || '',
          measuredAt: formattedDate
        };
        break;
      case 'weight':
        editData = {
          weight: reading.weight?.toString() || '',
          notes: reading.notes || '',
          measuredAt: formattedDate
        };
        break;
    }



    // Set the form data directly with all the edit data
    setFormData(editData);
    setEditingId(reading.id);
    setShowAddForm(true); // Show the edit form
  }, [activeTab, setFormData]);

  const handleCancel = () => {
    resetForm();
    setShowAddForm(false);
    setEditingId(null);
  };

  const confirmDelete = () => {
    if (readingToDelete) {
      setDeletingReadingId(readingToDelete);
      deleteReadingMutation.mutate(readingToDelete);
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value, 10));
    setCurrentPage(1); // Reset para a primeira página ao mudar o número de itens por página
  };

  const getTabConfig = (tab: string) => {
    switch (tab) {
      case 'pressure':
        return {
          icon: Heart,
          label: "Pressão",
          color: "red",
          addLabel: "Nova Pressão",
          placeholder: "Pesquisar pressão..."
        };
      case 'glucose':
        return {
          icon: Droplets,
          label: "Glicose",
          color: "blue",
          addLabel: "Nova Glicose",
          placeholder: "Pesquisar glicose..."
        };
      case 'heart-rate':
        return {
          icon: Activity,
          label: "Batimentos",
          color: "rose",
          addLabel: "Nova Medição",
          placeholder: "Pesquisar batimentos..."
        };
      case 'temperature':
        return {
          icon: Thermometer,
          label: "Temperatura",
          color: "orange",
          addLabel: "Nova Temperatura",
          placeholder: "Pesquisar temperatura..."
        };
      case 'weight':
        return {
          icon: Weight,
          label: "Peso",
          color: "purple",
          addLabel: "Novo Peso",
          placeholder: "Pesquisar peso..."
        };
      default:
        return {
          icon: Activity,
          label: "Visão Geral",
          color: "gray",
          addLabel: "Nova Medição",
          placeholder: "Pesquisar..."
        };
    }
  };

  const translateMeasurementType = (type: string, category: 'glucose' | 'heartRate' | 'temperature') => {
    const translations = {
      glucose: {
        'fasting': 'Jejum',
        'post_meal': 'Pós-refeição',
        'random': 'Aleatório',
        'bedtime': 'Antes de dormir'
      },
      heartRate: {
        'resting': 'Repouso',
        'exercise': 'Exercício',
        'recovery': 'Recuperação'
      },
      temperature: {
        'oral': 'Oral',
        'rectal': 'Retal',
        'axillary': 'Axilar',
        'armpit': 'Axilar',
        'tympanic': 'Timpânica',
        'temporal': 'Temporal',
        'forehead': 'Testa',
        'ear': 'Ouvido'
      }
    };

    return translations[category][type] || type;
  };

  const renderOverviewContent = () => {
    // Show skeleton loading when any data is loading
    if (isLoading) {
      return (
        <div className="space-y-6">
          {/* Skeleton para cards de métricas - 5 cards no topo */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="h-4 bg-gray-200 rounded animate-pulse mb-2 w-16"></div>
                      <div className="h-8 bg-gray-200 rounded animate-pulse w-6"></div>
                    </div>
                    <div className="h-12 w-12 bg-gray-200 rounded-lg animate-pulse"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Skeleton para grid de 2 cards: Ações Rápidas e Medições Recentes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Skeleton para card Ações Rápidas */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-6 bg-gray-200 rounded animate-pulse w-32"></div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-full h-10 bg-gray-200 rounded animate-pulse"></div>
                ))}
              </CardContent>
            </Card>

            {/* Skeleton para card Medições Recentes */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-6 bg-gray-200 rounded animate-pulse w-40"></div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                        <div>
                          <div className="h-4 bg-gray-200 rounded animate-pulse w-20 mb-1"></div>
                          <div className="h-3 bg-gray-200 rounded animate-pulse w-28"></div>
                        </div>
                      </div>
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    const pressureCount = Array.isArray(pressureReadings) ? pressureReadings.length : 0;
    const glucoseCount = Array.isArray(glucoseReadings) ? glucoseReadings.length : 0;
    const heartRateCount = Array.isArray(heartRateReadings) ? heartRateReadings.length : 0;
    const temperatureCount = Array.isArray(temperatureReadings) ? temperatureReadings.length : 0;
    const weightCount = Array.isArray(weightReadings) ? weightReadings.length : 0;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => {
            setActiveTab('pressure');
            setShowAddForm(true);
          }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pressão</p>
                  <p className="text-2xl font-bold text-red-600">{pressureCount}</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-red-100 flex items-center justify-center">
                  <Heart className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => {
            setActiveTab('glucose');
            setShowAddForm(true);
          }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Glicose</p>
                  <p className="text-2xl font-bold text-blue-600">{glucoseCount}</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Droplets className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => {
            setActiveTab('heart-rate');
            setShowAddForm(true);
          }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Batimentos</p>
                  <p className="text-2xl font-bold text-rose-600">{heartRateCount}</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-rose-100 flex items-center justify-center">
                  <Activity className="h-6 w-6 text-rose-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => {
            setActiveTab('temperature');
            setShowAddForm(true);
          }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Temperatura</p>
                  <p className="text-2xl font-bold text-orange-600">{temperatureCount}</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Thermometer className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => {
            setActiveTab('weight');
            setShowAddForm(true);
          }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Peso</p>
                  <p className="text-2xl font-bold text-purple-600">{weightCount}</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Weight className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-blue-600" />
                Ações Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                className="w-full justify-start gap-2 bg-red-100 hover:bg-red-200 text-red-700 hover:text-red-800" 
                onClick={() => setActiveTab('pressure')}
              >
                <Heart className="h-4 w-4" />
                Ver Pressão Arterial
              </Button>
              <Button 
                className="w-full justify-start gap-2 bg-blue-100 hover:bg-blue-200 text-blue-700 hover:text-blue-800" 
                onClick={() => setActiveTab('glucose')}
              >
                <Droplets className="h-4 w-4" />
                Ver Glicemia
              </Button>
              <Button 
                className="w-full justify-start gap-2 bg-rose-100 hover:bg-rose-200 text-rose-700 hover:text-rose-800" 
                onClick={() => setActiveTab('heart-rate')}
              >
                <Activity className="h-4 w-4" />
                Ver Batimentos
              </Button>
              <Button 
                className="w-full justify-start gap-2 bg-orange-100 hover:bg-orange-200 text-orange-700 hover:text-orange-800" 
                onClick={() => setActiveTab('temperature')}
              >
                <Thermometer className="h-4 w-4" />
                Ver Temperatura
              </Button>
              <Button 
                className="w-full justify-start gap-2 bg-purple-100 hover:bg-purple-200 text-purple-700 hover:text-purple-800" 
                onClick={() => setActiveTab('weight')}
              >
                <Weight className="h-4 w-4" />
                Ver Peso
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-600" />
                Medições Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Últimas medições de todos os sinais vitais - ordenadas por data */}
                {(() => {
                  // Combinar todas as leituras em um array com ordenação
                  const allReadings = [];

                  // Adicionar leituras de pressão
                  if (Array.isArray(pressureReadings) && pressureReadings.length > 0) {
                    allReadings.push(...pressureReadings.map(reading => ({
                      ...reading,
                      type: 'pressure',
                      dateField: reading.measuredAt
                    })));
                  }

                  // Adicionar leituras de glicose
                  if (Array.isArray(glucoseReadings) && glucoseReadings.length > 0) {
                    allReadings.push(...glucoseReadings.map(reading => ({
                      ...reading,
                      type: 'glucose',
                      dateField: reading.measuredAt
                    })));
                  }

                  // Adicionar leituras de batimentos cardíacos
                  if (Array.isArray(heartRateReadings) && heartRateReadings.length > 0) {
                    allReadings.push(...heartRateReadings.map(reading => ({
                      ...reading,
                      type: 'heart-rate',
                      dateField: reading.measuredAt
                    })));
                  }

                  // Adicionar leituras de temperatura
                  if (Array.isArray(temperatureReadings) && temperatureReadings.length > 0) {
                    allReadings.push(...temperatureReadings.map(reading => ({
                      ...reading,
                      type: 'temperature',
                      dateField: reading.measuredAt
                    })));
                  }

                  // Adicionar leituras de peso
                  if (Array.isArray(weightReadings) && weightReadings.length > 0) {
                    allReadings.push(...weightReadings.map(reading => ({
                      ...reading,
                      type: 'weight',
                      dateField: reading.measuredAt
                    })));
                  }

                  // Ordenar por data mais recente e pegar os 5 mais recentes
                  const sortedReadings = allReadings.sort((a, b) => {
                    const dateA = new Date(a.dateField);
                    const dateB = new Date(b.dateField);
                    return dateB.getTime() - dateA.getTime();
                  }).slice(0, 5);

                  return sortedReadings.map((reading, index) => {
                    const formatDate = (dateString: string) => {
                      try {
                        if (!dateString) return "Data inválida";

                        // Tratar como string ISO e extrair componentes diretamente para evitar conversão de timezone
                        const dateStr = dateString.toString();
                        if (dateStr.includes('T')) {
                          // Extrair data e hora da string ISO
                          const [datePart, timePart] = dateStr.split('T');
                          const [year, month, day] = datePart.split('-');
                          const [hour, minute] = timePart.substring(0, 5).split(':');
                          return `${day}/${month} às ${hour}:${minute}`;
                        } else {
                          // Fallback para conversão normal se não for ISO
                          const date = new Date(dateString);
                          if (isNaN(date.getTime())) return "Data inválida";
                          return format(date, "dd/MM 'às' HH:mm", { locale: ptBR });
                        }
                      } catch (error) {
                        return "Data inválida";
                      }
                    };

                    switch (reading.type) {
                      case 'pressure':
                        return (
                          <div key={`pressure-${reading.id}-${index}`} className="flex items-center justify-between p-3 bg-red-50 rounded-lg cursor-pointer hover:bg-red-100 transition-colors" onClick={() => {
                            // Mudar a aba e abrir o formulário imediatamente
                            setActiveTab('pressure');
                            handleEdit(reading);
                          }}>
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                                <Heart className="w-4 h-4 text-red-600" />
                              </div>
                              <div>
                                <div className="font-medium text-sm">{reading.systolic}/{reading.diastolic} mmHg</div>
                                <div className="text-xs text-gray-500">Pressão Arterial • {reading.heartRate ? `${reading.heartRate} bpm` : 'Sem registro de BPM'}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge variant="secondary" className="text-xs">
                                {formatDate(reading.measuredAt || reading.dateField)}
                              </Badge>
                            </div>
                          </div>
                        );

                      case 'glucose':
                        return (
                          <div key={`glucose-${reading.id}-${index}`} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors" onClick={() => {
                            // Mudar a aba e abrir o formulário imediatamente
                            setActiveTab('glucose');
                            handleEdit(reading);
                          }}>
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <Droplets className="w-4 h-4 text-blue-600" />
                              </div>
                              <div>
                                <div className="font-medium text-sm">{reading.glucoseLevel} mg/dL</div>
                                <div className="text-xs text-gray-500">Glicemia • {translateMeasurementType(reading.measurementType, 'glucose')}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge variant="secondary" className="text-xs">
                                {formatDate(reading.dateField)}
                              </Badge>
                            </div>
                          </div>
                        );

                      case 'heart-rate':
                        return (
                          <div key={`heart-rate-${reading.id}-${index}`} className="flex items-center justify-between p-3 bg-rose-50 rounded-lg cursor-pointer hover:bg-rose-100 transition-colors" onClick={() => {
                            // Mudar a aba e abrir o formulário imediatamente
                            setActiveTab('heart-rate');
                            handleEdit(reading);
                          }}>
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-rose-100 rounded-full flex items-center justify-center">
                                <Activity className="w-4 h-4 text-rose-600" />
                              </div>
                              <div>
                                <div className="font-medium text-sm">{reading.heartRate || 'N/A'} bpm</div>
                                <div className="text-xs text-gray-500">Batimentos Cardíacos • {translateMeasurementType(reading.measurementType, 'heartRate')}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge variant="secondary" className="text-xs">
                                {formatDate(reading.dateField)}
                              </Badge>
                            </div>
                          </div>
                        );

                      case 'temperature':
                        return (
                          <div key={`temperature-${reading.id}-${index}`} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg cursor-pointer hover:bg-orange-100 transition-colors" onClick={() => {
                            // Mudar a aba e abrir o formulário imediatamente
                            setActiveTab('temperature');
                            handleEdit(reading);
                          }}>
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                                <Thermometer className="w-4 h-4 text-orange-600" />
                              </div>
                              <div>
                                <div className="font-medium text-sm">{reading.temperature}°C</div>
                                <div className="text-xs text-gray-500">Temperatura • {(reading.measurementMethod || reading.method) ? translateMeasurementType(reading.measurementMethod || reading.method, 'temperature') : 'Método não especificado'}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge variant="secondary" className="text-xs">
                                {formatDate(reading.dateField)}
                              </Badge>
                            </div>
                          </div>
                        );

                      case 'weight':
                        return (
                          <div key={`weight-${reading.id}-${index}`} className="flex items-center justify-between p-3 bg-violet-50 rounded-lg cursor-pointer hover:bg-violet-100 transition-colors" onClick={() => {
                            // Mudar a aba e abrir o formulário imediatamente
                            setActiveTab('weight');
                            handleEdit(reading);
                          }}>
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center">
                                <Weight className="w-4 h-4 text-violet-600" />
                              </div>
                              <div>
                                <div className="font-medium text-sm">{reading.weight} kg</div>
                                <div className="text-xs text-gray-500">Peso Corporal</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge variant="secondary" className="text-xs">
                                {formatDate(reading.dateField)}
                              </Badge>
                            </div>
                          </div>
                        );

                      default:
                        return null;
                    }
                  });
                })()}

                {/* Mensagem quando não há dados */}
                {(!Array.isArray(pressureReadings) || pressureReadings.length === 0) &&
                 (!Array.isArray(glucoseReadings) || glucoseReadings.length === 0) &&
                 (!Array.isArray(heartRateReadings) || heartRateReadings.length === 0) &&
                 (!Array.isArray(temperatureReadings) || temperatureReadings.length === 0) &&
                 (!Array.isArray(weightReadings) || weightReadings.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Nenhuma medição registrada ainda</p>
                    <p className="text-sm mt-1">Comece registrando seus sinais vitais</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const renderEditForm = () => {
    const config = getTabConfig(activeTab);
    const isLoading = addReadingMutation.isPending || updateReadingMutation.isPending;

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  {config.icon && React.createElement(config.icon, { className: "h-5 w-5 text-red-600" })}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {editingId ? `Editar ${config.label}` : `Nova ${config.label}`}
                  </h2>
                  <p className="text-sm text-gray-600">
                    Preencha as informações da medição
                  </p>
                </div>
              </div>
              <Button 
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={isLoading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
            {activeTab === 'pressure' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <ValidatedInput
                    label="Sistólica (mmHg)"
                    placeholder="Ex: 120"
                    value={formData.systolic || ""}
                    onChange={(e) => updateField('systolic', e.target.value)}
                    error={errors.systolic}
                    type="number"
                    min="60"
                    max="250"
                    required
                  />
                  <ValidatedInput
                    label="Diastólica (mmHg)"
                    placeholder="Ex: 80"
                    value={formData.diastolic || ""}
                    onChange={(e) => updateField('diastolic', e.target.value)}
                    error={errors.diastolic}
                    type="number"
                    min="40"
                    max="150"
                    required
                  />
                  <ValidatedInput
                    label="Batimentos (bpm)"
                    placeholder="Ex: 72"
                    value={formData.heartRate || ""}
                    onChange={(e) => updateField('heartRate', e.target.value)}
                    error={errors.heartRate}
                    type="number"
                    min="30"
                    max="250"
                    required
                  />
                  <ValidatedInput
                    label="Data e hora da medição"
                    type="datetime-local"
                    value={formData.measuredAt || ""}
                    onChange={(e) => updateField('measuredAt', e.target.value)}
                    error={errors.measuredAt}
                    required
                  />
                </div>
                <div>
                  <ValidatedTextarea
                    label="Observações"
                    placeholder="Observações sobre a medição..."
                    value={formData.notes || ""}
                    onChange={(e) => updateField('notes', e.target.value)}
                    error={errors.notes}
                    rows={3}
                  />
                </div>
              </>
            )}

            {activeTab === 'glucose' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <ValidatedInput
                    label="Glicose (mg/dL)"
                    placeholder="Ex: 120"
                    value={formData.glucoseLevel || ""}
                    onChange={(e) => updateField('glucoseLevel', e.target.value)}
                    error={errors.glucoseLevel}
                    type="number"
                    min="50"
                    max="600"
                    required
                  />
                  <ValidatedSelect
                    label="Período"
                    value={formData.measurementType || ""}
                    onValueChange={(value) => updateField('measurementType', value)}
                    error={errors.measurementType}
                    placeholder="Selecione o período"
                    required
                    options={[
                      { value: "fasting", label: "Jejum" },
                      { value: "post_meal", label: "Pós-refeição" },
                      { value: "random", label: "Aleatório" },
                      { value: "bedtime", label: "Antes de dormir" }
                    ]}
                  />
                  <ValidatedInput
                    label="Data e hora da medição"
                    type="datetime-local"
                    value={formData.measuredAt || ""}
                    onChange={(e) => updateField('measuredAt', e.target.value)}
                    error={errors.measuredAt}
                    required
                  />
                </div>
                <div>
                  <ValidatedTextarea
                    label="Observações"
                    placeholder="Observações sobre a medição..."
                    value={formData.notes || ""}
                    onChange={(e) => updateField('notes', e.target.value)}
                    error={errors.notes}
                    rows={3}
                  />
                </div>
              </>
            )}

            {activeTab === 'heart-rate' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <ValidatedInput
                    label="Batimentos (bpm)"
                    placeholder="Ex: 72"
                    value={formData.heartRate || ""}
                    onChange={(e) => updateField('heartRate', e.target.value)}
                    error={errors.heartRate}
                    type="number"
                    min="30"
                    max="250"
                    required
                  />
                  <ValidatedSelect
                    label="Tipo de Medição"
                    value={formData.measurementType || ""}
                    onValueChange={(value) => updateField('measurementType', value)}
                    error={errors.measurementType}
                    placeholder="Selecione o tipo"
                    required
                    options={[
                      { value: "resting", label: "Repouso" },
                      { value: "exercise", label: "Exercício" },
                      { value: "recovery", label: "Recuperação" }
                    ]}
                  />
                  <ValidatedInput
                    label="Data e hora da medição"
                    type="datetime-local"
                    value={formData.measuredAt || ""}
                    onChange={(e) => updateField('measuredAt', e.target.value)}
                    error={errors.measuredAt}
                    required
                  />
                </div>
                <div>
                  <ValidatedTextarea
                    label="Observações"
                    placeholder="Observações sobre a medição..."
                    value={formData.notes || ""}
                    onChange={(e) => updateField('notes', e.target.value)}
                    error={errors.notes}
                    rows={3}
                  />
                </div>
              </>
            )}

            {activeTab === 'temperature' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <ValidatedInput
                    label="Temperatura (°C)"
                    placeholder="Ex: 37.2"
                    value={formData.temperature || ""}
                    onChange={(e) => updateField('temperature', e.target.value)}
                    error={errors.temperature}
                    type="number"
                    min="25"
                    max="50"
                    step="0.1"
                    required
                  />
                  <ValidatedSelect
                    label="Método de Medição"
                    value={formData.method || ""}
                    onValueChange={(value) => updateField('method', value)}
                    error={errors.method}
                    placeholder="Selecione o método"
                    required
                    options={[
                      { value: "oral", label: "Oral" },
                      { value: "rectal", label: "Retal" },
                      { value: "axillary", label: "Axilar" },
                      { value: "tympanic", label: "Timpânica" },
                      { value: "temporal", label: "Temporal" },
                      { value: "forehead", label: "Testa" },
                      { value: "ear", label: "Ouvido" }
                    ]}
                  />
                  <ValidatedInput
                    label="Data e hora da medição"
                    type="datetime-local"
                    value={formData.measuredAt || ""}
                    onChange={(e) => updateField('measuredAt', e.target.value)}
                    error={errors.measuredAt}
                    required
                  />
                </div>
                <div>
                  <ValidatedTextarea
                    label="Observações"
                    placeholder="Observações sobre a medição..."
                    value={formData.notes || ""}
                    onChange={(e) => updateField('notes', e.target.value)}
                    error={errors.notes}
                    rows={3}
                  />
                </div>
              </>
            )}

            {activeTab === 'weight' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ValidatedInput
                    label="Peso (kg)"
                    placeholder="Ex: 75.5"
                    value={formData.weight || ""}
                    onChange={(e) => updateField('weight', e.target.value)}
                    error={errors.weight}
                    type="number"
                    min="1"
                    max="300"
                    step="0.1"
                    required
                  />
                  <ValidatedInput
                    label="Data e hora da medição"
                    type="datetime-local"
                    value={formData.measuredAt || ""}
                    onChange={(e) => updateField('measuredAt', e.target.value)}
                    error={errors.measuredAt}
                    required
                  />
                </div>
                <div>
                  <ValidatedTextarea
                    label="Observações"
                    placeholder="Observações sobre a medição..."
                    value={formData.notes || ""}
                    onChange={(e) => updateField('notes', e.target.value)}
                    error={errors.notes}
                    rows={3}
                  />
                </div>
              </>
            )}

            {/* Botões de Ação */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {editingId ? 'Atualizar Medição' : 'Salvar Medição'}
                  </>
                )}
              </Button>
            </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderTabContent = () => {
    const config = getTabConfig(activeTab);

    // Show form when adding or editing
    if (showAddForm || editingId) {
      return renderEditForm();
    }

    // Show skeleton loading for individual tabs
    const isTabLoading = () => {
      switch (activeTab) {
        case 'pressure':
          return pressureLoading;
        case 'glucose':
          return glucoseLoading;
        case 'heart-rate':
          return heartRateLoading;
        case 'temperature':
          return temperatureLoading;
        case 'weight':
          return weightLoading;
        default:
          return false;
      }
    };

    if (isTabLoading()) {
      return (
        <div className="space-y-4">
          {/* Skeleton para lista de medições */}
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 bg-gray-200 rounded-full animate-pulse`}></div>
                    <div>
                      <div className="h-5 bg-gray-200 rounded animate-pulse w-24 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-32 mb-1"></div>
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-20"></div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Skeleton para paginação */}
          <div className="flex flex-row gap-4 items-center justify-between bg-slate-50 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-32 hidden sm:block"></div>
              <div className="h-10 w-20 bg-gray-200 rounded animate-pulse"></div>
            </div>

            <div className="flex items-center gap-2">
              <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div>
              <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      );
    }

    const readings = getCurrentReadings();

    // Cálculos de paginação
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedReadings = readings.slice(startIndex, endIndex);
    const totalPages = Math.ceil(readings.length / itemsPerPage);

    if (readings.length === 0) {
      return (
        <div className="text-center py-12">
          <div className={`w-16 h-16 bg-${config.color}-100 rounded-full flex items-center justify-center mx-auto mb-4`}>
            <config.icon className={`w-8 h-8 text-${config.color}-600`} />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhuma medição de {config.label.toLowerCase()} encontrada
          </h3>
          <p className="text-gray-500 mb-6">
            {searchTerm ? 'Nenhuma medição encontrada com esses critérios' : `Comece registrando sua primeira medição de ${config.label.toLowerCase()}`}
          </p>
          <Button 
            onClick={() => setShowAddForm(true)}
            className={`bg-${config.color}-600 hover:bg-${config.color}-700`}
          >
            <Plus className="w-4 h-4 mr-2" />
            {config.addLabel}
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          {paginatedReadings.map((reading: any) => (
            <Card key={reading.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleEdit(reading)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 bg-${config.color}-100 rounded-full flex items-center justify-center`}>
                      <config.icon className={`w-5 h-5 text-${config.color}-600`} />
                    </div>
                    <div>
                      <div className="font-semibold">
                        {activeTab === 'pressure' && `${reading.systolic}/${reading.diastolic} mmHg`}
                        {activeTab === 'glucose' && `${reading.glucoseLevel} mg/dL`}
                        {activeTab === 'heart-rate' && `${reading.heartRate || 'N/A'} bpm`}
                        {activeTab === 'temperature' && `${reading.temperature}°C`}
                        {activeTab === 'weight' && `${reading.weight} kg`}
                      </div>
                      <div className="text-sm text-gray-600">
                        {activeTab === 'pressure' && `Batimentos: ${reading.heartRate ? `${reading.heartRate} bpm` : 'Não registrado'}`}
                        {activeTab === 'glucose' && `Período: ${translateMeasurementType(reading.measurementType, 'glucose')}`}
                        {activeTab === 'heart-rate' && `Tipo: ${translateMeasurementType(reading.measurementType, 'heartRate')}`}
                        {activeTab === 'temperature' && `Método: ${translateMeasurementType(reading.measurementMethod || reading.method, 'temperature')}`}
                        {activeTab === 'weight' && 'Peso corporal'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {(() => {
                          try {
                            const dateField = reading.measuredAt;
                            if (!dateField) return "Data não disponível";

                            // Tratar como string ISO e extrair componentes diretamente para evitar conversão de timezone
                            const dateStr = dateField.toString();
                            if (dateStr.includes('T')) {
                              // Extrair data e hora da string ISO
                              const [datePart, timePart] = dateStr.split('T');
                              const [year, month, day] = datePart.split('-');
                              const [hour, minute] = timePart.substring(0, 5).split(':');
                              return `${day}/${month}/${year} às ${hour}:${minute}`;
                            } else {
                              // Fallback para conversão normal se não for ISO
                              const date = new Date(dateField);
                              if (isNaN(date.getTime())) return "Data inválida";
                              return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
                            }
                          } catch (error) {
                            return "Data inválida";
                          }
                        })()}
                      </div>
                      {reading.notes && (
                        <p className="text-xs text-gray-500 mt-1">Observações: {reading.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        setReadingToDelete(reading.id);
                        setReadingToDeleteName(
                          activeTab === 'pressure' ? `${reading.systolic}/${reading.diastolic} mmHg` :
                          activeTab === 'glucose' ? `${reading.glucoseLevel} mg/dL` :
                          activeTab === 'heart-rate' ? `${reading.heartRate || 'N/A'} bpm` :
                          activeTab === 'temperature' ? `${reading.temperature}°C` :
                          activeTab === 'weight' ? `${reading.weight} kg` : 'Medição'
                        );
                        setDeleteModalOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Paginação */}
        {readings.length > 0 && (
          <div className="flex flex-row gap-4 items-center justify-between bg-slate-50 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <Label htmlFor="itemsPerPage" className="text-sm font-medium text-slate-600 hidden sm:block">
                Itens por página:
              </Label>
              <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Paginação Previous/Next */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1 || totalPages === 0}
                className="flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Anterior</span>
              </Button>

              <span className="text-sm text-slate-600 px-3">
                {totalPages === 0 ? "0 de 0" : `${currentPage} de ${totalPages}`}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="flex items-center gap-1"
              >
                <span className="hidden sm:inline">Próxima</span>
                <ChevronRight className="w-4 h-4 sm:ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={(value: any) => {
          setActiveTab(value);
          // Atualizar a URL sem recarregar a página
          const url = new URL(window.location.href);
          if (value === 'pressure') {
            url.searchParams.set('tab', 'pressure');
          } else if (value === 'glucose') {
            url.searchParams.set('tab', 'glucose');
          } else if (value === 'heart-rate') {
            url.searchParams.set('tab', 'heart-rate');
          } else if (value === 'temperature') {
            url.searchParams.set('tab', 'temperature');
          } else if (value === 'weight') {
            url.searchParams.set('tab', 'weight');
          } else {
            url.searchParams.delete('tab');
          }
          window.history.pushState({}, '', url.toString());
        }} className="h-full flex flex-col">
          <div className="border-b border-gray-200 px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <TabsList className="h-12">
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Visão Geral
                </TabsTrigger>
                <TabsTrigger value="pressure" className="flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  Pressão
                </TabsTrigger>
                <TabsTrigger value="glucose" className="flex items-center gap-2">
                  <Droplets className="h-4 w-4" />
                  Glicose
                </TabsTrigger>
                <TabsTrigger value="heart-rate" className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Batimentos
                </TabsTrigger>
                <TabsTrigger value="temperature" className="flex items-center gap-2">
                  <Thermometer className="h-4 w-4" />
                  Temperatura
                </TabsTrigger>
                <TabsTrigger value="weight" className="flex items-center gap-2">
                  <Weight className="h-4 w-4" />
                  Peso
                </TabsTrigger>
              </TabsList>

              {activeTab !== 'overview' && (
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder={getTabConfig(activeTab).placeholder}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-80"
                    />
                  </div>
                  <Button 
                    onClick={() => setShowAddForm(true)} 
                    disabled={showAddForm || editingId !== null}
                    className={`bg-${getTabConfig(activeTab).color}-600 hover:bg-${getTabConfig(activeTab).color}-700`}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {getTabConfig(activeTab).addLabel}
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <TabsContent value="overview" className="h-full m-0">
              <div className="p-6">
                {renderOverviewContent()}
              </div>
            </TabsContent>

            <TabsContent value="pressure" className="h-full m-0">
              <div className="p-6">
                {renderTabContent()}
              </div>
            </TabsContent>

            <TabsContent value="glucose" className="h-full m-0">
              <div className="p-6">
                {renderTabContent()}
              </div>
            </TabsContent>

            <TabsContent value="heart-rate" className="h-full m-0">
              <div className="p-6">
                {renderTabContent()}
              </div>
            </TabsContent>

            <TabsContent value="temperature" className="h-full m-0">
              <div className="p-6">
                {renderTabContent()}
              </div>
            </TabsContent>

            <TabsContent value="weight" className="h-full m-0">
              <div className="p-6">
                {renderTabContent()}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirm={confirmDelete}
        title="Excluir Medição"
        description={<>Tem certeza que deseja excluir a medição <strong>{readingToDeleteName}</strong>?</>}
        loading={deletingReadingId !== null}
      />
    </div>
  );
}