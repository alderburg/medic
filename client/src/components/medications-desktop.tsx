import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ValidatedInput, ValidatedTextarea, ValidatedSelect } from "@/components/ui/validated-input";
import { Search, Plus, FileText, Edit2, Trash2, Calendar, Clock, User, Pill, ClipboardCheck, X, Save, BookOpen, Filter, Upload, Download, Image as ImageIcon, Activity, AlertCircle, CheckCircle, Timer, Settings, Eye, Users, TrendingUp, Target, AlertTriangle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useFormValidation } from "@/hooks/use-form-validation";
import { useMedicalQueries } from "@/hooks/use-medical-queries";
import { apiRequest } from "@/lib/queryClient";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import MedicationDeleteModal from "@/components/medication-delete-modal";
import MedicationEditConfirmation from "@/components/medication-edit-confirmation";
import MedicationReactivateConfirmation from "@/components/medication-reactivate-confirmation";
import MedicationInactiveEditModal from "@/components/medication-inactive-edit-modal";
import MedicationHistoryTab from "@/components/medication-history-tab";
import MedicationHistoryInline from "@/components/medication-history-inline";

interface Medication {
  id: number;
  name: string;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  notes?: string;
  isActive: boolean;
  schedules?: Array<{ time: string }>;
}

interface Prescription {
  id: number;
  title: string;
  doctorName: string;
  description: string;
  prescriptionDate: string;
  hasFile?: boolean;
  fileOriginalName?: string;
  fileType?: string;
}

