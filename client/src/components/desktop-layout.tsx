import { ReactNode } from "react";
import { SidebarNavigation } from "./sidebar-navigation";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/use-auth";
import { usePatient } from "@/contexts/patient-context";
import BottomNavigation from "./bottom-navigation";
import NotificationsPanel from "./notifications-panel";
import PatientSearchInline from "./patient-search-inline";

interface DesktopLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export function DesktopLayout({ children, title, subtitle }: DesktopLayoutProps) {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { setSelectedPatient } = usePatient();

  const handlePatientSelect = (patient: any) => {
    // Use the context to set the selected patient
    setSelectedPatient(patient);
  };

  // Personalizar título para médicos na página home
  const getDisplayTitle = () => {
    if (user?.profileType === 'doctor' && title === 'Dashboard') {
      let isFeminine = false;
      
      // Prioridade 1: Usar o campo gender do banco de dados se disponível
      if (user.gender) {
        isFeminine = user.gender === 'feminino';
      } else {
        // Prioridade 2: Detectar baseado em terminações comuns de nomes femininos
        const feminineSuffixes = ['a', 'ana', 'ina', 'ela', 'ica', 'lia', 'nia', 'ria', 'triz'];
        const name = user.name?.toLowerCase() || '';
        isFeminine = feminineSuffixes.some(suffix => name.endsWith(suffix));
      }
      
      const doctorTitle = isFeminine ? 'Dra.' : 'Dr.';
      const greeting = isFeminine ? 'Bem-vinda' : 'Bem-vindo';
      return `${greeting}, ${doctorTitle} ${user.name}`;
    }
    return title;
  };

  const getDisplaySubtitle = () => {
    if (user?.profileType === 'doctor' && title === 'Dashboard') {
      return 'Sistema de Gerenciamento Médico';
    }
    return subtitle;
  };

  if (isMobile) {
    // No mobile, mantém o layout original com bottom navigation
    return (
      <div className="min-h-screen bg-gray-50">
        {children}
        <BottomNavigation />
      </div>
    );
  }

  // No desktop, usa sidebar navigation com header
  return (
    <div className="flex h-screen bg-gray-50">
      <SidebarNavigation />
      <main className="flex-1 overflow-auto flex flex-col">
        {/* Header do desktop */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              {getDisplayTitle() && <h1 className="text-2xl font-bold text-gray-900">{getDisplayTitle()}</h1>}
              {getDisplaySubtitle() && <p className="text-gray-600">{getDisplaySubtitle()}</p>}
            </div>
            <div className="flex items-center gap-3">
              {/* Campo de pesquisa inline (apenas para não-pacientes) */}
              {user?.profileType !== 'patient' && (
                <PatientSearchInline onPatientSelect={handlePatientSelect} />
              )}
              <NotificationsPanel />
            </div>
          </div>
        </header>
        
        {/* Conteúdo principal */}
        <div className="flex-1 overflow-hidden">
          <div className="content-zoom-80 h-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}