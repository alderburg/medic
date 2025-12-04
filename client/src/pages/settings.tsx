import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  User, 
  Plus, 
  Search, 
  UserPlus, 
  Trash2, 
  Bell, 
  Shield, 
  Settings as SettingsIcon, 
  Edit, 
  ChevronRight,
  Info,
  HelpCircle,
  LogOut,
  Share2,
  QrCode,
  Copy,
  Users,
  Trash,
  Camera,
  Eye,
  EyeOff,
  Pill,
  Calendar,
  FlaskConical,
  MessageCircle,
  Volume2,
  Key
} from "lucide-react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import BottomNavigation from "@/components/bottom-navigation";
import { DesktopLayout } from "@/components/desktop-layout";
import SettingsDesktop from "@/components/settings-desktop";
import DesktopPageHeader from "@/components/desktop-page-header";
import QRScanner from "@/components/qr-scanner";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { api } from "@/lib/api";
import { useLocation } from "wouter";

interface Patient {
  id: number;
  name: string;
  email: string;
  age?: number;
  photo?: string;
  profileType: 'patient' | 'caregiver' | 'doctor' | 'family' | 'nurse';
}

interface SharedAccess {
  id: number;
  patientId: number;
  caregiverEmail: string;
  caregiverName: string;
  caregiverProfileType: 'caregiver' | 'doctor' | 'family' | 'nurse';
  grantedAt: string;
  permissions: string[];
}

