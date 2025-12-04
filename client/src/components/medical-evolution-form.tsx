import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, X, FileText, Stethoscope, Activity, Pill, TestTube, AlertTriangle, User, Calendar, Plus, ExternalLink, Heart, Droplets, Thermometer, Weight, Trash2, MinusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { usePatient } from "@/contexts/patient-context";
import { useQueryClient } from "@tanstack/react-query"; // Import useQueryClient
import { api } from "@/lib/api";

interface VitalSign {
  id: string;
  type: 'pressure' | 'glucose' | 'heart-rate' | 'temperature' | 'weight';
  measuredAt: string;
  notes: string;
  // Campos específicos por tipo
  systolic?: string;
  diastolic?: string;
  heartRate?: string;
  glucoseLevel?: string;
  measurementType?: string;
  temperature?: string;
  method?: string;
  weight?: string;
}

interface Prescription {
  id: string;
  title: string;
  doctorName: string;
  date: string;
  description: string;
  createdAt: string;
}

interface ExamRequisition {
  id: string;
  examName: string;
  category: string;
  clinicalIndication: string;
  urgency: string;
  validityDate: string;
  specialInstructions: string;
  medicalObservations: string;
  createdAt: string;
}

interface MedicalEvolutionFormProps {
  evolution?: any;
  appointmentId?: number;
  onSave: (data: any) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  userProfileType: string;
  currentUser?: any;
}

