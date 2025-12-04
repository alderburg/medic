import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ValidatedInput, ValidatedTextarea } from "@/components/ui/validated-input";
import { Search, Plus, Calendar, Clock, MapPin, User, Save, X, Trash2, ArrowLeft, Filter, AlertCircle, CheckCircle, XCircle, Timer, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import BottomNavigation from "@/components/bottom-navigation";
import DeleteConfirmationModal from "@/components/delete-confirmation-modal";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMedicalQueries } from "@/hooks/use-medical-queries";
import { useAuth } from "@/hooks/use-auth";
import { usePatientRequired } from "@/hooks/use-patient-required";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useFormValidation, ValidationRules } from "@/hooks/use-form-validation";
import AppointmentsDesktop from "@/components/appointments-desktop";
import MedicalEvolutionForm from "@/components/medical-evolution-form";
import MedicalEvolutionsList from "@/components/medical-evolutions-list";

interface Appointment {
  id: number;
  title: string;
  doctorName: string;
  appointmentDate: string;
  location: string;
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

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

export default function Appointments() {
  const isMobile = useIsMobile();
  const { shouldShowPage, isRedirecting } = usePatientRequired();

  // Se está redirecionando ou não deve mostrar a página
  if (isRedirecting || !shouldShowPage) {
    return null;
  }

  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<'appointments' | 'evolutions'>('appointments');
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'completed' | 'cancelled' | 'missed'>('all');
  const [dateFilter, setDateFilter] = useState<'today' | '7d' | '30d' | '90d' | 'custom'>('30d');
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEvolutionForm, setShowEvolutionForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingEvolutionId, setEditingEvolutionId] = useState<number | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState<number | null>(null);
  const [appointmentToDeleteName, setAppointmentToDeleteName] = useState<string>("");
  const [deletingAppointmentId, setDeletingAppointmentId] = useState<number | null>(null);
  const [confirmingAppointmentId, setConfirmingAppointmentId] = useState<number | null>(null);
  const [confirmingAction, setConfirmingAction] = useState<'completed' | 'cancelled' | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const initialFormData = {
    title: "",
    doctorName: "",
    appointmentDate: "",
    appointmentTime: "",
    location: "",
    notes: "",
  };

  const initialEvolutionData = {
    patientId: 0,
    chiefComplaint: "",
    currentIllnessHistory: "",
    physicalExam: "",
    vitalSigns: "",
    diagnosticHypotheses: "",
    therapeuticPlan: "",
    prescribedMedications: "",
    requestedExams: "",
    generalRecommendations: "",
    additionalObservations: "",
    doctorCrm: "",
    appointmentId: null,
  };

  // Sistema de validação
  const validationRules: ValidationRules = {
    title: {
      required: true,
      minLength: 2,
      message: "Título da consulta é obrigatório (mínimo 2 caracteres)"
    },
    doctorName: {
      required: true,
      minLength: 2,
      message: "Nome do médico é obrigatório (mínimo 2 caracteres)"
    },
    appointmentDate: {
      required: true,
      message: "Data da consulta é obrigatória"
    },
    appointmentTime: {
      required: true,
      message: "Horário da consulta é obrigatório"
    },
    location: {
      required: false,
      minLength: 2,
      message: "Local deve ter pelo menos 2 caracteres"
    }
  };

  const { formData, updateField, errors, validateForm, resetForm: resetValidationForm } = useFormValidation(initialFormData, validationRules);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { enableMedicalQueries } = useMedicalQueries();

