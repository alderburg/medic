import { useState } from "react";
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Building2, Phone, Mail, Globe, MapPin, DollarSign, Save, X, Edit2, Trash2, Building, CreditCard, AlertCircle, CheckCircle, FileText, Calculator, Settings, Activity, TrendingUp, Users, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useFormValidation, ValidationRules } from "@/hooks/use-form-validation";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import DeleteConfirmationModal from "@/components/delete-confirmation-modal";

interface HealthInsurance {
  id: number;
  doctorId: number;
  name: string;
  registrationNumber?: string;
  contractNumber?: string;
  contactPhone?: string;
  contactEmail?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  consultationValue?: number;
  returnConsultationValue?: number;
  urgentConsultationValue?: number;
  homeVisitValue?: number;
  paymentTermDays: number;
  discountPercentage: number;
  isActive: boolean;
  acceptsNewPatients: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Função para formatar valor monetário brasileiro
const formatCurrency = (value: string) => {
  // Remove todos os caracteres não numéricos
  const numericValue = value.replace(/\D/g, '');

  if (!numericValue) return '';

  // Converte para número e divide por 100 para casas decimais
  const number = parseInt(numericValue) / 100;

  // Formata com máscara brasileira
  return number.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

// Função para converter string formatada para número
const parseCurrency = (value: string) => {
  if (!value) return 0;
  const numericValue = value.replace(/\./g, '').replace(',', '.');
  return parseFloat(numericValue) || 0;
};

// Função para formatar telefone brasileiro
const formatPhone = (value: string) => {
  const numbersOnly = value.replace(/\D/g, '');
  
  if (numbersOnly.length <= 2) {
    return `(${numbersOnly}`;
  } else if (numbersOnly.length <= 7) {
    return `(${numbersOnly.slice(0, 2)}) ${numbersOnly.slice(2)}`;
  } else if (numbersOnly.length <= 10) {
    return `(${numbersOnly.slice(0, 2)}) ${numbersOnly.slice(2, 6)}-${numbersOnly.slice(6)}`;
  } else {
    return `(${numbersOnly.slice(0, 2)}) ${numbersOnly.slice(2, 7)}-${numbersOnly.slice(7, 11)}`;
  }
};

// Função para formatar CEP brasileiro
const formatCEP = (value: string) => {
  const numbersOnly = value.replace(/\D/g, '');
  
  if (numbersOnly.length <= 5) {
    return numbersOnly;
  } else {
    return `${numbersOnly.slice(0, 5)}-${numbersOnly.slice(5, 8)}`;
  }
};

export default function HealthInsurances() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') === 'convenios' ? 'insurances' : 'overview';
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingInsurance, setEditingInsurance] = useState<HealthInsurance | null>(null);
  const [deleteInsurance, setDeleteInsurance] = useState<HealthInsurance | null>(null);

  // Validação do formulário
  const validationRules: ValidationRules = {
    name: { required: true, minLength: 2 },
    contactPhone: { pattern: /^\(\d{2}\)\s\d{4,5}-\d{4}$/ },
    contactEmail: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    website: { pattern: /^https?:\/\/.+/ },
    zipCode: { pattern: /^\d{5}-\d{3}$/ },
    consultationValue: { min: 0 },
    returnConsultationValue: { min: 0 },
    urgentConsultationValue: { min: 0 },
    homeVisitValue: { min: 0 },
    paymentTermDays: { min: 1, max: 365 },
    discountPercentage: { min: 0, max: 100 }
  };

  const { formData, errors, validateForm, updateField, resetForm } = useFormValidation({
    name: "",
    registrationNumber: "",
    contractNumber: "",
    contactPhone: "",
    contactEmail: "",
    website: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    consultationValue: "",
    returnConsultationValue: "",
    urgentConsultationValue: "",
    homeVisitValue: "",
    paymentTermDays: "30",
    discountPercentage: "0",
    isActive: true,
    acceptsNewPatients: true,
    notes: ""
  }, validationRules);

