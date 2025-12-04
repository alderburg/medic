import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ValidatedInput, ValidatedSelect, ValidatedTextarea } from "@/components/ui/validated-input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, Plus, FileText, Calendar, MapPin, Save, X, Trash2, Edit2, Edit, Filter, AlertCircle, CheckCircle, XCircle, Timer, Upload, Download, File, FlaskConical, Activity, TrendingUp, Target, Eye, User, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useFormValidation } from "@/hooks/use-form-validation";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import DeleteConfirmationModal from "@/components/delete-confirmation-modal";
import DocumentViewer from "@/components/document-viewer";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMedicalQueries } from "@/hooks/use-medical-queries";
import TestsMobile from "@/pages/tests";


interface Test {
  id: number;
  name: string;
  type: string;
  testDate: string;
  location: string;
  results?: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'missed';
  filePath?: string;
  hasFile?: boolean;
  examRequestId?: number;
}

interface ExamRequest {
  id: number;
  patientId: number;
  doctorId: number;
  doctorName: string;
  doctorCrm?: string;
  doctorGender?: 'male' | 'female';
  examName: string;
  examCategory: string;
  clinicalIndication: string;
  urgency: 'normal' | 'urgent' | 'very_urgent';
  specialInstructions?: string;
  medicalNotes?: string;
  validityDate?: string;
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled';
  scheduledTestId?: number;
  createdAt: string;
  updatedAt: string;
}



