
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Building2, Shield, Users, Activity, ArrowLeft, Mail } from "lucide-react";
import { useFormValidation, ValidationRules } from "@/hooks/use-form-validation";
import { ValidatedInput } from "@/components/ui/validated-input";
import { Logo, LogoIcon } from "@/components/logo";

export default function DesktopForgotPassword() {
  const validationRules: ValidationRules = {
    email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }
  };

  const { formData, errors, validateForm, updateField } = useFormValidation({
    email: ""
  }, validationRules);

  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Scroll para o topo da página ao abrir
    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { isValid } = validateForm();
    
    if (!isValid) {
      toast({
        title: "Erro de validação",
        description: "Por favor, corrija os erros no formulário.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Simular envio de email (implementar com sua API)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setEmailSent(true);
      toast({
        title: "Email enviado!",
        description: "Verifique sua caixa de entrada para recuperar sua senha.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao enviar email de recuperação. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: Shield,
      title: "Processo Seguro",
      description: "Recuperação protegida por criptografia",
      bgColor: "bg-blue-100",
      iconColor: "text-blue-600"
    },
    {
      icon: Mail,
      title: "Link por Email",
      description: "Receba instruções no seu email",
      bgColor: "bg-green-100",
      iconColor: "text-green-600"
    },
    {
      icon: Users,
      title: "Suporte 24/7",
      description: "Equipe pronta para ajudar",
      bgColor: "bg-purple-100",
      iconColor: "text-purple-600"
    },
    {
      icon: Activity,
      title: "Acesso Rápido",
      description: "Volte a usar sua conta em minutos",
      bgColor: "bg-orange-100",
      iconColor: "text-orange-600"
    }
  ];

  if (emailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col lg:flex-row relative overflow-hidden">
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
                Email enviado com sucesso
              </h2>

              <div className="grid grid-cols-1 gap-4 lg:gap-4">
                <div className="flex items-start space-x-3 lg:space-x-4">
                  <div className="flex-shrink-0 w-10 h-10 lg:w-12 lg:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Mail className="w-5 h-5 lg:w-6 lg:h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm lg:text-sm xl:text-lg">Verificação por Email</h3>
                    <p className="text-gray-600 text-xs lg:text-xs xl:text-base line-clamp-1">Link enviado para: {formData.email}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 lg:space-x-4">
                  <div className="flex-shrink-0 w-10 h-10 lg:w-12 lg:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 lg:w-6 lg:h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm lg:text-sm xl:text-lg">Segurança Garantida</h3>
                    <p className="text-gray-600 text-xs lg:text-xs xl:text-base line-clamp-1">Link expira em 24 horas</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 lg:space-x-4">
                  <div className="flex-shrink-0 w-10 h-10 lg:w-12 lg:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 lg:w-6 lg:h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm lg:text-sm xl:text-lg">Suporte Especializado</h3>
                    <p className="text-gray-600 text-xs lg:text-xs xl:text-base line-clamp-1">Equipe pronta para ajudar</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Success Form */}
        <div className="flex-1 2xl:flex-none 2xl:w-[900px] flex items-center justify-center px-4 py-8 xl:px-8 2xl:px-8 2xl:justify-start 2xl:pl-20">
          <div className="w-full max-w-sm 2xl:max-w-md">
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader className="text-center space-y-2 pb-4 px-4 2xl:px-6">
                <LogoIcon size={48} className="mx-auto 2xl:hidden" />
                <LogoIcon size={56} className="mx-auto hidden 2xl:block" />
                <div>
                  <CardTitle className="text-lg 2xl:text-xl font-bold text-gray-900">Email Enviado</CardTitle>
                  <p className="text-gray-600 text-xs 2xl:text-sm">Verifique sua caixa de entrada</p>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 px-4 2xl:px-6 pb-6">
                <div className="text-center space-y-6">
                  <div className="mx-auto w-20 h-20 2xl:w-24 2xl:h-24 bg-green-100 rounded-full flex items-center justify-center">
                    <Mail className="w-10 h-10 2xl:w-12 2xl:h-12 text-green-600" />
                  </div>
                  
                  <div className="space-y-3">
                    <p className="text-gray-700 text-sm 2xl:text-base">
                      Enviamos um link de recuperação para:
                    </p>
                    <p className="font-medium text-gray-900 break-all text-sm 2xl:text-base">
                      {formData.email}
                    </p>
                  </div>

                  <p className="text-gray-600 text-sm 2xl:text-base">
                    Clique no link do email para criar uma nova senha. O link expira em 24 horas.
                  </p>

                  <div className="space-y-3 pt-2">
                    <Button 
                      onClick={() => setEmailSent(false)}
                      variant="outline"
                      className="w-full h-10 2xl:h-11 text-sm 2xl:text-base"
                    >
                      Enviar novamente
                    </Button>
                    
                    <Button 
                      onClick={() => setLocation("/login")}
                      className="w-full h-10 2xl:h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold transition-all duration-200 text-sm 2xl:text-base"
                    >
                      Voltar ao Login
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 text-center">
          <p className="text-sm text-gray-500">&copy; 2025 Meu Cuidador. Todos os direitos reservados.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col lg:flex-row relative overflow-hidden">
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
              Recupere sua senha com segurança
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

      {/* Right Side - Forgot Password Form */}
      <div className="flex-1 2xl:flex-none 2xl:w-[900px] flex items-center justify-center px-4 py-8 xl:px-8 2xl:px-8 2xl:justify-start 2xl:pl-20">
        <div className="w-full max-w-sm 2xl:max-w-md">
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center space-y-2 pb-4 px-4 2xl:px-6">
              <LogoIcon size={48} className="mx-auto 2xl:hidden" />
              <LogoIcon size={56} className="mx-auto hidden 2xl:block" />
              <div>
                <CardTitle className="text-lg 2xl:text-xl font-bold text-gray-900">Recuperar Senha</CardTitle>
                <p className="text-gray-600 text-xs 2xl:text-sm">Digite seu email para recuperar a senha</p>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 px-4 2xl:px-6 pb-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <ValidatedInput
                  id="email"
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="seu@email.com"
                  required
                  error={errors.email}
                  className="h-10 2xl:h-11 text-base 2xl:text-lg"
                />

                <Button
                  type="submit"
                  className="w-full h-10 2xl:h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold transition-all duration-200 text-sm 2xl:text-base mt-4"
                  disabled={loading}
                >
                  {loading ? "Enviando..." : "Enviar Link de Recuperação"}
                </Button>
              </form>

              <div className="flex items-center justify-center pt-2">
                <Button
                  variant="ghost"
                  onClick={() => setLocation("/login")}
                  className="text-gray-600 hover:text-gray-900 text-xs 2xl:text-sm p-0 h-auto"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Voltar ao Login
                </Button>
              </div>

              <div className="text-center pt-3">
                <p className="text-xs 2xl:text-sm text-gray-600">
                  Não tem conta?{" "}
                  <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500">
                    Cadastre-se
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 text-center">
        <p className="text-sm text-gray-500">&copy; 2025 Meu Cuidador. Todos os direitos reservados.</p>
      </div>
    </div>
  );
}
