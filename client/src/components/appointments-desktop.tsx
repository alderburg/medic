import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ValidatedInput, ValidatedTextarea } from "@/components/ui/validated-input";
import { Search, Plus, Calendar, Clock, MapPin, User, Save, X, Trash2, Edit2, Filter, AlertCircle, CheckCircle, XCircle, Timer, Activity, TrendingUp, Target, ChevronLeft, ChevronRight, FileText, ClipboardList, Stethoscope } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useFormValidation } from "@/hooks/use-form-validation";
import { useMedicalQueries } from "@/hooks/use-medical-queries";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { MedicalEvolution } from "../../../shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import DeleteConfirmationModal from "@/components/delete-confirmation-modal";
import MedicalEvolutionForm from "@/components/medical-evolution-form";

interface Appointment {
  id: number;
  title: string;
  doctorName: string;
  appointmentDate: string;
  location: string;
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}



export default function AppointmentsDesktop() {
  const [, navigate] = useLocation();

  // Ler parâmetro da URL na inicialização
  const getInitialTab = (): 'overview' | 'appointments' | 'encounters' | 'evolutions' => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam === 'appointments') return 'appointments';
    if (tabParam === 'encounters') return 'encounters';
    if (tabParam === 'evolutions') return 'evolutions';
    return 'overview';
  };

  const [activeTab, setActiveTab] = useState<'overview' | 'appointments' | 'encounters' | 'evolutions'>(getInitialTab());
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'completed' | 'cancelled' | 'missed'>('all');
  const [dateFilter, setDateFilter] = useState<'today' | '7d' | '30d' | '90d' | 'custom'>('30d');
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState<number | null>(null);
  const [appointmentToDeleteName, setAppointmentToDeleteName] = useState<string>("");
  const [deletingAppointmentId, setDeletingAppointmentId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmingAppointmentId, setConfirmingAppointmentId] = useState<number | null>(null);
  const [confirmingAction, setConfirmingAction] = useState<'completed' | 'cancelled' | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Estados para evolução médica
  const [showEvolutionForm, setShowEvolutionForm] = useState(false);
  const [selectedEvolution, setSelectedEvolution] = useState<MedicalEvolution | null>(null);
  const [editingEvolutionId, setEditingEvolutionId] = useState<number | null>(null);
  const [evolutionToDelete, setEvolutionToDelete] = useState<number | null>(null);
  const [evolutionToDeleteName, setEvolutionToDeleteName] = useState<string>("");
  const [deleteEvolutionModalOpen, setDeleteEvolutionModalOpen] = useState(false);

  // Get user from useAuth - deve vir antes de getInitialFormData
  const { user: currentUser } = useAuth();

  // Fix: Use the user from useAuth which has the correct profileType
  const userProfileType = currentUser?.profileType || 'patient';

  // Função para determinar título do médico baseado no gênero
  const getDoctorTitle = (doctorName: string, doctorGender?: string) => {
    let isFeminine = false;
    
    // Prioridade 1: Usar o campo gender do banco de dados se disponível
    if (doctorGender) {
      isFeminine = doctorGender === 'feminino';
    } else {
      // Prioridade 2: Detectar baseado em terminações comuns de nomes femininos
      const feminineSuffixes = ['a', 'ana', 'ina', 'ela', 'ica', 'lia', 'nia', 'ria', 'triz'];
      const name = doctorName?.toLowerCase() || '';
      isFeminine = feminineSuffixes.some(suffix => name.endsWith(suffix));
    }
    
    return isFeminine ? 'Dra.' : 'Dr.';
  };

  // Função para obter dados iniciais do formulário
  const getInitialFormData = () => {
    // Se o usuário é médico, preencher automaticamente o nome do médico
    const doctorName = userProfileType === 'doctor' && currentUser?.name ? currentUser.name : "";

    return {
      title: "",
      doctorName,
      appointmentDate: "",
      appointmentTime: "",
      location: "",
      notes: "",
    };
  };

  const initialFormData = getInitialFormData();

  // Sistema de validação
  const validationRules = {
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

  const { formData, updateField, errors, validateForm, resetForm } = useFormValidation(initialFormData, validationRules);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { enableMedicalQueries } = useMedicalQueries();

  // Escutar mudanças no histórico do navegador
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      if (tabParam === 'appointments') setActiveTab('appointments');
      else if (tabParam === 'evolutions') setActiveTab('evolutions');
      else setActiveTab('overview');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Detectar parâmetro action=new na URL para abrir formulário automaticamente
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const actionParam = urlParams.get('action');
    const tabParam = urlParams.get('tab');


    if (actionParam === 'new' && tabParam === 'appointments' && !showAddForm) {

      // Primeiro garantir que estamos na aba correta
      setActiveTab('appointments');

      // Aguardar um pouco para garantir que a aba foi atualizada
      setTimeout(() => {
        // Resetar formulário com dados iniciais e abrir
        resetForm(getInitialFormData());
        setShowAddForm(true);
      }, 100);

      // Limpar parâmetro da URL para evitar abrir novamente
      urlParams.delete('action');
      const newUrl = urlParams.toString() ? `${window.location.pathname}?${urlParams.toString()}` : window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [showAddForm, currentUser]);

  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
    enabled: enableMedicalQueries,
  });

  // User foi movido para antes de getInitialFormData

  const { data: evolutions = [], isLoading: evolutionsLoading } = useQuery<MedicalEvolution[]>({
    queryKey: ["/api/medical-evolutions"],
    enabled: enableMedicalQueries && activeTab === 'evolutions',
  });



  const addAppointmentMutation = useMutation({
    mutationFn: async (appointmentData: any) => {
      setIsSaving(true);
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
      setEditingId(null);
      setIsSaving(false);

      toast({
        title: "Consulta agendada",
        description: "A consulta foi agendada com sucesso.",
      });
    },
    onError: () => {
      setIsSaving(false);
      toast({
        title: "Erro",
        description: "Erro ao agendar consulta. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: async ({ id, ...appointmentData }: any) => {
      setIsSaving(true);
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
      setEditingId(null);
      setIsSaving(false);

      toast({
        title: "Consulta atualizada",
        description: "A consulta foi atualizada com sucesso.",
      });
    },
    onError: () => {
      setIsSaving(false);
      toast({
        title: "Erro",
        description: "Erro ao atualizar consulta. Tente novamente.",
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
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.refetchQueries({ queryKey: ["/api/appointments"] });

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
    mutationFn: async (id: number) => {
      setDeletingAppointmentId(id);
      const response = await apiRequest({
        url: `/api/appointments/${id}`,
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
        title: "Consulta excluída",
        description: "A consulta foi excluída com sucesso.",
      });
    },
    onError: () => {
      setDeletingAppointmentId(null);
      setDeleteModalOpen(false);
      setAppointmentToDelete(null);
      setAppointmentToDeleteName("");
      toast({
        title: "Erro",
        description: "Erro ao excluir consulta. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Mutations para evolução médica
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
      setSelectedEvolution(null);
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
      setSelectedEvolution(null);
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
      
      setDeleteEvolutionModalOpen(false);
      setEvolutionToDelete(null);
      setEvolutionToDeleteName("");
      
      toast({
        title: "Evolução médica excluída",
        description: "A evolução médica foi excluída com sucesso.",
      });
    },
    onError: () => {
      setDeleteEvolutionModalOpen(false);
      setEvolutionToDelete(null);
      setEvolutionToDeleteName("");
      toast({
        title: "Erro",
        description: "Erro ao excluir evolução médica. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const { isValid, errors: validationErrors } = validateForm();

    if (!isValid) {
      // Identificar campos obrigatórios não preenchidos
      const missingFields = [];
      if (!formData.title.trim()) missingFields.push("Título da consulta");
      if (!formData.doctorName.trim()) missingFields.push("Nome do médico");
      if (!formData.appointmentDate.trim()) missingFields.push("Data da consulta");
      if (!formData.appointmentTime.trim()) missingFields.push("Horário da consulta");

      let description = "";
      if (missingFields.length > 0) {
        description = `Campos obrigatórios não preenchidos: ${missingFields.join(", ")}`;
      } else {
        const errorCount = Object.keys(validationErrors).length;
        description = `Por favor, corrija ${errorCount} ${errorCount === 1 ? 'campo' : 'campos'} antes de continuar.`;
      }

      toast({
        title: "Campos obrigatórios",
        description,
        variant: "destructive",
      });
      return;
    }

    const { appointmentTime, ...dataToSend } = formData;
    const appointmentData: Partial<Appointment> = {
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
        const newAppointmentDate = new Date(appointmentData.appointmentDate || '');
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

  const handleEdit = (appointment: Appointment) => {
    setEditingId(appointment.id);
    const dateTime = new Date(appointment.appointmentDate);
    const appointmentDate = dateTime.toISOString().slice(0, 10);
    const appointmentTime = dateTime.toISOString().slice(11, 16);
    updateField('title', appointment.title);
    updateField('doctorName', appointment.doctorName);
    updateField('appointmentDate', appointmentDate);
    updateField('appointmentTime', appointmentTime);
    updateField('location', appointment.location);
    updateField('notes', appointment.notes || "");
    setShowAddForm(true);
  };

  const handleDelete = (id: number, title: string) => {
    setAppointmentToDelete(id);
    setAppointmentToDeleteName(title);
    setDeleteModalOpen(true);
  };

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

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingId(null);
    resetForm();
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

  const getStatusIcon = (appointment: Appointment) => {
    const status = getAppointmentStatus(appointment);
    switch (status) {
      case 'today':
      case 'scheduled': return <Timer className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      case 'overdue': return <AlertCircle className="w-4 h-4" />;
      case 'missed': return <XCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
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

  const getFilteredAppointments = () => {
    let filtered = appointments.filter((appointment: Appointment) => {
      const matchesSearch = !searchTerm || 
        appointment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (appointment.location && appointment.location.toLowerCase().includes(searchTerm.toLowerCase()));

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
    });

    // Ordenação avançada com priorização (igual aos exames)
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

  // Funções de paginação
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value, 10));
    setCurrentPage(1); // Reset para a primeira página ao mudar o número de itens por página
  };

  // Cálculos de paginação
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAppointments = filteredAppointments.slice(startIndex, endIndex);

  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);

  const getStatistics = () => {
    const total = appointments.length;
    const scheduled = appointments.filter((a: Appointment) => a.status === 'scheduled').length;
    const completed = appointments.filter((a: Appointment) => a.status === 'completed').length;
    const cancelled = appointments.filter((a: Appointment) => a.status === 'cancelled').length;

    return { total, scheduled, completed, cancelled };
  };

  const stats = getStatistics();

  // Handlers para evolução médica
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

  // Render overview tab
  const renderOverview = () => {
    if (isLoading) {
      return (
        <div className="space-y-6">
          {/* Skeleton para cards de estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                      </div>
                      <div className="h-12 w-12 bg-gray-200 rounded-lg"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Skeleton para seção de ações rápidas e próximas consultas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <div className="animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="animate-pulse space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-10 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="animate-pulse space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                        <div className="space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-32"></div>
                          <div className="h-3 bg-gray-200 rounded w-24"></div>
                          <div className="h-3 bg-gray-200 rounded w-20"></div>
                        </div>
                      </div>
                      <div className="h-6 w-16 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total de Consultas</p>
                  <p className="text-2xl font-bold text-cyan-600">{stats.total}</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-cyan-100 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-cyan-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Agendadas</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.scheduled}</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Timer className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Realizadas</p>
                  <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Canceladas</p>
                  <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-red-100 flex items-center justify-center">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-cyan-600" />
                Ações Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                className="w-full justify-start gap-2 bg-cyan-600 hover:bg-cyan-700" 
                onClick={() => {
                  setActiveTab('appointments');
                  setShowAddForm(true);
                  // Atualizar a URL sem recarregar a página
                  const url = new URL(window.location.href);
                  url.searchParams.set('tab', 'appointments');
                  window.history.pushState({}, '', url.toString());
                }}
              >
                <Calendar className="h-4 w-4" />
                Agendar Nova Consulta
              </Button>
              <Button 
                className="w-full justify-start gap-2" 
                variant="outline"
                onClick={() => navigate('/tests')}
              >
                <Activity className="h-4 w-4" />
                Ver Exames
              </Button>
              <Button 
                className="w-full justify-start gap-2" 
                variant="outline"
                onClick={() => navigate('/reports')}
              >
                <TrendingUp className="h-4 w-4" />
                Ver Relatórios
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Próximas Consultas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {appointments.filter((a: Appointment) => {
                      // Filtrar apenas consultas de hoje e do futuro
                      const appointmentDate = new Date(a.appointmentDate);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);

                      const appointmentDay = new Date(appointmentDate);
                      appointmentDay.setHours(0, 0, 0, 0);

                      return appointmentDay.getTime() >= today.getTime() && 
                             (a.status === 'scheduled' || getAppointmentStatus(a) === 'overdue');
                    }).length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Timer className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>Nenhuma consulta agendada</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {appointments
                    .filter((a: Appointment) => {
                      // Filtrar apenas consultas de hoje e do futuro
                      const appointmentDate = new Date(a.appointmentDate);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);

                      const appointmentDay = new Date(appointmentDate);
                      appointmentDay.setHours(0, 0, 0, 0);

                      return appointmentDay.getTime() >= today.getTime() && 
                             (a.status === 'scheduled' || getAppointmentStatus(a) === 'overdue');
                    })
                    .slice(0, 3)
                    .map((appointment: Appointment) => (
                      <div key={appointment.id} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-3 cursor-pointer hover:bg-gray-100 transition-colors -m-4 p-4 rounded-lg" onClick={() => {
                          setActiveTab('appointments');
                          handleEdit(appointment);
                        }}>
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <Calendar className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold">{appointment.title}</h4>
                              <p className="text-sm text-gray-600">Dr. {appointment.doctorName}</p>
                              <p className="text-xs text-gray-500">
                                {(() => {
                                  const date = new Date(appointment.appointmentDate);
                                  const correctedDate = new Date(date.getTime() + (3 * 60 * 60 * 1000));
                                  return format(correctedDate, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR });
                                })()}
                              </p>
                            </div>
                          </div>
                          <Badge className={getStatusColor(appointment)}>
                            {getStatusIcon(appointment)}
                            <span className="ml-1">{getStatusLabel(appointment)}</span>
                          </Badge>
                        </div>

                        {/* Botões de confirmação para consultas que passaram do horário */}
                        {shouldShowConfirmationButtons(appointment) && (
                          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
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
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  // Render appointments tab
  const renderAppointments = () => (
    <div className="h-full flex flex-col">
      {showAddForm ? (
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cyan-100 rounded-lg">
                    <Calendar className="h-5 w-5 text-cyan-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {editingId ? 'Editar Consulta' : 'Nova Consulta'}
                    </h2>
                    <p className="text-sm text-gray-600">
                      Preencha as informações da consulta médica
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ValidatedInput
                    label="Título da Consulta"
                    id="title"
                    value={formData.title}
                    onChange={(e) => updateField('title', e.target.value)}
                    placeholder="Ex: Consulta cardiologista"
                    required
                    error={errors.title}
                  />
                  <div>
                    <ValidatedInput
                      label="Médico"
                      id="doctorName"
                      value={formData.doctorName}
                      onChange={(e) => updateField('doctorName', e.target.value)}
                      placeholder="Nome do médico"
                      required
                      error={errors.doctorName}
                      readOnly={userProfileType === 'doctor'}
                      disabled={userProfileType === 'doctor'}
                    />
                    {userProfileType === 'doctor' && (
                      <p className="text-xs text-gray-500 mt-1">
                        Médico selecionado automaticamente com base na sua sessão
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid grid-cols-2 gap-2">
                    <ValidatedInput
                      label="Data da Consulta"
                      id="appointmentDate"
                      type="date"
                      value={formData.appointmentDate}
                      onChange={(e) => updateField('appointmentDate', e.target.value)}
                      required
                      error={errors.appointmentDate}
                    />
                    <ValidatedInput
                      label="Horário da Consulta"
                      id="appointmentTime"
                      type="time"
                      value={formData.appointmentTime}
                      onChange={(e) => updateField('appointmentTime', e.target.value)}
                      required
                      error={errors.appointmentTime}
                    />
                  </div>
                  <ValidatedInput
                    label="Local"
                    id="location"
                    value={formData.location}
                    onChange={(e) => updateField('location', e.target.value)}
                    placeholder="Hospital, clínica, etc."
                    error={errors.location}
                  />
                </div>
                <ValidatedTextarea
                  label="Observações"
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  placeholder="Observações sobre a consulta..."
                  rows={3}
                />
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
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {editingId ? 'Atualizar Consulta' : 'Salvar Consulta'}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="h-full flex flex-col">
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <div className="space-y-2 pb-4">
              {isLoading ? (
                [...Array(6)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-white rounded-lg border">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse"></div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div>
                          <div className="h-5 bg-gray-200 rounded animate-pulse w-20"></div>
                        </div>
                        <div className="h-3 bg-gray-200 rounded animate-pulse w-24 mb-2"></div>
                        <div className="flex items-center gap-4">
                          <div className="h-3 bg-gray-200 rounded animate-pulse w-32"></div>
                          <div className="h-3 bg-gray-200 rounded animate-pulse w-28"></div>
                        </div>
                      </div>
                    </div>
                    <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                ))
              ) : filteredAppointments.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12 text-gray-500">
                    <Calendar className="h-12 w-12 mb-4" />
                    <p className="text-lg font-medium mb-2">
                      {searchTerm ? 'Nenhuma consulta encontrada' : 'Nenhuma consulta cadastrada'}
                    </p>
                    <p className="text-center">
                      {searchTerm ? 'Tente ajustar os filtros de pesquisa' : 'Gerencie suas consultas médicas de forma organizada'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {paginatedAppointments.map((appointment: Appointment) => (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between p-4 bg-white rounded-lg border cursor-pointer hover:shadow-sm transition-shadow"
                    onClick={() => handleEdit(appointment)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-cyan-100 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-cyan-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{appointment.title}</h3>
                          <Badge className={getStatusColor(appointment)}>
                            {getStatusIcon(appointment)}
                            <span className="ml-1">{getStatusLabel(appointment)}</span>
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">Dr. {appointment.doctorName}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{(() => {
                              const date = new Date(appointment.appointmentDate);
                              const correctedDate = new Date(date.getTime() + (3 * 60 * 60 * 1000));
                              return format(correctedDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
                            })()}</span>
                          </div>
                          {appointment.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span>{appointment.location}</span>
                            </div>
                          )}
                        </div>
                        {appointment.notes && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                            {appointment.notes}
                          </div>
                        )}

                        {/* Botões de confirmação para consultas que passaram do horário */}
                        {shouldShowConfirmationButtons(appointment) && (
                          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
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
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Botão Atender - apenas para médicos e consultas vinculadas */}
                      {userProfileType === 'doctor' && appointment.doctorName === currentUser?.name && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-blue-700 bg-blue-100 hover:text-blue-800 hover:bg-blue-200 flex items-center gap-2 border border-blue-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Navegar para a aba de ficha de atendimento
                            setActiveTab('encounters');
                            // Atualizar URL
                            const url = new URL(window.location.href);
                            url.searchParams.set('tab', 'encounters');
                            url.searchParams.set('appointment', appointment.id.toString());
                            window.history.pushState({}, '', url.toString());
                          }}
                          title="Atender Paciente"
                        >
                          <Stethoscope className="h-4 w-4" />
                          Atender Paciente
                        </Button>
                      )}

                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(appointment.id, appointment.title);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Paginação */}
                {filteredAppointments.length > 0 && (
                  <div className="flex flex-row gap-4 items-center justify-between bg-slate-50 p-4 rounded-lg mt-4">
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
              </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Skeleton loading removido daqui - será mostrado dentro das abas

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={(value: any) => {
          setActiveTab(value);
          // Atualizar a URL sem recarregar a página
          const url = new URL(window.location.href);
          if (value === 'appointments') {
            url.searchParams.set('tab', 'appointments');
          } else if (value === 'evolutions') {
            url.searchParams.set('tab', 'evolutions');
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
                <TabsTrigger value="appointments" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Consultas
                </TabsTrigger>
                <TabsTrigger value="encounters" className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Ficha de Atendimento
                </TabsTrigger>
                <TabsTrigger value="evolutions" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {userProfileType === 'doctor' ? 'Evolução Médica' : 'Registro Médico'}
                </TabsTrigger>
              </TabsList>

              {activeTab === 'appointments' && (
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Pesquisar consultas..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-80"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                    <SelectTrigger className="w-40">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
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
                    <SelectTrigger className="w-40">
                      <Calendar className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Hoje</SelectItem>
                      <SelectItem value="7d">7 dias</SelectItem>
                      <SelectItem value="30d">30 dias</SelectItem>
                      <SelectItem value="90d">90 dias</SelectItem>
                      <SelectItem value="custom">Personalizado</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button onClick={() => {
                    resetForm(getInitialFormData());
                    setShowAddForm(true);
                  }} className="bg-cyan-600 hover:bg-cyan-700" disabled={showAddForm || editingId !== null}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Consulta
                  </Button>
                </div>
              )}

              {activeTab === 'encounters' && (
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Pesquisar fichas de atendimento..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-80"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                    <SelectTrigger className="w-40">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pending">Pendentes</SelectItem>
                      <SelectItem value="completed">Completas</SelectItem>
                      <SelectItem value="reviewed">Revisadas</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={dateFilter} onValueChange={(value: any) => setDateFilter(value)}>
                    <SelectTrigger className="w-40">
                      <Calendar className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Hoje</SelectItem>
                      <SelectItem value="7d">7 dias</SelectItem>
                      <SelectItem value="30d">30 dias</SelectItem>
                      <SelectItem value="90d">90 dias</SelectItem>
                      <SelectItem value="custom">Personalizado</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button className="bg-cyan-600 hover:bg-cyan-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Ficha
                  </Button>
                </div>
              )}

              {activeTab === 'evolutions' && (
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder={`Pesquisar ${userProfileType === 'doctor' ? 'evoluções médicas' : 'registros médicos'}...`}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-80"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                    <SelectTrigger className="w-40">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="confirmed">Confirmados</SelectItem>
                      <SelectItem value="pending">Pendentes</SelectItem>
                      <SelectItem value="draft">Rascunho</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={dateFilter} onValueChange={(value: any) => setDateFilter(value)}>
                    <SelectTrigger className="w-40">
                      <Calendar className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Hoje</SelectItem>
                      <SelectItem value="7d">7 dias</SelectItem>
                      <SelectItem value="30d">30 dias</SelectItem>
                      <SelectItem value="90d">90 dias</SelectItem>
                      <SelectItem value="custom">Personalizado</SelectItem>
                    </SelectContent>
                  </Select>

                  {userProfileType === 'doctor' && (
                    <Button 
                      className="bg-cyan-600 hover:bg-cyan-700"
                      onClick={() => {
                        setSelectedEvolution(null);
                        setEditingEvolutionId(null);
                        setShowEvolutionForm(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Evolução
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 p-6 overflow-hidden">
            <TabsContent value="overview" className="mt-0 h-full overflow-y-auto scrollbar-hide">
              {renderOverview()}
            </TabsContent>

            <TabsContent value="appointments" className="mt-0 h-full overflow-y-auto scrollbar-hide">
              <div className="space-y-4">
                {dateFilter === 'custom' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border">
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
                <div className="h-full">
                  {renderAppointments()}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="encounters" className="mt-0 h-full overflow-y-auto scrollbar-hide">
              <div className="space-y-4">
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12 text-gray-500">
                    <ClipboardList className="h-12 w-12 mb-4" />
                    <p className="text-lg font-medium mb-2">
                      Fichas de Atendimento
                    </p>
                    <p className="text-center">
                      Gerencie as fichas de atendimento médico centralizadas
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="evolutions" className="mt-0 h-full overflow-y-auto scrollbar-hide">
              {showEvolutionForm ? (
                <div className="h-full">
                  <MedicalEvolutionForm
                    evolution={selectedEvolution}
                    onSave={handleSaveEvolution}
                    onCancel={handleCancelEvolution}
                    isSubmitting={addEvolutionMutation.isPending || updateEvolutionMutation.isPending}
                    userProfileType={userProfileType}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  {evolutionsLoading ? (
                    <div className="space-y-4">
                      {[...Array(5)].map((_, i) => (
                        <Card key={i}>
                          <CardContent className="p-4">
                            <div className="animate-pulse">
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-3">
                                  <div className="h-10 w-10 bg-gray-200 rounded-lg"></div>
                                  <div className="space-y-2">
                                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                                  </div>
                                </div>
                                <div className="h-6 w-16 bg-gray-200 rounded"></div>
                              </div>
                              <div className="space-y-2">
                                <div className="h-3 bg-gray-200 rounded w-full"></div>
                                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : evolutions.length === 0 ? (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-12 text-gray-500">
                        <FileText className="h-12 w-12 mb-4" />
                        <p className="text-lg font-medium mb-2">
                          {userProfileType === 'doctor' ? 'Nenhuma evolução médica encontrada' : 'Nenhum registro médico encontrado'}
                        </p>
                        <p className="text-center">
                          {userProfileType === 'doctor' 
                            ? 'Não há evoluções médicas cadastradas para este paciente'
                            : 'Não há registros médicos disponíveis'
                          }
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {evolutions.map((evolution: MedicalEvolution) => (
                        <Card 
                          key={evolution.id} 
                          className="hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => {
                            if (userProfileType === 'doctor' && evolution.doctorName === currentUser?.name) {
                              setSelectedEvolution(evolution);
                              setEditingEvolutionId(evolution.id);
                              setShowEvolutionForm(true);
                            }
                          }}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <User className="h-4 w-4 text-blue-600" />
                                  <CardTitle className="text-sm font-medium">
                                    Dr(a). {evolution.doctorName}
                                  </CardTitle>
                                  {evolution.doctorCrm && (
                                    <Badge variant="secondary" className="text-xs">
                                      CRM: {evolution.doctorCrm}
                                    </Badge>
                                  )}
                                  {evolution.isConfirmed && (
                                    <Badge className="bg-green-100 text-green-800 text-xs">
                                      Confirmado
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>{(() => {
                                      const date = new Date(evolution.createdAt);
                                      const correctedDate = new Date(date.getTime() + (3 * 60 * 60 * 1000));
                                      return correctedDate.toLocaleDateString('pt-BR');
                                    })()}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    <span>{(() => {
                                      const date = new Date(evolution.createdAt);
                                      const correctedDate = new Date(date.getTime() + (3 * 60 * 60 * 1000));
                                      return correctedDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                                    })()}</span>
                                  </div>
                                </div>
                              </div>
                              {userProfileType === 'doctor' && evolution.doctorName === currentUser?.name && (
                                <div className="flex items-center gap-2">
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEvolutionToDelete(evolution.id);
                                      setEvolutionToDeleteName(`Dr(a). ${evolution.doctorName}`);
                                      setDeleteEvolutionModalOpen(true);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="space-y-3">
                              <div>
                                <p className="text-sm font-medium text-gray-700">Queixa Principal:</p>
                                <p className="text-sm text-gray-600">{evolution.chiefComplaint}</p>
                              </div>

                              {evolution.diagnosticHypotheses && (
                                <div>
                                  <p className="text-sm font-medium text-gray-700">Hipóteses Diagnósticas:</p>
                                  <p className="text-sm text-gray-600">{evolution.diagnosticHypotheses}</p>
                                </div>
                              )}

                              {evolution.therapeuticPlan && (
                                <div>
                                  <p className="text-sm font-medium text-gray-700">Plano Terapêutico:</p>
                                  <p className="text-sm text-gray-600">{evolution.therapeuticPlan}</p>
                                </div>
                              )}

                              {evolution.prescribedMedications && (
                                <div>
                                  <p className="text-sm font-medium text-gray-700">Medicações Prescritas:</p>
                                  <p className="text-sm text-gray-600">{evolution.prescribedMedications}</p>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>


          </div>
        </Tabs>
      </div>

      {/* Modal de confirmação de exclusão de consulta */}
      <DeleteConfirmationModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirm={() => appointmentToDelete && deleteAppointmentMutation.mutate(appointmentToDelete)}
        title="Excluir Consulta"
        description={<>Tem certeza que deseja excluir a consulta <strong>{appointmentToDeleteName}</strong>?</>}
        loading={deleteAppointmentMutation.isPending}
      />

      {/* Modal de confirmação de exclusão de evolução médica */}
      <DeleteConfirmationModal
        open={deleteEvolutionModalOpen}
        onOpenChange={setDeleteEvolutionModalOpen}
        onConfirm={() => evolutionToDelete && deleteEvolutionMutation.mutate(evolutionToDelete)}
        title="Excluir Evolução Médica"
        description={<>Tem certeza que deseja excluir a evolução médica criada por <strong>{evolutionToDeleteName}</strong>?</>}
        loading={deleteEvolutionMutation.isPending}
      />
    </div>
  );
}