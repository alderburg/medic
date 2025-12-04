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
import { Search, Plus, Save, X, Trash2, Heart, Thermometer, Scale, Droplets, Activity } from "lucide-react";
import DeleteConfirmationModal from "@/components/delete-confirmation-modal";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useFormValidation, ValidationRules } from "@/hooks/use-form-validation";
import { ValidatedInput, ValidatedSelect, ValidatedTextarea } from "@/components/ui/validated-input";

interface VitalSignsDesktopProps {
  type: 'glucose' | 'blood-pressure' | 'heart-rate' | 'temperature' | 'weight';
  title: string;
  icon: React.ComponentType<any>;
  apiEndpoint: string;
  formFields: any[];
  validationRules: ValidationRules;
  initialFormData: any;
  color: string;
}

export default function VitalSignsDesktop({ 
  type, 
  title, 
  icon: Icon, 
  apiEndpoint, 
  formFields, 
  validationRules,
  initialFormData,
  color
}: VitalSignsDesktopProps) {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const [itemToDeleteName, setItemToDeleteName] = useState<string>("");
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { formData, errors, updateField, resetForm, validateForm } = useFormValidation(
    initialFormData,
    validationRules
  );

  const { data: items = [], isLoading } = useQuery({
    queryKey: [apiEndpoint],
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  const addMutation = useMutation({
    mutationFn: (data: any) => apiRequest(apiEndpoint, "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [apiEndpoint] });
      resetForm();
      setShowAddForm(false);
      toast({
        title: "Sucesso",
        description: `${title} salvo com sucesso!`,
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || `Erro ao salvar ${title.toLowerCase()}`,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiRequest(`${apiEndpoint}/${id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [apiEndpoint] });
      resetForm();
      setEditingId(null);
      toast({
        title: "Sucesso",
        description: `${title} atualizado com sucesso!`,
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || `Erro ao atualizar ${title.toLowerCase()}`,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`${apiEndpoint}/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [apiEndpoint] });
      setDeleteModalOpen(false);
      setItemToDelete(null);
      setItemToDeleteName("");
      setTimeout(() => {
        setDeletingItemId(null);
      }, 1500);
      toast({
        title: "Sucesso",
        description: `${title} excluído com sucesso!`,
        variant: "default",
      });
    },
    onError: (error: any) => {
      setDeletingItemId(null);
      toast({
        title: "Erro",
        description: error.message || `Erro ao excluir ${title.toLowerCase()}`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const { isValid, errorCount } = validateForm();
    
    if (!isValid) {
      toast({
        title: "Erro de validação",
        description: `Por favor, corrija ${errorCount} campo${errorCount !== 1 ? 's' : ''} antes de continuar.`,
        variant: "destructive",
      });
      return;
    }

    const submitData = { ...formData };
    
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: submitData });
    } else {
      addMutation.mutate(submitData);
    }
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setShowAddForm(true);
    
    // Reset form with item data
    Object.keys(formData).forEach(key => {
      if (item[key] !== undefined) {
        updateField(key, item[key]);
      }
    });
  };

  const handleDelete = (item: any) => {
    setItemToDelete(item.id);
    setItemToDeleteName(getItemDisplayName(item));
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      setDeletingItemId(itemToDelete);
      deleteMutation.mutate(itemToDelete);
    }
  };

  const getItemDisplayName = (item: any) => {
    if (type === 'glucose') return `Glicose: ${item.value}mg/dL`;
    if (type === 'blood-pressure') return `Pressão: ${item.systolic}/${item.diastolic}`;
    if (type === 'heart-rate') return `Batimentos: ${item.value}bpm`;
    if (type === 'temperature') return `Temperatura: ${item.value}°C`;
    if (type === 'weight') return `Peso: ${item.value}kg`;
    return 'Item';
  };

  const getItemSubtitle = (item: any) => {
    return format(new Date(item.createdAt || item.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const filteredItems = Array.isArray(items) ? items.filter((item: any) => {
    const searchStr = searchTerm.toLowerCase();
    const itemName = getItemDisplayName(item).toLowerCase();
    return itemName.includes(searchStr);
  }) : [];

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingId(null);
    resetForm();
  };

  const isLoading_ = addMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-600">Gerencie seus sinais vitais</p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            onClick={() => setShowAddForm(true)}
            className={`${color} hover:${color.replace('bg-', 'bg-').replace('-500', '-600')}`}
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Registro
          </Button>
          <div className={`w-12 h-12 ${color.replace('bg-', 'bg-').replace('-500', '-100')} rounded-full flex items-center justify-center`}>
            <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-').replace('-500', '-600')}`} />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar registros..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Form */}
      {showAddForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              {editingId ? `Editar ${title}` : `Novo ${title}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {formFields.map((field) => (
                  <div key={field.name}>
                    <Label htmlFor={field.name}>
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </Label>
                    {field.type === 'select' ? (
                      <ValidatedSelect
                        id={field.name}
                        value={formData[field.name] || ''}
                        onValueChange={(value) => updateField(field.name, value)}
                        placeholder={field.placeholder}
                        error={errors[field.name]}
                      >
                        {field.options?.map((option: any) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </ValidatedSelect>
                    ) : field.type === 'textarea' ? (
                      <ValidatedTextarea
                        id={field.name}
                        value={formData[field.name] || ''}
                        onChange={(e) => updateField(field.name, e.target.value)}
                        placeholder={field.placeholder}
                        error={errors[field.name]}
                      />
                    ) : (
                      <ValidatedInput
                        id={field.name}
                        type={field.type}
                        value={formData[field.name] || ''}
                        onChange={(e) => updateField(field.name, e.target.value)}
                        placeholder={field.placeholder}
                        error={errors[field.name]}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isLoading_}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading_}
                  className={`${color} hover:${color.replace('bg-', 'bg-').replace('-500', '-600')}`}
                >
                  {isLoading_ ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Icon className={`w-16 h-16 ${color.replace('bg-', 'text-').replace('-500', '-300')} mx-auto mb-4`} />
            <p className="text-gray-500">Nenhum registro encontrado</p>
          </div>
        ) : (
          filteredItems.map((item: any) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 ${color.replace('bg-', 'bg-').replace('-500', '-100')} rounded-full flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${color.replace('bg-', 'text-').replace('-500', '-600')}`} />
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(item)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(item)}
                      className="h-8 w-8 p-0 hover:bg-red-100"
                      disabled={deletingItemId === item.id}
                    >
                      {deletingItemId === item.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                      ) : (
                        <Trash2 className="h-4 w-4 text-red-500" />
                      )}
                    </Button>
                  </div>
                </div>
                <div onClick={() => handleEdit(item)} className="cursor-pointer">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {getItemDisplayName(item)}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {getItemSubtitle(item)}
                  </p>
                  {item.notes && (
                    <p className="text-sm text-gray-500 truncate">
                      {item.notes}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        itemName={itemToDeleteName}
      />
    </div>
  );
}