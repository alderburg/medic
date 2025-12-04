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
import { ValidatedInput, ValidatedTextarea } from "@/components/ui/validated-input";
import { Search, Plus, FileText, Edit2, Trash2, Calendar, Clock, User, Pill, ClipboardCheck, X, Save, ArrowLeft, BookOpen, Filter, Upload, Download, Image as ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import BottomNavigation from "@/components/bottom-navigation";
import AddMedicationDialog from "@/components/add-medication-dialog";
import DeleteConfirmationModal from "@/components/delete-confirmation-modal";
import MedicationDeleteModal from "@/components/medication-delete-modal";
import MedicationEditConfirmation from "@/components/medication-edit-confirmation";
import MedicationReactivateConfirmation from "@/components/medication-reactivate-confirmation";
import MedicationInactiveEditModal from "@/components/medication-inactive-edit-modal";
import MedicationsDesktop from "@/components/medications-desktop";
import { useToast } from "@/hooks/use-toast";
import { useFormValidation } from "@/hooks/use-form-validation";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMedicalQueries } from "@/hooks/use-medical-queries";
import { usePatientRequired } from "@/hooks/use-patient-required";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import MedicationHistoryTab from "@/components/medication-history-tab";

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

export default function Medications() {
  const isMobile = useIsMobile();
  const [, navigate] = useLocation();
  const { shouldShowPage, isRedirecting } = usePatientRequired();

  // Se está redirecionando ou não deve mostrar a página
  if (isRedirecting || !shouldShowPage) {
    return null;
  }

  // Return desktop version if not mobile
  if (!isMobile) {
    return <MedicationsDesktop />;
  }

  const [searchTerm, setSearchTerm] = useState("");
  const [historySearchTerm, setHistorySearchTerm] = useState("");
  const [medicationFilter, setMedicationFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'taken' | 'missed'>('all');
  const [historyDateFilter, setHistoryDateFilter] = useState('7d');
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');
  const [showAddMedicationForm, setShowAddMedicationForm] = useState(false);
  const [showAddPrescriptionForm, setShowAddPrescriptionForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'medications' | 'prescriptions'>('medications');
  const [medicationSubTab, setMedicationSubTab] = useState<'active' | 'history'>('active');
  const [editingMedicationId, setEditingMedicationId] = useState<number | null>(null);
  const [editingPrescriptionId, setEditingPrescriptionId] = useState<number | null>(null);
  const [deleteMedicationModalOpen, setDeleteMedicationModalOpen] = useState(false);
  const [deletePrescriptionModalOpen, setDeletePrescriptionModalOpen] = useState(false);
  const [medicationToDelete, setMedicationToDelete] = useState<number | null>(null);
  const [medicationToDeleteName, setMedicationToDeleteName] = useState<string>("");
  const [prescriptionToDelete, setPrescriptionToDelete] = useState<number | null>(null);
  const [prescriptionToDeleteName, setPrescriptionToDeleteName] = useState<string>("");
  const [deletingPrescriptionId, setDeletingPrescriptionId] = useState<number | null>(null);
  const [showEditConfirmation, setShowEditConfirmation] = useState(false);
  const [showReactivateConfirmation, setShowReactivateConfirmation] = useState(false);
  const [showInactiveEditModal, setShowInactiveEditModal] = useState(false);
  const [takenMedications, setTakenMedications] = useState<any[]>([]);
  const [pendingMedicationUpdate, setPendingMedicationUpdate] = useState<any>(null);
  const [pendingReactivation, setPendingReactivation] = useState<any>(null);
  const [reactivatingMedications, setReactivatingMedications] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [medicationFormData, setMedicationFormData] = useState({
    name: "",
    dosage: "",
    frequency: "daily",
    times: ["08:00"],
    startDate: (() => {
      // Usar horário brasileiro (UTC-3)
      const nowUTC = new Date();
      const nowBrasil = new Date(nowUTC.getTime() - (3 * 60 * 60 * 1000));
      return nowBrasil.toISOString().split('T')[0];
    })(),
    endDate: "",
    notes: "",
    isActive: true,
  });

  // Hook de validação para receitas
  const initialPrescriptionData = {
    title: "",
    doctorName: "",
    description: "",
    prescriptionDate: (() => {
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      return now.toISOString().split('T')[0];
    })(),
    filePath: "",
  };

  const prescriptionValidationRules = {
    title: { 
      required: true, 
      minLength: 2,
      maxLength: 100,
      requiredMessage: "Título é obrigatório",
      minLengthMessage: "Título deve ter pelo menos 2 caracteres",
      maxLengthMessage: "Título deve ter no máximo 100 caracteres"
    },
    doctorName: { 
      required: true, 
      minLength: 2,
      maxLength: 100,
      requiredMessage: "Nome do médico é obrigatório",
      minLengthMessage: "Nome do médico deve ter pelo menos 2 caracteres",
      maxLengthMessage: "Nome do médico deve ter no máximo 100 caracteres"
    },
    description: { 
      maxLength: 500,
      maxLengthMessage: "Descrição deve ter no máximo 500 caracteres"
    },
    prescriptionDate: { 
      required: true,
      requiredMessage: "Data da receita é obrigatória"
    }
  };

  const {
    formData: prescriptionFormData,
    setFormData: setPrescriptionFormData,
    errors: prescriptionErrors,
    validateForm: validatePrescriptionForm,
    updateField: updatePrescriptionField,
    resetForm: resetPrescriptionFormValidation
  } = useFormValidation(initialPrescriptionData, prescriptionValidationRules);

  // Estados para upload de arquivos nas receitas
  const [filePreview, setFilePreview] = useState<{ name: string; type: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [saveProgress, setSaveProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { enableMedicalQueries } = useMedicalQueries();

  const { data: medications = [], isLoading: medicationsLoading } = useQuery({
    queryKey: ["/api/medications"],
    enabled: enableMedicalQueries,
  });

  const { data: prescriptions = [], isLoading: prescriptionsLoading } = useQuery({
    queryKey: ["/api/prescriptions"],
    enabled: enableMedicalQueries,
    select: (data) => {
      // Não carregar o conteúdo dos arquivos, apenas metadados
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

  // Verificar query parameters para navegação automática
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');

    if (tab === 'history') {
      setActiveTab('medications');
      setMedicationSubTab('history');
    } else if (tab === 'prescriptions') {
      setActiveTab('prescriptions');
    }
  }, []);

  const addMedicationMutation = useMutation({
    mutationFn: async (medicationData: any) => {
      const response = await apiRequest({
        url: "/api/medications",
        method: "POST",
        data: medicationData,
        on401: "throw"
      });
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
      
      toast({
        title: "Medicamento adicionado",
        description: "O medicamento foi adicionado com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao adicionar medicamento. Tente novamente.",
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
      
      toast({
        title: "Medicamento atualizado",
        description: "O medicamento foi atualizado com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar medicamento. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const addPrescriptionMutation = useMutation({
    mutationFn: async (prescriptionData: any) => {
      // Iniciar progresso real se há arquivo
      if (prescriptionData.filePath) {
        setSaveProgress(5);
        const startTime = Date.now();
        progressIntervalRef.current = setInterval(() => {
          const elapsedTime = Date.now() - startTime;
          const estimatedDuration = 25000; // 25 segundos estimados para ir mais devagar
          const timeBasedProgress = Math.min((elapsedTime / estimatedDuration) * 80, 80);
          setSaveProgress(Math.max(5, timeBasedProgress));
        }, 200); // Atualiza menos frequentemente
      }

      try {
        const response = await apiRequest({
          url: "/api/prescriptions",
          method: "POST",
          data: prescriptionData,
          on401: "throw"
        });

        // Limpar intervalo de progresso
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }

        // Quando a API responde com sucesso, mostrar 100%
        if (prescriptionData.filePath) {
          setSaveProgress(100);
          setTimeout(() => setSaveProgress(0), 800);
        }

        return response.json();
      } catch (error) {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        setSaveProgress(0);
        throw error;
      }
    },
    onSuccess: async () => {
      // Aguardar invalidação das queries completar
      await queryClient.invalidateQueries({ queryKey: ["/api/prescriptions"] });
      
      // Aguardar refetch das queries completar
      await queryClient.refetchQueries({ queryKey: ["/api/prescriptions"] });
      
      // Só fechar o formulário após tudo estar atualizado
      setShowAddPrescriptionForm(false);
      resetPrescriptionForm();
      
      toast({
        title: "Receita adicionada",
        description: "A receita foi adicionada com sucesso.",
      });
    },
    onError: () => {
      setSaveProgress(0);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a receita. Verifique os dados e tente novamente.",
        variant: "destructive",
      });
    },
  });

  const updatePrescriptionMutation = useMutation({
    mutationFn: async ({ id, ...prescriptionData }: any) => {
      // Detectar se é um novo upload baseado no formato JSON
      const isNewUpload = 'filePath' in prescriptionData && prescriptionData.filePath && prescriptionData.filePath.startsWith('{"data":"');





      // Iniciar progresso real se há arquivo novo
      if (isNewUpload) {
        setSaveProgress(5);
        const startTime = Date.now();
        progressIntervalRef.current = setInterval(() => {
          const elapsedTime = Date.now() - startTime;
          const estimatedDuration = 25000; // 25 segundos estimados para ir mais devagar
          const timeBasedProgress = Math.min((elapsedTime / estimatedDuration) * 80, 80);
          setSaveProgress(Math.max(5, timeBasedProgress));
        }, 200); // Atualiza menos frequentemente
      }

      try {
        const response = await apiRequest({
          url: `/api/prescriptions/${id}`,
          method: "PUT",
          data: prescriptionData,
          on401: "throw"
        });

        // Limpar intervalo de progresso
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }

        // Quando a API responde com sucesso, mostrar 100%
        if (isNewUpload) {
          setSaveProgress(100);
          setTimeout(() => setSaveProgress(0), 800);
        }

        return response.json();
      } catch (error) {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        setSaveProgress(0);
        throw error;
      }
    },
    onSuccess: async () => {
      // Aguardar invalidação das queries completar
      await queryClient.invalidateQueries({ queryKey: ["/api/prescriptions"] });
      
      // Aguardar refetch das queries completar
      await queryClient.refetchQueries({ queryKey: ["/api/prescriptions"] });
      
      // Só fechar o formulário após tudo estar atualizado
      setShowAddPrescriptionForm(false);
      resetPrescriptionForm();
      
      toast({
        title: "Receita atualizada",
        description: "A receita foi atualizada com sucesso.",
      });
    },
    onError: () => {
      setSaveProgress(0);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar a receita. Verifique os dados e tente novamente.",
        variant: "destructive",
      });
    },
  });



  const deletePrescriptionMutation = useMutation({
    mutationFn: async (prescriptionId: number) => {
      setDeletingPrescriptionId(prescriptionId);
      const response = await apiRequest({
        url: `/api/prescriptions/${prescriptionId}`,
        method: "DELETE",
        on401: "throw"
      });
      return response.json();
    },
    onSuccess: async () => {
      // Aguardar invalidação das queries completar
      await queryClient.invalidateQueries({ queryKey: ["/api/prescriptions"] });
      
      // Aguardar refetch das queries completar
      await queryClient.refetchQueries({ queryKey: ["/api/prescriptions"] });
      
      // Aguardar mais tempo para garantir que o item seja completamente removido da lista
      setTimeout(() => {
        setDeletingPrescriptionId(null);
      }, 300);
      
      toast({
        title: "Receita removida",
        description: "A receita foi removida com sucesso.",
      });
    },
    onError: () => {
      setDeletingPrescriptionId(null);
      toast({
        title: "Erro",
        description: "Erro ao remover receita. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteMedicationMutation = useMutation({
    mutationFn: async (medicationId: number) => {
      const response = await apiRequest({
        url: `/api/medications/${medicationId}`,
        method: "DELETE",
        on401: "throw"
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medications"] });
      toast({
        title: "Medicamento removido",
        description: "O medicamento foi removido com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao remover medicamento. Tente novamente.",
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

  const resetMedicationForm = () => {
    setMedicationFormData({
      name: "",
      dosage: "",
      frequency: "daily",
      times: ["08:00"],
      startDate: (() => {
        // Usar horário brasileiro (UTC-3)
        const nowUTC = new Date();
        const nowBrasil = new Date(nowUTC.getTime() - (3 * 60 * 60 * 1000));
        return nowBrasil.toISOString().split('T')[0];
      })(),
      endDate: "",
      notes: "",
      isActive: true,
    });
    setEditingMedicationId(null);
  };

  const resetPrescriptionForm = () => {
    resetPrescriptionFormValidation(initialPrescriptionData);
    setFilePreview(null);
    setEditingPrescriptionId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleEditMedication = (medication: Medication) => {
    // Sempre abrir o formulário para edição, independente do status
    setMedicationFormData({
      name: medication.name,
      dosage: medication.dosage,
      frequency: medication.frequency,
      times: medication.schedules?.map(s => s.time) || ["08:00"],
      startDate: medication.startDate ? new Date(medication.startDate).toISOString().split('T')[0] : (() => {
        const nowUTC = new Date();
        const nowBrasil = new Date(nowUTC.getTime() - (3 * 60 * 60 * 1000));
        return nowBrasil.toISOString().split('T')[0];
      })(),
      endDate: medication.endDate ? new Date(medication.endDate).toISOString().split('T')[0] : "",
      notes: medication.notes || "",
      isActive: medication.isActive,
    });
    setEditingMedicationId(medication.id);
    setShowAddMedicationForm(true);
  };

  const handleEditPrescription = (prescription: Prescription) => {
    const editData = {
      title: prescription.title,
      doctorName: prescription.doctorName,
      description: prescription.description || "",
      prescriptionDate: (() => {
        const date = new Date(prescription.prescriptionDate);
        date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
        return date.toISOString().split('T')[0];
      })(),
      filePath: prescription.hasFile ? "existing_file" : "", // Marcar como arquivo existente
    };

    resetPrescriptionFormValidation(editData);

    // Se tem arquivo, configurar preview preservando o formato original
    if (prescription.hasFile) {
      let fileName = prescription.fileOriginalName || `${prescription.title}.pdf`;
      let fileType = prescription.fileType || "application/pdf";

      setFilePreview({
        name: fileName,
        type: fileType
      });
    } else {
      setFilePreview(null);
    }

    setEditingPrescriptionId(prescription.id);
    setShowAddPrescriptionForm(true);
  };

  const handleSubmitMedicationForm = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (!medicationFormData.name || !medicationFormData.dosage || !medicationFormData.frequency || !medicationFormData.startDate) {
        toast({
          title: "Erro",
          description: "Preencha todos os campos obrigatórios, incluindo a data de início.",
          variant: "destructive",
        });
        return;
      }

      const medicationData = {
        ...medicationFormData,
        schedules: medicationFormData.times.filter(time => time).map(time => ({ time }))
      };

      if (editingMedicationId) {
        // Verificar se o medicamento original está inativo
        const originalMedication = Array.isArray(medications) ? medications.find((m: Medication) => m.id === editingMedicationId) : null;

        if (originalMedication && !originalMedication.isActive) {
          // Medicamento está inativo, mostrar modal de confirmação de reativação
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
              // Há medicamentos já tomados, mostrar diálogo de confirmação
              setTakenMedications(takenToday);
              setPendingMedicationUpdate({ id: editingMedicationId, ...medicationData });
              setShowEditConfirmation(true);
              return; // Importante: sair aqui para não executar a atualização
            }
          } catch (verificationError) {
            console.error('Erro ao verificar medicamentos tomados hoje:', verificationError);
            // Em caso de erro na verificação, continuar com a atualização normal
          }
        }
        
        // Se não há mudanças de horário ou não há medicamentos tomados hoje, atualizar diretamente
        updateMedicationMutation.mutate({ id: editingMedicationId, ...medicationData, keepTakenStatus: false });
      } else {
        addMedicationMutation.mutate(medicationData);
      }
    } catch (error) {
      console.error('Erro no formulário de medicamento:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao salvar medicamento. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Função para converter arquivo para base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result as string;
        resolve(base64String.split(',')[1]);
      };
      reader.onerror = error => reject(error);
    });
  };

  // Função para upload de arquivo
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tamanho do arquivo (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 2MB. Escolha um arquivo menor.",
        variant: "destructive",
      });
      return;
    }

    // Validar tipos de arquivo
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Formato não suportado",
        description: "Selecione apenas arquivos nos formatos: JPG, PNG, PDF, DOC ou DOCX.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Progresso real de upload baseado no FileReader
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 20;
        });
      }, 200);

      const base64 = await fileToBase64(file);

      // Finalizar progresso
      clearInterval(progressInterval);
      setUploadProgress(100);

      // Armazenar o nome original do arquivo junto com o base64
      const fileData = JSON.stringify({
        data: `data:${file.type};base64,${base64}`,
        originalName: file.name,
        type: file.type
      });
      updatePrescriptionField('filePath', fileData);
      setFilePreview({
        name: file.name,
        type: file.type
      });

      // Pequeno delay para mostrar 100% antes de esconder
      setTimeout(() => {
        setUploadProgress(0);
      }, 1000);
    } catch (error) {
      toast({
        title: "Erro no upload",
        description: "Não foi possível processar o arquivo. Verifique se ele não está corrompido e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Função para remover arquivo
  const removeFile = () => {
    updatePrescriptionField('filePath', '');
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Função para obter nome do arquivo com extensão correta
  const getDisplayFileName = (prescription: Prescription) => {
    if (!prescription.hasFile) return null;

    // Usar o nome original do arquivo se disponível
    if (prescription.fileOriginalName) {
      return prescription.fileOriginalName;
    }

    // Se não tem nome original, usar o tipo MIME para determinar extensão
    if (prescription.fileType) {
      const extension = getExtensionFromMimeType(prescription.fileType);
      return `${prescription.title}${extension}`;
    }

    // Fallback para arquivos sem informação de tipo
    return `${prescription.title}.pdf`;
  };

  // Função auxiliar para obter extensão baseada no tipo MIME
  const getExtensionFromMimeType = (mimeType: string): string => {
    const mimeToExtension: Record<string, string> = {
      'application/pdf': '.pdf',
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx'
    };
    return mimeToExtension[mimeType] || '.pdf';
  };

  // Função para visualizar documento
  const handleViewDocument = (prescriptionId: number) => {
    navigate(`/document-viewer/prescription/${prescriptionId}`);
  };

  const handleSubmitPrescriptionForm = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar formulário usando o hook
    const { isValid, errorCount } = validatePrescriptionForm();

    if (!isValid) {
      toast({
        title: "Campos obrigatórios",
        description: `Por favor, corrija ${errorCount} campo${errorCount > 1 ? 's' : ''} destacado${errorCount > 1 ? 's' : ''} em vermelho.`,
        variant: "destructive",
      });
      return;
    }

    // Preparar dados para envio
    const submitData = { ...prescriptionFormData };

    // Se estamos editando, verificar se é um novo upload
    if (editingPrescriptionId) {
      // Verificar se é um novo upload baseado no formato JSON
      const isNewUpload = submitData.filePath && submitData.filePath.startsWith('{"data":"');






      // Se não é um novo upload (arquivo existente ou sem arquivo), remover filePath dos dados
      if (!isNewUpload) {

        delete submitData.filePath;
      }

      await updatePrescriptionMutation.mutateAsync({ id: editingPrescriptionId, ...submitData });
    } else {
      await addPrescriptionMutation.mutateAsync(submitData);
    }
  };

  const handleDeleteMedicationClick = (medication: Medication) => {
    setMedicationToDelete(medication.id);
    setMedicationToDeleteName(medication.name);
    setDeleteMedicationModalOpen(true);
  };

  const handleDeletePrescriptionClick = (prescriptionId: number, prescriptionTitle: string) => {
    setPrescriptionToDelete(prescriptionId);
    setPrescriptionToDeleteName(prescriptionTitle);
    setDeletePrescriptionModalOpen(true);
  };



  const handleConfirmDeletePrescription = () => {
    if (prescriptionToDelete) {
      deletePrescriptionMutation.mutate(prescriptionToDelete);
      setDeletePrescriptionModalOpen(false);
      setPrescriptionToDelete(null);
      setPrescriptionToDeleteName("");
    }
  };

  const handleEditConfirmation = async (selectedMedicationIds: number[]) => {
    if (pendingMedicationUpdate) {
      await updateMedicationMutation.mutateAsync({
        ...pendingMedicationUpdate,
        keepTakenStatus: true,
        selectedTakenMedications: selectedMedicationIds
      });
    }
  };

  const handleReactivateConfirmation = async () => {
    if (pendingReactivation) {
      try {
        // Atualizar o medicamento com os novos dados e reativá-lo
        const medicationData = {
          ...pendingReactivation.formData,
          isActive: true // Garantir que será reativado
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
  };

  const handleReactivateCancel = () => {
    setShowInactiveEditModal(false);
    setPendingReactivation(null);
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

  const calculateTimesFromFrequency = (startTime: string, frequency: string) => {
    if (!startTime) return [];

    const [hours, minutes] = startTime.split(':');
    const startHour = parseInt(hours);
    const startMinute = parseInt(minutes);

    const times = [startTime];

    switch (frequency) {
      case 'twice_daily':
        // 12h de diferença
        times.push(formatTime((startHour + 12) % 24, startMinute));
        break;
      case 'three_times_daily':
        // 8h de diferença
        times.push(formatTime((startHour + 8) % 24, startMinute));
        times.push(formatTime((startHour + 16) % 24, startMinute));
        break;
      case 'four_times_daily':
        // 6h de diferença
        times.push(formatTime((startHour + 6) % 24, startMinute));
        times.push(formatTime((startHour + 12) % 24, startMinute));
        times.push(formatTime((startHour + 18) % 24, startMinute));
        break;
      case 'every_6h':
        // A cada 6h
        times.push(formatTime((startHour + 6) % 24, startMinute));
        times.push(formatTime((startHour + 12) % 24, startMinute));
        times.push(formatTime((startHour + 18) % 24, startMinute));
        break;
      case 'every_8h':        // A cada 8h
        times.push(formatTime((startHour + 8) % 24, startMinute));
        times.push(formatTime((startHour + 16) % 24, startMinute));
        break;
      case 'every_12h':
        // A cada 12h
        times.push(formatTime((startHour + 12) % 24, startMinute));
        break;
      default:
        // daily - apenas o horário inicial
        break;
    }

    return times;
  };

  const formatTime = (hour: number, minute: number) => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  const updateStartTime = (value: string) => {
    const calculatedTimes = calculateTimesFromFrequency(value, medicationFormData.frequency);
    setMedicationFormData(prev => ({
      ...prev,
      times: calculatedTimes
    }));
  };

  const updateFrequency = (frequency: string) => {
    const startTime = medicationFormData.times[0] || "";
    const calculatedTimes = calculateTimesFromFrequency(startTime, frequency);
    setMedicationFormData(prev => ({
      ...prev,
      frequency,
      times: calculatedTimes
    }));
  };

  const filteredMedications = Array.isArray(medications) ? medications.filter((medication: Medication) => {
    const matchesSearch = medication.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         medication.dosage?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = medicationFilter === 'all' || 
                         (medicationFilter === 'active' && medication.isActive) ||
                         (medicationFilter === 'inactive' && !medication.isActive);

    return matchesSearch && matchesFilter;
  }).sort((a, b) => {
    // Quando filtro é 'all', ativos primeiro, depois inativos
    if (medicationFilter === 'all') {
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
    }
    return 0;
  }) : [];

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, medicationFilter]);

  // Separar medicamentos ativos e inativos (para exibição quando filtro é 'all')
  const activeMedications = filteredMedications.filter(m => m.isActive);
  const inactiveMedications = filteredMedications.filter(m => !m.isActive);

  // Pagination calculations
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedMedications = filteredMedications.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredMedications.length / itemsPerPage);

  const filteredPrescriptions = Array.isArray(prescriptions) ? prescriptions.filter((prescription: Prescription) =>
    prescription.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prescription.doctorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prescription.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

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
    const now = new Date();
    const endDate = medication.endDate ? new Date(medication.endDate) : null;
    if (endDate && now > endDate) return "bg-yellow-100 text-yellow-800";
    return "bg-green-100 text-green-800";
  };

  const getStatusLabel = (medication: Medication) => {
    if (!medication.isActive) return "Inativo";
    const now = new Date();
    const endDate = medication.endDate ? new Date(medication.endDate) : null;
    if (endDate && now > endDate) return "Finalizado";
    return "Ativo";
  };

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  if (medicationsLoading || prescriptionsLoading) {
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
                {activeTab === 'medications' ? 'Medicamentos' : 'Receitas'}
              </h1>
              <p className="text-sm text-slate-500">
                {activeTab === 'medications' ? 'Gerencie seus medicamentos' : 'Organize suas receitas médicas'}
              </p>
            </div>
          </div>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            activeTab === 'medications' ? 'bg-emerald-100' : 'bg-cyan-100'
          }`}>
            {activeTab === 'medications' ? (
              <Pill className="w-5 h-5 text-emerald-600" />
            ) : (
              <ClipboardCheck className="w-5 h-5 text-cyan-600" />
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-4 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => {
              setActiveTab('medications');
              setShowAddMedicationForm(false);
              setShowAddPrescriptionForm(false);
            }}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'medications'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Pill className="w-4 h-4 inline mr-2" />
            Medicamentos
          </button>

          <button
            onClick={() => {
              setActiveTab('prescriptions');
              setShowAddMedicationForm(false);
              setShowAddPrescriptionForm(false);
            }}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'prescriptions'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ClipboardCheck className="w-4 h-4 inline mr-2" />
            Receitas
          </button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-3 gap-4">
          {activeTab === 'medications' ? (
            <>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-slate-800">
                    {Array.isArray(medications) ? medications.filter((m: Medication) => m.isActive).length : 0}
                  </div>
                  <div className="text-sm text-slate-600">Ativos</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-slate-800">
                    {Array.isArray(medications) ? medications.filter((m: Medication) => m.isActive).reduce((acc: number, m: Medication) => acc + (m.schedules?.length || 0), 0) : 0}
                  </div>
                  <div className="text-sm text-slate-600">Horários/dia</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-slate-800">
                    {Array.isArray(medications) ? medications.length : 0}
                  </div>
                  <div className="text-sm text-slate-600">Total</div>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-slate-800">
                    {Array.isArray(prescriptions) ? prescriptions.length : 0}
                  </div>
                  <div className="text-sm text-slate-600">Receitas</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-slate-800">
                    {Array.isArray(prescriptions) ? prescriptions.filter((p: Prescription) => {
                      const date = new Date(p.prescriptionDate);
                      const monthsAgo = new Date();
                      monthsAgo.setMonth(monthsAgo.getMonth() - 6);
                      return date >= monthsAgo;
                    }).length : 0}
                  </div>
                  <div className="text-sm text-slate-600">Recentes</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-slate-800">
                    {Array.isArray(prescriptions) ? new Set(prescriptions.map((p: Prescription) => p.doctorName)).size : 0}
                  </div>
                  <div className="text-sm text-slate-600">Médicos</div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </header>
      <main className="pb-36 px-4 py-6">
        {/* Add Medication Form */}
        {showAddMedicationForm && activeTab === 'medications' && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => {
                    setShowAddMedicationForm(false);
                    resetMedicationForm();
                  }}
                  className="mr-3"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                {editingMedicationId ? 'Editar Medicamento' : 'Novo Medicamento'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitMedicationForm} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nome do Medicamento *</Label>
                    <Input
                      id="name"
                      value={medicationFormData.name}
                      onChange={(e) => setMedicationFormData(prev => ({...prev, name: e.target.value}))}
                      placeholder="Ex: Paracetamol"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="dosage">Dosagem *</Label>
                    <Input
                      id="dosage"
                      value={medicationFormData.dosage}
                      onChange={(e) => setMedicationFormData(prev => ({...prev, dosage: e.target.value}))}
                      placeholder="Ex: 500mg"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="frequency">Frequência *</Label>
                  <Select value={medicationFormData.frequency} onValueChange={updateFrequency}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a frequência" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">1x ao dia</SelectItem>
                      <SelectItem value="twice_daily">2x ao dia</SelectItem>
                      <SelectItem value="three_times_daily">3x ao dia</SelectItem>
                      <SelectItem value="four_times_daily">4x ao dia</SelectItem>
                      <SelectItem value="every_6h">A cada 6 horas</SelectItem>
                      <SelectItem value="every_8h">A cada 8 horas</SelectItem>
                      <SelectItem value="every_12h">A cada 12 horas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="startTime">Horário Inicial *</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={medicationFormData.times[0] || ""}
                    onChange={(e) => updateStartTime(e.target.value)}
                    className="w-full"
                    required
                  />
                  {medicationFormData.times.length > 1 && (
                    <div className="mt-3 p-3 bg-slate-50 rounded-md">
                      <Label className="text-sm text-slate-600 mb-2 block">Horários Calculados:</Label>
                      <div className="flex gap-2 flex-wrap">
                        {medicationFormData.times.map((time, index) => (
                          <Badge key={index} variant="outline" className="text-sm">
                            {time}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Data de Início *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      required
                      value={medicationFormData.startDate}
                      onChange={(e) => setMedicationFormData(prev => ({...prev, startDate: e.target.value}))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">Data de Fim (opcional)</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={medicationFormData.endDate}
                      onChange={(e) => setMedicationFormData(prev => ({...prev, endDate: e.target.value}))}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={medicationFormData.notes}
                    onChange={(e) => setMedicationFormData(prev => ({...prev, notes: e.target.value}))}
                    placeholder="Instruções especiais, observações médicas..."
                    rows={3}
                  />
                </div>

                {/* Campo de inativação - só aparece ao editar */}


                <div className="flex gap-3">
                  <Button type="submit" disabled={addMedicationMutation.isPending || updateMedicationMutation.isPending} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                    {(addMedicationMutation.isPending || updateMedicationMutation.isPending) ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {editingMedicationId ? "Atualizar Medicamento" : "Salvar Medicamento"}
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddMedicationForm(false);
                      resetMedicationForm();                    }}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Add Prescription Form */}
        {showAddPrescriptionForm && activeTab === 'prescriptions' && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => {
                    setShowAddPrescriptionForm(false);
                    resetPrescriptionForm();
                  }}
                  className="mr-3"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                {editingPrescriptionId ? 'Editar Receita' : 'Nova Receita'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitPrescriptionForm} className="space-y-4">
                <ValidatedInput
                  id="title"
                  label="Título da Receita *"
                  value={prescriptionFormData.title}
                  onChange={(e) => updatePrescriptionField('title', e.target.value)}
                  placeholder="Ex: Receita Cardiológica"
                  required
                  error={prescriptionErrors.title}
                />

                <ValidatedInput
                  id="doctorName"
                  label="Nome do Médico *"
                  value={prescriptionFormData.doctorName}
                  onChange={(e) => updatePrescriptionField('doctorName', e.target.value)}
                  placeholder="Ex: Dr. João Silva"
                  required
                  error={prescriptionErrors.doctorName}
                />

                <ValidatedTextarea
                  id="description"
                  label="Descrição dos Medicamentos"
                  value={prescriptionFormData.description}
                  onChange={(e) => updatePrescriptionField('description', e.target.value)}
                  placeholder="Descreva os medicamentos prescritos, dosagens e instruções de uso..."
                  rows={4}
                  error={prescriptionErrors.description}
                />

                <ValidatedInput
                  id="prescriptionDate"
                  label="Data da Receita *"
                  type="date"
                  value={prescriptionFormData.prescriptionDate}
                  onChange={(e) => updatePrescriptionField('prescriptionDate', e.target.value)}
                  required
                  error={prescriptionErrors.prescriptionDate}
                />

                {/* Campo de upload de arquivo */}
                <div className="space-y-2">
                  <Label>Anexar Arquivo da Receita Médica (Opcional)</Label>
                  <div className="space-y-3">
                    {filePreview ? (
                      <div className="p-3 bg-slate-50 rounded-lg border">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <FileText className="w-5 h-5 text-cyan-600 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-800 truncate">
                                {(() => {
                                  const fileName = filePreview.name;
                                  if (fileName.length > 30) {
                                    const extension = fileName.split('.').pop();
                                    const nameWithoutExtension = fileName.substring(0, fileName.lastIndexOf('.'));
                                    const truncatedName = nameWithoutExtension.substring(0, 25);
                                    return extension ? `${truncatedName}...${extension}` : `${truncatedName}...`;
                                  }
                                  return fileName;
                                })()}
                              </p>
                              <p className="text-xs text-slate-500">
                                {filePreview.type.includes('image') ? 'Imagem' : 
                                 filePreview.type.includes('pdf') ? 'PDF' : 'Documento'}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (editingPrescriptionId && prescriptionFormData.filePath === "existing_file") {
                                  // Download do arquivo existente
                                  const link = document.createElement('a');
                                  link.href = `/api/prescriptions/${editingPrescriptionId}/document`;
                                  link.download = filePreview?.name || 'documento.pdf';
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                } else if (prescriptionFormData.filePath && prescriptionFormData.filePath !== "existing_file") {
                                  // Download do arquivo novo (base64)
                                  try {
                                    const fileData = JSON.parse(prescriptionFormData.filePath);
                                    const link = document.createElement('a');
                                    link.href = `data:${filePreview?.type || 'application/octet-stream'};base64,${fileData.data}`;
                                    link.download = filePreview?.name || 'documento.pdf';
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                  } catch (error) {

                                  }
                                }
                              }}
                              className="h-8 w-8 text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50"
                              title="Baixar arquivo"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={removeFile}
                              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                              title="Remover arquivo"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Barra de progresso no card do arquivo quando salvando */}
                        {((addPrescriptionMutation.isPending || updatePrescriptionMutation.isPending) && prescriptionFormData.filePath && saveProgress > 0) && (
                          <div className="mt-3 pt-3 border-t border-slate-200">
                            <div className="flex items-center justify-between text-xs text-cyan-700 mb-2">
                              <span className="font-medium">Salvando arquivo...</span>
                              <span className="font-semibold">{Math.round(saveProgress)}%</span>
                            </div>
                            <div className="w-full bg-cyan-200 rounded-full h-2">
                              <div 
                                className="bg-cyan-600 h-2 rounded-full transition-all duration-300 ease-out"
                                style={{ width: `${saveProgress}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                        <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-sm text-slate-600 mb-2">Faça upload da receita médica</p>
                        <p className="text-xs text-slate-500 mb-3">PDF, imagem ou documento (máx. 2MB)</p>
                      </div>
                    )}

                    {/* Barra de progresso - aparece sempre que estiver carregando */}
                    {isUploading && uploadProgress > 0 && (
                      <div className="p-3 bg-cyan-50 rounded-lg border border-cyan-200">
                        <div className="flex items-center justify-between text-xs text-cyan-700 mb-2">
                          <span className="font-medium">Carregando arquivo...</span>
                          <span className="font-semibold">{Math.round(uploadProgress)}%</span>
                        </div>
                        <div className="w-full bg-cyan-200 rounded-full h-2">
                          <div 
                            className="bg-cyan-600 h-2 rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${uploadProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1"
                        disabled={isUploading}
                      >
                        {isUploading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500 mr-2"></div>
                            Carregando...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            {filePreview ? "Alterar Arquivo" : "Selecionar Arquivo"}
                          </>
                        )}
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={isUploading}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button type="submit" disabled={addPrescriptionMutation.isPending || updatePrescriptionMutation.isPending || isUploading} className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white">
                    {(addPrescriptionMutation.isPending || updatePrescriptionMutation.isPending) ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Salvando...
                      </>
                    ) : isUploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Carregando arquivo...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {editingPrescriptionId ? "Atualizar Receita" : "Salvar Receita"}
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddPrescriptionForm(false);
                      resetPrescriptionForm();
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

        {/* Show content only when forms are NOT open */}
        {!showAddMedicationForm && !showAddPrescriptionForm && (
          <>
            {/* Search and Add Button - só aparece na aba de receitas */}
            {activeTab === 'prescriptions' ? (
              <div className="flex gap-3 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar receitas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button 
                  size="default" 
                  onClick={() => {
                    setShowAddPrescriptionForm(!showAddPrescriptionForm);
                    setShowAddMedicationForm(false);
                  }}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Novo
                </Button>
              </div>
            ) : null}

            {/* Content Lists */}
          <div className="space-y-4">
          {activeTab === 'medications' ? (
            <>
              {/* Sub-tabs para Medicamentos - aparece sempre que há medicamentos no sistema */}
              {Array.isArray(medications) && medications.length > 0 && (
                <div className="flex space-x-1 mb-6 bg-slate-100 p-1 rounded-lg">
                  <button
                    onClick={() => setMedicationSubTab('active')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                      medicationSubTab === 'active'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Pill className="w-4 h-4 inline mr-2" />
                    {medicationFilter === 'all' ? `Todos (${filteredMedications.length})` :
                     medicationFilter === 'inactive' ? `Inativos (${filteredMedications.length})` : 
                     `Ativos (${activeMedications.length})`}
                  </button>
                  <button
                    onClick={() => setMedicationSubTab('history')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                      medicationSubTab === 'history'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <BookOpen className="w-4 h-4 inline mr-2" />
                    Histórico
                  </button>
                </div>
              )}

              {/* Conteúdo baseado na sub-aba */}
              {medicationSubTab === 'active' ? (
                /* Sub-aba Medicamentos Ativos */
                (Array.isArray(medications) && medications.length === 0 ? /* Nenhum medicamento cadastrado no sistema */
                (<Card>
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Pill className="w-8 h-8 text-emerald-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">
                      Nenhum medicamento cadastrado
                    </h3>
                    <p className="text-slate-600 mb-4">
                      Adicione seu primeiro medicamento para começar o monitoramento
                    </p>
                    <Button 
                      onClick={() => setShowAddMedicationForm(true)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Medicamento
                    </Button>
                  </CardContent>
                </Card>) : /* Há medicamentos no sistema */
                (<div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="text-lg font-semibold text-slate-800">
                      {medicationFilter === 'all' ? `Medicamentos (${filteredMedications.length})` :
                       medicationFilter === 'active' ? `Medicamentos Ativos (${filteredMedications.length})` :
                       `Medicamentos Inativos (${filteredMedications.length})`}
                    </h3>
                    <Button 
                      size="sm" 
                      onClick={() => setShowAddMedicationForm(true)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Novo
                    </Button>
                  </div>
                  {/* Search and Filter - sempre visível quando há medicamentos no sistema */}
                  {Array.isArray(medications) && medications.length > 0 && (
                    <div className="flex gap-2 mb-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <Input
                          placeholder="Buscar medicamentos..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <Select value={medicationFilter} onValueChange={(value: string) => setMedicationFilter(value as 'all' | 'active' | 'inactive')}>
                        <SelectTrigger className="w-[140px]">
                          <Filter className="w-4 h-4 mr-2" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="active">Ativos</SelectItem>
                          <SelectItem value="inactive">Inativos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {/* Lista de medicamentos ou mensagem de nenhum encontrado */}
                  {filteredMedications.length === 0 ? (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Pill className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-800 mb-2">
                          {searchTerm ? "Nenhum medicamento encontrado" : 
                           medicationFilter === 'active' ? "Nenhum medicamento ativo" :
                           medicationFilter === 'inactive' ? "Nenhum medicamento inativo" :
                           "Nenhum medicamento encontrado"}
                        </h3>
                        
                        <p className="text-slate-600">
                          {searchTerm ? "Tente buscar com outros termos" :
                           medicationFilter === 'active' ? "Todos os medicamentos estão inativos" :
                           medicationFilter === 'inactive' ? "Todos os medicamentos estão ativos" :
                           "Ajuste os filtros para ver mais resultados"}
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    /* Exibir medicamentos filtrados */
                    paginatedMedications.map((medication: Medication) => (
                      <Card key={medication.id} className={cn(
                        "cursor-pointer hover:shadow-md transition-shadow",
                        !medication.isActive && "bg-slate-50 border-slate-200"
                      )} onClick={() => handleEditMedication(medication)}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className={cn(
                                  "font-semibold", 
                                  medication.isActive ? "text-slate-800" : "text-slate-600"
                                )}>{medication.name}</h3>
                                <Badge className={getStatusColor(medication)}>
                                  {getStatusLabel(medication)}
                                </Badge>
                              </div>
                              <p className={cn(
                                "text-sm mb-2",
                                medication.isActive ? "text-slate-600" : "text-slate-500"
                              )}>{medication.dosage}</p>
                              <p className={cn(
                                "text-sm",
                                medication.isActive ? "text-slate-500" : "text-slate-400"
                              )}>{getFrequencyLabel(medication.frequency)}</p>
                            </div>
                            <div className="flex gap-2">
                              {medication.isActive ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteMedicationClick(medication);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              ) : (
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
                              )}
                            </div>
                          </div>

                          {medication.schedules && medication.schedules.length > 0 && (
                            <div className="flex items-center gap-2 mb-2">
                              <Clock className="w-4 h-4 text-slate-400" />
                              <div className="flex gap-2 flex-wrap">
                                {medication.schedules.map((schedule, index) => (
                                  <Badge key={index} variant="outline" className={cn(
                                    "text-xs",
                                    !medication.isActive && "text-slate-400"
                                  )}>
                                    {schedule.time}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {medication.notes && (
                            <p className={cn(
                              "text-sm p-2 rounded-md",
                              medication.isActive ? "text-slate-600 bg-slate-50" : "text-slate-500 bg-slate-100"
                            )}>
                              {medication.notes}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}

                  {/* Paginação para medicamentos - sempre visível */}
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
                </div>))
              ) : (
                /* Sub-aba de Histórico */
                <div className="space-y-4">
                  {/* Search and Filter para Histórico */}
                  <div className="flex flex-col gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <Input
                        placeholder="Buscar no histórico..."
                        value={historySearchTerm}
                        onChange={(e) => setHistorySearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Select value={historyDateFilter} onValueChange={(value: string) => setHistoryDateFilter(value)}>
                        <SelectTrigger className="flex-1">
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
                    {historyDateFilter === 'custom' && (
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Label htmlFor="startDate" className="text-sm">Data início</Label>
                          <Input
                            id="startDate"
                            type="date"
                            value={historyStartDate}
                            onChange={(e) => setHistoryStartDate(e.target.value)}
                          />
                        </div>
                        <div className="flex-1">
                          <Label htmlFor="endDate" className="text-sm">Data fim</Label>
                          <Input
                            id="endDate"
                            type="date"
                            value={historyEndDate}
                            onChange={(e) => setHistoryEndDate(e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <MedicationHistoryTab 
                    searchTerm={historySearchTerm} 
                    filter="all"
                    dateFilter={historyDateFilter}
                    customStartDate={historyStartDate}
                    customEndDate={historyEndDate}
                    onSearchChange={setHistorySearchTerm}
                    onFilterChange={() => {}}
                  />
                </div>
              )}
            </>
          ) : (
            filteredPrescriptions.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ClipboardCheck className="w-8 h-8 text-cyan-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">
                    {searchTerm ? "Nenhuma receita encontrada" : "Nenhuma receita cadastrada"}
                  </h3>
                  <p className="text-slate-600 mb-4">
                    {searchTerm 
                      ? "Tente buscar com outros termos"
                      : "Adicione sua primeira receita médica"
                    }
                  </p>
                  {!searchTerm && (
                    <Button 
                      onClick={() => setShowAddPrescriptionForm(true)}
                      className="bg-cyan-600 hover:bg-cyan-700 text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Receita
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <>
                {filteredPrescriptions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((prescription: Prescription) => (
                  <Card key={prescription.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleEditPrescription(prescription)}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-800 mb-1">{prescription.title}</h3>
                          <div className="flex items-center gap-2 mb-1">
                            <User className="w-4 h-4 text-cyan-600" />
                            <span className="text-sm text-slate-600">{prescription.doctorName}</span>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar className="w-4 h-4 text-cyan-600" />
                            <span className="text-sm text-slate-600">
                              {(() => {
                                const date = new Date(prescription.prescriptionDate);
                                date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
                                return format(date, "dd/MM/yyyy", { locale: ptBR });
                              })()}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePrescriptionClick(prescription.id, prescription.title);
                            }}
                            disabled={deletingPrescriptionId === prescription.id}
                          >
                            {deletingPrescriptionId === prescription.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {prescription.description && (
                        <div className="bg-slate-50 p-3 rounded-md mb-3">
                          <p className="text-sm text-slate-700">{prescription.description}</p>
                        </div>
                      )}

                      {prescription.hasFile && (
                        <div 
                          className="bg-cyan-50 p-3 rounded-md border border-cyan-200 mb-3 cursor-pointer hover:bg-cyan-100 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDocument(prescription.id);
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-cyan-600" />
                              <span className="text-sm font-medium text-cyan-800">
                                {getDisplayFileName(prescription)}
                              </span>
                            </div>
                            <Download className="w-4 h-4 text-cyan-600" />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {/* Paginação para receitas - sempre visível */}
                <div className="flex flex-row gap-4 items-center justify-between bg-slate-50 p-4 rounded-lg mt-6">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="itemsPerPagePrescriptions" className="text-sm font-medium text-slate-600 hidden sm:block">
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
                      disabled={currentPage === 1 || Math.ceil(filteredPrescriptions.length / itemsPerPage) === 0}
                      className="flex items-center gap-1"
                    >
                      <ChevronLeft className="w-4 h-4 sm:mr-1" />
                      <span className="hidden sm:inline">Anterior</span>
                    </Button>

                    <span className="text-sm text-slate-600 px-3">
                      {Math.ceil(filteredPrescriptions.length / itemsPerPage) === 0 ? "0 de 0" : `${currentPage} de ${Math.ceil(filteredPrescriptions.length / itemsPerPage)}`}
                    </span>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(Math.min(Math.ceil(filteredPrescriptions.length / itemsPerPage), currentPage + 1))}
                      disabled={currentPage === Math.ceil(filteredPrescriptions.length / itemsPerPage) || Math.ceil(filteredPrescriptions.length / itemsPerPage) === 0}
                      className="flex items-center gap-1"
                    >
                      <span className="hidden sm:inline">Próxima</span>
                      <ChevronRight className="w-4 h-4 sm:ml-1" />
                    </Button>
                  </div>
                </div>
              </>
            )
          )}
          </div>
          </>
        )}
      </main>
      <MedicationDeleteModal
        open={deleteMedicationModalOpen}
        onOpenChange={setDeleteMedicationModalOpen}
        medicationId={medicationToDelete || 0}
        medicationName={medicationToDeleteName}
        onSuccess={async () => {
          // Aguardar invalidação das queries antes de fechar o modal
          await queryClient.invalidateQueries({ queryKey: ["/api/medications"] });

          // Aguardar um pequeno delay para garantir que os dados foram recarregados
          await new Promise(resolve => setTimeout(resolve, 300));

          setDeleteMedicationModalOpen(false);
          setMedicationToDelete(null);
          setMedicationToDeleteName("");
        }}
      />
      <DeleteConfirmationModal
        open={deletePrescriptionModalOpen}
        onOpenChange={setDeletePrescriptionModalOpen}
        title="Excluir receita"
        description={
          <>
            Tem certeza que deseja excluir a receita "<strong>{prescriptionToDeleteName}</strong>"? Esta ação não pode ser desfeita.
          </>
        }
        onConfirm={handleConfirmDeletePrescription}
        loading={deletePrescriptionMutation.isPending}
      />
      <MedicationEditConfirmation
        open={showEditConfirmation}
        onOpenChange={setShowEditConfirmation}
        takenMedications={takenMedications}
        onConfirm={handleEditConfirmation}
        loading={updateMedicationMutation.isPending}
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
        onConfirm={handleReactivateConfirmation}
        onCancel={handleReactivateCancel}
        loading={false}
      />
      <MedicationInactiveEditModal
        open={showInactiveEditModal}
        onOpenChange={setShowInactiveEditModal}
        medicationName={pendingReactivation?.medication?.name || ""}
        onConfirm={handleReactivateConfirmation}
        loading={false}
      />
      <BottomNavigation />
    </div>
  );
}