export default function MedicalEvolutionForm({
  evolution,
  appointmentId,
  onSave,
  onCancel,
  isSubmitting = false,
  userProfileType,
  currentUser
}: MedicalEvolutionFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient(); // Initialize queryClient

  // Get user directly from useAuth to ensure we have the correct data
  const { user: authUser } = useAuth();
  const { selectedPatient } = usePatient();

  // Use authUser if currentUser is not available (fallback)
  const activeUser = currentUser || authUser;
  const activeUserProfileType = userProfileType || activeUser?.profileType || 'patient';

  // Determine the effective patient ID to use for saving related data
  const effectivePatientId = evolution?.patientId || selectedPatient?.id;

  const [formData, setFormData] = useState({
    patientId: effectivePatientId || 0,
    appointmentId: appointmentId || evolution?.appointmentId || null,
    chiefComplaint: evolution?.chiefComplaint || "",
    currentIllnessHistory: evolution?.currentIllnessHistory || "",
    physicalExam: evolution?.physicalExam || "",
    vitalSigns: evolution?.vitalSigns || "",
    diagnosticHypotheses: evolution?.diagnosticHypotheses || "",
    therapeuticPlan: evolution?.therapeuticPlan || "",
    prescribedMedications: evolution?.prescribedMedications || "",
    requestedExams: evolution?.requestedExams || "",
    generalRecommendations: evolution?.generalRecommendations || "",
    additionalObservations: evolution?.additionalObservations || "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [vitalSigns, setVitalSigns] = useState<VitalSign[]>([]);
  const [showVitalSignsForm, setShowVitalSignsForm] = useState(false);
  const [selectedVitalSignType, setSelectedVitalSignType] = useState<'pressure' | 'glucose' | 'heart-rate' | 'temperature' | 'weight' | null>(null);
  const [activeTriageTab, setActiveTriageTab] = useState<string>("geral");

  // Estados para prescrições
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [prescriptionForm, setPrescriptionForm] = useState({
    title: '',
    doctorName: activeUserProfileType === 'doctor' && activeUser
      ? `${activeUser.name}${activeUser.crm ? ` - CRM: ${activeUser.crm}` : ''}`
      : '',
    date: new Date().toISOString().split('T')[0],
    description: ''
  });

  // Estados para requisições de exames
  const [examRequisitions, setExamRequisitions] = useState<ExamRequisition[]>([]);
  const [examForm, setExamForm] = useState({
    examName: '',
    category: '',
    clinicalIndication: '',
    urgency: 'normal',
    validityDate: '',
    specialInstructions: '',
    medicalObservations: ''
  });

  // Estados para validação dos formulários
  const [prescriptionErrors, setPrescriptionErrors] = useState<Record<string, string>>({});
  const [isAddingPrescription, setIsAddingPrescription] = useState(false);
  const [examErrors, setExamErrors] = useState<Record<string, string>>({});
  const [isAddingExamRequisition, setIsAddingExamRequisition] = useState(false);

  // Estados para formulários de sinais vitais
  const [vitalSignForms, setVitalSignForms] = useState<Record<string, any>>({});
  const [savingVitalSigns, setSavingVitalSigns] = useState<Record<string, boolean>>({});

  // useEffect para carregar dados da evolução quando editar
  useEffect(() => {
    const loadEvolutionData = async () => {
      if (evolution?.id) {
        try {
          console.log('🔄 Carregando dados da evolução:', evolution.id);

          // Buscar dados completos da evolução com prescrições e requisições
          const response = await api.get(`/api/medical-evolutions/${evolution.id}`);

          const evolutionData = response.data;
          console.log('📊 Dados da evolução carregados:', evolutionData);

          // Carregar prescrições se existirem
          if (evolutionData.prescriptions && evolutionData.prescriptions.length > 0) {
            const mappedPrescriptions = evolutionData.prescriptions.map((p: any) => ({
              id: `db-${p.id}`,
              title: p.title,
              doctorName: p.doctorName,
              date: p.prescriptionDate ? new Date(p.prescriptionDate).toISOString().split('T')[0] : '',
              description: p.description,
              createdAt: p.createdAt
            }));
            setPrescriptions(mappedPrescriptions);
            console.log('💊 Prescrições carregadas:', mappedPrescriptions.length);
          }

          // Carregar requisições de exames se existirem
          if (evolutionData.examRequests && evolutionData.examRequests.length > 0) {
            const mappedExamRequests = evolutionData.examRequests.map((er: any) => ({
              id: `db-${er.id}`,
              examName: er.examName,
              category: er.category,
              clinicalIndication: er.clinicalIndication,
              urgency: er.urgency,
              validityDate: er.validityDate ? new Date(er.validityDate).toISOString().split('T')[0] : '',
              specialInstructions: er.specialInstructions,
              medicalObservations: er.medicalObservations,
              createdAt: er.createdAt
            }));
            setExamRequisitions(mappedExamRequests);
            console.log('🧪 Requisições de exame carregadas:', mappedExamRequests.length);
          }

          // Carregar sinais vitais se existirem
          if (evolutionData.vitalSigns) {
            const loadedVitalSigns: VitalSign[] = [];

            // Carregar pressão arterial
            if (evolutionData.vitalSigns.bloodPressure && Array.isArray(evolutionData.vitalSigns.bloodPressure)) {
              evolutionData.vitalSigns.bloodPressure.forEach((bp: any) => {
                loadedVitalSigns.push({
                  id: `db-pressure-${bp.id}`,
                  type: 'pressure',
                  measuredAt: new Date(bp.measuredAt).toISOString().slice(0, 16),
                  notes: bp.notes || '',
                  systolic: bp.systolic?.toString() || '',
                  diastolic: bp.diastolic?.toString() || '',
                  heartRate: bp.heartRate?.toString() || '',
                  glucoseLevel: '',
                  measurementType: '',
                  temperature: '',
                  method: '',
                  weight: ''
                });
              });
            }

            // Carregar glicemia
            if (evolutionData.vitalSigns.glucose && Array.isArray(evolutionData.vitalSigns.glucose)) {
              evolutionData.vitalSigns.glucose.forEach((glucose: any) => {
                loadedVitalSigns.push({
                  id: `db-glucose-${glucose.id}`,
                  type: 'glucose',
                  measuredAt: new Date(glucose.measuredAt).toISOString().slice(0, 16),
                  notes: glucose.notes || '',
                  systolic: '',
                  diastolic: '',
                  heartRate: '',
                  glucoseLevel: glucose.glucoseLevel?.toString() || '',
                  measurementType: glucose.measurementType || '',
                  temperature: '',
                  method: '',
                  weight: ''
                });
              });
            }

            // Carregar batimentos cardíacos
            if (evolutionData.vitalSigns.heartRate && Array.isArray(evolutionData.vitalSigns.heartRate)) {
              evolutionData.vitalSigns.heartRate.forEach((hr: any) => {
                loadedVitalSigns.push({
                  id: `db-heartrate-${hr.id}`,
                  type: 'heart-rate',
                  measuredAt: new Date(hr.measuredAt).toISOString().slice(0, 16),
                  notes: hr.notes || '',
                  systolic: '',
                  diastolic: '',
                  heartRate: hr.heartRate?.toString() || '',
                  glucoseLevel: '',
                  measurementType: hr.measurementType || '',
                  temperature: '',
                  method: '',
                  weight: ''
                });
              });
            }

            // Carregar temperatura
            if (evolutionData.vitalSigns.temperature && Array.isArray(evolutionData.vitalSigns.temperature)) {
              evolutionData.vitalSigns.temperature.forEach((temp: any) => {
                loadedVitalSigns.push({
                  id: `db-temperature-${temp.id}`,
                  type: 'temperature',
                  measuredAt: new Date(temp.measuredAt).toISOString().slice(0, 16),
                  notes: temp.notes || '',
                  systolic: '',
                  diastolic: '',
                  heartRate: '',
                  glucoseLevel: '',
                  measurementType: '',
                  temperature: temp.temperature?.toString() || '',
                  method: temp.measurementMethod || '',
                  weight: ''
                });
              });
            }

            // Carregar peso
            if (evolutionData.vitalSigns.weight && Array.isArray(evolutionData.vitalSigns.weight)) {
              evolutionData.vitalSigns.weight.forEach((weight: any) => {
                loadedVitalSigns.push({
                  id: `db-weight-${weight.id}`,
                  type: 'weight',
                  measuredAt: new Date(weight.measuredAt).toISOString().slice(0, 16),
                  notes: weight.notes || '',
                  systolic: '',
                  diastolic: '',
                  heartRate: '',
                  glucoseLevel: '',
                  measurementType: '',
                  temperature: '',
                  method: '',
                  weight: weight.weight?.toString() || ''
                });
              });
            }

            setVitalSigns(loadedVitalSigns);
            console.log('💗 Sinais vitais carregados:', loadedVitalSigns.length);
          }

        } catch (error) {
          console.error('❌ Erro ao carregar dados da evolução:', error);
          toast({
            title: "Erro",
            description: "Erro ao carregar dados da evolução médica",
            variant: "destructive",
          });
        }
      }
    };

    loadEvolutionData();
  }, [evolution?.id, toast]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Limpar erro quando o usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.chiefComplaint.trim()) {
      newErrors.chiefComplaint = "Queixa principal é obrigatória";
    }

    if (!formData.currentIllnessHistory.trim()) {
      newErrors.currentIllnessHistory = "História da doença atual é obrigatória";
    }

    if (!formData.additionalObservations.trim()) {
      newErrors.additionalObservations = "Observações da triagem são obrigatórias";
    }

    if (!formData.physicalExam.trim()) {
      newErrors.physicalExam = "Exame físico é obrigatório";
    }

    if (!formData.diagnosticHypotheses.trim()) {
      newErrors.diagnosticHypotheses = "Hipóteses diagnósticas são obrigatórias";
    }

    if (!formData.therapeuticPlan.trim()) {
      newErrors.therapeuticPlan = "Plano terapêutico é obrigatório";
    }

    if (!formData.generalRecommendations.trim()) {
      newErrors.generalRecommendations = "Recomendações gerais são obrigatórias";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Funções para gerenciar sinais vitais
  const addVitalSign = (type: 'pressure' | 'glucose' | 'heart-rate' | 'temperature' | 'weight') => {
    const now = new Date();
    const brazilOffset = -3 * 60; // -3 horas em minutos
    const localTime = new Date(now.getTime() + (brazilOffset * 60 * 1000));

    const newVitalSign: VitalSign = {
      id: `vs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      measuredAt: localTime.toISOString().slice(0, 16),
      notes: '',
      // Campos específicos iniciais vazios
      systolic: '',
      diastolic: '',
      heartRate: '',
      glucoseLevel: '',
      measurementType: '',
      temperature: '',
      method: '',
      weight: ''
    };

    setVitalSigns(prev => [...prev, newVitalSign]);
    setSelectedVitalSignType(type);
    setShowVitalSignsForm(true);

    // Trocar para a tab do sinal vital correspondente
    setActiveTriageTab(type);
  };

  const saveVitalSignLocally = (id: string, formData: any) => {
    // Validações básicas
    const vitalSign = vitalSigns.find(vs => vs.id === id);
    if (!vitalSign) return;

    let isValid = false;
    let errorMessage = '';

    switch (vitalSign.type) {
      case 'pressure':
        if (!formData.systolic || !formData.diastolic) {
          errorMessage = 'Pressão sistólica e diastólica são obrigatórias';
        } else {
          isValid = true;
        }
        break;
      case 'glucose':
        if (!formData.glucoseLevel) {
          errorMessage = 'Nível de glicose é obrigatório';
        } else {
          isValid = true;
        }
        break;
      case 'heart-rate':
        if (!formData.heartRate) {
          errorMessage = 'Batimentos cardíacos são obrigatórios';
        } else {
          isValid = true;
        }
        break;
      case 'temperature':
        if (!formData.temperature) {
          errorMessage = 'Temperatura é obrigatória';
        } else {
          isValid = true;
        }
        break;
      case 'weight':
        if (!formData.weight) {
          errorMessage = 'Peso é obrigatório';
        } else {
          isValid = true;
        }
        break;
    }

    if (!isValid) {
      toast({
        title: "Erro de validação",
        description: errorMessage,
        variant: "destructive",
      });
      return;
    }

    // Atualizar o sinal vital no estado local
    setVitalSigns(prev => prev.map(vs =>
      vs.id === id ? { ...vs, ...formData } : vs
    ));

    // Limpar o formulário após salvar
    setVitalSignForms(prev => ({ ...prev, [id]: {} }));

    toast({
      title: "Sucesso",
      description: "Sinal vital adicionado à evolução",
    });
  };

  const updateVitalSign = (id: string, field: string, value: string) => {
    setVitalSigns(prev =>
      prev.map(vs =>
        vs.id === id ? { ...vs, [field]: value } : vs
      )
    );
  };

  const removeVitalSign = (id: string) => {
    console.log(`🗑️ Removendo sinal vital ID: ${id}`);
    setVitalSigns(prev => {
      const filtered = prev.filter(vs => vs.id !== id);
      console.log(`📊 Sinais vitais após remoção: ${filtered.length}`);
      return filtered;
    });
    // Limpar formulário relacionado se existir
    setVitalSignForms(prev => {
      const newForms = { ...prev };
      delete newForms[id];
      return newForms;
    });
  };

  // Funções para gerenciar prescrições
  const addPrescription = async () => {
    setIsAddingPrescription(true);

    try {
      const newErrors: Record<string, string> = {};

      if (!prescriptionForm.title.trim()) {
        newErrors.title = "Título da prescrição é obrigatório";
      }

      if (!prescriptionForm.doctorName.trim()) {
        newErrors.doctorName = "Nome do médico é obrigatório";
      }

      if (!prescriptionForm.description.trim()) {
        newErrors.description = "Descrição da prescrição é obrigatória";
      }

      setPrescriptionErrors(newErrors);

      if (Object.keys(newErrors).length > 0) {
        toast({
          title: "Erro de validação",
          description: "Por favor, preencha todos os campos obrigatórios.",
          variant: "destructive",
        });
        return;
      }

      // Simular pequeno delay para feedback visual
      await new Promise(resolve => setTimeout(resolve, 300));

      const newPrescription: Prescription = {
        id: `prescription-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: prescriptionForm.title,
        doctorName: prescriptionForm.doctorName,
        date: prescriptionForm.date,
        description: prescriptionForm.description,
        createdAt: new Date().toISOString()
      };

      setPrescriptions(prev => [...prev, newPrescription]);

      // Reset form
      setPrescriptionForm({
        title: '',
        doctorName: activeUserProfileType === 'doctor' && activeUser
          ? `${activeUser.name}${activeUser.crm ? ` - CRM: ${activeUser.crm}` : ''}`
          : '',
        date: new Date().toISOString().split('T')[0],
        description: ''
      });

      // Clear errors
      setPrescriptionErrors({});

      toast({
        title: "Sucesso",
        description: "Prescrição adicionada com sucesso",
      });
    } finally {
      setIsAddingPrescription(false);
    }
  };

  const removePrescription = (id: string) => {
    setPrescriptions(prev => prev.filter(p => p.id !== id));
    toast({
      title: "Sucesso",
      description: "Prescrição removida",
    });
  };

  const updatePrescriptionForm = (field: string, value: string) => {
    setPrescriptionForm(prev => ({ ...prev, [field]: value }));

    // Limpar erro quando o usuário começar a digitar
    if (prescriptionErrors[field]) {
      setPrescriptionErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  // Funções para gerenciar requisições de exames
  const addExamRequisition = async () => {
    setIsAddingExamRequisition(true);

    try {
      const newErrors: Record<string, string> = {};

      if (!examForm.examName.trim()) {
        newErrors.examName = "Nome do exame é obrigatório";
      }

      if (!examForm.category.trim()) {
        newErrors.category = "Categoria do exame é obrigatória";
      }

      if (!examForm.clinicalIndication.trim()) {
        newErrors.clinicalIndication = "Indicação clínica é obrigatória";
      }

      setExamErrors(newErrors);

      if (Object.keys(newErrors).length > 0) {
        toast({
          title: "Erro de validação",
          description: "Por favor, preencha todos os campos obrigatórios.",
          variant: "destructive",
        });
        return;
      }

      // Simular pequeno delay para feedback visual
      await new Promise(resolve => setTimeout(resolve, 300));

      const newRequisition: ExamRequisition = {
        id: `exam-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        examName: examForm.examName,
        category: examForm.category,
        clinicalIndication: examForm.clinicalIndication,
        urgency: examForm.urgency,
        validityDate: examForm.validityDate,
        specialInstructions: examForm.specialInstructions,
        medicalObservations: examForm.medicalObservations,
        createdAt: new Date().toISOString()
      };

      setExamRequisitions(prev => [...prev, newRequisition]);

      // Reset form
      setExamForm({
        examName: '',
        category: '',
        clinicalIndication: '',
        urgency: 'normal',
        validityDate: '',
        specialInstructions: '',
        medicalObservations: ''
      });

      // Clear errors
      setExamErrors({});

      toast({
        title: "Sucesso",
        description: "Requisição de exame adicionada com sucesso",
      });
    } finally {
      setIsAddingExamRequisition(false);
    }
  };

  const removeExamRequisition = (id: string) => {
    setExamRequisitions(prev => prev.filter(r => r.id !== id));
    toast({
      title: "Sucesso",
      description: "Requisição removida",
    });
  };

  const updateExamForm = (field: string, value: string) => {
    setExamForm(prev => ({ ...prev, [field]: value }));

    // Limpar erro quando o usuário começar a digitar
    if (examErrors[field]) {
      setExamErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const updateVitalSignForm = (vitalSignId: string, field: string, value: string) => {
    setVitalSignForms(prev => ({
      ...prev,
      [vitalSignId]: {
        ...prev[vitalSignId],
        [field]: value
      }
    }));
  };

  const getVitalSignFormData = (vitalSignId: string) => {
    return vitalSignForms[vitalSignId] || {};
  };

  const getVitalSignIcon = (type: string) => {
    switch (type) {
      case 'pressure': return Heart;
      case 'glucose': return Droplets;
      case 'heart-rate': return Activity;
      case 'temperature': return Thermometer;
      case 'weight': return Weight;
      default: return Activity;
    }
  };

  const getVitalSignLabel = (type: string) => {
    switch (type) {
      case 'pressure': return 'Pressão Arterial';
      case 'glucose': return 'Glicemia';
      case 'heart-rate': return 'Batimentos Cardíacos';
      case 'temperature': return 'Temperatura';
      case 'weight': return 'Peso';
      default: return type;
    }
  };

  const getVitalSignColor = (type: string) => {
    switch (type) {
      case 'pressure': return 'red';
      case 'glucose': return 'blue';
      case 'heart-rate': return 'rose';
      case 'temperature': return 'orange';
      case 'weight': return 'purple';
      default: return 'gray';
    }
  };

  const translateMeasurementType = (type: string, category: 'glucose' | 'heart-rate' | 'temperature') => {
    const translations = {
      glucose: {
        'fasting': 'Jejum',
        'post_meal': 'Pós-refeição',
        'random': 'Aleatório',
        'bedtime': 'Antes de dormir'
      },
      'heart-rate': {
        'resting': 'Repouso',
        'exercise': 'Exercício',
        'recovery': 'Recuperação'
      },
      temperature: {
        'oral': 'Oral',
        'rectal': 'Retal',
        'axillary': 'Axilar',
        'tympanic': 'Timpânica',
        'temporal': 'Temporal',
        'forehead': 'Testa',
        'ear': 'Ouvido'
      }
    };

    return translations[category]?.[type] || type;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: "Erro de validação",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    console.log(`📊 Enviando ${vitalSigns.length} sinais vitais para o servidor`);
    const validVitalSigns = vitalSigns.filter(vs => {
      // Filtrar sinais vitais válidos
      let isValid = false;
      switch (vs.type) {
        case 'pressure':
          isValid = !!(vs.systolic && vs.diastolic);
          break;
        case 'glucose':
          isValid = !!vs.glucoseLevel;
          break;
        case 'heart-rate':
          isValid = !!vs.heartRate;
          break;
        case 'temperature':
          isValid = !!vs.temperature;
          break;
        case 'weight':
          isValid = !!vs.weight;
          break;
        default:
          isValid = false;
      }
      console.log(`🔍 Sinal vital ${vs.id} (${vs.type}): ${isValid ? 'VÁLIDO' : 'INVÁLIDO'}`);
      return isValid;
    }).map(vs => ({
      id: vs.id,
      type: vs.type,
      measuredAt: vs.measuredAt,
      notes: vs.notes || '',
      ...(vs.type === 'pressure' && {
        systolic: parseInt(vs.systolic),
        diastolic: parseInt(vs.diastolic),
        heartRate: vs.heartRate ? parseInt(vs.heartRate) : undefined
      }),
      ...(vs.type === 'glucose' && {
        glucoseLevel: parseInt(vs.glucoseLevel),
        measurementType: vs.measurementType
      }),
      ...(vs.type === 'heart-rate' && {
        heartRate: parseInt(vs.heartRate),
        measurementType: vs.measurementType
      }),
      ...(vs.type === 'temperature' && {
        temperature: parseFloat(vs.temperature),
        method: vs.method
      }),
      ...(vs.type === 'weight' && {
        weight: parseFloat(vs.weight)
      })
    }));

    console.log(`📤 Enviando ${validVitalSigns.length} sinais vitais válidos`);

    const evolutionData = {
      ...formData,
      vitalSigns: validVitalSigns,
      prescriptionsData: prescriptions,
      examRequisitionsData: examRequisitions
    };

    onSave(evolutionData);
  };

  const isReadOnly = userProfileType !== 'doctor';

  if (isReadOnly) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Registro Médico</h2>
          </div>
          <Button variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Fechar
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Dr(a). {evolution?.doctorName}
              </CardTitle>
              <div className="text-sm text-gray-500">
                {evolution?.createdAt && new Date(evolution.createdAt).toLocaleDateString('pt-BR')}
              </div>
            </div>
            {evolution?.doctorCrm && (
              <p className="text-sm text-gray-600">CRM: {evolution.doctorCrm}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Seção de Triagem - Visualização */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
                <User className="h-5 w-5" />
                Dados de Triagem
              </h3>
              <div className="grid gap-4">
                <div>
                  <Label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <AlertTriangle className="h-4 w-4" />
                    Queixa Principal
                  </Label>
                  <div className="mt-1 p-3 bg-white rounded-md border">
                    <p className="text-sm">{evolution?.chiefComplaint || "Não informado"}</p>
                  </div>
                </div>

                {evolution?.currentIllnessHistory && (
                    <div>
                    <Label className="text-sm font-medium text-gray-700">História da Doença Atual</Label>
                    <div className="mt-1 p-3 bg-white rounded-md border">
                      <p className="text-sm whitespace-pre-wrap">{evolution.currentIllnessHistory}</p>
                    </div>
                  </div>
                )}

                {evolution?.additionalObservations && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Observações da Triagem</Label>
                    <div className="mt-1 p-3 bg-white rounded-md border">
                      <p className="text-sm whitespace-pre-wrap">{evolution.additionalObservations}</p>
                    </div>
                  </div>
                )}

                {evolution?.vitalSigns && (
                  <div>
                    <Label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Activity className="h-4 w-4 text-green-500" />
                      Sinais Vitais
                    </Label>
                    <div className="mt-1 p-3 bg-white rounded-md border">
                      <p className="text-sm whitespace-pre-wrap">{evolution.vitalSigns}</p>
                    </div>
                    <p className="text-xs text-green-600 mt-1">
                      Consulte o sistema de sinais vitais para dados completos
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Seção de Evolução Médica - Visualização */}
            <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-200">
              <h3 className="text-lg font-semibold text-cyan-800 mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Evolução Médica
              </h3>
              <div className="grid gap-4">
                <div>
                  <Label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Stethoscope className="h-4 w-4" />
                    Exame Físico
                  </Label>
                  <div className="mt-1 p-3 bg-white rounded-md border">
                    <p className="text-sm whitespace-pre-wrap">{evolution?.physicalExam || "Não informado"}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700">Hipóteses Diagnósticas</Label>
                  <div className="mt-1 p-3 bg-white rounded-md border">
                    <p className="text-sm whitespace-pre-wrap">{evolution?.diagnosticHypotheses || "Não informado"}</p>
                  </div>
                </div>

                {evolution?.therapeuticPlan && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Plano Terapêutico</Label>
                    <div className="mt-1 p-3 bg-white rounded-md border">
                      <p className="text-sm whitespace-pre-wrap">{evolution.therapeuticPlan}</p>
                    </div>
                  </div>
                )}

                {evolution?.generalRecommendations && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Recomendações Gerais</Label>
                    <div className="mt-1 p-3 bg-white rounded-md border">
                      <p className="text-sm whitespace-pre-wrap">{evolution.generalRecommendations}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Seção de Prescrições e Exames - Visualização */}
            {(evolution?.prescribedMedications || evolution?.requestedExams) && (
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h3 className="text-lg font-semibold text-purple-800 mb-4 flex items-center gap-2">
                  <Pill className="h-5 w-5" />
                  Prescrições e Exames
                </h3>
                <div className="grid gap-4">
                  {evolution?.prescribedMedications && (
                    <div>
                      <Label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <Pill className="h-4 w-4 text-purple-500" />
                        Medicamentos Prescritos
                      </Label>
                      <div className="mt-1 p-3 bg-white rounded-md border">
                        <p className="text-sm whitespace-pre-wrap">{evolution.prescribedMedications}</p>
                      </div>
                      <p className="text-xs text-purple-600 mt-1">
                        Consulte o sistema de medicamentos para prescrições completas
                      </p>
                    </div>
                  )}

                  {evolution?.requestedExams && (
                    <div>
                      <Label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <TestTube className="h-4 w-4 text-orange-500" />
                        Exames Solicitados
                      </Label>
                      <div className="mt-1 p-3 bg-white rounded-md border">
                        <p className="text-sm whitespace-pre-wrap">{evolution.requestedExams}</p>
                      </div>
                      <p className="text-xs text-orange-600 mt-1">
                        Consulte o sistema de exames para solicitações completas
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide">
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-100 rounded-lg">
                <FileText className="h-5 w-5 text-cyan-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {evolution ? 'Editar Evolução Médica' : 'Nova Evolução Médica'}
                </h2>
                <p className="text-sm text-gray-600">
                  Preencha as informações da evolução médica
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Seção de Triagem - Informações Pré-Consulta */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
                <User className="h-5 w-5" />
                Dados de Triagem
              </h3>

              <Tabs value={activeTriageTab} onValueChange={setActiveTriageTab} className="w-full">
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="geral" className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Geral
                  </TabsTrigger>
                  <TabsTrigger value="pressure" className="flex items-center gap-1">
                    <Heart className="h-3 w-3" />
                    Pressão
                  </TabsTrigger>
                  <TabsTrigger value="glucose" className="flex items-center gap-1">
                    <Droplets className="h-3 w-3" />
                    Glicose
                  </TabsTrigger>
                  <TabsTrigger value="heart-rate" className="flex items-center gap-1">
                    <Activity className="h-3 w-3" />
                    Batimentos
                  </TabsTrigger>
                  <TabsTrigger value="temperature" className="flex items-center gap-1">
                    <Thermometer className="h-3 w-3" />
                    Temperatura
                  </TabsTrigger>
                  <TabsTrigger value="weight" className="flex items-center gap-1">
                    <Weight className="h-3 w-3" />
                    Peso
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="geral" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="chiefComplaint">
                        Queixa Principal *
                      </Label>
                      <Textarea
                        id="chiefComplaint"
                        value={formData.chiefComplaint}
                        onChange={(e) => handleInputChange('chiefComplaint', e.target.value)}
                        placeholder="Descreva a queixa principal do paciente..."
                        rows={3}
                        className={errors.chiefComplaint ? "border-red-500" : ""}
                      />
                      {errors.chiefComplaint && (
                        <p className="text-sm text-red-500 mt-1">{errors.chiefComplaint}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currentIllnessHistory">História da Doença Atual *</Label>
                      <Textarea
                        id="currentIllnessHistory"
                        value={formData.currentIllnessHistory}
                        onChange={(e) => handleInputChange('currentIllnessHistory', e.target.value)}
                        placeholder="Descreva a história da doença atual..."
                        rows={3}
                        className={errors.currentIllnessHistory ? "border-red-500" : ""}
                      />
                      {errors.currentIllnessHistory && (
                        <p className="text-sm text-red-500 mt-1">{errors.currentIllnessHistory}</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="additionalObservations">Observações da Triagem *</Label>
                    <Textarea
                      id="additionalObservations"
                      value={formData.additionalObservations}
                      onChange={(e) => handleInputChange('additionalObservations', e.target.value)}
                      placeholder="Observações coletadas durante a triagem..."
                      rows={3}
                      className={errors.additionalObservations ? "border-red-500" : ""}
                    />
                    {errors.additionalObservations && (
                      <p className="text-sm text-red-500 mt-1">{errors.additionalObservations}</p>
                    )}
                  </div>


                </TabsContent>

                <TabsContent value="pressure" className="space-y-4">
                  <div className="space-y-4">
                    <Label className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-red-600" />
                      Nova Pressão Arterial
                    </Label>

                    {/* Formulário sempre visível */}
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      {(() => {
                        const newVitalSignId = 'new-pressure';
                        const formData = getVitalSignFormData(newVitalSignId);

                        return (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                              <div className="space-y-2">
                                <Label className="text-sm">Sistólica (mmHg)</Label>
                                <Input
                                  type="number"
                                  placeholder="Ex: 120"
                                  min="60"
                                  max="250"
                                  value={formData.systolic || ''}
                                  onChange={(e) => updateVitalSignForm(newVitalSignId, 'systolic', e.target.value)}
                                  className="text-sm"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm">Diastólica (mmHg)</Label>
                                <Input
                                  type="number"
                                  placeholder="Ex: 80"
                                  min="40"
                                  max="150"
                                  value={formData.diastolic || ''}
                                  onChange={(e) => updateVitalSignForm(newVitalSignId, 'diastolic', e.target.value)}
                                  className="text-sm"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm">Batimentos (bpm)</Label>
                                <Input
                                  type="number"
                                  placeholder="Ex: 72"
                                  min="30"
                                  max="250"
                                  value={formData.heartRate || ''}
                                  onChange={(e) => updateVitalSignForm(newVitalSignId, 'heartRate', e.target.value)}
                                  className="text-sm"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm">Data e Hora</Label>
                                <Input
                                  type="datetime-local"
                                  value={formData.measuredAt || (() => {
                                    const now = new Date();
                                    const brazilOffset = -3 * 60;
                                    const localTime = new Date(now.getTime() + (brazilOffset * 60 * 1000));
                                    return localTime.toISOString().slice(0, 16);
                                  })()}
                                  onChange={(e) => updateVitalSignForm(newVitalSignId, 'measuredAt', e.target.value)}
                                  className="text-sm"
                                />
                              </div>
                            </div>
                            <div className="mt-3 space-y-2">
                              <Label className="text-sm">Observações</Label>
                              <Textarea
                                placeholder="Observações sobre a medição..."
                                rows={2}
                                value={formData.notes || ''}
                                onChange={(e) => updateVitalSignForm(newVitalSignId, 'notes', e.target.value)}
                                className="text-sm"
                              />
                            </div>

                            {/* Separador */}
                            <div className="border-t border-red-200 my-4"></div>

                            {/* Botões */}
                            <div className="flex justify-end gap-3">
                              <Button
                                type="button"
                                size="sm"
                                className="bg-red-600 hover:bg-red-700 text-white"
                                disabled={savingVitalSigns['pressure']}
                                onClick={async () => {
                                  setSavingVitalSigns(prev => ({ ...prev, pressure: true }));
                                  try {
                                    // Pegar os dados do formulário primeiro
                                    const currentFormData = getVitalSignFormData(newVitalSignId);

                                    // Validar dados obrigatórios
                                    if (!currentFormData.systolic || !currentFormData.diastolic) {
                                      toast({
                                        title: "Erro de validação",
                                        description: "Pressão sistólica e diastólica são obrigatórias",
                                        variant: "destructive",
                                      });
                                      return;
                                    }

                                    // Criar novo sinal vital já com os dados
                                    const now = new Date();
                                    const brazilOffset = -3 * 60;
                                    const localTime = new Date(now.getTime() + (brazilOffset * 60 * 1000));

                                    const newVitalSign: VitalSign = {
                                      id: `vs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                      type: 'pressure',
                                      measuredAt: currentFormData.measuredAt || localTime.toISOString().slice(0, 16),
                                      notes: currentFormData.notes || '',
                                      systolic: currentFormData.systolic,
                                      diastolic: currentFormData.diastolic,
                                      heartRate: currentFormData.heartRate || '',
                                      glucoseLevel: '',
                                      measurementType: '',
                                      temperature: '',
                                      method: '',
                                      weight: ''
                                    };

                                    // Adicionar ao array de sinais vitais
                                    setVitalSigns(prev => [...prev, newVitalSign]);

                                    // Limpar o formulário
                                    setVitalSignForms(prev => ({ ...prev, [newVitalSignId]: {} }));

                                    toast({
                                      title: "Sucesso",
                                      description: "Pressão arterial adicionada à evolução",
                                    });
                                  } finally {
                                    setTimeout(() => setSavingVitalSigns(prev => ({ ...prev, pressure: false })), 500);
                                  }
                                }}
                              >
                                {savingVitalSigns['pressure'] ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                                    Salvando...
                                  </>
                                ) : (
                                  <>
                                    <Save className="h-4 w-4 mr-1" />
                                    Salvar Pressão
                                  </>
                                )}
                              </Button>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    {/* Lista de sinais vitais salvos */}
                    {vitalSigns.filter(vs => vs.type === 'pressure').length > 0 ? (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-red-800 border-b border-red-200 pb-2">
                          Pressões Arteriais Registradas
                        </h4>
                        {vitalSigns.filter(vs => vs.type === 'pressure').map((vitalSign) => (
                          <div key={vitalSign.id} className="p-3 bg-white border border-red-200 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-red-800">
                                  {(vitalSign.systolic && vitalSign.diastolic &&
                                    vitalSign.systolic.toString().trim() !== '' &&
                                    vitalSign.diastolic.toString().trim() !== '') ?
                                    `${vitalSign.systolic}/${vitalSign.diastolic} mmHg` :
                                    '--/-- mmHg'}
                                  {vitalSign.heartRate && vitalSign.heartRate.toString().trim() !== '' &&
                                   ` (${vitalSign.heartRate} bpm)`}
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeVitalSign(vitalSign.id)}
                                className="text-red-400 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="text-xs text-gray-600">
                              {new Date(vitalSign.measuredAt).toLocaleString('pt-BR')}
                            </div>
                            {vitalSign.notes && (
                              <div className="text-xs text-gray-700 mt-1 italic">
                                {vitalSign.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center p-4 bg-white rounded-lg border border-red-200">
                        <Heart className="h-8 w-8 mx-auto mb-2 text-red-300" />
                        <p className="text-sm text-red-600">Nenhuma pressão arterial registrada</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="glucose" className="space-y-4">
                  <div className="space-y-4">
                    <Label className="flex items-center gap-2">
                      <Droplets className="h-4 w-4 text-blue-600" />
                      Nova Glicemia
                    </Label>

                    {/* Formulário sempre visível */}
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      {(() => {
                        const newVitalSignId = 'new-glucose';
                        const formData = getVitalSignFormData(newVitalSignId);

                        return (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div className="space-y-2">
                                <Label className="text-sm">Glicose (mg/dL)</Label>
                                <Input
                                  type="number"
                                  placeholder="Ex: 120"
                                  min="50"
                                  max="600"
                                  value={formData.glucoseLevel || ''}
                                  onChange={(e) => updateVitalSignForm(newVitalSignId, 'glucoseLevel', e.target.value)}
                                  className="text-sm"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm">Período</Label>
                                <Select
                                  value={formData.measurementType || ''}
                                  onValueChange={(value) => updateVitalSignForm(newVitalSignId, 'measurementType', value)}
                                >
                                  <SelectTrigger className="text-sm">
                                    <SelectValue placeholder="Selecione o período" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="fasting">Jejum</SelectItem>
                                    <SelectItem value="post_meal">Pós-refeição</SelectItem>
                                    <SelectItem value="random">Aleatório</SelectItem>
                                    <SelectItem value="bedtime">Antes de dormir</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm">Data e Hora</Label>
                                <Input
                                  type="datetime-local"
                                  value={formData.measuredAt || (() => {
                                    const now = new Date();
                                    const brazilOffset = -3 * 60;
                                    const localTime = new Date(now.getTime() + (brazilOffset * 60 * 1000));
                                    return localTime.toISOString().slice(0, 16);
                                  })()}
                                  onChange={(e) => updateVitalSignForm(newVitalSignId, 'measuredAt', e.target.value)}
                                  className="text-sm"
                                />
                              </div>
                            </div>
                            <div className="mt-3 space-y-2">
                              <Label className="text-sm">Observações</Label>
                              <Textarea
                                placeholder="Observações sobre a medição..."
                                rows={2}
                                value={formData.notes || ''}
                                onChange={(e) => updateVitalSignForm(newVitalSignId, 'notes', e.target.value)}
                                className="text-sm"
                              />
                            </div>

                            {/* Separador */}
                            <div className="border-t border-blue-200 my-4"></div>

                            {/* Botões */}
                            <div className="flex justify-end gap-3">
                              <Button
                                type="button"
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                disabled={savingVitalSigns['glucose']}
                                onClick={async () => {
                                  setSavingVitalSigns(prev => ({ ...prev, glucose: true }));
                                  try {
                                    const currentFormData = getVitalSignFormData(newVitalSignId);

                                    if (!currentFormData.glucoseLevel) {
                                      toast({
                                        title: "Erro de validação",
                                        description: "Nível de glicose é obrigatório",
                                        variant: "destructive",
                                      });
                                      return;
                                    }

                                    const now = new Date();
                                    const brazilOffset = -3 * 60;
                                    const localTime = new Date(now.getTime() + (brazilOffset * 60 * 1000));

                                    const newVitalSign: VitalSign = {
                                      id: `vs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                      type: 'glucose',
                                      measuredAt: currentFormData.measuredAt || localTime.toISOString().slice(0, 16),
                                      notes: currentFormData.notes || '',
                                      systolic: '',
                                      diastolic: '',
                                      heartRate: '',
                                      glucoseLevel: currentFormData.glucoseLevel,
                                      measurementType: currentFormData.measurementType || '',
                                      temperature: '',
                                      method: '',
                                      weight: ''
                                    };

                                    setVitalSigns(prev => [...prev, newVitalSign]);
                                    setVitalSignForms(prev => ({ ...prev, [newVitalSignId]: {} }));

                                    toast({
                                      title: "Sucesso",
                                      description: "Glicemia adicionada à evolução",
                                    });
                                  } finally {
                                    setTimeout(() => setSavingVitalSigns(prev => ({ ...prev, glucose: false })), 500);
                                  }
                                }}
                              >
                                {savingVitalSigns['glucose'] ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                                    Salvando...
                                  </>
                                ) : (
                                  <>
                                    <Save className="h-4 w-4 mr-1" />
                                    Salvar Glicemia
                                  </>
                                )}
                              </Button>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    {/* Lista de sinais vitais salvos */}
                    {vitalSigns.filter(vs => vs.type === 'glucose').length > 0 ? (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-blue-800 border-b border-blue-200 pb-2">
                          Glicemias Registradas
                        </h4>
                        {vitalSigns.filter(vs => vs.type === 'glucose').map((vitalSign) => (
                          <div key={vitalSign.id} className="p-3 bg-white border border-blue-200 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-blue-800">
                                  {vitalSign.glucoseLevel || '--'} mg/dL
                                  {vitalSign.measurementType && ` (${translateMeasurementType(vitalSign.measurementType, 'glucose')})`}
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeVitalSign(vitalSign.id)}
                                className="text-blue-400 hover:text-blue-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="text-xs text-gray-600">
                              {new Date(vitalSign.measuredAt).toLocaleString('pt-BR')}
                            </div>
                            {vitalSign.notes && (
                              <div className="text-xs text-gray-700 mt-1 italic">
                                {vitalSign.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center p-4 bg-white rounded-lg border border-blue-200">
                        <Droplets className="h-8 w-8 mx-auto mb-2 text-blue-300" />
                        <p className="text-sm text-blue-600">Nenhuma glicemia registrada</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="heart-rate" className="space-y-4">
                  <div className="space-y-4">
                    <Label className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-rose-600" />
                      Novos Batimentos Cardíacos
                    </Label>

                    {/* Formulário sempre visível */}
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg">
                      {(() => {
                        const newVitalSignId = 'new-heart-rate';
                        const formData = getVitalSignFormData(newVitalSignId);

                        return (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div className="space-y-2">
                                <Label className="text-sm">Batimentos (bpm)</Label>
                                <Input
                                  type="number"
                                  placeholder="Ex: 72"
                                  min="30"
                                  max="250"
                                  value={formData.heartRate || ''}
                                  onChange={(e) => updateVitalSignForm(newVitalSignId, 'heartRate', e.target.value)}
                                  className="text-sm"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm">Tipo de Medição</Label>
                                <Select
                                  value={formData.measurementType || ''}
                                  onValueChange={(value) => updateVitalSignForm(newVitalSignId, 'measurementType', value)}
                                >
                                  <SelectTrigger className="text-sm">
                                    <SelectValue placeholder="Selecione o tipo" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="resting">Repouso</SelectItem>
                                    <SelectItem value="exercise">Exercício</SelectItem>
                                    <SelectItem value="recovery">Recuperação</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm">Data e Hora</Label>
                                <Input
                                  type="datetime-local"
                                  value={formData.measuredAt || (() => {
                                    const now = new Date();
                                    const brazilOffset = -3 * 60;
                                    const localTime = new Date(now.getTime() + (brazilOffset * 60 * 1000));
                                    return localTime.toISOString().slice(0, 16);
                                  })()}
                                  onChange={(e) => updateVitalSignForm(newVitalSignId, 'measuredAt', e.target.value)}
                                  className="text-sm"
                                />
                              </div>
                            </div>
                            <div className="mt-3 space-y-2">
                              <Label className="text-sm">Observações</Label>
                              <Textarea
                                placeholder="Observações sobre a medição..."
                                rows={2}
                                value={formData.notes || ''}
                                onChange={(e) => updateVitalSignForm(newVitalSignId, 'notes', e.target.value)}
                                className="text-sm"
                              />
                            </div>

                            {/* Separador */}
                            <div className="border-t border-rose-200 my-4"></div>

                            {/* Botões */}
                            <div className="flex justify-end gap-3">
                              <Button
                                type="button"
                                size="sm"
                                className="bg-rose-600 hover:bg-rose-700 text-white"
                                disabled={savingVitalSigns['heart-rate']}
                                onClick={async () => {
                                  setSavingVitalSigns(prev => ({ ...prev, 'heart-rate': true }));
                                  try {
                                    const currentFormData = getVitalSignFormData(newVitalSignId);

                                    if (!currentFormData.heartRate) {
                                      toast({
                                        title: "Erro de validação",
                                        description: "Batimentos cardíacos são obrigatórios",
                                        variant: "destructive",
                                      });
                                      return;
                                    }

                                    const now = new Date();
                                    const brazilOffset = -3 * 60;
                                    const localTime = new Date(now.getTime() + (brazilOffset * 60 * 1000));

                                    const newVitalSign: VitalSign = {
                                      id: `vs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                      type: 'heart-rate',
                                      measuredAt: currentFormData.measuredAt || localTime.toISOString().slice(0, 16),
                                      notes: currentFormData.notes || '',
                                      systolic: '',
                                      diastolic: '',
                                      heartRate: currentFormData.heartRate,
                                      glucoseLevel: '',
                                      measurementType: currentFormData.measurementType || '',
                                      temperature: '',
                                      method: '',
                                      weight: ''
                                    };

                                    setVitalSigns(prev => [...prev, newVitalSign]);
                                    setVitalSignForms(prev => ({ ...prev, [newVitalSignId]: {} }));

                                    toast({
                                      title: "Sucesso",
                                      description: "Batimentos cardíacos adicionados à evolução",
                                    });
                                  } finally {
                                    setTimeout(() => setSavingVitalSigns(prev => ({ ...prev, 'heart-rate': false })), 500);
                                  }
                                }}
                              >
                                {savingVitalSigns['heart-rate'] ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                                    Salvando...
                                  </>
                                ) : (
                                  <>
                                    <Save className="h-4 w-4 mr-1" />
                                    Salvar Batimentos
                                  </>
                                )}
                              </Button>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    {/* Lista de sinais vitais salvos */}
                    {vitalSigns.filter(vs => vs.type === 'heart-rate').length > 0 ? (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-rose-800 border-b border-rose-200 pb-2">
                          Batimentos Cardíacos Registrados
                        </h4>
                        {vitalSigns.filter(vs => vs.type === 'heart-rate').map((vitalSign) => (
                          <div key={vitalSign.id} className="p-3 bg-white border border-rose-200 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-rose-800">
                                  {vitalSign.heartRate || '--'} bpm
                                  {vitalSign.measurementType && ` (${translateMeasurementType(vitalSign.measurementType, 'heart-rate')})`}
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeVitalSign(vitalSign.id)}
                                className="text-rose-400 hover:text-rose-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="text-xs text-gray-600">
                              {new Date(vitalSign.measuredAt).toLocaleString('pt-BR')}
                            </div>
                            {vitalSign.notes && (
                              <div className="text-xs text-gray-700 mt-1 italic">
                                {vitalSign.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center p-4 bg-white rounded-lg border border-rose-200">
                        <Activity className="h-8 w-8 mx-auto mb-2 text-rose-300" />
                        <p className="text-sm text-rose-600">Nenhum batimento cardíaco registrado</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="temperature" className="space-y-4">
                  <div className="space-y-4">
                    <Label className="flex items-center gap-2">
                      <Thermometer className="h-4 w-4 text-orange-600" />
                      Nova Temperatura
                    </Label>

                    {/* Formulário sempre visível */}
                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                      {(() => {
                        const newVitalSignId = 'new-temperature';
                        const formData = getVitalSignFormData(newVitalSignId);

                        return (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div className="space-y-2">
                                <Label className="text-sm">Temperatura (°C)</Label>
                                <Input
                                  type="number"
                                  placeholder="Ex: 37.2"
                                  min="25"
                                  max="50"
                                  step="0.1"
                                  value={formData.temperature || ''}
                                  onChange={(e) => updateVitalSignForm(newVitalSignId, 'temperature', e.target.value)}
                                  className="text-sm"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm">Método de Medição</Label>
                                <Select
                                  value={formData.method || ''}
                                  onValueChange={(value) => updateVitalSignForm(newVitalSignId, 'method', value)}
                                >
                                  <SelectTrigger className="text-sm">
                                    <SelectValue placeholder="Selecione o método" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="oral">Oral</SelectItem>
                                    <SelectItem value="rectal">Retal</SelectItem>
                                    <SelectItem value="axillary">Axilar</SelectItem>
                                    <SelectItem value="tympanic">Timpânica</SelectItem>
                                    <SelectItem value="temporal">Temporal</SelectItem>
                                    <SelectItem value="forehead">Testa</SelectItem>
                                    <SelectItem value="ear">Ouvido</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm">Data e Hora</Label>
                                <Input
                                  type="datetime-local"
                                  value={formData.measuredAt || (() => {
                                    const now = new Date();
                                    const brazilOffset = -3 * 60;
                                    const localTime = new Date(now.getTime() + (brazilOffset * 60 * 1000));
                                    return localTime.toISOString().slice(0, 16);
                                  })()}
                                  onChange={(e) => updateVitalSignForm(newVitalSignId, 'measuredAt', e.target.value)}
                                  className="text-sm"
                                />
                              </div>
                            </div>
                            <div className="mt-3 space-y-2">
                              <Label className="text-sm">Observações</Label>
                              <Textarea
                                placeholder="Observações sobre a medição..."
                                rows={2}
                                value={formData.notes || ''}
                                onChange={(e) => updateVitalSignForm(newVitalSignId, 'notes', e.target.value)}
                                className="text-sm"
                              />
                            </div>

                            {/* Separador */}
                            <div className="border-t border-orange-200 my-4"></div>

                            {/* Botões */}
                            <div className="flex justify-end gap-3">
                              <Button
                                type="button"
                                size="sm"
                                className="bg-orange-600 hover:bg-orange-700 text-white"
                                disabled={savingVitalSigns['temperature']}
                                onClick={async () => {
                                  setSavingVitalSigns(prev => ({ ...prev, temperature: true }));
                                  try {
                                    const currentFormData = getVitalSignFormData(newVitalSignId);

                                    if (!currentFormData.temperature) {
                                      toast({
                                        title: "Erro de validação",
                                        description: "Temperatura é obrigatória",
                                        variant: "destructive",
                                      });
                                      return;
                                    }

                                    const now = new Date();
                                    const brazilOffset = -3 * 60;
                                    const localTime = new Date(now.getTime() + (brazilOffset * 60 * 1000));

                                    const newVitalSign: VitalSign = {
                                      id: `vs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                      type: 'temperature',
                                      measuredAt: currentFormData.measuredAt || localTime.toISOString().slice(0, 16),
                                      notes: currentFormData.notes || '',
                                      systolic: '',
                                      diastolic: '',
                                      heartRate: '',
                                      glucoseLevel: '',
                                      measurementType: '',
                                      temperature: currentFormData.temperature,
                                      method: currentFormData.method || '',
                                      weight: ''
                                    };

                                    setVitalSigns(prev => [...prev, newVitalSign]);
                                    setVitalSignForms(prev => ({ ...prev, [newVitalSignId]: {} }));

                                    toast({
                                      title: "Sucesso",
                                      description: "Temperatura adicionada à evolução",
                                    });
                                  } finally {
                                    setTimeout(() => setSavingVitalSigns(prev => ({ ...prev, temperature: false })), 500);
                                  }
                                }}
                              >
                                {savingVitalSigns['temperature'] ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                                    Salvando...
                                  </>
                                ) : (
                                  <>
                                    <Save className="h-4 w-4 mr-1" />
                                    Salvar Temperatura
                                  </>
                                )}
                              </Button>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    {/* Lista de sinais vitais salvos */}
                    {vitalSigns.filter(vs => vs.type === 'temperature').length > 0 ? (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-orange-800 border-b border-orange-200 pb-2">
                          Temperaturas Registradas
                        </h4>
                        {vitalSigns.filter(vs => vs.type === 'temperature').map((vitalSign) => (
                          <div key={vitalSign.id} className="p-3 bg-white border border-orange-200 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-orange-800">
                                  {vitalSign.temperature || '--'}°C
                                  {vitalSign.method && ` (${translateMeasurementType(vitalSign.method, 'temperature')})`}
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeVitalSign(vitalSign.id)}
                                className="text-orange-400 hover:text-orange-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="text-xs text-gray-600">
                              {new Date(vitalSign.measuredAt).toLocaleString('pt-BR')}
                            </div>
                            {vitalSign.notes && (
                              <div className="text-xs text-gray-700 mt-1 italic">
                                {vitalSign.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center p-4 bg-white rounded-lg border border-orange-200">
                        <Thermometer className="h-8 w-8 mx-auto mb-2 text-orange-300" />
                        <p className="text-sm text-orange-600">Nenhuma temperatura registrada</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="weight" className="space-y-4">
                  <div className="space-y-4">
                    <Label className="flex items-center gap-2">
                      <Weight className="h-4 w-4 text-purple-600" />
                      Novo Peso
                    </Label>

                    {/* Formulário sempre visível */}
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      {(() => {
                        const newVitalSignId = 'new-weight';
                        const formData = getVitalSignFormData(newVitalSignId);

                        return (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <Label className="text-sm">Peso (kg)</Label>
                                <Input
                                  type="number"
                                  placeholder="Ex: 75.5"
                                  min="1"
                                  max="300"
                                  step="0.1"
                                  value={formData.weight || ''}
                                  onChange={(e) => updateVitalSignForm(newVitalSignId, 'weight', e.target.value)}
                                  className="text-sm"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm">Data e Hora</Label>
                                <Input
                                  type="datetime-local"
                                  value={formData.measuredAt || (() => {
                                    const now = new Date();
                                    const brazilOffset = -3 * 60;
                                    const localTime = new Date(now.getTime() + (brazilOffset * 60 * 1000));
                                    return localTime.toISOString().slice(0, 16);
                                  })()}
                                  onChange={(e) => updateVitalSignForm(newVitalSignId, 'measuredAt', e.target.value)}
                                  className="text-sm"
                                />
                              </div>
                            </div>
                            <div className="mt-3 space-y-2">
                              <Label className="text-sm">Observações</Label>
                              <Textarea
                                placeholder="Observações sobre a medição..."
                                rows={2}
                                value={formData.notes || ''}
                                onChange={(e) => updateVitalSignForm(newVitalSignId, 'notes', e.target.value)}
                                className="text-sm"
                              />
                            </div>

                            {/* Separador */}
                            <div className="border-t border-purple-200 my-4"></div>

                            {/* Botões */}
                            <div className="flex justify-end gap-3">
                              <Button
                                type="button"
                                size="sm"
                                className="bg-purple-600 hover:bg-purple-700 text-white"
                                disabled={savingVitalSigns['weight']}
                                onClick={async () => {
                                  setSavingVitalSigns(prev => ({ ...prev, weight: true }));
                                  try {
                                    const currentFormData = getVitalSignFormData(newVitalSignId);

                                    if (!currentFormData.weight) {
                                      toast({
                                        title: "Erro de validação",
                                        description: "Peso é obrigatório",
                                        variant: "destructive",
                                      });
                                      return;
                                    }

                                    const now = new Date();
                                    const brazilOffset = -3 * 60;
                                    const localTime = new Date(now.getTime() + (brazilOffset * 60 * 1000));

                                    const newVitalSign: VitalSign = {
                                      id: `vs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                      type: 'weight',
                                      measuredAt: currentFormData.measuredAt || localTime.toISOString().slice(0, 16),
                                      notes: currentFormData.notes || '',
                                      systolic: '',
                                      diastolic: '',
                                      heartRate: '',
                                      glucoseLevel: '',
                                      measurementType: '',
                                      temperature: '',
                                      method: '',
                                      weight: currentFormData.weight
                                    };

                                    setVitalSigns(prev => [...prev, newVitalSign]);
                                    setVitalSignForms(prev => ({ ...prev, [newVitalSignId]: {} }));

                                    toast({
                                      title: "Sucesso",
                                      description: "Peso adicionado à evolução",
                                    });
                                  } finally {
                                    setTimeout(() => setSavingVitalSigns(prev => ({ ...prev, weight: false })), 500);
                                  }
                                }}
                              >
                                {savingVitalSigns['weight'] ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                                    Salvando...
                                  </>
                                ) : (
                                  <>
                                    <Save className="h-4 w-4 mr-1" />
                                    Salvar Peso
                                  </>
                                )}
                              </Button>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    {/* Lista de sinais vitais salvos */}
                    {vitalSigns.filter(vs => vs.type === 'weight').length > 0 ? (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-purple-800 border-b border-purple-200 pb-2">
                          Pesos Registrados
                        </h4>
                        {vitalSigns.filter(vs => vs.type === 'weight').map((vitalSign) => (
                          <div key={vitalSign.id} className="p-3 bg-white border border-purple-200 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-purple-800">
                                  {vitalSign.weight || '--'} kg
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeVitalSign(vitalSign.id)}
                                className="text-purple-400 hover:text-purple-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="text-xs text-gray-600">
                              {new Date(vitalSign.measuredAt).toLocaleString('pt-BR')}
                            </div>
                            {vitalSign.notes && (
                              <div className="text-xs text-gray-700 mt-1 italic">
                                {vitalSign.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center p-4 bg-white rounded-lg border border-purple-200">
                        <Weight className="h-8 w-8 mx-auto mb-2 text-purple-300" />
                        <p className="text-sm text-purple-600">Nenhum peso registrado</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Seção de Evolução Médica */}
            <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-200">
              <h3 className="text-lg font-semibold text-cyan-800 mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Evolução Médica
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="physicalExam">
                    Exame Físico *
                  </Label>
                  <Textarea
                    id="physicalExam"
                    value={formData.physicalExam}
                    onChange={(e) => handleInputChange('physicalExam', e.target.value)}
                    placeholder="Descreva os achados do exame físico..."
                    rows={4}
                    className={errors.physicalExam ? "border-red-500" : ""}
                  />
                  {errors.physicalExam && (
                    <p className="text-sm text-red-500 mt-1">{errors.physicalExam}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="diagnosticHypotheses">Hipóteses Diagnósticas *</Label>
                  <Textarea
                    id="diagnosticHypotheses"
                    value={formData.diagnosticHypotheses}
                    onChange={(e) => handleInputChange('diagnosticHypotheses', e.target.value)}
                    placeholder="Liste as hipóteses diagnósticas..."
                    rows={3}
                    className={errors.diagnosticHypotheses ? "border-red-500" : ""}
                  />
                  {errors.diagnosticHypotheses && (
                    <p className="text-sm text-red-500 mt-1">{errors.diagnosticHypotheses}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="therapeuticPlan">Plano Terapêutico *</Label>
                    <Textarea
                      id="therapeuticPlan"
                      value={formData.therapeuticPlan}
                      onChange={(e) => handleInputChange('therapeuticPlan', e.target.value)}
                      placeholder="Descreva o plano de tratamento..."
                      rows={3}
                      className={errors.therapeuticPlan ? "border-red-500" : ""}
                    />
                    {errors.therapeuticPlan && (
                      <p className="text-sm text-red-500 mt-1">{errors.therapeuticPlan}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="generalRecommendations">Recomendações Gerais *</Label>
                    <Textarea
                      id="generalRecommendations"
                      value={formData.generalRecommendations}
                      onChange={(e) => handleInputChange('generalRecommendations', e.target.value)}
                      placeholder="Recomendações gerais para o paciente..."
                      rows={3}
                      className={errors.generalRecommendations ? "border-red-500" : ""}
                    />
                    {errors.generalRecommendations && (
                      <p className="text-sm text-red-500 mt-1">{errors.generalRecommendations}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Seção de Prescrições e Exames - Sistemas Integrados */}
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <h3 className="text-lg font-semibold text-purple-800 mb-4 flex items-center gap-2">
                <Pill className="h-5 w-5" />
                Prescrições e Exames
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Seção de Medicamentos e Prescrições */}
                <div>
                  <h4 className="flex items-center gap-2 mb-4 font-medium text-purple-700">
                    <Pill className="h-4 w-4 text-purple-500" />
                    Medicamentos e Prescrições
                  </h4>

                  {/* Formulário de Nova Prescrição */}
                  <div className="bg-white p-4 rounded-lg border border-purple-200 mb-4">
                    <h5 className="text-sm font-medium text-purple-600 mb-3">Nova Prescrição</h5>
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="prescriptionTitle" className="text-xs">Título da Receita *</Label>
                          <Input
                            id="prescriptionTitle"
                            placeholder="Ex: Prescrição para dor de cabeça"
                            value={prescriptionForm.title}
                            onChange={(e) => updatePrescriptionForm('title', e.target.value)}
                            className={`text-sm ${prescriptionErrors.title ? "border-red-500" : ""}`}
                          />
                          {prescriptionErrors.title && (
                            <p className="text-sm text-red-500 mt-1">{prescriptionErrors.title}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="doctorName" className="text-xs">
                            Nome d{activeUserProfileType === 'doctor' && activeUser?.gender === 'feminino' ? 'a Médica' : 'o Médico'} *
                          </Label>
                          <Input
                            id="doctorName"
                            placeholder="Dr. João Silva"
                            value={prescriptionForm.doctorName}
                            onChange={(e) => updatePrescriptionForm('doctorName', e.target.value)}
                            disabled={activeUserProfileType === 'doctor' && activeUser}
                            className={`text-sm ${prescriptionErrors.doctorName ? "border-red-500" : ""}`}
                          />
                          {prescriptionErrors.doctorName && (
                            <p className="text-sm text-red-500 mt-1">{prescriptionErrors.doctorName}</p>
                          )}
                          {activeUserProfileType === 'doctor' && activeUser && (
                            <p className="text-xs text-gray-500 mt-1">
                              {activeUser.gender === 'feminino' ? 'Médica selecionada' : 'Médico selecionado'} com base na sua sessão
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="prescriptionDate" className="text-xs">Data da Receita *</Label>
                          <Input
                            id="prescriptionDate"
                            type="date"
                            value={prescriptionForm.date}
                            onChange={(e) => updatePrescriptionForm('date', e.target.value)}
                            className="text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="prescriptionDescription" className="text-xs">Descrição *</Label>
                          <Textarea
                            id="prescriptionDescription"
                            placeholder="Descrição da prescrição..."
                            value={prescriptionForm.description}
                            onChange={(e) => updatePrescriptionForm('description', e.target.value)}
                            rows={14}
                            className={`text-sm ${prescriptionErrors.description ? "border-red-500" : ""}`}
                          />
                          {prescriptionErrors.description && (
                            <p className="text-sm text-red-500 mt-1">{prescriptionErrors.description}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={addPrescription}
                        disabled={isAddingPrescription}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        {isAddingPrescription ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                            Adicionando...
                          </>
                        ) : (
                          <>
                            <Plus className="h-3 w-3 mr-1" />
                            Adicionar Prescrição
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Lista de Prescrições Adicionadas */}
                  <div className="bg-white p-3 rounded-lg border border-purple-200">
                    <h5 className="text-sm font-medium text-purple-600 mb-2">Prescrições Desta Evolução</h5>
                    {prescriptions.length > 0 ? (
                      <div className="space-y-2">
                        {prescriptions.map((prescription) => (
                          <div key={prescription.id} className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h6 className="text-sm font-medium text-purple-800">{prescription.title}</h6>
                                <p className="text-xs text-purple-600 mt-1">{prescription.doctorName}</p>
                                <p className="text-xs text-gray-500 mt-1">Data: {new Date(prescription.date).toLocaleDateString('pt-BR')}</p>
                                {prescription.description && (
                                  <p className="text-xs text-gray-600 mt-2 line-clamp-2">{prescription.description}</p>
                                )}
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removePrescription(prescription.id)}
                                className="text-red-400 hover:text-red-600 ml-2"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500 text-center py-2">
                        Nenhuma prescrição adicionada ainda
                      </div>
                    )}
                  </div>

                  {/* Campo de Resumo */}
                  <div className="mt-3 space-y-2">
                    <Label htmlFor="prescribedMedications" className="text-xs">Resumo das Prescrições (opcional)</Label>
                    <Textarea
                      id="prescribedMedications"
                      value={formData.prescribedMedications}
                      onChange={(e) => handleInputChange('prescribedMedications', e.target.value)}
                      placeholder="Resumo geral das prescrições desta evolução..."
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                </div>

                {/* Seção de Exames e Solicitações */}
                <div>
                  <h4 className="flex items-center gap-2 mb-4 font-medium text-orange-700">
                    <TestTube className="h-4 w-4 text-orange-500" />
                    Exames e Solicitações
                  </h4>

                  {/* Formulário de Nova Requisição de Exame */}
                  <div className="bg-white p-4 rounded-lg border border-orange-200 mb-4">
                    <h5 className="text-sm font-medium text-orange-600 mb-3">Nova Requisição de Exame</h5>
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="examName" className="text-xs">Nome do Exame *</Label>
                          <Input
                            id="examName"
                            placeholder="Ex: Hemograma Completo"
                            value={examForm.examName}
                            onChange={(e) => updateExamForm('examName', e.target.value)}
                            className={`text-sm ${examErrors.examName ? "border-red-500" : ""}`}
                          />
                          {examErrors.examName && (
                            <p className="text-sm text-red-500 mt-1">{examErrors.examName}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="examCategory" className="text-xs">Categoria do Exame *</Label>
                          <Select value={examForm.category} onValueChange={(value) => updateExamForm('category', value)}>
                            <SelectTrigger className={`text-sm ${examErrors.category ? "border-red-500" : ""}`}>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="laboratorio">Exame de Laboratório</SelectItem>
                              <SelectItem value="imagem">Exame de Imagem</SelectItem>
                              <SelectItem value="cardiaco">Exame Cardíaco</SelectItem>
                              <SelectItem value="neurologico">Exame Neurológico</SelectItem>
                              <SelectItem value="outros">Outros</SelectItem>
                            </SelectContent>
                          </Select>
                          {examErrors.category && (
                            <p className="text-sm text-red-500 mt-1">{examErrors.category}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="clinicalIndication" className="text-xs">Indicação Clínica *</Label>
                          <Textarea
                            id="clinicalIndication"
                            placeholder="Motivo médico para solicitar este exame..."
                            value={examForm.clinicalIndication}
                            onChange={(e) => updateExamForm('clinicalIndication', e.target.value)}
                            rows={2}
                            className={`text-sm ${examErrors.clinicalIndication ? "border-red-500" : ""}`}
                          />
                          {examErrors.clinicalIndication && (
                            <p className="text-sm text-red-500 mt-1">{examErrors.clinicalIndication}</p>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-2">
                            <Label htmlFor="examUrgency" className="text-xs">Urgência</Label>
                            <Select value={examForm.urgency} onValueChange={(value) => updateExamForm('urgency', value)}>
                              <SelectTrigger className="text-sm">
                                <SelectValue placeholder="Normal" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="urgent">Urgente</SelectItem>
                                <SelectItem value="emergency">Emergência</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="validityDate" className="text-xs">Validade</Label>
                            <Input
                              id="validityDate"
                              type="date"
                              value={examForm.validityDate}
                              onChange={(e) => updateExamForm('validityDate', e.target.value)}
                              className="text-sm"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="specialInstructions" className="text-xs">Instruções Especiais</Label>
                          <Textarea
                            id="specialInstructions"
                            placeholder="Instruções especiais para o exame..."
                            value={examForm.specialInstructions}
                            onChange={(e) => updateExamForm('specialInstructions', e.target.value)}
                            rows={2}
                            className="text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="medicalObservations" className="text-xs">Observações Médicas</Label>
                          <Textarea
                            id="medicalObservations"
                            placeholder="Observações médicas sobre a requisição..."
                            value={examForm.medicalObservations}
                            onChange={(e) => updateExamForm('medicalObservations', e.target.value)}
                            rows={2}
                            className="text-sm"
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={addExamRequisition}
                        disabled={isAddingExamRequisition}
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                      >
                        {isAddingExamRequisition ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                            Adicionando...
                          </>
                        ) : (
                          <>
                            <Plus className="h-3 w-3 mr-1" />
                            Adicionar Requisição
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Lista de Requisições Adicionadas */}
                  <div className="bg-white p-3 rounded-lg border border-orange-200">
                    <h5 className="text-sm font-medium text-orange-600 mb-2">Requisições Desta Evolução</h5>
                    {examRequisitions.length > 0 ? (
                      <div className="space-y-2">
                        {examRequisitions.map((requisition) => (
                          <div key={requisition.id} className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h6 className="text-sm font-medium text-orange-800">{requisition.examName}</h6>
                                <p className="text-xs text-orange-600 mt-1">
                                  {requisition.category === 'laboratorio' ? 'Exame de Laboratório' :
                                   requisition.category === 'imagem' ? 'Exame de Imagem' :
                                   requisition.category === 'cardiaco' ? 'Exame Cardíaco' :
                                   requisition.category === 'neurologico' ? 'Exame Neurológico' : 'Outros'}
                                </p>
                                <p className="text-xs text-gray-600 mt-1 line-clamp-2">{requisition.clinicalIndication}</p>
                                {requisition.urgency !== 'normal' && (
                                  <span className={`inline-block px-2 py-1 text-xs rounded-full mt-2 ${
                                    requisition.urgency === 'urgent' ? 'bg-yellow-100 text-yellow-700' :
                                    requisition.urgency === 'emergency' ? 'bg-red-100 text-red-700' : ''
                                  }`}>
                                    {requisition.urgency === 'urgent' ? 'Urgente' : 'Emergência'}
                                  </span>
                                )}
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeExamRequisition(requisition.id)}
                                className="text-red-400 hover:text-red-600 ml-2"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500 text-center py-2">
                        Nenhuma requisição adicionada ainda
                      </div>
                    )}
                  </div>

                  {/* Campo de Resumo */}
                  <div className="mt-3 space-y-2">
                    <Label htmlFor="requestedExams" className="text-xs">Resumo das Requisições (opcional)</Label>
                    <Textarea
                      id="requestedExams"
                      value={formData.requestedExams}
                      onChange={(e) => handleInputChange('requestedExams', e.target.value)}
                      placeholder="Resumo geral das requisições desta evolução..."
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {evolution ? 'Atualizar Evolução' : 'Salvar Evolução'}
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