export default function TestsDesktop() {
  const [, navigate] = useLocation();

  // Ler parâmetro da URL na inicialização
  const getInitialTab = (): 'overview' | 'tests' | 'requests' => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam === 'tests') return 'tests';
    if (tabParam === 'requisicoes') return 'requests';
    return 'overview';
  };

  const [activeTab, setActiveTab] = useState<'overview' | 'tests' | 'requests'>(getInitialTab());
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'completed' | 'cancelled' | 'missed'>('all');
  const [dateFilter, setDateFilter] = useState<'today' | '7d' | '30d' | '90d' | 'custom'>('30d');
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [testToDelete, setTestToDelete] = useState<number | null>(null);
  const [testToDeleteName, setTestToDeleteName] = useState<string>("");
  const [deletingTestId, setDeletingTestId] = useState<number | null>(null);
  const [confirmingTestId, setConfirmingTestId] = useState<number | null>(null);
  const [confirmingAction, setConfirmingAction] = useState<'completed' | 'cancelled' | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [filePreview, setFilePreview] = useState<{ name: string; type: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [saveProgress, setSaveProgress] = useState(0);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentRequestsPage, setCurrentRequestsPage] = useState(1);
  const [requestsItemsPerPage, setRequestsItemsPerPage] = useState(10);
  const [showRequestSelectionModal, setShowRequestSelectionModal] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [editingRequestId, setEditingRequestId] = useState<number | null>(null);
  const [deleteRequestModalOpen, setDeleteRequestModalOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<number | null>(null);
  const [requestToDeleteName, setRequestToDeleteName] = useState<string>("");
  const [requestHasScheduledTest, setRequestHasScheduledTest] = useState(false);
  const [scheduledTestInfo, setScheduledTestInfo] = useState<any>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialFormData = {
    name: "",
    type: "",
    testDate: "",
    testTime: "",
    location: "",
    filePath: "",
  };

  const initialRequestFormData = {
    patientId: 0,
    examName: "",
    examCategory: "",
    clinicalIndication: "",
    urgency: "normal",
    specialInstructions: "",
    medicalNotes: "",
    validityDate: "",
  };

  // Sistema de validação
  const validationRules = {
    name: {
      required: true,
      minLength: 2,
      message: "Nome do exame é obrigatório (mínimo 2 caracteres)"
    },
    type: {
      required: true,
      message: "Tipo do exame é obrigatório"
    },
    testDate: {
      required: true,
      message: "Data do exame é obrigatória"
    },
    testTime: {
      required: true,
      message: "Horário do exame é obrigatório"
    },
    location: {
      required: false,
      minLength: 2,
      message: "Local deve ter pelo menos 2 caracteres"
    }
  };

  const { formData, updateField, errors, validateForm, resetForm } = useFormValidation(initialFormData, validationRules);

  const requestValidationRules = {
    examName: {
      required: true,
      minLength: 2,
      message: "Nome do exame é obrigatório (mínimo 2 caracteres)"
    },
    examCategory: {
      required: true,
      message: "Categoria do exame é obrigatória"
    },
    clinicalIndication: {
      required: true,
      minLength: 10,
      message: "Indicação clínica é obrigatória (mínimo 10 caracteres)"
    },
    urgency: {
      required: true,
      message: "Nível de urgência é obrigatório"
    },
    patientId: {
      required: true,
      custom: (value: any) => value > 0 ? null : "Paciente deve ser selecionado"
    }
  };

  const { 
    formData: requestFormData, 
    updateField: updateRequestField, 
    errors: requestErrors, 
    validateForm: validateRequestForm, 
    resetForm: resetRequestForm 
  } = useFormValidation(initialRequestFormData, requestValidationRules);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { enableMedicalQueries } = useMedicalQueries();

  // Check if user is a doctor to determine available actions
  const { data: currentUser } = useQuery({
    queryKey: ["/auth/me"],
    enabled: true,
  });

  // Buscar dados do paciente selecionado quando necessário
  const { data: selectedPatientData } = useQuery({
    queryKey: [`/patients/${(currentUser as any)?.selectedPatientId}/basic`],
    enabled: !!(currentUser as any)?.selectedPatientId,
  });

  // Solução temporária: forçar como doctor já que está logado como médico
  const userProfileType = 'doctor'; // (currentUser as any)?.profileType || 'patient';

  const { data: tests = [], isLoading: testsLoading } = useQuery<any[]>({
    queryKey: ["/api/tests"],
    enabled: enableMedicalQueries,
  });

  const { data: examRequests = [], isLoading: examRequestsLoading } = useQuery<ExamRequest[]>({
    queryKey: ["/api/exam-requests"],
    enabled: enableMedicalQueries,
  });

  // Detectar parâmetro action=new na URL para abrir automaticamente o formulário de requisições
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    
    if (action === 'new' && !showRequestForm) {
      setActiveTab('requests');
      setShowRequestForm(true);
      // Limpar o parâmetro da URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [showRequestForm]);

  // Query para buscar pacientes disponíveis (para médicos)
  const { data: patients = [] } = useQuery({
    queryKey: ["/api/users/search-patients"],
    enabled: userProfileType === 'doctor',
  });



  const addTestMutation = useMutation({
    mutationFn: async (testData: any) => {
      setIsSaving(true);
      // Simular progresso baseado no tempo real se há arquivo
      if (testData.filePath) {
        setSaveProgress(5);
        const startTime = Date.now();
        progressIntervalRef.current = setInterval(() => {
          const elapsedTime = Date.now() - startTime;
          // Estimar progresso baseado no tempo (máx 85% durante requisição)
          const estimatedDuration = 12000; // 12 segundos estimados
          const timeBasedProgress = Math.min((elapsedTime / estimatedDuration) * 85, 85);
          setSaveProgress(Math.max(5, timeBasedProgress));
        }, 150);
      }

      try {
        const response = await apiRequest({
          url: "/api/tests",
          method: "POST",
          data: testData,
          on401: "throw"
        });

        if (testData.filePath) {
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
          }
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
    onSuccess: async (data) => {
      // Aguardar a invalidação e refetch das queries
      await queryClient.invalidateQueries({ queryKey: ["/api/tests"] });
      await queryClient.refetchQueries({ queryKey: ["/api/tests"] });

      // Se foi criado a partir de uma requisição, atualizar também as requisições
      if (selectedRequestId) {
        console.log(`📋 Exame criado com sucesso (ID: ${data?.id}), invalidando requisições...`);
        await queryClient.invalidateQueries({ queryKey: ["/api/exam-requests"] });
        await queryClient.refetchQueries({ queryKey: ["/api/exam-requests"] });
      }

      // Aguardar um delay para garantir que a lista foi atualizada
      await new Promise(resolve => setTimeout(resolve, 500));

      // Fechar formulário apenas após a lista ser atualizada
      setShowAddForm(false);
      resetForm();
      setEditingId(null);
      setSelectedRequestId(null);
      setFilePreview(null);
      setIsSaving(false);

      toast({
        title: "Exame salvo",
        description: selectedRequestId ? "Exame agendado com base na requisição médica." : "O exame foi salvo com sucesso.",
      });
    },
    onError: () => {
      setIsSaving(false);
      toast({
        title: "Erro",
        description: "Erro ao salvar exame. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const updateTestMutation = useMutation({
    mutationFn: async ({ id, ...testData }: any) => {
      setIsSaving(true);

      // Detectar se é um novo arquivo ou arquivo existente
      const hasNewFile = testData.filePath && 
        typeof testData.filePath === 'string' && 
        testData.filePath.startsWith('{"data":"');

      // Verificar se a data do exame está sendo alterada - buscar exame original
      const isDateChanged = 'testDate' in testData && testData.testDate;

      if (isDateChanged) {
        // Buscar exame original para verificar status atual
        const originalTest = Array.isArray(tests) ? tests.find((t: Test) => t.id === id) : null;

        if (originalTest) {
          // Se o exame já estava como completed/cancelled, só altera status se for para data futura
          if (originalTest.status === 'completed' || originalTest.status === 'cancelled') {
            const newTestDate = new Date(testData.testDate);
            const now = new Date();

            // Se nova data é futura, resetar para permitir recálculo
            if (newTestDate > now) {

              testData.status = 'scheduled';
            } else {
              // Se nova data é passada/presente, manter status original

              // Não incluir status no update para manter o valor atual
              delete testData.status;
            }
          } else {
            // Para outros status, sempre recalcular

            testData.status = 'scheduled';
          }
        }
      }

      if (hasNewFile) {
        setSaveProgress(5);
        const startTime = Date.now();
        progressIntervalRef.current = setInterval(() => {
          const elapsedTime = Date.now() - startTime;
          const estimatedDuration = 12000;
          const timeBasedProgress = Math.min((elapsedTime / estimatedDuration) * 85, 85);
          setSaveProgress(Math.max(5, timeBasedProgress));
        }, 150);
      }

      try {
        const response = await apiRequest({
          url: `/api/tests/${id}`,
          method: "PUT",
          data: testData,
          on401: "throw"
        });

        if (hasNewFile) {
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
          }
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
      // Aguardar a invalidação e refetch das queries
      await queryClient.invalidateQueries({ queryKey: ["/api/tests"] });
      await queryClient.refetchQueries({ queryKey: ["/api/tests"] });

      // Aguardar um delay para garantir que a lista foi atualizada
      await new Promise(resolve => setTimeout(resolve, 500));

      // Fechar formulário apenas após a lista ser atualizada
      setShowAddForm(false);
      resetForm();
      setEditingId(null);
      setFilePreview(null);
      setIsSaving(false);

      toast({
        title: "Exame atualizado",
        description: "O exame foi atualizado com sucesso.",
      });
    },
    onError: () => {
      setIsSaving(false);
      toast({
        title: "Erro",
        description: "Erro ao atualizar exame. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Mutations para requisições
  const createRequestMutation = useMutation({
    mutationFn: async (requestData: any) => {
      const response = await apiRequest({
        url: "/api/exam-requests",
        method: "POST",
        data: requestData,
        on401: "throw"
      });
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/exam-requests"] });
      setShowRequestForm(false);
      resetRequestForm();
      setEditingRequestId(null);
      toast({
        title: "Requisição criada",
        description: "Nova requisição de exame foi criada com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao criar requisição. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const updateRequestMutation = useMutation({
    mutationFn: async ({ id, ...requestData }: any) => {
      const response = await apiRequest({
        url: `/api/exam-requests/${id}`,
        method: "PUT",
        data: requestData,
        on401: "throw"
      });
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/exam-requests"] });
      setShowRequestForm(false);
      resetRequestForm();
      setEditingRequestId(null);
      toast({
        title: "Requisição atualizada",
        description: "Requisição foi atualizada com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar requisição. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteRequestMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest({
        url: `/api/exam-requests/${id}`,
        method: "DELETE",
        on401: "throw"
      });
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/exam-requests"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/tests"] });
      setDeleteRequestModalOpen(false);
      setRequestToDelete(null);
      setRequestToDeleteName("");
      setRequestHasScheduledTest(false);
      setScheduledTestInfo(null);
      toast({
        title: "Requisição excluída",
        description: requestHasScheduledTest 
          ? "Requisição e exame agendado foram excluídos com sucesso."
          : "Requisição foi excluída com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao excluir requisição. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteTestMutation = useMutation({
    mutationFn: async (id: number) => {
      setDeletingTestId(id);
      const response = await apiRequest({
        url: `/api/tests/${id}`,
        method: "DELETE",
        on401: "throw"
      });
      return response.json();
    },
    onSuccess: async () => {
      // Aguardar a invalidação e refetch das queries
      await queryClient.invalidateQueries({ queryKey: ["/api/tests"] });
      await queryClient.refetchQueries({ queryKey: ["/api/tests"] });

      // Aguardar um delay para garantir que a lista foi atualizada
      await new Promise(resolve => setTimeout(resolve, 500));

      // Fechar modal apenas após a lista ser atualizada
      setDeleteModalOpen(false);
      setTestToDelete(null);
      setTestToDeleteName("");

      setTimeout(() => {
        setDeletingTestId(null);
      }, 1000);

      toast({
        title: "Exame excluído",
        description: "O exame foi excluído com sucesso.",
      });
    },
    onError: () => {
      setDeletingTestId(null);
      setDeleteModalOpen(false);
      setTestToDelete(null);
      setTestToDeleteName("");
      toast({
        title: "Erro",
        description: "Erro ao excluir exame. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const confirmTestMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: 'completed' | 'cancelled' }) => {
      setConfirmingTestId(id);
      setConfirmingAction(status);
      const response = await apiRequest({
        url: `/api/tests/${id}`,
        method: "PUT",
        data: { status },
        on401: "throw"
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tests"] });
      queryClient.refetchQueries({ queryKey: ["/api/tests"] });

      setTimeout(() => {
        setConfirmingTestId(null);
        setConfirmingAction(null);
      }, 1500);
      toast({
        title: variables.status === 'completed' ? "Exame confirmado" : "Exame cancelado",
        description: variables.status === 'completed' 
          ? "O exame foi marcado como realizado." 
          : "O exame foi marcado como cancelado.",
      });
    },
    onError: () => {
      setConfirmingTestId(null);
      setConfirmingAction(null);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status do exame.",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Tipo de arquivo não suportado",
        description: "Apenas PDF, JPG, PNG, DOC e DOCX são permitidos.",
        variant: "destructive",
      });
      return;
    }

    // Validar tamanho (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 2MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const reader = new FileReader();
    reader.onloadstart = () => setUploadProgress(10);
    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        const progress = (e.loaded / e.total) * 80 + 10;
        setUploadProgress(progress);
      }
    };
    reader.onload = () => {
      setUploadProgress(100);
      const base64 = reader.result as string;
      const fileData = {
        data: base64.split(',')[1],
        type: file.type,
        name: file.name
      };

      updateField('filePath', JSON.stringify(fileData));
      setFilePreview({ name: file.name, type: file.type });

      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);
    };
    reader.onerror = () => {
      setIsUploading(false);
      setUploadProgress(0);
      toast({
        title: "Erro no upload",
        description: "Erro ao carregar arquivo. Tente novamente.",
        variant: "destructive",
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    updateField('filePath', '');
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const { isValid, errors: validationErrors } = validateForm();

    if (!isValid) {
      // Identificar campos obrigatórios não preenchidos
      const missingFields = [];
      if (!formData.name.trim()) missingFields.push("Nome do exame");
      if (!formData.type.trim()) missingFields.push("Tipo do exame");
      if (!formData.testDate.trim()) missingFields.push("Data do exame");
      if (!formData.testTime.trim()) missingFields.push("Horário do exame");

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

    // Combinar data e horário antes de enviar
    const { testTime, ...dataToSend } = formData;
    const testData = {
      ...dataToSend,
      testDate: formData.testDate + 'T' + formData.testTime + ':00',
    };

    // Adicionar examRequestId apenas se houver uma requisição selecionada
    if (selectedRequestId) {
      (testData as any).examRequestId = selectedRequestId;
      console.log(`📋 Criando exame vinculado à requisição ${selectedRequestId}`);
    }

    if (editingId) {
      updateTestMutation.mutate({ id: editingId, ...testData });
    } else {
      addTestMutation.mutate(testData);
    }
  };

  // Funções para gerenciar requisições
  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const { isValid } = validateRequestForm();

    if (!isValid) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    const requestData = {
      ...requestFormData,
      validityDate: requestFormData.validityDate ? new Date(requestFormData.validityDate).toISOString() : null,
    };

    if (editingRequestId) {
      updateRequestMutation.mutate({ id: editingRequestId, ...requestData });
    } else {
      createRequestMutation.mutate(requestData);
    }
  };

  const handleEditRequest = (request: ExamRequest) => {
    setEditingRequestId(request.id);
    updateRequestField('patientId', request.patientId);
    updateRequestField('examName', request.examName);
    updateRequestField('examCategory', request.examCategory);
    updateRequestField('clinicalIndication', request.clinicalIndication);
    updateRequestField('urgency', request.urgency);
    updateRequestField('specialInstructions', request.specialInstructions || "");
    updateRequestField('medicalNotes', request.medicalNotes || "");
    updateRequestField('validityDate', request.validityDate ? format(new Date(request.validityDate), 'yyyy-MM-dd') : "");
    setShowRequestForm(true);
    console.log('🔍 After setShowRequestForm(true)');
  };

  const handleCancelRequestForm = () => {
    setShowRequestForm(false);
    setEditingRequestId(null);
    resetRequestForm();
  };

  const handleNewRequest = () => {
    setEditingRequestId(null);
    resetRequestForm();
    // Set current user's patient context if available
    if (currentUser && (currentUser as any).selectedPatientId) {
      updateRequestField('patientId', (currentUser as any).selectedPatientId);
    } else {
      // Como o sistema já tem contexto do paciente selecionado, usar ID 8 (Ritiele)
      updateRequestField('patientId', 8);
    }
    setShowRequestForm(true);
  };

  const handleDeleteRequest = (request: ExamRequest) => {
    // Verificar se a requisição tem exame agendado
    const hasScheduledTest = request.status === 'scheduled' && request.scheduledTestId;
    let scheduledTest = null;

    if (hasScheduledTest) {
      scheduledTest = tests.find((test: any) => test.id === request.scheduledTestId);

      // Mostrar toast de aviso
      toast({
        title: "Atenção: Exame já agendado",
        description: `Esta requisição possui um exame agendado para ${scheduledTest ? format(new Date(scheduledTest.testDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'data não encontrada'}.`,
        variant: "destructive",
      });
    }

    setRequestToDelete(request.id);
    setRequestToDeleteName(request.examName);
    setRequestHasScheduledTest(hasScheduledTest);
    setScheduledTestInfo(scheduledTest);
    setDeleteRequestModalOpen(true);
  };

  const handleEdit = (test: Test) => {
    setEditingId(test.id);
    const dateTime = new Date(test.testDate);
    const testDate = dateTime.toISOString().slice(0, 10);
    const testTime = dateTime.toISOString().slice(11, 16);

    updateField('name', test.name);
    updateField('type', test.type);
    updateField('testDate', testDate);
    updateField('testTime', testTime);
    updateField('location', test.location);
    setSelectedRequestId(test.examRequestId || null);

    if (test.filePath) {
      updateField('filePath', test.filePath);
      const fileName = `${test.name}.${getFileExtension(test.filePath)}`;
      setFilePreview({ name: fileName, type: getFileType(test.filePath) });
    }

    setShowAddForm(true);
    setActiveTab('tests');
  };

  const handleDelete = (id: number, name: string) => {
    setTestToDelete(id);
    setTestToDeleteName(name);
    setDeleteModalOpen(true);
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingId(null);
    setSelectedRequestId(null);
    resetForm();
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileExtension = (filePath: string) => {
    if (!filePath) return 'pdf';

    const preview = filePath.substring(0, 50);
    if (preview.includes('image/png')) return 'png';
    if (preview.includes('image/jpeg')) return 'jpg';
    if (preview.includes('application/pdf')) return 'pdf';
    if (preview.includes('application/msword')) return 'doc';
    if (preview.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')) return 'docx';
    return 'pdf';
  };

  const getFileType = (filePath: string) => {
    if (!filePath) return 'application/pdf';

    const preview = filePath.substring(0, 50);
    if (preview.includes('image/png')) return 'image/png';
    if (preview.includes('image/jpeg')) return 'image/jpeg';
    if (preview.includes('application/pdf')) return 'application/pdf';
    if (preview.includes('application/msword')) return 'application/msword';
    if (preview.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    return 'application/pdf';
  };

  const getTestStatus = (test: Test) => {
    const testDate = new Date(test.testDate);
    // Aplicar correção de timezone para comparação correta
    const correctedTestDate = new Date(testDate.getTime() + (3 * 60 * 60 * 1000));
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const testDay = new Date(correctedTestDate);
    testDay.setHours(0, 0, 0, 0);

    // Se já tem status definido como realizado ou cancelado
    if (test.status === 'completed' || test.status === 'cancelled') {
      return test.status;
    }

    // Se é hoje
    if (testDay.getTime() === today.getTime()) {
      // Verifica se já passou do horário (com 15 minutos de tolerância)
      const toleranceMs = 15 * 60 * 1000; // 15 minutos em milliseconds
      if (now.getTime() > (correctedTestDate.getTime() + toleranceMs)) {
        return 'overdue'; // Passou do horário, precisa confirmar
      }
      return 'today'; // É hoje mas ainda não passou
    }

    // Se é no futuro
    if (testDay > today) {
      return 'scheduled';
    }

    // Se é no passado e não foi confirmado
    return 'missed';
  };

  const getStatusColor = (test: Test) => {
    const status = getTestStatus(test);
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

  const getStatusIcon = (test: Test) => {
    const status = getTestStatus(test);
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

  const getStatusLabel = (test: Test) => {
    const status = getTestStatus(test);
    switch (status) {
      case 'today':
        return "HOJE";
      case 'scheduled':
        return "Agendado";
      case 'completed':
        return "Realizado";
      case 'cancelled':
        return "Cancelado";
      case 'overdue':
        return "Confirmar";
      case 'missed':
        return "Perdido";
      default:
        return "Pendente";
    }
  };

  const shouldShowConfirmationButtons = (test: Test) => {
    // Só mostra botões para exames que passaram do horário (status 'overdue')
    return getTestStatus(test) === 'overdue';
  };

  const getFilteredTests = () => {
    let filtered = Array.isArray(tests) ? tests.filter((test: Test) => {
      const matchesSearch = !searchTerm || 
        test.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        test.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (test.location && test.location.toLowerCase().includes(searchTerm.toLowerCase()));

      // Filtro por status, incluindo "missed" (perdidos)
      let matchesStatus = true;
      if (statusFilter === 'missed') {
        matchesStatus = getTestStatus(test) === 'missed';
      } else if (statusFilter === 'scheduled') {
        // Para "scheduled", só mostra exames que realmente estão agendados (não perdidos)
        const status = getTestStatus(test);
        matchesStatus = status === 'scheduled' || status === 'today' || status === 'overdue';
      } else if (statusFilter !== 'all') {
        matchesStatus = test.status === statusFilter;
      }

      // Filtro por data
      const testDate = new Date(test.testDate);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      let matchesDate = true;
      if (dateFilter === 'today') {
        const testDay = new Date(testDate.getFullYear(), testDate.getMonth(), testDate.getDate());
        matchesDate = testDay.getTime() === today.getTime();
      } else if (dateFilter === '7d') {
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);
        matchesDate = testDate >= sevenDaysAgo;
      } else if (dateFilter === '30d') {
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        matchesDate = testDate >= thirtyDaysAgo;
      } else if (dateFilter === '90d') {
        const ninetyDaysAgo = new Date(today);
        ninetyDaysAgo.setDate(today.getDate() - 90);
        matchesDate = testDate >= ninetyDaysAgo;
      } else if (dateFilter === 'custom' && startDate && endDate) {
        // Usar strings de data diretamente para evitar problemas de timezone
        const testDateStr = testDate.toISOString().split('T')[0]; // YYYY-MM-DD
        matchesDate = testDateStr >= startDate && testDateStr <= endDate;
      }

      return matchesSearch && matchesStatus && matchesDate;
    }) : [];

    // Ordenação avançada com prioridade
    return filtered.sort((a: any, b: any) => {
      const testDateA = new Date(a.testDate);
      const testDateB = new Date(b.testDate);

      const now = new Date();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const dayA = new Date(testDateA);
      dayA.setHours(0, 0, 0, 0);
      const dayB = new Date(testDateB);
      dayB.setHours(0, 0, 0, 0);

      const statusA = getTestStatus(a);
      const statusB = getTestStatus(b);

      // 1. Prioridade máxima: exames de HOJE (com pulsação)
      const isTodayA = statusA === 'today';
      const isTodayB = statusB === 'today';

      if (isTodayA && !isTodayB) return -1;
      if (!isTodayA && isTodayB) return 1;

      // 2. Segunda prioridade: exames que precisam de confirmação (overdue)
      const isOverdueA = statusA === 'overdue';
      const isOverdueB = statusB === 'overdue';

      if (isOverdueA && !isOverdueB) return -1;
      if (!isOverdueA && isOverdueB) return 1;

      // 3. Terceira prioridade: exames agendados futuros
      const isScheduledA = statusA === 'scheduled';
      const isScheduledB = statusB === 'scheduled';

      if (isScheduledA && !isScheduledB) return -1;
      if (!isScheduledA && isScheduledB) return 1;

      // 4. Dentro do mesmo grupo de status, ordenar por data/hora
      if (isTodayA && isTodayB) {
        // Para exames de hoje, ordenar por horário (mais próximo primeiro)
        return testDateA.getTime() - testDateB.getTime();
      }

      if (isOverdueA && isOverdueB) {
        // Para exames em atraso, ordenar por data/hora (mais recente primeiro)
        return testDateB.getTime() - testDateA.getTime();
      }

      if (isScheduledA && isScheduledB) {
        // Para exames agendados, ordenar por data/hora (mais próximo primeiro)
        return testDateA.getTime() - testDateB.getTime();
      }

      // 5. Para outros status (completed, cancelled, missed), ordenar por data mais recente primeiro
      return testDateB.getTime() - testDateA.getTime();
    });
  };

  const filteredTests = getFilteredTests();

  // Função para filtrar requisições de exames
  const getFilteredExamRequests = () => {
    let filtered = Array.isArray(examRequests) ? examRequests.filter((request: ExamRequest) => {
      const matchesSearch = !searchTerm || 
        request.examName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.examCategory.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.clinicalIndication.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (request.specialInstructions && request.specialInstructions.toLowerCase().includes(searchTerm.toLowerCase()));

      // Filtro por status
      let matchesStatus = true;
      if (statusFilter !== 'all') {
        matchesStatus = request.status === statusFilter;
      }

      // Filtro por data (baseado na data de criação da requisição)
      const requestDate = new Date(request.createdAt);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      let matchesDate = true;
      if (dateFilter === 'today') {
        const requestDay = new Date(requestDate.getFullYear(), requestDate.getMonth(), requestDate.getDate());
        matchesDate = requestDay.getTime() === today.getTime();
      } else if (dateFilter === '7d') {
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);
        matchesDate = requestDate >= sevenDaysAgo;
      } else if (dateFilter === '30d') {
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        matchesDate = requestDate >= thirtyDaysAgo;
      } else if (dateFilter === '90d') {
        const ninetyDaysAgo = new Date(today);
        ninetyDaysAgo.setDate(today.getDate() - 90);
        matchesDate = requestDate >= ninetyDaysAgo;
      } else if (dateFilter === 'custom' && startDate && endDate) {
        // Usar strings de data diretamente para evitar problemas de timezone
        const requestDateStr = requestDate.toISOString().split('T')[0]; // YYYY-MM-DD
        matchesDate = requestDateStr >= startDate && requestDateStr <= endDate;
      }

      return matchesSearch && matchesStatus && matchesDate;
    }) : [];

    // Ordenação: pending primeiro, depois scheduled, depois outros por data
    return filtered.sort((a: ExamRequest, b: ExamRequest) => {
      // Primeiro ordenar por status: pending antes de scheduled
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;

      // Dentro do mesmo status, ordenar por data (mais recente primeiro)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  };

  const filteredExamRequests = getFilteredExamRequests();

  // Paginação das requisições
  const requestsStartIndex = (currentRequestsPage - 1) * requestsItemsPerPage;
  const requestsEndIndex = requestsStartIndex + requestsItemsPerPage;
  const paginatedExamRequests = filteredExamRequests.slice(requestsStartIndex, requestsEndIndex);
  const requestsTotalPages = Math.ceil(filteredExamRequests.length / requestsItemsPerPage);

  const getStatistics = () => {
    const total = tests.length;
    const scheduled = tests.filter((t: Test) => ['scheduled', 'today', 'overdue'].includes(getTestStatus(t))).length;
    const completed = tests.filter((t: Test) => getTestStatus(t) === 'completed').length;
    const missed = tests.filter((t: Test) => getTestStatus(t) === 'missed').length;

    return { total, scheduled, completed, missed };
  };

  const stats = getStatistics();

  // Função para abrir modal de seleção de requisição
  const handleNewExamClick = () => {
    const availableRequests = examRequests.filter((req: ExamRequest) => req.status === 'pending');

    if (availableRequests.length === 0) {
      toast({
        title: "Nenhuma requisição disponível",
        description: "É necessário ter uma requisição médica para agendar um exame. Solicite uma requisição antes de continuar.",
        variant: "destructive",
      });
      return;
    }

    setShowRequestSelectionModal(true);
  };

  // Função para confirmar seleção de requisição
  const handleConfirmRequestSelection = () => {
    if (!selectedRequestId) {
      toast({
        title: "Selecione uma requisição",
        description: "É necessário selecionar uma requisição para continuar.",
        variant: "destructive",
      });
      return;
    }

    const selectedRequest = examRequests.find((req: ExamRequest) => req.id === selectedRequestId);
    if (selectedRequest) {
      // Preencher formulário com dados da requisição
      updateField('name', selectedRequest.examName);
      updateField('type', selectedRequest.examCategory);

      // Limpar outros campos
      updateField('testDate', '');
      updateField('testTime', '');
      updateField('location', '');
    }

    setShowRequestSelectionModal(false);
    setShowAddForm(true);
    setActiveTab('tests');
  };

  // Função para cancelar seleção de requisição
  const handleCancelRequestSelection = () => {
    setShowRequestSelectionModal(false);
    setSelectedRequestId(null);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value, 10));
    setCurrentPage(1); // Reset para a primeira página ao mudar o número de itens por página
  };

  const handleRequestsPageChange = (newPage: number) => {
    setCurrentRequestsPage(newPage);
  };

  const handleRequestsItemsPerPageChange = (value: string) => {
    setRequestsItemsPerPage(parseInt(value, 10));
    setCurrentRequestsPage(1); // Reset para a primeira página ao mudar o número de itens por página
  };

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTests = filteredTests.slice(startIndex, endIndex);

  const totalPages = Math.ceil(filteredTests.length / itemsPerPage);


  // Render overview tab
  const renderOverview = () => {
    if (testsLoading) {
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

          {/* Skeleton para seção de ações rápidas e próximos exames */}
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
                  <p className="text-sm font-medium text-gray-600">Total de Exames</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.total}</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <FlaskConical className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Agendados</p>
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
                  <p className="text-sm font-medium text-gray-600">Realizados</p>
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
                  <p className="text-sm font-medium text-gray-600">Perdidos</p>
                  <p className="text-2xl font-bold text-red-600">{stats.missed}</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-red-100 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-yellow-600" />
                Ações Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                className="w-full justify-start gap-2 bg-yellow-600 hover:bg-yellow-700" 
                onClick={() => {
                  setShowAddForm(true);
                  setActiveTab('tests');
                }}
              >
                <FlaskConical className="h-4 w-4" />
                Adicionar Novo Exame
              </Button>
              <Button 
                className="w-full justify-start gap-2" 
                variant="outline"
                onClick={() => navigate('/appointments')}
              >
                <Calendar className="h-4 w-4" />
                Ver Consultas
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
                <FlaskConical className="h-5 w-5 text-blue-600" />
                Próximos Exames
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tests.filter((t: Test) => ['scheduled', 'today', 'overdue'].includes(getTestStatus(t))).length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Timer className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>Nenhum exame agendado</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tests
                    .filter((t: Test) => {
                      // Filtrar apenas exames de hoje e do futuro
                      const testDate = new Date(t.testDate);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);

                      const testDay = new Date(testDate);
                      testDay.setHours(0, 0, 0, 0);

                      return testDay.getTime() >= today.getTime() && 
                             ['scheduled', 'today', 'overdue'].includes(getTestStatus(t));
                    })
                    .slice(0, 3)
                    .map((test: Test) => (
                      <div key={test.id} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-3 cursor-pointer hover:bg-gray-100 transition-colors -m-4 p-4 rounded-lg" onClick={() => {
                          setActiveTab('tests');
                          handleEdit(test);
                        }}>
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <FlaskConical className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold">{test.name}</h4>
                              <p className="text-sm text-gray-600">{test.type}</p>
                              <p className="text-xs text-gray-500">
                                {(() => {
                                  const date = new Date(test.testDate);
                                  const correctedDate = new Date(date.getTime() + (3 * 60 * 60 * 1000));
                                  return format(correctedDate, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR });
                                })()}
                              </p>
                            </div>
                          </div>
                          <Badge className={getStatusColor(test)}>
                            {getStatusIcon(test)}
                            <span className="ml-1">{getStatusLabel(test)}</span>
                          </Badge>
                        </div>

                        {/* Botões de confirmação para exames que passaram do horário */}
                        {shouldShowConfirmationButtons(test) && (
                          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm text-yellow-800 mb-2">
                              Este exame já passou do horário. Ele foi realizado?
                            </p>
                            <div className="flex gap-2 w-full">
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  confirmTestMutation.mutate({ id: test.id, status: 'completed' });
                                }}
                                disabled={confirmingTestId === test.id}
                                className="bg-green-600 hover:bg-green-700 text-white flex-1"
                              >
                                {(confirmingTestId === test.id && confirmingAction === 'completed') ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Confirmando...
                                  </>
                                ) : (
                                  "✓ Sim, foi realizado"
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  confirmTestMutation.mutate({ id: test.id, status: 'cancelled' });
                                }}
                                disabled={confirmingTestId === test.id}
                                className="border-red-300 text-red-700 hover:bg-red-50 flex-1"
                              >
                                {(confirmingTestId === test.id && confirmingAction === 'cancelled') ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                                    Cancelando...
                                  </>
                                ) : (
                                  "✗ Não foi realizado"
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

  // Render tests tab
  const renderTests = () => (
    <div className="h-full flex flex-col">
      {showAddForm ? (
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <FlaskConical className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {editingId ? 'Editar Exame' : 'Novo Exame'}
                    </h2>
                    <p className="text-sm text-gray-600">
                      Preencha as informações do exame médico
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
                    label="Nome do Exame"
                    id="name"
                    value={formData.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="Ex: Hemograma completo"
                    required
                    error={errors.name}
                  />
                  <ValidatedInput
                    label="Tipo do Exame"
                    id="type"
                    value={formData.type}
                    onChange={(e) => updateField('type', e.target.value)}
                    placeholder="Ex: Exame de sangue"
                    required
                    error={errors.type}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <ValidatedInput
                      label="Data do Exame"
                      id="testDate"
                      type="date"
                      value={formData.testDate}
                      onChange={(e) => updateField('testDate', e.target.value)}
                      required
                      error={errors.testDate}
                    />
                    <ValidatedInput
                      label="Horário do Exame"
                      id="testTime"
                      type="time"
                      value={formData.testTime}
                      onChange={(e) => updateField('testTime', e.target.value)}
                      required
                      error={errors.testTime}
                    />
                  </div>
                  <ValidatedInput
                    label="Local"
                    id="location"
                    value={formData.location}
                    onChange={(e) => updateField('location', e.target.value)}
                    placeholder="Laboratório, clínica, etc."
                    error={errors.location}
                  />
                </div>

                {/* Campo de upload de arquivo */}
                <div className="space-y-2">
                  <Label>Anexar Arquivo (Laudo/Resultado)</Label>
                  <div className="space-y-3">
                    {filePreview ? (
                      <div className="p-3 bg-slate-50 rounded-lg border">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <File className="w-5 h-5 text-yellow-600 flex-shrink-0" />
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
                            {editingId && (
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  if (editingId) {
                                    navigate(`/document-viewer/test/${editingId}?tab=tests`);
                                  }
                                }}
                                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={handleRemoveFile}
                              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Barra de progresso no card do arquivo quando salvando */}
                        {(isSaving && formData.filePath && saveProgress > 0) && (
                          <div className="mt-3 pt-3 border-t border-slate-200">
                            <div className="flex items-center justify-between text-xs text-yellow-700 mb-2">
                              <span className="font-medium">Salvando arquivo...</span>
                              <span className="font-semibold">{Math.round(saveProgress)}%</span>
                            </div>
                            <div className="w-full bg-yellow-200 rounded-full h-2">
                              <div 
                                className="bg-yellow-600 h-2 rounded-full transition-all duration-300 ease-out"
                                style={{ width: `${saveProgress}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                        <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-sm text-slate-600 mb-2">Faça upload do laudo ou resultado</p>
                        <p className="text-xs text-slate-500 mb-3">PDF, imagem ou documento (máx. 2MB)</p>
                      </div>
                    )}

                    {/* Barra de progresso - aparece sempre que estiver carregando */}
                    {isUploading && uploadProgress > 0 && (
                      <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div className="flex items-center justify-between text-xs text-yellow-700 mb-2">
                          <span className="font-medium">Carregando arquivo...</span>
                          <span className="font-semibold">{Math.round(uploadProgress)}%</span>
                        </div>
                        <div className="w-full bg-yellow-200 rounded-full h-2">
                          <div 
                            className="bg-yellow-600 h-2 rounded-full transition-all duration-300 ease-out"
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
                        {editingId ? 'Atualizar Exame' : 'Salvar Exame'}
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
            <div className="space-y-3 pb-4">
              {testsLoading ? (
                [...Array(6)].map((_, i) => (
                  <div key={i} className="animate-pulse bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-gray-200 rounded-lg"></div>
                        <div className="space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-48"></div>
                          <div className="h-3 bg-gray-200 rounded w-32"></div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-6 w-16 bg-gray-200 rounded"></div>
                        <div className="h-8 w-20 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  </div>
                ))
              ) : filteredTests.length === 0 ? (
                <div className="text-center py-12">
                  <FlaskConical className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500">
                    {searchTerm ? 'Nenhum exame encontrado' : 'Nenhum exame cadastrado'}
                  </p>
                </div>
              ) : (
                <>
                  {paginatedTests.map((test: Test) => {
                  const testStatus = getTestStatus(test);
                  const getFileNameFromPath = (filePath: string, testName?: string) => {
                    if (!filePath) return null;

                    let fileName = '';

                    // Verificar se é o novo formato JSON com nome original
                    try {
                      const fileData = JSON.parse(filePath);
                      if (fileData.originalName) {
                        fileName = fileData.originalName;
                      } else if (fileData.data && fileData.data.startsWith('data:')) {
                        // Fallback para formato JSON sem nome original
                        const mimeMatch = fileData.data.match(/data:([^;]+);/);
                        const mimeType = mimeMatch ? mimeMatch[1] : 'unknown';

                        let extension = 'file';
                        if (mimeType.includes('pdf')) {
                          extension = 'pdf';
                        } else if (mimeType.includes('image/png')) {
                          extension = 'png';
                        } else if (mimeType.includes('image/jpeg') || mimeType.includes('image/jpg')) {
                          extension = 'jpg';
                        } else if (mimeType.includes('image/gif')) {
                          extension = 'gif';
                        } else if (mimeType.includes('image')) {
                          extension = 'png';
                        } else if (mimeType.includes('word') || mimeType.includes('document')) {
                          extension = 'doc';
                        }

                        fileName = `${testName || 'documento'}.${extension}`;
                      }
                    } catch (e) {
                      // Se não for JSON válido, tratar como formato antigo
                      if (filePath.startsWith('data:')) {
                        const mimeMatch = filePath.match(/data:([^;]+);/);
                        const mimeType = mimeMatch ? mimeMatch[1] : 'unknown';

                        let extension = 'file';
                        if (mimeType.includes('image/png')) {
                          extension = 'png';
                        } else if (mimeType.includes('image/jpeg') || mimeType.includes('image/jpg')) {
                          extension = 'jpg';
                        } else if (mimeType.includes('image/gif')) {
                          extension = 'gif';
                        } else if (mimeType.includes('image')) {
                          extension = 'png';
                        } else if (mimeType.includes('pdf')) {
                          extension = 'pdf';
                        } else if (mimeType.includes('word') || mimeType.includes('document')) {
                          extension = 'doc';
                        } else {
                          extension = 'file';
                        }

                        fileName = `${testName || 'documento'}.${extension}`;
                      } else {
                        if (filePath.includes('/')) {
                          fileName = filePath.split('/').pop() || filePath;
                        } else {
                          fileName = filePath;
                        }
                      }
                    }

                    // Truncar o nome do arquivo se for muito longo (máximo 30 caracteres)
                    if (fileName.length > 30) {
                      const extension = fileName.split('.').pop();
                      const nameWithoutExtension = fileName.substring(0, fileName.lastIndexOf('.'));
                      const truncatedName = nameWithoutExtension.substring(0, 25);
                      fileName = extension ? `${truncatedName}...${extension}` : `${truncatedName}...`;
                    }

                    return fileName;
                  };

                  return (
                    <Card 
                      key={test.id} 
                      className="hover:shadow-lg transition-all duration-200 cursor-pointer"
                      onClick={() => handleEdit(test)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                              <FlaskConical className="h-5 w-5 text-yellow-600" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-gray-900">{test.name}</h3>
                                <Badge className={getStatusColor(test)}>
                                  {getStatusIcon(test)}
                                  <span className="ml-1">{getStatusLabel(test)}</span>
                                </Badge>
                              </div>
                              {test.type && (
                                <p className="text-sm text-gray-600">{test.type}</p>
                              )}
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(test.id, test.name);
                            }}
                            disabled={deletingTestId === test.id}
                          >
                            {deletingTestId === test.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>

                        <div className="space-y-2 mb-4">

<div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="h-4 w-4" />
                            <span>{(() => {
                              const date = new Date(test.testDate);
                              const correctedDate = new Date(date.getTime() + (3 * 60 * 60 * 1000));
                              return format(correctedDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
                            })()}</span>
                          </div>
                          {test.location && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <MapPin className="h-4 w-4" />
                              <span>{test.location}</span>
                            </div>
                          )}
                        </div>

                        {test.filePath && (
                          <div 
                            className="bg-blue-50 p-3 rounded-md border border-blue-200 mb-3 cursor-pointer hover:bg-blue-100 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/document-viewer/test/${test.id}?tab=tests`);
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-blue-600" />
                                <span className="text-sm font-medium text-blue-800">
                                  {getFileNameFromPath(test.filePath, test.name) || "Arquivo anexado"}
                                </span>
                              </div>
                              <Download className="w-4 h-4 text-blue-600" />
                            </div>
                          </div>
                        )}

                        {/* Botões de confirmação para exames que passaram do horário */}
                        {shouldShowConfirmationButtons(test) && (
                          <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm text-yellow-800 mb-2">
                              Este exame já passou do horário. Ele foi realizado?
                            </p>
                            <div className="flex gap-2 w-full">
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  confirmTestMutation.mutate({ id: test.id, status: 'completed' });
                                }}
                                disabled={confirmingTestId === test.id}
                                className="bg-green-600 hover:bg-green-700 text-white flex-1"
                              >
                                {(confirmingTestId === test.id && confirmingAction === 'completed') ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Confirmando...
                                  </>
                                ) : (
                                  "✓ Sim, foi realizado"
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  confirmTestMutation.mutate({ id: test.id, status: 'cancelled' });
                                }}
                                disabled={confirmingTestId === test.id}
                                className="border-red-300 text-red-700 hover:bg-red-50 flex-1"
                              >
                                {(confirmingTestId === test.id && confirmingAction === 'cancelled') ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                                    Cancelando...
                                  </>
                                ) : (
                                  "✗ Não foi realizado"
                                )}
                              </Button>
                            </div>
                          </div>
                        )}

                        {test.results && (
                          <div className="bg-green-50 p-3 rounded-md border border-green-200">
                            <h4 className="font-medium text-green-800 mb-1">Resultado:</h4>
                            <p className="text-sm text-green-700">{test.results}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}

                  {/* Controles de paginação */}
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
          // Limpar filtros ao mudar de aba
          setSearchTerm("");
          setStatusFilter('all');
          setDateFilter('30d');
          setStartDate("");
          setEndDate("");
          // Atualizar a URL sem recarregar a página
          const url = new URL(window.location.href);
          if (value === 'tests') {
            url.searchParams.set('tab', 'tests');
          } else if (value === 'requests') {
            url.searchParams.set('tab', 'requisicoes');
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
                <TabsTrigger value="requests" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Requisições de Exames
                </TabsTrigger>
                <TabsTrigger value="tests" className="flex items-center gap-2">
                  <FlaskConical className="h-4 w-4" />
                  Exames
                </TabsTrigger>

              </TabsList>

              {(activeTab === 'tests' || activeTab === 'requests') && (
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder={activeTab === 'tests' ? "Pesquisar exames..." : "Pesquisar requisições..."}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-80"
                    />
                  </div>
                  {activeTab === 'tests' ? (
                    <>
                      <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                        <SelectTrigger className="w-40">
                          <Filter className="h-4 w-4 mr-2" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="scheduled">Agendados</SelectItem>
                          <SelectItem value="completed">Realizados</SelectItem>
                          <SelectItem value="missed">Perdidos</SelectItem>
                          <SelectItem value="cancelled">Cancelados</SelectItem>
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
                      <Button 
                        onClick={handleNewExamClick} disabled={showAddForm || editingId !== null} 
                        className="bg-yellow-600 hover:bg-yellow-700"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Novo Exame
                      </Button>
                    </>
                  ) : (
                    <>
                      <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                        <SelectTrigger className="w-40">
                          <Filter className="h-4 w-4 mr-2" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="pending">Pendentes</SelectItem>
                          <SelectItem value="scheduled">Agendados</SelectItem>
                          <SelectItem value="completed">Concluídos</SelectItem>
                          <SelectItem value="cancelled">Cancelados</SelectItem>
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
                      <Button 
                        className={cn(
                          "bg-blue-600 hover:bg-blue-700",
                          showRequestForm && "opacity-50 cursor-not-allowed"
                        )}
                        onClick={handleNewRequest}
                        disabled={showRequestForm}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Nova Requisição
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 p-6 overflow-hidden">
            <TabsContent value="overview" className="mt-0 h-full overflow-y-auto scrollbar-hide">
              {renderOverview()}
            </TabsContent>

            {/* Aba de Requisições de Exames */}
            <TabsContent value="requests" className="mt-0 h-full overflow-y-auto scrollbar-hide">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <div>
                      <h3 className="font-medium text-blue-900">Requisições Médicas de Exames</h3>
                      <p className="text-sm text-blue-700">
                        Exames solicitados pelos médicos que podem ser agendados
                      </p>
                    </div>
                  </div>
                  {examRequests.filter(req => req.status === 'pending').length === 0 ? (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Nenhuma requisição pendente
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      {Math.min(filteredExamRequests.filter(req => req.status === 'pending').length, 2)} requisições pendentes
                    </Badge>
                  )}
                </div>

                {/* Formulário inline de nova/edição de requisição */}
                {showRequestForm && (
                  <Card className="mb-6">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <FileText className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">
                              {editingRequestId ? 'Editar Requisição' : 'Nova Requisição de Exame'}
                            </CardTitle>
                            <p className="text-sm text-gray-600">
                              Preencha as informações da requisição médica
                            </p>
                          </div>
                        </div>
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={handleCancelRequestForm}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleRequestSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Campo do Paciente (somente leitura) */}
                          {userProfileType === 'doctor' && (
                            <div className="md:col-span-2">
                              <Label htmlFor="patientName">Paciente</Label>
                              <Input
                                id="patientName"
                                value="Ritiele Aldeburg Fera"
                                readOnly
                                className="bg-gray-50 cursor-not-allowed"
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Paciente selecionado automaticamente com base na sua pesquisa
                              </p>
                            </div>
                          )}

                          {/* Nome do Exame */}
                          <div>
                            <Label htmlFor="examName">Nome do Exame *</Label>
                            <Input
                              id="examName"
                              value={requestFormData.examName}
                              onChange={(e) => updateRequestField('examName', e.target.value)}
                              placeholder="Ex: Hemograma Completo"
                              className={cn(requestErrors.examName && "border-red-500")}
                            />
                            {requestErrors.examName && (
                              <p className="text-xs text-red-500 mt-1">{requestErrors.examName}</p>
                            )}
                          </div>

                          {/* Categoria do Exame */}
                          <div>
                            <Label htmlFor="examCategory">Categoria *</Label>
                            <Select 
                              value={requestFormData.examCategory} 
                              onValueChange={(value) => updateRequestField('examCategory', value)}
                            >
                              <SelectTrigger className={cn(requestErrors.examCategory && "border-red-500")}>
                                <SelectValue placeholder="Selecione a categoria" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Laboratorial">Laboratorial</SelectItem>
                                <SelectItem value="Imagem">Imagem</SelectItem>
                                <SelectItem value="Cardiológico">Cardiológico</SelectItem>
                                <SelectItem value="Neurológico">Neurológico</SelectItem>
                                <SelectItem value="Endoscópico">Endoscópico</SelectItem>
                                <SelectItem value="Funcional">Funcional</SelectItem>
                                <SelectItem value="Outros">Outros</SelectItem>
                              </SelectContent>
                            </Select>
                            {requestErrors.examCategory && (
                              <p className="text-xs text-red-500 mt-1">{requestErrors.examCategory}</p>
                            )}
                          </div>

                          {/* Nível de Urgência */}
                          <div>
                            <Label htmlFor="urgency">Urgência *</Label>
                            <Select 
                              value={requestFormData.urgency} 
                              onValueChange={(value) => updateRequestField('urgency', value)}
                            >
                              <SelectTrigger className={cn(requestErrors.urgency && "border-red-500")}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="urgent">Urgente</SelectItem>
                                <SelectItem value="very_urgent">Muito Urgente</SelectItem>
                              </SelectContent>
                            </Select>
                            {requestErrors.urgency && (
                              <p className="text-xs text-red-500 mt-1">{requestErrors.urgency}</p>
                            )}
                          </div>

                          {/* Data de Validade */}
                          <div>
                            <Label htmlFor="validityDate">Data de Validade</Label>
                            <Input
                              id="validityDate"
                              type="date"
                              value={requestFormData.validityDate}
                              onChange={(e) => updateRequestField('validityDate', e.target.value)}
                              min={format(new Date(), 'yyyy-MM-dd')}
                            />
                          </div>
                        </div>

                        {/* Indicação Clínica */}
                        <div>
                          <Label htmlFor="clinicalIndication">Indicação Clínica *</Label>
                          <Textarea
                            id="clinicalIndication"
                            value={requestFormData.clinicalIndication}
                            onChange={(e) => updateRequestField('clinicalIndication', e.target.value)}
                            placeholder="Descreva a indicação médica para este exame..."
                            rows={3}
                            className={cn(requestErrors.clinicalIndication && "border-red-500")}
                          />
                          {requestErrors.clinicalIndication && (
                            <p className="text-xs text-red-500 mt-1">{requestErrors.clinicalIndication}</p>
                          )}
                        </div>

                        {/* Instruções Especiais */}
                        <div>
                          <Label htmlFor="specialInstructions">Instruções Especiais</Label>
                          <Textarea
                            id="specialInstructions"
                            value={requestFormData.specialInstructions}
                            onChange={(e) => updateRequestField('specialInstructions', e.target.value)}
                            placeholder="Instruções especiais para preparo ou execução do exame..."
                            rows={2}
                          />
                        </div>

                        {/* Observações Médicas */}
                        <div>
                          <Label htmlFor="medicalNotes">Observações Médicas</Label>
                          <Textarea
                            id="medicalNotes"
                            value={requestFormData.medicalNotes}
                            onChange={(e) => updateRequestField('medicalNotes', e.target.value)}
                            placeholder="Observações adicionais do médico..."
                            rows={2}
                          />
                        </div>

                        {/* Botões de Ação */}
                        <div className="flex justify-end gap-3 pt-4 border-t">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={handleCancelRequestForm}
                          >
                            Cancelar
                          </Button>
                          <Button 
                            type="submit"
                            disabled={createRequestMutation.isPending || updateRequestMutation.isPending}
                          >
                            {createRequestMutation.isPending || updateRequestMutation.isPending ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Salvando...
                              </>
                            ) : (
                              <>
                                <Save className="h-4 w-4 mr-2" />
                                {editingRequestId ? 'Atualizar Requisição' : 'Criar Requisição'}
                              </>
                            )}
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                )}

                <div className={cn("h-full transition-opacity", showRequestForm && "opacity-50")}>
                  {examRequestsLoading ? (
                    <div className="space-y-4">
                      {/* Skeleton para cards de requisições */}
                      {[...Array(3)].map((_, index) => (
                        <Card key={index} className="border border-gray-200">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <Skeleton className="h-10 w-10 rounded-lg" />
                                <div className="space-y-2">
                                  <Skeleton className="h-5 w-48" />
                                  <Skeleton className="h-4 w-32" />
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Skeleton className="h-6 w-20 rounded-full" />
                                <Skeleton className="h-8 w-24" />
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-2">
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-4 w-full" />
                            </div>
                            <div className="space-y-2">
                              <Skeleton className="h-4 w-28" />
                              <Skeleton className="h-4 w-full" />
                              <Skeleton className="h-4 w-3/4" />
                            </div>
                            <div className="space-y-2">
                              <Skeleton className="h-4 w-36" />
                              <Skeleton className="h-4 w-40" />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : examRequests.length === 0 && !showRequestForm ? (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Nenhuma requisição de exame
                      </h3>
                      <p className="text-gray-500 mb-6">
                        Quando um médico solicitar exames, eles aparecerão aqui para agendamento.
                      </p>
                    </div>
                  ) : !showRequestForm && (
                    <div className="grid gap-4">
                      {filteredExamRequests.length === 0 ? (
                        <div className="text-center py-12">
                          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">
                            {searchTerm ? 'Nenhuma requisição encontrada' : 'Nenhuma requisição disponível'}
                          </h3>
                          <p className="text-gray-500 mb-6">
                            {searchTerm 
                              ? 'Tente ajustar os filtros de pesquisa.'
                              : 'Quando um médico solicitar exames, eles aparecerão aqui para agendamento.'
                            }
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                        {paginatedExamRequests.map((request) => (
                        <Card 
                          key={request.id} 
                          className={cn(
                            "border border-gray-200 hover:shadow-md transition-shadow cursor-pointer",
                            request.status === 'scheduled' && "bg-blue-50/30 border-blue-300",
                            userProfileType === 'doctor' && "hover:border-blue-300"
                          )}
                          onClick={() => {
                            if (userProfileType === 'doctor') {
                              handleEditRequest(request);
                            }
                          }}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "p-2 rounded-lg",
                                  request.urgency === 'very_urgent' ? "bg-red-100 text-red-600" :
                                  request.urgency === 'urgent' ? "bg-orange-100 text-orange-600" :
                                  "bg-blue-100 text-blue-600"
                                )}>
                                  <FlaskConical className="h-4 w-4" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-gray-900">{request.examName}</h3>
                                  <p className="text-sm text-gray-600">{request.examCategory}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant={
                                    request.status === 'pending' ? 'secondary' :
                                    request.status === 'scheduled' ? 'default' :
                                    request.status === 'completed' ? 'secondary' :
                                    'destructive'
                                  }
                                  className={cn(
                                    request.status === 'pending' && "bg-yellow-100 text-yellow-800 border-yellow-200",
                                    request.status === 'scheduled' && "bg-blue-100 text-blue-800 border-blue-200",
                                    request.status === 'completed' && "bg-green-100 text-green-800 border-green-200"
                                  )}
                                >
                                  {request.status === 'pending' && 'Pendente'}
                                  {request.status === 'scheduled' && 'Agendado'}
                                  {request.status === 'completed' && 'Concluído'}
                                  {request.status === 'cancelled' && 'Cancelado'}
                                </Badge>
                                {request.urgency !== 'normal' && (
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                      request.urgency === 'very_urgent' ? "border-red-200 text-red-700" :
                                      "border-orange-200 text-orange-700"
                                    )}
                                  >
                                    {request.urgency === 'very_urgent' ? 'Muito Urgente' : 'Urgente'}
                                  </Badge>
                                )}
                                {/* Botão para ver agendamento se status for agendado */}
                                {request.status === 'scheduled' && request.scheduledTestId && (
                                  <Button 
                                    size="sm"
                                    variant="outline"
                                    className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                                    onClick={() => {
                                      // Ir para a aba de exames e buscar o exame específico
                                      setActiveTab('tests');
                                      const url = new URL(window.location.href);
                                      url.searchParams.set('tab', 'tests');
                                      window.history.pushState({}, '', url.toString());

                                      // Encontrar e editar o exame correspondente
                                      const scheduledTest = tests.find((test: any) => test.id === request.scheduledTestId);
                                      if (scheduledTest) {
                                        setTimeout(() => {
                                          handleEdit(scheduledTest);
                                        }, 100);
                                      }
                                    }}
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    Ver Agendamento
                                  </Button>
                                )}

                                {/* Botão para agendar exame se status for pendente */}
                                {request.status === 'pending' && (
                                  <Button 
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Selecionar a requisição e ir para agendamento
                                      setSelectedRequestId(request.id);

                                      // Preencher formulário com dados da requisição
                                      updateField('name', request.examName);
                                      updateField('type', request.examCategory);

                                      // Limpar outros campos
                                      updateField('testDate', '');
                                      updateField('testTime', '');
                                      updateField('location', '');

                                      setShowAddForm(true);
                                      setActiveTab('tests');

                                      // Atualizar URL
                                      const url = new URL(window.location.href);
                                      url.searchParams.set('tab', 'tests');
                                      window.history.pushState({}, '', url.toString());
                                    }}
                                  >
                                    <Calendar className="h-4 w-4 mr-2" />
                                    Agendar Exame
                                  </Button>
                                )}

                                {/* Botão para deletar (apenas para médicos) - Alinhado à direita */}
                                {userProfileType === 'doctor' && (
                                  <div className="ml-auto">
                                    <Button 
                                      size="sm"
                                      variant="outline"
                                      className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200 p-2"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteRequest(request);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardHeader>

                          <CardContent className="space-y-4">
                            <div>
                              <Label className="text-sm font-medium text-gray-600">Médico Responsável</Label>
                              <p className="text-sm font-medium text-gray-900">
                                {request.doctorGender === 'female' ? 'Dra.' : 'Dr.'} {request.doctorName}
                                {request.doctorCrm && (
                                  <span className="text-gray-500 ml-1">- CRM {request.doctorCrm}</span>
                                )}
                              </p>
                            </div>

                            <div>
                              <Label className="text-sm font-medium text-gray-600">Indicação Clínica</Label>
                              <p className="text-sm text-gray-900 mt-1">{request.clinicalIndication}</p>
                            </div>

                            {request.specialInstructions && (
                              <div>
                                <Label className="text-sm font-medium text-gray-600">Instruções Especiais</Label>
                                <p className="text-sm text-gray-900 mt-1">{request.specialInstructions}</p>
                              </div>
                            )}

                            <div>
                              <Label className="text-sm font-medium text-gray-600">Data da Requisição</Label>
                              <p className="text-sm text-gray-900 mt-1">
                                {format(new Date(request.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </p>
                            </div>

                            {/* Mostrar informações de agendamento se exame estiver agendado */}
                            {request.status === 'scheduled' && request.scheduledTestId && (() => {
                              const scheduledTest = tests.find((test: any) => test.id === request.scheduledTestId);
                              if (scheduledTest) {
                                return (
                                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <Label className="text-sm font-medium text-blue-800">Agendamento Realizado</Label>
                                    <p className="text-sm text-blue-700 mt-1">
                                      Data: {format(new Date(scheduledTest.testDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                    </p>
                                    {scheduledTest.location && (
                                      <p className="text-sm text-blue-600 mt-1">
                                        Local: {scheduledTest.location}
                                      </p>
                                    )}
                                  </div>
                                );
                              }
                              return null;
                            })()}

                            {request.validityDate && (
                              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-amber-600" />
                                  <Label className="text-sm font-medium text-amber-800">Validade da Requisição</Label>
                                </div>
                                <p className="text-sm text-amber-700 mt-1">
                                  Válida até {format(new Date(request.validityDate), "dd/MM/yyyy", { locale: ptBR })}
                                </p>
                              </div>
                            )}

                          </CardContent>
                        </Card>
                      ))}

                      {filteredExamRequests.length > 0 && (
                        <div className="mt-6 flex items-center justify-between bg-white p-4 border-t border-gray-200">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-700">Itens por página:</span>
                              <Select 
                                value={requestsItemsPerPage.toString()} 
                                onValueChange={handleRequestsItemsPerPageChange}
                              >
                                <SelectTrigger className="w-16 h-8">
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

                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRequestsPageChange(currentRequestsPage - 1)}
                              disabled={currentRequestsPage === 1}
                            >
                              <ChevronLeft className="h-4 w-4" />
                              Anterior
                            </Button>
                            <span className="text-sm text-gray-700">
                              {currentRequestsPage} de {requestsTotalPages}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRequestsPageChange(currentRequestsPage + 1)}
                              disabled={currentRequestsPage === requestsTotalPages}
                            >
                              Próxima
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="tests" className="mt-0 h-full overflow-y-auto scrollbar-hide">
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

                            if (startDate && newEndDate < startDate) {
                              return;
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
                  {renderTests()}
                </div>
              </div>
            </TabsContent>

          </div>
        </Tabs>
      </div>

      {/* Modal de seleção de requisição */}
      <Dialog open={showRequestSelectionModal} onOpenChange={setShowRequestSelectionModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Selecionar Requisição Médica
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Selecione uma requisição médica para agendar o exame:
            </p>

            <div className="max-h-96 overflow-y-auto space-y-3">
              {examRequests
                .filter((req: ExamRequest) => req.status === 'pending')
                .map((request: ExamRequest) => (
                  <div
                    key={request.id}
                    className={cn(
                      "p-4 border rounded-lg cursor-pointer transition-colors",
                      selectedRequestId === request.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                    onClick={() => setSelectedRequestId(request.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-lg",
                          request.urgency === 'very_urgent' ? "bg-red-100 text-red-600" :
                          request.urgency === 'urgent' ? "bg-orange-100 text-orange-600" :
                          "bg-blue-100 text-blue-600"
                        )}>
                          <FlaskConical className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{request.examName}</h4>
                          <p className="text-sm text-gray-600">{request.examCategory}</p>
                          <p className="text-xs text-gray-500">
                            {request.doctorGender === 'female' ? 'Dra.' : 'Dr.'} {request.doctorName} - {format(new Date(request.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {request.urgency !== 'normal' && (
                          <Badge 
                            variant="outline" 
                            className={cn(
                              request.urgency === 'very_urgent' ? "border-red-200 text-red-700" :
                              "border-orange-200 text-orange-700"
                            )}
                          >
                            {request.urgency === 'very_urgent' ? 'Muito Urgente' : 'Urgente'}
                          </Badge>
                        )}
                        {selectedRequestId === request.id && (
                          <CheckCircle className="h-5 w-5 text-blue-600" />
                        )}
                      </div>
                    </div>

                    <div className="mt-3 text-sm text-gray-700">
                      <strong>Indicação:</strong> {request.clinicalIndication}
                    </div>

                    {request.specialInstructions && (
                      <div className="mt-2 text-sm text-gray-600">
                        <strong>Instruções:</strong> {request.specialInstructions}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancelRequestSelection}>
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmRequestSelection}
              disabled={!selectedRequestId}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Agendar Exame
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmação de exclusão de exames */}
      <DeleteConfirmationModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirm={() => testToDelete && deleteTestMutation.mutate(testToDelete)}
        title="Excluir Exame"
        description={<>Tem certeza que deseja excluir o exame <strong>{testToDeleteName}</strong>?</>}
        loading={deleteTestMutation.isPending}
      />

      {/* Modal de confirmação de exclusão de requisições */}
      <DeleteConfirmationModal
        open={deleteRequestModalOpen}
        onOpenChange={(open) => {
          setDeleteRequestModalOpen(open);
          if (!open) {
            // Reset states when modal is closed
            setRequestToDelete(null);
            setRequestToDeleteName("");
            setRequestHasScheduledTest(false);
            setScheduledTestInfo(null);
          }
        }}
        onConfirm={() => requestToDelete && deleteRequestMutation.mutate(requestToDelete)}
        title="Excluir Requisição"
        description={
          requestHasScheduledTest ? (
            <>
              Tem certeza que deseja excluir a requisição <strong>{requestToDeleteName}</strong>?
              <br /><br />
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm">
                <strong className="text-red-800">⚠️ Atenção:</strong>
                <br />
                Esta requisição possui um exame já agendado que também será excluído:
                <br />
                <strong>Data:</strong> {scheduledTestInfo ? format(new Date(scheduledTestInfo.testDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'Data não encontrada'}
                {scheduledTestInfo?.location && (
                  <>
                    <br />
                    <strong>Local:</strong> {scheduledTestInfo.location}
                  </>
                )}
              </div>
            </>
          ) : (
            <>Tem certeza que deseja excluir a requisição <strong>{requestToDeleteName}</strong>?</>
          )
        }
        loading={deleteRequestMutation.isPending}
      />
    </div>
  );
}