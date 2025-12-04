import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, FileText, Calendar, User, Save, X, Trash2, ArrowLeft, Upload, Download, ChevronLeft, ChevronRight, ClipboardCheck } from "lucide-react";
import BottomNavigation from "@/components/bottom-navigation";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMedicalQueries } from "@/hooks/use-medical-queries";
import { usePatientRequired } from "@/hooks/use-patient-required";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useLocation } from "wouter";
import DeleteConfirmationModal from "@/components/delete-confirmation-modal";
import PrescriptionsDesktop from "@/components/prescriptions-desktop";

interface Prescription {
  id: number;
  title: string;
  doctorName: string;
  description: string;
  prescriptionDate: string;
  filePath?: string;
}

export default function Prescriptions() {
  const isMobile = useIsMobile();
  const { shouldShowPage, isRedirecting } = usePatientRequired();

  // Se está redirecionando ou não deve mostrar a página
  if (isRedirecting || !shouldShowPage) {
    return null;
  }

  // Return desktop version if not mobile
  if (!isMobile) {
    return <PrescriptionsDesktop />;
  }

  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [prescriptionToDelete, setPrescriptionToDelete] = useState<number | null>(null);
  const [prescriptionToDeleteName, setPrescriptionToDeleteName] = useState<string>("");
  const [deletingPrescriptionId, setDeletingPrescriptionId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [formData, setFormData] = useState({
    title: "",
    doctorName: "",
    description: "",
    prescriptionDate: (() => {
      const nowUTC = new Date();
      const nowBrasil = new Date(nowUTC.getTime() - (3 * 60 * 60 * 1000));
      return nowBrasil.toISOString().split('T')[0];
    })(),
    filePath: "",
  });

  // Estados para upload de arquivos
  const [filePreview, setFilePreview] = useState<{ name: string; type: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [saveProgress, setSaveProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { enableMedicalQueries } = useMedicalQueries();

  const { data: prescriptions = [], isLoading } = useQuery({
    queryKey: ["/api/prescriptions"],
    enabled: enableMedicalQueries,
  });

  // Detectar parâmetro action=new na URL para abrir automaticamente o formulário
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    
    if (action === 'new' && !showAddForm) {
      setShowAddForm(true);
      // Limpar o parâmetro da URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [showAddForm]);

  const addPrescriptionMutation = useMutation({
    mutationFn: async (prescriptionData: any) => {
      // Simular progresso baseado no tempo real se há arquivo
      if (prescriptionData.filePath) {
        setSaveProgress(5);
        const startTime = Date.now();
        progressIntervalRef.current = setInterval(() => {
          const elapsedTime = Date.now() - startTime;
          const estimatedDuration = 12000; // 12 segundos estimados
          const timeBasedProgress = Math.min((elapsedTime / estimatedDuration) * 85, 85);
          setSaveProgress(Math.max(5, timeBasedProgress));
        }, 150);
      }

      const response = await apiRequest("POST", "/api/prescriptions", prescriptionData);
      return response.json();
    },
    onSuccess: async () => {
      // Limpar intervalo de progresso
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setSaveProgress(100);

      // Aguardar a invalidação e refetch das queries
      await queryClient.invalidateQueries({ queryKey: ["/api/prescriptions"] });
      await queryClient.refetchQueries({ queryKey: ["/api/prescriptions"] });
      
      // Aguardar um delay para garantir que a lista foi atualizada
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Fechar formulário apenas após a lista ser atualizada
      setShowAddForm(false);
      resetForm();
      
      toast({
        title: "Receita adicionada",
        description: "A receita foi adicionada com sucesso.",
      });

      // Esconder progresso após delay
      setTimeout(() => {
        setSaveProgress(0);
      }, 1000);
    },
    onError: () => {
      // Limpar intervalo de progresso em caso de erro
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setSaveProgress(0);

      toast({
        title: "Erro",
        description: "Erro ao adicionar receita. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const updatePrescriptionMutation = useMutation({
    mutationFn: async ({ id, ...prescriptionData }: any) => {
      // Simular progresso baseado no tempo real se há arquivo novo
      const isNewUpload = 'filePath' in prescriptionData && prescriptionData.filePath;

      if (isNewUpload) {
        setSaveProgress(5);
        const startTime = Date.now();
        progressIntervalRef.current = setInterval(() => {
          const elapsedTime = Date.now() - startTime;
          const estimatedDuration = 12000; // 12 segundos estimados
          const timeBasedProgress = Math.min((elapsedTime / estimatedDuration) * 85, 85);
          setSaveProgress(Math.max(5, timeBasedProgress));
        }, 150);
      }

      const response = await apiRequest("PUT", `/api/prescriptions/${id}`, prescriptionData);
      return response.json();
    },
    onSuccess: async () => {
      // Limpar intervalo de progresso
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setSaveProgress(100);

      // Aguardar a invalidação e refetch das queries
      await queryClient.invalidateQueries({ queryKey: ["/api/prescriptions"] });
      await queryClient.refetchQueries({ queryKey: ["/api/prescriptions"] });
      
      // Aguardar um delay para garantir que a lista foi atualizada
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Fechar formulário apenas após a lista ser atualizada
      setShowAddForm(false);
      resetForm();
      
      toast({
        title: "Receita atualizada",
        description: "A receita foi atualizada com sucesso.",
      });

      // Esconder progresso após delay
      setTimeout(() => {
        setSaveProgress(0);
      }, 1000);
    },
    onError: () => {
      // Limpar intervalo de progresso em caso de erro
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setSaveProgress(0);

      toast({
        title: "Erro",
        description: "Erro ao atualizar receita. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deletePrescriptionMutation = useMutation({
    mutationFn: async (prescriptionId: number) => {
      setDeletingPrescriptionId(prescriptionId);
      const response = await apiRequest("DELETE", `/api/prescriptions/${prescriptionId}`);
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
        title: "Receita removida",
        description: "A receita foi removida com sucesso.",
      });
    },
    onError: () => {
      setDeletingPrescriptionId(null);
      setDeleteModalOpen(false);
      setPrescriptionToDelete(null);
      setPrescriptionToDeleteName("");
      toast({
        title: "Erro",
        description: "Erro ao remover receita. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      doctorName: "",
      description: "",
      prescriptionDate: (() => {
        const nowUTC = new Date();
        const nowBrasil = new Date(nowUTC.getTime() - (3 * 60 * 60 * 1000));
        return nowBrasil.toISOString().split('T')[0];
      })(),
      filePath: "",
    });
    setFilePreview(null);
    setEditingId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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
        description: "O arquivo deve ter no máximo 2MB.",
        variant: "destructive",
      });
      return;
    }

    // Validar tipos de arquivo
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Formato não suportado",
        description: "Apenas arquivos JPG, PNG, PDF, DOC e DOCX são aceitos.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Simular progresso de upload
      setUploadProgress(10);
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
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
      setFormData(prev => ({ ...prev, filePath: fileData }));
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
    setFormData(prev => ({ ...prev, filePath: "" }));
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Função para obter nome do arquivo
  const getFileNameFromPath = (filePath: string, prescriptionTitle: string) => {
    if (!filePath) return null;

    try {
      const fileData = JSON.parse(filePath);
      return fileData.originalName || `${prescriptionTitle}.pdf`;
    } catch (error) {
      return `${prescriptionTitle}.pdf`;
    }
  };

  // Função para editar receita
  const handleEditPrescription = (prescription: Prescription) => {
    setEditingId(prescription.id);
    setFormData({
      title: prescription.title,
      doctorName: prescription.doctorName,
      description: prescription.description || "",
      prescriptionDate: prescription.prescriptionDate.split('T')[0],
      filePath: prescription.filePath || "",
    });

    // Se tem arquivo, mostrar preview
    if (prescription.filePath) {
      try {
        const fileData = JSON.parse(prescription.filePath);
        setFilePreview({
          name: fileData.originalName || `${prescription.title}.pdf`,
          type: fileData.type || "application/pdf"
        });
      } catch (error) {
        setFilePreview({
          name: `${prescription.title}.pdf`,
          type: "application/pdf"
        });
      }
    }

    setShowAddForm(true);
  };

  // Função para visualizar documento
  const handleViewDocument = (prescriptionId: number, prescriptionTitle: string) => {
    setLocation(`/document-viewer/${prescriptionId}?type=prescription&title=${encodeURIComponent(prescriptionTitle)}`);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.doctorName) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    if (editingId) {
      await updatePrescriptionMutation.mutateAsync({ id: editingId, ...formData });
    } else {
      await addPrescriptionMutation.mutateAsync(formData);
    }
  };

  const handleDeletePrescriptionClick = (prescriptionId: number, prescriptionTitle: string) => {
    setPrescriptionToDelete(prescriptionId);
    setPrescriptionToDeleteName(prescriptionTitle);
    setDeleteModalOpen(true);
  };

  const handleConfirmDeletePrescription = () => {
    if (prescriptionToDelete) {
      deletePrescriptionMutation.mutate(prescriptionToDelete);
      // Não fechar o modal aqui - será fechado no onSuccess da mutation
    }
  };

  const filteredPrescriptions = Array.isArray(prescriptions) ? prescriptions.filter((prescription: Prescription) =>
    prescription.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prescription.doctorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prescription.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  // Lógica de paginação
  const totalItems = filteredPrescriptions.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredPrescriptions.slice(startIndex, endIndex);

  // Função para mudar página
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Função para mudar itens por página
  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1); // Reset para primeira página
  };

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
          <h1 className="text-2xl font-bold text-slate-800">Receitas</h1>
        </div>
      </header>

      <main className="pb-36 px-4 py-6">
        {/* Add Prescription Form */}
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
                Nova Receita
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitForm} className="space-y-4">
                <div>
                  <Label htmlFor="title">Título da Receita *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({...prev, title: e.target.value}))}
                    placeholder="Ex: Receita Cardiológica"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="doctorName">Nome do Médico *</Label>
                  <Input
                    id="doctorName"
                    value={formData.doctorName}
                    onChange={(e) => setFormData(prev => ({...prev, doctorName: e.target.value}))}
                    placeholder="Ex: Dr. João Silva"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Descrição dos Medicamentos</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
                    placeholder="Descreva os medicamentos, dosagens e instruções..."
                    rows={4}
                  />
                </div>

                <div>
                  <Label htmlFor="prescriptionDate">Data da Receita</Label>
                  <Input
                    id="prescriptionDate"
                    type="date"
                    value={formData.prescriptionDate}
                    onChange={(e) => setFormData(prev => ({...prev, prescriptionDate: e.target.value}))}
                  />
                </div>

                {/* Upload de Arquivo */}
                <div>
                  <Label htmlFor="file-upload">Arquivo da Receita</Label>
                  <input
                    ref={fileInputRef}
                    id="file-upload"
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  {/* Mostrar barra de progresso durante upload */}
                  {isUploading && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs text-green-700 mb-2">
                        <span className="font-medium">Carregando arquivo...</span>
                        <span className="font-semibold">{Math.round(uploadProgress)}%</span>
                      </div>
                      <div className="w-full bg-green-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {filePreview ? (
                    <div className="border border-slate-300 rounded-lg p-4 bg-slate-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-green-600" />
                          <span className="text-sm font-medium text-slate-700">
                            {filePreview.name}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={removeFile}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Barra de progresso no card do arquivo quando salvando */}
                      {((addPrescriptionMutation.isPending || updatePrescriptionMutation.isPending) && formData.filePath && saveProgress > 0) && (
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
                      <p className="text-sm text-slate-600 mb-2">
                        Clique para adicionar arquivo da receita
                      </p>
                      <p className="text-xs text-slate-500 mb-4">
                        PDF, DOC, DOCX, JPG, PNG (máx. 2MB)
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="text-green-600 border-green-600 hover:bg-green-50"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Selecionar Arquivo
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button type="submit" disabled={addPrescriptionMutation.isPending || updatePrescriptionMutation.isPending || isUploading} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
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
                        {editingId ? "Atualizar Receita" : "Salvar Receita"}
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
            {/* Statistics */}
            <div className="grid grid-cols-3 gap-4 mb-6">
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
            </div>

            {/* Search and Add Button */}
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
                onClick={() => setShowAddForm(true)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo
              </Button>
            </div>

            {/* Prescriptions List */}
            <div className="space-y-4">
            {totalItems === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ClipboardCheck className="w-8 h-8 text-green-600" />
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
                        onClick={() => setShowAddForm(true)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Receita
                      </Button>
                    )}
                </CardContent>
              </Card>
            ) : (
              currentItems.map((prescription: Prescription) => (
                <Card key={prescription.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-800 mb-1">{prescription.title}</h3>
                        <div className="flex items-center gap-2 mb-1">
                          <User className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-slate-600">{prescription.doctorName}</span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-slate-600">
                            {format(new Date(prescription.prescriptionDate), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePrescriptionClick(prescription.id, prescription.title)}
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
                      <div className="bg-slate-50 p-3 rounded-md">
                        <p className="text-sm text-slate-700">{prescription.description}</p>
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
        title="Excluir receita"
        description={`Tem certeza que deseja excluir a receita "${prescriptionToDeleteName}"? Esta ação não pode ser desfeita.`}
        onConfirm={handleConfirmDeletePrescription}
        loading={deletePrescriptionMutation.isPending}
      />
    </div>
  );
}