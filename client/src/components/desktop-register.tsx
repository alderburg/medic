import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Building2, Shield, Users, Activity, Camera, Upload, X, Image } from "lucide-react";
import { useFormValidation, ValidationRules } from "@/hooks/use-form-validation";
import { ValidatedInput, ValidatedSelect, ValidatedPasswordInput } from "@/components/ui/validated-input";
import { Logo, LogoIcon } from "@/components/logo";
import { ArrowLeft } from "lucide-react";

export default function DesktopRegister() {
  const validationRules: ValidationRules = {
    photo: { required: true },
    profileType: { required: true },
    name: { required: true, minLength: 2 },
    email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    whatsapp: { required: true, pattern: /^\(\d{2}\) \d{4,5}-\d{4}$/ },
    age: { required: true, min: 1, max: 120 },
    weight: { required: true, min: 1, max: 300 },
    gender: { required: true },
    crm: { 
      required: false,
      custom: (value: string) => {
        if (formData.profileType === 'doctor' && (!value || value.trim() === '')) {
          return 'CRM é obrigatório para médicos';
        }
        return null;
      }
    },
    password: { 
      required: true, 
      minLength: 8,
      custom: (value) => {
        const hasUpperCase = /[A-Z]/.test(value);
        const hasLowerCase = /[a-z]/.test(value);
        const hasNumbers = /\d/.test(value);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);
        
        if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
          return 'Senha deve ter pelo menos 8 caracteres, incluindo maiúscula, minúscula, número e símbolo';
        }
        return null;
      }
    },
    confirmPassword: { 
      required: true,
      custom: (value) => {
        if (value !== formData.password) {
          return 'Senhas não coincidem';
        }
        return null;
      }
    }
  };

  const { formData, errors, validateForm, updateField } = useFormValidation({
    photo: "",
    profileType: "",
    name: "",
    email: "",
    whatsapp: "",
    age: "",
    weight: "",
    gender: "",
    crm: "",
    password: "",
    confirmPassword: ""
  }, validationRules);

  // Evitar auto-preenchimento do "Lembrar-me" do login
  useEffect(() => {
    // Limpar qualquer auto-preenchimento do navegador
    const timer = setTimeout(() => {
      const inputs = document.querySelectorAll('input[type="email"], input[type="password"]');
      inputs.forEach(input => {
        const inputElement = input as HTMLInputElement;
        inputElement.autocomplete = 'off';
        inputElement.value = '';
        // Forçar limpeza específica para campos de cadastro
        if (inputElement.name === 'email' || inputElement.name === 'password') {
          inputElement.value = '';
        }
      });
      
      // Limpar também os dados do formulário se vieram preenchidos
      updateField('email', '');
      updateField('password', '');
      updateField('confirmPassword', '');
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { register } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

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

  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formatted = formatPhone(value);
    updateField('whatsapp', formatted);
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

  // Função para lidar com o upload de foto (genérica)
  const processPhotoFile = async (file: File) => {
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
      updateField('photo', base64);
      setPhotoPreview(base64);
      setShowPhotoModal(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao processar imagem. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processPhotoFile(file);
    }
  };

  const handleCameraUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processPhotoFile(file);
    }
  };

  const removePhoto = () => {
    updateField('photo', '');
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar se todos os campos estão preenchidos
    const requiredFieldsMap = {
      photo: 'Foto',
      profileType: 'Tipo de Perfil',
      name: 'Nome Completo',
      email: 'Email',
      whatsapp: 'WhatsApp',
      age: 'Idade',
      weight: 'Peso',
      ...(formData.profileType === 'doctor' && { crm: 'CRM' }),
      password: 'Senha',
      confirmPassword: 'Confirmar Senha'
    };
    
    const emptyFields = Object.keys(requiredFieldsMap).filter(field => !formData[field as keyof typeof formData]);
    
    // Forçar validação para mostrar erros visuais
    const isValid = validateForm();
    
    if (emptyFields.length > 0 || !isValid) {
      let description = "";
      
      if (emptyFields.length > 0) {
        const fieldNames = emptyFields.map(field => requiredFieldsMap[field as keyof typeof requiredFieldsMap]);
        description = `Campos obrigatórios: ${fieldNames.join(', ')}`;
      } else {
        description = "Verifique os campos marcados em vermelho";
      }
      
      toast({
        title: "Erro de validação",
        description,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, ...userData } = formData;
      await register({
        ...userData,
        age: userData.age ? parseInt(userData.age) : undefined,
        weight: userData.weight ? parseFloat(userData.weight) : undefined,
      });
      setLocation("/home");
      toast({
        title: "Conta criada!",
        description: "Sua conta foi criada com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro no cadastro",
        description: error.response?.data?.message || "Erro ao criar conta. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: Activity,
      title: "Monitoramento Completo",
      description: "Acompanhe medicamentos, consultas e sinais vitais em tempo real",
      bgColor: "bg-green-100",
      iconColor: "text-green-600"
    },
    {
      icon: Shield,
      title: "Segurança Profissional",
      description: "Dados protegidos com criptografia e acesso seguro",
      bgColor: "bg-blue-100",
      iconColor: "text-blue-600"
    },
    {
      icon: Users,
      title: "Múltiplos Perfis",
      description: "Suporte para pacientes, cuidadores e profissionais de saúde",
      bgColor: "bg-purple-100",
      iconColor: "text-purple-600"
    },
    {
      icon: Building2,
      title: "Gestão Avançada",
      description: "Relatórios detalhados e análise de aderência ao tratamento",
      bgColor: "bg-orange-100",
      iconColor: "text-orange-600"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col lg:flex-row relative">
      {/* Background Animation */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Medical Cross Elements */}
        <div className="absolute animate-float-slow top-16 left-16 w-12 h-12 opacity-20">
          <div className="w-full h-2 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full absolute top-1/2 transform -translate-y-1/2"></div>
          <div className="w-2 h-full bg-gradient-to-b from-blue-400 to-blue-600 rounded-full absolute left-1/2 transform -translate-x-1/2"></div>
        </div>
        
        {/* Heartbeat Wave */}
        <div className="absolute animate-float-medium top-1/4 right-20 w-24 h-8 opacity-25">
          <svg viewBox="0 0 100 32" className="w-full h-full fill-none stroke-green-400 stroke-2">
            <path d="M0,16 L20,16 L25,8 L30,24 L35,4 L40,28 L45,16 L100,16" />
          </svg>
        </div>
        
        {/* Pill Capsule Shape */}
        <div className="absolute animate-float-fast bottom-24 left-1/4 w-16 h-8 opacity-20">
          <div className="w-full h-full bg-gradient-to-r from-red-300 to-blue-300 rounded-full"></div>
        </div>
        
        {/* DNA Helix */}
        <div className="absolute animate-float-reverse top-1/3 left-1/2 w-8 h-20 opacity-25">
          <svg viewBox="0 0 32 80" className="w-full h-full fill-none stroke-purple-400 stroke-2">
            <path d="M8,0 Q16,10 24,20 Q16,30 8,40 Q16,50 24,60 Q16,70 8,80" />
            <path d="M24,0 Q16,10 8,20 Q16,30 24,40 Q16,50 8,60 Q16,70 24,80" />
          </svg>
        </div>
        
        {/* Stethoscope Circle */}
        <div className="absolute animate-float-slow bottom-12 right-12 w-14 h-14 opacity-20">
          <div className="w-full h-full border-4 border-blue-400 rounded-full relative">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-blue-400 rounded-full"></div>
          </div>
        </div>
        
        {/* Medical Shield */}
        <div className="absolute animate-float-medium top-1/2 left-1/3 w-12 h-14 opacity-25">
          <svg viewBox="0 0 48 56" className="w-full h-full fill-green-400/60">
            <path d="M24,0 L40,8 L40,28 Q40,44 24,56 Q8,44 8,28 L8,8 Z" />
            <path d="M24,12 L32,16 L32,28 Q32,36 24,44 Q16,36 16,28 L16,16 Z" fill="white" />
          </svg>
        </div>
        
        {/* Geometric Health Elements */}
        <div className="absolute animate-float-fast top-1/5 right-1/5 w-10 h-10 opacity-20">
          <div className="w-full h-full bg-gradient-to-br from-indigo-300 to-purple-400 rounded-lg transform rotate-45"></div>
        </div>
        
        <div className="absolute animate-float-reverse bottom-1/5 left-2/3 w-6 h-6 opacity-25">
          <div className="w-full h-full bg-gradient-to-br from-green-400 to-teal-400 rounded-full"></div>
        </div>
        
        <div className="absolute animate-float-slow top-3/4 right-1/2 w-8 h-8 opacity-20">
          <div className="w-full h-full bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full"></div>
        </div>
      </div>
      {/* Left Side - Branding and Features */}
      <div className="hidden lg:flex lg:flex-1 flex-col justify-center items-center px-8 lg:px-12 xl:px-24 2xl:px-32">
        <div className="max-w-sm lg:max-w-sm xl:max-w-lg w-full 2xl-custom:ml-16">
          {/* Logo and Brand */}
          <div className="mb-8 lg:mb-10">
            <div className="flex items-center justify-start mb-6">
              <LogoIcon size={64} className="mr-3 lg:mr-4" />
              <div>
                <h1 className="text-xl lg:text-xl xl:text-3xl font-bold text-gray-900">Meu Cuidador</h1>
                <p className="text-gray-600 text-xs lg:text-xs xl:text-base">Porque o mais importante é cuidar de você.</p>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-4 lg:space-y-4">
            <h2 className="text-lg lg:text-lg xl:text-2xl font-semibold text-gray-900 mb-4 lg:mb-4">
              Gerencie sua saúde de forma inteligente
            </h2>

            <div className="grid grid-cols-1 gap-4 lg:gap-4">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start space-x-3 lg:space-x-4">
                  <div className={`flex-shrink-0 w-10 h-10 lg:w-12 lg:h-12 ${feature.bgColor} rounded-lg flex items-center justify-center`}>
                    <feature.icon className={`w-5 h-5 lg:w-6 lg:h-6 ${feature.iconColor}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm lg:text-sm xl:text-lg">{feature.title}</h3>
                    <p className="text-gray-600 text-xs lg:text-xs xl:text-base line-clamp-1">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* Right Side - Register Form */}
      <div className="flex-1 2xl:flex-none 2xl:w-[900px] flex items-center justify-center px-4 py-8 pb-16 xl:px-8 2xl:px-8 2xl:justify-start 2xl:pl-20">
        <div className="w-full max-w-sm 2xl:max-w-md">
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardContent className="space-y-4 px-4 2xl:px-6 py-6">
              {/* Botão de voltar */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setLocation("/login")}
                    className="mr-3"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div>
                    <h2 className="text-lg 2xl:text-xl font-bold text-gray-900">Criar Conta</h2>
                    <p className="text-gray-600 text-xs 2xl:text-sm">Cadastre-se no Meu Cuidador</p>
                  </div>
                </div>
                <div className="flex-shrink-0 w-10 h-10 2xl:w-12 2xl:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 2xl:w-6 2xl:h-6 text-purple-600" />
                </div>
              </div>
              
              {/* Linha divisória */}
              <div className="relative w-full mb-4">
                <div className="absolute left-0 right-0 h-px bg-gray-200 -ml-4 -mr-4 2xl:-ml-6 2xl:-mr-6"></div>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Campo de upload de foto */}
                <div className="space-y-2">
                  <div className="flex flex-col items-center space-y-3 mt-[0px] mb-[0px] pt-[17px] pb-[17px]">
                    {photoPreview ? (
                      <div className="relative">
                        <img 
                          src={photoPreview} 
                          alt="Preview da foto"
                          className="w-20 h-20 rounded-full object-cover border-2 border-primary/20"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="destructive"
                          onClick={removePhoto}
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className={`w-20 h-20 rounded-full border-2 border-dashed ${
                        errors.photo 
                          ? 'border-red-500 bg-red-50' 
                          : 'border-slate-300 bg-slate-50'
                      } flex items-center justify-center`}>
                        <Camera className={`w-8 h-8 ${
                          errors.photo ? 'text-red-500' : 'text-slate-400'
                        }`} />
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPhotoModal(true)}
                      className={`text-xs 2xl:text-sm ${errors.photo ? "border-red-500 text-red-600 hover:bg-red-50" : ""}`}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      {photoPreview ? "Alterar" : "Adicionar"} Foto
                    </Button>
                    {errors.photo && (
                      <p className="text-red-500 text-xs 2xl:text-sm text-center">{errors.photo}</p>
                    )}
                  </div>
                  {/* Input para galeria */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleGalleryUpload}
                    className="hidden"
                  />
                  {/* Input para câmera */}
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleCameraUpload}
                    className="hidden"
                  />
                </div>

                <ValidatedSelect
                  label="Tipo de Perfil"
                  value={formData.profileType}
                  onValueChange={(value) => updateField('profileType', value)}
                  placeholder="Selecionar Perfil"
                  required
                  error={errors.profileType}
                >
                  <SelectItem value="patient">Paciente</SelectItem>
                  <SelectItem value="caregiver">Cuidador(a)</SelectItem>
                  <SelectItem value="doctor">Médico(a)</SelectItem>
                  <SelectItem value="family">Familiar</SelectItem>
                  <SelectItem value="nurse">Enfermagem</SelectItem>
                </ValidatedSelect>

                {formData.profileType === 'doctor' && (
                  <ValidatedInput
                    id="crm"
                    label="CRM"
                    value={formData.crm}
                    onChange={(e) => updateField('crm', e.target.value)}
                    placeholder="12345-SP"
                    required
                    error={errors.crm}
                    className="h-9 2xl:h-10 text-xs 2xl:text-sm"
                  />
                )}

                <ValidatedInput
                  id="name"
                  label="Nome Completo"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="Seu nome completo"
                  required
                  error={errors.name}
                  className="h-9 2xl:h-10 text-xs 2xl:text-sm"
                />

                <div className="grid grid-cols-2 gap-4">
                  <ValidatedInput
                    id="email"
                    label="Email"
                    type="email"
                    name="register-email"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder="seu@email.com"
                    required
                    error={errors.email}
                    className="h-9 2xl:h-10 text-xs 2xl:text-sm"
                    autoComplete="new-email"
                  />

                  <ValidatedInput
                    id="whatsapp"
                    label="WhatsApp"
                    type="tel"
                    value={formData.whatsapp}
                    onChange={handleWhatsAppChange}
                    placeholder="(11) 99999-9999"
                    maxLength={15}
                    required
                    error={errors.whatsapp}
                    className="h-9 2xl:h-10 text-xs 2xl:text-sm"
                  />
                </div>

                <ValidatedSelect
                  label="Gênero"
                  value={formData.gender}
                  onValueChange={(value) => updateField('gender', value)}
                  placeholder="Selecionar gênero"
                  required
                  error={errors.gender}
                >
                  <SelectItem value="masculino">Masculino</SelectItem>
                  <SelectItem value="feminino">Feminino</SelectItem>
                </ValidatedSelect>

                <div className="grid grid-cols-2 gap-4">
                  <ValidatedInput
                    id="age"
                    label="Idade"
                    type="number"
                    value={formData.age}
                    onChange={(e) => updateField('age', e.target.value)}
                    placeholder="65"
                    min="1"
                    max="120"
                    required
                    error={errors.age}
                    className="h-9 2xl:h-10 text-xs 2xl:text-sm"
                  />
                  <ValidatedInput
                    id="weight"
                    label="Peso (kg)"
                    type="number"
                    value={formData.weight}
                    onChange={(e) => updateField('weight', e.target.value)}
                    placeholder="70.5"
                    min="1"
                    max="300"
                    step="0.1"
                    required
                    error={errors.weight}
                    className="h-9 2xl:h-10 text-xs 2xl:text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <ValidatedPasswordInput
                    id="password"
                    label="Senha"
                    name="register-password"
                    value={formData.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    placeholder="Digite uma senha forte"
                    showPassword={showPassword}
                    onTogglePassword={() => setShowPassword(!showPassword)}
                    required
                    error={errors.password}
                    className="h-9 2xl:h-10 text-xs 2xl:text-sm"
                    autoComplete="new-password"
                  />
                  
                  {/* Indicador de força da senha */}
                  {formData.password && (
                    <div className="space-y-2">
                      <div className="flex space-x-1">
                        <div className={`h-1 rounded flex-1 ${formData.password.length >= 8 ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                        <div className={`h-1 rounded flex-1 ${/[A-Z]/.test(formData.password) ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                        <div className={`h-1 rounded flex-1 ${/[a-z]/.test(formData.password) ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                        <div className={`h-1 rounded flex-1 ${/\d/.test(formData.password) ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                        <div className={`h-1 rounded flex-1 ${/[!@#$%^&*(),.?":{}|<>]/.test(formData.password) ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                      </div>
                      <div className={`text-xs 2xl:text-sm ${formData.password.length >= 8 && /[A-Z]/.test(formData.password) && /[a-z]/.test(formData.password) && /\d/.test(formData.password) && /[!@#$%^&*(),.?":{}|<>]/.test(formData.password) ? 'text-green-600' : 'text-gray-600'}`}>
                        {formData.password.length >= 8 && /[A-Z]/.test(formData.password) && /[a-z]/.test(formData.password) && /\d/.test(formData.password) && /[!@#$%^&*(),.?":{}|<>]/.test(formData.password) ? (
                          "✓ Senha forte criada com sucesso!"
                        ) : (
                          <>
                            Faltam: {[
                              formData.password.length < 8 && "8 caracteres",
                              !/[A-Z]/.test(formData.password) && "maiúscula",
                              !/[a-z]/.test(formData.password) && "minúscula", 
                              !/\d/.test(formData.password) && "número",
                              !/[!@#$%^&*(),.?":{}|<>]/.test(formData.password) && "símbolo"
                            ].filter(Boolean).join(", ")}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <ValidatedPasswordInput
                  id="confirmPassword"
                  label="Confirmar Senha"
                  name="register-confirm-password"
                  value={formData.confirmPassword}
                  onChange={(e) => updateField('confirmPassword', e.target.value)}
                  placeholder="Confirme sua senha"
                  showPassword={showConfirmPassword}
                  onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
                  required
                  error={errors.confirmPassword}
                  className="h-9 2xl:h-10 text-xs 2xl:text-sm"
                  autoComplete="new-password"
                />

                <Button
                  type="submit"
                  className="w-full h-10 2xl:h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold transition-all duration-200 text-xs 2xl:text-sm mt-4"
                  disabled={loading}
                >
                  {loading ? "Criando Conta..." : "Criar Conta"}
                </Button>
              </form>

              <div className="text-center pt-3">
                <p className="text-xs 2xl:text-sm text-gray-600">
                  Já tem conta?{" "}
                  <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                    Faça login
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      {/* Modal de seleção de foto */}
      <Dialog open={showPhotoModal} onOpenChange={setShowPhotoModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Adicionar Foto</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <Button
              variant="outline"
              onClick={() => {
                fileInputRef.current?.click();
              }}
              className="h-24 flex-col space-y-2"
            >
              <Image className="w-8 h-8" />
              <span className="text-sm">Galeria</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                cameraInputRef.current?.click();
              }}
              className="h-24 flex-col space-y-2"
            >
              <Camera className="w-8 h-8" />
              <span className="text-sm">Câmera</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 text-center">
        <p className="text-sm text-gray-500">&copy; 2025 Meu Cuidador. Todos os direitos reservados.</p>
      </div>
    </div>
  );
}