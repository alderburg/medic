
import { Link } from "wouter";
import { LogoIcon } from "@/components/logo";
import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { 
  Pill, 
  Bell, 
  BarChart3, 
  Shield, 
  Stethoscope, 
  Lock, 
  Headphones 
} from "lucide-react";

export default function Landing() {
  const isMobile = useIsMobile();
  
  // Estado para controlar transparência do header baseado no scroll
  const [isScrolled, setIsScrolled] = useState(false);

  // Contador regressivo (escassez)
  const [timeLeft, setTimeLeft] = useState({
    days: 2,
    hours: 14,
    minutes: 35,
    seconds: 42
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else if (prev.days > 0) {
          return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Effect para detectar scroll e alterar transparência do header
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 50);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="fixed w-full top-0 z-50 text-white transition-all duration-300 from-blue-800/20 to-blue-600/20 backdrop-blur-sm shadow-lg bg-[#16295c]">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <LogoIcon size={48} className="mr-3" />
              <div>
                <span className="text-2xl font-bold">Meu Cuidador</span>
                <p className="text-sm text-white/80">Porque o mais importante é cuidar de você.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <Link 
                href="/login" 
                className="px-4 py-2 border-2 border-white text-[#ffffff] hover:bg-white hover:text-blue-800 rounded-lg transition-all duration-300"
              >
                Entrar
              </Link>
              <Link 
                href="/register" 
                className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white hover:text-white rounded-lg transition-all duration-300 font-semibold flex items-center justify-center"
              >
                COMEÇAR AGORA
              </Link>
            </div>
          </div>
        </nav>
      </header>
      {/* Conteúdo principal */}
      <div className="w-full">
        {/* 1. Hero Section */}
      <section className="pt-24 pb-20 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white relative overflow-hidden">
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
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[600px]">
            {/* Content Left */}
            <div className="space-y-8">
              <div className="inline-flex items-center px-4 py-2 bg-red-500/20 rounded-full text-red-300 text-sm font-medium backdrop-blur-sm animate-pulse">
                <span className="mr-2">🚨</span>
                ATENÇÃO: Sua família pode estar em risco!
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                Pare de Se Preocupar com 
                <span className="bg-gradient-to-r from-emerald-400 to-cyan-300 bg-clip-text text-transparent"> Medicamentos Esquecidos</span>
              </h1>
              
              <p className="text-xl md:text-2xl opacity-90 leading-relaxed">
                <strong>95% das complicações de saúde</strong> acontecem por medicamentos tomados incorretamente. 
                O Meu Cuidador garante que sua família <strong>NUNCA MAIS</strong> esqueça um remédio.
              </p>

              
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link 
                  href="/register" 
                  className="px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white hover:text-white text-lg font-bold rounded-xl transition-all duration-300 hover:-translate-y-1 shadow-lg hover:shadow-xl pulse-animation text-center"
                >
                  🚀 SIM! QUERO PROTEGER MINHA FAMÍLIA AGORA - GRÁTIS
                </Link>
              </div>

              {/* Trust Indicators - Layout otimizado com tamanhos ajustados */}
              <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 backdrop-blur-sm rounded-xl px-6 py-3 mt-6 border border-green-400/30">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Famílias Protegidas */}
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/>
                      </svg>
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-bold text-white">18.247</div>
                      <div className="text-xs text-green-200">protegidos</div>
                    </div>
                  </div>

                  {/* Aprovação Médica */}
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-bold text-white">Aprovado</div>
                      <div className="text-xs text-green-200">por médicos</div>
                    </div>
                  </div>

                  {/* Avaliação */}
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                      </svg>
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-bold text-white">4.9/5</div>
                      <div className="text-xs text-green-200">estrelas</div>
                    </div>
                  </div>

                  {/* Garantia */}
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-bold text-white">7 dias</div>
                      <div className="text-xs text-green-200">garantia</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Phone Mockup */}
            <div className="relative lg:block hidden">
              <div className="relative max-w-sm mx-auto">
                {/* Phone Frame */}
                <div className="relative bg-gray-900 rounded-[3rem] p-3 shadow-2xl">
                  {/* Phone Screen */}
                  <div className="bg-black rounded-[2.5rem] p-1">
                    <div className="bg-white rounded-[2rem] overflow-hidden h-[650px] relative">
                      {/* Status Bar */}
                      <div className="bg-white h-6 flex items-center justify-between px-6 text-xs text-black">
                        <span className="font-medium">9:41</span>
                        <div className="flex items-center gap-1">
                          <div className="w-4 h-2 border border-gray-400 rounded-sm">
                            <div className="w-3/4 h-full bg-green-500 rounded-sm"></div>
                          </div>
                        </div>
                      </div>
                      
                      {/* App Content - Home Screen */}
                      <div className="flex-1 bg-gray-50">
                        {/* Header */}
                        <div className="bg-white p-3 flex items-center justify-between border-b border-gray-100">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">MA</span>
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 text-xs">Maria Santos</div>
                              <div className="text-xs text-gray-500">68 anos</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">✓</span>
                            </div>
                          </div>
                        </div>

                        {/* Medicamentos de Hoje */}
                        <div className="px-3 pb-20">
                          <div className="flex items-center justify-between mb-3 mt-3">
                            <h3 className="text-sm font-semibold text-gray-900">Medicamentos de Hoje</h3>
                            <span className="text-xs text-green-600 font-bold">7 de 7 tomados ✓</span>
                          </div>
                          
                          {/* Medicamento Cards */}
                          <div className="space-y-2">
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                                    <span className="text-green-600 text-xs">✓</span>
                                  </div>
                                  <div>
                                    <div className="font-semibold text-gray-900 text-xs">Losartana 50mg</div>
                                    <div className="text-xs text-gray-600">Tomado às 08:00 - No horário ✓</div>
                                  </div>
                                </div>
                                <div className="bg-green-500 text-white px-3 py-1 rounded text-xs font-medium">
                                  TOMADO
                                </div>
                              </div>
                            </div>

                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                                    <span className="text-green-600 text-xs">✓</span>
                                  </div>
                                  <div>
                                    <div className="font-semibold text-gray-900 text-xs">Metformina 850mg</div>
                                    <div className="text-xs text-gray-600">Tomado às 12:05 - No horário ✓</div>
                                  </div>
                                </div>
                                <div className="bg-green-500 text-white px-3 py-1 rounded text-xs font-medium">
                                  TOMADO
                                </div>
                              </div>
                            </div>

                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                                    <span className="text-green-600 text-xs">✓</span>
                                  </div>
                                  <div>
                                    <div className="font-semibold text-gray-900 text-xs">Sinvastatina 20mg</div>
                                    <div className="text-xs text-gray-600">Tomado às 20:00 - No horário ✓</div>
                                  </div>
                                </div>
                                <div className="bg-green-500 text-white px-3 py-1 rounded text-xs font-medium">
                                  TOMADO
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* 2. Seção de Benefícios - Dores que resolve */}
      <section className="py-20 from-gray-50 to-gray-100 bg-[#ffffff]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 bg-red-100 rounded-full text-red-700 text-sm font-medium mb-6">
              <span className="mr-2">⚠️</span>
              PROBLEMAS CRÍTICOS NA SAÚDE FAMILIAR
            </div>
            <h2 className="md:text-5xl font-bold text-gray-900 mb-6 text-[50px]">
              Pare de Sofrer com Esses <span className="text-red-600">Riscos Desnecessários</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
              Milhares de famílias enfrentam esses desafios diariamente. Você não precisa ser mais uma delas.
            </p>
          </div>
          
          <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-6">
            {[
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                    <line x1="12" y1="8" x2="12" y2="12" strokeWidth="2"/>
                    <circle cx="12" cy="16" r="1" fill="currentColor"/>
                  </svg>
                ),
                iconBg: "bg-red-600",
                title: "Medicamentos Esquecidos",
                subtitle: "Risco de Morte",
                description: "Uma dose esquecida de anti-hipertensivo pode causar AVC. Diabéticos que esquecem insulina correm risco de coma. Não brinque com a vida da sua família.",
                stats: "73% das internações por complicações",
                color: "border-red-300 bg-red-50 hover:bg-red-100"
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                ),
                iconBg: "bg-amber-600",
                title: "Estresse e Ansiedade",
                subtitle: "Saúde Mental Abalada",
                description: "A preocupação constante gera ansiedade, insônia e depressão. Cuidadores relatam exaustão emocional e síndrome de burnout.",
                stats: "85% dos cuidadores têm ansiedade",
                color: "border-amber-300 bg-amber-50 hover:bg-amber-100"
              },
              {
                icon: (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                ),
                iconBg: "bg-rose-600",
                title: "Custos Hospitalares",
                subtitle: "Gastos Evitáveis",
                description: "Internações de emergência custam até R$ 25.000. UTI pode chegar a R$ 3.000/dia. 80% desses gastos são preveníveis com adesão medicamentosa.",
                stats: "R$ 15.000 média por internação",
                color: "border-rose-300 bg-rose-50 hover:bg-rose-100"
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                ),
                iconBg: "bg-slate-600",
                title: "Falta de Controle",
                subtitle: "Tratamento Ineficaz",
                description: "Sem monitoramento adequado, o médico não consegue ajustar o tratamento. Resultados inconsistentes comprometem a recuperação.",
                stats: "60% dos tratamentos falham",
                color: "border-slate-300 bg-slate-50 hover:bg-slate-100"
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                ),
                iconBg: "bg-emerald-600",
                title: "Família Desconectada",
                subtitle: "Falta de Comunicação",
                description: "Filhos distantes não sabem como está a saúde dos pais. Informações desencontradas geram conflitos familiares e decisões erradas.",
                stats: "78% das famílias sem comunicação",
                color: "border-emerald-300 bg-emerald-50 hover:bg-emerald-100"
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                iconBg: "bg-indigo-600",
                title: "Perda de Tempo",
                subtitle: "Consultas Improdutivas",
                description: "Médicos perdem tempo tentando entender o histórico. Consultas se tornam ineficientes sem dados organizados e relatórios precisos.",
                stats: "40 min perdidos por consulta",
                color: "border-indigo-300 bg-indigo-50 hover:bg-indigo-100"
              }
            ].map((problem, index) => (
              <div key={index} className={`${problem.color} p-6 rounded-2xl shadow-lg border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-1`}>
                <div className="flex items-start gap-4 mb-4">
                  <div className={`${problem.iconBg} w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg`}>
                    {problem.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      {problem.title}
                    </h3>
                    <div className="text-sm font-semibold text-red-600 mb-2">
                      {problem.subtitle}
                    </div>
                  </div>
                </div>
                
                <p className="text-gray-700 leading-relaxed mb-4 text-sm">
                  {problem.description}
                </p>
                
                <div className="bg-white/60 rounded-lg px-3 py-2 border border-gray-200">
                  <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                    Estatística
                  </div>
                  <div className="text-sm font-bold text-gray-900">
                    {problem.stats}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* 3. Demonstração / Como Funciona */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">COMO O MEU CUIDADOR RESOLVE TUDO ISSO ?</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Em 3 passos simples, sua família estará 100% protegida
            </p>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Cadastre os Medicamentos",
                description: "Em 2 minutos você registra todos os remédios, horários e dosagens. O sistema já vem com uma base de dados completa.",
                icon: Pill,
                color: "from-blue-500 to-blue-600"
              },
              {
                step: "2",
                title: "Receba Lembretes Inteligentes",
                description: "Alertas por WhatsApp, SMS e notificações no app. IMPOSSÍVEL esquecer! O sistema insiste até confirmar que tomou.",
                icon: Bell,
                color: "from-green-500 to-green-600"
              },
              {
                step: "3",
                title: "Monitore em Tempo Real",
                description: "Toda família acompanha pelo app. Relatórios automáticos para levar ao médico. Controle total na palma da mão.",
                icon: BarChart3,
                color: "from-purple-500 to-purple-600"
              }
            ].map((step, index) => {
              const IconComponent = step.icon;
              return (
                <div key={index} className="text-center group">
                  <div className={`w-20 h-20 bg-gradient-to-r ${step.color} rounded-full flex items-center justify-center mb-6 mx-auto shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110`}>
                    <IconComponent className="w-10 h-10 text-white" />
                  </div>
                  <div className="bg-gray-900 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold shadow-md">
                    {step.step}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      {/* Nova Seção - Plataforma Completa com Fundo Animado */}
      <section className="py-24 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white relative overflow-hidden">
        {/* Background Animation - Igual ao Hero */}
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

        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full text-blue-200 text-sm font-medium backdrop-blur-sm mb-6 border border-blue-400/30">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15.586 13H14a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
              SISTEMA DE CUIDADOS MÉDICOS COMPLETO
            </div>
            <h2 className="md:text-6xl font-bold mb-6 text-white text-[50px]">
              Mais de <span className="bg-gradient-to-r from-emerald-400 to-cyan-300 bg-clip-text text-transparent">50 Funcionalidades</span> Integradas
            </h2>
            <p className="text-xl md:text-2xl text-blue-100 max-w-4xl mx-auto leading-relaxed">
              Tudo que você precisa para cuidar da saúde da sua família em uma única plataforma profissional
            </p>
          </div>

          {/* Grid Principal de Funcionalidades - 6 Cards Iguais */}
          <div className="grid lg:grid-cols-3 gap-8 mb-16">
            {[
              {
                title: "Gestão Completa de Medicamentos",
                description: "Sistema inteligente de controle medicamentoso",
                features: [
                  "Cadastro ilimitado de medicamentos com dosagens personalizadas",
                  "Lembretes automáticos por WhatsApp, SMS e notificações push",
                  "Histórico detalhado de tomadas com horários e atrasos",
                  "Controle de eficácia, efeitos colaterais e sintomas",
                  "Relatórios de aderência em tempo real para médicos",
                  "Sistema inteligente que detecta medicamentos perdidos",
                  "Alertas familiares para medicações não tomadas",
                  "Múltiplos horários por medicamento"
                ],
                icon: (
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zM8 6V5a2 2 0 114 0v1H8zm2 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                ),
                gradient: "from-emerald-500 to-teal-600",
                borderColor: "border-emerald-400/30"
              },
              {
                title: "Prescrições e Receitas Médicas",
                description: "Armazenamento seguro de documentos médicos",
                features: [
                  "Upload e salvamento de prescrições médicas (PDF, JPG, PNG)",
                  "Organização automática por data e médico responsável",
                  "Busca inteligente por medicamento ou especialidade",
                  "Compartilhamento seguro com médicos",
                  "Alertas de vencimento de receitas controladas",
                  "Histórico completo de todas as prescrições",
                  "Backup automático na nuvem médica segura",
                  "Acesso offline para emergências médicas"
                ],
                icon: (
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0v12h8V4H6z" clipRule="evenodd" />
                    <path d="M8 7a1 1 0 000 2h4a1 1 0 100-2H8zM8 10a1 1 0 100 2h4a1 1 0 100-2H8z" />
                  </svg>
                ),
                gradient: "from-teal-500 to-cyan-600",
                borderColor: "border-teal-400/30"
              },
              {
                title: "Monitoramento de Sinais Vitais",
                description: "Controle completo dos indicadores de saúde",
                features: [
                  "Controle completo de pressão arterial (sistólica/diastólica)",
                  "Monitoramento de glicose com tipos de medição específicos",
                  "Registro de batimentos cardíacos e frequência",
                  "Controle de temperatura corporal com métodos de medição",
                  "Acompanhamento de peso corporal com tendências",
                  "Gráficos e tendências automáticas por período",
                  "Alertas inteligentes para valores fora dos padrões",
                  "Relatórios médicos com estatísticas detalhadas"
                ],
                icon: (
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ),
                gradient: "from-purple-500 to-pink-600",
                borderColor: "border-purple-400/30"
              },
              {
                title: "Consultas e Exames Médicos",
                description: "Gestão completa do histórico médico",
                features: [
                  "Agendamento inteligente de consultas médicas",
                  "Cadastro completo de exames com resultados",
                  "Upload de laudos, receitas e documentos (PDF, JPG, PNG)",
                  "Histórico médico completo e organizado por especialidade",
                  "Lembretes automáticos de consultas e exames",
                  "Status inteligente: agendado, realizado, cancelado, perdido",
                  "Integração com calendário familiar compartilhado",
                  "Relatórios médicos automatizados para consultas"
                ],
                icon: (
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                ),
                gradient: "from-blue-500 to-indigo-600",
                borderColor: "border-blue-400/30"
              },
              {
                title: "Compartilhamento Inteligente",
                description: "Conecte toda família de forma segura",
                features: [
                  "Sistema de códigos QR para acesso instantâneo e seguro",
                  "5 tipos de perfis: Paciente, Cuidador, Médico, Familiar, Enfermagem",
                  "Cada pessoa vê informações adequadas ao seu perfil específico",
                  "Notificações em tempo real para toda família simultaneamente",
                  "Controle granular de permissões e privacidade por usuário",
                  "Médicos recebem relatórios automáticos profissionais",
                  "Histórico de acesso e atividades por usuário",
                  "Alertas personalizados para cada tipo de perfil"
                ],
                icon: (
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                  </svg>
                ),
                gradient: "from-pink-500 to-rose-600",
                borderColor: "border-pink-400/30"
              },
              {
                title: "Multi-Plataforma",
                description: "App mobile e página web integrados",
                features: [
                  "Aplicativo mobile nativo para Android e iOS",
                  "Página web responsiva para desktop e tablet",
                  "Sincronização automática entre todos os dispositivos",
                  "Acesso offline com sincronização inteligente",
                  "Interface adaptativa para cada tipo de tela",
                  "Notificações push em todos os dispositivos",
                  "Backup automático na nuvem médica segura",
                  "Suporte técnico 24/7 para qualquer plataforma"
                ],
                icon: (
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd" />
                  </svg>
                ),
                gradient: "from-indigo-500 to-purple-600",
                borderColor: "border-indigo-400/30"
              }
            ].map((category, index) => (
              <div key={index} className={`bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-3xl p-8 border ${category.borderColor} hover:from-white/15 hover:to-white/10 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl`}>
                <div className={`w-16 h-16 bg-gradient-to-r ${category.gradient} rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg`}>
                  {category.icon}
                </div>
                <h3 className="text-2xl font-bold mb-3 text-white">
                  {category.title}
                </h3>
                <p className="text-blue-200 mb-6 text-sm">
                  {category.description}
                </p>
                <ul className="space-y-2 text-blue-100">
                  {category.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start text-sm">
                      <div className="w-1.5 h-1.5 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <span className="leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Seção de Relatórios e Inteligência Médica */}
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-3xl p-8 border border-orange-400/30 hover:from-white/15 hover:to-white/10 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl mb-16">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-xl px-4 py-2 border border-green-400/30">
                <div className="text-emerald-300 text-sm font-bold flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  VOCÊ É MÉDICO? VERSÃO EXCLUSIVA PARA PROFISSIONAIS
                </div>
              </div>
            </div>
            
            <h3 className="text-3xl font-bold mb-4 text-white">
              Dashboard Médico Profissional + Clínicas Conectadas
            </h3>
            <p className="text-blue-200 mb-6 text-lg">
              <strong>Sistema médico completo</strong> que conecta diretamente você ao paciente com relatórios profissionais em tempo real
            </p>

            {/* Destaque para Médicos */}
            <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl p-6 mb-6 border border-blue-400/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white">Dashboard Exclusivo para Médicos e Clínicas</h4>
                  <p className="text-blue-200">Acompanhe todos os seus pacientes em tempo real com tecnologia médica avançada</p>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex items-start text-blue-100">
                    <div className="w-2 h-2 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full mt-1.5 mr-3 flex-shrink-0"></div>
                    <span><strong>Visão Unificada:</strong> Todos os pacientes em um só dashboard médico</span>
                  </div>
                  <div className="flex items-start text-blue-100">
                    <div className="w-2 h-2 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full mt-1.5 mr-3 flex-shrink-0"></div>
                    <span><strong>Conexão Direta:</strong> Link direto entre médico-paciente via código QR</span>
                  </div>
                  <div className="flex items-start text-blue-100">
                    <div className="w-2 h-2 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full mt-1.5 mr-3 flex-shrink-0"></div>
                    <span><strong>Alertas Médicos:</strong> Notificações instantâneas sobre aderência crítica</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start text-blue-100">
                    <div className="w-2 h-2 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full mt-1.5 mr-3 flex-shrink-0"></div>
                    <span><strong>Gestão de Clínica:</strong> Múltiplos médicos, centenas de pacientes organizados</span>
                  </div>
                  <div className="flex items-start text-blue-100">
                    <div className="w-2 h-2 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full mt-1.5 mr-3 flex-shrink-0"></div>
                    <span><strong>Relatórios Clínicos:</strong> Estatísticas da clínica e performance por médico</span>
                  </div>
                  <div className="flex items-start text-blue-100">
                    <div className="w-2 h-2 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full mt-1.5 mr-3 flex-shrink-0"></div>
                    <span><strong>CRM Integrado:</strong> Sistema médico completo para sua prática</span>
                  </div>
                </div>
              </div>
            </div>

            
          </div>

        </div>
      </section>
      {/* Nova Seção - Estatísticas e Números */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-6 py-3 bg-blue-100 rounded-full text-blue-700 text-sm font-medium mb-6">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15.586 13H14a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
              RESULTADOS COMPROVADOS
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Números que <span className="text-blue-600">Comprovam a Eficácia</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
              Mais de 18.000 famílias já transformaram o cuidado da saúde com nossa plataforma
            </p>
          </div>

          {/* Grid de Estatísticas */}
          <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-8 mb-16">
            {[
              {
                number: "18.247",
                label: "Famílias Protegidas",
                icon: (
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                  </svg>
                ),
                color: "from-blue-500 to-blue-600",
                bgColor: "bg-blue-50",
                textColor: "text-blue-600"
              },
              {
                number: "97%",
                label: "Aderência ao Tratamento",
                icon: (
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ),
                color: "from-green-500 to-green-600",
                bgColor: "bg-green-50",
                textColor: "text-green-600"
              },
              {
                number: "84%",
                label: "Redução de Internações",
                icon: (
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                  </svg>
                ),
                color: "from-red-500 to-red-600",
                bgColor: "bg-red-50",
                textColor: "text-red-600"
              },
              {
                number: "4.9/5",
                label: "Avaliação dos Usuários",
                icon: (
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ),
                color: "from-yellow-500 to-orange-600",
                bgColor: "bg-yellow-50",
                textColor: "text-orange-600"
              }
            ].map((stat, index) => (
              <div key={index} className={`${stat.bgColor} rounded-3xl p-8 text-center hover:shadow-lg transition-all duration-300 transform hover:-translate-y-2`}>
                <div className={`w-16 h-16 bg-gradient-to-r ${stat.color} rounded-2xl flex items-center justify-center text-white mx-auto mb-6 shadow-lg`}>
                  {stat.icon}
                </div>
                <div className={`text-4xl font-bold ${stat.textColor} mb-2`}>
                  {stat.number}
                </div>
                <div className="text-gray-600 font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Seção de Benefícios Adicionais */}
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-3xl p-8 md:p-12">
            <div className="text-center mb-12">
              <h3 className="text-3xl font-bold text-gray-900 mb-4">
                Por Que Milhares de Famílias Escolheram o Meu Cuidador?
              </h3>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Veja os principais motivos que fazem nossa plataforma ser a escolha #1 para cuidados de saúde
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  title: "Simplicidade Extrema",
                  description: "Interface pensada para todas as idades. Sua avó de 80 anos consegue usar sem dificuldade.",
                  icon: (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ),
                  color: "text-green-600"
                },
                {
                  title: "Suporte Humanizado",
                  description: "Equipe especializada 24/7 pronta para ajudar você por WhatsApp, telefone ou chat.",
                  icon: (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                    </svg>
                  ),
                  color: "text-blue-600"
                },
                {
                  title: "Resultados Garantidos",
                  description: "7 dias de garantia total. Se não melhorar sua qualidade de vida, devolvemos seu dinheiro.",
                  icon: (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ),
                  color: "text-purple-600"
                }
              ].map((benefit, index) => (
                <div key={index} className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className={`w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center ${benefit.color} mb-4`}>
                    {benefit.icon}
                  </div>
                  <h4 className="text-xl font-bold text-gray-900 mb-3">
                    {benefit.title}
                  </h4>
                  <p className="text-gray-600 leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      {/* 4. Prova Social - Depoimentos */}
      <section className="py-24 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white relative overflow-hidden">
        {/* Background Animation - Igual ao Hero */}
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

        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full text-blue-200 text-sm font-medium backdrop-blur-sm mb-6 border border-blue-400/30">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15.586 13H14a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
              DEPOIMENTOS REAIS DE FAMÍLIAS
            </div>
            <h2 className="md:text-5xl font-bold mb-6 text-white text-[50px]">
              VEJA O QUE <span className="bg-gradient-to-r from-emerald-400 to-cyan-300 bg-clip-text text-transparent">NOSSOS CLIENTES </span><br className="md:hidden" />ESTÃO DIZENDO
            </h2>
            <p className="text-xl md:text-2xl text-blue-100 max-w-4xl mx-auto leading-relaxed">
              +15.000 famílias já protegidas. Veja os resultados reais:
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                text: "Meu pai tem 78 anos e diabetes. Antes do Meu Cuidador, ele internava 3x por ano por esquecer insulina. Agora há 8 meses sem nenhuma crise! Valeu cada centavo.",
                author: "Maria Santos",
                role: "Filha cuidadora",
                city: "São Paulo, SP",
                result: "8 meses sem internação",
                avatar: "MS",
                gradient: "from-emerald-500 to-teal-600",
                borderColor: "border-emerald-400/30"
              },
              {
                text: "Como médico, vejo a diferença nos meus pacientes que usam o app. Os relatórios são incríveis, consigo ajustar tratamentos com precisão. Recomendo para todos!",
                author: "Dr. João Carvalho",
                role: "Cardiologista - CRM 12345",
                city: "Rio de Janeiro, RJ",
                result: "90% melhora na aderência",
                avatar: "JC",
                gradient: "from-blue-500 to-indigo-600",
                borderColor: "border-blue-400/30"
              },
              {
                text: "Cuidava da minha sogra e vivia estressada. Com o app, toda família acompanha à distância. Ela nunca mais esqueceu remédio e eu durmo tranquila!",
                author: "Ana Costa",
                role: "Cuidadora familiar",
                city: "Belo Horizonte, MG",
                result: "100% aderência em 6 meses",
                avatar: "AC",
                gradient: "from-purple-500 to-pink-600",
                borderColor: "border-purple-400/30"
              }
            ].map((testimonial, index) => (
              <div key={index} className={`bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-3xl p-8 border ${testimonial.borderColor} hover:from-white/15 hover:to-white/10 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl relative flex flex-col h-full`}>
                <div className="flex items-center mb-6">
                  <div className={`w-16 h-16 bg-gradient-to-r ${testimonial.gradient} rounded-2xl flex items-center justify-center text-white font-bold text-lg mr-4 shadow-lg`}>
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-bold text-white text-lg">{testimonial.author}</div>
                    <div className="text-sm text-blue-200">{testimonial.role}</div>
                    <div className="text-sm text-blue-300">{testimonial.city}</div>
                  </div>
                </div>
                <p className="text-blue-100 mb-6 italic text-lg leading-relaxed flex-grow">
                  "{testimonial.text}"
                </p>
                <div className="bg-gradient-to-r from-emerald-500/20 to-green-500/20 backdrop-blur-sm border border-emerald-400/30 text-emerald-300 px-4 py-3 rounded-xl text-sm font-semibold mt-auto">
                  🏆 Resultado: {testimonial.result}
                </div>
                <div className="absolute -top-2 -left-2 text-emerald-400 text-6xl opacity-20">"</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* 5. Autoridade / Garantias */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">SUA ASSINATURA 100% PROTEGIDA</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {[
              {
                icon: Shield,
                title: "Garantia de 7 Dias",
                description: "Não ficou satisfeito? Devolvemos 100% do seu dinheiro sem perguntas.",
                color: "text-green-600"
              },
              {
                icon: Stethoscope,
                title: "Aprovado por Médicos",
                description: "Desenvolvido com profissionais da saúde. Segue padrões médicos internacionais.",
                color: "text-blue-600"
              },
              {
                icon: Lock,
                title: "Dados Protegidos",
                description: "Certificação SSL e LGPD. Seus dados médicos ficam 100% seguros e privados.",
                color: "text-orange-600"
              },
              {
                icon: Headphones,
                title: "Suporte 24/7",
                description: "Equipe especializada te ajuda a qualquer hora por WhatsApp, email ou telefone.",
                color: "text-purple-600"
              }
            ].map((guarantee, index) => {
              const IconComponent = guarantee.icon;
              return (
                <div key={index} className="bg-gray-50 p-6 rounded-xl hover:bg-white hover:shadow-lg transition-all duration-300 group">
                  <div className="flex justify-center mb-4">
                    <IconComponent className={`w-12 h-12 ${guarantee.color} group-hover:scale-110 transition-transform duration-300`} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                    {guarantee.title}
                  </h3>
                  <p className="text-gray-600">
                    {guarantee.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      {/* 6. Planos e Investimento */}
      <section className="py-20 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white relative overflow-hidden">
        {/* Background Animation */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Medical Cross Elements */}
          <div className="absolute animate-float-slow top-20 left-20 w-10 h-10 opacity-15">
            <div className="w-full h-2 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full absolute top-1/2 transform -translate-y-1/2"></div>
            <div className="w-2 h-full bg-gradient-to-b from-blue-400 to-blue-600 rounded-full absolute left-1/2 transform -translate-x-1/2"></div>
          </div>
          
          {/* Heartbeat Wave */}
          <div className="absolute animate-float-medium top-1/3 right-16 w-20 h-6 opacity-20">
            <svg viewBox="0 0 100 32" className="w-full h-full fill-none stroke-green-400 stroke-2">
              <path d="M0,16 L20,16 L25,8 L30,24 L35,4 L40,28 L45,16 L100,16" />
            </svg>
          </div>
          
          {/* Pill Capsule Shape */}
          <div className="absolute animate-float-fast bottom-32 left-1/4 w-12 h-6 opacity-15">
            <div className="w-full h-full bg-gradient-to-r from-red-300 to-blue-300 rounded-full"></div>
          </div>
          
          {/* DNA Helix */}
          <div className="absolute animate-float-reverse top-1/4 left-1/2 w-6 h-16 opacity-20">
            <svg viewBox="0 0 32 80" className="w-full h-full fill-none stroke-purple-400 stroke-2">
              <path d="M8,0 Q16,10 24,20 Q16,30 8,40 Q16,50 24,60 Q16,70 8,80" />
              <path d="M24,0 Q16,10 8,20 Q16,30 24,40 Q16,50 8,60 Q16,70 24,80" />
            </svg>
          </div>
          
          {/* Stethoscope Circle */}
          <div className="absolute animate-float-slow bottom-20 right-20 w-12 h-12 opacity-15">
            <div className="w-full h-full border-3 border-blue-400 rounded-full relative">
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-blue-400 rounded-full"></div>
            </div>
          </div>
          
          {/* Medical Shield */}
          <div className="absolute animate-float-medium top-2/3 left-12 w-8 h-10 opacity-15">
            <svg viewBox="0 0 32 40" className="w-full h-full fill-cyan-400">
              <path d="M16,0 L28,8 L28,24 Q28,32 16,40 Q4,32 4,24 L4,8 Z" />
              <path d="M16,8 L12,16 L16,24 L20,16 Z" fill="white" />
            </svg>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-6">
              Investimento em Saúde e Tranquilidade
            </h2>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Escolha o plano ideal para proteger sua família com tecnologia médica avançada
            </p>
          </div>

          <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-8 max-w-7xl mx-auto">
            {/* Plano Essencial */}
            <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 hover:bg-white/15 transition-all duration-300 flex flex-col relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <div className="bg-blue-400 text-white px-6 py-2 rounded-full text-sm font-bold">
                  INICIAL
                </div>
              </div>
              
              <div className="text-center mb-8 mt-4">
                <h3 className="text-2xl font-bold mb-2 text-blue-200">Plano Essencial</h3>
                <p className="text-blue-100 mb-6">Para famílias que estão começando</p>
                <div className="mb-4">
                  <div className="text-lg mb-2">De: <span className="line-through text-red-300">R$ 97,00/mês</span></div>
                  <div className="text-4xl font-bold mb-2">R$ 29,90<span className="text-xl">/mês</span></div>
                  <div className="text-blue-200">ou 12x de R$ 2,49 no cartão</div>
                </div>
              </div>
              
              <div className="space-y-4 mb-8 flex-grow">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span>Gestão completa de medicamentos</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span>Lembretes por WhatsApp ilimitados</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span>Controle de sinais vitais</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span>Relatórios médicos básicos</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span>Suporte por chat</span>
                </div>
              </div>

              <Link 
                href="/register" 
                className="w-full block text-center px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 font-bold rounded-xl transition-all duration-300 hover:-translate-y-1 shadow-lg text-white hover:text-white mt-auto"
              >
                Começar Cuidado Essencial
              </Link>
            </div>

            {/* Plano Premium */}
            <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 backdrop-blur-lg rounded-3xl p-8 border-2 border-yellow-400/50 relative hover:border-yellow-400/70 transition-all duration-300 flex flex-col">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <div className="bg-yellow-400 text-black px-6 py-2 rounded-full text-sm font-bold">
                  MAIS POPULAR
                </div>
              </div>
              
              <div className="text-center mb-8 mt-4">
                <h3 className="text-2xl font-bold mb-2 text-yellow-400">Plano Premium</h3>
                <p className="text-blue-100 mb-6">Para cuidado médico completo</p>
                <div className="mb-4">
                  <div className="text-lg mb-2">De: <span className="line-through text-red-300">R$ 197,00/mês</span></div>
                  <div className="text-4xl font-bold mb-2">R$ 59,90<span className="text-xl">/mês</span></div>
                  <div className="text-blue-200">ou 12x de R$ 4,99 no cartão</div>
                </div>
              </div>
              
              <div className="space-y-4 mb-8 flex-grow">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-yellow-100">Tudo do plano Essencial +</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span>Relatórios médicos avançados</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span>Consulta personalizada de 1 hora</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span>Suporte prioritário 24/7</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span>Grupo VIP no WhatsApp</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span>E-book "Guia Completo do Cuidador"</span>
                </div>
              </div>

              <Link 
                href="/register" 
                className="w-full block text-center px-8 py-4 bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 font-bold rounded-xl transition-all duration-300 hover:-translate-y-1 shadow-lg text-white hover:text-white mt-auto"
              >
                Começar Cuidado Premium
              </Link>
            </div>

            {/* Plano Médico Profissional */}
            <div className="bg-gradient-to-br from-purple-600/20 to-indigo-600/20 backdrop-blur-lg rounded-3xl p-8 border-2 border-purple-400/50 relative hover:border-purple-400/70 transition-all duration-300 flex flex-col">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <div className="bg-purple-400 text-white px-6 py-2 rounded-full text-sm font-bold">
                  PARA MÉDICOS
                </div>
              </div>
              
              <div className="text-center mb-8 mt-4">
                <h3 className="text-2xl font-bold mb-2 text-purple-400">Plano Profissional</h3>
                <p className="text-blue-100 mb-6">Para médicos e clínicas</p>
                <div className="mb-4">
                  <div className="text-lg mb-2">De: <span className="line-through text-red-300">R$ 297,00/mês</span></div>
                  <div className="text-4xl font-bold mb-2">R$ 129,90<span className="text-xl">/mês</span></div>
                  <div className="text-blue-200">ou 12x de R$ 10,83 no cartão</div>
                </div>
              </div>
              
              <div className="space-y-4 mb-8 flex-grow">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-purple-400 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-purple-100">Tudo dos planos anteriores +</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-purple-400 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span>Dashboard médico profissional</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-purple-400 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span>Gestão de múltiplos pacientes</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-purple-400 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span>Relatórios clínicos avançados</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-purple-400 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span>Conexão direta médico-paciente</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-purple-400 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span>Alertas médicos em tempo real</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-purple-400 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span>Suporte técnico prioritário</span>
                </div>
              </div>

              <Link 
                href="/register" 
                className="w-full block text-center px-8 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 font-bold rounded-xl transition-all duration-300 hover:-translate-y-1 shadow-lg text-white hover:text-white mt-auto"
              >
                Começar Plano Médico
              </Link>
            </div>
          </div>

          
        </div>
      </section>
      {/* 7. FAQ */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              ❓ PERGUNTAS FREQUENTES
            </h2>
            <p className="text-xl text-gray-600">
              Tire suas dúvidas antes de começar
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                question: "Como funciona o sistema de lembretes?",
                answer: "O Meu Cuidador envia lembretes via WhatsApp, SMS e notificações no app nos horários exatos. Se não confirmar em 15 minutos, o sistema insiste enviando novos alertas e notificando familiares até garantir que o medicamento foi tomado."
              },
              {
                question: "Posso acompanhar meus pais à distância?",
                answer: "Sim! Você pode conectar toda a família no mesmo perfil. Quando seu pai tomar um remédio, você recebe confirmação instantânea. Se ele esquecer, você é notificado imediatamente para poder ligar e lembrar dele."
              },
              {
                question: "E se eu não souber usar tecnologia?",
                answer: "O app foi desenvolvido para ser extremamente simples. Além disso, oferecemos consultoria personalizada de 1 hora para configurar tudo para você. Nossa equipe de suporte também está disponível 24/7 via WhatsApp para qualquer dúvida."
              },
              {
                question: "Funciona para quantos medicamentos?",
                answer: "Sem limite! Você pode cadastrar quantos medicamentos, horários e dosagens precisar. O sistema gerencia tudo automaticamente, desde 1 remédio até tratamentos complexos com 20+ medicamentos diários."
              },
              {
                question: "Como é o processo de cancelamento?",
                answer: "Sem burocracia! Pode cancelar a qualquer momento direto no app ou por WhatsApp. Não há fidelidade nem multa. Se cancelar nos primeiros 7 dias, devolvemos 100% do valor pago."
              },
              {
                question: "Meus dados ficam seguros?",
                answer: "Absolutamente! Utilizamos criptografia SSL de nível bancário e seguimos rigorosamente a LGPD. Seus dados médicos ficam protegidos em servidores seguros e nunca são compartilhados com terceiros."
              }
            ].map((faq, index) => (
              <div key={index} className="bg-white rounded-xl shadow-md overflow-hidden">
                <button
                  className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 focus:outline-none"
                  onClick={() => setFaqOpen(faqOpen === index ? null : index)}
                >
                  <span className="font-semibold text-gray-900">{faq.question}</span>
                  <span className="text-2xl text-gray-400">
                    {faqOpen === index ? '−' : '+'}
                  </span>
                </button>
                {faqOpen === index && (
                  <div className="px-6 pb-4 text-gray-600 leading-relaxed">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* 9. Chamada para Ação Final */}
      <section className="py-24 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white relative overflow-hidden pt-[40px] pb-[40px]">
        {/* Background Animation - Elementos Médicos */}
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
          
          {/* Medical Shield */}
          <div className="absolute animate-float-medium bottom-24 left-1/4 w-12 h-14 opacity-25">
            <svg viewBox="0 0 48 56" className="w-full h-full fill-green-400/60">
              <path d="M24,0 L40,8 L40,28 Q40,44 24,56 Q8,44 8,28 L8,8 Z" />
              <path d="M24,12 L32,16 L32,28 Q32,36 24,44 Q16,36 16,28 L16,16 Z" fill="white" />
            </svg>
          </div>
          
          {/* Stethoscope Circle */}
          <div className="absolute animate-float-slow bottom-12 right-12 w-14 h-14 opacity-20">
            <div className="w-full h-full border-4 border-blue-400 rounded-full relative">
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-blue-400 rounded-full"></div>
            </div>
          </div>
          
          {/* Additional Medical Elements */}
          <div className="absolute animate-float-fast top-1/5 right-1/5 w-10 h-10 opacity-20">
            <div className="w-full h-full bg-gradient-to-br from-indigo-300 to-purple-400 rounded-lg transform rotate-45"></div>
          </div>
          
          <div className="absolute animate-float-reverse bottom-1/5 left-2/3 w-6 h-6 opacity-25">
            <div className="w-full h-full bg-gradient-to-br from-green-400 to-teal-400 rounded-full"></div>
          </div>
        </div>
        
        <div className="max-w-6xl mx-auto text-center px-4 relative z-10">
          <div className="mb-8">
            <div className="inline-flex items-center px-6 py-3 bg-red-500/20 rounded-full text-red-300 text-lg font-bold backdrop-blur-sm animate-pulse mb-6">
              <span className="mr-2">🚨</span>
              AÇÃO URGENTE NECESSÁRIA
            </div>
            
            <h2 className="md:text-5xl lg:text-6xl font-bold mb-6 text-[50px]">
              Proteja Sua Família 
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-300 bg-clip-text text-transparent"> Hoje Mesmo</span>
            </h2>
            
            <p className="text-xl md:text-2xl opacity-90 leading-relaxed max-w-4xl mx-auto">
              Cada minuto que passa é um risco a mais para quem você ama. 
              <strong> Não deixe o tempo decidir por você!</strong>
            </p>
          </div>
          
          {/* Cards Profissionais com Estatísticas */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="text-3xl font-bold text-green-400 mb-2">95%</div>
              <div className="text-lg font-semibold mb-2">Aderência Garantida</div>
              <div className="text-sm opacity-80">Famílias que nunca mais esqueceram medicamentos</div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="text-3xl font-bold text-blue-400 mb-2">24/7</div>
              <div className="text-lg font-semibold mb-2">Monitoramento</div>
              <div className="text-sm opacity-80">Proteção contínua para toda família</div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="text-3xl font-bold text-purple-400 mb-2">R$ 15k</div>
              <div className="text-lg font-semibold mb-2">Economia Média</div>
              <div className="text-sm opacity-80">Evitando internações e emergências</div>
            </div>
          </div>

          {/* Call to Action Buttons */}
          <div className="flex flex-col gap-6 mb-8">
            <Link 
              href="/register" 
              className="inline-block px-12 py-6 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white hover:text-white font-bold rounded-xl transition-all duration-300 hover:-translate-y-2 shadow-2xl pulse-animation pl-[0px] pr-[0px] pt-[4px] pb-[4px] text-[20px]"
            >
              Começar Agora - Acesso Imediato
              <div className="text-lg mt-2 opacity-90">7 dias grátis • Sem compromisso</div>
            </Link>
          </div>

          
        </div>
      </section>
      {/* 10. Rodapé Profissional */}
      <footer className="text-white py-12 bg-[#16295c]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <LogoIcon size={40} className="mr-3" />
                <span className="text-xl font-bold">Meu Cuidador</span>
              </div>
              <p className="text-gray-400 mb-4">
                A plataforma mais completa para cuidar da saúde da sua família com tecnologia e carinho.
              </p>
              <div className="text-gray-400 text-sm">
                <div>CNPJ: 00.000.000/0001-00</div>
                <div>Certificado SSL • LGPD Compliant</div>
              </div>
            </div>
            <div>
              <h4 className="text-green-500 text-lg font-semibold mb-4">Produto</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Gestão de Medicamentos</li>
                <li>Consultas e Exames</li>
                <li>Sinais Vitais</li>
                <li>Relatórios Médicos</li>
                <li>Lembretes Inteligentes</li>
                <li>App Mobile</li>
              </ul>
            </div>
            <div>
              <h4 className="text-green-500 text-lg font-semibold mb-4">Suporte</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Central de Ajuda</li>
                <li>WhatsApp: (11) 99999-9999</li>
                <li>Email: suporte@meucuidador.com.br</li>
                <li>Chat Online 24/7</li>
                <li>Tutoriais em Vídeo</li>
                <li>FAQ Completo</li>
              </ul>
            </div>
            <div>
              <h4 className="text-green-500 text-lg font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Termos de Uso</a></li>
                <li><a href="#" className="hover:text-white">Política de Privacidade</a></li>
                <li><a href="#" className="hover:text-white">LGPD</a></li>
                <li><a href="#" className="hover:text-white">Política de Reembolso</a></li>
                <li><a href="#" className="hover:text-white">Contrato de Prestação</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 pb-4 text-center text-gray-400">
            <p>&copy; 2025 Meu Cuidador. Todos os direitos reservados.</p>
            <p className="mt-2 text-sm">Este produto não substitui orientação médica profissional.</p>
          </div>
        </div>
      </footer>
      <style>{`
        .pulse-animation {
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
          }
          70% {
            transform: scale(1.05);
            box-shadow: 0 0 0 10px rgba(34, 197, 94, 0);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
          }
        }

        @keyframes infiniteScroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.333%);
          }
        }

        .animate-infinite-scroll:hover {
          animation-play-state: paused;
        }

        .animate-infinite-scroll {
          will-change: transform;
        }

        /* Animações dos elementos médicos flutuantes */
        @keyframes float-slow {
          0%, 100% {
            transform: translate(0, 0) rotate(0deg);
            opacity: 0.2;
          }
          33% {
            transform: translate(20px, -15px) rotate(5deg);
            opacity: 0.3;
          }
          66% {
            transform: translate(-10px, -25px) rotate(-3deg);
            opacity: 0.25;
          }
        }

        @keyframes float-medium {
          0%, 100% {
            transform: translateY(0px) scale(1);
            opacity: 0.25;
          }
          50% {
            transform: translateY(-20px) scale(1.1);
            opacity: 0.35;
          }
        }

        @keyframes float-fast {
          0%, 100% {
            transform: translate(0, 0) rotate(0deg);
            opacity: 0.2;
          }
          25% {
            transform: translate(15px, -10px) rotate(90deg);
            opacity: 0.3;
          }
          50% {
            transform: translate(30px, 0px) rotate(180deg);
            opacity: 0.25;
          }
          75% {
            transform: translate(15px, 10px) rotate(270deg);
            opacity: 0.3;
          }
        }

        @keyframes float-reverse {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            opacity: 0.25;
          }
          50% {
            transform: translate(-25px, 15px) scale(1.2);
            opacity: 0.35;
          }
        }

        .animate-float-slow {
          animation: float-slow 12s ease-in-out infinite;
        }

        .animate-float-medium {
          animation: float-medium 8s ease-in-out infinite;
        }

        .animate-float-fast {
          animation: float-fast 6s linear infinite;
        }

        .animate-float-reverse {
          animation: float-reverse 10s ease-in-out infinite reverse;
        }

        /* Garantir que a página ocupe toda a altura sem espaços extras */
        html, body {
          height: 100%;
          margin: 0;
          padding: 0;
          overflow-x: hidden;
        }

        /* Remover espaçamentos extras do container principal */
        .min-h-screen {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        /* Garantir que o footer seja o último elemento sem espaços */
        footer {
          margin-top: auto;
          margin-bottom: 0 !important;
          padding-bottom: 0 !important;
        }
      `}</style>
      </div>
    </div>
  );
}