export default function MedicationsDesktop() {
  const [, navigate] = useLocation();
  
  // Detectar parâmetro tab na URL ANTES de definir estado inicial
  const getInitialTab = (): 'overview' | 'medications' | 'prescriptions' | 'history' => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam === 'medications') return 'medications';
    if (tabParam === 'history') return 'history';
    return 'overview';
  };
  
  const [activeTab, setActiveTab] = useState<'overview' | 'medications' | 'prescriptions' | 'history'>(getInitialTab());
  const [searchTerm, setSearchTerm] = useState("");
  const [medicationFilter, setMedicationFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showAddMedicationForm, setShowAddMedicationForm] = useState(false);
  const [showAddPrescriptionForm, setShowAddPrescriptionForm] = useState(false);
  const [editingMedicationId, setEditingMedicationId] = useState<number | null>(null);
  const [deleteMedicationModalOpen, setDeleteMedicationModalOpen] = useState(false);
  const [medicationToDelete, setMedicationToDelete] = useState<number | null>(null);
  const [medicationToDeleteName, setMedicationToDeleteName] = useState<string>("");
  const [showEditConfirmation, setShowEditConfirmation] = useState(false);
  const [showReactivateConfirmation, setShowReactivateConfirmation] = useState(false);
  const [showInactiveEditModal, setShowInactiveEditModal] = useState(false);
  const [takenMedications, setTakenMedications] = useState<any[]>([]);
  const [pendingMedicationUpdate, setPendingMedicationUpdate] = useState<any>(null);
  const [pendingReactivation, setPendingReactivation] = useState<any>(null);
  const [reactivatingMedications, setReactivatingMedications] = useState<Set<number>>(new Set());
  const [loadingMedications, setLoadingMedications] = useState<{ [key: number]: boolean }>({});
  const [isSavingMedication, setIsSavingMedication] = useState(false);
  const [historySearchTerm, setHistorySearchTerm] = useState("");
  const [historyFilter, setHistoryFilter] = useState<'all' | 'taken' | 'missed'>('all');
  const [historyDateFilter, setHistoryDateFilter] = useState("7d");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [selectedMedicationLog, setSelectedMedicationLog] = useState<any>(null);
  const [isOverdueModal, setIsOverdueModal] = useState(false);
  const [showHistoryInline, setShowHistoryInline] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [medicationFormData, setMedicationFormData] = useState({
    name: "",
    dosage: "",
    frequency: "daily",
    times: ["08:00"],
    startDate: (() => {
      const nowUTC = new Date();
      const nowBrasil = new Date(nowUTC.getTime() - (3 * 60 * 60 * 1000));
      return nowBrasil.toISOString().split('T')[0];
    })(),
    endDate: "",
    notes: "",
    isActive: true,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Escutar mudanças no histórico do navegador
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      let newTab: 'overview' | 'medications' | 'prescriptions' | 'history' = 'overview';
      if (tabParam === 'medications') newTab = 'medications';
      else if (tabParam === 'history') newTab = 'history';
      setActiveTab(newTab);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sistema de validação para medicamentos
  const validationRules = {
    name: {
      required: true,
      minLength: 2,
      message: "Nome do medicamento é obrigatório (mínimo 2 caracteres)"
    },
    dosage: {
      required: true,
      message: "Dosagem é obrigatória"
    },
    frequency: {
      required: true,
      message: "Frequência é obrigatória"
    },
    startTime: {
      required: true,
      message: "Horário inicial é obrigatório"
    },
    startDate: {
      required: true,
      message: "Data de início é obrigatória"
    }
  };

  const { formData: validatedFormData, updateField, errors, validateForm, resetForm } = useFormValidation(medicationFormData, validationRules);
  const { enableMedicalQueries } = useMedicalQueries();

  // Fetch medications
  const { data: medications = [], isLoading: medicationsLoading } = useQuery({
    queryKey: ["/api/medications"],
    enabled: enableMedicalQueries,
  });

  // Fetch prescriptions
  const { data: prescriptions = [], isLoading: prescriptionsLoading } = useQuery({
    queryKey: ["/api/prescriptions"],
    enabled: enableMedicalQueries,
    select: (data) => {
      return Array.isArray(data) ? data.map((prescription: any) => ({
        id: prescription.id,
        title: prescription.title,
        doctorName: prescription.doctorName,
        description: prescription.description,
        prescriptionDate: prescription.prescriptionDate,
        hasFile: prescription.hasFile,
        fileOriginalName: prescription.fileOriginalName,
        fileType: prescription.fileType
      })) : [];
    }
  });

  // Fetch today's medication logs
  const { data: todayMedications = [], isLoading: todayLoading } = useQuery<any[]>({
    queryKey: ["/api/medication-logs/today"],
    enabled: enableMedicalQueries,
  });

  // Mutations
  const addMedicationMutation = useMutation({
    mutationFn: async (medicationData: any) => {
      const response = await apiRequest({
        url: "/api/medications",
        method: "POST",
        data: medicationData,
        on401: "throw"
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorData}`);
      }
      
      return response.json();
    },
    onSuccess: async () => {
      // Aguardar invalidação das queries completar
      await queryClient.invalidateQueries({ queryKey: ["/api/medications"] });
      
      // Aguardar refetch das queries completar
      await queryClient.refetchQueries({ queryKey: ["/api/medications"] });
      
      // Só fechar o formulário após tudo estar atualizado
      setShowAddMedicationForm(false);
      resetMedicationForm();
      setIsSavingMedication(false);
      
      toast({
        title: "Medicamento adicionado",
        description: "O medicamento foi adicionado com sucesso.",
      });
    },
    onError: (error: any) => {
      console.error('Erro ao adicionar medicamento:', error);
      setIsSavingMedication(false);
      
      let errorMessage = "Erro ao adicionar medicamento. Tente novamente.";
      if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const updateMedicationMutation = useMutation({
    mutationFn: async ({ id, keepTakenStatus, ...medicationData }: any) => {
      const response = await apiRequest({
        url: `/api/medications/${id}`,
        method: "PUT",
        data: { ...medicationData, keepTakenStatus },
        on401: "throw"
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorData}`);
      }
      
      return response.json();
    },
    onSuccess: async () => {
      // Aguardar invalidação das queries completar
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/medications"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/medication-logs"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/medication-logs/today"] })
      ]);
      
      // Aguardar refetch das queries completar
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["/api/medications"] }),
        queryClient.refetchQueries({ queryKey: ["/api/medication-logs"] }),
        queryClient.refetchQueries({ queryKey: ["/api/medication-logs/today"] })
      ]);
      
      // Só fechar o formulário após tudo estar atualizado
      setShowAddMedicationForm(false);
      resetMedicationForm();
      setShowEditConfirmation(false);
      setPendingMedicationUpdate(null);
      setIsSavingMedication(false);
      setEditingMedicationId(null);
      
      toast({
        title: "Medicamento atualizado",
        description: "O medicamento foi atualizado com sucesso.",
      });
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar medicamento:', error);
      setIsSavingMedication(false);
      setShowEditConfirmation(false);
      setPendingMedicationUpdate(null);
      
      let errorMessage = "Erro ao atualizar medicamento. Tente novamente.";
      if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const reactivateMedicationMutation = useMutation({
    mutationFn: async (medicationId: number) => {
      const response = await apiRequest({
        url: `/api/medications/${medicationId}/reactivate`,
        method: "POST",
        on401: "throw"
      });
      return response.json();
    },
    onSuccess: async () => {
      // Aguardar invalidação das queries completar
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/medications"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/medication-logs/today"] })
      ]);
      
      // Aguardar refetch das queries completar
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["/api/medications"] }),
        queryClient.refetchQueries({ queryKey: ["/api/medication-logs/today"] })
      ]);
      
      toast({
        title: "Medicamento reativado",
        description: "O medicamento foi reativado com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao reativar medicamento. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Format delay time in hours and minutes
  const formatDelayTime = (delayMinutes: number) => {
    if (delayMinutes < 60) {
      return `${delayMinutes} min`;
    }

    const hours = Math.floor(delayMinutes / 60);
    const minutes = delayMinutes % 60;

    if (minutes === 0) {
      return `${hours}h`;
    }

    return `${hours}h ${minutes}min`;
  };

  // Handle taking medication
  const handleTakeMedication = async (logId: number) => {
    if (!logId) return;

    // Buscar o log específico para verificar se é atrasado ou muito antecipado
    const log = Array.isArray(todayMedications) ? todayMedications.find((l: any) => l.id === logId) : null;
    if (!log) return;

    // Se for medicamento atrasado, abrir modal de histórico
    if (log.status === 'overdue') {
      handleOpenHistory(log, true); // true indica que é medicamento atrasado
      return;
    }

    // Verificar se o medicamento está sendo tomado muito antes do horário
    const now = new Date();
    const scheduledTime = new Date(log.scheduledDateTime);
    const minutesEarly = (scheduledTime.getTime() - now.getTime()) / (1000 * 60);

    // Se está sendo tomado mais de 60 minutos antes do horário, pedir motivo da antecedência
    if (minutesEarly > 60) {
      // Adicionar flag para indicar que é antecipado e abrir modal de histórico
      const logWithEarlyFlag = { ...log, isEarly: true };
      handleOpenHistory(logWithEarlyFlag, false); // false = não é atrasado, mas sim antecipado
      return;
    }

    setLoadingMedications(prev => ({ ...prev, [logId]: true }));

    try {
      const now = new Date();

      // Marcar como tomado com horário atual
      const response = await api.put(`/api/medication-logs/${logId}`, {
        status: 'taken',
        actualDateTime: now.toISOString(),
      });

      // Recarregar os dados
      await queryClient.invalidateQueries({ queryKey: ['/api/medication-logs/today'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/medication-logs'] });

      toast({
        title: "Medicamento tomado!",
        description: "O horário foi registrado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível registrar a tomada do medicamento.",
        variant: "destructive",
      });
    } finally {
      setLoadingMedications(prev => ({ ...prev, [logId]: false }));
    }
  };

  const handleOpenHistory = (log: any, isOverdue: boolean = false) => {
    // O log já vem com as informações do medicamento do backend
    // Se não tiver, buscar na lista de medicamentos
    if (!log.medication || !log.medication.name || log.medication.name === 'Medicamento não encontrado') {
      const medication = Array.isArray(medications) ? medications.find((med: any) => med.id === log.medicationId) : null;
      log.medication = medication || { name: 'Medicamento não encontrado', dosage: '' };
    }

    setSelectedMedicationLog(log);
    setIsOverdueModal(isOverdue);
    setShowHistoryInline(true);
  };

  const handleCloseHistory = () => {
    setShowHistoryInline(false);
    setSelectedMedicationLog(null);
    setIsOverdueModal(false);
  };

  // Helper functions
  const resetMedicationForm = () => {
    const defaultData = {
      name: "",
      dosage: "",
      frequency: "daily",
      times: ["08:00"],
      startDate: (() => {
        const nowUTC = new Date();
        const nowBrasil = new Date(nowUTC.getTime() - (3 * 60 * 60 * 1000));
        return nowBrasil.toISOString().split('T')[0];
      })(),
      endDate: "",
      notes: "",
      isActive: true,
    };
    setMedicationFormData(defaultData);
    resetForm(defaultData);
    setEditingMedicationId(null);
  };

  const handleEditMedication = (medication: Medication) => {
    const getValidDate = (dateString: string) => {
      if (!dateString) return "";
      const date = new Date(dateString);
      return !isNaN(date.getTime()) ? date.toISOString().split('T')[0] : "";
    };

    const getDefaultStartDate = () => {
      const nowUTC = new Date();
      const nowBrasil = new Date(nowUTC.getTime() - (3 * 60 * 60 * 1000));
      return nowBrasil.toISOString().split('T')[0];
    };

    const editData = {
      name: medication.name,
      dosage: medication.dosage,
      frequency: medication.frequency,
      times: medication.schedules?.map(s => s.time) || ["08:00"],
      startDate: getValidDate(medication.startDate) || getDefaultStartDate(),
      endDate: getValidDate(medication.endDate || ""),
      notes: medication.notes || "",
      isActive: medication.isActive,
    };
    
    setMedicationFormData(editData);
    resetForm(editData);
    setEditingMedicationId(medication.id);
    setShowAddMedicationForm(true);
  };

  const handleDeleteMedicationClick = (medication: Medication) => {
    setMedicationToDelete(medication.id);
    setMedicationToDeleteName(medication.name);
    setDeleteMedicationModalOpen(true);
  };

  const handleReactivateMedication = async (medicationId: number) => {
    setReactivatingMedications(prev => new Set(prev).add(medicationId));
    try {
      await reactivateMedicationMutation.mutateAsync(medicationId);
    } finally {
      setReactivatingMedications(prev => {
        const newSet = new Set(prev);
        newSet.delete(medicationId);
        return newSet;
      });
    }
  };

  const handleSubmitMedicationForm = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Se já está salvando, evitar dupla submissão
    if (isSavingMedication) {
      return;
    }
    
    try {
      // Validar horário inicial
      const startTimeValue = validatedFormData.times && validatedFormData.times.length > 0 ? validatedFormData.times[0] : "";
      
      // Criar dados temporários com horário inicial para validação
      const tempFormData = { ...validatedFormData, startTime: startTimeValue };
      
      // Executar validação
      const validationResult = validateForm();
      
      if (!validationResult.isValid) {
        const errorFields = Object.keys(validationResult.errors).length;
        const fieldText = errorFields === 1 ? "campo" : "campos";
        toast({
          title: "Erro de Validação",
          description: `Corrija ${errorFields} ${fieldText} em vermelho antes de salvar.`,
          variant: "destructive",
        });
        return;
      }

      // Ativar estado de salvamento imediatamente
      setIsSavingMedication(true);

      const medicationData = {
        ...validatedFormData,
        schedules: validatedFormData.times.filter(time => time).map(time => ({ time }))
      };

      if (editingMedicationId) {
        const originalMedication = Array.isArray(medications) ? medications.find((m: Medication) => m.id === editingMedicationId) : null;

        if (originalMedication && !originalMedication.isActive) {
          setIsSavingMedication(false); // Reset antes de abrir modal
          setPendingReactivation({
            medication: originalMedication,
            formData: medicationData
          });
          setShowInactiveEditModal(true);
          return;
        }

        // Verificar se houve mudanças significativas nos horários/frequência
        const hasScheduleChanges = originalMedication && (
          originalMedication.frequency !== medicationData.frequency ||
          JSON.stringify(originalMedication.schedules?.map((s: any) => s.time).sort()) !== 
          JSON.stringify(medicationData.schedules.map((s: any) => s.time).sort())
        );

        // Só verificar medicamentos tomados se houve mudanças de horário/frequência
        if (hasScheduleChanges) {
          try {
            const response = await apiRequest({
              url: `/api/medications/${editingMedicationId}/taken-today`,
              method: "GET",
              on401: "throw"
            });
            const takenToday = await response.json();

            if (takenToday && Array.isArray(takenToday) && takenToday.length > 0) {
              setIsSavingMedication(false); // Reset antes de abrir modal
              setTakenMedications(takenToday);
              setPendingMedicationUpdate({ id: editingMedicationId, ...medicationData });
              setShowEditConfirmation(true);
              return; // Importante: sair aqui para não executar a atualização
            }
          } catch (verificationError) {
            console.error('Erro ao verificar medicamentos tomados hoje:', verificationError);
            setIsSavingMedication(false);
            toast({
              title: "Erro",
              description: "Erro ao verificar medicamentos já tomados hoje. Tente novamente.",
              variant: "destructive",
            });
            return;
          }
        }
        
        // Se não há mudanças de horário ou não há medicamentos tomados hoje, atualizar diretamente
        updateMedicationMutation.mutate({ id: editingMedicationId, ...medicationData, keepTakenStatus: false });
      } else {
        addMedicationMutation.mutate(medicationData);
      }
    } catch (error) {
      console.error('Erro no formulário de medicamento:', error);
      setIsSavingMedication(false);
      toast({
        title: "Erro",
        description: "Erro inesperado ao salvar medicamento. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const calculateTimesFromFrequency = (startTime: string, frequency: string) => {
    if (!startTime) return [];

    const [hours, minutes] = startTime.split(':');
    const startHour = parseInt(hours);
    const startMinute = parseInt(minutes);

    const times = [startTime];

    switch (frequency) {
      case 'twice_daily':
        times.push(formatTime((startHour + 12) % 24, startMinute));
        break;
      case 'three_times_daily':
        times.push(formatTime((startHour + 8) % 24, startMinute));
        times.push(formatTime((startHour + 16) % 24, startMinute));
        break;
      case 'four_times_daily':
        times.push(formatTime((startHour + 6) % 24, startMinute));
        times.push(formatTime((startHour + 12) % 24, startMinute));
        times.push(formatTime((startHour + 18) % 24, startMinute));
        break;
      case 'every_6h':
        times.push(formatTime((startHour + 6) % 24, startMinute));
        times.push(formatTime((startHour + 12) % 24, startMinute));
        times.push(formatTime((startHour + 18) % 24, startMinute));
        break;
      case 'every_8h':
        times.push(formatTime((startHour + 8) % 24, startMinute));
        times.push(formatTime((startHour + 16) % 24, startMinute));
        break;
      case 'every_12h':
        times.push(formatTime((startHour + 12) % 24, startMinute));
        break;
      default:
        break;
    }

    return times;
  };

  const formatTime = (hour: number, minute: number) => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  const updateStartTime = (value: string) => {
    const calculatedTimes = calculateTimesFromFrequency(value, validatedFormData.frequency);
    setMedicationFormData(prev => ({ ...prev, times: calculatedTimes }));
    updateField('times', calculatedTimes);
  };

  const updateFrequency = (frequency: string) => {
    const startTime = validatedFormData.times[0] || "";
    const calculatedTimes = calculateTimesFromFrequency(startTime, frequency);
    setMedicationFormData(prev => ({ ...prev, frequency, times: calculatedTimes }));
    updateField('frequency', frequency);
    updateField('times', calculatedTimes);
  };

  // Filter medications
  const filteredMedications = Array.isArray(medications) ? medications.filter((medication: Medication) => {
    const matchesSearch = medication.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         medication.dosage?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = medicationFilter === 'all' || 
                         (medicationFilter === 'active' && medication.isActive) ||
                         (medicationFilter === 'inactive' && !medication.isActive);
    return matchesSearch && matchesFilter;
  }).sort((a, b) => {
    if (medicationFilter === 'all') {
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
    }
    return 0;
  }) : [];

  // Pagination calculations
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedMedications = filteredMedications.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredMedications.length / itemsPerPage);

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  // Calculate statistics
  const totalMedications = Array.isArray(medications) ? medications.length : 0;
  const activeMedications = Array.isArray(medications) ? medications.filter((m: Medication) => m.isActive).length : 0;
  const totalPrescriptions = Array.isArray(prescriptions) ? prescriptions.length : 0;
  const todayTaken = Array.isArray(todayMedications) ? todayMedications.filter((log: any) => log.status === 'taken').length : 0;
  const todayPending = Array.isArray(todayMedications) ? todayMedications.filter((log: any) => log.status === 'pending').length : 0;
  const todayMissed = Array.isArray(todayMedications) ? todayMedications.filter((log: any) => log.status === 'missed').length : 0;
  const adherenceRate = Array.isArray(todayMedications) && todayMedications.length > 0 ? Math.round((todayTaken / todayMedications.length) * 100) : 0;

  // Get medication by ID
  const getMedicationById = (id: number) => {
    return Array.isArray(medications) ? medications.find((med: Medication) => med.id === id) : null;
  };

  const getFrequencyLabel = (frequency: string) => {
    const labels: Record<string, string> = {
      daily: "1x ao dia",
      twice_daily: "2x ao dia",
      three_times_daily: "3x ao dia",
      four_times_daily: "4x ao dia",
      every_6h: "A cada 6h",
      every_8h: "A cada 8h",
      every_12h: "A cada 12h",
    };
    return labels[frequency] || frequency;
  };

  const getStatusColor = (medication: Medication) => {
    if (!medication.isActive) return "bg-slate-100 text-slate-600";
    try {
      const now = new Date();
      if (!medication.endDate) return "bg-green-100 text-green-800";

      const endDate = new Date(medication.endDate);
      if (!isNaN(endDate.getTime()) && now > endDate) {
        return "bg-yellow-100 text-yellow-800";
      }
      return "bg-green-100 text-green-800";
    } catch (error) {
      
      return "bg-green-100 text-green-800";
    }
  };

  const getStatusLabel = (medication: Medication) => {
    if (!medication.isActive) return "Inativo";
    try {
      const now = new Date();
      if (!medication.endDate) return "Ativo";

      const endDate = new Date(medication.endDate);
      if (!isNaN(endDate.getTime()) && now > endDate) {
        return "Finalizado";
      }
      return "Ativo";
    } catch (error) {
      
      return "Ativo";
    }
  };

  // Render overview tab
  const renderOverview = () => {
    if (medicationsLoading || prescriptionsLoading || todayLoading) {
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <div className="animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
                ))}
              </div>
            </CardContent>
          </Card>
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
                  <p className="text-sm font-medium text-gray-600">Medicamentos Ativos</p>
                  <p className="text-2xl font-bold text-emerald-600">{activeMedications}</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Pill className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Receitas Médicas</p>
                  <p className="text-2xl font-bold text-blue-600">{totalPrescriptions}</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Hoje - Tomados</p>
                  <p className="text-2xl font-bold text-green-600">{todayTaken}</p>
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
                  <p className="text-sm font-medium text-gray-600">Aderência Hoje</p>
                  <p className="text-2xl font-bold text-purple-600">{adherenceRate}%</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Target className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Medicamentos de Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!showHistoryInline ? (
              <>
                {(!Array.isArray(todayMedications) || todayMedications.length === 0) ? (
                  <div className="text-center py-8 text-gray-500">
                    <Timer className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>Nenhum medicamento agendado para hoje</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-hide">
                    {todayMedications
                      .sort((a: any, b: any) => {
                        // Primeiro ordenar por status (prioridade)
                        const statusPriority: { [key: string]: number } = { 'overdue': 1, 'pending': 2, 'taken': 3 };
                        const statusDiff = (statusPriority[a.status] || 4) - (statusPriority[b.status] || 4);
                        if (statusDiff !== 0) return statusDiff;

                        // Depois ordenar por horário programado
                        const timeA = new Date(a.scheduledDateTime).getTime();
                        const timeB = new Date(b.scheduledDateTime).getTime();
                        return timeA - timeB;
                      })
                      .map((log: any) => {
                        const medication = getMedicationById(log.medicationId);
                        if (!medication) return null;

                        // Preparar dados no formato do MedicationCard
                        const medicationCardData = {
                          id: log.id,
                          name: medication.name,
                          dosage: medication.dosage,
                          scheduledTime: new Date(log.scheduledDateTime).toLocaleTimeString('pt-BR', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            timeZone: 'UTC'
                          }),
                          actualTime: log.actualDateTime ? new Date(log.actualDateTime).toLocaleTimeString('pt-BR', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            timeZone: 'UTC'
                          }) : undefined,
                          status: log.status,
                          delayMinutes: log.delayMinutes,
                          isEarly: (log.delayMinutes || 0) < 0,
                        };

                        return (
                          <div key={log.id} 
                            className={cn(
                              "p-4 border rounded-lg transition-all duration-200 shadow-sm",
                              log.status === 'taken' && "bg-green-50 border-green-200 hover:bg-green-100 cursor-pointer",
                              log.status === 'overdue' && "bg-red-50 border-red-200",
                              log.status === 'pending' && "bg-white border-slate-200"
                            )}
                            onClick={() => {
                              if (log.status === 'taken') {
                                handleOpenHistory(log, false);
                              }
                            }}
                          >
                            <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {/* Ícone com cor baseada no status */}
                            <div className={cn(
                              "w-12 h-12 rounded-full flex items-center justify-center",
                              log.status === 'taken' && "bg-green-100",
                              log.status === 'overdue' && "bg-red-100", 
                              log.status === 'pending' && "bg-blue-50"
                            )}>
                              {log.status === 'taken' && <CheckCircle className="w-5 h-5 text-green-600" />}
                              {log.status === 'overdue' && <AlertTriangle className="w-5 h-5 text-red-700" />}
                              {log.status === 'pending' && <Clock className="w-5 h-5 text-blue-600" />}
                            </div>
                            
                            <div>
                              <h3 className="font-semibold text-slate-800">{medication.name}</h3>
                              <p className="text-sm text-slate-500">
                                Dose: {medication.dosage} • Programado: {medicationCardData.scheduledTime}
                              </p>
                              <p className={cn(
                                "text-xs font-medium",
                                log.status === 'taken' && "text-green-600",
                                log.status === 'overdue' && "text-red-700",
                                log.status === 'pending' && "text-blue-600"
                              )}>
                                {log.status === 'taken' && medicationCardData.actualTime && (
                                  <>
                                    ✓ Tomado às {medicationCardData.actualTime}
                                    {log.delayMinutes !== undefined && log.delayMinutes !== null && (
                                      log.delayMinutes < 0 
                                        ? ` (${formatDelayTime(Math.abs(log.delayMinutes))} adiantado)`
                                        : log.delayMinutes > 0 
                                        ? ` (${formatDelayTime(log.delayMinutes)} atraso)`
                                        : ' (No horário ✓)'
                                    )}
                                  </>
                                )}
                                {log.status === 'overdue' && `⚠️ Atrasado há ${formatDelayTime(log.delayMinutes || 0)}`}
                                {log.status === 'pending' && 'Pendente'}
                              </p>
                            </div>
                          </div>

                          {/* Botão Tomar apenas para pendentes e atrasados */}
                          {log.status !== 'taken' && (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTakeMedication(log.id);
                              }}
                              disabled={loadingMedications[log.id] || false}
                              className={cn(
                                "px-4 py-2 rounded-full text-sm font-medium transition-colors shadow-sm",
                                log.status === 'overdue' 
                                  ? "bg-red-600 hover:bg-red-700 text-white animate-pulse"
                                  : "bg-blue-600 hover:bg-blue-700 text-white",
                                (loadingMedications[log.id] || false) && "opacity-50 cursor-not-allowed"
                              )}
                            >
                              {loadingMedications[log.id] ? 'Salvando...' : (log.status === 'overdue' ? 'TOMAR AGORA!' : 'Tomar')}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </>
        ) : (
          selectedMedicationLog && (
            <MedicationHistoryInline
              log={selectedMedicationLog}
              onClose={handleCloseHistory}
              isOverdue={isOverdueModal}
            />
          )
        )}
      </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-emerald-600" />
                Ações Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                className="w-full justify-start gap-2 bg-emerald-600 hover:bg-emerald-700" 
                onClick={() => {
                  setActiveTab('medications');
                  setShowAddMedicationForm(true);
                }}
              >
                <Pill className="h-4 w-4" />
                Adicionar Medicamento
              </Button>
              <Button 
                className="w-full justify-start gap-2" 
                variant="outline"
                onClick={() => navigate('/prescriptions')}
              >
                <FileText className="h-4 w-4" />
                Adicionar Receita
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
                <Activity className="h-5 w-5 text-purple-600" />
                Resumo Semanal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Aderência Semanal</span>
                  <span className="text-sm font-medium">{adherenceRate}%</span>
                </div>
                <Progress value={adherenceRate} className="h-2" />
                <div className="text-xs text-gray-600">
                  Meta: 90% de aderência
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  // Render medications tab
  const renderMedications = () => (
    <div className="h-full flex flex-col">
      {showAddMedicationForm ? (
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <Pill className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {editingMedicationId ? 'Editar Medicamento' : 'Novo Medicamento'}
                    </h2>
                    <p className="text-sm text-gray-600">
                      Configure as informações do medicamento
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAddMedicationForm(false);
                    resetMedicationForm();
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitMedicationForm} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ValidatedInput
                    id="name"
                    label="Nome do Medicamento"
                    value={validatedFormData.name}
                    onChange={(e) => {
                      setMedicationFormData(prev => ({...prev, name: e.target.value}));
                      updateField('name', e.target.value);
                    }}
                    placeholder="Ex: Paracetamol"
                    required
                    error={errors.name}
                  />
                  <ValidatedInput
                    id="dosage"
                    label="Dosagem"
                    value={validatedFormData.dosage}
                    onChange={(e) => {
                      setMedicationFormData(prev => ({...prev, dosage: e.target.value}));
                      updateField('dosage', e.target.value);
                    }}
                    placeholder="Ex: 500mg"
                    required
                    error={errors.dosage}
                  />
                </div>

                <ValidatedSelect
                  id="frequency"
                  label="Frequência"
                  value={validatedFormData.frequency}
                  onValueChange={updateFrequency}
                  placeholder="Selecione a frequência"
                  required
                  error={errors.frequency}
                  options={[
                    { value: "daily", label: "1x ao dia" },
                    { value: "twice_daily", label: "2x ao dia" },
                    { value: "three_times_daily", label: "3x ao dia" },
                    { value: "four_times_daily", label: "4x ao dia" },
                    { value: "every_6h", label: "A cada 6 horas" },
                    { value: "every_8h", label: "A cada 8 horas" },
                    { value: "every_12h", label: "A cada 12 horas" }
                  ]}
                />

                <div>
                  <ValidatedInput
                    id="startTime"
                    label="Horário Inicial"
                    type="time"
                    value={validatedFormData.times[0] || ""}
                    onChange={(e) => updateStartTime(e.target.value)}
                    className="w-full"
                    required
                    error={errors.startTime}
                  />
                  {validatedFormData.times.length > 1 && (
                    <div className="mt-3 p-3 bg-slate-50 rounded-md">
                      <Label className="text-sm text-slate-600 mb-2 block">Horários Calculados:</Label>
                      <div className="flex gap-2 flex-wrap">
                        {validatedFormData.times.map((time, index) => (
                          <Badge key={index} variant="outline" className="text-sm">
                            {time}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ValidatedInput
                    id="startDate"
                    label="Data de Início"
                    type="date"
                    value={validatedFormData.startDate}
                    onChange={(e) => {
                      setMedicationFormData(prev => ({...prev, startDate: e.target.value}));
                      updateField('startDate', e.target.value);
                    }}
                    required
                    error={errors.startDate}
                  />
                  <ValidatedInput
                    id="endDate"
                    label="Data de Fim (opcional)"
                    type="date"
                    value={validatedFormData.endDate}
                    onChange={(e) => {
                      setMedicationFormData(prev => ({...prev, endDate: e.target.value}));
                      updateField('endDate', e.target.value);
                    }}
                  />
                </div>

                <ValidatedTextarea
                  id="notes"
                  label="Observações"
                  value={validatedFormData.notes}
                  onChange={(e) => {
                    setMedicationFormData(prev => ({...prev, notes: e.target.value}));
                    updateField('notes', e.target.value);
                  }}
                  placeholder="Instruções especiais, observações médicas..."
                  rows={3}
                />

                {/* Botões de Ação */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddMedicationForm(false);
                      resetMedicationForm();
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isSavingMedication || addMedicationMutation.isPending || updateMedicationMutation.isPending}
                  >
                    {(isSavingMedication || addMedicationMutation.isPending || updateMedicationMutation.isPending) ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {editingMedicationId ? "Atualizar Medicamento" : "Salvar Medicamento"}
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
              {medicationsLoading ? (
                [...Array(6)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-white rounded-lg border">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-48 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded animate-pulse w-32 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded animate-pulse w-64"></div>
                      </div>
                    </div>
                    <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                ))
              ) : filteredMedications.length === 0 ? (
                <div className="text-center py-12">
                  <Pill className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500">
                    {searchTerm ? 'Nenhum medicamento encontrado' : 'Nenhum medicamento cadastrado'}
                  </p>
                </div>
              ) : (
                <>
                  {paginatedMedications.map((medication: Medication) => (
                  <div
                    key={medication.id}
                    className={cn(
                      "flex items-center justify-between p-4 bg-white rounded-lg border cursor-pointer hover:shadow-sm transition-shadow",
                      !medication.isActive && "bg-slate-50 border-slate-200"
                    )}
                    onClick={() => handleEditMedication(medication)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                        medication.isActive ? 'bg-emerald-100' : 'bg-gray-100'
                      }`}>
                        <Pill className={`h-5 w-5 ${medication.isActive ? 'text-emerald-600' : 'text-gray-400'}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={cn(
                            "font-semibold", 
                            medication.isActive ? "text-gray-900" : "text-gray-600"
                          )}>{medication.name}</h3>
                          <Badge className={getStatusColor(medication)}>
                            {getStatusLabel(medication)}
                          </Badge>
                        </div>
                        <p className={cn(
                          "text-sm mb-1",
                          medication.isActive ? "text-gray-600" : "text-gray-500"
                        )}>{medication.dosage}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{getFrequencyLabel(medication.frequency)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>Início: {(() => {
                              if (!medication.startDate) return 'Data não informada';
                              try {
                                // Tratar a data como local para evitar problemas de timezone
                                const dateStr = medication.startDate;
                                if (dateStr.includes('T')) {
                                  // Se tem horário, usar apenas a parte da data
                                  const datePart = dateStr.split('T')[0];
                                  const [year, month, day] = datePart.split('-');
                                  return `${day}/${month}/${year}`;
                                } else {
                                  // Data no formato YYYY-MM-DD
                                  const [year, month, day] = dateStr.split('-');
                                  return `${day}/${month}/${year}`;
                                }
                              } catch (error) {
                                
                                return 'Data inválida';
                              }
                            })()}</span>
                          </div>
                          {medication.schedules && medication.schedules.length > 0 && (
                            <div className="flex items-center gap-1">
                              <Timer className="h-3 w-3" />
                              <span>Horários: {medication.schedules.map(s => s.time).join(', ')}</span>
                            </div>
                          )}
                        </div>
                        {medication.notes && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                            {medication.notes}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!medication.isActive ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReactivateMedication(medication.id);
                          }}
                          disabled={reactivatingMedications.has(medication.id)}
                          className="text-green-600 border-green-600 hover:bg-green-50"
                        >
                          {reactivatingMedications.has(medication.id) ? 'Reativando...' : 'Reativar'}
                        </Button>
                      ) : (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteMedicationClick(medication);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  ))}

                  {/* Paginação */}
                  {filteredMedications.length > 0 && (
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

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="h-8 px-3"
                        >
                          Anterior
                        </Button>
                        <span className="text-sm text-slate-600">
                          {currentPage} de {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="h-8 px-3"
                        >
                          Próximo
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

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={(value: any) => {
          setActiveTab(value);
          // Atualizar a URL sem recarregar a página
          const url = new URL(window.location.href);
          if (value === 'medications') {
            url.searchParams.set('tab', 'medications');
          } else if (value === 'history') {
            url.searchParams.set('tab', 'history');
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
                <TabsTrigger value="medications" className="flex items-center gap-2">
                  <Pill className="h-4 w-4" />
                  Medicamentos
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4" />
                  Histórico
                </TabsTrigger>
              </TabsList>
              
              {activeTab === 'medications' && (
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Pesquisar medicamentos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-80"
                    />
                  </div>
                  <Select value={medicationFilter} onValueChange={(value: any) => setMedicationFilter(value)}>
                    <SelectTrigger className="w-40">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="active">Ativos</SelectItem>
                      <SelectItem value="inactive">Inativos</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={() => setShowAddMedicationForm(true)} 
                    className="bg-emerald-600 hover:bg-emerald-700"
                    disabled={showAddMedicationForm || editingMedicationId !== null}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Medicamento
                  </Button>
                </div>
              )}
              
              {activeTab === 'history' && (
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Buscar no histórico..."
                      value={historySearchTerm}
                      onChange={(e) => setHistorySearchTerm(e.target.value)}
                      className="pl-10 w-80"
                    />
                  </div>
                  <Select value={historyDateFilter} onValueChange={setHistoryDateFilter}>
                    <SelectTrigger className="w-52">
                      <Calendar className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">Últimos 7 dias</SelectItem>
                      <SelectItem value="30d">Últimos 30 dias</SelectItem>
                      <SelectItem value="90d">Últimos 90 dias</SelectItem>
                      <SelectItem value="custom">Personalizado</SelectItem>
                    </SelectContent>
                  </Select>

                </div>
              )}
            </div>
          </div>

          <div className="flex-1 p-6 overflow-hidden">
            <TabsContent value="overview" className="mt-0 h-full overflow-y-auto scrollbar-hide">
              {renderOverview()}
            </TabsContent>

            <TabsContent value="medications" className="mt-0 h-full">
              {medicationsLoading ? (
                <div className="space-y-2">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-white rounded-lg border">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse"></div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div>
                            <div className="h-5 bg-gray-200 rounded animate-pulse w-16"></div>
                          </div>
                          <div className="h-3 bg-gray-200 rounded animate-pulse w-24 mb-2"></div>
                          <div className="flex items-center gap-4">
                            <div className="h-3 bg-gray-200 rounded animate-pulse w-20"></div>
                            <div className="h-3 bg-gray-200 rounded animate-pulse w-28"></div>
                            <div className="h-3 bg-gray-200 rounded animate-pulse w-36"></div>
                          </div>
                        </div>
                      </div>
                      <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              ) : (
                renderMedications()
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-0 h-full overflow-y-auto scrollbar-hide">
              <div className="space-y-4">
                {historyDateFilter === 'custom' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border">
                    <div>
                      <Label htmlFor="start-date" className="text-sm font-medium text-slate-700">
                        Data Inicial
                      </Label>
                      <Input
                        id="start-date"
                        type="date"
                        value={customStartDate}
                        onChange={(e) => {
                          const newStartDate = e.target.value;
                          setCustomStartDate(newStartDate);

                          // Se data final já está preenchida e é anterior à nova data inicial, limpar
                          if (customEndDate && newStartDate > customEndDate) {
                            setCustomEndDate("");
                          }
                        }}
                        className="mt-1"
                        max={customEndDate || undefined}
                      />
                    </div>
                    <div>
                      <Label htmlFor="end-date" className="text-sm font-medium text-slate-700">
                        Data Final
                      </Label>
                      <Input
                        id="end-date"
                        type="date"
                        value={customEndDate}
                        onChange={(e) => {
                          const newEndDate = e.target.value;
                          
                          // Validar se data final não é anterior à inicial
                          if (customStartDate && newEndDate < customStartDate) {
                            return; // Não permite definir data final anterior à inicial
                          }
                          
                          setCustomEndDate(newEndDate);
                        }}
                        className="mt-1"
                        min={customStartDate || undefined}
                      />
                      {customStartDate && customEndDate && customEndDate < customStartDate && (
                        <p className="text-xs text-red-600 mt-1">
                          Data final não pode ser anterior à data inicial
                        </p>
                      )}
                    </div>
                  </div>
                )}
                <MedicationHistoryTab
                  searchTerm={historySearchTerm}
                  filter="all"
                  dateFilter={historyDateFilter}
                  customStartDate={customStartDate}
                  customEndDate={customEndDate}
                  onSearchChange={setHistorySearchTerm}
                  onFilterChange={() => {}}
                />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Modals */}
      <MedicationDeleteModal
        open={deleteMedicationModalOpen}
        onOpenChange={setDeleteMedicationModalOpen}
        medicationId={medicationToDelete || 0}
        medicationName={medicationToDeleteName}
        onSuccess={async () => {
          await queryClient.invalidateQueries({ queryKey: ["/api/medications"] });
          await new Promise(resolve => setTimeout(resolve, 300));
          setDeleteMedicationModalOpen(false);
          setMedicationToDelete(null);
          setMedicationToDeleteName("");
        }}
      />

      <MedicationEditConfirmation
        open={showEditConfirmation}
        onOpenChange={(open) => {
          setShowEditConfirmation(open);
          if (!open) {
            setIsSavingMedication(false);
            setPendingMedicationUpdate(null);
            setTakenMedications([]);
          }
        }}
        takenMedications={takenMedications}
        onConfirm={async (selectedMedicationIds: number[]) => {
          if (pendingMedicationUpdate) {
            setIsSavingMedication(true);
            try {
              await updateMedicationMutation.mutateAsync({
                ...pendingMedicationUpdate,
                keepTakenStatus: true,
                selectedTakenMedications: selectedMedicationIds
              });
            } catch (error) {
              console.error('Erro na confirmação de edição:', error);
              setIsSavingMedication(false);
            }
          }
        }}
        loading={updateMedicationMutation.isPending || isSavingMedication}
        medicationName={(() => {
          if (!editingMedicationId || !Array.isArray(medications)) return undefined;
          const medication = medications.find((m: any) => m.id === editingMedicationId);
          return medication?.name;
        })()}
      />

      <MedicationReactivateConfirmation
        open={showReactivateConfirmation}
        onOpenChange={setShowReactivateConfirmation}
        medicationName={pendingReactivation?.medication?.name || ""}
        onConfirm={async () => {
          if (pendingReactivation) {
            try {
              const medicationData = {
                ...pendingReactivation.formData,
                isActive: true
              };

              await updateMedicationMutation.mutateAsync({ 
                id: pendingReactivation.medication.id, 
                ...medicationData, 
                keepTakenStatus: false 
              });

              setShowInactiveEditModal(false);
              setPendingReactivation(null);
            } catch (error) {
              
            }
          }
        }}
        onCancel={() => {
          setShowInactiveEditModal(false);
          setPendingReactivation(null);
        }}
        loading={false}
      />

      <MedicationInactiveEditModal
        open={showInactiveEditModal}
        onOpenChange={(open) => {
          setShowInactiveEditModal(open);
          if (!open) {
            setIsSavingMedication(false);
            setPendingReactivation(null);
          }
        }}
        medicationName={pendingReactivation?.medication?.name || ""}
        onConfirm={async () => {
          if (pendingReactivation) {
            setIsSavingMedication(true);
            try {
              const medicationData = {
                ...pendingReactivation.formData,
                isActive: true
              };

              await updateMedicationMutation.mutateAsync({ 
                id: pendingReactivation.medication.id, 
                ...medicationData, 
                keepTakenStatus: false 
              });

              setShowInactiveEditModal(false);
              setPendingReactivation(null);
            } catch (error) {
              console.error('Erro ao reativar medicamento:', error);
              setIsSavingMedication(false);
            }
          }
        }}
        loading={updateMedicationMutation.isPending || isSavingMedication}
      />

    </div>
  );
}