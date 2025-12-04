import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from './use-auth';
import { usePatient } from '@/contexts/patient-context';

interface RealTimeNotification {
  type: 'medication' | 'appointment' | 'test';
  title: string;
  message: string;
  relatedId?: number;
}

export function useRealTimeChecker() {
  // ⚠️ SISTEMA DESATIVADO - SUBSTITUÍDO PELO ENTERPRISE
  console.log('⚠️ Sistema antigo desativado - usando enterprise notifications');
  return;
  const { user } = useAuth();
  const { effectivePatientId } = usePatient();
  const queryClient = useQueryClient();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCheckRef = useRef<string>('');
  const lastServerCallRef = useRef<number>(0);

  const checkMedicationStatus = async (): Promise<RealTimeNotification[]> => {
    try {
      const [logsResponse, notificationsResponse] = await Promise.all([
        api.get('/api/medication-logs/today'),
        api.get('/api/notifications')
      ]);
      
      const todayLogs = logsResponse.data;
      const existingNotifications = notificationsResponse.data;
      const notifications: RealTimeNotification[] = [];
      
      const now = new Date(Date.now() - (3 * 60 * 60 * 1000));
      
      // LOG DETALHADO: Mostrar TODOS os logs de hoje
      console.log(`📋 TODOS os logs de hoje (${todayLogs.length} total):`);
      todayLogs.forEach((log: any, index: number) => {
        const scheduledTime = new Date(log.scheduledDateTime);
        const timeDiffMs = now.getTime() - scheduledTime.getTime();
        const timeDiffMinutes = Math.floor(timeDiffMs / (1000 * 60));
        const statusInfo = log.status + (log.takenAt ? ' (tomado)' : ' (não tomado)');
        console.log(`  ${index + 1}. ${log.medication?.name} - ${timeDiffMinutes} min - ${statusInfo} - ${scheduledTime.toLocaleString('pt-BR')}`);
      });
      
      // Filtrar medicamentos não tomados (pending OU overdue) e ordenar por mais atrasado primeiro
      const pendingLogs = todayLogs
        .filter((log: any) => {
          const isNotTaken = (log.status === 'pending' || log.status === 'overdue') && !log.takenAt;
          if (isNotTaken) {
            console.log(`✅ Incluindo ${log.medication?.name}: status=${log.status}, não tomado`);
          } else {
            console.log(`❌ Excluindo ${log.medication?.name}: status=${log.status}, takenAt=${log.takenAt}`);
          }
          return isNotTaken;
        })
        .map((log: any) => {
          const scheduledTime = new Date(log.scheduledDateTime);
          const timeDiffMs = now.getTime() - scheduledTime.getTime();
          const timeDiffMinutes = Math.floor(timeDiffMs / (1000 * 60));
          return { ...log, timeDiffMinutes };
        })
        .sort((a: any, b: any) => b.timeDiffMinutes - a.timeDiffMinutes); // Mais atrasado primeiro
      
      console.log(`📋 ${pendingLogs.length} medicamentos NÃO TOMADOS encontrados:`);
      pendingLogs.forEach((log: any, index: number) => {
        const delayStatus = log.timeDiffMinutes > 15 ? 'MUITO ATRASADO' : 
                           log.timeDiffMinutes > 0 ? 'atrasado' : 'futuro';
        console.log(`  ${index + 1}. ${log.medication?.name} - ${log.timeDiffMinutes} min (${delayStatus})`);
      });
      
      pendingLogs.forEach((log: any) => {
        const scheduledTime = new Date(log.scheduledDateTime);
        const timeDiffMinutes = log.timeDiffMinutes;
        
        // Verificar se já existe notificação para este medicamento hoje - QUALQUER STATUS
        const hasNotificationToday = existingNotifications.some((notification: any) => {
          const notificationDate = new Date(notification.createdAt);
          const today = new Date();
          const isSameDay = notificationDate.toDateString() === today.toDateString();
          
          return notification.type === 'medication_reminder' &&
                 notification.relatedId === log.id &&
                 isSameDay;
        });
        
        // Se existe notificação e está lida, não criar nova (medicamento foi reconhecido)
        if (hasNotificationToday) {
          const todayNotification = existingNotifications.find((notification: any) => {
            const notificationDate = new Date(notification.createdAt);
            const today = new Date();
            const isSameDay = notificationDate.toDateString() === today.toDateString();
            
            return notification.type === 'medication_reminder' &&
                   notification.relatedId === log.id &&
                   isSameDay;
          });
          
          if (todayNotification?.isRead) {
            console.log(`✅ Pulando ${log.medication?.name} - notificação já foi lida hoje`);
            return; // Pular este medicamento
          }
          
          // Se não foi lida, verificar se é recente (últimos 10 min) para evitar spam
          const timeSinceNotification = new Date().getTime() - new Date(todayNotification.createdAt).getTime();
          if (timeSinceNotification < 10 * 60 * 1000) {
            console.log(`⏰ Pulando ${log.medication?.name} - notificação recente não lida (${Math.floor(timeSinceNotification / 60000)} min)`);
            return; // Pular este medicamento
          }
          
          console.log(`🔄 Permitindo nova notificação para ${log.medication?.name} - última notificação há ${Math.floor(timeSinceNotification / 60000)} min`);
        }
        
        // Formatear horário programado do medicamento
        const scheduledTimeFormatted = new Date(scheduledTime.getTime() + (3 * 60 * 60 * 1000)).toLocaleTimeString('pt-BR', { 
          hour: '2-digit', 
          minute: '2-digit'
        });

        console.log(`🔍 Verificando ${log.medication?.name || 'medicamento'}: ${timeDiffMinutes} min de diferença`);
        
        // 15 minutos antes (janela de 2 minutos: -16 a -14)
        if (timeDiffMinutes >= -16 && timeDiffMinutes <= -14) {
          console.log(`⏰ Detectado: 15 min antes para ${log.medication?.name} - servidor vai criar`);
        }
        
        // No horário (tolerância de 10 minutos: -10 a +10)
        else if (timeDiffMinutes >= -10 && timeDiffMinutes <= 10) {
          console.log(`🔔 Detectado: hora certa para ${log.medication?.name} - servidor vai criar`);
        }
        
        // 5 minutos de atraso (janela de 2 minutos: +5 a +7)
        else if (timeDiffMinutes >= 5 && timeDiffMinutes <= 7) {
          console.log(`⚠️ Detectado: 5 min atraso para ${log.medication?.name} - servidor vai criar`);
        }
        
        // Catch-up para medicamentos perdidos (10-20 min de atraso) 
        else if (timeDiffMinutes > 10 && timeDiffMinutes < 20) {
          console.log(`🔄 Detectado: catch-up para ${log.medication?.name} (${timeDiffMinutes}min atrasado) - servidor vai criar`);
        }
        
        // Medicamentos muito atrasados (a cada 15 minutos após 20 min)
        else if (timeDiffMinutes >= 20) {
          // Para medicamentos muito atrasados (≥20 min), notificar a cada 15 minutos
          // Calcular se está em um dos momentos de notificação: 20, 35, 50, 65, 80, etc.
          const isNotificationTime = (timeDiffMinutes - 20) % 15 === 0;
          
          if (isNotificationTime) {
            console.log(`🚨 Detectado: ${timeDiffMinutes} min atrasado para ${log.medication?.name} - servidor vai criar`);
          } else {
            console.log(`⏭️ Pulando notificação para ${log.medication?.name} - ${timeDiffMinutes} min não é momento de notificação`);
          }
        }
        
        else {
          console.log(`⏭️ Pulando notificação para ${log.medication?.name} - ${timeDiffMinutes} min não é momento de notificação`);
        }
      });
      
      return notifications;
    } catch (error) {
      console.error('Erro ao verificar status dos medicamentos:', error);
      return [];
    }
  };

  const checkAppointmentStatus = async (): Promise<RealTimeNotification[]> => {
    try {
      const [appointmentsResponse, notificationsResponse] = await Promise.all([
        api.get('/api/appointments'),
        api.get('/api/notifications')
      ]);
      
      const appointments = appointmentsResponse.data;
      const existingNotifications = notificationsResponse.data;
      const notifications: RealTimeNotification[] = [];
      
      const now = new Date();
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      
      appointments.forEach((appointment: any) => {
        const appointmentDate = new Date(appointment.appointmentDate);
        const appointmentDay = new Date(appointmentDate);
        appointmentDay.setHours(0, 0, 0, 0);
        
        // Verificar apenas consultas de hoje que ainda não foram realizadas ou canceladas
        if (appointmentDay.getTime() === today.getTime() && 
            appointment.status !== 'completed' && 
            appointment.status !== 'cancelled') {
          
          const timeDiffMs = appointmentDate.getTime() - now.getTime();
          const timeDiffMinutes = Math.floor(timeDiffMs / (1000 * 60));
          
          // Verificar se já existe notificação similar recente (últimos 30 minutos)
          const hasRecentNotification = existingNotifications.some((notification: any) => 
            notification.type === 'appointment_reminder' &&
            notification.relatedId === appointment.id &&
            !notification.isRead &&
            new Date().getTime() - new Date(notification.createdAt).getTime() < 30 * 60 * 1000
          );

          if (hasRecentNotification) {
            console.log(`⏭️ Pulando consulta ${appointment.doctorName} - notificação recente já existe`);
            return; // continue para próxima consulta
          }
          
          // Notificar 1 hora antes (55-65 minutos antes para janela maior)
          if (timeDiffMinutes >= 55 && timeDiffMinutes <= 65) {
            console.log(`📅 Detectado: consulta ${appointment.doctorName} em 1 hora - servidor vai criar`);
          }
          
          // Notificar 15 minutos antes (janela de 2 minutos: 14-16)
          else if (timeDiffMinutes >= 14 && timeDiffMinutes <= 16) {
            console.log(`📅 Detectado: consulta ${appointment.doctorName} em 15 min - servidor vai criar`);
          }
          
          // Notificar no horário (tolerância de 10 minutos: -10 a +10)
          else if (timeDiffMinutes >= -10 && timeDiffMinutes <= 10) {
            console.log(`📅 Detectado: consulta ${appointment.doctorName} agora - servidor vai criar`);
          }
          
          // Consultas atrasadas (a cada 15 minutos após a tolerância)
          else if (timeDiffMinutes < -10) {
            const delayMinutes = Math.abs(timeDiffMinutes) - 10; // Remover os primeiros 10 min de tolerância
            const intervalIndex = Math.floor(delayMinutes / 15);
            const intervalStart = 10 + (intervalIndex * 15); // 10 (tolerância) + intervalos de 15
            const intervalEnd = intervalStart + 2; // Janela de 2 minutos
            const actualDelay = Math.abs(timeDiffMinutes);
            
            if (actualDelay >= intervalStart && actualDelay <= intervalEnd) {
              console.log(`📅 Detectado: consulta ${appointment.doctorName} atrasada ${actualDelay} min - servidor vai criar`);
            }
          }
        }
      });
      
      return notifications;
    } catch (error) {
      console.error('Erro ao verificar status das consultas:', error);
      return [];
    }
  };

  const checkTestStatus = async (): Promise<RealTimeNotification[]> => {
    try {
      const [testsResponse, notificationsResponse] = await Promise.all([
        api.get('/api/tests'),
        api.get('/api/notifications')
      ]);
      
      const tests = testsResponse.data;
      const existingNotifications = notificationsResponse.data;
      const notifications: RealTimeNotification[] = [];
      
      const now = new Date();
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      
      tests.forEach((test: any) => {
        const testDate = new Date(test.testDate);
        const testDay = new Date(testDate);
        testDay.setHours(0, 0, 0, 0);
        
        // Verificar apenas exames de hoje que ainda não foram realizados ou cancelados
        if (testDay.getTime() === today.getTime() && 
            test.status !== 'completed' && 
            test.status !== 'cancelled') {
          
          const timeDiffMs = testDate.getTime() - now.getTime();
          const timeDiffMinutes = Math.floor(timeDiffMs / (1000 * 60));
          
          // Verificar se já existe notificação similar recente (últimos 30 minutos)
          const hasRecentNotification = existingNotifications.some((notification: any) => 
            notification.type === 'test_reminder' &&
            notification.relatedId === test.id &&
            !notification.isRead &&
            new Date().getTime() - new Date(notification.createdAt).getTime() < 30 * 60 * 1000
          );

          if (hasRecentNotification) {
            console.log(`⏭️ Pulando exame ${test.name} - notificação recente já existe`);
            return; // continue para próximo exame
          }
          
          // Notificar 1 hora antes (55-65 minutos antes para janela maior)
          if (timeDiffMinutes >= 55 && timeDiffMinutes <= 65) {
            console.log(`🧪 Detectado: exame ${test.name} em 1 hora - servidor vai criar`);
          }
          
          // Notificar 15 minutos antes (janela de 2 minutos: 14-16)
          else if (timeDiffMinutes >= 14 && timeDiffMinutes <= 16) {
            console.log(`🧪 Detectado: exame ${test.name} em 15 min - servidor vai criar`);
          }
          
          // Notificar no horário (tolerância de 10 minutos: -10 a +10)
          else if (timeDiffMinutes >= -10 && timeDiffMinutes <= 10) {
            console.log(`🧪 Detectado: exame ${test.name} agora - servidor vai criar`);
          }
          
          // Exames atrasados (a cada 15 minutos após a tolerância)
          else if (timeDiffMinutes < -10) {
            const delayMinutes = Math.abs(timeDiffMinutes) - 10; // Remover os primeiros 10 min de tolerância
            const intervalIndex = Math.floor(delayMinutes / 15);
            const intervalStart = 10 + (intervalIndex * 15); // 10 (tolerância) + intervalos de 15
            const intervalEnd = intervalStart + 2; // Janela de 2 minutos
            const actualDelay = Math.abs(timeDiffMinutes);
            
            if (actualDelay >= intervalStart && actualDelay <= intervalEnd) {
              console.log(`🧪 Detectado: exame ${test.name} atrasado ${actualDelay} min - servidor vai criar`);
            }
          }
        }
      });
      
      return notifications;
    } catch (error) {
      console.error('Erro ao verificar status dos exames:', error);
      return [];
    }
  };

  const triggerServerCheck = async () => {
    // Debounce para evitar múltiplas chamadas simultâneas
    const currentTime = Date.now();
    if (currentTime - lastServerCallRef.current < 3000) { // 3 segundos de debounce
      console.log('⏸️ Evitando chamada duplicada ao servidor (debounce)');
      return;
    }
    lastServerCallRef.current = currentTime;
    
    try {
      console.log(`🔄 Solicitando verificação automática do servidor...`);
      const response = await api.post('/api/notifications/auto-check');
      const result = response.data;
      
      if (result.success && result.notificationsCreated > 0) {
        console.log(`✅ Servidor criou ${result.notificationsCreated} notificações`);
        queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      } else {
        console.log(`📊 Servidor verificou - nenhuma notificação necessária`);
      }
    } catch (error) {
      console.error('❌ Erro na verificação automática do servidor:', error);
    }
  };

  const performRealTimeCheck = async () => {
    if (!user || !effectivePatientId) return;
    
    try {
      const now = new Date();
      const currentCheck = now.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
      
      console.log(`🔄 Verificação em tempo real - ${new Date().toLocaleTimeString('pt-BR')} - Paciente: ${effectivePatientId}`);
      
      // Evitar verificações duplicadas no mesmo minuto
      if (currentCheck === lastCheckRef.current) {
        console.log('⏭️ Pulando verificação duplicada no mesmo minuto');
        return;
      }
      lastCheckRef.current = currentCheck;
      
      const [medicationNotifications, appointmentNotifications, testNotifications] = await Promise.all([
        checkMedicationStatus(),
        checkAppointmentStatus(),
        checkTestStatus()
      ]);
      
      const allNotifications = [
        ...medicationNotifications,
        ...appointmentNotifications,
        ...testNotifications
      ];
      
      console.log(`📊 Resultados da detecção (cliente não cria notificações):
      - Medicamentos detectados: ${medicationNotifications.length}
      - Consultas detectadas: ${appointmentNotifications.length} 
      - Exames detectados: ${testNotifications.length}
      - Total detectado: ${allNotifications.length}`);
      
      // Sempre chamar verificação do servidor para criar notificações no banco
      try {
        await triggerServerCheck();
        
        // Invalidar queries para atualizar a home page
        queryClient.invalidateQueries({ queryKey: ['/api/medication-logs/today'] });
        queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
        queryClient.invalidateQueries({ queryKey: ['/api/tests'] });
        
      } catch (serverError) {
        console.error('Erro ao comunicar com servidor:', serverError);
      }
    } catch (error) {
      console.error('Erro na verificação em tempo real:', error);
    }
  };

  useEffect(() => {
    if (!user || !effectivePatientId) return;
    
    // Verificação inicial
    performRealTimeCheck();
    
    // Configurar verificação a cada minuto
    intervalRef.current = setInterval(performRealTimeCheck, 60000); // 60 segundos
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user, effectivePatientId]);

  return {
    performManualCheck: performRealTimeCheck
  };
}