  // Query para buscar convênios
  const { data: healthInsurances = [], isLoading } = useQuery<HealthInsurance[]>({
    queryKey: ["/api/health-insurances"],
    enabled: user?.profileType === 'doctor',
  });

  // Filtrar convênios por termo de busca
  const filteredInsurances = healthInsurances.filter((insurance: HealthInsurance) =>
    insurance.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    insurance.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    insurance.registrationNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Estatísticas para visão geral
  const activeInsurances = healthInsurances.filter((ins: HealthInsurance) => ins.isActive);
  const acceptingNewPatients = healthInsurances.filter((ins: HealthInsurance) => ins.acceptsNewPatients);
  const avgConsultationValue = (() => {
    const withValues = healthInsurances.filter((ins: HealthInsurance) => ins.consultationValue && ins.consultationValue > 0);
    return withValues.length > 0 
      ? withValues.reduce((sum: number, ins: HealthInsurance) => sum + (ins.consultationValue || 0), 0) / withValues.length
      : 0;
  })();

  // Mutation para criar convênio
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest({
        url: "/api/health-insurances",
        method: "POST",
        data,
        on401: "throw"
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/health-insurances"] });
      setShowAddForm(false);
      resetForm();
      toast({
        title: "Convênio adicionado",
        description: "O convênio foi adicionado com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao adicionar convênio. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Mutation para atualizar convênio
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const response = await apiRequest({
        url: `/api/health-insurances/${id}`,
        method: "PUT",
        data,
        on401: "throw"
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/health-insurances"] });
      setEditingInsurance(null);
      setShowAddForm(false);
      resetForm();
      toast({
        title: "Convênio atualizado",
        description: "O convênio foi atualizado com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar convênio. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Mutation para deletar convênio
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest({
        url: `/api/health-insurances/${id}`,
        method: "DELETE",
        on401: "throw"
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/health-insurances"] });
      setDeleteInsurance(null);
      toast({
        title: "Convênio removido",
        description: "O convênio foi removido com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao remover convênio. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (validateForm()) {
      const processedData = {
        ...formData,
        contactPhone: formData.contactPhone ? formData.contactPhone.replace(/\D/g, '') : '',
        zipCode: formData.zipCode ? formData.zipCode.replace(/\D/g, '') : '',
        consultationValue: formData.consultationValue ? parseCurrency(formData.consultationValue) : null,
        returnConsultationValue: formData.returnConsultationValue ? parseCurrency(formData.returnConsultationValue) : null,
        urgentConsultationValue: formData.urgentConsultationValue ? parseCurrency(formData.urgentConsultationValue) : null,
        homeVisitValue: formData.homeVisitValue ? parseCurrency(formData.homeVisitValue) : null,
        paymentTermDays: parseInt(formData.paymentTermDays),
        discountPercentage: parseFloat(formData.discountPercentage),
      };

      if (editingInsurance) {
        updateMutation.mutate({ id: editingInsurance.id, ...processedData });
      } else {
        createMutation.mutate(processedData);
      }
    }
  };

  const handleEdit = (insurance: HealthInsurance) => {
    setEditingInsurance(insurance);
    updateField('name', insurance.name);
    updateField('registrationNumber', insurance.registrationNumber || '');
    updateField('contractNumber', insurance.contractNumber || '');
    updateField('contactPhone', insurance.contactPhone ? formatPhone(insurance.contactPhone) : '');
    updateField('contactEmail', insurance.contactEmail || '');
    updateField('website', insurance.website || '');
    updateField('address', insurance.address || '');
    updateField('city', insurance.city || '');
    updateField('state', insurance.state || '');
    updateField('zipCode', insurance.zipCode ? formatCEP(insurance.zipCode) : '');
    updateField('consultationValue', insurance.consultationValue ? insurance.consultationValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');
    updateField('returnConsultationValue', insurance.returnConsultationValue ? insurance.returnConsultationValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');
    updateField('urgentConsultationValue', insurance.urgentConsultationValue ? insurance.urgentConsultationValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');
    updateField('homeVisitValue', insurance.homeVisitValue ? insurance.homeVisitValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');
    updateField('paymentTermDays', insurance.paymentTermDays.toString());
    updateField('discountPercentage', insurance.discountPercentage.toString());
    updateField('isActive', insurance.isActive);
    updateField('acceptsNewPatients', insurance.acceptsNewPatients);
    updateField('notes', insurance.notes || '');
    setShowAddForm(true);
  };

  const handleCancelForm = () => {
    setShowAddForm(false);
    setEditingInsurance(null);
    resetForm();
  };

  if (user?.profileType !== 'doctor') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Acesso Restrito</h3>
          <p className="text-muted-foreground">
            Esta funcionalidade está disponível apenas para médicos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
      <div className="border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <TabsList className="h-12">
            <TabsTrigger value="overview" className="flex items-center gap-2" onClick={() => {
              const url = new URL(window.location.href);
              url.searchParams.delete('tab');
              window.history.pushState({}, '', url.toString());
            }}>
              <Activity className="h-4 w-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="insurances" className="flex items-center gap-2" onClick={() => {
              const url = new URL(window.location.href);
              url.searchParams.set('tab', 'convenios');
              window.history.pushState({}, '', url.toString());
            }}>
              <CreditCard className="h-4 w-4" />
              Convênios
            </TabsTrigger>
          </TabsList>

          {activeTab === 'insurances' && !showAddForm && (
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Pesquisar convênios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>
              <Button 
                onClick={() => setShowAddForm(true)} 
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Convênio
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 p-6 overflow-hidden">
        <TabsContent value="overview" className="mt-0 h-full overflow-y-auto scrollbar-hide space-y-6">
          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total de Convênios</p>
                    <p className="text-2xl font-bold">{healthInsurances.length}</p>
                  </div>
                  <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <CreditCard className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Convênios Ativos</p>
                    <p className="text-2xl font-bold">{activeInsurances.length}</p>
                  </div>
                  <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Aceitam Novos Pacientes</p>
                    <p className="text-2xl font-bold">{acceptingNewPatients.length}</p>
                  </div>
                  <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Valor Médio Consulta</p>
                    <p className="text-2xl font-bold">
                      {avgConsultationValue > 0 
                        ? `R$ ${avgConsultationValue.toFixed(2)}`
                        : "N/A"
                      }
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Resumo dos Convênios
              </CardTitle>
            </CardHeader>
            <CardContent>
              {healthInsurances.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum convênio cadastrado</h3>
                  <p className="text-muted-foreground mb-4">
                    Comece adicionando seus convênios médicos para ter uma visão completa.
                  </p>
                  <Button onClick={() => setActiveTab("insurances")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Convênio
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {healthInsurances.slice(0, 5).map((insurance: HealthInsurance) => (
                    <div key={insurance.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <CreditCard className="h-8 w-8 text-blue-500" />
                        <div>
                          <h4 className="font-medium">{insurance.name}</h4>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>
                              {insurance.city && `${insurance.city} - `}
                              {insurance.state}
                            </p>
                            {(insurance.contactPhone || insurance.contactEmail) && (
                              <p>
                                {insurance.contactPhone && insurance.contactPhone}
                                {insurance.contactPhone && insurance.contactEmail && " • "}
                                {insurance.contactEmail && insurance.contactEmail}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={insurance.isActive ? "default" : "secondary"}>
                          {insurance.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                        {insurance.consultationValue && (
                          <Badge variant="outline">
                            R$ {insurance.consultationValue.toFixed(2)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  {healthInsurances.length > 5 && (
                    <div className="text-center pt-4">
                      <Button variant="outline" onClick={() => setActiveTab("insurances")}>
                        Ver todos os {healthInsurances.length} convênios
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insurances" className="mt-0 h-full overflow-y-auto scrollbar-hide space-y-6">
          {!showAddForm ? (
            <div className="grid gap-4">
                {isLoading ? (
                  <Card>
                    <CardContent className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </CardContent>
                  </Card>
                ) : filteredInsurances.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-8">
                      <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">
                        {searchTerm ? "Nenhum convênio encontrado" : "Nenhum convênio cadastrado"}
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        {searchTerm 
                          ? "Tente ajustar os termos de busca." 
                          : "Adicione seu primeiro convênio médico."
                        }
                      </p>
                      {!searchTerm && (
                        <Button onClick={() => setShowAddForm(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar Convênio
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  filteredInsurances.map((insurance: HealthInsurance) => (
                    <Card 
                      key={insurance.id} 
                      className="cursor-pointer hover:shadow-md transition-shadow" 
                      onClick={() => handleEdit(insurance)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                              <CreditCard className="h-4 w-4" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">{insurance.name}</h3>
                              {(insurance.registrationNumber || insurance.contractNumber) && (
                                <p className="text-sm text-gray-600">
                                  {insurance.registrationNumber && `Registro: ${insurance.registrationNumber}`}
                                  {insurance.registrationNumber && insurance.contractNumber && " • "}
                                  {insurance.contractNumber && `Contrato: ${insurance.contractNumber}`}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={insurance.isActive ? "secondary" : "outline"}
                              className={insurance.isActive ? "bg-green-100 text-green-800 border-green-200" : "bg-gray-100 text-gray-800 border-gray-200"}
                            >
                              {insurance.isActive ? "Ativo" : "Inativo"}
                            </Badge>
                            {insurance.acceptsNewPatients && (
                              <Badge variant="outline" className="border-blue-200 text-blue-700">
                                Aceita novos pacientes
                              </Badge>
                            )}
                            <div className="ml-auto">
                              <Button
                                variant="outline"
                                size="sm"
                                className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200 p-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteInsurance(insurance);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {(insurance.contactPhone || insurance.contactEmail) && (
                            <div>
                              <span className="text-sm font-medium text-gray-600">Contato</span>
                              <p className="text-sm text-gray-900 mt-1">
                                {insurance.contactPhone && insurance.contactPhone}
                                {insurance.contactPhone && insurance.contactEmail && " • "}
                                {insurance.contactEmail && insurance.contactEmail}
                              </p>
                            </div>
                          )}

                          {(insurance.consultationValue || insurance.returnConsultationValue || insurance.urgentConsultationValue || insurance.homeVisitValue) && (
                            <div>
                              <span className="text-sm font-medium text-gray-600">Valores de Consulta</span>
                              <p className="text-sm text-gray-900 mt-1">
                                {insurance.consultationValue && `Normal: R$ ${insurance.consultationValue.toFixed(2)}`}
                                {insurance.consultationValue && insurance.returnConsultationValue && " • "}
                                {insurance.returnConsultationValue && `Retorno: R$ ${insurance.returnConsultationValue.toFixed(2)}`}
                                {(insurance.consultationValue || insurance.returnConsultationValue) && insurance.urgentConsultationValue && " • "}
                                {insurance.urgentConsultationValue && `Urgente: R$ ${insurance.urgentConsultationValue.toFixed(2)}`}
                                {(insurance.consultationValue || insurance.returnConsultationValue || insurance.urgentConsultationValue) && insurance.homeVisitValue && " • "}
                                {insurance.homeVisitValue && `Visita Domiciliar: R$ ${insurance.homeVisitValue.toFixed(2)}`}
                              </p>
                            </div>
                          )}

                          {insurance.address && (
                            <div>
                              <span className="text-sm font-medium text-gray-600">Localização</span>
                              <p className="text-sm text-gray-900 mt-1">
                                {insurance.address}
                                {insurance.state && ` - ${insurance.state}`}
                                {insurance.zipCode && ` - CEP: ${insurance.zipCode}`}
                              </p>
                            </div>
                          )}

                          <div>
                            <span className="text-sm font-medium text-gray-600">Data de Cadastro</span>
                            <p className="text-sm text-gray-900 mt-1">
                              {format(new Date(insurance.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>

                        {insurance.notes && (
                          <div className="bg-slate-50 p-3 rounded-md border border-slate-200">
                            <h4 className="font-medium text-slate-800 mb-2">Observações:</h4>
                            <p className="text-sm text-slate-700">{insurance.notes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
            </div>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    {editingInsurance ? "Editar Convênio" : "Novo Convênio"}
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={handleCancelForm}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Convênio *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      className={errors.name ? "border-red-500" : ""}
                    />
                    {errors.name && (
                      <p className="text-xs text-red-500">{errors.name}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="registrationNumber">Número de Registro</Label>
                    <Input
                      id="registrationNumber"
                      value={formData.registrationNumber}
                      onChange={(e) => updateField('registrationNumber', e.target.value)}
                      className={errors.registrationNumber ? "border-red-500" : ""}
                    />
                    {errors.registrationNumber && (
                      <p className="text-xs text-red-500">{errors.registrationNumber}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contractNumber">Número do Contrato</Label>
                    <Input
                      id="contractNumber"
                      value={formData.contractNumber}
                      onChange={(e) => updateField('contractNumber', e.target.value)}
                      className={errors.contractNumber ? "border-red-500" : ""}
                    />
                    {errors.contractNumber && (
                      <p className="text-xs text-red-500">{errors.contractNumber}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactPhone">Telefone de Contato</Label>
                    <Input
                      id="contactPhone"
                      value={formData.contactPhone}
                      onChange={(e) => {
                        const formatted = formatPhone(e.target.value);
                        updateField('contactPhone', formatted);
                      }}
                      placeholder="(11) 99999-9999"
                      maxLength={15}
                      className={errors.contactPhone ? "border-red-500" : ""}
                    />
                    {errors.contactPhone && (
                      <p className="text-xs text-red-500">{errors.contactPhone}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactEmail">Email de Contato</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) => updateField('contactEmail', e.target.value)}
                      className={errors.contactEmail ? "border-red-500" : ""}
                    />
                    {errors.contactEmail && (
                      <p className="text-xs text-red-500">{errors.contactEmail}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={formData.website}
                      onChange={(e) => updateField('website', e.target.value)}
                      placeholder="https://www.exemplo.com"
                      className={errors.website ? "border-red-500" : ""}
                    />
                    {errors.website && (
                      <p className="text-xs text-red-500">{errors.website}</p>
                    )}
                  </div>
                </div>

                <div className="border-t pt-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Endereço</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="address">Endereço Completo</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => updateField('address', e.target.value)}
                        className={errors.address ? "border-red-500" : ""}
                      />
                      {errors.address && (
                        <p className="text-xs text-red-500">{errors.address}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">Cidade</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => updateField('city', e.target.value)}
                        className={errors.city ? "border-red-500" : ""}
                      />
                      {errors.city && (
                        <p className="text-xs text-red-500">{errors.city}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">Estado</Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => updateField('state', e.target.value)}
                        placeholder="SP"
                        className={errors.state ? "border-red-500" : ""}
                      />
                      {errors.state && (
                        <p className="text-xs text-red-500">{errors.state}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zipCode">CEP</Label>
                      <Input
                        id="zipCode"
                        value={formData.zipCode}
                        onChange={(e) => {
                          const formatted = formatCEP(e.target.value);
                          updateField('zipCode', formatted);
                        }}
                        placeholder="00000-000"
                        maxLength={9}
                        className={errors.zipCode ? "border-red-500" : ""}
                      />
                      {errors.zipCode && (
                        <p className="text-xs text-red-500">{errors.zipCode}</p>
                      )}
                    </div>
                  </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Valores Financeiros</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="consultationValue">Valor da Consulta (R$)</Label>
                      <Input
                        id="consultationValue"
                        value={formData.consultationValue}
                        onChange={(e) => {
                          const formatted = formatCurrency(e.target.value);
                          updateField('consultationValue', formatted);
                        }}
                        placeholder="0,00"
                        className={errors.consultationValue ? "border-red-500" : ""}
                      />
                      {errors.consultationValue && (
                        <p className="text-xs text-red-500">{errors.consultationValue}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="returnConsultationValue">Valor Consulta de Retorno (R$)</Label>
                      <Input
                        id="returnConsultationValue"
                        value={formData.returnConsultationValue}
                        onChange={(e) => {
                          const formatted = formatCurrency(e.target.value);
                          updateField('returnConsultationValue', formatted);
                        }}
                        placeholder="0,00"
                        className={errors.returnConsultationValue ? "border-red-500" : ""}
                      />
                      {errors.returnConsultationValue && (
                        <p className="text-xs text-red-500">{errors.returnConsultationValue}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="urgentConsultationValue">Valor Consulta Urgente (R$)</Label>
                      <Input
                        id="urgentConsultationValue"
                        value={formData.urgentConsultationValue}
                        onChange={(e) => {
                          const formatted = formatCurrency(e.target.value);
                          updateField('urgentConsultationValue', formatted);
                        }}
                        placeholder="0,00"
                        className={errors.urgentConsultationValue ? "border-red-500" : ""}
                      />
                      {errors.urgentConsultationValue && (
                        <p className="text-xs text-red-500">{errors.urgentConsultationValue}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="homeVisitValue">Valor Visita Domiciliar (R$)</Label>
                      <Input
                        id="homeVisitValue"
                        value={formData.homeVisitValue}
                        onChange={(e) => {
                          const formatted = formatCurrency(e.target.value);
                          updateField('homeVisitValue', formatted);
                        }}
                        placeholder="0,00"
                        className={errors.homeVisitValue ? "border-red-500" : ""}
                      />
                      {errors.homeVisitValue && (
                        <p className="text-xs text-red-500">{errors.homeVisitValue}</p>
                      )}
                    </div>
                  </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Configurações</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="paymentTermDays">Prazo de Pagamento (dias)</Label>
                      <Input
                        id="paymentTermDays"
                        type="number"
                        value={formData.paymentTermDays}
                        onChange={(e) => updateField('paymentTermDays', e.target.value)}
                        min="1"
                        max="365"
                        className={errors.paymentTermDays ? "border-red-500" : ""}
                      />
                      {errors.paymentTermDays && (
                        <p className="text-xs text-red-500">{errors.paymentTermDays}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="discountPercentage">Desconto (%)</Label>
                      <Input
                        id="discountPercentage"
                        type="number"
                        value={formData.discountPercentage}
                        onChange={(e) => updateField('discountPercentage', e.target.value)}
                        step="0.01"
                        min="0"
                        max="100"
                        className={errors.discountPercentage ? "border-red-500" : ""}
                      />
                      {errors.discountPercentage && (
                        <p className="text-xs text-red-500">{errors.discountPercentage}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label htmlFor="isActive">Convênio Ativo</Label>
                      <p className="text-sm text-muted-foreground">
                        Defina se este convênio está ativo para uso
                      </p>
                    </div>
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => updateField('isActive', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label htmlFor="acceptsNewPatients">Aceita Novos Pacientes</Label>
                      <p className="text-sm text-muted-foreground">
                        Defina se este convênio aceita novos pacientes
                      </p>
                    </div>
                    <Switch
                      id="acceptsNewPatients"
                      checked={formData.acceptsNewPatients}
                      onCheckedChange={(checked) => updateField('acceptsNewPatients', checked)}
                    />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => updateField('notes', e.target.value)}
                    placeholder="Observações gerais sobre o convênio..."
                    rows={3}
                    className={errors.notes ? "border-red-500" : ""}
                  />
                  {errors.notes && (
                    <p className="text-xs text-red-500">{errors.notes}</p>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleCancelForm}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleSubmit}
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {createMutation.isPending || updateMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {editingInsurance ? 'Atualizar Convênio' : 'Criar Convênio'}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </div>

      {deleteInsurance && (
        <DeleteConfirmationModal
          open={true}
          onOpenChange={(open) => !open && setDeleteInsurance(null)}
          onConfirm={() => deleteMutation.mutate(deleteInsurance.id)}
          title="Excluir Convênio"
          description={`Tem certeza de que deseja excluir o convênio "${deleteInsurance.name}"? Esta ação não pode ser desfeita.`}
          loading={deleteMutation.isPending}
        />
      )}
    </Tabs>
  );
}