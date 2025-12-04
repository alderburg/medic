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
import { ValidatedInput, ValidatedTextarea } from "@/components/ui/validated-input";
import { Search, Plus, FileText, Calendar, User, Save, X, Trash2, Edit2, Filter, Upload, Download, File, ClipboardCheck, Eye, Activity, TrendingUp, MapPin, Clock, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useFormValidation } from "@/hooks/use-form-validation";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import DeleteConfirmationModal from "@/components/delete-confirmation-modal";


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

export default function PrescriptionsDesktop() {
  const [, navigate] = useLocation();

  // Ler parâmetro da URL na inicialização
  const getInitialTab = (): 'overview' | 'prescriptions' => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    return tabParam === 'prescriptions' ? 'prescriptions' : 'overview';
  };

  const [activeTab, setActiveTab] = useState<'overview' | 'prescriptions'>(getInitialTab());
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [prescriptionToDelete, setPrescriptionToDelete] = useState<number | null>(null);
  const [prescriptionToDeleteName, setPrescriptionToDeleteName] = useState<string>("");
  const [deletingPrescriptionId, setDeletingPrescriptionId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [filePreview, setFilePreview] = useState<{ name: string; type: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [saveProgress, setSaveProgress] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get user from useAuth
  const { user: currentUser } = useAuth();
  
  // Fix: Use the user from useAuth which has the correct profileType
  const userProfileType = currentUser?.profileType || 'patient';
  
  // Função para obter dados iniciais do formulário
  const getInitialFormData = () => {
    // Se o usuário é médico, preencher automaticamente o nome do médico
    const doctorName = userProfileType === 'doctor' && currentUser?.name ? currentUser.name : "";
    
    return {
      title: "",
      doctorName,
      description: "",
      prescriptionDate: "",
      filePath: "",
    };
  };

  const initialFormData = getInitialFormData();

  // Sistema de validação
  const validationRules = {
    title: {
      required: true,
      minLength: 2,
      message: "Título da receita é obrigatório (mínimo 2 caracteres)"
    },
    doctorName: {
      required: true,
      minLength: 2,
      message: "Nome do médico é obrigatório (mínimo 2 caracteres)"
    },
    description: {
      required: true,
      minLength: 2,
      message: "Descrição é obrigatória (mínimo 2 caracteres)"
    },
    prescriptionDate: {
      required: true,
      message: "Data da receita é obrigatória"
    }
  };

  const { formData, errors, updateField, validateForm, resetForm } = useFormValidation(
    initialFormData,
    validationRules
  );

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Escutar mudanças na URL para sincronizar a aba ativa
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      setActiveTab(tabParam === 'prescriptions' ? 'prescriptions' : 'overview');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Detectar parâmetro action=new na URL para abrir automaticamente o formulário
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    
    if (action === 'new' && !showAddForm) {
      setActiveTab('prescriptions');
      setShowAddForm(true);
      // Limpar o parâmetro da URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [showAddForm]);

  // Queries
  const { data: prescriptions = [], isLoading: prescriptionsLoading } = useQuery({
    queryKey: ["/api/prescriptions"],
  });

  // Garantir que prescriptions seja sempre um array antes de filtrar
  const prescriptionsArray = Array.isArray(prescriptions) ? prescriptions : [];

  // Log para debug



  // Filtrar receitas
  const filteredPrescriptions = prescriptionsArray.filter((prescription: Prescription) =>
    prescription.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prescription.doctorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prescription.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Mutations
  const addPrescriptionMutation = useMutation({
    mutationFn: async (prescriptionData: any) => {
      setIsSaving(true);
      // Simular progresso baseado no tempo real se há arquivo
      if (prescriptionData.filePath) {
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
          url: "/api/prescriptions",
          method: "POST",
          data: prescriptionData,
          on401: "throw"
        });

        if (prescriptionData.filePath) {
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
      await queryClient.invalidateQueries({ queryKey: ["/api/prescriptions"] });
      await queryClient.refetchQueries({ queryKey: ["/api/prescriptions"] });

      // Aguardar um delay para garantir que a lista foi atualizada
      await new Promise(resolve => setTimeout(resolve, 500));

      // Fechar formulário apenas após a lista ser atualizada
      setIsSaving(false);
      handleCancel();

      toast({
        title: "Sucesso",
        description: "Nova receita criada com sucesso.",
      });
    },
    onError: (error: any) => {
      setIsSaving(false);
      toast({
        title: "Erro",
        description: "Erro ao criar receita. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const updatePrescriptionMutation = useMutation({
    mutationFn: async ({ id, ...prescriptionData }: any) => {
      setIsSaving(true);

      // Detectar se é um novo arquivo ou arquivo existente
      const hasNewFile = prescriptionData.filePath && 
        typeof prescriptionData.filePath === 'string' && 
        prescriptionData.filePath.startsWith('{"data":"');

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
          url: `/api/prescriptions/${id}`,
          method: "PUT",
          data: prescriptionData,
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
      await queryClient.invalidateQueries({ queryKey: ["/api/prescriptions"] });
      await queryClient.refetchQueries({ queryKey: ["/api/prescriptions"] });

      // Aguardar um delay para garantir que a lista foi atualizada
      await new Promise(resolve => setTimeout(resolve, 500));

      // Fechar formulário apenas após a lista ser atualizada
      setIsSaving(false);
      handleCancel();

      toast({
        title: "Sucesso",
        description: "Receita atualizada com sucesso.",
      });
    },
    onError: (error: any) => {
      setIsSaving(false);
      toast({
        title: "Erro",
        description: "Erro ao atualizar receita. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deletePrescriptionMutation = useMutation({
    mutationFn: async (id: number) => {
      setDeletingPrescriptionId(id);
      const response = await apiRequest({
        url: `/api/prescriptions/${id}`,
        method: "DELETE",
        on401: "throw"
      });
      return response.json();
    },
    onSuccess: async () => {
      // Aguardar a invalidação e refetch das queries
      await queryClient.invalidateQueries({ queryKey: ["/api/prescriptions"] });
      await queryClient.refetchQueries({ queryKey: ["/api/prescriptions"] });

      // Aguardar um delay para garantir que a lista foi atualizada
      await new Promise(resolve => setTimeout(resolve, 500));

      // Fechar modal apenas após a lista ser atualizada
      setDeleteModalOpen(false);
      setPrescriptionToDelete(null);
      setPrescriptionToDeleteName("");

      setTimeout(() => {
        setDeletingPrescriptionId(null);
      }, 1000);

      toast({
        title: "Sucesso",
        description: "Receita excluída com sucesso.",
      });
    },
    onError: (error: any) => {
      setDeletingPrescriptionId(null);
      setDeleteModalOpen(false);
      setPrescriptionToDelete(null);
      setPrescriptionToDeleteName("");
      toast({
        title: "Erro",
        description: "Erro ao excluir receita. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { isValid, errors: validationErrors } = validateForm();

    if (!isValid) {
      // Identificar campos obrigatórios não preenchidos
      const missingFields = [];
      if (!formData.title.trim()) missingFields.push("Título da receita");
      if (!formData.doctorName.trim()) missingFields.push("Nome do médico");
      if (!formData.description.trim()) missingFields.push("Descrição");
      if (!formData.prescriptionDate.trim()) missingFields.push("Data da receita");

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

    try {
      const formDataToSubmit = {
        ...formData,
        prescriptionDate: formData.prescriptionDate + 'T12:00:00'
      };

      if (editingId) {
        await updatePrescriptionMutation.mutateAsync({ id: editingId, ...formDataToSubmit });
      } else {
        await addPrescriptionMutation.mutateAsync(formDataToSubmit);
      }
    } catch (error) {

    }
  };

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

  const handleEdit = (prescription: Prescription) => {
    setEditingId(prescription.id);
    updateField('title', prescription.title);
    updateField('doctorName', prescription.doctorName);
    updateField('description', prescription.description);
    updateField('prescriptionDate', prescription.prescriptionDate.split('T')[0]);

    if (prescription.hasFile && prescription.fileOriginalName) {
      setFilePreview({ 
        name: prescription.fileOriginalName, 
        type: prescription.fileType || 'application/pdf' 
      });
      updateField('filePath', 'existing_file');
    }

    setShowAddForm(true);
    setActiveTab('prescriptions');
  };

  const handleDelete = (id: number, title: string) => {
    setPrescriptionToDelete(id);
    setPrescriptionToDeleteName(title);
    setDeleteModalOpen(true);
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingId(null);
    resetForm(getInitialFormData());
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getStatistics = () => {
    const total = prescriptionsArray.length;
    const withFiles = prescriptionsArray.filter((p: Prescription) => p.hasFile).length;
    const withoutFiles = total - withFiles;

    return { total, withFiles, withoutFiles };
  };

  const stats = getStatistics();

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
  const paginatedPrescriptions = filteredPrescriptions.slice(startIndex, endIndex);

  const totalPages = Math.ceil(filteredPrescriptions.length / itemsPerPage);

  // Renderizar conteúdo da aba overview
  const renderOverviewContent = () => (
    <div className="space-y-6">
      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Receitas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total cadastradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Com Arquivos</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.withFiles}</div>
            <p className="text-xs text-muted-foreground">Receitas com arquivo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sem Arquivos</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.withoutFiles}</div>
            <p className="text-xs text-muted-foreground">Somente descrição</p>
          </CardContent>
        </Card>
      </div>

      {/* Receitas Recentes */}
      <Card>
        <CardHeader>
          <CardTitle>Receitas Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {prescriptionsArray.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ClipboardCheck className="w-8 h-8 text-cyan-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Nenhuma receita cadastrada</h3>
              <p className="text-gray-600 mb-4">Adicione sua primeira receita médica</p>
              <Button onClick={() => {
                setShowAddForm(true);
                setActiveTab('prescriptions');
              }} className="bg-cyan-600 hover:bg-cyan-700">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Receita
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {prescriptionsArray.slice(0, 5).map((prescription: Prescription) => (
                <div key={prescription.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                     onClick={() => handleEdit(prescription)}>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center">
                      <ClipboardCheck className="w-5 h-5 text-cyan-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{prescription.title}</p>
                        {prescription.hasFile && (
                          <Badge className="bg-green-100 text-green-800">
                            <File className="w-3 h-3 mr-1" />
                            Arquivo
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">Dr. {prescription.doctorName}</p>
                      <p className="text-xs text-gray-400">
                        {format(new Date(prescription.prescriptionDate), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {prescriptionsArray.length > 5 && (
                <div className="text-center pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setActiveTab('prescriptions')}
                    className="text-cyan-600 border-cyan-600 hover:bg-cyan-50"
                  >
                    Ver todas as receitas
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Renderizar skeleton para aba overview
  const renderOverviewSkeleton = () => (
    <div className="space-y-6">
      {/* Skeleton para estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div>
              <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded animate-pulse w-12 mb-1"></div>
              <div className="h-3 bg-gray-200 rounded animate-pulse w-16"></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Skeleton para seção de receitas recentes */}
      <Card>
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded animate-pulse w-40"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div>
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-24"></div>
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-20"></div>
                  </div>
                </div>
                <div className="h-6 bg-gray-200 rounded animate-pulse w-16"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Renderizar skeleton para aba receitas
  const renderPrescriptionsSkeleton = () => (
    <div className="space-y-6">
      {/* Lista de itens skeleton */}
      <div className="space-y-3 pb-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                {/* Ícone */}
                <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse flex-shrink-0"></div>

                {/* Conteúdo principal */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-5 bg-gray-200 rounded animate-pulse w-48"></div>
                    <div className="h-4 w-16 bg-gray-200 rounded-full animate-pulse"></div>
                  </div>

                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-28"></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
                    </div>
                    {/* Arquivo anexado ocasional */}
                    {i % 4 === 0 && (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Ações */}
              <div className="flex gap-2 flex-shrink-0">
                <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Mostrar skeleton durante carregamento inicial
  if (prescriptionsLoading) {
    return (
      <div className="h-full flex flex-col bg-gray-50">
        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={(value: any) => {
          setActiveTab(value);
          // Atualizar a URL sem recarregar a página
          const url = new URL(window.location.href);
          if (value === 'prescriptions') {
            url.searchParams.set('tab', 'prescriptions');
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
                  <TabsTrigger value="prescriptions" className="flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4" />
                    Receitas
                  </TabsTrigger>
                </TabsList>

                {activeTab === 'prescriptions' && (
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Pesquisar receitas..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-80"
                        disabled
                      />
                    </div>

                    <Button disabled className="bg-cyan-600 hover:bg-cyan-700">
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Receita
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 p-6 overflow-hidden">
              <TabsContent value="overview" className="mt-0 h-full overflow-y-auto scrollbar-hide">
                {renderOverviewSkeleton()}
              </TabsContent>

              <TabsContent value="prescriptions" className="mt-0 h-full overflow-y-auto scrollbar-hide">
                {renderPrescriptionsSkeleton()}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">


      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={(value: any) => {
          setActiveTab(value);
          // Atualizar a URL sem recarregar a página
          const url = new URL(window.location.href);
          if (value === 'prescriptions') {
            url.searchParams.set('tab', 'prescriptions');
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
                <TabsTrigger value="prescriptions" className="flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4" />
                  Receitas
                </TabsTrigger>
              </TabsList>

              {activeTab === 'prescriptions' && (
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Pesquisar receitas..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-80"
                    />
                  </div>

                  <Button onClick={() => {
                    resetForm(getInitialFormData());
                    setShowAddForm(true);
                  }} className="bg-cyan-600 hover:bg-cyan-700" disabled={showAddForm || editingId !== null}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Receita
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 p-6 overflow-hidden">
            <TabsContent value="overview" className="mt-0 h-full overflow-y-auto scrollbar-hide">
              {renderOverview()}
            </TabsContent>

            <TabsContent value="prescriptions" className="mt-0 h-full overflow-y-auto scrollbar-hide">
              {renderPrescriptionsContent()}
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Modal de confirmação de exclusão */}
      <DeleteConfirmationModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirm={() => prescriptionToDelete && deletePrescriptionMutation.mutate(prescriptionToDelete)}
        title="Excluir Receita"
        description={<>Tem certeza que deseja excluir a receita <strong>{prescriptionToDeleteName}</strong>?</>}
        loading={deletePrescriptionMutation.isPending}
      />
    </div>
  );

  function renderOverview() {
    return (
      <div className="space-y-6">
        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total de Receitas</p>
                  <p className="text-2xl font-bold text-cyan-600">{stats.total}</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-cyan-100 flex items-center justify-center">
                  <ClipboardCheck className="h-6 w-6 text-cyan-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Com Arquivo</p>
                  <p className="text-2xl font-bold text-green-600">{stats.withFiles}</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <File className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Sem Arquivo</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.withoutFiles}</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-orange-100 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Recentes</p>
                  <p className="text-2xl font-bold text-blue-600">{Math.min(stats.total, 5)}</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Receitas recentes */}
        <Card>
          <CardHeader>
            <CardTitle>Receitas Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {prescriptionsArray.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ClipboardCheck className="w-8 h-8 text-cyan-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Nenhuma receita cadastrada</h3>
                <p className="text-gray-600 mb-4">Adicione sua primeira receita médica</p>
                <Button onClick={() => {
                  resetForm(getInitialFormData());
                  setShowAddForm(true);
                  setActiveTab('prescriptions');
                }} className="bg-cyan-600 hover:bg-cyan-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Receita
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {prescriptionsArray
                  .slice(0, 5)
                  .map((prescription: Prescription) => (
                    <div key={prescription.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                         onClick={() => handleEdit(prescription)}>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center">
                          <ClipboardCheck className="w-5 h-5 text-cyan-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold">{prescription.title}</h4>
                          <p className="text-sm text-gray-600">Dr. {prescription.doctorName}</p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(prescription.prescriptionDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {prescription.hasFile && (
                          <Badge className="bg-green-100 text-green-800">
                            <File className="w-3 h-3 mr-1" />
                            Arquivo
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderPrescriptionsContent() {
    if (showAddForm) {
      return (
        <div className="h-full flex flex-col">
          <Card className="h-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cyan-100 rounded-lg">
                    <ClipboardCheck className="h-5 w-5 text-cyan-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {editingId ? 'Editar Receita' : 'Nova Receita'}
                    </h2>
                    <p className="text-sm text-gray-600">
                      Preencha as informações da receita médica
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
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-5">
                    <ValidatedInput
                      label="Título da Receita"
                      name="title"
                      placeholder="Ex: Receita para diabetes"
                      value={formData.title}
                      onChange={(e) => updateField('title', e.target.value)}
                      error={errors.title}
                      required
                    />
                  </div>
                  <div className="col-span-5">
                    <ValidatedInput
                      label="Nome do Médico"
                      name="doctorName"
                      placeholder="Ex: Dr. João Silva"
                      value={formData.doctorName}
                      onChange={(e) => updateField('doctorName', e.target.value)}
                      error={errors.doctorName}
                      required
                      readOnly={userProfileType === 'doctor'}
                      disabled={userProfileType === 'doctor'}
                    />
                    {userProfileType === 'doctor' && (
                      <p className="text-xs text-gray-500 mt-1">
                        Médico selecionado automaticamente com base na sua sessão
                      </p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <ValidatedInput
                      label="Data da Receita"
                      id="prescriptionDate"
                      type="date"
                      value={formData.prescriptionDate}
                      onChange={(e) => updateField('prescriptionDate', e.target.value)}
                      required
                      error={errors.prescriptionDate}
                    />
                  </div>
                </div>

                <ValidatedTextarea
                  label="Descrição"
                  name="description"
                  placeholder="Descreva a receita médica..."
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  error={errors.description}
                  required
                />

                {/* Campo de upload de arquivo */}
                <div className="space-y-2">
                  <Label>Anexar Arquivo (Receita Médica)</Label>
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
                            {editingId && (
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                if (editingId) {
                                  navigate(`/document-viewer/prescription/${editingId}?tab=prescriptions`);
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
                        {editingId ? 'Atualizar Receita' : 'Salvar Receita'}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <div className="space-y-3 pb-4">
            {prescriptionsLoading ? (
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
            ) : filteredPrescriptions.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardCheck className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">
                  {searchTerm ? 'Nenhuma receita encontrada' : 'Nenhuma receita cadastrada'}
                </p>
              </div>
            ) : (
              <>
                {paginatedPrescriptions.map((prescription: Prescription) => (
                  <Card 
                    key={prescription.id} 
                    className="hover:shadow-lg transition-all duration-200 cursor-pointer"
                    onClick={() => handleEdit(prescription)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-cyan-100 flex items-center justify-center">
                            <ClipboardCheck className="h-5 w-5 text-cyan-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-gray-900">{prescription.title}</h3>
                              {prescription.hasFile && (
                                <Badge className="bg-green-100 text-green-800">
                                  <File className="w-3 h-3 mr-1" />
                                  Arquivo
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">Dr. {prescription.doctorName}</p>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(prescription.id, prescription.title);
                          }}
                          disabled={deletingPrescriptionId === prescription.id}
                        >
                          {deletingPrescriptionId === prescription.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="h-4 w-4" />
                          <span>{format(new Date(prescription.prescriptionDate), "dd/MM/yyyy", { locale: ptBR })}</span>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded-md mb-3">{prescription.description}</p>

                      {prescription.hasFile && (
                        <div 
                          className="bg-blue-50 p-3 rounded-md border border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/document-viewer/prescription/${prescription.id}?tab=prescriptions`);
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-blue-600" />
                              <span className="text-sm font-medium text-blue-800">
                                {prescription.fileOriginalName || `${prescription.title}.pdf`}
                              </span>
                            </div>
                            <Download className="w-4 h-4 text-blue-600" />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {/* Paginação */}
                {filteredPrescriptions.length > 0 && (
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
    );
  }
}