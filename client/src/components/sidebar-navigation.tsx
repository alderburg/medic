import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { usePatient } from "@/contexts/patient-context";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  Home, 
  Pill, 
  Calendar, 
  FileText, 
  TestTube,
  BarChart3,
  Activity,
  LogOut,
  Menu,
  FlaskConical,
  Settings,
  ChevronDown,
  ChevronRight,
  FileUser,
  ClipboardCheck,
  Shield,
  Building2,
  CreditCard,
  Wallet
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { LogoIcon } from "@/components/logo";
import { cn } from "@/lib/utils";

const navigationItems = [
  {
    title: "Dashboard",
    href: "/home",
    icon: BarChart3,
    color: "text-purple-600",
    doctorOnly: true
  },
  {
    title: "Início",
    href: "/home",
    icon: Home,
    color: "text-blue-600",
    patientOnly: true
  },
  {
    title: "Medicamentos",
    href: "/medications",
    icon: Pill,
    color: "text-emerald-600"
  },
  {
    title: "Consultas",
    href: "/appointments",
    icon: Calendar,
    color: "text-cyan-600"
  },
  {
    title: "Exames",
    href: "/tests",
    icon: FlaskConical,
    color: "text-yellow-600"
  },
  {
    title: "Receitas",
    href: "/prescriptions",
    icon: ClipboardCheck,
    color: "text-cyan-600"
  }
];