  // Return desktop version if not mobile
  if (!isMobile) {
    return <AppointmentsDesktop />;
  }

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["/api/appointments"],
    enabled: enableMedicalQueries,
  });

  const { data: evolutions = [], isLoading: evolutionsLoading } = useQuery({
    queryKey: ["/api/medical-evolutions"],
    enabled: enableMedicalQueries && activeTab === 'evolutions',
  });

  // Get user from useAuth instead of separate query
  const { user: currentUser } = useAuth();
  
  // Fix: Use the user from useAuth which has the correct profileType
  const userProfileType = currentUser?.profileType || 'patient';

  const addAppointmentMutation = useMutation({
    mutationFn: async (appointmentData: any) => {
      const response = await apiRequest({
        url: "/api/appointments",
        method: "POST",
        data: appointmentData,
        on401: "throw"
      });
      return response.json();
    },
    onSuccess: async () => {
      // Aguardar a invalidação e refetch das queries
      await queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      await queryClient.refetchQueries({ queryKey: ["/api/appointments"] });

      // Aguardar um delay para garantir que a lista foi atualizada
      await new Promise(resolve => setTimeout(resolve, 500));

      // Fechar formulário apenas após a lista ser atualizada
      setShowAddForm(false);
      resetForm();

      toast({
        title: "Consulta agendada",
        description: "A consulta foi agendada com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao agendar consulta. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: async ({ id, ...appointmentData }: any) => {
      const response = await apiRequest({
        url: `/api/appointments/${id}`,
        method: "PUT",
        data: appointmentData,
        on401: "throw"
      });
      return response.json();
    },
    onSuccess: async () => {
      // Aguardar a invalidação e refetch das queries
      await queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      await queryClient.refetchQueries({ queryKey: ["/api/appointments"] });

      // Aguardar um delay para garantir que a lista foi atualizada
      await new Promise(resolve => setTimeout(resolve, 500));

      // Fechar formulário apenas após a lista ser atualizada
      setShowAddForm(false);
      resetForm();

      toast({
        title: "Consulta atualizada",
        description: "A consulta foi atualizada com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar consulta. Tente novamente.",
        variant: "destructive",
      });
    },
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

  const confirmAppointmentMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: 'completed' | 'cancelled' }) => {
      setConfirmingAppointmentId(id);
      setConfirmingAction(status);
      const response = await apiRequest({
        url: `/api/appointments/${id}`,
        method: "PUT",
        data: { status },
        on401: "throw"
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Força a atualização imediata dos dados
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.refetchQueries({ queryKey: ["/api/appointments"] });

      // Aguardar mais tempo para garantir que o item seja completamente atualizado
      setTimeout(() => {
        setConfirmingAppointmentId(null);
        setConfirmingAction(null);
      }, 1500);
      toast({
        title: variables.status === 'completed' ? "Consulta confirmada" : "Consulta cancelada",
        description: variables.status === 'completed' 
          ? "A consulta foi marcada como realizada." 
          : "A consulta foi marcada como cancelada.",
      });
    },
    onError: () => {
      setConfirmingAppointmentId(null);
      setConfirmingAction(null);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status da consulta.",
        variant: "destructive",
      });
    },
  });

  const deleteAppointmentMutation = useMutation({
    mutationFn: async (appointmentId: number) => {
      setDeletingAppointmentId(appointmentId);
      const response = await apiRequest({
        url: `/api/appointments/${appointmentId}`,
        method: "DELETE",
        on401: "throw"
      });
      return response.json();
    },
    onSuccess: async () => {
      // Aguardar a invalidação e refetch das queries
      await queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      await queryClient.refetchQueries({ queryKey: ["/api/appointments"] });

      // Aguardar um delay para garantir que a lista foi atualizada
      await new Promise(resolve => setTimeout(resolve, 500));

      // Fechar modal apenas após a lista ser atualizada
      setDeleteModalOpen(false);
      setAppointmentToDelete(null);
      setAppointmentToDeleteName("");

      setTimeout(() => {
        setDeletingAppointmentId(null);
      }, 1000);

      toast({
        title: "Consulta removida",
        description: "A consulta foi removida com sucesso.",
      });
    },
    onError: () => {
      setDeletingAppointmentId(null);
      setDeleteModalOpen(false);
      setAppointmentToDelete(null);
      setAppointmentToDeleteName("");
      toast({
        title: "Erro",
        description: "Erro ao remover consulta. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const getAppointmentStatus = (appointment: Appointment) => {
    const appointmentDate = new Date(appointment.appointmentDate);
    const correctedAppointmentDate = new Date(appointmentDate.getTime() + (3 * 60 * 60 * 1000));
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const appointmentDay = new Date(correctedAppointmentDate);
    appointmentDay.setHours(0, 0, 0, 0);

    // Se já tem status definido como realizada ou cancelada
    if (appointment.status === 'completed' || appointment.status === 'cancelled') {
      return appointment.status;
    }

    // Se é hoje
    if (appointmentDay.getTime() === today.getTime()) {
      // Verifica se já passou do horário (com 15 minutos de tolerância)
      const toleranceMs = 15 * 60 * 1000; // 15 minutos em milliseconds
      if (now.getTime() > (correctedAppointmentDate.getTime() + toleranceMs)) {
        return 'overdue'; // Passou do horário, precisa confirmar
      }
      return 'today'; // É hoje mas ainda não passou
    }

    // Se é no futuro
    if (appointmentDay > today) {
      return 'scheduled';
    }

    // Se é no passado e não foi confirmada
    return 'missed';
  };

  const resetForm = () => {
    resetValidationForm(initialFormData);
    setEditingId(null);
  };

  const handleEditAppointment = (appointment: Appointment) => {
    const dateTime = new Date(appointment.appointmentDate);
    const appointmentDate = dateTime.toISOString().slice(0, 10);
    const appointmentTime = dateTime.toISOString().slice(11, 16);

    const editData = {
      title: appointment.title,
      doctorName: appointment.doctorName,
      appointmentDate: appointmentDate,
      appointmentTime: appointmentTime,
      location: appointment.location || "",
      notes: appointment.notes || "",
    };
    resetValidationForm(editData);
    setEditingId(appointment.id);
    setShowAddForm(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    const { isValid, errorCount } = validateForm();

    if (!isValid) {
      toast({
        title: "Erro de validação",
        description: `Por favor, corrija ${errorCount} ${errorCount === 1 ? 'campo' : 'campos'} obrigatório${errorCount === 1 ? '' : 's'}.`,
        variant: "destructive",
      });
      return;
    }

    // Combinar data e horário antes de enviar
    const { appointmentTime, ...dataToSend } = formData;
    const appointmentData = {
      ...dataToSend,
      appointmentDate: formData.appointmentDate + 'T' + formData.appointmentTime + ':00',
    };

    if (editingId) {
      // Encontrar a consulta atual para verificar seu status
      const currentAppointment = appointments.find((a: Appointment) => a.id === editingId);

      let updateData = appointmentData;

      // Se a consulta estiver cancelada, sempre resetar para 'scheduled'
      if (currentAppointment?.status === 'cancelled') {
        updateData = { 
          ...appointmentData, 
          status: 'scheduled'
        };
      }
      // Se a consulta estiver realizada e a nova data/horário for no futuro, resetar para 'scheduled'
      else if (currentAppointment?.status === 'completed') {
        const newAppointmentDate = new Date(appointmentData.appointmentDate);
        const now = new Date();

        // Se a nova data/horário for no futuro, resetar status para permitir recálculo
        if (newAppointmentDate > now) {
          updateData = { 
            ...appointmentData, 
            status: 'scheduled'
          };
        }
      }

      updateAppointmentMutation.mutate({ id: editingId, ...updateData });
    } else {
      addAppointmentMutation.mutate(appointmentData);
    }
  };

  const handleDeleteAppointmentClick = (appointmentId: number, appointmentTitle: string) => {
    setAppointmentToDelete(appointmentId);
    setAppointmentToDeleteName(appointmentTitle);
    setDeleteModalOpen(true);
  };

  // Medical Evolution Handlers
  const [selectedEvolution, setSelectedEvolution] = useState<MedicalEvolution | null>(null);

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

  const handleConfirmDeleteAppointment = () => {
    if (appointmentToDelete) {
      deleteAppointmentMutation.mutate(appointmentToDelete);
      // Não fechar o modal aqui - será fechado no onSuccess da mutation
    }
  };

  const getFilteredAppointments = () => {
    let filtered = Array.isArray(appointments) ? appointments.filter((appointment: Appointment) => {
      const matchesSearch = !searchTerm || 
        appointment.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.doctorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.location?.toLowerCase().includes(searchTerm.toLowerCase());

      // Filtro por status, incluindo "missed" (perdidas)
      let matchesStatus = true;
      if (statusFilter === 'missed') {
        matchesStatus = getAppointmentStatus(appointment) === 'missed';
      } else if (statusFilter === 'scheduled') {
        // Para "scheduled", só mostra consultas que realmente estão agendadas (não perdidas)
        const status = getAppointmentStatus(appointment);
        matchesStatus = status === 'scheduled' || status === 'today' || status === 'overdue';
      } else if (statusFilter !== 'all') {
        matchesStatus = appointment.status === statusFilter;
      }

      // Filtro por data
      const appointmentDate = new Date(appointment.appointmentDate);
      // Corrigir timezone brasileiro (UTC-3) para todos os filtros
      const correctedAppointmentDate = new Date(appointmentDate.getTime() + (3 * 60 * 60 * 1000));
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      let matchesDate = true;
      if (dateFilter === 'today') {
        const appointmentDay = new Date(correctedAppointmentDate.getFullYear(), correctedAppointmentDate.getMonth(), correctedAppointmentDate.getDate());
        matchesDate = appointmentDay.getTime() === today.getTime();
      } else if (dateFilter === '7d') {
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);
        matchesDate = correctedAppointmentDate >= sevenDaysAgo;
      } else if (dateFilter === '30d') {
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        matchesDate = correctedAppointmentDate >= thirtyDaysAgo;
      } else if (dateFilter === '90d') {
        const ninetyDaysAgo = new Date(today);
        ninetyDaysAgo.setDate(today.getDate() - 90);
        matchesDate = correctedAppointmentDate >= ninetyDaysAgo;
      } else if (dateFilter === 'custom' && startDate && endDate) {
        // Usar strings de data diretamente para evitar problemas de timezone
        const appointmentDateStr = correctedAppointmentDate.toISOString().split('T')[0]; // YYYY-MM-DD

        matchesDate = appointmentDateStr >= startDate && appointmentDateStr <= endDate;
      }

      return matchesSearch && matchesStatus && matchesDate;
    }) : [];

    // Ordenação avançada com prioridade (igual aos exames)
    return filtered.sort((a, b) => {
      const appointmentDateA = new Date(a.appointmentDate);
      const appointmentDateB = new Date(b.appointmentDate);

      // Corrigir timezone brasileiro (UTC-3)
      const correctedDateA = new Date(appointmentDateA.getTime() + (3 * 60 * 60 * 1000));
      const correctedDateB = new Date(appointmentDateB.getTime() + (3 * 60 * 60 * 1000));

      const now = new Date();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const dayA = new Date(correctedDateA);
      dayA.setHours(0, 0, 0, 0);
      const dayB = new Date(correctedDateB);
      dayB.setHours(0, 0, 0, 0);

      const statusA = getAppointmentStatus(a);
      const statusB = getAppointmentStatus(b);

      // 1. Prioridade máxima: consultas de HOJE (com pulsação)
      const isTodayA = statusA === 'today';
      const isTodayB = statusB === 'today';

      if (isTodayA && !isTodayB) return -1;
      if (!isTodayA && isTodayB) return 1;

      // 2. Segunda prioridade: consultas que precisam de confirmação (overdue)
      const isOverdueA = statusA === 'overdue';
      const isOverdueB = statusB === 'overdue';

      if (isOverdueA && !isOverdueB) return -1;
      if (!isOverdueA && isOverdueB) return 1;

      // 3. Terceira prioridade: consultas agendadas futuras
      const isScheduledA = statusA === 'scheduled';
      const isScheduledB = statusB === 'scheduled';

      if (isScheduledA && !isScheduledB) return -1;
      if (!isScheduledA && isScheduledB) return 1;

      // 4. Dentro do mesmo grupo de status, ordenar por data/hora
      if (isTodayA && isTodayB) {
        // Para consultas de hoje, ordenar por horário (mais próximo primeiro)
        return correctedDateA.getTime() - correctedDateB.getTime();
      }

      if (isOverdueA && isOverdueB) {
        // Para consultas em atraso, ordenar por data/hora (mais recente primeiro)
        return correctedDateB.getTime() - correctedDateA.getTime();
      }

      if (isScheduledA && isScheduledB) {
        // Para consultas agendadas, ordenar por data/hora (mais próximo primeiro)
        return correctedDateA.getTime() - correctedDateB.getTime();
      }

      // 5. Para outros status (completed, cancelled, missed), ordenar por data mais recente primeiro
      return correctedDateB.getTime() - correctedDateA.getTime();
    });
  };

  const filteredAppointments = getFilteredAppointments();

  // Lógica de paginação
  const totalItems = filteredAppointments.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredAppointments.slice(startIndex, endIndex);

  // Função para mudar página
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Função para mudar itens por página
  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1); // Reset para primeira página
  };

  const getStatusColor = (appointment: Appointment) => {
    const status = getAppointmentStatus(appointment);
    switch (status) {
      case 'today':
        return "bg-red-500 text-white animate-pulse border-red-600";
      case 'scheduled':
        return "bg-blue-100 text-blue-800";
      case 'completed':
        return "bg-green-100 text-green-800";
      case 'cancelled':
        return "bg-red-100 text-red-800";
      case 'overdue':
        return "bg-yellow-100 text-yellow-800";
      case 'missed':
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  const getStatusLabel = (appointment: Appointment) => {
    const status = getAppointmentStatus(appointment);
    switch (status) {
      case 'today':
        return "HOJE";
      case 'scheduled':
        return "Agendada";
      case 'completed':
        return "Realizada";
      case 'cancelled':
        return "Cancelada";
      case 'overdue':
        return "Confirmar";
      case 'missed':
        return "Perdida";
      default:
        return "Pendente";
    }
  };

  const shouldShowConfirmationButtons = (appointment: Appointment) => {
    // Só mostra botões para consultas que passaram do horário (status 'overdue')
    return getAppointmentStatus(appointment) === 'overdue';
  };

  // Return desktop version if not mobile
  if (!isMobile) {
    return <AppointmentsDesktop />;
  }

  if (isLoading) {
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
              <h1 className="text-2xl font-bold text-slate-800">Consultas</h1>
              <p className="text-sm text-slate-500">Gerencie consultas e registros médicos</p>
            </div>
          </div>
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-lg p-1 mb-4">
          <button
            onClick={() => setActiveTab('appointments')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'appointments'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Consultas
          </button>
          <button
            onClick={() => setActiveTab('evolutions')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'evolutions'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            {userProfileType === 'doctor' ? 'Evolução Médica' : 'Registro Médico'}
          </button>
        </div>

        {/* Statistics */}
        {activeTab === 'appointments' && (
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-slate-800">
                  {Array.isArray(appointments) ? appointments.filter((a: Appointment) => a.status === 'scheduled').length : 0}
                </div>
                <div className="text-sm text-slate-600">Agendadas</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-slate-800">
                  {Array.isArray(appointments) ? appointments.filter((a: Appointment) => a.status === 'completed').length : 0}
                </div>
                <div className="text-sm text-slate-600">Realizadas</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-slate-800">
                  {Array.isArray(appointments) ? appointments.length : 0}
                </div>
                <div className="text-sm text-slate-600">Total</div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'evolutions' && (
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
        )}
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
            />
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'appointments' && (
          <>
            {/* Add Appointment Form */}
            {showAddForm && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => {
                    setShowAddForm(false);
                    resetForm();
                  }}
                  className="mr-3"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                {editingId ? 'Editar Consulta' : 'Nova Consulta'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitForm} className="space-y-4">
                <ValidatedInput
                  id="title"
                  label="Título da Consulta"
                  type="text"
                  value={formData.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  placeholder="Ex: Consulta de rotina"
                  required
                  error={errors.title}
                />

                <ValidatedInput
                  id="doctorName"
                  label="Nome do Médico"
                  type="text"
                  value={formData.doctorName}
                  onChange={(e) => updateField('doctorName', e.target.value)}
                  placeholder="Ex: Dr. João Silva"
                  required
                  error={errors.doctorName}
                />

                <div className="grid grid-cols-2 gap-4">
                  <ValidatedInput
                    id="appointmentDate"
                    label="Data da Consulta"
                    type="date"
                    value={formData.appointmentDate}
                    onChange={(e) => updateField('appointmentDate', e.target.value)}
                    required
                    error={errors.appointmentDate}
                  />
                  <ValidatedInput
                    id="appointmentTime"
                    label="Horário da Consulta"
                    type="time"
                    value={formData.appointmentTime}
                    onChange={(e) => updateField('appointmentTime', e.target.value)}
                    required
                    error={errors.appointmentTime}
                  />
                </div>

                <ValidatedInput
                  id="location"
                  label="Local"
                  type="text"
                  value={formData.location}
                  onChange={(e) => updateField('location', e.target.value)}
                  placeholder="Ex: Clínica São Paulo - Sala 203"
                  error={errors.location}
                />

                <ValidatedTextarea
                  id="notes"
                  label="Observações"
                  value={formData.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  placeholder="Exames para levar, sintomas, etc..."
                  rows={3}
                  error={errors.notes}
                />

                <div className="flex gap-3">
                  <Button type="submit" disabled={addAppointmentMutation.isPending || updateAppointmentMutation.isPending} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                    {(addAppointmentMutation.isPending || updateAppointmentMutation.isPending) ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {editingId ? "Atualizar Consulta" : "Agendar Consulta"}
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddForm(false);
                      resetForm();
                    }}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Show content only when form is NOT open */}
        {!showAddForm && (
          <>
            {/* Search and Add Button */}
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Buscar consultas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button 
                size="default" 
                onClick={() => setShowAddForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo
              </Button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 gap-3 mb-6">
              <div className="grid grid-cols-2 gap-3">
                <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                  <SelectTrigger>
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="scheduled">Agendadas</SelectItem>
                    <SelectItem value="completed">Realizadas</SelectItem>
                    <SelectItem value="cancelled">Canceladas</SelectItem>
                    <SelectItem value="missed">Perdidas</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={dateFilter} onValueChange={(value: any) => setDateFilter(value)}>
                  <SelectTrigger>
                    <Calendar className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Hoje</SelectItem>
                    <SelectItem value="7d">7 dias</SelectItem>
                    <SelectItem value="30d">30 dias</SelectItem>
                    <SelectItem value="90d">90 dias</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>


            </div>

            {/* Custom Date Filter */}
            {dateFilter === 'custom' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border mb-6">
                <div>
                  <Label htmlFor="start-date" className="text-sm font-medium text-slate-700">
                    Data Inicial
                  </Label>
                  <div className="relative mt-1">
                    <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <Input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        const newStartDate = e.target.value;
                        setStartDate(newStartDate);

                        // Se data final já está preenchida e é anterior à nova data inicial, limpar
                        if (endDate && newStartDate > endDate) {
                          setEndDate("");
                        }
                      }}
                      className="pr-10"
                      max={endDate || undefined}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="end-date" className="text-sm font-medium text-slate-700">
                    Data Final
                  </Label>
                  <div className="relative mt-1">
                    <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <Input
                      id="end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        const newEndDate = e.target.value;

                        // Validar se data final não é anterior à inicial
                        if (startDate && newEndDate < startDate) {
                          return; // Não permite definir data final anterior à inicial
                        }

                        setEndDate(newEndDate);
                      }}
                      className="pr-10"
                      min={startDate || undefined}
                    />
                  </div>
                  {startDate && endDate && endDate < startDate && (
                    <p className="text-xs text-red-600 mt-1">
                      Data final não pode ser anterior à data inicial
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Appointments List */}
            <div className="space-y-4">
            {totalItems === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">
                    {searchTerm ? "Nenhuma consulta encontrada" : "Nenhuma consulta agendada"}
                  </h3>
                  <p className="text-slate-600 mb-4">
                    {searchTerm 
                      ? "Tente buscar com outros termos"
                      : "Agende sua primeira consulta para manter sua saúde em dia"
                    }
                  </p>
                  {!searchTerm && (
                    <Button 
                        onClick={() => setShowAddForm(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Agendar Consulta
                      </Button>
                    )}
                </CardContent>
              </Card>
            ) : (
              currentItems.map((appointment: Appointment) => (
                <Card key={appointment.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 cursor-pointer" onClick={() => handleEditAppointment(appointment)}>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-800">{appointment.title}</h3>
                          <Badge className={getStatusColor(appointment)}>
                            {getStatusLabel(appointment)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <User className="w-4 h-4 text-blue-600" />
                          <span className="text-sm text-slate-600">{appointment.doctorName}</span>
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="w-4 h-4 text-blue-600" />
                          <span className="text-sm text-slate-600">
                            {appointment.appointmentDate ? (() => {
                              const date = new Date(appointment.appointmentDate);
                              const correctedDate = new Date(date.getTime() + (3 * 60 * 60 * 1000));
                              return format(correctedDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
                            })() : 'Data não informada'}
                          </span>
                        </div>
                        {appointment.location && (
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="w-4 h-4 text-blue-600" />
                            <span className="text-sm text-slate-600">{appointment.location}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAppointmentClick(appointment.id, appointment.title);
                          }}
                          disabled={deletingAppointmentId === appointment.id}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          {deletingAppointmentId === appointment.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Botões de confirmação para consultas que passaram do horário */}
                    {shouldShowConfirmationButtons(appointment) && (
                      <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800 mb-2">
                          Esta consulta já passou do horário. Ela foi realizada?
                        </p>
                        <div className="flex gap-2 w-full">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              confirmAppointmentMutation.mutate({ id: appointment.id, status: 'completed' });
                            }}
                            disabled={confirmingAppointmentId === appointment.id}
                            className="bg-green-600 hover:bg-green-700 text-white flex-1"
                          >
                            {confirmingAppointmentId === appointment.id && confirmingAction === 'completed' ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Confirmando...
                              </>
                            ) : (
                              "✓ Sim, foi realizada"
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              confirmAppointmentMutation.mutate({ id: appointment.id, status: 'cancelled' });
                            }}
                            disabled={confirmingAppointmentId === appointment.id}
                            className="border-red-300 text-red-700 hover:bg-red-50 flex-1"
                          >
                            {confirmingAppointmentId === appointment.id && confirmingAction === 'cancelled' ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                                Cancelando...
                              </>
                            ) : (
                              "✗ Não foi realizada"
                            )}
                          </Button>
                        </div>
                      </div>
                    )}

                    {appointment.notes && (
                      <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded-md">
                        {appointment.notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
            </div>

            {/* Controles de paginação */}
            <div className="flex flex-row gap-4 items-center justify-between bg-slate-50 p-4 rounded-lg mt-6">
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
            </>
          )}

          {activeTab === 'evolutions' && !showEvolutionForm && (
            <MedicalEvolutionsList
              evolutions={evolutions}
              isLoading={evolutionsLoading}
              userProfileType={userProfileType}
              onAddEvolution={handleAddEvolution}
              onViewEvolution={handleViewEvolution}
              onEditEvolution={handleEditEvolution}
              onDeleteEvolution={handleDeleteEvolution}
            />
          )}
        </>
        )}
      </main>

      <BottomNavigation />

      <DeleteConfirmationModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Excluir consulta"
        description={
          <>
            Tem certeza que deseja excluir a consulta "<strong>{appointmentToDeleteName}</strong>"? Esta ação não pode ser desfeita.
          </>
        }
        onConfirm={handleConfirmDeleteAppointment}
        loading={deleteAppointmentMutation.isPending}
      />
    </div>
  );
}