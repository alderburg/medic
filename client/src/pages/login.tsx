import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Heart } from "lucide-react";
import { useFormValidation, ValidationRules } from "@/hooks/use-form-validation";
import { ValidatedInput, ValidatedPasswordInput } from "@/components/ui/validated-input";
import { useIsMobile } from "@/hooks/use-mobile";
import DesktopLogin from "@/components/desktop-login";
import { LogoIcon } from "@/components/logo";

// Componente Mobile separado para evitar conflito de hooks
function MobileLogin() {
  const validationRules: ValidationRules = {
    email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    password: { required: true, minLength: 1 }
  };

  const { formData, errors, validateForm, updateField } = useFormValidation({
    email: "",
    password: ""
  }, validationRules);

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Load saved email, password and remember me state on component mount
  useEffect(() => {
    // Scroll para o topo da página ao abrir
    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;

    const savedEmail = localStorage.getItem("rememberedEmail");
    const savedPassword = localStorage.getItem("rememberedPassword");
    const savedRememberMe = localStorage.getItem("rememberMe") === "true";
    
    if (savedEmail && savedPassword && savedRememberMe) {
      updateField('email', savedEmail);
      updateField('password', savedPassword);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { isValid, firstError } = validateForm();
    
    if (!isValid) {
      toast({
        title: "Erro de validação",
        description: firstError || "Por favor, preencha todos os campos corretamente.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      await login(formData.email, formData.password);
      
      // Save or clear remember me preferences
      if (rememberMe) {
        localStorage.setItem("rememberedEmail", formData.email);
        localStorage.setItem("rememberedPassword", formData.password);
        localStorage.setItem("rememberMe", "true");
      } else {
        localStorage.removeItem("rememberedEmail");
        localStorage.removeItem("rememberedPassword");
        localStorage.removeItem("rememberMe");
      }
      
      toast({
        title: "Bem-vindo!",
        description: "Login realizado com sucesso.",
      });
      // A navegação é feita automaticamente pelo hook de autenticação
    } catch (error: any) {
      toast({
        title: "Erro no login",
        description: error.response?.data?.message || "Erro ao fazer login. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
            <CardTitle className="text-2xl font-bold text-gray-900">Bem-vindo</CardTitle>
            <p className="text-gray-600 text-base">Faça login para acessar sua conta</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 px-4 pb-4">
          <form onSubmit={handleSubmit} className="space-y-3">
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
              disabled={loading}
            />
            
            <ValidatedPasswordInput
              id="password"
              label="Senha"
              value={formData.password}
              onChange={(e) => updateField('password', e.target.value)}
              placeholder="Digite sua senha"
              showPassword={showPassword}
              onTogglePassword={() => setShowPassword(!showPassword)}
              required
              error={errors.password}
              className="h-10 text-base md:text-sm"
              disabled={loading}
            />

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center">
                <input
                  id="remember"
                  name="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                  className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                />
                <label htmlFor="remember" className={`ml-2 block text-gray-900 text-[14px] ${loading ? 'opacity-50' : ''}`}>
                  Lembrar-me
                </label>
              </div>
              <div className="text-xs">
                <Link 
                  href="/forgot-password" 
                  className={`font-medium text-blue-600 hover:text-blue-500 text-[14px] ${loading ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  Esqueceu a senha?
                </Link>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white text-base md:text-sm mt-3">
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-gray-600 text-[14px]">
              Não tem uma conta?{" "}
              <Link 
                href="/register" 
                className={`text-blue-600 hover:text-blue-500 font-medium ${loading ? 'opacity-50 pointer-events-none' : ''}`}
              >
                Cadastre-se
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Login() {
  const isMobile = useIsMobile();
  
  // Usa componentes separados para evitar conflito de hooks
  return isMobile ? <MobileLogin /> : <DesktopLogin />;
}
