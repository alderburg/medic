import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { usePatient } from '@/contexts/patient-context';

/**
 * Hook para verificar se um médico tem paciente selecionado
 * Redireciona para /home se não tiver paciente selecionado
 */
export const usePatientRequired = () => {
  const { user } = useAuth();
  const { selectedPatient } = usePatient();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Apenas verificar para médicos
    if (user?.profileType === 'doctor' && !selectedPatient) {
      // Aguardar um pouco para permitir que o contexto do paciente seja carregado
      const timeoutId = setTimeout(() => {
        console.log("🔄 Médico sem paciente selecionado - redirecionando para /home");
        setLocation("/home");
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [user, selectedPatient, setLocation]);

  // Retorna se deve mostrar a página ou não
  return {
    shouldShowPage: !user || user.profileType !== 'doctor' || Boolean(selectedPatient),
    isRedirecting: user?.profileType === 'doctor' && !selectedPatient
  };
};