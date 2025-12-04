import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

interface Patient {
  id: number;
  name: string;
  email: string;
  age?: number;
  profileType: string;
  photo?: string;
  weight?: number;
  whatsapp?: string;
}

interface BasicPatientData {
  id: number;
  name: string;
  email: string;
  age?: number;
  photo?: string;
  weight?: number;
  // Apenas dados básicos - não carregar dados médicos completos
}

interface PatientContextType {
  selectedPatient: Patient | null;
  basicPatientData: BasicPatientData | null;
  setSelectedPatient: (patient: Patient | null) => void;
  trocarPacienteContexto: (patienteId: number) => Promise<void>;
  limparContextoPaciente: () => void;
  isPatientSelected: boolean;
  canHaveOwnMedicalData: boolean;
  effectivePatientId: number | null;
  isLoading: boolean;
}

const PatientContext = createContext<PatientContextType | undefined>(undefined);

export function PatientProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPatient, setSelectedPatientState] = useState<Patient | null>(null);
  const [basicPatientData, setBasicPatientData] = useState<BasicPatientData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // OTIMIZAÇÃO: Não carregar automaticamente dados de pacientes salvos
  // Recuperar apenas contexto básico do sessionStorage se existir
  useEffect(() => {
    if (user?.profileType === 'caregiver') {
      const savedPatientId = sessionStorage.getItem('selectedPatientId');
      if (savedPatientId) {
        const savedPatientData = sessionStorage.getItem(`patient_${savedPatientId}`);
        if (savedPatientData) {
          try {
            const patientData = JSON.parse(savedPatientData);
            setSelectedPatientState(patientData);
            setBasicPatientData(patientData);
          } catch (error) {
            // Se dados corrompidos, limpar
            sessionStorage.removeItem('selectedPatientId');
            sessionStorage.removeItem(`patient_${savedPatientId}`);
          }
        }
      }
    } else {
      // Limpar dados de outros tipos de usuário
      sessionStorage.removeItem('selectedPatientId');
    }
  }, [user]);

  // 🔁 FUNÇÃO CENTRAL: trocarPacienteContexto
  const trocarPacienteContexto = async (patienteId: number) => {
    setIsLoading(true);
    try {
      console.log(`🔄 Iniciando troca de contexto para paciente ${patienteId}`);
      
      // 1. Zerar dados anteriores para evitar conflitos
      setSelectedPatientState(null);
      setBasicPatientData(null);
      
      // 2. Invalidar cache anterior para evitar dados inconsistentes
      queryClient.removeQueries({
        predicate: (query) => {
          const queryKey = query.queryKey[0] as string;
          return [
            '/api/medications', 
            '/api/medication-logs',
            '/api/medication-logs/today',
            '/api/medication-history',
            '/api/tests',
            '/api/appointments', 
            '/api/notifications',
            '/api/prescriptions',
            '/api/vital-signs/blood-pressure',
            '/api/vital-signs/glucose',
            '/api/vital-signs/heart-rate',
            '/api/vital-signs/temperature',
            '/api/vital-signs/weight'
          ].includes(queryKey);
        }
      });

      // 3. Trocar contexto no servidor (agora com sessão)
      const switchResponse = await api.post('/api/caregiver/switch-patient', { patientId: patienteId });
      console.log('✅ Contexto trocado no servidor:', switchResponse.data);
      
      // 4. Buscar APENAS dados básicos do paciente
      const basicDataResponse = await api.get(`/api/patients/${patienteId}/basic`);
      const basicData = basicDataResponse.data;
      
      // 5. Atualizar estado com dados básicos
      setSelectedPatientState(basicData);
      setBasicPatientData(basicData);
      
      // 6. Salvar no sessionStorage (backup do cliente)
      sessionStorage.setItem('selectedPatientId', patienteId.toString());
      sessionStorage.setItem(`patient_${patienteId}`, JSON.stringify(basicData));
      
      // 7. Verificar se a sessão foi salva corretamente
      try {
        const debugResponse = await api.get('/api/debug/session');
        console.log('🔍 Debug sessão após troca:', debugResponse.data);
      } catch (debugError) {
        console.warn('Debug de sessão não disponível:', debugError);
      }
      
      // 8. Refresh user context
      await queryClient.refetchQueries({ queryKey: ['/api/auth/me'] });
      
      toast({
        title: "Paciente Selecionado",
        description: `Agora visualizando dados de ${basicData.name}`,
      });
      
    } catch (error) {
      console.error('Error switching patient context:', error);
      toast({
        title: "Erro",
        description: "Não foi possível trocar para este paciente.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Função para limpar contexto
  const limparContextoPaciente = async () => {
    setIsLoading(true);
    try {
      console.log('🧹 Iniciando limpeza de contexto');
      
      // Clear server-side context first (agora com sessão)
      if (user?.profileType === 'caregiver') {
        await api.delete('/api/caregiver/clear-patient-context');
        console.log('✅ Contexto limpo no servidor');
      }
      
      // 🔥 CRÍTICO: Invalidar todas as queries médicas para recarregar dados do cuidador
      queryClient.removeQueries({
        predicate: (query) => {
          const queryKey = query.queryKey[0] as string;
          return [
            '/api/medications', 
            '/api/medication-logs',
            '/api/medication-logs/today',
            '/api/medication-history',
            '/api/tests',
            '/api/appointments', 
            '/api/notifications',
            '/api/prescriptions',
            '/api/vital-signs/blood-pressure',
            '/api/vital-signs/glucose',
            '/api/vital-signs/heart-rate',
            '/api/vital-signs/temperature',
            '/api/vital-signs/weight'
          ].includes(queryKey);
        }
      });

      // Verificar se a sessão foi limpa corretamente
      try {
        const debugResponse = await api.get('/api/debug/session');
        console.log('🔍 Debug sessão após limpeza:', debugResponse.data);
      } catch (debugError) {
        console.warn('Debug de sessão não disponível:', debugError);
      }

      toast({
        title: "Contexto Alterado",
        description: "Agora visualizando seus próprios dados médicos",
      });
      
    } catch (error) {
      console.warn('Could not clear server context, but proceeding anyway:', error);
    } finally {
      // Always clear local context regardless of server response
      setSelectedPatientState(null);
      setBasicPatientData(null);
      sessionStorage.removeItem('selectedPatientId');
      
      // Clear all patient-specific sessionStorage
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.startsWith('patient_')) {
          sessionStorage.removeItem(key);
        }
      });
      
      setIsLoading(false);
    }
  };

  const setSelectedPatient = (patient: Patient | null) => {
    setSelectedPatientState(patient);
    setBasicPatientData(patient);
    
    if (patient) {
      sessionStorage.setItem('selectedPatientId', patient.id.toString());
      sessionStorage.setItem(`patient_${patient.id}`, JSON.stringify(patient));
    } else {
      sessionStorage.removeItem('selectedPatientId');
    }
  };

  // CORRIGIDO: isPatientSelected deve indicar se um paciente específico foi selecionado
  // Para cuidadores sem paciente selecionado = false (veem seus próprios dados)
  // Para cuidadores com paciente selecionado = true (veem dados do paciente)
  const isPatientSelected = Boolean(
    user?.profileType === 'patient' || 
    (user?.profileType === 'caregiver' && selectedPatient) ||
    (user?.profileType === 'doctor' && selectedPatient) ||
    (user?.profileType === 'family' && selectedPatient) ||
    (user?.profileType === 'nurse' && selectedPatient)
  );

  // Check if current user can have their own medical data (caregiver can also be a patient)
  const canHaveOwnMedicalData = Boolean(user?.profileType === 'patient' || user?.profileType === 'caregiver');

  // For caregivers, determine if they should see their own data or patient data
  const effectivePatientId = useMemo(() => {
    if (!user) return null;
    
    // For patients, always use their own ID
    if (user.profileType === 'patient') {
      return user.id;
    }
    
    // For caregivers, use selected patient ID if available, otherwise use their own ID
    if (user.profileType === 'caregiver') {
      return selectedPatient?.id || user.id;
    }
    
    // For other roles, only use selected patient ID
    return selectedPatient?.id || null;
  }, [user, selectedPatient]);

  return (
    <PatientContext.Provider value={{
      selectedPatient,
      basicPatientData,
      setSelectedPatient,
      trocarPacienteContexto,
      limparContextoPaciente,
      isPatientSelected,
      canHaveOwnMedicalData,
      effectivePatientId,
      isLoading
    }}>
      {children}
    </PatientContext.Provider>
  );
}

export function usePatient() {
  const context = useContext(PatientContext);
  if (context === undefined) {
    throw new Error('usePatient must be used within a PatientProvider');
  }
  return context;
}