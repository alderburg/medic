import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, FileText, Calendar, MapPin, Save, X, Trash2, ArrowLeft, FlaskConical, Upload, Download, File, Filter, AlertCircle, CheckCircle, XCircle, Timer, ChevronLeft, ChevronRight } from "lucide-react";
import BottomNavigation from "@/components/bottom-navigation";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import DocumentViewer from "@/components/document-viewer";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import DeleteConfirmationModal from "@/components/delete-confirmation-modal";
import { ValidatedInput, ValidatedSelect, ValidatedTextarea } from "@/components/ui/validated-input";
import { useFormValidation } from "@/hooks/use-form-validation";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMedicalQueries } from "@/hooks/use-medical-queries";
import { usePatientRequired } from "@/hooks/use-patient-required";
import TestsDesktop from "@/components/tests-desktop";
import { DatePicker } from "@/components/ui/date-picker";

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
}

export default function Tests() {
  const isMobile = useIsMobile();
  const { shouldShowPage, isRedirecting } = usePatientRequired();

  // Se está redirecionando ou não deve mostrar a página
  if (isRedirecting || !shouldShowPage) {
    return null;
  }

  // Return desktop version if not mobile
  if (!isMobile) {
    return <TestsDesktop />;
  }
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'completed' | 'cancelled' | 'missed'>('all');
  const [dateFilter, setDateFilter] = useState<'today' | '7d' | '30d' | '90d' | 'custom'>('30d');
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showAddTestForm, setShowAddTestForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [testToDelete, setTestToDelete] = useState<number | null>(null);
  const [testToDeleteName, setTestToDeleteName] = useState<string>("");
  const [deletingTestId, setDeletingTestId] = useState<number | null>(null);
  const [confirmingTestId, setConfirmingTestId] = useState<number | null>(null);
  const [confirmingAction, setConfirmingAction] = useState<'completed' | 'cancelled' | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [testFormData, setTestFormData] = useState({
    name: "",
    type: "",
    testDate: "",
    testTime: "",
    location: "",
    filePath: "",
  });

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

  const { formData, updateField, errors, validateForm, resetForm } = useFormValidation(testFormData, validationRules);

  const [filePreview, setFilePreview] = useState<{ name: string; type: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [saveProgress, setSaveProgress] = useState(0);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { enableMedicalQueries } = useMedicalQueries();

  const { data: tests = [], isLoading: testsLoading } = useQuery({
    queryKey: ["/api/tests"],
    enabled: enableMedicalQueries,
  });

  const addTestMutation = useMutation({
    mutationFn: async (testData: any) => {
      // Simular progresso baseado no tempo real se há arquivo
      if (testData.filePath) {
        setSaveProgress(5);
        const startTime = Date.now();
        progressIntervalRef.current = setInterval(() => {
          const elapsedTime = Date.now() - startTime;
          // Estimar progresso baseado no tempo (máx 85% durante requisição)
          // Assume que arquivo grande leva ~10-15 segundos
          const estimatedDuration = 12000; // 12 segundos estimados
          const timeBasedProgress = Math.min((elapsedTime / estimatedDuration) * 85, 85);
          setSaveProgress(Math.max(5, timeBasedProgress));
        }, 150); // Atualiza a cada 150ms para suavidade
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
    onSuccess: async () => {
      // Aguardar a invalidação e refetch das queries
      await queryClient.invalidateQueries({ queryKey: ["/api/tests"] });
      await queryClient.refetchQueries({ queryKey: ["/api/tests"] });
      
      // Aguardar um delay para garantir que a lista foi atualizada
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Fechar formulário apenas após a lista ser atualizada
      setShowAddTestForm(false);
      resetTestForm();
      
      toast({
        title: "Exame agendado",
        description: "O exame foi agendado com sucesso.",
      });
    },
    onError: () => {
      setSaveProgress(0);
      toast({
        title: "Erro",
        description: "Erro ao agendar exame. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const updateTestMutation = useMutation({
    mutationFn: async ({ id, ...testData }: any) => {
      
      
      

      // Verificar se a data do exame está sendo alterada
      const isDateChanged = 'testDate' in testData && testData.testDate;
      
      if (isDateChanged) {
        // Buscar exame original para verificar status atual
        const originalTest = tests.find((t: Test) => t.id === id);
        
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

      // Se há filePath, é um novo upload
      const isNewUpload = 'filePath' in testData && testData.filePath;

      // Simular progresso baseado no tempo real se há arquivo novo
      if (isNewUpload) {
        setSaveProgress(5);
        const startTime = Date.now();
        progressIntervalRef.current = setInterval(() => {
          const elapsedTime = Date.now() - startTime;
          // Estimar progresso baseado no tempo (máx 85% durante requisição)
          // Assume que arquivo grande leva ~10-15 segundos
          const estimatedDuration = 12000; // 12 segundos estimados
          const timeBasedProgress = Math.min((elapsedTime / estimatedDuration) * 85, 85);
          setSaveProgress(Math.max(5, timeBasedProgress));
        }, 150); // Atualiza a cada 150ms para suavidade
      }

      try {
        const response = await apiRequest({
          url: `/api/tests/${id}`,
          method: "PUT",
          data: testData,
          on401: "throw"
        });

        if (isNewUpload) {
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
      setShowAddTestForm(false);
      resetTestForm();
      
      toast({
        title: "Exame atualizado",
        description: "O exame foi atualizado com sucesso.",
      });
    },
    onError: () => {
      setSaveProgress(0);
      toast({
        title: "Erro",
        description: "Erro ao atualizar exame. Tente novamente.",
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
        data: { 
          status,
          updatedAt: new Date().toISOString()
        },
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

  const deleteTestMutation = useMutation({
    mutationFn: async (testId: number) => {
      setDeletingTestId(testId);
      const response = await apiRequest({
        url: `/api/tests/${testId}`,
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
        title: "Exame removido",
        description: "O exame foi removido com sucesso.",
      });
    },
    onError: () => {
      setDeletingTestId(null);
      setDeleteModalOpen(false);
      setTestToDelete(null);
      setTestToDeleteName("");
      toast({
        title: "Erro",
        description: "Erro ao remover exame. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const resetTestForm = () => {
    const initialData = {
      name: "",
      type: "",
      testDate: "",
      location: "",
      filePath: "",
    };
    setTestFormData(initialData);
    resetForm(initialData);
    setFilePreview(null);
    setUploadProgress(0);
    setSaveProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setEditingId(null);
  };

  const getTestStatus = (test: Test) => {
    const testDate = new Date(test.testDate);
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



  const handleEditTest = (test: Test) => {
    const dateTime = new Date(test.testDate);
    const testDate = dateTime.toISOString().slice(0, 10);
    const testTime = dateTime.toISOString().slice(11, 16);

    const editData = {
      name: test.name,
      type: test.type || "",
      testDate: testDate,
      testTime: testTime,
      location: test.location || "",
      filePath: test.filePath || "",
    };
    setTestFormData(editData);
    resetForm(editData);

    // Se há um arquivo, definir o preview preservando o formato original
    if (test.filePath) {
      let fileName = "Arquivo anexado";
      let fileType = "application/octet-stream";

      try {
        // Tentar parse como JSON (novo formato)
        const fileData = JSON.parse(test.filePath);
        if (fileData.originalName) {
          fileName = fileData.originalName;
          fileType = fileData.type || fileType;
        }
      } catch (e) {
        // Se não for JSON, extrair nome usando a função existente
        fileName = getFileNameFromPath(test.filePath, test.name) || "Arquivo anexado";

        // Detectar tipo do arquivo baseado no data URL ou nome do arquivo
        if (test.filePath.startsWith('data:')) {
          const mimeMatch = test.filePath.match(/data:([^;]+);/);
          if (mimeMatch) {
            fileType = mimeMatch[1];
            // Se for PNG, garantir que o nome termine com .png
            if (fileType === 'image/png' && !fileName.toLowerCase().endsWith('.png')) {
              const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
              fileName = `${nameWithoutExt}.png`;
            }
          }
        } else if (test.filePath.includes('.')) {
          // Inferir tipo baseado na extensão do arquivo
          const extension = test.filePath.split('.').pop()?.toLowerCase();
          switch (extension) {
            case 'png':
              fileType = 'image/png';
              break;
            case 'jpg':
            case 'jpeg':
              fileType = 'image/jpeg';
              break;
            case 'gif':
              fileType = 'image/gif';
              break;
            case 'pdf':
              fileType = 'application/pdf';
              break;
            case 'doc':
            case 'docx':
              fileType = 'application/msword';
              break;
            default:
              fileType = 'application/octet-stream';
          }
        }
      }

      setFilePreview({
        name: fileName,
        type: fileType
      });
    } else {
      setFilePreview(null);
    }

    setEditingId(test.id);
    setShowAddTestForm(true);
  };

  // Função para converter arquivo para base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // Função para lidar com o upload de arquivo
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamanho do arquivo (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "O arquivo deve ter no máximo 2MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simular progresso de upload
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
        data: base64,
        originalName: file.name,
        type: file.type
      });
      updateField('filePath', fileData);
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
        title: "Erro",
        description: "Erro ao processar o arquivo. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Função para remover arquivo
  const removeFile = () => {
    updateField('filePath', "");
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDeleteTestClick = (testId: number, testName: string) => {
    setTestToDelete(testId);
    setTestToDeleteName(testName);
    setDeleteModalOpen(true);
  };

  const handleConfirmDeleteTest = () => {
    if (testToDelete) {
      deleteTestMutation.mutate(testToDelete);
      // Não fechar o modal aqui - será fechado no onSuccess da mutation
    }
  };

  const handleViewDocument = (testId: number, testName: string) => {
    navigate(`/document-viewer/test/${testId}`);
  };

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
          extension = 'png'; // Default para PNG para imagens
        } else if (mimeType.includes('word') || mimeType.includes('document')) {
          extension = 'doc';
        }

        // PRESERVAR nome original se disponível, senão usar nome do teste
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
          extension = 'png'; // Default para PNG para imagens
        } else if (mimeType.includes('pdf')) {
          extension = 'pdf';
        } else if (mimeType.includes('word') || mimeType.includes('document')) {
          extension = 'doc';
        } else {
          // Tentar extrair extensão do nome original se disponível
          extension = 'file';
        }

        // PRESERVAR nome original se disponível, senão usar nome do teste
        fileName = `${testName || 'documento'}.${extension}`;
      } else {
        // Se for um nome de arquivo normal, preservar o formato original
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

  const handleSubmitTestForm = async (e: React.FormEvent) => {
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
    const { testTime, ...dataToSend } = formData;
    const submitData = {
      ...dataToSend,
      testDate: formData.testDate + 'T' + formData.testTime + ':00',
    };

    // Se estamos editando, verificar se é um novo upload
    if (editingId) {
      const isNewUpload = submitData.filePath && (
        submitData.filePath.startsWith('{"data":"data:') || 
        (typeof submitData.filePath === 'string' && submitData.filePath.startsWith('data:') && !submitData.filePath.includes('png') && !submitData.filePath.includes('pdf') && !submitData.filePath.includes('jpg'))
      );

      
      
      

      // Se não é um novo upload, remover completamente o filePath dos dados
      if (!isNewUpload && submitData.filePath) {
        
        delete submitData.filePath;
      }

      await updateTestMutation.mutateAsync({ id: editingId, ...submitData });
    } else {
      await addTestMutation.mutateAsync(submitData);
    }
  };

  const getFilteredTests = () => {
    let filtered = Array.isArray(tests) ? tests.filter((test: Test) => {
      const matchesSearch = !searchTerm || 
        test.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        test.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        test.location?.toLowerCase().includes(searchTerm.toLowerCase());

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

    // Ordenação avançada com priorização
    return filtered.sort((a, b) => {
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
      const isOverdueB = statusA === 'overdue';

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

  // Lógica de paginação
  const totalItems = filteredTests.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredTests.slice(startIndex, endIndex);

  // Função para mudar página
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Função para mudar itens por página
  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1); // Reset para primeira página
  };

  // Função para calcular o status automático do exame


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

  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'sangue': 'Exame de Sangue',
      'urina': 'Exame de Urina',
      'imagem': 'Exame de Imagem',
      'cardiaco': 'Exame Cardíaco',
      'hormonal': 'Exame Hormonal',
      'outro': 'Outro'
    };
    return types[type] || type;
  };

  if (testsLoading) {
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
              <h1 className="text-2xl font-bold text-slate-800">Exames</h1>
              <p className="text-sm text-slate-500">Acompanhe seus exames médicos</p>
            </div>
          </div>
          <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
            <FlaskConical className="w-5 h-5 text-yellow-600" />
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-blue-600">
                {Array.isArray(tests) ? tests.filter((t: Test) => ['scheduled', 'today', 'overdue'].includes(getTestStatus(t))).length : 0}
              </div>
              <div className="text-xs text-slate-600">Agendados</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-green-600">
                {Array.isArray(tests) ? tests.filter((t: Test) => getTestStatus(t) === 'completed').length : 0}
              </div>
              <div className="text-xs text-slate-600">Realizados</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-red-600">
                {Array.isArray(tests) ? tests.filter((t: Test) => getTestStatus(t) === 'missed').length : 0}
              </div>
              <div className="text-xs text-slate-600">Perdidos</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-slate-800">
                {Array.isArray(tests) ? tests.length : 0}
              </div>
              <div className="text-xs text-slate-600">Total</div>
            </CardContent>
          </Card>
        </div>
      </header>
      <main className="pb-36 px-4 py-6">
        {/* Add Test Form */}
        {showAddTestForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => {
                    setShowAddTestForm(false);
                    resetTestForm();
                  }}
                  className="mr-3"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                {editingId ? 'Editar Exame' : 'Novo Exame'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitTestForm} className="space-y-4">
                <ValidatedInput
                  id="name"
                  label="Nome do Exame"
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="Ex: Hemograma Completo"
                  required
                  error={errors.name}
                />

                <ValidatedInput
                  id="type"
                  label="Tipo de Exame"
                  type="text"
                  value={formData.type}
                  onChange={(e) => updateField('type', e.target.value)}
                  placeholder="Digite o tipo do exame (ex: Exame de Sangue, Raio-X, etc)"
                  required
                  error={errors.type}
                />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Data do Exame *
                    </label>
                    <DatePicker
                      date={formData.testDate ? new Date(formData.testDate) : undefined}
                      onDateChange={(date) => {
                        updateField('testDate', date ? date.toISOString().split('T')[0] : '')
                      }}
                      placeholder="Selecione a data do exame"
                    />
                    {errors.testDate && (
                      <p className="text-sm text-red-600">{errors.testDate}</p>
                    )}
                  </div>
                  <ValidatedInput
                    id="testTime"
                    label="Horário do Exame"
                    type="time"
                    value={formData.testTime}
                    onChange={(e) => updateField('testTime', e.target.value)}
                    required
                    error={errors.testTime}
                  />
                </div>

                <ValidatedInput
                  id="location"
                  label="Local"
                  type="text"
                  value={formData.location}
                  onChange={(e) => updateField('location', e.target.value)}
                  placeholder="Ex: Laboratório Central"
                  error={errors.location}
                />

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
                                    handleViewDocument(editingId, formData.name || 'Documento');
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
                              onClick={removeFile}
                              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Barra de progresso no card do arquivo quando salvando */}
                        {((addTestMutation.isPending || updateTestMutation.isPending) && formData.filePath && saveProgress > 0) && (
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

                <div className="flex gap-3">
                  <Button type="submit" disabled={addTestMutation.isPending || updateTestMutation.isPending || isUploading} className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white">
                    {(addTestMutation.isPending || updateTestMutation.isPending) ? (
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
                        {editingId ? "Atualizar Exame" : "Agendar Exame"}
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddTestForm(false);
                      resetTestForm();
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
        {!showAddTestForm && (
          <>
            {/* Search and Add Button */}
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Buscar exames..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button 
                size="default" 
                onClick={() => setShowAddTestForm(true)}
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nova
              </Button>
            </div>

            {/* Filters */}
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                  <SelectTrigger className="w-full">
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
                  <SelectTrigger className="w-full">
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
              </div>

              {dateFilter === 'custom' && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border">
                  <div>
                    <Label htmlFor="start-date-mobile" className="text-sm font-medium text-slate-700">
                      Data Inicial
                    </Label>
                    <div className="relative mt-1">
                      <Input
                        id="start-date-mobile"
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                          const newStartDate = e.target.value;
                          setStartDate(newStartDate);
                          if (endDate && newStartDate > endDate) {
                            setEndDate("");
                          }
                        }}
                        max={endDate || undefined}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="end-date-mobile" className="text-sm font-medium text-slate-700">
                      Data Final
                    </Label>
                    <div className="relative mt-1">
                      <Input
                        id="end-date-mobile"
                        type="date"
                        value={endDate}
                        onChange={(e) => {
                          const newEndDate = e.target.value;
                          if (startDate && newEndDate < startDate) {
                            return;
                          }
                          setEndDate(newEndDate);
                        }}
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
            </div>

            {/* Tests List */}
            <div className="space-y-4">
            {totalItems === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FlaskConical className="w-8 h-8 text-yellow-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">
                    {searchTerm ? "Nenhum exame encontrado" : "Nenhum exame cadastrado"}
                  </h3>
                  <p className="text-slate-600 mb-4">
                    {searchTerm 
                      ? "Tente buscar com outros termos"
                      : "Adicione seu primeiro exame para acompanhar sua saúde"
                    }
                  </p>
                  {!searchTerm && (
                    <Button 
                        onClick={() => setShowAddTestForm(true)}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Exame
                      </Button>
                    )}
                </CardContent>
              </Card>
            ) : (
              currentItems.map((test: Test) => (
                <Card 
                  key={test.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow" 
                  onClick={() => handleEditTest(test)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-800">{test.name}</h3>
                          <Badge className={getStatusColor(test)}>
                            {getStatusLabel(test)}
                          </Badge>
                        </div>
                        {test.type && (
                          <p className="text-sm text-slate-600 mb-2">{getTypeLabel(test.type)}</p>
                        )}
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="w-4 h-4 text-yellow-600" />
                          <span className="text-sm text-slate-600">
                            {format(new Date(new Date(test.testDate).getTime() + (3 * 60 * 60 * 1000)), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        {test.location && (
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="w-4 h-4 text-yellow-600" />
                            <span className="text-sm text-slate-600">{test.location}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTestClick(test.id, test.name);
                          }}
                          disabled={deletingTestId === test.id}
                        >
                          {deletingTestId === test.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>

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

                    {test.filePath && (
                      <div 
                        className="bg-blue-50 p-3 rounded-md border border-blue-200 mb-3 cursor-pointer hover:bg-blue-100 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDocument(test.id, test.name);
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

                    {test.results && (
                      <div className="bg-green-50 p-3 rounded-md border border-green-200">
                        <h4 className="font-medium text-green-800 mb-1">Resultado:</h4>
                        <p className="text-sm text-green-700">{test.results}</p>
                      </div>
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
      </main>
      <BottomNavigation />
      <DeleteConfirmationModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Excluir exame"
        description={
          <>
            Tem certeza que deseja excluir o exame "<strong>{testToDeleteName}</strong>"? Esta ação não pode ser desfeita.
          </>
        }
        onConfirm={handleConfirmDeleteTest}
        loading={deleteTestMutation.isPending}
      />
    </div>
  );
}