// Componente separado para evitar erro de hooks
function AccessiblePatientsList() {
  const { user } = useAuth();

  const { data: accessiblePatientsData = [], isLoading: accessiblePatientsLoading } = useQuery({
    queryKey: ["/api/caregiver/patients"],
    queryFn: async () => {
      const response = await api.get("/api/caregiver/patients");
      return response.data.patients;
    },
    enabled: user?.profileType !== 'patient',
  });

  if (accessiblePatientsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!accessiblePatientsData || accessiblePatientsData.length === 0) {
    return (
      <div className="text-center py-8">
        <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <p className="text-gray-500">Você ainda não tem acesso a nenhum paciente</p>
        <p className="text-sm text-gray-400 mt-2">
          Use um código de compartilhamento de um paciente para ter acesso aos dados médicos dele
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {accessiblePatientsData.map((patient: any) => (
        <Card key={patient.id} className="border border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12">
                <AvatarImage src={patient.photo || ""} alt={patient.name} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                  {patient.name?.charAt(0) || "P"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h4 className="font-medium text-slate-900">{patient.name}</h4>
                <p className="text-sm text-slate-500">{patient.email}</p>
                {patient.age && (
                  <p className="text-xs text-slate-400 mt-1">{patient.age} anos</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function Settings() {
  const { user, logout, refreshUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();

  // Se for desktop, usar o componente desktop
  if (!isMobile) {
    return <SettingsDesktop />;
  }

  // States for different settings sections
  const [activeSection, setActiveSection] = useState<'main' | 'account' | 'notifications' | 'patients' | 'help' | 'share' | 'security' | 'access-codes'>('main');

  // Logout confirmation dialog
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  // Form data for account editing
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    age: user?.age?.toString() || "",
    weight: user?.weight?.toString() || "",
    whatsapp: user?.whatsapp || "",
    profileType: user?.profileType || "patient",
    crm: user?.crm || "",
  });

  // Update formData when user data changes
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        age: user.age?.toString() || "",
        weight: user.weight?.toString() || "",
        whatsapp: user.whatsapp || "",
        profileType: user.profileType || "patient",
        crm: user.crm || "",
      });
    }
  }, [user]);

  // Edit profile mode
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // States for adding patients
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addPatientDialogOpen, setAddPatientDialogOpen] = useState(false);
  const [linkPatientDialogOpen, setLinkPatientDialogOpen] = useState(false);

  // New patient form data
  const [newPatientData, setNewPatientData] = useState({
    name: '',
    email: '',
    age: '',
    profileType: 'patient' as 'patient' | 'caregiver'
  });

  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState({
    medicationReminders: true,
    appointmentReminders: true,
    adherenceReports: true,
    caregiverAlerts: true,
    emailNotifications: true,
    pushNotifications: true,
    whatsappNotifications: true,
    soundNotifications: true,
  });

  // Medical data sharing states
  const [shareCode, setShareCode] = useState<string>('');
  const [qrCodeImage, setQrCodeImage] = useState<string>('');
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>(user?.photo || '');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Caregiver access code states
  const [manualAccessCode, setManualAccessCode] = useState<string>('');
  const [isUsingAccessCode, setIsUsingAccessCode] = useState(false);
  const [showQrScanner, setShowQrScanner] = useState(false);

  // Remove access confirmation modal states
  const [removeAccessModalOpen, setRemoveAccessModalOpen] = useState(false);
  const [accessToRemove, setAccessToRemove] = useState<{ id: number; name: string } | null>(null);

  // Function to play notification sound
  const playNotificationSound = () => {
    try {
      // Create audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Create oscillator for the sound
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      // Connect nodes
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Configure the sound (notification-like beep)
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // High pitch
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1); // Lower pitch

      // Configure volume envelope
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.02);
      gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.1);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);

      // Play the sound
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);

    } catch (error) {

    }
  };

  // Don't automatically load patients - they will be loaded only when needed for sharing features
  const patients: Patient[] = [];
  const patientsLoading = false;

  // Query to get shared access list (for patients)
  const { data: sharedAccessData = [], isLoading: sharedAccessLoading } = useQuery({
    queryKey: ["/api/patient/shared-access"],
    queryFn: async () => {
      const response = await api.get("/api/patient/shared-access");
      return response.data;
    },
    enabled: user?.profileType === 'patient',
  });

  // Photo upload functions
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handlePhotoUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione apenas arquivos de imagem.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "A imagem deve ter no máximo 5MB.",
        variant: "destructive",
      });
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      setPhotoFile(file);
      setPhotoPreview(base64);
      setFormData(prev => ({ ...prev, photo: base64 }));
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao processar a imagem. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handlePhotoClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handlePhotoUpload(file);
      }
    };
    input.click();
  };

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: any) => {
      const response = await api.put(`/api/users/${user?.id}`, profileData);
      return response.data;
    },
    onSuccess: async (data) => {
      // Atualizar o context de autenticação
      await refreshUser();

      // Também invalidar para recarregar
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });

      setIsEditingProfile(false);
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso.",
      });
    },
    onError: (error) => {

      toast({
        title: "Erro",
        description: "Erro ao atualizar perfil. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Estados para validação de senha e erros
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);

  // Função para validar força da senha (mesma do cadastro)
  const validatePassword = (password: string) => {
    const minLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return {
      minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSpecialChar,
      isStrong: minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar
    };
  };

  const newPasswordStrength = validatePassword(passwordData.newPassword);

  // Função para limpar erro quando usuário digitar
  const clearPasswordError = (field: string) => {
    if (passwordErrors[field]) {
      setPasswordErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  // Função para validar formulário de senha
  const validatePasswordForm = () => {
    const newErrors: Record<string, string> = {};

    if (!passwordData.currentPassword.trim()) {
      newErrors.currentPassword = "Senha atual é obrigatória";
    }

    if (!passwordData.newPassword.trim()) {
      newErrors.newPassword = "Nova senha é obrigatória";
    } else if (!newPasswordStrength.isStrong) {
      newErrors.newPassword = "Senha deve ter pelo menos 8 caracteres, incluindo maiúsculas, minúsculas, números e símbolos";
    }

    if (!passwordData.confirmPassword.trim()) {
      newErrors.confirmPassword = "Confirmação de senha é obrigatória";
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = "As senhas não coincidem";
    }

    setPasswordErrors(newErrors);

    // Se há erros, mostrar toast informativo
    if (Object.keys(newErrors).length > 0) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos destacados em vermelho para continuar.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (passwordData: { currentPassword: string; newPassword: string }) => {
      const response = await api.put(`/api/users/${user?.id}/change-password`, passwordData);
      return response.data;
    },
    onSuccess: () => {
      setShowChangePassword(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setPasswordErrors({});
      toast({
        title: "Senha alterada",
        description: "Sua senha foi alterada com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao alterar senha",
        description: error.response?.data?.message || "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  const handleChangePassword = async () => {
    // Validar formulário
    if (!validatePasswordForm()) {
      return;
    }

    changePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword
    });
  };

  const handleUpdateProfile = async () => {
    // Validação dos campos obrigatórios
    if (!formData.name.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "O nome é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.age || parseInt(formData.age) < 1 || parseInt(formData.age) > 120) {
      toast({
        title: "Campo obrigatório",
        description: "A idade é obrigatória e deve estar entre 1 e 120 anos.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.weight || parseFloat(formData.weight) < 1 || parseFloat(formData.weight) > 500) {
      toast({
        title: "Campo obrigatório",
        description: "O peso é obrigatório e deve estar entre 1 e 500 kg.",
        variant: "destructive",
      });
      return;
    }

    const profileData = {
      ...formData,
      age: formData.age ? parseInt(formData.age) : undefined,
      weight: formData.weight ? parseFloat(formData.weight) : undefined,
      photo: photoPreview || user?.photo || null,
    };

    updateProfileMutation.mutate(profileData);
  };

  // Search for existing users by email
  const searchUsersMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await api.get(`/api/users/search?email=${encodeURIComponent(email)}`);
      return response.data;
    },
    onSuccess: (data) => {
      setSearchResults(data.users || []);
      setIsSearching(false);
    },
    onError: () => {
      setSearchResults([]);
      setIsSearching(false);
      toast({
        title: "Erro na busca",
        description: "Erro ao buscar usuários. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Link existing patient to caregiver
  const linkPatientMutation = useMutation({
    mutationFn: async (patientId: number) => {
      const response = await api.post("/api/caregiver/link-patient", { patientId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/caregiver/patients"] });
      setLinkPatientDialogOpen(false);
      setSearchEmail('');
      setSearchResults([]);
      toast({
        title: "Paciente vinculado",
        description: "O paciente foi vinculado com sucesso.",
      });
    },
  });

  // Add new patient
  const addPatientMutation = useMutation({
    mutationFn: async (patientData: any) => {
      const response = await api.post("/api/caregiver/add-patient", patientData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/caregiver/patients"] });
      setAddPatientDialogOpen(false);
      setNewPatientData({ name: '', email: '', age: '', profileType: 'patient' });
      toast({
        title: "Paciente cadastrado",
        description: "O novo paciente foi cadastrado e vinculado com sucesso.",
      });
    },
  });

  // Remove patient link
  const removePatientMutation = useMutation({
    mutationFn: async (patientId: number) => {
      const response = await api.delete(`/api/caregiver/patients/${patientId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/caregiver/patients"] });
      toast({
        title: "Paciente removido",
        description: "O paciente foi removido da sua lista.",
      });
    },
  });

  // Save notification settings
  const saveNotificationMutation = useMutation({
    mutationFn: async (settings: any) => {
      const response = await api.put('/api/user/notification-settings', settings);
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "Configurações salvas",
        description: "Suas configurações de notificação foram atualizadas.",
      });
      // Return to main settings screen after saving
      setActiveSection('main');
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao salvar configurações. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleSearchUsers = () => {
    if (!searchEmail.trim()) {
      toast({
        title: "Email obrigatório",
        description: "Digite um email para buscar.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    searchUsersMutation.mutate(searchEmail.trim());
  };

  const handleSaveNotificationSettings = () => {
    saveNotificationMutation.mutate(notificationSettings);
  };

  // Generate sharing code and QR code
  const generateSharingCode = async () => {
    setIsGeneratingCode(true);
    try {
      const response = await api.post('/api/patient/generate-share-code');
      const newCode = response.data.shareCode;
      setShareCode(newCode);

      // Generate QR code
      const qrCodeDataUrl = await QRCode.toDataURL(newCode, {
        width: 256,
        margin: 2,
        color: {
          dark: '#334155',
          light: '#ffffff',
        },
      });
      setQrCodeImage(qrCodeDataUrl);

      toast({
        title: "Código gerado",
        description: "Novo código de compartilhamento criado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível gerar o código de compartilhamento.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingCode(false);
    }
  };

  // Copy share code to clipboard
  const copyShareCode = async () => {
    try {
      await navigator.clipboard.writeText(shareCode);
      toast({
        title: "Código copiado",
        description: "Código de compartilhamento copiado para a área de transferência.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível copiar o código.",
        variant: "destructive",
      });
    }
  };

  // Remove access for a caregiver
  const removeAccessMutation = useMutation({
    mutationFn: async (accessId: number) => {
      const response = await api.delete(`/api/patient/shared-access/${accessId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patient/shared-access"] });
      setRemoveAccessModalOpen(false);
      setAccessToRemove(null);
      toast({
        title: "Acesso removido",
        description: "O acesso aos seus dados médicos foi removido.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível remover o acesso.",
        variant: "destructive",
      });
    },
  });

  // Handle remove access confirmation
  const handleRemoveAccess = (accessId: number, caregiverName: string) => {
    setAccessToRemove({ id: accessId, name: caregiverName });
    setRemoveAccessModalOpen(true);
  };

  // Confirm remove access
  const confirmRemoveAccess = () => {
    if (accessToRemove) {
      removeAccessMutation.mutate(accessToRemove.id);
    }
  };

  // Use access code (for caregivers)
  const useAccessCodeMutation = useMutation({
    mutationFn: async (accessCode: string) => {
      const response = await api.post('/api/caregiver/use-share-code', { shareCode: accessCode });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/caregiver/patients"] });
      setManualAccessCode('');
      setShowQrScanner(false);
      toast({
        title: "Acesso concedido",
        description: `Agora você tem acesso aos dados médicos de ${data.patient?.name || 'paciente'}.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.response?.data?.message || "Código de acesso inválido ou expirado.",
        variant: "destructive",
      });
    },
  });

  // Handle manual access code input
  const handleUseManualCode = () => {
    if (!manualAccessCode.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, insira um código de acesso.",
        variant: "destructive",
      });
      return;
    }
    setIsUsingAccessCode(true);
    useAccessCodeMutation.mutate(manualAccessCode.trim());
  };

  // Handle QR code scan result
  const handleQrCodeScan = (result: string) => {
    setManualAccessCode(result);
    setShowQrScanner(false);
    setIsUsingAccessCode(true);
    useAccessCodeMutation.mutate(result);
  };

  // Handle QR scanner close
  const handleQrScannerClose = () => {
    setShowQrScanner(false);
  };

  const handleAddNewPatient = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPatientData.name || !newPatientData.email) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e email são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    addPatientMutation.mutate({
      ...newPatientData,
      age: newPatientData.age ? parseInt(newPatientData.age) : undefined
    });
  };

  const handleLinkPatient = (patient: Patient) => {
    linkPatientMutation.mutate(patient.id);
  };

  const renderMainMenu = () => (
    <div className="space-y-6">
      {/* User Profile Card */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="w-20 h-20 ring-4 ring-white shadow-lg">
                <AvatarImage src={user?.photo || ""} alt={user?.name} />
                <AvatarFallback className="text-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                  {user?.name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-slate-900">{user?.name}</h2>
              <p className="text-slate-700 font-medium">{user?.email}</p>
              <div className="flex items-center gap-3 mt-3">
                {user?.age && (
                  <span className="px-2 py-1 bg-white/70 rounded-full text-xs font-medium text-slate-700">
                    {user.age} anos
                  </span>
                )}
                <Badge 
                  variant={user?.profileType === 'patient' ? 'default' : 'secondary'}
                  className="font-medium">
                  {user?.profileType === 'patient' ? 'Paciente' :
                   user?.profileType === 'caregiver' ? 'Cuidador(a)' :
                   user?.profileType === 'doctor' ? 'Médico(a)' :
                   user?.profileType === 'family' ? 'Familiar' :
                   user?.profileType === 'nurse' ? 'Enfermagem' :
                   'Usuário'}
                </Badge>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="bg-white/70 hover:bg-white/90 shadow-sm"
              onClick={() => setActiveSection('account')}
            >
              <Edit className="w-5 h-5 text-slate-700" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Settings Menu */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider px-1">
          Configurações
        </h3>

        <div className="space-y-2">
          <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer">
            <CardContent 
              className="p-0"
              onClick={() => setActiveSection('account')}
            >
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center shadow-sm">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Dados da Conta</p>
                    <p className="text-sm text-slate-500">Editar perfil e informações pessoais</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>
            </CardContent>
          </Card>

          {user?.profileType === 'patient' && (
            <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer">
              <CardContent 
                className="p-0"
                onClick={() => setActiveSection('share')}
              >
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-teal-100 to-teal-200 rounded-xl flex items-center justify-center shadow-sm">
                      <Share2 className="w-6 h-6 text-teal-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Compartilhar Dados Médicos</p>
                      <p className="text-sm text-slate-500">Permitir acesso aos seus dados</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer">
            <CardContent 
              className="p-0"
              onClick={() => setActiveSection('security')}
            >
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-red-200 rounded-xl flex items-center justify-center shadow-sm">
                    <Shield className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Segurança</p>
                    <p className="text-sm text-slate-500">Senha e configurações de privacidade</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer">
            <CardContent 
              className="p-0"
              onClick={() => setActiveSection('notifications')}
            >
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl flex items-center justify-center shadow-sm">
                    <Bell className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Notificações</p>
                    <p className="text-sm text-slate-500">Configurar alertas e lembretes</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>
            </CardContent>
          </Card>



          {user?.profileType !== 'patient' && (
            <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer">
              <CardContent 
                className="p-0"
                onClick={() => setActiveSection('access-codes')}
              >
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-xl flex items-center justify-center shadow-sm">
                      <QrCode className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Usar Código de Acesso</p>
                      <p className="text-sm text-slate-500">Escanear QR ou inserir código do paciente</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer">
            <CardContent 
              className="p-0"
              onClick={() => setActiveSection('help')}
            >
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center shadow-sm">
                    <HelpCircle className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Ajuda e Suporte</p>
                    <p className="text-sm text-slate-500">Informações e contato</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="pt-4">
          <Card className="border-red-200 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer">
            <CardContent 
              className="p-0"
              onClick={() => setLogoutDialogOpen(true)}
            >
              <div className="flex items-center gap-4 p-4">
                <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-red-200 rounded-xl flex items-center justify-center shadow-sm">
                  <LogOut className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="font-semibold text-red-700">Sair da Conta</p>
                  <p className="text-sm text-red-500">Fazer logout do aplicativo</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  return (
    <div className="mobile-container">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => activeSection === 'main' ? setLocation('/home') : setActiveSection('main')}
              className="hover:bg-slate-100 text-slate-700"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-slate-800">
                {activeSection === 'main' && 'Configurações'}
                {activeSection === 'account' && 'Dados da Conta'}
                {activeSection === 'notifications' && 'Notificações'}
                {activeSection === 'patients' && 'Gerenciar Pacientes'}
                {activeSection === 'help' && 'Ajuda e Suporte'}
                {activeSection === 'security' && 'Segurança'}
                {activeSection === 'share' && 'Compartilhar Dados Médicos'}
                {activeSection === 'access-codes' && 'Usar Código de Acesso'}
              </h1>
              <p className="text-sm text-slate-600">
                {activeSection === 'main' && 'Gerencie suas preferências e configurações'}
                {activeSection === 'account' && 'Edite suas informações pessoais'}
                {activeSection === 'notifications' && 'Configure como receber alertas e lembretes'}
                {activeSection === 'patients' && 'Adicione e remova pacientes vinculados'}
                {activeSection === 'help' && 'Obtenha ajuda e suporte técnico'}
                {activeSection === 'security' && 'Altere sua senha e configure segurança'}
                {activeSection === 'share' && 'Compartilhe seus dados médicos'}
                {activeSection === 'access-codes' && 'Use códigos para acessar dados de outros pacientes'}
              </p>
            </div>
          </div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${
            activeSection === 'main' ? 'bg-gradient-to-br from-slate-100 to-slate-200' :
            activeSection === 'account' ? 'bg-gradient-to-br from-blue-100 to-blue-200' :
            activeSection === 'notifications' ? 'bg-gradient-to-br from-orange-100 to-orange-200' :
            activeSection === 'patients' ? 'bg-gradient-to-br from-green-100 to-green-200' :
            activeSection === 'security' ? 'bg-gradient-to-br from-red-100 to-red-200' :
            activeSection === 'share' ? 'bg-gradient-to-br from-teal-100 to-teal-200' :
            activeSection === 'access-codes' ? 'bg-gradient-to-br from-indigo-100 to-indigo-200' :
            activeSection === 'help' ? 'bg-gradient-to-br from-purple-100 to-purple-200' :
            'bg-gradient-to-br from-slate-100 to-slate-200'
          }`}>
            {activeSection === 'main' && <SettingsIcon className="w-4 h-4 text-slate-600" />}
            {activeSection === 'account' && <User className="w-4 h-4 text-blue-600" />}
            {activeSection === 'notifications' && <Bell className="w-4 h-4 text-orange-600" />}
            {activeSection === 'patients' && <Users className="w-4 h-4 text-green-600" />}
            {activeSection === 'security' && <Shield className="w-4 h-4 text-red-600" />}
            {activeSection === 'share' && <Share2 className="w-4 h-4 text-teal-600" />}
            {activeSection === 'access-codes' && <Key className="w-4 h-4 text-indigo-600" />}
            {activeSection === 'help' && <HelpCircle className="w-4 h-4 text-purple-600" />}
          </div>
        </div>
      </header>
      <main className="pb-36 px-4 py-6 bg-slate-50 min-h-screen">
        {activeSection === 'main' && renderMainMenu()}

        {activeSection === 'account' && (
          <div className="space-y-6">
            {/* Profile Photo Section */}
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className={`relative inline-block ${isEditingProfile ? 'cursor-pointer' : ''}`} onClick={isEditingProfile ? handlePhotoClick : undefined}>
                    <Avatar className={`w-24 h-24 ring-4 shadow-lg transition-all ${isEditingProfile ? 'ring-blue-200 hover:ring-blue-300' : 'ring-blue-100'}`}>
                      <AvatarImage src={photoPreview || user?.photo || ""} alt={user?.name} />
                      <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                        {user?.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    {isEditingProfile && (
                      <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-full border-2 border-blue-100 flex items-center justify-center shadow-md hover:bg-blue-50 transition-colors">
                        <Camera className="w-4 h-4 text-blue-600" />
                      </div>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 mt-4">{user?.name}</h3>
                  <p className="text-slate-600">{user?.email}</p>
                </div>
              </CardContent>
            </Card>

            {/* Personal Information */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  Informações Pessoais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium text-slate-700">
                      Nome Completo {isEditingProfile && <span className="text-red-500">*</span>}
                    </Label>
                    <Input 
                      id="name" 
                      value={isEditingProfile ? formData.name : user?.name || ""} 
                      onChange={isEditingProfile ? (e) => setFormData(prev => ({ ...prev, name: e.target.value })) : undefined}
                      readOnly={!isEditingProfile}
                      required={isEditingProfile}
                      className={isEditingProfile ? "border-blue-300 focus:border-blue-500" : "bg-slate-50 border-slate-200 text-slate-800 font-medium"}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-slate-700">Email</Label>
                    <Input 
                      id="email" 
                      value={user?.email || ""} 
                      readOnly
                      className="bg-slate-50 border-slate-200 text-slate-800 font-medium"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="whatsapp" className="text-sm font-medium text-slate-700">WhatsApp</Label>
                    <Input 
                      id="whatsapp" 
                      value={isEditingProfile ? formData.whatsapp : user?.whatsapp || "Não informado"} 
                      onChange={isEditingProfile ? (e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value })) : undefined}
                      readOnly={!isEditingProfile}
                      placeholder={isEditingProfile ? "(11) 99999-9999" : undefined}
                      className={isEditingProfile ? "border-blue-300 focus:border-blue-500" : "bg-slate-50 border-slate-200 text-slate-800 font-medium"}
                    />
                  </div>

                  {user?.profileType === 'doctor' && (
                    <div className="space-y-2">
                      <Label htmlFor="crm" className="text-sm font-medium text-slate-700">CRM</Label>
                      <Input 
                        id="crm" 
                        value={isEditingProfile ? formData.crm : user?.crm || "Não informado"} 
                        onChange={isEditingProfile ? (e) => setFormData(prev => ({ ...prev, crm: e.target.value })) : undefined}
                        readOnly={!isEditingProfile}
                        placeholder={isEditingProfile ? "12345-SP" : undefined}
                        className={isEditingProfile ? "border-blue-300 focus:border-blue-500" : "bg-slate-50 border-slate-200 text-slate-800 font-medium"}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="age" className="text-sm font-medium text-slate-700">
                        Idade {isEditingProfile && <span className="text-red-500">*</span>}
                      </Label>
                      <Input 
                        id="age" 
                        type={isEditingProfile ? "number" : "text"}
                        value={isEditingProfile ? formData.age : user?.age?.toString() || "Não informado"} 
                        onChange={isEditingProfile ? (e) => setFormData(prev => ({ ...prev, age: e.target.value })) : undefined}
                        readOnly={!isEditingProfile}
                        required={isEditingProfile}
                        min={isEditingProfile ? "1" : undefined}
                        max={isEditingProfile ? "120" : undefined}
                        className={isEditingProfile ? "border-blue-300 focus:border-blue-500" : "bg-slate-50 border-slate-200 text-slate-800 font-medium"}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="weight" className="text-sm font-medium text-slate-700">
                        Peso (kg) {isEditingProfile && <span className="text-red-500">*</span>}
                      </Label>
                      <Input 
                        id="weight" 
                        type={isEditingProfile ? "number" : "text"}
                        step={isEditingProfile ? "0.1" : undefined}
                        value={isEditingProfile ? (formData.weight || "") : (user?.weight?.toString() || "Não informado")} 
                        onChange={isEditingProfile ? (e) => setFormData(prev => ({ ...prev, weight: e.target.value })) : undefined}
                        readOnly={!isEditingProfile}
                        required={isEditingProfile}
                        min={isEditingProfile ? "1" : undefined}
                        max={isEditingProfile ? "500" : undefined}
                        className={isEditingProfile ? "border-blue-300 focus:border-blue-500" : "bg-slate-50 border-slate-200 text-slate-800 font-medium"}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="profileType" className="text-sm font-medium text-slate-700">Tipo de Perfil</Label>
                    <Input 
                      id="profileType" 
                      value={
                        user?.profileType === 'patient' ? 'Paciente' :
                        user?.profileType === 'caregiver' ? 'Cuidador(a)' :
                        user?.profileType === 'doctor' ? 'Médico(a)' :
                        user?.profileType === 'family' ? 'Familiar' :
                        user?.profileType === 'nurse' ? 'Enfermagem' :
                        'Não definido'
                      } 
                      readOnly 
                      className="bg-slate-50 border-slate-200 text-slate-800 font-medium"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  {isEditingProfile ? (
                    <div className="flex gap-3">
                      <Button 
                        className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-lg"
                        onClick={handleUpdateProfile}
                        disabled={updateProfileMutation.isPending}
                      >
                        {updateProfileMutation.isPending ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Salvando...
                          </div>
                        ) : (
                          <>
                            <Edit className="w-4 h-4 mr-2" />
                            Salvar Alterações
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setIsEditingProfile(false);
                          setPhotoPreview(user?.photo || '');
                          // Reset form data to current user data
                          if (user) {
                            setFormData({
                              name: user.name || "",
                              email: user.email || "",
                              age: user.age?.toString() || "",
                              weight: user.weight?.toString() || "",
                              whatsapp: user.whatsapp || "",
                              profileType: user.profileType || "patient",
                              crm: user.crm || "",
                            });
                          }
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-lg"
                      onClick={() => setIsEditingProfile(true)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Editar Informações
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>


          </div>
        )}

        {activeSection === 'notifications' && (
          <div className="space-y-6">
            {/* Medical Notifications */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg flex items-center justify-center">
                    <Bell className="w-4 h-4 text-orange-600" />
                  </div>
                  Notificações Médicas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Pill className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">Lembretes de Medicação</p>
                        <p className="text-sm text-slate-600">Receber notificações dos horários dos remédios</p>
                      </div>
                    </div>
                    <Switch
                      checked={notificationSettings.medicationReminders}
                      onCheckedChange={(checked) => 
                        setNotificationSettings(prev => ({ ...prev, medicationReminders: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">Lembretes de Consultas</p>
                        <p className="text-sm text-slate-600">Receber notificações de consultas agendadas</p>
                      </div>
                    </div>
                    <Switch
                      checked={notificationSettings.appointmentReminders}
                      onCheckedChange={(checked) => 
                        setNotificationSettings(prev => ({ ...prev, appointmentReminders: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <FlaskConical className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">Lembretes de Exames</p>
                        <p className="text-sm text-slate-600">Receber notificações de exames agendados</p>
                      </div>
                    </div>
                    <Switch
                      checked={notificationSettings.adherenceReports}
                      onCheckedChange={(checked) => 
                        setNotificationSettings(prev => ({ ...prev, adherenceReports: checked }))
                      }
                    />
                  </div>

                  {user?.profileType === 'caregiver' && (
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                          <UserPlus className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">Alertas para Cuidadores</p>
                          <p className="text-sm text-slate-600">Notificar sobre medicações perdidas</p>
                        </div>
                      </div>
                      <Switch
                        checked={notificationSettings.caregiverAlerts}
                        onCheckedChange={(checked) => 
                          setNotificationSettings(prev => ({ ...prev, caregiverAlerts: checked }))
                        }
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Communication Preferences */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-lg flex items-center justify-center">
                    <SettingsIcon className="w-4 h-4 text-indigo-600" />
                  </div>
                  Preferências de Comunicação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Bell className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Notificações por Email</p>
                      <p className="text-sm text-slate-600">Receber notificações no email</p>
                    </div>
                  </div>
                  <Switch
                    checked={notificationSettings.emailNotifications}
                    onCheckedChange={(checked) => 
                      setNotificationSettings(prev => ({ ...prev, emailNotifications: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Bell className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Notificações Push</p>
                      <p className="text-sm text-slate-600">Receber notificações no dispositivo</p>
                    </div>
                  </div>
                  <Switch
                    checked={notificationSettings.pushNotifications}
                    onCheckedChange={(checked) => 
                      setNotificationSettings(prev => ({ ...prev, pushNotifications: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Notificações por WhatsApp</p>
                      <p className="text-sm text-slate-600">Receber notificações no WhatsApp</p>
                    </div>
                  </div>
                  <Switch
                    checked={notificationSettings.whatsappNotifications}
                    onCheckedChange={(checked) =>
                      setNotificationSettings(prev => ({ ...prev, whatsappNotifications: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <Volume2 className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Ativar Som de Notificação</p>
                      <p className="text-sm text-slate-600">Reproduzir som ao receber notificações</p>
                    </div>
                  </div>
                  <Switch
                    checked={notificationSettings.soundNotifications}
                    onCheckedChange={(checked) => {
                      setNotificationSettings(prev => ({ ...prev, soundNotifications: checked }));
                      // Play notification sound when enabling
                      if (checked) {
                        playNotificationSound();
                      }
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="pt-2">
              <Button 
                onClick={handleSaveNotificationSettings}
                disabled={saveNotificationMutation.isPending}
                className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-medium shadow-lg h-12"
              >
                {saveNotificationMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <Bell className="w-4 h-4 mr-2" />
                    Salvar Configurações
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {activeSection === 'patients' && user?.profileType !== 'patient' && (
          <div className="space-y-6">
            {/* Patients Access List */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  Pacientes que Posso Cuidar
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patientsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : patients.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">Nenhum paciente vinculado</p>
                    <p className="text-sm text-gray-400 mt-2">
                      Use códigos de acesso para se conectar com pacientes
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {patients.map((patient) => (
                      <div key={patient.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={patient.photo || ""} alt={patient.name} />
                            <AvatarFallback>{patient.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-medium text-slate-900">{patient.name}</h4>
                            <p className="text-sm text-slate-600">{patient.email}</p>
                            {patient.age && (
                              <p className="text-xs text-slate-500">{patient.age} anos</p>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-blue-600 border-blue-200">
                          Paciente
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                    <Info className="w-4 h-4 text-blue-600" />
                  </div>
                  Como funciona?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm mt-0.5">
                      1
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Peça ao paciente para gerar um código</p>
                      <p className="text-sm text-slate-600">O paciente deve ir em Configurações → Compartilhar Dados Médicos e gerar um QR code.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm mt-0.5">
                      2
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Escaneie ou digite o código</p>
                      <p className="text-sm text-slate-600">Use o scanner QR ou copie e cole o código de compartilhamento fornecido pelo paciente.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm mt-0.5">
                      3
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Acesse os dados médicos</p>
                      <p className="text-sm text-slate-600">Após a confirmação, você terá acesso aos medicamentos, consultas, exames e relatórios do paciente.</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">Importante</p>
                      <p className="text-xs text-amber-700 mt-1">
                        Os códigos de compartilhamento são de uso único e expiram após serem utilizados. 
                        O paciente precisará gerar um novo código para cada novo cuidador.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeSection === 'patients-old' && user?.profileType === 'caregiver' && (
          <div className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Gerenciar Pacientes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="h-20 flex-col gap-2"
                    onClick={() => setLinkPatientDialogOpen(true)}
                  >
                    <Search className="w-6 h-6" />
                    <span className="text-sm">Vincular Existente</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-20 flex-col gap-2"
                    onClick={() => setAddPatientDialogOpen(true)}
                  >
                    <Plus className="w-6 h-6" />
                    <span className="text-sm">Cadastrar Novo</span>
                  </Button>
                </div>

                {patientsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : patients.length === 0 ? (
                  <div className="text-center py-8">
                    <User className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">Nenhum paciente vinculado</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Array.isArray(patients) ? patients.map((patient) => (
                      <Card key={patient.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-12 h-12">
                                <AvatarImage src={patient.photo || ""} alt={patient.name} />
                                <AvatarFallback>{patient.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <h4 className="font-medium">{patient.name}</h4>
                                <p className="text-sm text-gray-500">{patient.email}</p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removePatientMutation.mutate(patient.id)}
                              disabled={removePatientMutation.isPending}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )) : null}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeSection === 'security' && (
          <div className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="w-8 h-8 bg-gradient-to-br from-red-100 to-red-200 rounded-lg flex items-center justify-center">
                    <Shield className="w-4 h-4 text-red-600" />
                  </div>
                  Segurança
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-between h-12 text-left hover:bg-slate-50 border-slate-200 shadow-sm"
                  onClick={() => setShowChangePassword(!showChangePassword)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                      <Shield className="w-4 h-4 text-slate-600" />
                    </div>
                    <span className="font-medium">Alterar Senha</span>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${showChangePassword ? 'rotate-90' : ''}`} />
                </Button>

                {showChangePassword && (
                  <div className="space-y-4 mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword" className="text-sm font-medium text-slate-700">
                        Senha Atual <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="currentPassword"
                          type={showCurrentPassword ? "text" : "password"}
                          value={passwordData.currentPassword}
                          onChange={(e) => {
                            setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }));
                            clearPasswordError('currentPassword');
                          }}
                          placeholder="Digite sua senha atual"
                          className={passwordErrors.currentPassword ? "border-red-500 focus:border-red-500" : "border-slate-300 focus:border-blue-500"}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        >
                          {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                      {passwordErrors.currentPassword && (
                        <p className="text-red-500 text-sm">{passwordErrors.currentPassword}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="newPassword" className="text-sm font-medium text-slate-700">
                        Nova Senha <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="newPassword"
                          type={showNewPassword ? "text" : "password"}
                          value={passwordData.newPassword}
                          onChange={(e) => {
                            setPasswordData(prev => ({ ...prev, newPassword: e.target.value }));
                            clearPasswordError('newPassword');
                          }}
                          placeholder="Senha forte obrigatória"
                          className={passwordErrors.newPassword ? "border-red-500 focus:border-red-500" : "border-slate-300 focus:border-blue-500"}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                      {passwordErrors.newPassword && (
                        <p className="text-red-500 text-sm">{passwordErrors.newPassword}</p>
                      )}

                      {/* Indicador de força da senha */}
                      {passwordData.newPassword && (
                        <div className="space-y-2">
                          <div className="flex space-x-1">
                            <div className={`h-1 rounded flex-1 ${newPasswordStrength.minLength ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                            <div className={`h-1 rounded flex-1 ${newPasswordStrength.hasUpperCase ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                            <div className={`h-1 rounded flex-1 ${newPasswordStrength.hasLowerCase ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                            <div className={`h-1 rounded flex-1 ${newPasswordStrength.hasNumbers ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                            <div className={`h-1 rounded flex-1 ${newPasswordStrength.hasSpecialChar ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                          </div>
                          <div className={`text-xs ${newPasswordStrength.isStrong ? 'text-green-600' : 'text-gray-600'}`}>
                            {newPasswordStrength.isStrong ? (
                              "✓ Senha forte criada com sucesso!"
                            ) : (
                              <>
                                Faltam: {[
                                  !newPasswordStrength.minLength && "8 caracteres",
                                  !newPasswordStrength.hasUpperCase && "maiúscula",
                                  !newPasswordStrength.hasLowerCase && "minúscula", 
                                  !newPasswordStrength.hasNumbers && "número",
                                  !newPasswordStrength.hasSpecialChar && "símbolo"
                                ].filter(Boolean).join(", ")}
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmNewPassword" className="text-sm font-medium text-slate-700">
                        Confirmar Nova Senha <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="confirmNewPassword"
                          type={showConfirmNewPassword ? "text" : "password"}
                          value={passwordData.confirmPassword}
                          onChange={(e) => {
                            setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }));
                            clearPasswordError('confirmPassword');
                          }}
                          placeholder="Confirme sua nova senha"
                          className={passwordErrors.confirmPassword ? "border-red-500 focus:border-red-500" : "border-slate-300 focus:border-blue-500"}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                          onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                        >
                          {showConfirmNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                      {passwordErrors.confirmPassword && (
                        <p className="text-red-500 text-sm">{passwordErrors.confirmPassword}</p>
                      )}
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button 
                        className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium shadow-lg"
                        onClick={handleChangePassword}
                        disabled={changePasswordMutation.isPending}
                      >
                        {changePasswordMutation.isPending ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Salvando...
                          </div>
                        ) : (
                          <>
                            <Shield className="w-4 h-4 mr-2" />
                            Salvar Nova Senha
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setShowChangePassword(false);
                          setPasswordData({
                            currentPassword: '',
                            newPassword: '',
                            confirmPassword: ''
                          });
                          setPasswordErrors({});
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeSection === 'share' && user?.profileType === 'patient' && (
          <div className="space-y-6">
            {/* QR Code Section */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="w-8 h-8 bg-gradient-to-br from-teal-100 to-teal-200 rounded-lg flex items-center justify-center">
                    <QrCode className="w-4 h-4 text-teal-600" />
                  </div>
                  Código de Compartilhamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <p className="text-sm text-slate-600 mb-4">
                    Gere um código QR para compartilhar seus dados médicos de forma segura.
                  </p>

                  {qrCodeImage ? (
                    <div className="space-y-4">
                      <div className="bg-white p-4 rounded-xl border-2 border-slate-200 inline-block">
                        <img 
                          src={qrCodeImage} 
                          alt="QR Code para compartilhamento" 
                          className="w-64 h-64 mx-auto"
                        />
                      </div>

                      {shareCode && (
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <p className="text-sm font-medium text-slate-700 mb-2">Código para copiar:</p>
                          <div className="flex items-center gap-2">
                            <Input
                              value={shareCode}
                              readOnly
                              className="font-mono text-sm bg-white"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={copyShareCode}
                              className="flex-shrink-0"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-8">
                      <QrCode className="w-16 h-16 mx-auto text-slate-400 mb-4" />
                      <p className="text-slate-500 mb-4">Nenhum código de compartilhamento ativo</p>
                    </div>
                  )}

                  <Button 
                    onClick={generateSharingCode}
                    disabled={isGeneratingCode}
                    className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-medium shadow-lg h-12"
                  >
                    {isGeneratingCode ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Gerando...
                      </>
                    ) : (
                      <>
                        <QrCode className="w-4 h-4 mr-2" />
                        Gerar Novo Código
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Shared Access List */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  Usuários com Acesso
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sharedAccessLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : sharedAccessData.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">Nenhum usuário tem acesso aos seus dados</p>
                    <p className="text-sm text-gray-400 mt-2">
                      Compartilhe o código QR para permitir que cuidadores vejam seus dados médicos
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Array.isArray(sharedAccessData) ? sharedAccessData.map((access) => (
                      <Card key={access.id} className="border border-slate-200">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <User className="w-5 h-5 text-blue-600" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium text-slate-900">{access.caregiverName}</h4>
                                  <Badge 
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {access.caregiverProfileType === 'caregiver' ? 'Cuidador(a)' :
                                     access.caregiverProfileType === 'doctor' ? 'Médico(a)' :
                                     access.caregiverProfileType === 'family' ? 'Familiar' :
                                     access.caregiverProfileType === 'nurse' ? 'Enfermagem' :
                                     'Usuário'}
                                  </Badge>
                                </div>
                                <p className="text-sm text-slate-500">{access.caregiverEmail}</p>
                                <p className="text-xs text-slate-400">
                                  Acesso desde {new Date(access.grantedAt).toLocaleDateString('pt-BR')}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveAccess(access.id, access.caregiverName)}
                              disabled={removeAccessMutation.isPending}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )) : null}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeSection === 'access-codes' && user?.profileType !== 'patient' && (
          <div className="space-y-6">
            {/* QR Scanner / Manual Code Entry */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-lg flex items-center justify-center">
                    <QrCode className="w-4 h-4 text-indigo-600" />
                  </div>
                  Usar Código de Acesso
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <p className="text-sm text-slate-600 mb-6">
                    Escaneie o QR code ou digite o código de compartilhamento do paciente para ter acesso aos dados médicos.
                  </p>

                  {/* QR Scanner Section */}
                  <div className="space-y-4 mb-6">
                    <Button 
                      onClick={() => setShowQrScanner(true)}
                      variant="outline"
                      className="w-full h-16 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                    >
                      <QrCode className="w-6 h-6 mr-3" />
                      Escanear QR Code
                    </Button>
                  </div>

                  {/* Manual Code Entry */}
                  <div className="space-y-4">
                    <div className="text-left">
                      <Label htmlFor="accessCode" className="text-sm font-medium text-slate-700">
                        Ou digite o código manualmente:
                      </Label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          id="accessCode"
                          value={manualAccessCode}
                          onChange={(e) => setManualAccessCode(e.target.value)}
                          placeholder="share_xxx_xxxxx_xxxxx"
                          className="font-mono text-sm"
                        />
                        <Button
                          onClick={handleUseManualCode}
                          disabled={useAccessCodeMutation.isPending || !manualAccessCode.trim()}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6"
                        >
                          {useAccessCodeMutation.isPending ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          ) : (
                            'Usar Código'
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                    <Info className="w-4 h-4 text-blue-600" />
                  </div>
                  Como funciona?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm mt-0.5">
                      1
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Peça ao paciente para gerar um código</p>
                      <p className="text-sm text-slate-600">O paciente deve ir em Configurações → Compartilhar Dados Médicos e gerar um QR code.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm mt-0.5">
                      2
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Escaneie ou digite o código</p>
                      <p className="text-sm text-slate-600">Use o scanner QR ou copie e cole o código de compartilhamento fornecido pelo paciente.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm mt-0.5">
                      3
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Acesse os dados médicos</p>
                      <p className="text-sm text-slate-600">Após a confirmação, você terá acesso aos medicamentos, consultas, exames e relatórios do paciente.</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">Importante</p>
                      <p className="text-xs text-amber-700 mt-1">
                        Os códigos de compartilhamento são de uso único e expiram após serem utilizados. 
                        O paciente precisará gerar um novo código para cada novo cuidador.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Accessible Patients List */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  Pacientes com Acesso
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AccessiblePatientsList />
              </CardContent>
            </Card>
          </div>
        )}

        {activeSection === 'help' && (
          <div className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg flex items-center justify-center">
                    <HelpCircle className="w-4 h-4 text-purple-600" />
                  </div>
                  Ajuda e Suporte
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">


                <div className="pt-4">
                  <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-100">
                    <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <HelpCircle className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-purple-900 font-semibold mb-1">Precisa de ajuda?</p>
                    <p className="text-sm text-purple-700 mb-4">Entre em contato conosco</p>
                    <Button className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg">
                      Contatar Suporte
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-lg flex items-center justify-center">
                    <Info className="w-4 h-4 text-indigo-600" />
                  </div>
                  Sobre o Aplicativo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 text-sm">
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                      <span className="font-medium text-slate-700">Versão</span>
                      <span className="text-slate-900 font-semibold">1.0.0</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                      <span className="font-medium text-slate-700">Desenvolvido por</span>
                      <span className="text-slate-900 font-semibold">Equipe Meu Cuidador!</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                      <span className="font-medium text-slate-700">Última atualização</span>
                      <span className="text-slate-900 font-semibold">Julho 2025</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
      {/* Dialogs */}
      <Dialog open={linkPatientDialogOpen} onOpenChange={setLinkPatientDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Vincular Paciente Existente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="searchEmail">Email do Paciente</Label>
              <div className="flex gap-2">
                <Input
                  id="searchEmail"
                  type="email"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                />
                <Button onClick={handleSearchUsers} disabled={isSearching} size="icon">
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>
            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((patient) => (
                  <Card key={patient.id} className="cursor-pointer hover:bg-gray-50">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={patient.photo || ""} alt={patient.name} />
                            <AvatarFallback>{patient.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{patient.name}</p>
                            <p className="text-sm text-gray-600">{patient.email}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleLinkPatient(patient)}
                          disabled={linkPatientMutation.isPending}
                        >
                          Vincular
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={addPatientDialogOpen} onOpenChange={setAddPatientDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Paciente</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddNewPatient} className="space-y-4">
            <div>
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={newPatientData.name}
                onChange={(e) => setNewPatientData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome completo"
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={newPatientData.email}
                onChange={(e) => setNewPatientData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@exemplo.com"
                required
              />
            </div>
            <div>
              <Label htmlFor="age">Idade</Label>
              <Input
                id="age"
                type="number"
                value={newPatientData.age}
                onChange={(e) => setNewPatientData(prev => ({ ...prev, age: e.target.value }))}
                placeholder="Idade (opcional)"
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setAddPatientDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={addPatientMutation.isPending}
              >
                {addPatientMutation.isPending ? "Cadastrando..." : "Cadastrar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {/* Logout Confirmation Dialog */}
      <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <DialogContent className="max-w-sm rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogOut className="w-5 h-5 text-red-600" />
              Confirmar Saída
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-600 mb-6">
              Tem certeza que deseja sair do aplicativo? Você precisará fazer login novamente para acessar sua conta.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setLogoutDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => {
                  logout();
                  setLogoutDialogOpen(false);
                }}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <BottomNavigation />
      {/* QR Scanner Component */}
      <QRScanner
        isOpen={showQrScanner}
        onScan={handleQrCodeScan}
        onClose={handleQrScannerClose}
      />
      {/* Remove Access Confirmation Modal */}
      <Dialog open={removeAccessModalOpen} onOpenChange={setRemoveAccessModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash className="w-5 h-5 text-red-600" />
              Remover Acesso
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-600 mb-4">
              Tem certeza que deseja remover o acesso de{' '}
              <span className="font-semibold text-slate-900">{accessToRemove?.name}</span>{' '}
              aos seus dados médicos?
            </p>
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-red-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">Importante</p>
                  <p className="text-xs text-red-700 mt-1">
                    Após remover o acesso, este usuário não poderá mais visualizar seus medicamentos, 
                    consultas e outros dados médicos.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setRemoveAccessModalOpen(false);
                setAccessToRemove(null);
              }}
              disabled={removeAccessMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={confirmRemoveAccess}
              disabled={removeAccessMutation.isPending}
            >
              {removeAccessMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Removendo...
                </div>
              ) : (
                <>
                  <Trash className="w-4 h-4 mr-2" />
                  Remover Acesso
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}