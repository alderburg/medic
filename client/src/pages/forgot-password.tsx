
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mail } from "lucide-react";
import { useFormValidation, ValidationRules } from "@/hooks/use-form-validation";
import { ValidatedInput } from "@/components/ui/validated-input";
import { useIsMobile } from "@/hooks/use-mobile";
import DesktopForgotPassword from "@/components/desktop-forgot-password";
import { LogoIcon } from "@/components/logo";

// Componente Mobile separado para evitar conflito de hooks
function MobileForgotPassword() {
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

  if (emailSent) {
    return (
      <div className="fixed inset-0 w-full h-full bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4 overflow-hidden">
        {/* Background Animation - Reduzidas para melhor performance */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Medical Cross Elements */}
          <div className="absolute animate-float-slow top-16 left-8 w-6 h-6 opacity-10">
            <div className="w-full h-0.5 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full absolute top-1/2 transform -translate-y-1/2"></div>
            <div className="w-0.5 h-full bg-gradient-to-b from-blue-400 to-blue-600 rounded-full absolute left-1/2 transform -translate-x-1/2"></div>
          </div>
          
          {/* Stethoscope Circle */}
          <div className="absolute animate-float-slow bottom-16 right-8 w-8 h-8 opacity-10">
            <div className="w-full h-full border-2 border-blue-400 rounded-full relative">
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-blue-400 rounded-full"></div>
            </div>
          </div>
          
          {/* Geometric Health Elements */}
          <div className="absolute animate-float-fast top-1/4 right-1/4 w-4 h-4 opacity-10">
            <div className="w-full h-full bg-gradient-to-br from-indigo-300 to-purple-400 rounded-lg transform rotate-45"></div>
          </div>
        </div>

        <Card className="w-full max-w-sm border-0 shadow-xl bg-white/80 backdrop-blur-sm z-10 relative">
          <CardHeader className="text-center space-y-3 pb-5 px-4 pt-6">
            <LogoIcon size={56} className="mx-auto" />
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900">Email Enviado</CardTitle>
              <p className="text-gray-600 text-base">Verifique sua caixa de entrada</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 px-4 pb-4">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <Mail className="w-8 h-8 text-green-600" />
              </div>
              
              <div className="space-y-2">
                <p className="text-gray-700 text-sm">
                  Enviamos um link de recuperação para:
                </p>
                <p className="font-medium text-gray-900 break-all text-sm">
                  {formData.email}
                </p>
              </div>

              <p className="text-gray-600 text-sm">
                Clique no link do email para criar uma nova senha. O link expira em 24 horas.
              </p>

              <div className="space-y-3 pt-2">
                <Button 
                  onClick={() => setEmailSent(false)}
                  variant="outline"
                  className="w-full h-10 text-base md:text-sm"
                >
                  Enviar novamente
                </Button>
                
                <Button 
                  onClick={() => setLocation("/login")}
                  className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white text-base md:text-sm"
                >
                  Voltar ao Login
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-full h-full bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4 overflow-hidden">
      {/* Background Animation - Reduzidas para melhor performance */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Medical Cross Elements */}
        <div className="absolute animate-float-slow top-16 left-8 w-6 h-6 opacity-10">
          <div className="w-full h-0.5 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full absolute top-1/2 transform -translate-y-1/2"></div>
          <div className="w-0.5 h-full bg-gradient-to-b from-blue-400 to-blue-600 rounded-full absolute left-1/2 transform -translate-x-1/2"></div>
        </div>
        
        {/* Stethoscope Circle */}
        <div className="absolute animate-float-slow bottom-16 right-8 w-8 h-8 opacity-10">
          <div className="w-full h-full border-2 border-blue-400 rounded-full relative">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-blue-400 rounded-full"></div>
          </div>
        </div>
        
        {/* Geometric Health Elements */}
        <div className="absolute animate-float-fast top-1/4 right-1/4 w-4 h-4 opacity-10">
          <div className="w-full h-full bg-gradient-to-br from-indigo-300 to-purple-400 rounded-lg transform rotate-45"></div>
        </div>
      </div>
      <Card className="w-full max-w-sm border-0 shadow-xl bg-white/80 backdrop-blur-sm z-10 relative">
        <CardHeader className="text-center space-y-3 pb-5 px-4 pt-6">
          <LogoIcon size={56} className="mx-auto" />
          <div>
            <CardTitle className="text-2xl font-bold text-gray-900">Recuperar Senha</CardTitle>
            <p className="text-gray-600 text-base">Digite seu email para recuperar a senha</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 px-4 pb-4">
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
              className="h-10 text-base md:text-sm"
            />

            <Button type="submit" disabled={loading} className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white text-base md:text-sm mt-4">
              {loading ? "Enviando..." : "Enviar Link de Recuperação"}
            </Button>
          </form>

          <div className="flex items-center justify-center pt-2">
            <Button
              variant="ghost"
              onClick={() => setLocation("/login")}
              className="text-gray-600 hover:text-gray-900 text-[14px] p-0 h-auto"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Voltar ao Login
            </Button>
          </div>

          <div className="mt-4 text-center">
            <p className="text-gray-600 text-[14px]">
              Não tem uma conta?{" "}
              <Link href="/register" className="text-blue-600 hover:text-blue-500 font-medium">
                Cadastre-se
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ForgotPassword() {
  const isMobile = useIsMobile();
  
  // Usa componentes separados para evitar conflito de hooks
  return isMobile ? <MobileForgotPassword /> : <DesktopForgotPassword />;
}
