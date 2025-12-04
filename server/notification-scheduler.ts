// ========================================
// SISTEMA AUTOMÁTICO DE NOTIFICAÇÕES ENTERPRISE
// Gera notificações automáticas para medicamentos, consultas e exames
// ========================================

import { enterpriseStorage as storage } from "./storage-enterprise";
import { format, addMinutes, subMinutes, differenceInMinutes, isBefore, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";

// ========================================
// FUNÇÃO PARA GERAR HORÁRIOS BASEADOS NA FREQUÊNCIA
// ========================================
const getScheduleHoursFromFrequency = (frequency: string): number[] => {
  switch (frequency) {
    case 'once_daily':
    case 'daily':
      return [8]; // 8h
    case 'twice_daily':
      return [8, 20]; // 8h e 20h
    case 'three_times_daily':
      return [8, 14, 20]; // 8h, 14h e 20h
    case 'four_times_daily':
      return [8, 12, 16, 20]; // 8h, 12h, 16h e 20h
    case 'every_6_hours':
      return [6, 12, 18, 24]; // A cada 6 horas
    case 'every_8_hours':
      return [8, 16, 24]; // A cada 8 horas
    case 'every_12_hours':
      return [8, 20]; // A cada 12 horas
    case 'as_needed':
      return []; // Não tem horário fixo
    default:
      return [8]; // Padrão: uma vez por dia
  }
};

// Configurações de timing das notificações CORRIGIDAS
const NOTIFICATION_TIMINGS = {
  MEDICATIONS: {
    BEFORE_30_MIN: 30,     // 30 minutos antes
    BEFORE_15_MIN: 15,     // 15 minutos antes
    ON_TIME_MARGIN: 10,    // Margem de 10 minutos (antes e depois)
    OVERDUE_FIRST: 15,     // Primeiro aviso de atraso aos 15 min
    OVERDUE_INTERVAL: 5,   // A cada 5 minutos quando atrasado
    MAX_OVERDUE_HOURS: 4   // Máximo 4 horas de notificações de atraso
  },
  APPOINTMENTS: {
    BEFORE_24_HOURS: 1440, // 24 horas antes
    BEFORE_12_HOURS: 720,  // 12 horas antes
    BEFORE_6_HOURS: 360,   // 6 horas antes
    BEFORE_1_HOUR: 60,     // 1 hora antes
    BEFORE_30_MIN: 30,     // 30 minutos antes
    BEFORE_15_MIN: 15,     // 15 minutos antes
    ON_TIME_MARGIN: 10,    // Margem de 10 minutos (antes e depois)
    OVERDUE_FIRST: 15,     // Primeiro aviso de atraso aos 15 min
    OVERDUE_INTERVAL: 15,  // A cada 15 minutos quando atrasado
    MAX_OVERDUE_HOURS: 3   // Máximo 3 horas até confirmação do usuário
  },
  TESTS: {
    BEFORE_24_HOURS: 1440, // 24 horas antes
    BEFORE_12_HOURS: 720,  // 12 horas antes
    BEFORE_6_HOURS: 360,   // 6 horas antes
    BEFORE_1_HOUR: 60,     // 1 hora antes
    BEFORE_30_MIN: 30,     // 30 minutos antes
    BEFORE_15_MIN: 15,     // 15 minutos antes
    ON_TIME_MARGIN: 10,    // Margem de 10 minutos (antes e depois)
    OVERDUE_FIRST: 15,     // Primeiro aviso de atraso aos 15 min
    OVERDUE_INTERVAL: 15,  // A cada 15 minutos quando atrasado
    MAX_OVERDUE_HOURS: 3   // Máximo 3 horas até confirmação do usuário
  }
};

// ========================================
// FUNÇÃO HELPER: Criar notificação enterprise com timing específico
// ========================================
const createEnterpriseNotification = async (data: {
  userId: number;
  type: string;
  title: string;
  message: string;
  patientId: number;
  relatedId?: number;
  relatedType: string;
  relatedItemName?: string;
  timingType: string; // Tipo específico do timing para evitar duplicatas
  originalScheduledTime: Date; // Horário original do medicamento/consulta/exame
}) => {
  try {
    console.log('🚀 SCHEDULER DEBUG: Iniciando createEnterpriseNotification:', {
      patientId: data.patientId,
      type: data.type,
      title: data.title,
      timingType: data.timingType
    });

    // Validar patientId
    if (!data.patientId || isNaN(data.patientId)) {
      console.error('❌ PatientId inválido:', data.patientId);
      return null;
    }

    // Buscar nome do paciente
    const patient = await storage.getUser(data.patientId);
    const patientName = patient ? patient.name : 'Paciente';

    console.log('👤 SCHEDULER DEBUG: Paciente encontrado:', {
      id: data.patientId,
      name: patientName
    });

    // Criar chave de deduplicação específica para o timing
    const today = new Date().toISOString().split('T')[0];
    const deduplicationKey = `${data.type}_${data.patientId}_${data.relatedId || 'general'}_${data.timingType}_${today}`;

    console.log('🔑 SCHEDULER DEBUG: Criando notificação global com chave:', deduplicationKey);

    // Criar notificação global (sem contexto HTTP no scheduler automático)
    const globalNotification = await storage.createGlobalNotification({
      patientId: data.patientId,
      patientName: patientName,
      type: data.type,
      subtype: data.type.includes('_') ? data.type.split('_')[1] : 'reminder',
      title: data.title,
      message: data.message,
      relatedId: data.relatedId || null,
      relatedType: data.relatedType,
      relatedItemName: data.relatedItemName || data.title,
      priority: 'normal',
      urgencyScore: 50,
      originalScheduledTime: data.originalScheduledTime,
      notificationTriggerTime: new Date(),
      processedAt: new Date(),
      distributedAt: new Date(),
      distributionCount: 0,
      batchId: `auto_${Date.now()}_${data.patientId}`,
      processingNode: 'scheduler_node',
      metadata: JSON.stringify({
        createdBy: 'scheduler',
        source: 'automatic',
        relatedId: data.relatedId,
        patientId: data.patientId,
        timingType: data.timingType,
        originalScheduledTime: data.originalScheduledTime.toISOString(),
        timestamp: new Date().toISOString()
      }),
      deduplicationKey: `${data.type}_${data.patientId}_${data.relatedId}_${data.timingType}_${format(new Date(), 'yyyy-MM-dd')}`,
      isActive: true,
      retryCount: 0,
      lastError: null
    });

    console.log('✅ SCHEDULER DEBUG: Notificação global criada:', {
      id: globalNotification?.id,
      patientId: globalNotification?.patientId,
      type: globalNotification?.type
    });

    // Buscar usuários com acesso ao paciente
    const authorizedUsers = await storage.getAllUsersWithPatientAccess(data.patientId);

    console.log('👥 SCHEDULER DEBUG: Usuários com acesso encontrados:', authorizedUsers.length);

    // Distribuir para usuários autorizados
    for (const user of authorizedUsers) {
      await storage.createUserNotification({
        userId: user.userId,
        globalNotificationId: globalNotification.id,
        userProfileType: user.userProfileType || 'patient',
        userName: user.userName || 'Usuário',
        accessType: user.accessType || 'owner',
        accessLevel: user.accessLevel || 'admin',
        deliveryStatus: 'delivered',
        isRead: false,
        deliveredAt: new Date(),
        readAt: null,
        acknowledgedAt: null,
        deliveryMethod: 'web',
        deliveryAttempts: 1,
        lastDeliveryError: null,
        priority: 'normal',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        // metadata removido - não existe na interface
      });
    }

    // Atualizar contador de distribuição
    await storage.updateGlobalNotification(globalNotification.id, {
      distributionCount: authorizedUsers.length
    });

    console.log(`📬 Notificação automática criada: ${data.type} para paciente ${data.patientId}`);
    return globalNotification;
  } catch (error) {
    console.error('❌ Erro ao criar notificação automática:', error);
    return null;
  }
};

// ========================================
// VERIFICAR MEDICAMENTOS
// ========================================
const checkMedicationNotifications = async () => {
  try {
    const now = new Date();

    // Buscar todos os medicamentos ativos
    const medications = await storage.getAllActiveMedications();
    console.log(`💊 Verificando ${medications.length} medicamentos ativos...`);

    for (const medication of medications) {
      // Validar patientId do medicamento
      const patientId = medication.patient_id || medication.patientId;
      if (!patientId || isNaN(patientId)) {
        console.error('❌ Medicamento com patientId inválido:', medication);
        continue;
      }

      // Buscar horários específicos do medicamento (não usar frequência genérica)
      const schedules = await storage.getSchedulesByMedication(medication.id);
      console.log(`📅 Medicamento ${medication.name} - ${schedules.length} horários programados`);

      // Processar schedules (específicos ou baseados na frequência)
      for (const schedule of schedules) {
        if (!schedule.is_active && !schedule.isActive) continue;

        // Usar horário específico do schedule
        const [hours, minutes] = schedule.scheduled_time.split(':');
        const scheduledTime = new Date();
        scheduledTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        const minutesDiff = differenceInMinutes(now, scheduledTime);

        console.log(`⏰ ${medication.name} - Horário: ${schedule.scheduled_time}, Diferença: ${minutesDiff} min`);

        // Verificar se já foi tomado hoje para este schedule específico
        let hasLogToday = false;

        if (typeof schedule.id === 'string' && schedule.id.startsWith('freq_')) {
          // Schedule baseado em frequência - verificar por hora
          hasLogToday = await storage.hasMedicationLogForToday(medication.id, parseInt(hours));
        } else {
          // Schedule específico do banco - verificar por schedule ID
          hasLogToday = await storage.hasMedicationLogForScheduleToday(medication.id, schedule.id);
        }

        if (hasLogToday) {
          console.log(`✅ ${medication.name} já foi tomado hoje às ${schedule.scheduled_time}`);
          continue;
        }

        // FORÇAR PROCESSAMENTO PARA DEBUGGING
        console.log(`🔄 PROCESSANDO: ${medication.name} às ${schedule.scheduled_time} (${minutesDiff} min de diferença)`);
        await processNotificationForTime(medication, patientId, scheduledTime, minutesDiff, schedule.scheduled_time, schedule.id);
      }
    }
  } catch (error) {
    console.error('❌ Erro ao verificar medicamentos:', error);
  }
};

// Função helper para processar notificações de um horário específico
const processNotificationForTime = async (medication: any, patientId: number, scheduledTime: Date, minutesDiff: number, timeString: string, scheduleId?: number) => {
  try {
    // Chave única baseada no medicamento e horário
    const relatedId = scheduleId || medication.id;
    const today = format(new Date(), 'yyyy-MM-dd');
    const hour = timeString.replace(':', '');

    console.log(`🎯 ANALISANDO TIMING: ${medication.name} às ${timeString} - Diferença: ${minutesDiff} min`);

    // 30 MINUTOS ANTES (margem ampliada para teste)
    if (minutesDiff >= -35 && minutesDiff <= -25) {
      const timingKey = `med_30min_before_${patientId}_${relatedId}_${hour}_${today}`;
      const alreadyNotified = await storage.hasSpecificNotificationToday(
        patientId,
        'medication_reminder',
        relatedId,
        timingKey
      );

      if (!alreadyNotified) {
        await createEnterpriseNotification({
          userId: patientId,
          type: 'medication_reminder',
          title: 'Lembrete de Medicamento',
          message: `${medication.name} deve ser tomado em 30 minutos (${timeString})`,
          patientId: patientId,
          relatedId: relatedId,
          relatedType: 'medication',
          relatedItemName: medication.name,
          timingType: timingKey,
          originalScheduledTime: scheduledTime
        });
        console.log(`📢 NOTIFICAÇÃO CRIADA: ${medication.name} - 30min antes às ${timeString}`);
      } else {
        console.log(`⏭️ NOTIFICAÇÃO JÁ EXISTE: ${medication.name} - 30min antes às ${timeString}`);
      }
    }

    // 15 MINUTOS ANTES (margem ampliada para teste)
    else if (minutesDiff >= -20 && minutesDiff <= -10) {
      const timingKey = `med_15min_before_${patientId}_${relatedId}_${hour}_${today}`;
      const alreadyNotified = await storage.hasSpecificNotificationToday(
        patientId,
        'medication_reminder',
        relatedId,
        timingKey
      );

      if (!alreadyNotified) {
        await createEnterpriseNotification({
          userId: patientId,
          type: 'medication_reminder',
          title: 'Medicamento em Breve',
          message: `${medication.name} deve ser tomado em 15 minutos (${timeString})`,
          patientId: patientId,
          relatedId: relatedId,
          relatedType: 'medication',
          relatedItemName: medication.name,
          timingType: timingKey,
          originalScheduledTime: scheduledTime
        });
        console.log(`📢 NOTIFICAÇÃO CRIADA: ${medication.name} - 15min antes às ${timeString}`);
      } else {
        console.log(`⏭️ NOTIFICAÇÃO JÁ EXISTE: ${medication.name} - 15min antes às ${timeString}`);
      }
    }

    // NA HORA (margem de 10 minutos antes e depois)
    else if (minutesDiff >= -10 && minutesDiff <= 10) {
      const timingKey = `med_on_time_${patientId}_${relatedId}_${hour}_${today}`;
      const alreadyNotified = await storage.hasSpecificNotificationToday(
        patientId,
        'medication_reminder',
        relatedId,
        timingKey
      );

      if (!alreadyNotified) {
        await createEnterpriseNotification({
          userId: patientId,
          type: 'medication_reminder',
          title: 'Hora do Medicamento',
          message: `${medication.name} deve ser tomado agora (${timeString})`,
          patientId: patientId,
          relatedId: relatedId,
          relatedType: 'medication',
          relatedItemName: medication.name,
          timingType: timingKey,
          originalScheduledTime: scheduledTime
        });
        console.log(`📢 NOTIFICAÇÃO CRIADA: ${medication.name} - na hora ${timeString}`);
      } else {
        console.log(`⏭️ NOTIFICAÇÃO JÁ EXISTE: ${medication.name} - na hora ${timeString}`);
      }
    }

    // PRIMEIRO AVISO DE ATRASO (15 minutos - margem ampliada)
    else if (minutesDiff >= 10 && minutesDiff <= 20) {
      const timingKey = `med_15min_overdue_${patientId}_${relatedId}_${hour}_${today}`;
      const alreadyNotified = await storage.hasSpecificNotificationToday(
        patientId,
        'medication_overdue',
        relatedId,
        timingKey
      );

      if (!alreadyNotified) {
        await createEnterpriseNotification({
          userId: patientId,
          type: 'medication_overdue',
          title: 'Medicamento Atrasado',
          message: `${medication.name} está ${minutesDiff} minutos atrasado (era para ${timeString})`,
          patientId: patientId,
          relatedId: relatedId,
          relatedType: 'medication',
          relatedItemName: medication.name,
          timingType: timingKey,
          originalScheduledTime: scheduledTime
        });
        console.log(`📢 NOTIFICAÇÃO CRIADA: ${medication.name} - 15min atraso ${timeString}`);
      } else {
        console.log(`⏭️ NOTIFICAÇÃO JÁ EXISTE: ${medication.name} - 15min atraso ${timeString}`);
      }
    }

    // AVISOS CONTÍNUOS DE ATRASO (a cada 5 minutos após 20 min de atraso)
    else if (minutesDiff > 20 && minutesDiff <= 1440 && (minutesDiff - 20) % 5 === 0) {
      const timingKey = `med_continuous_${patientId}_${relatedId}_${hour}_${today}_${minutesDiff}`;
      const alreadyNotified = await storage.hasSpecificNotificationToday(
        patientId,
        'medication_overdue',
        relatedId,
        timingKey
      );

      if (!alreadyNotified) {
        await createEnterpriseNotification({
          userId: patientId,
          type: 'medication_overdue',
          title: 'Medicamento Atrasado',
          message: `${medication.name} ainda não foi tomado - ${minutesDiff} minutos de atraso (era para ${timeString})`,
          patientId: patientId,
          relatedId: relatedId,
          relatedType: 'medication',
          relatedItemName: medication.name,
          timingType: timingKey,
          originalScheduledTime: scheduledTime
        });
        console.log(`📢 NOTIFICAÇÃO CRIADA: ${medication.name} - atraso contínuo ${minutesDiff}min ${timeString}`);
      } else {
        console.log(`⏭️ NOTIFICAÇÃO JÁ EXISTE: ${medication.name} - atraso contínuo ${minutesDiff}min ${timeString}`);
      }
    }

    else {
      console.log(`⏸️ FORA DA JANELA DE NOTIFICAÇÃO: ${medication.name} às ${timeString} (${minutesDiff} min)`);
    }
  } catch (error) {
    console.error('❌ Erro ao processar notificação para horário:', error);
  }
};

// ========================================
// VERIFICAR CONSULTAS
// ========================================
const checkAppointmentNotifications = async () => {
  try {
    const now = new Date();

    // Buscar consultas de hoje e amanhã
    const appointments = await storage.getUpcomingAppointments();

    for (const appointment of appointments) {
      const appointmentTime = new Date(appointment.appointment_date);
      const minutesDiff = differenceInMinutes(now, appointmentTime);

      // Verificar se já foi concluída ou cancelada
      if (appointment.status === 'completed' || appointment.status === 'cancelled') continue;

      // Validar patientId da consulta
      if (!appointment.patient_id || isNaN(appointment.patient_id)) {
        console.error('❌ Consulta com patientId inválido:', appointment);
        continue;
      }

      // As verificações específicas de timing serão feitas para cada caso individual

      // 24 HORAS ANTES (margem de 60 minutos)
      if (minutesDiff >= -NOTIFICATION_TIMINGS.APPOINTMENTS.BEFORE_24_HOURS - 60 &&
          minutesDiff <= -NOTIFICATION_TIMINGS.APPOINTMENTS.BEFORE_24_HOURS + 60) {

        const timingKey = `apt_24h_before_${appointment.patient_id}_${appointment.id}_${format(appointmentTime, 'yyyy-MM-dd')}`;
        const has24HoursBefore = await storage.hasSpecificNotificationToday(
          appointment.patient_id,
          'appointment_reminder',
          appointment.id,
          timingKey
        );

        if (!has24HoursBefore) {
          await createEnterpriseNotification({
            userId: appointment.patient_id,
            type: 'appointment_reminder',
            title: 'Consulta Amanhã',
            message: `Consulta "${appointment.title}" com ${appointment.doctor_name} em 24 horas (${format(appointmentTime, "dd/MM 'às' HH:mm", { locale: ptBR })})`,
            patientId: appointment.patient_id,
            relatedId: appointment.id,
            relatedType: 'appointment',
            relatedItemName: appointment.title,
            timingType: timingKey,
            originalScheduledTime: appointmentTime
          });
          console.log(`📢 CONSULTA NOTIFICAÇÃO: ${appointment.title} - 24h antes`);
        }
      }

      // 12 HORAS ANTES (margem de 30 minutos)
      if (minutesDiff >= -NOTIFICATION_TIMINGS.APPOINTMENTS.BEFORE_12_HOURS - 30 &&
          minutesDiff <= -NOTIFICATION_TIMINGS.APPOINTMENTS.BEFORE_12_HOURS + 30) {

        const timingKey = `apt_12h_before_${appointment.patient_id}_${appointment.id}_${format(appointmentTime, 'yyyy-MM-dd')}`;
        const has12HoursBefore = await storage.hasSpecificNotificationToday(
          appointment.patient_id,
          'appointment_reminder',
          appointment.id,
          timingKey
        );

        if (!has12HoursBefore) {
          await createEnterpriseNotification({
            userId: appointment.patient_id,
            type: 'appointment_reminder',
            title: 'Consulta em 12 Horas',
            message: `Consulta "${appointment.title}" com ${appointment.doctor_name} em 12 horas (${format(appointmentTime, "HH:mm", { locale: ptBR })})`,
            patientId: appointment.patient_id,
            relatedId: appointment.id,
            relatedType: 'appointment',
            relatedItemName: appointment.title,
            timingType: timingKey,
            originalScheduledTime: appointmentTime
          });
          console.log(`📢 CONSULTA NOTIFICAÇÃO: ${appointment.title} - 12h antes`);
        }
      }

      // 6 HORAS ANTES (margem de 15 minutos)
      if (minutesDiff >= -NOTIFICATION_TIMINGS.APPOINTMENTS.BEFORE_6_HOURS - 15 &&
          minutesDiff <= -NOTIFICATION_TIMINGS.APPOINTMENTS.BEFORE_6_HOURS + 15) {

        const timingKey = `apt_6h_before_${appointment.patient_id}_${appointment.id}_${format(appointmentTime, 'yyyy-MM-dd')}`;
        const has6HoursBefore = await storage.hasSpecificNotificationToday(
          appointment.patient_id,
          'appointment_reminder',
          appointment.id,
          timingKey
        );

        if (!has6HoursBefore) {
          await createEnterpriseNotification({
            userId: appointment.patient_id,
            type: 'appointment_reminder',
            title: 'Consulta em 6 Horas',
            message: `Consulta "${appointment.title}" com ${appointment.doctor_name} em 6 horas (${format(appointmentTime, "HH:mm", { locale: ptBR })})`,
            patientId: appointment.patient_id,
            relatedId: appointment.id,
            relatedType: 'appointment',
            relatedItemName: appointment.title,
            timingType: timingKey,
            originalScheduledTime: appointmentTime
          });
          console.log(`📢 CONSULTA NOTIFICAÇÃO: ${appointment.title} - 6h antes`);
        }
      }

      // 1 HORA ANTES (margem de 5 minutos)
      if (minutesDiff >= -NOTIFICATION_TIMINGS.APPOINTMENTS.BEFORE_1_HOUR - 5 &&
          minutesDiff <= -NOTIFICATION_TIMINGS.APPOINTMENTS.BEFORE_1_HOUR + 5) {

        const timingKey = `apt_1h_before_${appointment.patient_id}_${appointment.id}_${format(appointmentTime, 'yyyy-MM-dd')}`;
        const has1HourBefore = await storage.hasSpecificNotificationToday(
          appointment.patient_id,
          'appointment_reminder',
          appointment.id,
          timingKey
        );

        if (!has1HourBefore) {
          await createEnterpriseNotification({
            userId: appointment.patient_id,
            type: 'appointment_reminder',
            title: 'Consulta em 1 Hora',
            message: `Consulta "${appointment.title}" com ${appointment.doctor_name} em 1 hora (${format(appointmentTime, "HH:mm", { locale: ptBR })})`,
            patientId: appointment.patient_id,
            relatedId: appointment.id,
            relatedType: 'appointment',
            relatedItemName: appointment.title,
            timingType: timingKey,
            originalScheduledTime: appointmentTime
          });
          console.log(`📢 CONSULTA NOTIFICAÇÃO: ${appointment.title} - 1h antes`);
        }
      }

      // 30 MINUTOS ANTES (margem de 2 minutos)
      if (minutesDiff >= -NOTIFICATION_TIMINGS.APPOINTMENTS.BEFORE_30_MIN - 2 &&
          minutesDiff <= -NOTIFICATION_TIMINGS.APPOINTMENTS.BEFORE_30_MIN + 2) {

        const timingKey = `apt_30min_before_${appointment.patient_id}_${appointment.id}_${format(appointmentTime, 'yyyy-MM-dd')}`;
        const has30MinBefore = await storage.hasSpecificNotificationToday(
          appointment.patient_id,
          'appointment_reminder',
          appointment.id,
          timingKey
        );

        if (!has30MinBefore) {
          await createEnterpriseNotification({
            userId: appointment.patient_id,
            type: 'appointment_reminder',
            title: 'Consulta em 30 Minutos',
            message: `Consulta "${appointment.title}" com ${appointment.doctor_name} em 30 minutos (${format(appointmentTime, "HH:mm", { locale: ptBR })})`,
            patientId: appointment.patient_id,
            relatedId: appointment.id,
            relatedType: 'appointment',
            relatedItemName: appointment.title,
            timingType: timingKey,
            originalScheduledTime: appointmentTime
          });
          console.log(`📢 CONSULTA NOTIFICAÇÃO: ${appointment.title} - 30min antes`);
        }
      }

      // 15 MINUTOS ANTES (margem de 1 minuto)
      if (minutesDiff >= -NOTIFICATION_TIMINGS.APPOINTMENTS.BEFORE_15_MIN - 1 &&
          minutesDiff <= -NOTIFICATION_TIMINGS.APPOINTMENTS.BEFORE_15_MIN + 1) {

        const timingKey = `apt_15min_before_${appointment.patient_id}_${appointment.id}_${format(appointmentTime, 'yyyy-MM-dd')}`;
        const has15MinBefore = await storage.hasSpecificNotificationToday(
          appointment.patient_id,
          'appointment_reminder',
          appointment.id,
          timingKey
        );

        if (!has15MinBefore) {
          await createEnterpriseNotification({
            userId: appointment.patient_id,
            type: 'appointment_reminder',
            title: 'Consulta em Breve',
            message: `Consulta "${appointment.title}" com ${appointment.doctor_name} em 15 minutos (${format(appointmentTime, "HH:mm", { locale: ptBR })})`,
            patientId: appointment.patient_id,
            relatedId: appointment.id,
            relatedType: 'appointment',
            relatedItemName: appointment.title,
            timingType: timingKey,
            originalScheduledTime: appointmentTime
          });
          console.log(`📢 CONSULTA NOTIFICAÇÃO: ${appointment.title} - 15min antes`);
        }
      }

      // NA HORA (margem de 10 minutos)
      if (minutesDiff >= -NOTIFICATION_TIMINGS.APPOINTMENTS.ON_TIME_MARGIN &&
          minutesDiff <= NOTIFICATION_TIMINGS.APPOINTMENTS.ON_TIME_MARGIN) {

        const timingKey = `apt_on_time_${appointment.patient_id}_${appointment.id}_${format(appointmentTime, 'yyyy-MM-dd')}`;
        const hasOnTime = await storage.hasSpecificNotificationToday(
          appointment.patient_id,
          'appointment_reminder',
          appointment.id,
          timingKey
        );

        if (!hasOnTime) {
          await createEnterpriseNotification({
            userId: appointment.patient_id,
            type: 'appointment_reminder',
            title: 'Hora da Consulta',
            message: `Consulta "${appointment.title}" com ${appointment.doctor_name} é agora (${format(appointmentTime, "HH:mm", { locale: ptBR })})`,
            patientId: appointment.patient_id,
            relatedId: appointment.id,
            relatedType: 'appointment',
            relatedItemName: appointment.title,
            timingType: timingKey,
            originalScheduledTime: appointmentTime
          });
          console.log(`📢 CONSULTA NOTIFICAÇÃO: ${appointment.title} - na hora`);
        }
      }

      // PRIMEIRO AVISO DE ATRASO (15 minutos)
      if (minutesDiff >= NOTIFICATION_TIMINGS.APPOINTMENTS.OVERDUE_FIRST - 1 &&
          minutesDiff <= NOTIFICATION_TIMINGS.APPOINTMENTS.OVERDUE_FIRST + 1) {

        const timingKey = `apt_15min_overdue_${appointment.patient_id}_${appointment.id}_${format(appointmentTime, 'yyyy-MM-dd')}`;
        const hasFirstOverdue = await storage.hasSpecificNotificationToday(
          appointment.patient_id,
          'appointment_overdue',
          appointment.id,
          timingKey
        );

        if (!hasFirstOverdue) {
          await createEnterpriseNotification({
            userId: appointment.patient_id,
            type: 'appointment_overdue',
            title: 'Consulta Atrasada',
            message: `Consulta "${appointment.title}" está ${minutesDiff} minutos atrasada (era para ${format(appointmentTime, "HH:mm", { locale: ptBR })}). Confirme se compareceu.`,
            patientId: appointment.patient_id,
            relatedId: appointment.id,
            relatedType: 'appointment',
            relatedItemName: appointment.title,
            timingType: timingKey,
            originalScheduledTime: appointmentTime
          });
          console.log(`📢 CONSULTA NOTIFICAÇÃO: ${appointment.title} - 15min atraso`);
        }
      }

      // AVISOS CONTÍNUOS DE ATRASO (a cada 15 minutos)
      if (minutesDiff > NOTIFICATION_TIMINGS.APPOINTMENTS.OVERDUE_FIRST &&
          minutesDiff <= NOTIFICATION_TIMINGS.APPOINTMENTS.MAX_OVERDUE_HOURS * 60 &&
          (minutesDiff - NOTIFICATION_TIMINGS.APPOINTMENTS.OVERDUE_FIRST) % NOTIFICATION_TIMINGS.APPOINTMENTS.OVERDUE_INTERVAL === 0) {

        const timingKey = `apt_continuous_${appointment.patient_id}_${appointment.id}_${format(appointmentTime, 'yyyy-MM-dd')}_${minutesDiff}`;
        const hasContinuousOverdue = await storage.hasSpecificNotificationToday(
          appointment.patient_id,
          'appointment_overdue',
          appointment.id,
          timingKey
        );

        if (!hasContinuousOverdue) {
          await createEnterpriseNotification({
            userId: appointment.patient_id,
            type: 'appointment_overdue',
            title: 'Confirme sua Consulta',
            message: `Consulta "${appointment.title}" estava marcada para ${format(appointmentTime, "HH:mm", { locale: ptBR })} (${minutesDiff} min atrás). Por favor, confirme se compareceu.`,
            patientId: appointment.patient_id,
            relatedId: appointment.id,
            relatedType: 'appointment',
            relatedItemName: appointment.title,
            timingType: timingKey,
            originalScheduledTime: appointmentTime
          });
          console.log(`📢 CONSULTA NOTIFICAÇÃO: ${appointment.title} - atraso contínuo ${minutesDiff}min`);
        }
      }
    }
  } catch (error) {
    console.error('❌ Erro ao verificar consultas:', error);
  }
};

// ========================================
// VERIFICAR EXAMES
// ========================================
const checkTestNotifications = async () => {
  try {
    const now = new Date();

    // Buscar exames de hoje e amanhã
    const tests = await storage.getUpcomingTests();

    for (const test of tests) {
      const testTime = new Date(test.test_date);
      const minutesDiff = differenceInMinutes(now, testTime);

      // Verificar se já foi concluído ou cancelado
      if (test.status === 'completed' || test.status === 'cancelled') continue;

      // Validar patientId do exame
      if (!test.patient_id || isNaN(test.patient_id)) {
        console.error('❌ Exame com patientId inválido:', test);
        continue;
      }

      // As verificações específicas de timing serão feitas para cada caso individual

      // 24 HORAS ANTES (margem de 60 minutos)
      if (minutesDiff >= -NOTIFICATION_TIMINGS.TESTS.BEFORE_24_HOURS - 60 &&
          minutesDiff <= -NOTIFICATION_TIMINGS.TESTS.BEFORE_24_HOURS + 60) {

        const timingKey = `test_24h_before_${test.patient_id}_${test.id}_${format(testTime, 'yyyy-MM-dd')}`;
        const has24HoursBefore = await storage.hasSpecificNotificationToday(
          test.patient_id,
          'test_reminder',
          test.id,
          timingKey
        );

        if (!has24HoursBefore) {
          await createEnterpriseNotification({
            userId: test.patient_id,
            type: 'test_reminder',
            title: 'Exame Amanhã',
            message: `Exame "${test.name}" em 24 horas (${format(testTime, "dd/MM 'às' HH:mm", { locale: ptBR })})`,
            patientId: test.patient_id,
            relatedId: test.id,
            relatedType: 'test',
            relatedItemName: test.name,
            timingType: timingKey,
            originalScheduledTime: testTime
          });
          console.log(`📢 EXAME NOTIFICAÇÃO: ${test.name} - 24h antes`);
        }
      }

      // 12 HORAS ANTES
      const has12HoursBefore = await storage.hasSpecificNotificationToday(
        test.patient_id,
        'test',
        test.id,
        '12h_before'
      );

      if (minutesDiff >= -NOTIFICATION_TIMINGS.TESTS.BEFORE_12_HOURS - 30 &&
          minutesDiff <= -NOTIFICATION_TIMINGS.TESTS.BEFORE_12_HOURS + 30 &&
          !has12HoursBefore) {

        await createEnterpriseNotification({
          userId: test.patient_id,
          type: 'test_reminder',
          title: 'Exame em 12 Horas',
          message: `Exame "${test.name}" em 12 horas (era para ${format(testTime, "HH:mm", { locale: ptBR })})`,
          patientId: test.patient_id,
          relatedId: test.id,
          relatedType: 'test',
          relatedItemName: test.name,
          timingType: '12h_before',
          originalScheduledTime: testTime
        });
      }

      // 6 HORAS ANTES
      const has6HoursBefore = await storage.hasSpecificNotificationToday(
        test.patient_id,
        'test',
        test.id,
        '6h_before'
      );

      if (minutesDiff >= -NOTIFICATION_TIMINGS.TESTS.BEFORE_6_HOURS - 15 &&
          minutesDiff <= -NOTIFICATION_TIMINGS.TESTS.BEFORE_6_HOURS + 15 &&
          !has6HoursBefore) {

        await createEnterpriseNotification({
          userId: test.patient_id,
          type: 'test_reminder',
          title: 'Exame em 6 Horas',
          message: `Exame "${test.name}" em 6 horas (era para ${format(testTime, "HH:mm", { locale: ptBR })})`,
          patientId: test.patient_id,
          relatedId: test.id,
          relatedType: 'test',
          relatedItemName: test.name,
          timingType: '6h_before',
          originalScheduledTime: testTime
        });
      }

      // 1 HORA ANTES
      const has1HourBefore = await storage.hasSpecificNotificationToday(
        test.patient_id,
        'test',
        test.id,
        '1h_before'
      );

      if (minutesDiff >= -NOTIFICATION_TIMINGS.TESTS.BEFORE_1_HOUR - 5 &&
          minutesDiff <= -NOTIFICATION_TIMINGS.TESTS.BEFORE_1_HOUR + 5 &&
          !has1HourBefore) {

        await createEnterpriseNotification({
          userId: test.patient_id,
          type: 'test_reminder',
          title: 'Exame em 1 Hora',
          message: `Exame "${test.name}" em 1 hora (era para ${format(testTime, "HH:mm", { locale: ptBR })})`,
          patientId: test.patient_id,
          relatedId: test.id,
          relatedType: 'test',
          relatedItemName: test.name,
          timingType: '1h_before',
          originalScheduledTime: testTime
        });
      }

      // 30 MINUTOS ANTES
      const has30MinBefore = await storage.hasSpecificNotificationToday(
        test.patient_id,
        'test',
        test.id,
        '30min_before'
      );

      if (minutesDiff >= -NOTIFICATION_TIMINGS.TESTS.BEFORE_30_MIN - 2 &&
          minutesDiff <= -NOTIFICATION_TIMINGS.TESTS.BEFORE_30_MIN + 2 &&
          !has30MinBefore) {

        await createEnterpriseNotification({
          userId: test.patient_id,
          type: 'test_reminder',
          title: 'Exame em 30 Minutos',
          message: `Exame "${test.name}" em 30 minutos (era para ${format(testTime, "HH:mm", { locale: ptBR })})`,
          patientId: test.patient_id,
          relatedId: test.id,
          relatedType: 'test',
          relatedItemName: test.name,
          timingType: '30min_before',
          originalScheduledTime: testTime
        });
      }

      // 15 MINUTOS ANTES
      const has15MinBefore = await storage.hasSpecificNotificationToday(
        test.patient_id,
        'test',
        test.id,
        '15min_before'
      );

      if (minutesDiff >= -NOTIFICATION_TIMINGS.TESTS.BEFORE_15_MIN - 1 &&
          minutesDiff <= -NOTIFICATION_TIMINGS.TESTS.BEFORE_15_MIN + 1 &&
          !has15MinBefore) {

        await createEnterpriseNotification({
          userId: test.patient_id,
          type: 'test_reminder',
          title: 'Exame em Breve',
          message: `Exame "${test.name}" em 15 minutos (era para ${format(testTime, "HH:mm", { locale: ptBR })})`,
          patientId: test.patient_id,
          relatedId: test.id,
          relatedType: 'test',
          relatedItemName: test.name,
          timingType: '15min_before',
          originalScheduledTime: testTime
        });
      }

      // NA HORA (margem de 10 minutos)
      const hasOnTime = await storage.hasSpecificNotificationToday(
        test.patient_id,
        'test',
        test.id,
        'on_time'
      );

      if (minutesDiff >= -NOTIFICATION_TIMINGS.TESTS.ON_TIME_MARGIN &&
          minutesDiff <= NOTIFICATION_TIMINGS.TESTS.ON_TIME_MARGIN &&
          !hasOnTime) {

        await createEnterpriseNotification({
          userId: test.patient_id,
          type: 'test_reminder',
          title: 'Hora do Exame',
          message: `Exame "${test.name}" é agora (era para ${format(testTime, "HH:mm", { locale: ptBR })})`,
          patientId: test.patient_id,
          relatedId: test.id,
          relatedType: 'test',
          relatedItemName: test.name,
          timingType: 'on_time',
          originalScheduledTime: testTime
        });
      }

      // PRIMEIRO AVISO DE ATRASO (15 minutos)
      const hasFirstOverdue = await storage.hasSpecificNotificationToday(
        test.patient_id,
        'test',
        test.id,
        '15min_overdue'
      );

      if (minutesDiff >= NOTIFICATION_TIMINGS.TESTS.OVERDUE_FIRST - 1 &&
          minutesDiff <= NOTIFICATION_TIMINGS.TESTS.OVERDUE_FIRST + 1 &&
          !hasFirstOverdue) {

        await createEnterpriseNotification({
          userId: test.patient_id,
          type: 'test_overdue',
          title: 'Exame Atrasado',
          message: `Exame "${test.name}" está ${minutesDiff} minutos atrasado (era para ${format(testTime, "HH:mm", { locale: ptBR })}). Confirme se compareceu.`,
          patientId: test.patient_id,
          relatedId: test.id,
          relatedType: 'test',
          relatedItemName: test.name,
          timingType: '15min_overdue',
          originalScheduledTime: testTime
        });
      }

      // AVISOS CONTÍNUOS DE ATRASO (a cada 15 minutos)
      if (minutesDiff > NOTIFICATION_TIMINGS.TESTS.OVERDUE_FIRST &&
          minutesDiff <= NOTIFICATION_TIMINGS.TESTS.MAX_OVERDUE_HOURS * 60 &&
          (minutesDiff - NOTIFICATION_TIMINGS.TESTS.OVERDUE_FIRST) % NOTIFICATION_TIMINGS.TESTS.OVERDUE_INTERVAL === 0) {

        const hasContinuousOverdue = await storage.hasSpecificNotificationToday(
          test.patient_id,
          'test',
          test.id,
          `continuous_overdue_${minutesDiff}`
        );

        if (!hasContinuousOverdue) {
          await createEnterpriseNotification({
            userId: test.patient_id,
            type: 'test_overdue',
            title: 'Confirme seu Exame',
            message: `Exame "${test.name}" estava marcado para ${format(testTime, "HH:mm", { locale: ptBR })} (${minutesDiff} min atrás). Por favor, confirme se compareceu.`,
            patientId: test.patient_id,
            relatedId: test.id,
            relatedType: 'test',
            relatedItemName: test.name,
            timingType: `continuous_overdue_${minutesDiff}`,
            originalScheduledTime: testTime
          });
        }
      }
    }
  } catch (error) {
    console.error('❌ Erro ao verificar exames:', error);
  }
};

// ========================================
// SCHEDULER ENTERPRISE COM JOBS PARALELOS
// ========================================
import { jobManager } from "./notification-job-manager";

let schedulerInterval: NodeJS.Timeout | null = null;

export const startNotificationScheduler = () => {
  console.log('🚀 Iniciando Sistema de Notificações Médicas...');

  // ========================================
  // 1. SCHEDULER DE TIMING PRECISO (30 segundos)
  // Para notificações com timing exato (medicamentos)
  // ========================================
  const preciseTimingInterval = setInterval(async () => {
    try {
      const now = new Date();
      const seconds = now.getSeconds();

      // Log apenas a cada minuto (quando segundos = 0 ou 30)
      if (seconds === 0 || seconds === 30) {
        console.log('⏰ Verificação:', now.toLocaleTimeString('pt-BR'));
      }

      // Verificações de timing crítico
      await Promise.all([
        checkMedicationNotifications(),
        checkAppointmentNotifications(),
        checkTestNotifications()
      ]);

    } catch (error) {
      console.error('❌ Erro no timing preciso:', error);
    }
  }, 30000); // 30 segundos = timing muito preciso

  // ========================================
  // 2. SCHEDULER ENTERPRISE (a cada 10 minutos)
  // Apenas para analytics, métricas e limpeza
  // ========================================
  schedulerInterval = setInterval(async () => {
    try {
      console.log('📊 INICIANDO ANALYTICS ENTERPRISE...');
      const startTime = Date.now();

      // CRIAR JOBS ENTERPRISE PARA ANALYTICS (não para notificações)
      // Analytics simplificado - sem criação de jobs de teste
      console.log('📊 Coletando métricas...');
      const results = [];

      const processingTime = Date.now() - startTime;
      console.log(`✅ ANALYTICS CONCLUÍDO em ${processingTime}ms`);

      // REGISTRAR MÉTRICAS ENTERPRISE
      await jobManager.recordCycleMetrics(results, processingTime);

      // APLICAR RATE LIMITING
      await jobManager.applyRateLimit();

      // LIMPEZA AUTOMÁTICA A CADA 3 CICLOS (30 MINUTOS)
      const cycleNumber = Math.floor(Date.now() / (10 * 60 * 1000)) % 3;
      if (cycleNumber === 0) {
        console.log('🧹 Executando limpeza automática...');
        await jobManager.cleanupOldJobs();
        await jobManager.cleanupOldMetrics();
      }

      console.log('📊 ANALYTICS ENTERPRISE COMPLETO');

    } catch (error) {
      console.error('❌ Erro no analytics ENTERPRISE:', error);
      await jobManager.recordErrorMetrics(error);
    }
  }, 10 * 60000); // 10 minutos para analytics

  console.log('✅ Sistema de Notificações Ativo:');
  console.log('   ⏰ Verificação: 30 segundos');
  console.log('   📊 Analytics: 10 minutos');
};

export const stopNotificationScheduler = () => {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('🛑 Scheduler automático parado');
  }
};