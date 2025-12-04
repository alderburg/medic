// ⚡ HOOK OTIMIZADO: Carregamento lazy/on-demand para dados médicos
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { usePatient } from "@/contexts/patient-context";
import { useLocation } from "wouter";

export function useLazyMedicalQueries() {
  const { user } = useAuth();
  const { effectivePatientId, isPatientSelected, selectedPatient } = usePatient();
  const [location] = useLocation();

  // 🔒 Lógica estável de habilitação - evita mudanças durante navegação
  const enableMedicalQueries = useMemo(() => {
    if (!user) return false;

    // Para pacientes e cuidadores: sempre habilitar
    if (user.profileType === 'patient' || user.profileType === 'caregiver') {
      return true;
    }

    // Para médicos: habilitar se há paciente selecionado
    // Manter estável durante transições de rota
    if (user.profileType === 'doctor') {
      return Boolean(selectedPatient);
    }

    // Para outros tipos: apenas se há paciente selecionado
    return Boolean(effectivePatientId);
  }, [user, selectedPatient, effectivePatientId]);

  return {
    // ⚡ Medicamentos - carrega apenas quando necessário
    medications: useQuery({
      queryKey: ["/api/medications", effectivePatientId],
      queryFn: async () => {
        const response = await api.get("/api/medications");
        return response.data;
      },
      enabled: enableMedicalQueries,
      staleTime: 5 * 60 * 1000, // Cache por 5 minutos
    }),

    // ⚡ Logs de medicamentos - carrega apenas quando necessário
    medicationLogs: useQuery({
      queryKey: ["/api/medication-logs", effectivePatientId],
      queryFn: async () => {
        const response = await api.get("/api/medication-logs");
        return response.data;
      },
      enabled: enableMedicalQueries,
      staleTime: 2 * 60 * 1000, // Cache por 2 minutos
    }),

    // ⚡ Logs de hoje - carrega apenas quando necessário
    todayLogs: useQuery({
      queryKey: ["/api/medication-logs/today", effectivePatientId],
      queryFn: async () => {
        const response = await api.get("/api/medication-logs/today");
        return response.data;
      },
      enabled: enableMedicalQueries,
      staleTime: 1 * 60 * 1000, // Cache por 1 minuto
    }),

    // ⚡ Exames - carrega apenas quando necessário
    tests: useQuery({
      queryKey: ["/api/tests", effectivePatientId],
      queryFn: async () => {
        const response = await api.get("/api/tests");
        return response.data;
      },
      enabled: enableMedicalQueries,
      staleTime: 5 * 60 * 1000,
    }),

    // ⚡ Consultas - carrega apenas quando necessário
    appointments: useQuery({
      queryKey: ["/api/appointments", effectivePatientId],
      queryFn: async () => {
        const response = await api.get("/api/appointments");
        return response.data;
      },
      enabled: enableMedicalQueries,
      staleTime: 5 * 60 * 1000,
    }),

    // ⚡ Receitas - carrega apenas quando necessário
    prescriptions: useQuery({
      queryKey: ["/api/prescriptions", effectivePatientId],
      queryFn: async () => {
        const response = await api.get("/api/prescriptions");
        return response.data;
      },
      enabled: enableMedicalQueries,
      staleTime: 5 * 60 * 1000,
    }),

    // ⚡ Notificações - carrega apenas quando necessário
    notifications: useQuery({
      queryKey: ["/api/notifications", effectivePatientId],
      queryFn: async () => {
        const response = await api.get("/api/notifications");
        return response.data;
      },
      enabled: enableMedicalQueries,
      staleTime: 3 * 60 * 1000,
    }),

    // Estados de controle
    enableMedicalQueries,
    effectivePatientId,
  };
}

// 🧵 HOOK PARA SINAIS VITAIS: Carregamento específico por tipo
export function useLazyVitalSigns(type: 'blood-pressure' | 'glucose' | 'heart-rate' | 'temperature' | 'weight') {
  const { effectivePatientId, isPatientSelected } = usePatient();
  const enableMedicalQueries = Boolean(effectivePatientId && isPatientSelected);

  return useQuery({
    queryKey: [`/api/vital-signs/${type}`, effectivePatientId],
    queryFn: async () => {
      const response = await api.get(`/api/vital-signs/${type}`);
      return response.data;
    },
    enabled: enableMedicalQueries,
    staleTime: 5 * 60 * 1000,
  });
}