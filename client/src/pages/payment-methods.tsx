
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Wallet, Banknote, Smartphone, Receipt, Save, X, Edit2, Trash2, Percent, DollarSign, Calendar, AlertCircle, CheckCircle, Settings, Activity, TrendingUp, BarChart3, PieChart } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useFormValidation, ValidationRules } from "@/hooks/use-form-validation";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import DeleteConfirmationModal from "@/components/delete-confirmation-modal";

interface InstallmentRate {
  installment: number;
  rate: number;
}

interface PaymentMethod {
  id: number;
  doctorId: number;
  name: string;
  paymentType: 'cash' | 'installment' | 'recurring' | 'prepaid' | 'postpaid';
  brand?: string;
  fixedFee: number;
  percentageFee: number;
  receivingDays: number;
  acceptsInstallment: boolean;
  maxInstallments?: number;
  installmentRates: InstallmentRate[];
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Função para formatar valor monetário brasileiro
const formatCurrency = (value: string) => {
  const numericValue = value.replace(/\D/g, '');
  if (!numericValue) return '';
  const number = parseInt(numericValue) / 100;
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

// Função para formatar porcentagem
const formatPercentage = (value: string) => {
  const numericValue = value.replace(/\D/g, '');
  if (!numericValue) return '';
  const number = parseInt(numericValue) / 100;
  return number.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const paymentTypeOptions = [
  { value: 'cash', label: 'À vista' },
  { value: 'installment', label: 'Parcelado' },
  { value: 'recurring', label: 'Recorrente' },
  { value: 'prepaid', label: 'Pré-pago' },
  { value: 'postpaid', label: 'Pós-pago' }
];

const brandOptions = [
  { value: 'visa', label: 'Visa' },
  { value: 'mastercard', label: 'MasterCard' },
  { value: 'elo', label: 'Elo' },
  { value: 'amex', label: 'American Express' },
  { value: 'hipercard', label: 'Hipercard' },
  { value: 'diners', label: 'Diners Club' },
  { value: 'discover', label: 'Discover' },
  { value: 'outros', label: 'Outros' }
];

export default function PaymentMethods() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') === 'payment-methods' ? 'payment-methods' : 'overview';
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<PaymentMethod | null>(null);
  const [deletePaymentMethod, setDeletePaymentMethod] = useState<PaymentMethod | null>(null);

  const initialFormData = {
    name: '',
    paymentType: '',
    brand: '',
    fixedFee: '',
    percentageFee: '',
    receivingDays: '0',
    acceptsInstallment: false,
    maxInstallments: '12',
    installmentRates: [] as InstallmentRate[],
    notes: '',
    isActive: true
  };

  // Validação do formulário
  const validationRules: ValidationRules = {
    name: { required: true, minLength: 2 },
    paymentType: { required: true },
    fixedFee: { min: 0 },
    percentageFee: { min: 0, max: 100 },
    receivingDays: { min: 0, max: 365 },
    maxInstallments: { min: 1, max: 24 }
  };

  const { formData, setFormData, errors, validateForm, clearAllErrors, updateField: updateFormField } = useFormValidation(initialFormData, validationRules);

  // Fetch payment methods
  const { data: paymentMethods = [], isLoading } = useQuery({
    queryKey: ['/api/payment-methods'],
    queryFn: async () => {
      const response = await apiRequest({
        method: 'GET',
        url: '/api/payment-methods'
      });
      return await response.json();
    }
  });

  // Filtrar formas de pagamento
  const filteredPaymentMethods = paymentMethods.filter((method: PaymentMethod) =>
    method.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (method.brand && method.brand.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest({
        method: 'POST',
        url: '/api/payment-methods',
        data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payment-methods'] });
      toast({
        title: "Forma de pagamento criada",
        description: "A forma de pagamento foi criada com sucesso."
      });
      handleCancelForm();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar forma de pagamento",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest({
        method: 'PUT',
        url: `/api/payment-methods/${editingPaymentMethod?.id}`,
        data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payment-methods'] });
      toast({
        title: "Forma de pagamento atualizada",
        description: "A forma de pagamento foi atualizada com sucesso."
      });
      handleCancelForm();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar forma de pagamento",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest({
        method: 'DELETE',
        url: `/api/payment-methods/${id}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payment-methods'] });
      toast({
        title: "Forma de pagamento excluída",
        description: "A forma de pagamento foi excluída com sucesso."
      });
      setDeletePaymentMethod(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir forma de pagamento",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    }
  });

  const updateField = (field: string, value: any) => {
    updateFormField(field, value);
  };

  const handleEdit = (paymentMethod: PaymentMethod) => {
    setEditingPaymentMethod(paymentMethod);
    const editData = {
      name: paymentMethod.name,
      paymentType: paymentMethod.paymentType,
      brand: paymentMethod.brand || '',
      fixedFee: paymentMethod.fixedFee.toFixed(2).replace('.', ','),
      percentageFee: paymentMethod.percentageFee.toFixed(2).replace('.', ','),
      receivingDays: paymentMethod.receivingDays.toString(),
      acceptsInstallment: paymentMethod.acceptsInstallment,
      maxInstallments: paymentMethod.maxInstallments?.toString() || '12',
      installmentRates: paymentMethod.installmentRates || [],
      notes: paymentMethod.notes || '',
      isActive: paymentMethod.isActive
    };
    setFormData(editData);
    setShowAddForm(true);
  };

  const handleCancelForm = () => {
    setShowAddForm(false);
    setEditingPaymentMethod(null);
    setFormData(initialFormData);
    clearAllErrors();
  };

  const addInstallmentRate = () => {
    const newInstallment = formData.installmentRates.length + 1;
    updateField('installmentRates', [...formData.installmentRates, { installment: newInstallment, rate: 0 }]);
  };

  const updateInstallmentRate = (index: number, field: 'installment' | 'rate', value: number) => {
    const newRates = formData.installmentRates.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    );
    updateField('installmentRates', newRates);
  };

  const removeInstallmentRate = (index: number) => {
    const newRates = formData.installmentRates.filter((_, i) => i !== index);
    updateField('installmentRates', newRates);
  };

  const handleSubmit = () => {
    const validationResult = validateForm();

    if (!validationResult.isValid) {
      toast({
        title: "Erro de validação",
        description: "Por favor, corrija os campos destacados.",
        variant: "destructive"
      });
      return;
    }

    const submitData = {
      name: formData.name,
      paymentType: formData.paymentType,
      brand: formData.brand || null,
      fixedFee: parseCurrency(formData.fixedFee),
      percentageFee: parseFloat(formData.percentageFee.replace(',', '.')) || 0,
      receivingDays: parseInt(formData.receivingDays),
      acceptsInstallment: formData.acceptsInstallment,
      maxInstallments: formData.acceptsInstallment ? parseInt(formData.maxInstallments) : null,
      installmentRates: formData.acceptsInstallment ? formData.installmentRates : [],
      notes: formData.notes || null,
      isActive: formData.isActive
    };

    if (editingPaymentMethod) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const getPaymentTypeLabel = (type: string) => {
    return paymentTypeOptions.find(option => option.value === type)?.label || type;
  };

  const getBrandLabel = (brand: string) => {
    return brandOptions.find(option => option.value === brand)?.label || brand;
  };

  // Estatísticas para a visão geral
  const stats = {
    total: paymentMethods.length,
    active: paymentMethods.filter((method: PaymentMethod) => method.isActive).length,
    withInstallments: paymentMethods.filter((method: PaymentMethod) => method.acceptsInstallment).length,
    avgFee: paymentMethods.length > 0 ? (paymentMethods.reduce((acc: number, method: PaymentMethod) => acc + method.percentageFee, 0) / paymentMethods.length).toFixed(2) : '0.00'
  };

  const paymentTypeStats = paymentMethods.reduce((acc: any, method: PaymentMethod) => {
    acc[method.paymentType] = (acc[method.paymentType] || 0) + 1;
    return acc;
  }, {});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (activeTab !== 'overview') {
      params.set('tab', activeTab);
    } else {
      params.delete('tab');
    }
    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.replaceState({}, '', newUrl);
  }, [activeTab]);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
      <div className="border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <TabsList className="h-12">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="payment-methods" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Formas de Pagamento
            </TabsTrigger>
          </TabsList>
          
          {activeTab === 'payment-methods' && !showAddForm && (
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar formas de pagamento..."
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
                Nova Forma de Pagamento
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
                      <p className="text-sm font-medium text-muted-foreground">Total</p>
                      <p className="text-2xl font-bold">{stats.total}</p>
                    </div>
                    <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Wallet className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Ativas</p>
                      <p className="text-2xl font-bold">{stats.active}</p>
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
                      <p className="text-sm font-medium text-muted-foreground">Com Parcelamento</p>
                      <p className="text-2xl font-bold">{stats.withInstallments}</p>
                    </div>
                    <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Receipt className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Taxa Média</p>
                      <p className="text-2xl font-bold">{stats.avgFee}%</p>
                    </div>
                    <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Percent className="h-6 w-6 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Gráfico de Distribuição por Tipo */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-blue-600" />
                    Distribuição por Tipo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(paymentTypeStats).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{getPaymentTypeLabel(type)}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${((count as number) / stats.total) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-muted-foreground w-8">{count as number}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Resumo das Formas de Pagamento Recentes */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-green-600" />
                    Formas de Pagamento Recentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {paymentMethods.length === 0 ? (
                    <div className="text-center py-8">
                      <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Nenhuma forma de pagamento cadastrada</h3>
                      <p className="text-muted-foreground mb-4">
                        Comece adicionando as formas de pagamento aceitas em sua clínica.
                      </p>
                      <Button onClick={() => setActiveTab("payment-methods")}>
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Forma de Pagamento
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {paymentMethods.slice(0, 5).map((method: PaymentMethod) => (
                        <div key={method.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                              <Wallet className="h-4 w-4" />
                            </div>
                            <div>
                              <h4 className="font-medium">{method.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {getPaymentTypeLabel(method.paymentType)}
                                {method.brand && ` - ${getBrandLabel(method.brand)}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={method.isActive ? "default" : "secondary"}>
                              {method.isActive ? "Ativo" : "Inativo"}
                            </Badge>
                            {method.acceptsInstallment && (
                              <Badge variant="outline">
                                Até {method.maxInstallments}x
                              </Badge>
                            )}
                            {method.percentageFee > 0 && (
                              <Badge variant="outline">
                                {method.percentageFee.toFixed(2)}%
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                      {paymentMethods.length > 5 && (
                        <div className="text-center pt-4">
                          <Button variant="outline" onClick={() => setActiveTab("payment-methods")}>
                            Ver todas as {paymentMethods.length} formas de pagamento
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Análise de Taxas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                  Análise de Taxas e Prazos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900">Taxas Fixas</h4>
                    {paymentMethods.filter((method: PaymentMethod) => method.fixedFee > 0).length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhuma taxa fixa configurada</p>
                    ) : (
                      paymentMethods
                        .filter((method: PaymentMethod) => method.fixedFee > 0)
                        .slice(0, 3)
                        .map((method: PaymentMethod) => (
                          <div key={method.id} className="flex justify-between items-center">
                            <span className="text-sm">{method.name}</span>
                            <span className="text-sm font-medium">R$ {method.fixedFee.toFixed(2)}</span>
                          </div>
                        ))
                    )}
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900">Taxas Percentuais</h4>
                    {paymentMethods.filter((method: PaymentMethod) => method.percentageFee > 0).length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhuma taxa percentual configurada</p>
                    ) : (
                      paymentMethods
                        .filter((method: PaymentMethod) => method.percentageFee > 0)
                        .slice(0, 3)
                        .map((method: PaymentMethod) => (
                          <div key={method.id} className="flex justify-between items-center">
                            <span className="text-sm">{method.name}</span>
                            <span className="text-sm font-medium">{method.percentageFee.toFixed(2)}%</span>
                          </div>
                        ))
                    )}
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900">Prazos de Recebimento</h4>
                    {paymentMethods.slice(0, 3).map((method: PaymentMethod) => (
                      <div key={method.id} className="flex justify-between items-center">
                        <span className="text-sm">{method.name}</span>
                        <span className="text-sm font-medium">
                          {method.receivingDays === 0 ? "Imediato" : `${method.receivingDays} dias`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payment-methods" className="mt-0 h-full overflow-y-auto scrollbar-hide space-y-6">
            {!showAddForm ? (
              <div className="space-y-4">

                <div className="grid gap-4">
                  {isLoading ? (
                    <Card>
                      <CardContent className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </CardContent>
                    </Card>
                  ) : filteredPaymentMethods.length === 0 ? (
                    <Card>
                      <CardContent className="text-center py-8">
                        <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">
                          {searchTerm ? "Nenhuma forma de pagamento encontrada" : "Nenhuma forma de pagamento cadastrada"}
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          {searchTerm 
                            ? "Tente ajustar os termos de busca." 
                            : "Adicione sua primeira forma de pagamento."
                          }
                        </p>
                        {!searchTerm && (
                          <Button onClick={() => setShowAddForm(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Adicionar Forma de Pagamento
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ) : (
                    filteredPaymentMethods.map((method: PaymentMethod) => (
                      <Card 
                        key={method.id} 
                        className="cursor-pointer hover:shadow-md transition-shadow" 
                        onClick={() => handleEdit(method)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                                <Wallet className="h-4 w-4" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900">{method.name}</h3>
                                <p className="text-sm text-gray-600">
                                  {getPaymentTypeLabel(method.paymentType)}
                                  {method.brand && ` - ${getBrandLabel(method.brand)}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant={method.isActive ? "secondary" : "outline"}
                                className={method.isActive ? "bg-green-100 text-green-800 border-green-200" : "bg-gray-100 text-gray-800 border-gray-200"}
                              >
                                {method.isActive ? "Ativo" : "Inativo"}
                              </Badge>
                              {method.acceptsInstallment && (
                                <Badge variant="outline" className="border-blue-200 text-blue-700">
                                  Até {method.maxInstallments}x
                                </Badge>
                              )}
                              <div className="ml-auto">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200 p-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeletePaymentMethod(method);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {method.fixedFee > 0 && (
                                <div>
                                  <span className="text-sm font-medium text-gray-600">Taxa Fixa</span>
                                  <p className="text-sm text-gray-900 mt-1">
                                    R$ {method.fixedFee.toFixed(2)}
                                  </p>
                                </div>
                              )}
                              {method.percentageFee > 0 && (
                                <div>
                                  <span className="text-sm font-medium text-gray-600">Taxa Percentual</span>
                                  <p className="text-sm text-gray-900 mt-1">
                                    {method.percentageFee.toFixed(2)}%
                                  </p>
                                </div>
                              )}
                              <div>
                                <span className="text-sm font-medium text-gray-600">Prazo de Recebimento</span>
                                <p className="text-sm text-gray-900 mt-1">
                                  {method.receivingDays === 0 ? "Imediato" : `${method.receivingDays} dias`}
                                </p>
                              </div>
                            </div>

                            {method.acceptsInstallment && method.installmentRates.length > 0 && (
                              <div>
                                <span className="text-sm font-medium text-gray-600">Juros por Parcela</span>
                                <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                                  {method.installmentRates.slice(0, 8).map((rate) => (
                                    <div key={rate.installment} className="text-xs bg-gray-50 p-2 rounded">
                                      {rate.installment}x: {rate.rate.toFixed(2)}%
                                    </div>
                                  ))}
                                  {method.installmentRates.length > 8 && (
                                    <div className="text-xs text-gray-500 p-2">
                                      +{method.installmentRates.length - 8} mais...
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            <div>
                              <span className="text-sm font-medium text-gray-600">Data de Cadastro</span>
                              <p className="text-sm text-gray-900 mt-1">
                                {format(new Date(method.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                          </div>

                          {method.notes && (
                            <div className="bg-slate-50 p-3 rounded-md border border-slate-200 mt-4">
                              <h4 className="font-medium text-slate-800 mb-2">Observações:</h4>
                              <p className="text-sm text-slate-700">{method.notes}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>
                      {editingPaymentMethod ? "Editar Forma de Pagamento" : "Nova Forma de Pagamento"}
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={handleCancelForm}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome da Forma de Pagamento *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => updateField('name', e.target.value)}
                        placeholder="Ex: Dinheiro, Cartão de Crédito, PIX..."
                        className={errors.name ? "border-red-500" : ""}
                      />
                      {errors.name && (
                        <p className="text-xs text-red-500">{errors.name}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="paymentType">Tipo de Pagamento *</Label>
                      <Select value={formData.paymentType} onValueChange={(value) => updateField('paymentType', value)}>
                        <SelectTrigger className={errors.paymentType ? "border-red-500" : ""}>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentTypeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.paymentType && (
                        <p className="text-xs text-red-500">{errors.paymentType}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="brand">Bandeira/Instituição</Label>
                      <Select value={formData.brand} onValueChange={(value) => updateField('brand', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione (opcional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {brandOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="receivingDays">Prazo de Recebimento (dias)</Label>
                      <Input
                        id="receivingDays"
                        type="number"
                        value={formData.receivingDays}
                        onChange={(e) => updateField('receivingDays', e.target.value)}
                        min="0"
                        max="365"
                        placeholder="0 para imediato"
                        className={errors.receivingDays ? "border-red-500" : ""}
                      />
                      {errors.receivingDays && (
                        <p className="text-xs text-red-500">{errors.receivingDays}</p>
                      )}
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Taxas Associadas</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="fixedFee">Taxa Fixa (R$)</Label>
                          <Input
                            id="fixedFee"
                            value={formData.fixedFee}
                            onChange={(e) => {
                              const formatted = formatCurrency(e.target.value);
                              updateField('fixedFee', formatted);
                            }}
                            placeholder="0,00"
                            className={errors.fixedFee ? "border-red-500" : ""}
                          />
                          {errors.fixedFee && (
                            <p className="text-xs text-red-500">{errors.fixedFee}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="percentageFee">Taxa Percentual (%)</Label>
                          <Input
                            id="percentageFee"
                            value={formData.percentageFee}
                            onChange={(e) => {
                              const formatted = formatPercentage(e.target.value);
                              updateField('percentageFee', formatted);
                            }}
                            placeholder="0,00"
                            className={errors.percentageFee ? "border-red-500" : ""}
                          />
                          {errors.percentageFee && (
                            <p className="text-xs text-red-500">{errors.percentageFee}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <Label htmlFor="acceptsInstallment">Aceita Parcelamento</Label>
                          <p className="text-sm text-muted-foreground">
                            Defina se esta forma de pagamento aceita parcelamento
                          </p>
                        </div>
                        <Switch
                          id="acceptsInstallment"
                          checked={formData.acceptsInstallment}
                          onCheckedChange={(checked) => updateField('acceptsInstallment', checked)}
                        />
                      </div>

                      {formData.acceptsInstallment && (
                        <div className="space-y-4 border rounded-lg p-4 bg-gray-50">
                          <div className="space-y-2">
                            <Label htmlFor="maxInstallments">Quantidade Máxima de Parcelas</Label>
                            <Input
                              id="maxInstallments"
                              type="number"
                              value={formData.maxInstallments}
                              onChange={(e) => updateField('maxInstallments', e.target.value)}
                              min="1"
                              max="24"
                              className={errors.maxInstallments ? "border-red-500" : ""}
                            />
                            {errors.maxInstallments && (
                              <p className="text-xs text-red-500">{errors.maxInstallments}</p>
                            )}
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label>Juros por Parcela</Label>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addInstallmentRate}
                                disabled={formData.installmentRates.length >= parseInt(formData.maxInstallments)}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Adicionar
                              </Button>
                            </div>
                            {formData.installmentRates.length > 0 && (
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {formData.installmentRates.map((rate, index) => (
                                  <div key={index} className="flex items-center gap-2 p-2 bg-white rounded border">
                                    <div className="flex-1">
                                      <Label className="text-xs">Parcela</Label>
                                      <Input
                                        type="number"
                                        value={rate.installment}
                                        onChange={(e) => updateInstallmentRate(index, 'installment', parseInt(e.target.value))}
                                        min="1"
                                        className="h-8"
                                      />
                                    </div>
                                    <div className="flex-1">
                                      <Label className="text-xs">Taxa (%)</Label>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        value={rate.rate}
                                        onChange={(e) => updateInstallmentRate(index, 'rate', parseFloat(e.target.value) || 0)}
                                        min="0"
                                        max="100"
                                        className="h-8"
                                      />
                                    </div>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                                      onClick={() => removeInstallmentRate(index)}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <Label htmlFor="isActive">Forma de Pagamento Ativa</Label>
                        <p className="text-sm text-muted-foreground">
                          Defina se esta forma de pagamento está ativa para uso
                        </p>
                      </div>
                      <Switch
                        id="isActive"
                        checked={formData.isActive}
                        onCheckedChange={(checked) => updateField('isActive', checked)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Observações</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => updateField('notes', e.target.value)}
                      placeholder="Observações gerais sobre esta forma de pagamento..."
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
                          {editingPaymentMethod ? 'Atualizar Forma de Pagamento' : 'Criar Forma de Pagamento'}
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </div>

        {deletePaymentMethod && (
          <DeleteConfirmationModal
            open={true}
            onOpenChange={(open) => !open && setDeletePaymentMethod(null)}
            onConfirm={() => deleteMutation.mutate(deletePaymentMethod.id)}
            title="Excluir Forma de Pagamento"
            description={`Tem certeza de que deseja excluir a forma de pagamento "${deletePaymentMethod.name}"? Esta ação não pode ser desfeita.`}
            loading={deleteMutation.isPending}
          />
        )}
      </Tabs>
  );
}