export function SidebarNavigation() {
  const { user, logout } = useAuth();
  const { selectedPatient } = usePatient();
  const { toast } = useToast();
  const [location, navigate] = useLocation();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [visaoGeralExpanded, setVisaoGeralExpanded] = useState(true);
  const [gerencialExpanded, setGerencialExpanded] = useState(false);

  const isActive = (href: string) => {
    if (href === "/home") {
      return location === "/home" || location === "/";
    }

    if (href === "/visao-geral") {
      return location === "/visao-geral";
    }

    // Para document viewer, detectar baseado no tipo de documento
    if (location.includes('/document-viewer/')) {
      const documentViewerMatch = location.match(/\/document-viewer\/([^\/]+)\//);
      if (documentViewerMatch) {
        const documentType = documentViewerMatch[1];
        if (documentType === 'prescription' && href === '/prescriptions') {
          return true;
        }
        if (documentType === 'test' && href === '/tests') {
          return true;
        }
      }
    }

    return location.startsWith(href);
  };

  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getProfileTypeName = (type: string) => {
    const types = {
      patient: "Paciente",
      caregiver: "Cuidador(a)",
      doctor: user?.gender === 'feminino' ? "Médica" : "Médico",
      family: "Familiar",
      nurse: "Enfermagem"
    };
    return types[type as keyof typeof types] || type;
  };

  return (
    <div className={`flex h-full flex-col bg-white border-r border-gray-200 transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-center px-3 py-6 border-b border-gray-200 relative pt-[21px] pb-[21px]">
        <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
          <LogoIcon size={40} />
          {!isCollapsed && (
            <div>
              <h1 className="text-xl font-bold text-gray-900">Meu Cuidador</h1>
              <p className="text-xs text-gray-500">Cuidando da sua saúde!</p>
            </div>
          )}
        </div>
        {!isCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-500 hover:text-gray-700 absolute -right-4 top-1/2 transform -translate-y-1/2 bg-white border border-gray-200 rounded-full shadow-md z-10"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            <Menu className="h-4 w-4" />
          </Button>
        )}
        {isCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-500 hover:text-gray-700 absolute -right-4 top-1/2 transform -translate-y-1/2 bg-white border border-gray-200 rounded-full shadow-md z-10"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            <Menu className="h-4 w-4" />
          </Button>
        )}
      </div>
      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-1">
          {/* Main Navigation */}
          {user?.profileType === 'doctor' ? (
            /* Menu para Médicos */
            <div className="space-y-1">
              {/* Item Inicio para Médicos */}
              <Link href="/home">
                <Button
                  variant={isActive("/home") ? "secondary" : "ghost"}
                  className={`w-full gap-3 h-10 ${
                    isCollapsed ? 'justify-center px-0' : 'justify-start'
                  } ${
                    isActive("/home") 
                      ? "bg-blue-50 text-blue-700 font-medium" 
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                  title={isCollapsed ? "Inicio" : undefined}
                >
                  <Home className={`h-4 w-4 ${isActive("/home") ? "text-blue-600" : "text-blue-600"}`} />
                  {!isCollapsed && "Inicio"}
                </Button>
              </Link>

              {/* Menu Gerencial */}
              <Button
                variant="ghost"
                className={`w-full gap-3 h-10 justify-start text-gray-700 hover:bg-gray-50 cursor-pointer ${
                  isCollapsed ? 'justify-center px-0' : ''
                }`}
                onClick={() => setGerencialExpanded(!gerencialExpanded)}
                title={isCollapsed ? "Gerencial" : undefined}
              >
                <Building2 className="h-4 w-4 text-purple-600 transition-colors" />
                {!isCollapsed && (
                  <div className="flex-1 text-left">
                    <div className="flex items-center justify-between">
                      <span>Gerencial</span>
                      {gerencialExpanded ? (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  </div>
                )}
              </Button>

              {/* Submenus do Gerencial - sempre visíveis quando expandido */}
              {gerencialExpanded && !isCollapsed && (
                <div className="ml-6 space-y-1 border-l border-gray-200 pl-3">
                  {/* Convênios dentro do Gerencial */}
                  <Link href="/convenios">
                    <Button
                      variant={isActive("/convenios") ? "secondary" : "ghost"}
                      className={`w-full gap-3 h-9 justify-start text-sm ${
                        isActive("/convenios") 
                          ? "bg-blue-50 text-blue-700 font-medium" 
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <CreditCard className={`h-3.5 w-3.5 ${isActive("/convenios") ? "text-blue-600" : "text-emerald-600"}`} />
                      Convênios
                    </Button>
                  </Link>

                  {/* Formas de Pagamento dentro do Gerencial */}
                  <Link href="/formas-pagamento">
                    <Button
                      variant={isActive("/formas-pagamento") ? "secondary" : "ghost"}
                      className={`w-full gap-3 h-9 justify-start text-sm ${
                        isActive("/formas-pagamento") 
                          ? "bg-blue-50 text-blue-700 font-medium" 
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <Wallet className={`h-3.5 w-3.5 ${isActive("/formas-pagamento") ? "text-blue-600" : "text-orange-600"}`} />
                      Formas de Pagamento
                    </Button>
                  </Link>
                </div>
              )}

              {/* Cabeçalho do Prontuário */}
              <Button
                variant="ghost"
                className={`w-full gap-3 h-10 justify-start group ${
                  selectedPatient 
                    ? "text-gray-700 hover:bg-gray-50 cursor-pointer" 
                    : "text-gray-400 cursor-pointer hover:text-black"
                }`}
                onClick={selectedPatient ? () => setVisaoGeralExpanded(!visaoGeralExpanded) : () => {
                  // Focar no input de pesquisa da barra superior
                  if ((window as any).focusPatientSearch) {
                    (window as any).focusPatientSearch();
                  }
                }}
                title={isCollapsed ? (selectedPatient ? "Prontuário" : "Selecione um paciente") : undefined}
              >
                <FileUser className={`h-4 w-4 ${selectedPatient ? "text-indigo-600" : "text-gray-400 group-hover:text-black"} transition-colors`} />
                {!isCollapsed && (
                  <div className="flex-1 text-left">
                    <div className="flex items-center justify-between">
                      <span className={`${!selectedPatient ? "group-hover:text-black transition-colors" : ""}`}>Prontuário</span>
                      {selectedPatient && (
                        visaoGeralExpanded ? (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        )
                      )}
                    </div>
                    {!selectedPatient && (
                      <div className="text-xs text-gray-400 mt-0.5 group-hover:text-black transition-colors">Selecione um paciente</div>
                    )}
                  </div>
                )}
              </Button>

              {/* Submenus do Prontuário - só aparecem se paciente selecionado e expandido */}
              {selectedPatient && visaoGeralExpanded && !isCollapsed && (
                <div className="ml-6 space-y-1 border-l border-gray-200 pl-3">
                  {/* Visão Geral do Paciente */}
                  <Button
                    variant={isActive("/visao-geral") ? "secondary" : "ghost"}
                    className={`w-full gap-3 h-9 justify-start text-sm ${
                      isActive("/visao-geral") 
                        ? "bg-blue-50 text-blue-700 font-medium" 
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                    onClick={() => {
                      console.log("🔄 Clique na Visão Geral do Prontuário - navegando para /visao-geral (Home do Paciente)");
                      console.log("🔍 Estado atual:", { 
                        selectedPatient: selectedPatient?.id, 
                        currentLocation: location,
                        userType: user?.profileType 
                      });
                      
                      // Só navegar se há paciente selecionado
                      if (selectedPatient) {
                        // Evitar navegação desnecessária se já estiver na página
                        if (!isActive("/visao-geral")) {
                          console.log("✅ Navegando para /visao-geral com paciente selecionado");
                          navigate("/visao-geral");
                        } else {
                          console.log("ℹ️ Já está em /visao-geral");
                        }
                      } else {
                        console.log("⚠️ Nenhum paciente selecionado - focando busca");
                        // Se não há paciente, focar na busca
                        if ((window as any).focusPatientSearch) {
                          (window as any).focusPatientSearch();
                        }
                      }
                    }}
                  >
                    <Home className={`h-3.5 w-3.5 ${isActive("/visao-geral") ? "text-blue-600" : "text-blue-600"}`} />
                    Visão Geral
                  </Button>

                  {navigationItems
                    .filter(item => {
                      // Para médicos: mostrar apenas itens gerais (sem doctorOnly nem patientOnly)
                      if (user?.profileType === 'doctor') {
                        return !item.doctorOnly && !item.patientOnly;
                      }
                      // Para outros usuários: filtrar normalmente
                      return !item.doctorOnly;
                    })
                    .map((item) => (
                    <Link key={item.href} href={item.href}>
                      <Button
                        variant={isActive(item.href) ? "secondary" : "ghost"}
                        className={`w-full gap-3 h-9 justify-start text-sm ${
                          isActive(item.href) 
                            ? "bg-blue-50 text-blue-700 font-medium" 
                            : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        <item.icon className={`h-3.5 w-3.5 ${isActive(item.href) ? "text-blue-600" : item.color}`} />
                        {item.title}
                      </Button>
                    </Link>
                  ))}

                  {/* Sinais Vitais dentro do Prontuário */}
                  <Link href="/vital-signs">
                    <Button
                      variant={isActive("/vital-signs") ? "secondary" : "ghost"}
                      className={`w-full gap-3 h-9 justify-start text-sm ${
                        isActive("/vital-signs") 
                          ? "bg-blue-50 text-blue-700 font-medium" 
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <Activity className={`h-3.5 w-3.5 ${isActive("/vital-signs") ? "text-blue-600" : "text-green-600"}`} />
                      Sinais Vitais
                    </Button>
                  </Link>

                  {/* Relatórios dentro do Prontuário */}
                  <Link href="/reports">
                    <Button
                      variant={isActive("/reports") ? "secondary" : "ghost"}
                      className={`w-full gap-3 h-9 justify-start text-sm ${
                        isActive("/reports") 
                          ? "bg-blue-50 text-blue-700 font-medium" 
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <BarChart3 className={`h-3.5 w-3.5 ${isActive("/reports") ? "text-blue-600" : "text-purple-600"}`} />
                      Relatórios
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            /* Menu Normal para outros usuários */
            navigationItems
              .filter(item => !item.doctorOnly || user?.profileType === 'doctor')
              .map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive(item.href) ? "secondary" : "ghost"}
                  className={`w-full gap-3 h-10 ${
                    isCollapsed ? 'justify-center px-0' : 'justify-start'
                  } ${
                    isActive(item.href) 
                      ? "bg-blue-50 text-blue-700 font-medium" 
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                  title={isCollapsed ? item.title : undefined}
                >
                  <item.icon className={`h-4 w-4 ${isActive(item.href) ? "text-blue-600" : item.color}`} />
                  {!isCollapsed && item.title}
                </Button>
              </Link>
            ))
          )}



          {/* Vital Signs Section - Apenas para usuários que NÃO são médicos */}
          {user?.profileType !== 'doctor' && (
            <Link href="/vital-signs">
              <Button
                variant={isActive("/vital-signs") ? "secondary" : "ghost"}
                className={`w-full gap-3 h-10 ${
                  isActive("/vital-signs") 
                    ? "bg-blue-50 text-blue-700 font-medium" 
                    : "text-gray-700 hover:bg-gray-50"
                } ${isCollapsed ? 'justify-center px-0' : 'justify-start'}`}
                title={isCollapsed ? "Sinais Vitais" : undefined}
              >
                <Activity className={`h-4 w-4 ${isActive("/vital-signs") ? "text-blue-600" : "text-green-600"}`} />
                {!isCollapsed && "Sinais Vitais"}
              </Button>
            </Link>
          )}

          {/* Reports Section - Apenas para usuários que NÃO são médicos */}
          {user?.profileType !== 'doctor' && (
            <Link href="/reports">
              <Button
                variant={isActive("/reports") ? "secondary" : "ghost"}
                className={`w-full gap-3 h-10 ${
                  isActive("/reports") 
                    ? "bg-blue-50 text-blue-700 font-medium" 
                    : "text-gray-700 hover:bg-gray-50"
                } ${isCollapsed ? 'justify-center px-0' : 'justify-start'}`}
                title={isCollapsed ? "Relatórios" : undefined}
              >
                <BarChart3 className={`h-4 w-4 ${isActive("/reports") ? "text-blue-600" : "text-purple-600"}`} />
                {!isCollapsed && "Relatórios"}
              </Button>
            </Link>
          )}


        </div>
      </ScrollArea>
      {/* User Profile and Logout */}
      <div className="p-3 border-t border-gray-200 space-y-2">
        {!isCollapsed && (
          <>
            <Link href="/settings">
              <Button
                variant="ghost"
                className="flex items-center gap-3 px-3 py-2 h-auto hover:bg-gray-50 w-full justify-between"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 rounded-lg">
                    <AvatarImage 
                      src={user?.photo ? (
                        user.photo.startsWith('data:') ? user.photo : `data:image/jpeg;base64,${user.photo}`
                      ) : undefined}
                      alt={user?.name || "User"} 
                    />
                    <AvatarFallback className="bg-blue-100 text-blue-600 font-medium text-base rounded-lg">
                      {user?.name ? getUserInitials(user.name) : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
                      {user?.name || "Usuário"}
                    </p>
                    <Badge 
                      variant="secondary" 
                      className="text-xs px-2 py-0.5 h-4"
                    >
                      {user?.profileType ? getProfileTypeName(user.profileType) : "Usuário"}
                    </Badge>
                  </div>
                </div>
                <Settings className="h-4 w-4 text-gray-400" />
              </Button>
            </Link>

            <Button
              variant="ghost"
              className="w-full gap-3 text-red-600 hover:bg-red-50 hover:text-red-700 h-10 justify-start"
              onClick={() => setLogoutDialogOpen(true)}
            >
              <LogOut className="h-4 w-4" />
              Sair do Meu Cuidador
            </Button>
          </>
        )}

        {isCollapsed && (
          <Button
            variant="ghost"
            className="justify-center px-0 w-full gap-3 text-red-600 hover:bg-red-50 hover:text-red-700 h-10"
            onClick={() => setLogoutDialogOpen(true)}
            title="Sair do Meu Cuidador"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Modal de confirmação de logout */}
      <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogOut className="w-5 h-5 text-red-600" />
              Confirmar Saída
            </DialogTitle>
            <DialogDescription>
              Confirme se deseja realmente sair do aplicativo
            </DialogDescription>
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
    </div>
  );
}