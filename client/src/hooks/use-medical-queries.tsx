import { useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { usePatient } from '@/contexts/patient-context';

/**
 * 🚦 Hook otimizado para controlar quando carregar dados médicos
 * Implementa carregamento on-demand conforme instruções
 */
export function useMedicalQueries() {
  const { user } = useAuth();
  const { effectivePatientId, isPatientSelected } = usePatient();

  // ⚡ Controlar habilitação das queries baseado no contexto do paciente
  const enableMedicalQueries = useMemo(() => {
    // Não carregar se usuário não está autenticado
    if (!user) return false;

    // Para pacientes: sempre carregar seus próprios dados
    if (user.profileType === 'patient') {
      return true;
    }

    // Para cuidadores: sempre carregar dados (próprios ou do paciente selecionado)
    if (user.profileType === 'caregiver') {
      return Boolean(effectivePatientId);
    }

    // Para outros tipos: só carregar quando paciente específico está selecionado
    return Boolean(effectivePatientId && isPatientSelected);
  }, [user, effectivePatientId, isPatientSelected]);

  return {
    enableMedicalQueries,
    effectivePatientId
  };
}