import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  User, 
  Bell, 
  Shield, 
  Share2, 
  HelpCircle,
  Edit, 
  Camera,
  Eye,
  EyeOff,
  Pill,
  Calendar,
  FlaskConical,
  MessageCircle,
  Volume2,
  Key,
  QrCode,
  Copy,
  Users,
  Trash,
  Info,
  LogOut
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import QRScanner from "@/components/qr-scanner";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useLocation } from "wouter";

interface SharedAccess {
  id: number;
  patientId: number;
  caregiverEmail: string;
  caregiverName: string;
  caregiverProfileType: 'caregiver' | 'doctor' | 'family' | 'nurse';
  grantedAt: string;
  permissions: string[];
}

export default function SettingsDesktop() {
  const { user, logout, refreshUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // States for different settings sections
  const [activeTab, setActiveTab] = useState<'account' | 'notifications' | 'security' | 'share' | 'access-codes' | 'help'>('account');

  // Logout confirmation dialog
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  // Form data for account editing
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    age: user?.age?.toString() || "",
    weight: user?.weight?.toString() || "",
    whatsapp: user?.whatsapp || "",
    gender: user?.gender || "",
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
        gender: user.gender || "",
        profileType: user.profileType || "patient",
        crm: user.crm || "",
      });
    }
  }, [user]);

  // Edit profile mode
  const [isEditingProfile, setIsEditingProfile] = useState(false);

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

  // Estados para validação de senha e erros
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);

  // Query to get shared access list (for patients)
  const { data: sharedAccessData = [], isLoading: sharedAccessLoading } = useQuery({
    queryKey: ["/api/patient/shared-access"],
    queryFn: async () => {
      const response = await api.get("/api/patient/shared-access");
      return response.data;
    },
    enabled: user?.profileType === 'patient',
  });

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
      console.error('Error playing notification sound:', error);
    }
  };

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

  // Função para validar força da senha
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
    if (!validatePasswordForm()) {
      return;
    }

    changePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword
    });
  };

  const handleUpdateProfile = async () => {
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

    if (!formData.gender) {
      toast({
        title: "Campo obrigatório",
        description: "O gênero é obrigatório.",
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

    // Validação do CRM para médicos
    if (user?.profileType === 'doctor' && !formData.crm.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "O CRM é obrigatório para médicos.",
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
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao salvar configurações. Tente novamente.",
        variant: "destructive",
      });
    },
  });

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

  return (
    <div className="flex-1 bg-gray-50 overflow-y-auto scrollbar-hide">
      <div className="p-6 space-y-6">
        {/* User Profile Header */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="w-24 h-24 ring-4 ring-white shadow-lg">
                  <AvatarImage src={user?.photo || ""} alt={user?.name} />
                  <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                    {user?.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white"></div>
              </div>
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-slate-900 mb-2">{user?.name}</h2>
                <p className="text-slate-700 font-medium text-lg mb-3">{user?.email}</p>
                <div className="flex items-center gap-4">
                  {user?.age && (
                    <span className="px-3 py-1 bg-white/70 rounded-full text-sm font-medium text-slate-700">
                      {user.age} anos
                    </span>
                  )}
                  <Badge 
                    variant={user?.profileType === 'patient' ? 'default' : 'secondary'}
                    className="font-medium text-sm">
                    {user?.profileType === 'patient' ? 'Paciente' :
                     user?.profileType === 'caregiver' ? 'Cuidador(a)' :
                     user?.profileType === 'doctor' ? 'Médico(a)' :
                     user?.profileType === 'family' ? 'Familiar' :
                     user?.profileType === 'nurse' ? 'Enfermagem' :
                     'Usuário'}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-3">
                {/* Botão de sair removido - funcionalidade disponível nas abas */}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-6">
            <TabsTrigger value="account" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Conta
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Notificações
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Segurança
            </TabsTrigger>
            {user?.profileType === 'patient' && (
              <TabsTrigger value="share" className="flex items-center gap-2">
                <Share2 className="w-4 h-4" />
                Compartilhar
              </TabsTrigger>
            )}
            {user?.profileType !== 'patient' && (
              <TabsTrigger value="access-codes" className="flex items-center gap-2">
                <Key className="w-4 h-4" />
                Códigos
              </TabsTrigger>
            )}
            <TabsTrigger value="help" className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              Ajuda
            </TabsTrigger>
          </TabsList>

          {/* Account Tab */}
          <TabsContent value="account" className="space-y-6">
            {/* Profile Photo Section */}
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <div className={`relative inline-block ${isEditingProfile ? 'cursor-pointer' : ''}`} onClick={isEditingProfile ? handlePhotoClick : undefined}>
                    <Avatar className={`w-32 h-32 ring-4 shadow-lg transition-all ${isEditingProfile ? 'ring-blue-200 hover:ring-blue-300' : 'ring-blue-100'}`}>
                      <AvatarImage src={photoPreview || user?.photo || ""} alt={user?.name} />
                      <AvatarFallback className="text-3xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                        {user?.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    {isEditingProfile && (
                      <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-full border-2 border-blue-100 flex items-center justify-center shadow-md hover:bg-blue-50 transition-colors">
                        <Camera className="w-5 h-5 text-blue-600" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Personal Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      onChange={isEditingProfile ? (e) => {
                        // Formatação de telefone brasileiro
                        let value = e.target.value.replace(/\D/g, ''); // Remove tudo que não é dígito

                        if (value.length <= 11) {
                          // Aplica formatação (11) 99999-9999
                          if (value.length > 6) {
                            value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
                          } else if (value.length > 2) {
                            value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
                          } else if (value.length > 0) {
                            value = `(${value}`;
                          }
                        } else {
                          // Limita a 11 dígitos
                          value = value.slice(0, 11);
                          value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
                        }

                        setFormData(prev => ({ ...prev, whatsapp: value }));
                      } : undefined}
                      readOnly={!isEditingProfile}
                      placeholder={isEditingProfile ? "(11) 99999-9999" : undefined}
                      maxLength={15}
                      className={isEditingProfile ? "border-blue-300 focus:border-blue-500" : "bg-slate-50 border-slate-200 text-slate-800 font-medium"}
                    />
                  </div>

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
                    <Label htmlFor="gender" className="text-sm font-medium text-slate-700">
                      Gênero {isEditingProfile && <span className="text-red-500">*</span>}
                    </Label>
                    {isEditingProfile ? (
                      <Select value={formData.gender} onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}>
                        <SelectTrigger className="border-blue-300 focus:border-blue-500">
                          <SelectValue placeholder="Selecione o gênero" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="masculino">Masculino</SelectItem>
                          <SelectItem value="feminino">Feminino</SelectItem>
                          <SelectItem value="outro">Outro</SelectItem>
                          <SelectItem value="nao_informar">Prefiro não informar</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input 
                        id="gender" 
                        value={
                          user?.gender === 'masculino' ? 'Masculino' :
                          user?.gender === 'feminino' ? 'Feminino' :
                          user?.gender === 'outro' ? 'Outro' :
                          user?.gender === 'nao_informar' ? 'Prefiro não informar' :
                          'Não informado'
                        } 
                        readOnly 
                        className="bg-slate-50 border-slate-200 text-slate-800 font-medium"
                      />
                    )}
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

                  {/* Campo CRM - Apenas para médicos */}
                  {user?.profileType === 'doctor' && (
                    <div className="space-y-2">
                      <Label htmlFor="crm" className="text-sm font-medium text-slate-700">
                        CRM {isEditingProfile && <span className="text-red-500">*</span>}
                      </Label>
                      <Input 
                        id="crm" 
                        value={isEditingProfile ? formData.crm : user?.crm || "Não informado"} 
                        onChange={isEditingProfile ? (e) => setFormData(prev => ({ ...prev, crm: e.target.value })) : undefined}
                        readOnly={!isEditingProfile}
                        required={isEditingProfile}
                        placeholder={isEditingProfile ? "Ex: 123456/SP" : undefined}
                        className={isEditingProfile ? "border-blue-300 focus:border-blue-500" : "bg-slate-50 border-slate-200 text-slate-800 font-medium"}
                      />
                    </div>
                  )}
                </div>

                {/* Botões de Ação - Perfil */}
                <div className="flex justify-end gap-3 pt-6 mt-6 border-t">
                  {isEditingProfile ? (
                    <>
                      <Button 
                        variant="outline"
                        className="!bg-white !hover:bg-gray-50 !border-gray-300 !text-gray-700 !transition-none"
                        onClick={() => {
                          setIsEditingProfile(false);
                          setPhotoPreview(user?.photo || '');
                          if (user) {
                            setFormData({
                              name: user.name || "",
                              email: user.email || "",
                              age: user.age?.toString() || "",
                              weight: user.weight?.toString() || "",
                              whatsapp: user.whatsapp || "",
                              gender: user.gender || "",
                              profileType: user.profileType || "patient",
                              crm: user.crm || "",
                            });
                          }
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button 
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
                            <Edit className="h-4 w-4 mr-2" />
                            Salvar Alterações
                          </>
                        )}
                      </Button>
                    </>
                  ) : (
                    <Button 
                      onClick={() => setIsEditingProfile(true)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editar Informações
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        if (checked) {
                          playNotificationSound();
                        }
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Communication Preferences */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-lg flex items-center justify-center">
                    <MessageCircle className="w-4 h-4 text-indigo-600" />
                  </div>
                  Preferências de Comunicação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Bell className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">Email</p>
                        <p className="text-sm text-slate-600">Notificações por email</p>
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
                        <p className="font-semibold text-slate-900">Push</p>
                        <p className="text-sm text-slate-600">Notificações no dispositivo</p>
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
                        <p className="font-semibold text-slate-900">WhatsApp</p>
                        <p className="text-sm text-slate-600">Notificações por WhatsApp</p>
                      </div>
                    </div>
                    <Switch
                      checked={notificationSettings.whatsappNotifications}
                      onCheckedChange={(checked) =>
                        setNotificationSettings(prev => ({ ...prev, whatsappNotifications: checked }))
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Botões de Ação - Notificações */}
            <div className="flex justify-end pt-4 border-t">
              <Button 
                onClick={handleSaveNotificationSettings}
                disabled={saveNotificationMutation.isPending}
              >
                {saveNotificationMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <Bell className="h-4 w-4 mr-2" />
                    Salvar Configurações
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="w-8 h-8 bg-gradient-to-br from-red-100 to-red-200 rounded-lg flex items-center justify-center">
                    <Shield className="w-4 h-4 text-red-600" />
                  </div>
                  Alterar Senha
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {showChangePassword && (
                  <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    </div>

                  </div>
                )}

                {/* Botões de Ação - Segurança */}
                <div className="flex justify-end gap-3 pt-6 mt-6 border-t">
                  {showChangePassword ? (
                    <>
                      <Button 
                        variant="outline"
                        className="!bg-white !hover:bg-gray-50 !border-gray-300 !text-gray-700 !transition-none"
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
                      <Button 
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
                            <Shield className="h-4 w-4 mr-2" />
                            Salvar Nova Senha
                          </>
                        )}
                      </Button>
                    </>
                  ) : (
                    <Button 
                      onClick={() => setShowChangePassword(true)}
                      className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium shadow-lg"
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Alterar Senha
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Share Tab (only for patients) */}
          {user?.profileType === 'patient' && (
            <TabsContent value="share" className="space-y-6">
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
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 max-w-md mx-auto">
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
                      className="w-full max-w-md bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-medium shadow-lg h-12"
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
            </TabsContent>
          )}

          {/* Access Codes Tab (only for non-patients) */}
          {user?.profileType !== 'patient' && (
            <TabsContent value="access-codes" className="space-y-6">
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
                        className="w-full max-w-md h-16 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                      >
                        <QrCode className="w-6 h-6 mr-3" />
                        Escanear QR Code
                      </Button>
                    </div>

                    {/* Manual Code Entry */}
                    <div className="space-y-4 max-w-md mx-auto">
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

                  {/* Instructions moved here */}
                  <div className="mt-8 pt-6 border-t border-slate-200">
                    <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                      <Info className="w-4 h-4 text-blue-600" />
                      Como funciona?
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                    <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
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
                  {/* Query for accessible patients */}
                  {(() => {
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

                    if (accessiblePatientsData.length === 0) {
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
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  })()}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Help Tab */}
          <TabsContent value="help" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
                        <span className="font-medium text-slate-700">Versão</span>
                        <span className="text-slate-900 font-semibold">1.1.1</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
                        <span className="font-medium text-slate-700">Última atualização</span>
                        <span className="text-slate-900 font-semibold">Agosto 2025</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
                        <span className="font-medium text-slate-700">Desenvolvido por</span>
                        <span className="text-slate-900 font-semibold">Equipe Meu Cuidador!</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      {/* Dialogs */}
      {/* Logout Confirmation Dialog */}
      <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <DialogContent className="max-w-sm">
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