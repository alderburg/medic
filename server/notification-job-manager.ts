// ========================================
// SISTEMA ENTERPRISE DE GERENCIAMENTO DE JOBS DE NOTIFICAÇÃO
// Processamento em lote com até 20.000 notificações simultâneas
// ========================================

import { enterpriseStorage as storage } from "./storage-enterprise";
import { format, addMinutes, subMinutes, differenceInMinutes, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { v4 as uuidv4 } from 'uuid';

// ========================================
// CONFIGURAÇÕES ENTERPRISE
// ========================================

const JOB_CONFIG = {
  BATCH_SIZE: 500,           // Processar 500 pacientes por vez
  MAX_PARALLEL_JOBS: 40,     // 40 jobs paralelos = 20k notificações simultâneas
  JOB_TIMEOUT: 300000,       // 5 minutos timeout por job
  HEARTBEAT_INTERVAL: 30000, // Heartbeat a cada 30 segundos
  RETRY_ATTEMPTS: 3,         // 3 tentativas por job
  CLEANUP_HOURS: 24          // Limpar jobs antigos após 24h
};

// ========================================
// TIPOS DE JOBS ENTERPRISE
// ========================================

interface NotificationJobData {
  jobId: string;
  type: 'medication_scan' | 'appointment_scan' | 'test_scan' | 'cleanup_job';
  subtype: string;
  patientBatchStart: number;
  patientBatchEnd: number;
  totalPatients: number;
  config: any;
}

interface JobMetrics {
  totalProcessed: number;
  successCount: number;
  errorCount: number;
  skippedCount: number;
  processingTimeMs: number;
  notificationsCreated: number;
}

// ========================================
// GERENCIADOR PRINCIPAL DE JOBS
// ========================================

export class NotificationJobManager {
  private activeJobs = new Map<string, NodeJS.Timeout>();
  private jobMetrics = new Map<string, JobMetrics>();

  // ========================================
  // CRIAR JOB DE PROCESSAMENTO
  // ========================================
  async createNotificationJob(type: string, subtype: string, config: any = {}): Promise<string> {
    const jobId = `${type}_${subtype}_${Date.now()}_${uuidv4().split('-')[0]}`;
    
    try {
      // Obter total de pacientes ativos
      const totalPatients = await storage.getTotalActivePatients();
      
      // Criar job principal no banco
      const job = await storage.createNotificationJob({
        jobId,
        jobType: type as any, // Campo correto
        type: type as any,    // Manter compatibilidade
        subtype,
        status: 'pending',
        priority: this.getJobPriority(type),
        scope: 'global',
        patientBatchStart: 0,
        patientBatchEnd: totalPatients,
        batchSize: JOB_CONFIG.BATCH_SIZE,
        maxRetries: JOB_CONFIG.RETRY_ATTEMPTS,
        timeoutSeconds: JOB_CONFIG.JOB_TIMEOUT / 1000,
        totalItems: totalPatients,
        config: JSON.stringify(config),
        scheduledFor: new Date(),
        processingNode: `node_${process.pid}_${Date.now()}`
      });

      console.log(`📊 JOB CRIADO: ${jobId} para ${totalPatients} pacientes`);
      return jobId;
    } catch (error) {
      console.error(`❌ Erro ao criar job ${jobId}:`, error);
      throw error;
    }
  }

  // ========================================
  // EXECUTAR JOBS EM LOTE PARALELO
  // ========================================
  async executeJobInBatches(jobId: string): Promise<void> {
    try {
      const startTime = Date.now();
      
      // Marcar job como iniciado
      await storage.updateNotificationJobByJobId(jobId, {
        status: 'running',
        startedAt: new Date(),
        lastHeartbeat: new Date()
      });

      // Obter dados do job
      const jobs = await storage.getActiveNotificationJobs();
      const job = jobs.find(j => j.jobId === jobId);
      
      if (!job) {
        throw new Error(`Job ${jobId} não encontrado`);
      }

      const totalPatients = job.totalItems;
      const batches = Math.ceil(totalPatients / JOB_CONFIG.BATCH_SIZE);
      
      console.log(`🚀 EXECUTANDO JOB: ${jobId}`);
      console.log(`📊 Total de pacientes: ${totalPatients}`);
      console.log(`📦 Lotes a processar: ${batches}`);
      console.log(`⚡ Jobs paralelos: ${Math.min(batches, JOB_CONFIG.MAX_PARALLEL_JOBS)}`);

      // Inicializar métricas
      this.jobMetrics.set(jobId, {
        totalProcessed: 0,
        successCount: 0,
        errorCount: 0,
        skippedCount: 0,
        processingTimeMs: 0,
        notificationsCreated: 0
      });

      // Criar heartbeat
      const heartbeatInterval = setInterval(async () => {
        await storage.updateNotificationJobByJobId(jobId, {
          lastHeartbeat: new Date()
        });
      }, JOB_CONFIG.HEARTBEAT_INTERVAL);

      // Processar lotes em paralelo limitado
      const batchPromises: Promise<void>[] = [];
      const concurrencyLimit = Math.min(batches, JOB_CONFIG.MAX_PARALLEL_JOBS);
      
      for (let i = 0; i < batches; i += concurrencyLimit) {
        const currentBatches = [];
        
        for (let j = 0; j < concurrencyLimit && (i + j) < batches; j++) {
          const batchIndex = i + j;
          const startPatient = batchIndex * JOB_CONFIG.BATCH_SIZE;
          const endPatient = Math.min(startPatient + JOB_CONFIG.BATCH_SIZE, totalPatients);
          
          currentBatches.push(this.processBatch(jobId, job.type, job.subtype, startPatient, endPatient));
        }
        
        // Executar lotes atuais em paralelo
        await Promise.all(currentBatches);
      }

      // Limpar heartbeat
      clearInterval(heartbeatInterval);

      // Finalizar job
      const metrics = this.jobMetrics.get(jobId);
      const processingTime = Date.now() - startTime;

      await storage.updateNotificationJobByJobId(jobId, {
        status: 'completed',
        completedAt: new Date(),
        processedItems: metrics?.totalProcessed || 0,
        successCount: metrics?.successCount || 0,
        errorCount: metrics?.errorCount || 0,
        skippedCount: metrics?.skippedCount || 0,
        result: JSON.stringify({
          notificationsCreated: metrics?.notificationsCreated || 0,
          processingTimeMs: processingTime,
          batchesProcessed: batches
        })
      });

      // Criar métricas de performance
      await this.createJobMetrics(jobId, metrics!, processingTime);

      console.log(`✅ JOB CONCLUÍDO: ${jobId}`);
      console.log(`📊 Processados: ${metrics?.totalProcessed || 0} pacientes`);
      console.log(`📬 Notificações criadas: ${metrics?.notificationsCreated || 0}`);
      console.log(`⏱️ Tempo total: ${processingTime}ms`);

    } catch (error) {
      console.error(`❌ Erro ao executar job ${jobId}:`, error);
      
      await storage.updateNotificationJobByJobId(jobId, {
        status: 'failed',
        completedAt: new Date(),
        errorMessage: error.message,
        errorStack: error.stack
      });
      
      throw error;
    }
  }

  // ========================================
  // PROCESSAR LOTE INDIVIDUAL
  // ========================================
  private async processBatch(jobId: string, type: string, subtype: string, startPatient: number, endPatient: number): Promise<void> {
    try {
      console.log(`📦 Processando lote ${startPatient}-${endPatient} do job ${jobId}`);
      
      // Buscar pacientes do lote
      const patients = await storage.getActivePatientsInBatch(startPatient, endPatient - startPatient);
      
      let notificationsCreated = 0;
      let processedCount = 0;
      let errorCount = 0;

      // Processar cada paciente
      for (const patient of patients) {
        try {
          const created = await this.processPatientNotifications(patient.id, type, subtype);
          notificationsCreated += created;
          processedCount++;
        } catch (error) {
          console.error(`❌ Erro ao processar paciente ${patient.id}:`, error);
          errorCount++;
        }
      }

      // Atualizar métricas
      const metrics = this.jobMetrics.get(jobId);
      if (metrics) {
        metrics.totalProcessed += processedCount;
        metrics.successCount += processedCount;
        metrics.errorCount += errorCount;
        metrics.notificationsCreated += notificationsCreated;
      }

      console.log(`✅ Lote ${startPatient}-${endPatient} concluído: ${processedCount} pacientes, ${notificationsCreated} notificações`);
      
    } catch (error) {
      console.error(`❌ Erro no lote ${startPatient}-${endPatient}:`, error);
      throw error;
    }
  }

  // ========================================
  // PROCESSAR NOTIFICAÇÕES DE UM PACIENTE
  // ========================================
  private async processPatientNotifications(patientId: number, type: string, subtype: string): Promise<number> {
    let notificationsCreated = 0;

    switch (type) {
      case 'medication_scan':
        notificationsCreated = await this.processMedicationNotifications(patientId);
        break;
        
      case 'appointment_scan':
        notificationsCreated = await this.processAppointmentNotifications(patientId);
        break;
        
      case 'test_scan':
        notificationsCreated = await this.processTestNotifications(patientId);
        break;
    }

    return notificationsCreated;
  }

  // ========================================
  // PROCESSAR NOTIFICAÇÕES DE MEDICAMENTOS
  // ========================================
  private async processMedicationNotifications(patientId: number): Promise<number> {
    try {
      const medications = await storage.getActiveMedicationsForPatient(patientId);
      let notificationsCreated = 0;

      for (const medication of medications) {
        const schedules = await storage.getMedicationSchedules(medication.id);
        
        for (const schedule of schedules) {
          if (!schedule.isActive) continue;

          const created = await this.checkMedicationTiming(medication, schedule);
          notificationsCreated += created;
        }
      }

      return notificationsCreated;
    } catch (error) {
      console.error(`❌ Erro ao processar medicamentos do paciente ${patientId}:`, error);
      return 0;
    }
  }

  // ========================================
  // VERIFICAR TIMING DE MEDICAMENTO
  // ========================================
  private async checkMedicationTiming(medication: any, schedule: any): Promise<number> {
    const now = new Date();
    const scheduledTime = this.calculateNextScheduledTime(schedule.scheduledTime);
    const minutesDiff = differenceInMinutes(now, scheduledTime);

    // Verificar se já existe notificação hoje para este horário
    const today = format(now, 'yyyy-MM-dd');
    const deduplicationKey = `medication_${medication.patientId}_${schedule.id}_${today}`;
    
    const existingNotification = await storage.hasActiveGlobalNotificationToday(
      medication.patientId,
      'medication_reminder',
      schedule.id
    );

    if (existingNotification) return 0;

    // Timing de notificações conforme especificação
    const timingConfig = [
      { minutes: -30, type: 'medication_reminder', title: 'Lembrete de Medicamento' },
      { minutes: -15, type: 'medication_reminder', title: 'Medicamento em Breve' },
      { minutes: 0, type: 'medication_reminder', title: 'Hora do Medicamento', margin: 10 },
      { minutes: 15, type: 'medication_overdue', title: 'Medicamento Atrasado' }
    ];

    for (const timing of timingConfig) {
      const margin = timing.margin || 1;
      
      if (minutesDiff >= timing.minutes - margin && minutesDiff <= timing.minutes + margin) {
        await this.createMedicationNotification(medication, schedule, timing, minutesDiff, scheduledTime);
        return 1;
      }
    }

    // Avisos contínuos de atraso (a cada 5 min após 15 min de atraso)
    if (minutesDiff > 15 && minutesDiff <= 240 && (minutesDiff - 15) % 5 === 0) {
      await this.createMedicationNotification(
        medication, 
        schedule, 
        { type: 'medication_overdue', title: 'Medicamento Atrasado' },
        minutesDiff, 
        scheduledTime
      );
      return 1;
    }

    return 0;
  }

  // ========================================
  // CRIAR NOTIFICAÇÃO DE MEDICAMENTO
  // ========================================
  private async createMedicationNotification(medication: any, schedule: any, timing: any, minutesDiff: number, scheduledTime: Date) {
    const patient = await storage.getUser(medication.patientId);
    const patientName = patient ? patient.name : 'Paciente';
    
    let message = '';
    if (minutesDiff < 0) {
      message = `${medication.name} deve ser tomado em ${Math.abs(minutesDiff)} minutos (${format(scheduledTime, "HH:mm", { locale: ptBR })})`;
    } else if (minutesDiff === 0) {
      message = `${medication.name} deve ser tomado agora (${format(scheduledTime, "HH:mm", { locale: ptBR })})`;
    } else {
      message = `${medication.name} está ${minutesDiff} minutos atrasado (era para ${format(scheduledTime, "HH:mm", { locale: ptBR })})`;
    }

    const globalNotification = await storage.createGlobalNotification({
      patientId: medication.patientId,
      patientName: patientName,
      type: timing.type,
      subtype: minutesDiff > 0 ? 'overdue' : minutesDiff < 0 ? 'reminder' : 'on_time',
      title: timing.title,
      message,
      relatedId: schedule.id,
      relatedType: 'medication',
      relatedItemName: medication.name,
      priority: minutesDiff > 60 ? 'high' : 'normal',
      urgencyScore: Math.min(100, 50 + Math.max(0, minutesDiff)),
      originalScheduledTime: scheduledTime,
      notificationTriggerTime: new Date(),
      processedAt: new Date(),
      distributedAt: new Date(),
      distributionCount: 0,
      batchId: `job_${Date.now()}_${medication.patientId}`,
      processingNode: `node_${process.pid}`,
      metadata: JSON.stringify({
        source: 'job_manager',
        createdBy: 'scheduler',
        relatedId: schedule.id,
        patientId: medication.patientId,
        minutesDiff,
        timestamp: new Date().toISOString()
      }),
      deduplicationKey: `${timing.type}_${medication.patientId}_${schedule.id}_${format(new Date(), 'yyyy-MM-dd_HH')}`,
      isActive: true,
      retryCount: 0
    });

    // Distribuir para usuários autorizados
    const authorizedUsers = await storage.getAllUsersWithPatientAccess(medication.patientId);
    
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
        deliveryMethod: 'web',
        deliveryAttempts: 1,
        priority: globalNotification.priority,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        metadata: JSON.stringify({
          relatedType: 'medication',
          relatedId: schedule.id,
          patientId: medication.patientId,
          createdByJobManager: true
        })
      });
    }

    console.log(`📬 Notificação de medicamento criada: ${timing.title} para ${medication.name}`);
  }

  // ========================================
  // PROCESSAR NOTIFICAÇÕES DE CONSULTAS  
  // ========================================
  private async processAppointmentNotifications(patientId: number): Promise<number> {
    try {
      const appointments = await storage.getUpcomingAppointmentsForPatient(patientId);
      let notificationsCreated = 0;

      for (const appointment of appointments) {
        if (appointment.status === 'completed' || appointment.status === 'cancelled') continue;
        
        const created = await this.checkAppointmentTiming(appointment);
        notificationsCreated += created;
      }

      return notificationsCreated;
    } catch (error) {
      console.error(`❌ Erro ao processar consultas do paciente ${patientId}:`, error);
      return 0;
    }
  }

  // ========================================
  // VERIFICAR TIMING DE CONSULTAS
  // ========================================
  private async checkAppointmentTiming(appointment: any): Promise<number> {
    const now = new Date();
    const appointmentTime = new Date(appointment.appointment_date);
    const minutesDiff = differenceInMinutes(now, appointmentTime);

    // Verificar se já existe notificação hoje
    const existingNotification = await storage.hasActiveGlobalNotificationToday(
      appointment.patient_id,
      'appointment_reminder',
      appointment.id
    );

    if (existingNotification) return 0;

    // Timing conforme especificação: 24h, 12h, 6h, 1h, 30min, 15min
    const timingConfig = [
      { minutes: -1440, type: 'appointment_reminder', title: 'Consulta Amanhã', margin: 60 },
      { minutes: -720, type: 'appointment_reminder', title: 'Consulta em 12 Horas', margin: 30 },
      { minutes: -360, type: 'appointment_reminder', title: 'Consulta em 6 Horas', margin: 15 },
      { minutes: -60, type: 'appointment_reminder', title: 'Consulta em 1 Hora', margin: 5 },
      { minutes: -30, type: 'appointment_reminder', title: 'Consulta em 30 Minutos', margin: 2 },
      { minutes: -15, type: 'appointment_reminder', title: 'Consulta em Breve', margin: 1 },
      { minutes: 0, type: 'appointment_reminder', title: 'Hora da Consulta', margin: 10 },
      { minutes: 15, type: 'appointment_overdue', title: 'Consulta Atrasada', margin: 1 }
    ];

    for (const timing of timingConfig) {
      if (minutesDiff >= timing.minutes - timing.margin && minutesDiff <= timing.minutes + timing.margin) {
        await this.createAppointmentNotification(appointment, timing, minutesDiff, appointmentTime);
        return 1;
      }
    }

    // Avisos contínuos de atraso (a cada 15 min após 15 min de atraso)
    if (minutesDiff > 15 && minutesDiff <= 180 && (minutesDiff - 15) % 15 === 0) {
      await this.createAppointmentNotification(
        appointment, 
        { type: 'appointment_overdue', title: 'Confirme sua Consulta' },
        minutesDiff, 
        appointmentTime
      );
      return 1;
    }

    return 0;
  }

  // ========================================
  // CRIAR NOTIFICAÇÃO DE CONSULTA
  // ========================================
  private async createAppointmentNotification(appointment: any, timing: any, minutesDiff: number, appointmentTime: Date) {
    const patient = await storage.getUser(appointment.patient_id);
    const patientName = patient ? patient.name : 'Paciente';
    
    let message = '';
    if (minutesDiff < -60) {
      const hours = Math.abs(Math.floor(minutesDiff / 60));
      message = `Consulta "${appointment.title}" com ${appointment.doctor_name} em ${hours} horas (${format(appointmentTime, "dd/MM 'às' HH:mm", { locale: ptBR })})`;
    } else if (minutesDiff < 0) {
      message = `Consulta "${appointment.title}" com ${appointment.doctor_name} em ${Math.abs(minutesDiff)} minutos (${format(appointmentTime, "HH:mm", { locale: ptBR })})`;
    } else if (minutesDiff === 0) {
      message = `Consulta "${appointment.title}" com ${appointment.doctor_name} é agora (${format(appointmentTime, "HH:mm", { locale: ptBR })})`;
    } else {
      message = `Consulta "${appointment.title}" estava marcada para ${format(appointmentTime, "HH:mm", { locale: ptBR })} (${minutesDiff} min atrás). Confirme se compareceu.`;
    }

    const globalNotification = await storage.createGlobalNotification({
      patientId: appointment.patient_id,
      patientName: patientName,
      type: timing.type,
      subtype: minutesDiff > 0 ? 'overdue' : minutesDiff < 0 ? 'reminder' : 'on_time',
      title: timing.title,
      message,
      relatedId: appointment.id,
      relatedType: 'appointment',
      relatedItemName: appointment.title,
      priority: minutesDiff > 60 ? 'high' : 'normal',
      urgencyScore: Math.min(100, 50 + Math.max(0, minutesDiff)),
      originalScheduledTime: appointmentTime,
      notificationTriggerTime: new Date(),
      processedAt: new Date(),
      distributedAt: new Date(),
      distributionCount: 0,
      batchId: `job_${Date.now()}_${appointment.patient_id}`,
      processingNode: `node_${process.pid}`,
      metadata: JSON.stringify({
        source: 'job_manager',
        createdBy: 'scheduler',
        relatedId: appointment.id,
        patientId: appointment.patient_id,
        minutesDiff,
        timestamp: new Date().toISOString()
      }),
      deduplicationKey: `${timing.type}_${appointment.patient_id}_${appointment.id}_${format(new Date(), 'yyyy-MM-dd_HH')}`,
      isActive: true,
      retryCount: 0
    });

    // Distribuir para usuários autorizados
    const authorizedUsers = await storage.getAllUsersWithPatientAccess(appointment.patient_id);
    
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
        deliveryMethod: 'web',
        deliveryAttempts: 1,
        priority: globalNotification.priority,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        metadata: JSON.stringify({
          relatedType: 'appointment',
          relatedId: appointment.id,
          patientId: appointment.patient_id,
          createdByJobManager: true
        })
      });
    }

    console.log(`📬 Notificação de consulta criada: ${timing.title} para ${appointment.title}`);
  }

  // ========================================
  // PROCESSAR NOTIFICAÇÕES DE EXAMES
  // ========================================
  private async processTestNotifications(patientId: number): Promise<number> {
    try {
      const tests = await storage.getUpcomingTestsForPatient(patientId);
      let notificationsCreated = 0;

      for (const test of tests) {
        if (test.status === 'completed' || test.status === 'cancelled') continue;
        
        const created = await this.checkTestTiming(test);
        notificationsCreated += created;
      }

      return notificationsCreated;
    } catch (error) {
      console.error(`❌ Erro ao processar exames do paciente ${patientId}:`, error);
      return 0;
    }
  }

  // ========================================
  // VERIFICAR TIMING DE EXAMES
  // ========================================
  private async checkTestTiming(test: any): Promise<number> {
    const now = new Date();
    const testTime = new Date(test.test_date);
    const minutesDiff = differenceInMinutes(now, testTime);

    // Verificar se já existe notificação hoje
    const existingNotification = await storage.hasActiveGlobalNotificationToday(
      test.patient_id,
      'test_reminder',
      test.id
    );

    if (existingNotification) return 0;

    // Timing idêntico ao de consultas
    const timingConfig = [
      { minutes: -1440, type: 'test_reminder', title: 'Exame Amanhã', margin: 60 },
      { minutes: -720, type: 'test_reminder', title: 'Exame em 12 Horas', margin: 30 },
      { minutes: -360, type: 'test_reminder', title: 'Exame em 6 Horas', margin: 15 },
      { minutes: -60, type: 'test_reminder', title: 'Exame em 1 Hora', margin: 5 },
      { minutes: -30, type: 'test_reminder', title: 'Exame em 30 Minutos', margin: 2 },
      { minutes: -15, type: 'test_reminder', title: 'Exame em Breve', margin: 1 },
      { minutes: 0, type: 'test_reminder', title: 'Hora do Exame', margin: 10 },
      { minutes: 15, type: 'test_overdue', title: 'Exame Atrasado', margin: 1 }
    ];

    for (const timing of timingConfig) {
      if (minutesDiff >= timing.minutes - timing.margin && minutesDiff <= timing.minutes + timing.margin) {
        await this.createTestNotification(test, timing, minutesDiff, testTime);
        return 1;
      }
    }

    // Avisos contínuos de atraso (a cada 15 min)
    if (minutesDiff > 15 && minutesDiff <= 180 && (minutesDiff - 15) % 15 === 0) {
      await this.createTestNotification(
        test, 
        { type: 'test_overdue', title: 'Confirme seu Exame' },
        minutesDiff, 
        testTime
      );
      return 1;
    }

    return 0;
  }

  // ========================================
  // CRIAR NOTIFICAÇÃO DE EXAME
  // ========================================
  private async createTestNotification(test: any, timing: any, minutesDiff: number, testTime: Date) {
    const patient = await storage.getUser(test.patient_id);
    const patientName = patient ? patient.name : 'Paciente';
    
    let message = '';
    if (minutesDiff < -60) {
      const hours = Math.abs(Math.floor(minutesDiff / 60));
      message = `Exame "${test.name}" em ${hours} horas (${format(testTime, "dd/MM 'às' HH:mm", { locale: ptBR })})`;
    } else if (minutesDiff < 0) {
      message = `Exame "${test.name}" em ${Math.abs(minutesDiff)} minutos (${format(testTime, "HH:mm", { locale: ptBR })})`;
    } else if (minutesDiff === 0) {
      message = `Exame "${test.name}" é agora (${format(testTime, "HH:mm", { locale: ptBR })})`;
    } else {
      message = `Exame "${test.name}" estava marcado para ${format(testTime, "HH:mm", { locale: ptBR })} (${minutesDiff} min atrás). Confirme se compareceu.`;
    }

    const globalNotification = await storage.createGlobalNotification({
      patientId: test.patient_id,
      patientName: patientName,
      type: timing.type,
      subtype: minutesDiff > 0 ? 'overdue' : minutesDiff < 0 ? 'reminder' : 'on_time',
      title: timing.title,
      message,
      relatedId: test.id,
      relatedType: 'test',
      relatedItemName: test.name,
      priority: minutesDiff > 60 ? 'high' : 'normal',
      urgencyScore: Math.min(100, 50 + Math.max(0, minutesDiff)),
      originalScheduledTime: testTime,
      notificationTriggerTime: new Date(),
      processedAt: new Date(),
      distributedAt: new Date(),
      distributionCount: 0,
      batchId: `job_${Date.now()}_${test.patient_id}`,
      processingNode: `node_${process.pid}`,
      metadata: JSON.stringify({
        source: 'job_manager',
        createdBy: 'scheduler',
        relatedId: test.id,
        patientId: test.patient_id,
        minutesDiff,
        timestamp: new Date().toISOString()
      }),
      deduplicationKey: `${timing.type}_${test.patient_id}_${test.id}_${format(new Date(), 'yyyy-MM-dd_HH')}`,
      isActive: true,
      retryCount: 0
    });

    // Distribuir para usuários autorizados
    const authorizedUsers = await storage.getAllUsersWithPatientAccess(test.patient_id);
    
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
        deliveryMethod: 'web',
        deliveryAttempts: 1,
        priority: globalNotification.priority,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        metadata: JSON.stringify({
          relatedType: 'test',
          relatedId: test.id,
          patientId: test.patient_id,
          createdByJobManager: true
        })
      });
    }

    console.log(`📬 Notificação de exame criada: ${timing.title} para ${test.name}`);
  }

  // ========================================
  // UTILITÁRIOS
  // ========================================

  private getJobPriority(type: string): number {
    switch (type) {
      case 'medication_scan': return 1; // Alta prioridade
      case 'appointment_scan': return 3; // Média prioridade  
      case 'test_scan': return 3; // Média prioridade
      case 'cleanup_job': return 8; // Baixa prioridade
      default: return 5;
    }
  }

  private calculateNextScheduledTime(scheduledTime: string): Date {
    const now = new Date();
    const [hours, minutes] = scheduledTime.split(':').map(Number);
    
    const scheduled = new Date(now);
    scheduled.setHours(hours, minutes, 0, 0);
    
    // Se já passou, considerar para o próximo dia
    if (scheduled < now) {
      scheduled.setDate(scheduled.getDate() + 1);
    }
    
    return scheduled;
  }

  private async createJobMetrics(jobId: string, metrics: JobMetrics, processingTime: number) {
    try {
      const today = startOfDay(new Date());
      
      await storage.createNotificationMetrics({
        metricType: 'job_performance',
        date: today,
        totalNotificationsCreated: metrics.notificationsCreated,
        totalNotificationsDistributed: metrics.notificationsCreated,
        totalNotificationsRead: 0,
        medicationNotifications: 0, // TODO: separar por tipo
        appointmentNotifications: 0,
        testNotifications: 0,
        activePatients: metrics.totalProcessed,
        activeUsers: 0,
        avgProcessingTimeMs: Math.floor(processingTime / metrics.totalProcessed),
        maxProcessingTimeMs: processingTime,
        minProcessingTimeMs: 0,
        errorRate: metrics.errorCount > 0 ? (metrics.errorCount / metrics.totalProcessed * 100).toFixed(2) : "0.00",
        additionalData: JSON.stringify({
          jobId,
          batchesProcessed: Math.ceil(metrics.totalProcessed / JOB_CONFIG.BATCH_SIZE),
          concurrency: JOB_CONFIG.MAX_PARALLEL_JOBS
        })
      });
    } catch (error) {
      console.error('❌ Erro ao criar métricas do job:', error);
    }
  }

  // ========================================
  // CLEANUP DE JOBS ANTIGOS
  // ========================================
  async cleanupOldJobs() {
    try {
      const cutoffDate = new Date(Date.now() - JOB_CONFIG.CLEANUP_HOURS * 60 * 60 * 1000);
      
      const cleanedJobs = await storage.cleanupOldCompletedJobs(cutoffDate);
      const cleanedMetrics = await storage.cleanupOldMetrics(cutoffDate);
      
      console.log(`🧹 Limpeza concluída: ${cleanedJobs} jobs, ${cleanedMetrics} métricas`);
    } catch (error) {
      console.error('❌ Erro na limpeza:', error);
    }
  }

  // ========================================
  // REGISTRAR MÉTRICAS DO CICLO
  // ========================================
  async recordCycleMetrics(results: PromiseSettledResult<any>[], processingTime: number): Promise<void> {
    try {
      const now = new Date();
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const errorCount = results.filter(r => r.status === 'rejected').length;
      const errorRate = results.length > 0 ? (errorCount / results.length) * 100 : 0;
      
      // Buscar estatísticas do período atual
      const totalCreated = await storage.countCreatedNotificationsInPeriod(
        new Date(now.getTime() - 5 * 60 * 1000), // últimos 5 min
        now
      );
      
      const totalDistributed = await storage.countDistributedNotificationsInPeriod(
        new Date(now.getTime() - 5 * 60 * 1000),
        now
      );
      
      const medicationCount = await storage.countNotificationsByTypeInPeriod(
        'medication_reminder',
        new Date(now.getTime() - 5 * 60 * 1000),
        now
      );
      
      const appointmentCount = await storage.countNotificationsByTypeInPeriod(
        'appointment_reminder',
        new Date(now.getTime() - 5 * 60 * 1000),
        now
      );
      
      const testCount = await storage.countNotificationsByTypeInPeriod(
        'test_reminder',
        new Date(now.getTime() - 5 * 60 * 1000),
        now
      );
      
      // Registrar métricas enterprise
      await storage.createNotificationMetric({
        metricType: 'cycle_performance',
        date: now,
        totalNotificationsCreated: totalCreated,
        totalNotificationsDistributed: totalDistributed,
        medicationNotifications: medicationCount,
        appointmentNotifications: appointmentCount,
        testNotifications: testCount,
        avgProcessingTimeMs: processingTime,
        maxProcessingTimeMs: processingTime,
        minProcessingTimeMs: processingTime,
        errorRate: errorRate,
        additionalData: JSON.stringify({
          successfulJobs: successCount,
          failedJobs: errorCount,
          totalJobs: results.length,
          timestamp: now.toISOString(),
          processingNode: `node_${process.pid}`
        })
      });
      
      console.log(`📊 Métricas ENTERPRISE registradas: ${totalCreated} criadas, ${totalDistributed} distribuídas em ${processingTime}ms`);
      
    } catch (error) {
      console.error('❌ Erro ao registrar métricas:', error);
    }
  }

  // ========================================
  // REGISTRAR MÉTRICAS DE ERRO
  // ========================================
  async recordErrorMetrics(error: any): Promise<void> {
    try {
      const now = new Date();
      
      await storage.createNotificationMetric({
        metricType: 'error_tracking',
        date: now,
        totalNotificationsCreated: 0,
        totalNotificationsDistributed: 0,
        medicationNotifications: 0,
        appointmentNotifications: 0,
        testNotifications: 0,
        avgProcessingTimeMs: 0,
        maxProcessingTimeMs: 0,
        minProcessingTimeMs: 0,
        errorRate: 100.0,
        additionalData: JSON.stringify({
          errorMessage: error.message,
          errorStack: error.stack,
          timestamp: now.toISOString(),
          processingNode: `node_${process.pid}`,
          errorType: 'scheduler_error'
        })
      });
      
      console.log(`📊 Métrica de erro registrada: ${error.message}`);
      
    } catch (metricsError) {
      console.error('❌ Erro ao registrar métrica de erro:', metricsError);
    }
  }

  // ========================================
  // LIMPEZA DE MÉTRICAS ANTIGAS
  // ========================================
  async cleanupOldMetrics(): Promise<void> {
    try {
      const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 dias atrás
      
      console.log('🧹 Limpando métricas antigas...');
      await storage.deleteOldNotificationMetrics(cutoffDate);
      
      console.log('✅ Métricas antigas removidas');
      
    } catch (error) {
      console.error('❌ Erro ao limpar métricas:', error);
    }
  }

  // ========================================
  // APLICAR RATE LIMITING ENTERPRISE
  // ========================================
  async applyRateLimit(): Promise<void> {
    try {
      const now = new Date();
      const windowStart = new Date(now.getTime() - 5 * 60 * 1000); // 5 min atrás
      
      // Contar notificações por usuário nos últimos 5 minutos
      const activeUsers = await storage.getActiveUsersInPeriod(windowStart, now);
      
      for (const userId of activeUsers) {
        const userNotificationCount = await storage.countUserNotificationsInPeriod(userId, windowStart, now);
        
        const maxNotificationsPerWindow = 50; // Máximo 50 notificações por usuário a cada 5 min
        const isBlocked = userNotificationCount > maxNotificationsPerWindow;
        
        // Registrar rate limit
        await storage.createRateLimit({
          limitType: 'user_notifications_5min',
          entityId: userId,
          requestCount: userNotificationCount,
          windowStart,
          windowEnd: now,
          maxRequests: maxNotificationsPerWindow,
          isBlocked
        });
        
        if (isBlocked) {
          console.log(`⚠️ Rate limit ativado para usuário ${userId}: ${userNotificationCount}/${maxNotificationsPerWindow}`);
        }
      }
      
      // Rate limit global do sistema
      const totalNotifications = await storage.countCreatedNotificationsInPeriod(windowStart, now);
      const maxSystemNotifications = 10000; // 10k notificações por 5 min
      const systemBlocked = totalNotifications > maxSystemNotifications;
      
      await storage.createRateLimit({
        limitType: 'system_notifications_5min',
        entityId: 0, // 0 = sistema
        requestCount: totalNotifications,
        windowStart,
        windowEnd: now,
        maxRequests: maxSystemNotifications,
        isBlocked: systemBlocked
      });
      
      if (systemBlocked) {
        console.log(`🚨 RATE LIMIT SISTEMA ATIVADO: ${totalNotifications}/${maxSystemNotifications}`);
      }
      
      console.log(`✅ Rate limiting aplicado: ${totalNotifications} notificações sistema`);
      
    } catch (error) {
      console.error('❌ Erro ao aplicar rate limit:', error);
    }
  }
}

// ========================================
// INSTÂNCIA SINGLETON
// ========================================
export const jobManager = new NotificationJobManager();