// ========================================
// STORAGE ENTERPRISE PARA SISTEMA DE NOTIFICAÇÕES
// Extensão do storage existente com novos métodos
// ========================================

import { db } from "./db";
import { eq, and, gte, lte, desc, asc, ne, sql, isNotNull, or, inArray, count, avg, max, like } from "drizzle-orm";
import {
  globalNotifications,
  userNotifications,
  notificationJobs,
  notificationMetrics,
  notificationConfig,
  notificationAuditLog,
  notificationRateLimit,
  users,
  careRelationships,
  medications,
  medicationLogs,
  appointments,
  tests,
  type GlobalNotification,
  type InsertGlobalNotification,
  type UserNotification,
  type InsertUserNotification,
  type NotificationJob,
  type InsertNotificationJob,
  type InsertNotificationMetrics,
  type InsertNotificationAuditLog,
  USER_ACCESS_TYPES
} from "@shared/schema";
import { Request } from 'express';
import { format, startOfDay, addDays } from 'date-fns'; // Importar funções de date-fns

// ========================================
// INTERFACE PARA MÉTODOS ENTERPRISE
// ========================================

export interface IEnterpriseStorage {
  // GLOBAL NOTIFICATIONS
  createGlobalNotification(notification: InsertGlobalNotification, httpContext?: any): Promise<GlobalNotification>;
  updateGlobalNotification(id: number, update: Partial<InsertGlobalNotification>): Promise<void>;
  getGlobalNotificationById(id: number): Promise<GlobalNotification | undefined>;
  hasActiveGlobalNotificationToday(patientId: number, type: string, relatedId: number): Promise<boolean>;

  // USER NOTIFICATIONS
  createUserNotification(notification: InsertUserNotification): Promise<UserNotification>;
  getUserNotificationsByUserId(userId: number, limit?: number, offset?: number): Promise<UserNotification[]>;
  getUserNotificationById(id: number): Promise<UserNotification | undefined>;
  markUserNotificationAsRead(id: number): Promise<void>;
  markAllUserNotificationsAsRead(userId: number): Promise<void>;
  getUserNotificationSummary(userId: number): Promise<any>;

  // NOTIFICATION JOBS
  createNotificationJob(job: InsertNotificationJob): Promise<NotificationJob>;
  updateNotificationJobByJobId(jobId: string, update: Partial<InsertNotificationJob>): Promise<void>;
  getActiveNotificationJobs(): Promise<NotificationJob[]>;

  // PATIENT ACCESS
  getAllUsersWithPatientAccess(patientId: number): Promise<any[]>;
  getTotalActivePatients(): Promise<number>;
  getActivePatientsInBatch(offset: number, limit: number): Promise<any[]>;

  // METRICS AND CLEANUP
  createNotificationMetrics(metrics: InsertNotificationMetrics): Promise<void>;
  cleanupOldReadNotifications(cutoffDate: Date): Promise<number>;
  cleanupOldCompletedJobs(cutoffDate: Date): Promise<number>;
  cleanupOldMetrics(cutoffDate: Date): Promise<number>;
  cleanupOldAuditLogs(cutoffDate: Date): Promise<number>;

  // STATISTICS
  countGlobalNotificationsInPeriod(startDate: Date, endDate: Date): Promise<number>;
  countDistributedNotificationsInPeriod(startDate: Date, endDate: Date): Promise<number>;
  countReadNotificationsInPeriod(startDate: Date, endDate: Date): Promise<number>;
  countNotificationsByTypeInPeriod(type: string, startDate: Date, endDate: Date): Promise<number>;
  countActivePatientsInPeriod(startDate: Date, endDate: Date): Promise<number>;
  countActiveUsersInPeriod(startDate: Date, endDate: Date): Promise<number>;
  getAverageJobProcessingTimeInPeriod(startDate: Date, endDate: Date): Promise<number>;
  getFailedNotificationsSince(cutoffTime: Date): Promise<any[]>;

  // AUDIT
  createAuditLog(log: InsertNotificationAuditLog): Promise<void>;
  createAuditLogWithContext(log: Omit<InsertNotificationAuditLog, 'ipAddress' | 'userAgent' | 'sessionId' | 'requestId' | 'correlationId' | 'processingTimeMs'>, context?: AuditContext): Promise<void>;

  // MEDICATION LOGS
  getTodayMedicationLogs(patientId: number): Promise<any[]>;

  // CRITICAL MEDICATIONS
  getPatientsWithCriticalOverdueMedications(): Promise<any[]>;

  // LEGACY COMPATIBILITY METHODS
  getActiveMedicationsForPatient(patientId: number): Promise<any[]>;
  getMedicationSchedules(medicationId: number): Promise<any[]>;
  getUser(userId: number): Promise<any>;
  getUpcomingAppointmentsForPatient(patientId: number): Promise<any[]>;
  getUpcomingTestsForPatient(patientId: number): Promise<any[]>;
  createNotificationMetric(metrics: any): Promise<void>;
  deleteOldNotificationMetrics(cutoffDate: Date): Promise<number>;
  getActiveUsersInPeriod(startDate: Date, endDate: Date): Promise<number>;
  countUserNotificationsInPeriod(startDate: Date, endDate: Date): Promise<number>;
  createRateLimit(rateLimit: any): Promise<void>;

  // SCHEDULER COMPATIBILITY METHODS
  getAllActiveMedications(): Promise<any[]>;
  getUpcomingAppointments(): Promise<any[]>;
  getUpcomingTests(): Promise<any[]>;
  getMedicationSchedulesToday(): Promise<any[]>;
  getMedicationLogForSchedule(medicationId: number, scheduleDate?: Date): Promise<any>;
  hasMedicationLogForToday(medicationId: number, hour: number): Promise<boolean>;
  hasMedicationLogForScheduleToday(medicationId: number, scheduleId: number): Promise<boolean>;
}

// ========================================
// HELPERS PARA AUDIT LOG
// ========================================

// Interface para dados de contexto de auditoria
export interface AuditContext {
  req?: Request;
  userId?: number;
  patientId?: number;
  sessionId?: string;
  correlationId?: string;
  beforeState?: any;
  afterState?: any;
  processingStartTime?: number;
}

// Helper para extrair dados da requisição HTTP
function extractRequestInfo(req?: Request) {
  if (!req) return {};

  return {
    ipAddress: req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] as string || 'unknown',
    userAgent: req.get('User-Agent') || 'unknown',
    sessionId: req.sessionID || req.session?.id || undefined,
    requestId: req.headers['x-request-id'] as string || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };
}

// Helper para gerar correlation ID se não fornecido
function generateCorrelationId(): string {
  return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ========================================
// IMPLEMENTAÇÃO DOS MÉTODOS ENTERPRISE
// ========================================

export class EnterpriseStorage implements IEnterpriseStorage {

  // ========================================
  // GLOBAL NOTIFICATIONS
  // ========================================

  async createGlobalNotification(notification: any, httpContext?: any): Promise<any> {
    // Usar new Date() padrão como as outras colunas que funcionam corretamente
    const now = new Date();

    // Usar apenas campos que existem na tabela atual
    const insertData: any = {
      patientId: notification.patientId,
      patientName: notification.patientName,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      relatedId: notification.relatedId,
      relatedType: notification.relatedType,
      priority: notification.priority,
      isActive: true,
      createdAt: now,
      updatedAt: now
    };

    // Adicionar campos opcionais apenas se existirem na tabela
    if (notification.subtype) insertData.subtype = notification.subtype;
    if (notification.relatedItemName) insertData.relatedItemName = notification.relatedItemName;
    if (notification.urgencyScore !== undefined) insertData.urgencyScore = notification.urgencyScore;
    if (notification.originalScheduledTime) insertData.originalScheduledTime = notification.originalScheduledTime;
    if (notification.notificationTriggerTime) insertData.notificationTriggerTime = notification.notificationTriggerTime;
    if (notification.metadata) {
      // Garantir que metadata seja sempre uma string JSON válida
      insertData.metadata = typeof notification.metadata === 'string' ? notification.metadata : JSON.stringify(notification.metadata || {});
    }

    // Campos enterprise (adicionar apenas se as colunas existirem)
    try {
      if (notification.batchId) insertData.batchId = notification.batchId;
      if (notification.processingNode) insertData.processingNode = notification.processingNode;
      if (notification.deduplicationKey) insertData.deduplicationKey = notification.deduplicationKey;
      if (notification.status) insertData.status = notification.status;

      if (notification.processedAt) {
        insertData.processedAt = new Date();
      }

      // processedAt e distributedAt devem ser preenchidos apenas quando realmente processados/distribuídos
      // Não definir estes campos na criação inicial
    } catch (error) {
      console.log('Algumas colunas enterprise ainda não foram criadas, usando versão básica');
    }

    const [newNotification] = await db
      .insert(globalNotifications)
      .values(insertData)
      .returning();

    // Audit log com contexto completo (incluindo dados HTTP se disponível)
    console.log('🔍 AUDIT DEBUG - Preparando audit log para notificação global ID:', newNotification.id);
    console.log('🔍 AUDIT DEBUG - httpContext disponível:', !!httpContext);
    console.log('🔍 AUDIT DEBUG - req disponível:', !!httpContext?.req);
    console.log('🔍 AUDIT DEBUG - userId no contexto:', httpContext?.userId);

    try {
      await this.createAuditLogWithContext({
        entityType: 'global_notification',
        entityId: newNotification.id,
        action: 'created',
        patientId: notification.patientId,
        success: true,
        details: JSON.stringify({
          type: notification.type,
          title: notification.title,
          priority: notification.priority,
          relatedId: notification.relatedId
        })
      }, {
        req: httpContext?.req,
        userId: httpContext?.userId,
        beforeState: httpContext?.beforeState,
        afterState: httpContext?.afterState || newNotification,
        sessionId: httpContext?.sessionId,
        processingStartTime: httpContext?.processingStartTime || Date.now() - 100,
        correlationId: `create_global_notification_${newNotification.id}_${Date.now()}`
      });
      console.log('✅ AUDIT DEBUG - Audit log criado com sucesso');
    } catch (auditError) {
      console.error('❌ AUDIT DEBUG - Erro ao criar audit log:', auditError);
    }

    return newNotification;
  }

  async updateGlobalNotification(id: number, update: Partial<InsertGlobalNotification>): Promise<void> {
    // Usar new Date() padrão como as outras colunas que funcionam
    const updateData = { ...update };

    if (update.processedAt) {
      updateData.processedAt = new Date();
    }
    if (update.distributedAt) {
      updateData.distributedAt = new Date();
    }

    await db
      .update(globalNotifications)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(eq(globalNotifications.id, id));

    // Audit log
    await this.createAuditLog({
      entityType: 'global_notification',
      entityId: id,
      action: 'updated',
      success: true,
      details: JSON.stringify(update)
    });
  }

  async getGlobalNotificationById(id: number): Promise<GlobalNotification | undefined> {
    const [notification] = await db
      .select()
      .from(globalNotifications)
      .where(eq(globalNotifications.id, id))
      .limit(1);

    return notification;
  }

  // Verificar se notificação específica já foi criada hoje
  async hasSpecificNotificationToday(patientId: number, type: string, relatedId: number, timingType: string): Promise<boolean> {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // Se timingType já contém a data, usar diretamente, senão construir
      let deduplicationKey;
      if (timingType.includes(today)) {
        deduplicationKey = timingType;
      } else {
        deduplicationKey = `${type}_${patientId}_${relatedId}_${timingType}_${today}`;
      }

      const result = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM global_notifications
        WHERE deduplication_key = ${deduplicationKey}
        AND is_active = true
      `);

      const exists = (result.rows[0]?.count || 0) > 0;
      console.log(`🔍 Verificação ${timingType} para medicamento ${relatedId}: ${exists ? 'JÁ EXISTE' : 'NOVA'} (key: ${deduplicationKey})`);
      return exists;
    } catch (error) {
      console.error('❌ Erro ao verificar notificação específica:', error);
      return false;
    }
  }


  // Manter compatibilidade com código existente
  async hasActiveGlobalNotificationToday(
    medicationId: number,
    patientId: number,
    type: string
  ): Promise<boolean> {
    return this.hasSpecificNotificationToday(patientId, type, medicationId, "general");
  }

  // ========================================
  // USER NOTIFICATIONS
  // ========================================

  async createUserNotification(notification: InsertUserNotification): Promise<UserNotification> {
    const [newNotification] = await db
      .insert(userNotifications)
      .values({
        ...notification,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    // Send real-time notification via WebSocket
    try {
      // Import dynamically to avoid circular dependency
      const { broadcastNotificationToUser } = await import('./routes');
      console.log(`📡 Enviando notificação via WebSocket para usuário ${notification.userId}`);
      broadcastNotificationToUser(notification.userId, newNotification);
      console.log(`✅ Notificação enviada via WebSocket`);
    } catch (error) {
      console.error('❌ Erro no WebSocket broadcast:', error);
    }

    // Audit log
    await this.createAuditLog({
      entityType: 'user_notification',
      entityId: newNotification.id,
      action: 'created',
      userId: notification.userId,
      success: true,
      details: JSON.stringify({
        globalNotificationId: notification.globalNotificationId,
        accessType: notification.accessType
      })
    });

    return newNotification;
  }

  async getUserNotificationsByUserId(
    userId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<any[]> {
    try {
      console.log(`🔍 DEBUG: Buscando notificações para usuário ${userId}`);

      // Fazer um JOIN direto usando query simples para evitar problemas do Drizzle
      const query = `
        SELECT
          un.id as user_notification_id,
          un.user_id,
          un.global_notification_id,
          un.user_profile_type,
          un.user_name,
          un.access_type,
          un.access_level,
          un.delivery_status,
          un.is_read,
          un.delivered_at,
          un.read_at,
          un.acknowledged_at,
          un.delivery_method,
          un.delivery_attempts,
          un.last_delivery_error,
          un.priority as user_priority,
          un.expires_at,
          un.created_at as user_created_at,
          un.updated_at as user_updated_at,
          gn.id as global_id,
          gn.patient_id,
          gn.patient_name,
          gn.type,
          gn.subtype,
          gn.title,
          gn.message,
          gn.related_id,
          gn.related_type,
          gn.related_item_name,
          gn.priority as global_priority,
          gn.urgency_score,
          gn.original_scheduled_time,
          gn.notification_trigger_time,
          gn.processed_at,
          gn.distributed_at,
          gn.distribution_count,
          gn.batch_id,
          gn.processing_node,
          gn.metadata,
          gn.deduplication_key,
          gn.is_active,
          gn.retry_count,
          gn.last_error,
          gn.created_at as global_created_at,
          gn.updated_at as global_updated_at
        FROM user_notifications un
        INNER JOIN global_notifications gn ON un.global_notification_id = gn.id
        WHERE un.user_id = $1 AND gn.is_active = true
        ORDER BY un.created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await db.execute(sql.raw(query.replace('$1', userId.toString()).replace('$2', limit.toString()).replace('$3', offset.toString())));
      const rows = result.rows as any[];

      console.log(`🔍 DEBUG: ${rows.length} notificações encontradas para usuário ${userId}`);

      const notifications = rows.map(row => ({
        // User notification fields
        id: row.user_notification_id,
        userId: row.user_id,
        globalNotificationId: row.global_notification_id,
        userProfileType: row.user_profile_type,
        userName: row.user_name,
        accessType: row.access_type,
        accessLevel: row.access_level,
        deliveryStatus: row.delivery_status,
        isRead: row.is_read,
        deliveredAt: row.delivered_at,
        readAt: row.read_at,
        acknowledgedAt: row.acknowledged_at,
        deliveryMethod: row.delivery_method,
        deliveryAttempts: row.delivery_attempts,
        lastDeliveryError: row.last_delivery_error,
        priority: row.user_priority || row.global_priority,
        expiresAt: row.expires_at,
        createdAt: row.user_created_at,
        updatedAt: row.user_updated_at,

        // Global notification fields for frontend compatibility
        type: row.type,
        subtype: row.subtype,
        title: row.title,
        message: row.message,
        patientId: row.patient_id,
        patientName: row.patient_name,
        relatedId: row.related_id,
        relatedType: row.related_type,
        relatedItemName: row.related_item_name,
        urgencyScore: row.urgency_score,
        originalScheduledTime: row.original_scheduled_time,
        notificationTriggerTime: row.notification_trigger_time,
        processedAt: row.processed_at,
        distributedAt: row.distributed_at,
        distributionCount: row.distribution_count,
        batchId: row.batch_id,
        processingNode: row.processing_node,
        metadata: row.metadata,
        deduplicationKey: row.deduplication_key,
        isActive: row.is_active,
        retryCount: row.retry_count,
        lastError: row.last_error
      }));

      console.log(`✅ API Enterprise: ${notifications.length} notificações processadas para usuário ${userId}`);
      return notifications;

    } catch (error) {
      console.error('❌ Erro ao buscar notificações do usuário:', error);
      return [];
    }
  }

  async getUserNotificationById(id: number): Promise<UserNotification | undefined> {
    try {
      const [notification] = await db
        .select()
        .from(userNotifications)
        .where(eq(userNotifications.id, id));

      return notification;
    } catch (error) {
      console.error('❌ Erro ao buscar notificação por ID:', error);
      return undefined;
    }
  }

  async markUserNotificationAsRead(id: number): Promise<void> {
    await db
      .update(userNotifications)
      .set({
        isRead: true,
        readAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(userNotifications.id, id));

    // Audit log
    await this.createAuditLog({
      entityType: 'user_notification',
      entityId: id,
      action: 'read',
      success: true
    });
  }

  async markAllUserNotificationsAsRead(userId: number): Promise<void> {
    await db
      .update(userNotifications)
      .set({
        isRead: true,
        readAt: new Date(),
        updatedAt: new Date()
      })
      .where(
        and(
          eq(userNotifications.userId, userId),
          eq(userNotifications.isRead, false)
        )
      );

    // Audit log
    await this.createAuditLog({
      entityType: 'user_notification',
      entityId: 0, // Múltiplas notificações
      action: 'bulk_read',
      userId,
      success: true
    });
  }

  async getUserNotificationSummary(userId: number): Promise<any> {
    try {
      // Usar SQL direto para garantir contagem correta
      const result = await db.execute(sql`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN un.is_read = false THEN 1 END) as unread,
          COUNT(CASE WHEN un.is_read = false AND gn.priority = 'high' THEN 1 END) as high_priority,
          COUNT(CASE WHEN un.is_read = false AND gn.priority = 'critical' THEN 1 END) as critical
        FROM user_notifications un
        INNER JOIN global_notifications gn ON un.global_notification_id = gn.id
        WHERE un.user_id = ${userId} 
        AND gn.is_active = true
      `);

      const row = result.rows[0] as any;
      const summary = {
        total: parseInt(row?.total || '0'),
        unread: parseInt(row?.unread || '0'),
        highPriorityCount: parseInt(row?.high_priority || '0'),
        criticalCount: parseInt(row?.critical || '0')
      };

      console.log(`📊 Summary CORRIGIDO para usuário ${userId}:`, summary);
      return summary;

    } catch (error) {
      console.error('❌ Erro ao buscar summary de notificações:', error);
      return { total: 0, unread: 0, highPriorityCount: 0, criticalCount: 0 };
    }
  }

  // ========================================
  // NOTIFICATION JOBS
  // ========================================

  async createNotificationJob(job: InsertNotificationJob): Promise<NotificationJob> {
    const [newJob] = await db
      .insert(notificationJobs)
      .values({
        ...job,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    return newJob;
  }

  async updateNotificationJobByJobId(
    jobId: string,
    update: Partial<InsertNotificationJob>
  ): Promise<void> {
    try {
      await db
        .update(notificationJobs)
        .set({
          ...update,
          updatedAt: new Date()
        })
        .where(eq(notificationJobs.jobId, jobId));
    } catch (error) {
      console.error('❌ Erro atualizando notification job:', error);
      throw error;
    }
  }

  async getActiveNotificationJobs(): Promise<NotificationJob[]> {
    return await db
      .select()
      .from(notificationJobs)
      .where(
        inArray(notificationJobs.status, ['pending', 'running'])
      )
      .orderBy(asc(notificationJobs.priority), asc(notificationJobs.scheduledFor));
  }

  // Método adicional para contar notificações criadas em período específico
  async countCreatedNotificationsInPeriod(startDate: Date, endDate: Date): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(globalNotifications)
      .where(
        and(
          gte(globalNotifications.createdAt, startDate),
          lte(globalNotifications.createdAt, endDate)
        )
      );

    return result.count;
  }

  // ========================================
  // PATIENT ACCESS E DISTRIBUIÇÃO
  // ========================================

  async getAllUsersWithPatientAccess(patientId: number): Promise<any[]> {
    // 1. O próprio paciente sempre recebe
    const patientAccess = await db
      .select({
        userId: users.id,
        name: users.name,
        profileType: users.profileType,
        accessType: sql`'owner'`.as('accessType'),
        accessLevel: sql`'admin'`.as('accessLevel')
      })
      .from(users)
      .where(eq(users.id, patientId));

    // 2. Todos os cuidadores com acesso via care_relationships
    const caregiverAccess = await db
      .select({
        userId: users.id,
        name: users.name,
        profileType: users.profileType,
        accessType: sql`CASE
          WHEN ${users.profileType} = 'caregiver' THEN 'caregiver'
          WHEN ${users.profileType} = 'doctor' THEN 'medical'
          WHEN ${users.profileType} = 'nurse' THEN 'medical'
          WHEN ${users.profileType} = 'family' THEN 'family'
          ELSE 'caregiver'
        END`.as('accessType'),
        accessLevel: sql`'read'`.as('accessLevel')
      })
      .from(careRelationships)
      .innerJoin(users, eq(careRelationships.caregiverId, users.id))
      .where(
        and(
          eq(careRelationships.patientId, patientId),
          eq(careRelationships.status, 'active')
        )
      );

    // Combinar e remover duplicatas
    const allAccess = [...patientAccess, ...caregiverAccess];
    const uniqueAccess = allAccess.reduce((acc, current) => {
      const existing = acc.find(item => item.userId === current.userId);
      if (!existing) {
        acc.push(current);
      } else {
        // Se já existe, manter o nível de acesso mais alto
        if (current.accessLevel === 'admin' ||
            (current.accessLevel === 'write' && existing.accessLevel === 'read')) {
          existing.accessLevel = current.accessLevel;
        }
      }
      return acc;
    }, [] as any[]);

    return uniqueAccess;
  }

  async getTotalActivePatients(): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.profileType, 'patient'));

    return result.count;
  }

  async getActivePatientsInBatch(offset: number, limit: number): Promise<any[]> {
    return await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email
      })
      .from(users)
      .where(eq(users.profileType, 'patient'))
      .orderBy(asc(users.id))
      .limit(limit)
      .offset(offset);
  }



  // ========================================
  // MÉTRICAS E LIMPEZA
  // ========================================

  async createNotificationMetrics(metrics: InsertNotificationMetrics): Promise<void> {
    await db
      .insert(notificationMetrics)
      .values({
        ...metrics,
        createdAt: new Date()
      });
  }

  async cleanupOldReadNotifications(cutoffDate: Date): Promise<number> {
    const result = await db
      .delete(userNotifications)
      .where(
        and(
          eq(userNotifications.isRead, true),
          lte(userNotifications.readAt, cutoffDate)
        )
      );

    return result.rowCount || 0;
  }

  async cleanupOldCompletedJobs(cutoffDate: Date): Promise<number> {
    const result = await db
      .delete(notificationJobs)
      .where(
        and(
          eq(notificationJobs.status, 'completed'),
          lte(notificationJobs.completedAt, cutoffDate)
        )
      );

    return result.rowCount || 0;
  }

  async cleanupOldMetrics(cutoffDate: Date): Promise<number> {
    const result = await db
      .delete(notificationMetrics)
      .where(lte(notificationMetrics.date, cutoffDate));

    return result.rowCount || 0;
  }

  async cleanupOldAuditLogs(cutoffDate: Date): Promise<number> {
    const result = await db
      .delete(notificationAuditLog)
      .where(lte(notificationAuditLog.createdAt, cutoffDate));

    return result.rowCount || 0;
  }

  // ========================================
  // ESTATÍSTICAS E CONTADORES
  // ========================================

  async countGlobalNotificationsInPeriod(startDate: Date, endDate: Date): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(globalNotifications)
      .where(
        and(
          gte(globalNotifications.createdAt, startDate),
          lte(globalNotifications.createdAt, endDate)
        )
      );

    return result.count;
  }

  async countDistributedNotificationsInPeriod(startDate: Date, endDate: Date): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(userNotifications)
      .where(
        and(
          gte(userNotifications.deliveredAt, startDate),
          lte(userNotifications.deliveredAt, endDate),
          eq(userNotifications.deliveryStatus, 'delivered')
        )
      );

    return result.count;
  }

  async countReadNotificationsInPeriod(startDate: Date, endDate: Date): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(userNotifications)
      .where(
        and(
          gte(userNotifications.readAt, startDate),
          lte(userNotifications.readAt, endDate),
          eq(userNotifications.isRead, true)
        )
      );

    return result.count;
  }

  async countNotificationsByTypeInPeriod(
    type: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(globalNotifications)
      .where(
        and(
          eq(globalNotifications.type, type),
          gte(globalNotifications.createdAt, startDate),
          lte(globalNotifications.createdAt, endDate)
        )
      );

    return result.count;
  }

  async countActivePatientsInPeriod(startDate: Date, endDate: Date): Promise<number> {
    // Pacientes que tiveram atividade (notificações) no período
    const [result] = await db
      .select({ count: count(sql`DISTINCT ${globalNotifications.patientId}`) })
      .from(globalNotifications)
      .where(
        and(
          gte(globalNotifications.createdAt, startDate),
          lte(globalNotifications.createdAt, endDate)
        )
      );

    return result.count;
  }

  async countActiveUsersInPeriod(startDate: Date, endDate: Date): Promise<number> {
    // Usuários que receberam notificações no período
    const [result] = await db
      .select({ count: count(sql`DISTINCT ${userNotifications.userId}`) })
      .from(userNotifications)
      .where(
        and(
          gte(userNotifications.deliveredAt, startDate),
          lte(userNotifications.deliveredAt, endDate)
        )
      );

    return result.count;
  }

  async getAverageJobProcessingTimeInPeriod(startDate: Date, endDate: Date): Promise<number> {
    const [result] = await db
      .select({
        avgTime: avg(sql`EXTRACT(EPOCH FROM (${notificationJobs.completedAt} - ${notificationJobs.startedAt})) * 1000`)
      })
      .from(notificationJobs)
      .where(
        and(
          eq(notificationJobs.status, 'completed'),
          gte(notificationJobs.completedAt, startDate),
          lte(notificationJobs.completedAt, endDate),
          isNotNull(notificationJobs.startedAt)
        )
      );

    return Math.round(Number(result.avgTime) || 0);
  }

  async getFailedNotificationsSince(cutoffTime: Date): Promise<any[]> {
    return await db
      .select()
      .from(userNotifications)
      .innerJoin(
        globalNotifications,
        eq(userNotifications.globalNotificationId, globalNotifications.id)
      )
      .where(
        and(
          eq(userNotifications.deliveryStatus, 'failed'),
          gte(userNotifications.updatedAt, cutoffTime),
          lte(userNotifications.deliveryAttempts, 3) // Máximo 3 tentativas
        )
      )
      .orderBy(asc(userNotifications.deliveryAttempts));
  }

  // ========================================
  // AUDIT LOG
  // ========================================

  async createAuditLog(log: InsertNotificationAuditLog): Promise<void> {
    try {
      await db
        .insert(notificationAuditLog)
        .values({
          ...log,
          createdAt: new Date()
        });
    } catch (error) {
      // Log de auditoria não deve quebrar a operação principal
      console.error('Erro criando log de auditoria:', error);
    }
  }

  async createAuditLogWithContext(
    log: Omit<InsertNotificationAuditLog, 'ipAddress' | 'userAgent' | 'sessionId' | 'requestId' | 'correlationId' | 'processingTimeMs'>,
    context: AuditContext = {}
  ): Promise<void> {
    try {
      console.log('🔍 AUDIT CONTEXT DEBUG - beforeState:', !!context.beforeState);
      console.log('🔍 AUDIT CONTEXT DEBUG - afterState:', !!context.afterState);
      console.log('🔍 AUDIT CONTEXT DEBUG - sessionId:', context.sessionId);
      const requestInfo = extractRequestInfo(context.req);
      const processingTime = context.processingStartTime ? Date.now() - context.processingStartTime : undefined;

      const auditData = {
        ...log,
        // Dados da requisição HTTP
        ipAddress: requestInfo.ipAddress,
        userAgent: requestInfo.userAgent,
        sessionId: context.sessionId || requestInfo.sessionId,
        requestId: requestInfo.requestId,

        // IDs de correlação
        correlationId: context.correlationId || generateCorrelationId(),

        // Estados antes e depois
        beforeState: context.beforeState ? JSON.stringify(context.beforeState) : undefined,
        afterState: context.afterState ? JSON.stringify(context.afterState) : undefined,

        // Dados técnicos
        processingNode: process.env.NODE_NAME || `node_${process.pid}`,
        processingTimeMs: processingTime,

        // Contexto adicional
        userId: context.userId || log.userId,
        patientId: context.patientId || log.patientId,

        createdAt: new Date()
      };

      console.log('🔍 FINAL AUDIT DATA - beforeState:', auditData.beforeState ? 'YES' : 'NO');
      console.log('🔍 FINAL AUDIT DATA - afterState:', auditData.afterState ? 'YES' : 'NO');
      console.log('🔍 FINAL AUDIT DATA - sessionId:', auditData.sessionId);

      await db
        .insert(notificationAuditLog)
        .values(auditData);

      // Log detalhado para debug se necessário
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 Audit Log: ${log.action} on ${log.entityType} ${log.entityId} by user ${auditData.userId} (${auditData.ipAddress})`);
      }
    } catch (error) {
      // Log de auditoria não deve quebrar a operação principal
      console.error('Erro criando log de auditoria com contexto:', error);
    }
  }

  // ========================================
  // MEDICATION LOGS
  // ========================================

  async getTodayMedicationLogs(patientId: number): Promise<any[]> {
    // Usar horário local brasileiro corretamente
    const nowUTC = new Date();
    const nowBrasil = new Date(nowUTC.getTime() - (3 * 60 * 60 * 1000)); // UTC-3

    // Definir início e fim do dia atual no horário brasileiro
    const startOfToday = new Date(nowBrasil.getFullYear(), nowBrasil.getMonth(), nowBrasil.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(nowBrasil.getFullYear(), nowBrasil.getMonth(), nowBrasil.getDate(), 23, 59, 59, 999);

    const logs = await db
      .select({
        id: medicationLogs.id,
        medicationId: medicationLogs.medicationId,
        scheduleId: medicationLogs.scheduleId,
        patientId: medicationLogs.patientId,
        scheduledDateTime: medicationLogs.scheduledDateTime,
        actualDateTime: medicationLogs.actualDateTime,
        status: medicationLogs.status,
        delayMinutes: medicationLogs.delayMinutes,
        confirmedBy: medicationLogs.confirmedBy,
        createdAt: medicationLogs.createdAt,
        medication: {
          id: medications.id,
          name: medications.name,
          dosage: medications.dosage,
          isActive: medications.isActive,
        }
      })
      .from(medicationLogs)
      .leftJoin(medications, eq(medicationLogs.medicationId, medications.id))
      .where(
        and(
          eq(medicationLogs.patientId, patientId),
          gte(medicationLogs.scheduledDateTime, startOfToday),
          lte(medicationLogs.scheduledDateTime, endOfToday)
        )
      )
      .orderBy(medicationLogs.scheduledDateTime);

    const updatedLogs = logs.map(log => {
      const scheduledTime = new Date(log.scheduledDateTime);

      // Usar horário brasileiro para cálculo
      const timeDiffMs = nowBrasil.getTime() - scheduledTime.getTime();
      const timeDiffMinutes = Math.floor(timeDiffMs / (1000 * 60));

      // Se já foi tomado, manter status 'taken'
      if (log.status === 'taken') {
        return log;
      }

      // Se passou mais de 15 minutos do horário, marcar como atrasado
      if (timeDiffMinutes > 15) {
        return {
          ...log,
          status: 'overdue' as const,
          delayMinutes: timeDiffMinutes
        };
      }

      // Senão, manter como pendente
      return {
        ...log,
        status: 'pending' as const,
        delayMinutes: 0
      };
    });

    // Filtrar logs: incluir todos os logs já tomados + logs pendentes/atrasados apenas de medicamentos ativos
    const filteredLogs = updatedLogs.filter(log => {
      // Sempre incluir logs já tomados, mesmo de medicamentos inativos
      if (log.status === 'taken') {
        return true;
      }

      // Para logs pendentes/atrasados, incluir apenas de medicamentos ativos
      return log.medication?.isActive === true;
    });

    return filteredLogs;
  }

  // ========================================
  // CRITICAL MEDICATIONS
  // ========================================

  async getPatientsWithCriticalOverdueMedications(): Promise<any[]> {
    // Buscar pacientes com medicamentos atrasados por mais de 2 horas
    const twoHoursAgo = new Date();
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

    const patientsWithOverdue = await db
      .select({
        patientId: medicationLogs.patientId,
        medicationId: medicationLogs.medicationId,
        scheduledDateTime: medicationLogs.scheduledDateTime,
        delayMinutes: medicationLogs.delayMinutes,
        patientName: users.name,
        medicationName: medications.name,
        medicationDosage: medications.dosage
      })
      .from(medicationLogs)
      .leftJoin(users, eq(medicationLogs.patientId, users.id))
      .leftJoin(medications, eq(medicationLogs.medicationId, medications.id))
      .where(
        and(
          eq(medicationLogs.status, 'overdue'),
          lte(medicationLogs.scheduledDateTime, twoHoursAgo),
          eq(medications.isActive, true)
        )
      )
      .orderBy(medicationLogs.scheduledDateTime);

    return patientsWithOverdue;
  }

  // ========================================
  // LEGACY COMPATIBILITY METHODS
  // ========================================

  async getActiveMedicationsForPatient(patientId: number): Promise<any[]> {
    return await db
      .select({
        id: medications.id,
        name: medications.name,
        dosage: medications.dosage,
        frequency: medications.frequency,
        isActive: medications.isActive,
        createdAt: medications.createdAt
      })
      .from(medications)
      .where(
        and(
          eq(medications.patientId, patientId),
          eq(medications.isActive, true)
        )
      )
      .orderBy(medications.name);
  }

  async getMedicationSchedules(medicationId: number): Promise<any[]> {
    // Implementação simplificada - retorna horários baseados na frequência
    const [medication] = await db
      .select()
      .from(medications)
      .where(eq(medications.id, medicationId));

    if (!medication) return [];

    // Gerar horários baseados na frequência
    const schedules = [];
    const frequency = medication.frequency || '1x';
    const times = this.parseFrequency(frequency);

    for (const time of times) {
      schedules.push({
        id: `${medicationId}_${time}`,
        medicationId,
        scheduledTime: time,
        isActive: medication.isActive
      });
    }

    return schedules;
  }

  private parseFrequency(frequency: string): string[] {
    // Implementação básica de parsing de frequência
    if (frequency.includes('1x')) return ['08:00'];
    if (frequency.includes('2x')) return ['08:00', '20:00'];
    if (frequency.includes('3x')) return ['08:00', '14:00', '20:00'];
    if (frequency.includes('4x')) return ['08:00', '12:00', '16:00', '20:00'];
    return ['08:00'];
  }

  async getUser(userId: number): Promise<any> {
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        profileType: users.profileType
      })
      .from(users)
      .where(eq(users.id, userId));

    return user;
  }

  async getUpcomingAppointmentsForPatient(patientId: number): Promise<any[]> {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));

    try {
      // Usar query SQL raw para compatibilidade
      const query = `
        SELECT id, patient_id, title, scheduled_date_time, status, doctor_name
        FROM appointments
        WHERE patient_id = $1
        AND scheduled_date_time >= $2
        AND scheduled_date_time <= $3
        AND status = 'scheduled'
        ORDER BY scheduled_date_time ASC
      `;

      const result = await db.execute(sql.raw(
        query.replace('$1', patientId.toString())
             .replace('$2', `'${now.toISOString()}'`)
             .replace('$3', `'${nextWeek.toISOString()}'`)
      ));

      return result.rows as any[];
    } catch (error) {
      console.error('Erro ao buscar appointments:', error);
      return [];
    }
  }

  async getUpcomingTestsForPatient(patientId: number): Promise<any[]> {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));

    try {
      // Usar query SQL raw para compatibilidade
      const query = `
        SELECT id, patient_id, title, scheduled_date_time, status, test_type
        FROM tests
        WHERE patient_id = $1
        AND scheduled_date_time >= $2
        AND scheduled_date_time <= $3
        AND status = 'scheduled'
        ORDER BY scheduled_date_time ASC
      `;

      const result = await db.execute(sql.raw(
        query.replace('$1', patientId.toString())
             .replace('$2', `'${now.toISOString()}'`)
             .replace('$3', `'${nextWeek.toISOString()}'`)
      ));

      return result.rows as any[];
    } catch (error) {
      console.error('Erro ao buscar tests:', error);
      return [];
    }
  }

  async createNotificationMetric(metrics: any): Promise<void> {
    // Alias para createNotificationMetrics
    return await this.createNotificationMetrics(metrics);
  }

  async deleteOldNotificationMetrics(cutoffDate: Date): Promise<number> {
    // Alias para cleanupOldMetrics
    return await this.cleanupOldMetrics(cutoffDate);
  }

  async getActiveUsersInPeriod(startDate: Date, endDate: Date): Promise<number> {
    // Alias para countActiveUsersInPeriod
    return await this.countActiveUsersInPeriod(startDate, endDate);
  }

  async countUserNotificationsInPeriod(startDate: Date, endDate: Date): Promise<number> {
    // Contar notificações de usuários no período
    const [result] = await db
      .select({ count: count() })
      .from(userNotifications)
      .where(
        and(
          gte(userNotifications.createdAt, startDate),
          lte(userNotifications.createdAt, endDate)
        )
      );

    return result.count;
  }

  async createRateLimit(rateLimit: any): Promise<void> {
    // Implementar rate limiting no banco usando campos corretos da tabela
    await db
      .insert(notificationRateLimit)
      .values({
        limitType: rateLimit.type || 'notifications_per_hour',
        limitValue: rateLimit.limit || 100,
        windowStart: rateLimit.windowStart || new Date(),
        windowEnd: rateLimit.windowEnd || new Date(Date.now() + 60 * 60 * 1000), // 1 hora depois
        currentCount: rateLimit.currentCount || 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
  }

  // ========================================
  // SCHEDULER COMPATIBILITY METHODS
  // ========================================

  // Buscar todos os medicamentos ativos com schedules associados
  async getAllActiveMedications(): Promise<any[]> {
    try {
      const result = await db.execute(sql`
        SELECT
          m.id, m.patient_id, m.name, m.dosage, m.frequency,
          m.start_date, m.end_date, m.is_active
        FROM medications m
        WHERE m.is_active = true
        AND EXISTS (
          SELECT 1 FROM medication_schedules ms
          WHERE ms.medication_id = m.id
          AND ms.is_active = true
        )
        ORDER BY m.patient_id, m.name
      `);

      console.log(`📊 Encontrados ${result.rows.length} medicamentos ativos com horários`);
      return result.rows;
    } catch (error) {
      console.error('❌ Erro ao buscar medicamentos ativos:', error);
      return [];
    }
  }

  // Buscar schedules por medicamento
  async getSchedulesByMedication(medicationId: number): Promise<any[]> {
    try {
      const result = await db.execute(sql`
        SELECT id, medication_id, scheduled_time, is_active
        FROM medication_schedules
        WHERE medication_id = ${medicationId}
        AND is_active = true
        ORDER BY scheduled_time
      `);

      if (result.rows.length > 0) {
        console.log(`📅 Medicamento ID ${medicationId} - ${result.rows.length} schedules específicos encontrados:`, 
          result.rows.map(r => r.scheduled_time));
        return result.rows;
      } else {
        console.log(`📅 Medicamento ID ${medicationId} - Nenhum schedule específico, usando horários da frequência`);
        
        // Buscar medicamento para usar frequência
        const medResult = await db.execute(sql`
          SELECT frequency FROM medications WHERE id = ${medicationId}
        `);
        
        if (medResult.rows.length > 0) {
          const frequency = medResult.rows[0].frequency;
          const times = this.parseFrequency(frequency);
          
          return times.map((time, index) => ({
            id: `freq_${medicationId}_${index}`,
            medication_id: medicationId,
            scheduled_time: time,
            is_active: true
          }));
        }
        
        return [];
      }
    } catch (error) {
      console.error('❌ Erro ao buscar schedules:', error);
      return [];
    }
  }


  async getUpcomingAppointments(): Promise<any[]> {
    const now = new Date();
    const nextMonth = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));

    return await db
      .select({
        id: appointments.id,
        patientId: appointments.patientId,
        title: appointments.title,
        appointmentDate: appointments.appointmentDate,
        doctorName: appointments.doctorName,
        location: appointments.location,
        notes: appointments.notes,
        status: appointments.status,
        createdAt: appointments.createdAt,
        patientName: users.name
      })
      .from(appointments)
      .innerJoin(users, eq(appointments.patientId, users.id))
      .where(
        and(
          gte(appointments.appointmentDate, now),
          lte(appointments.appointmentDate, nextMonth),
          eq(appointments.status, 'scheduled'),
          eq(users.profileType, 'patient')
        )
      )
      .orderBy(appointments.appointmentDate);
  }

  async getUpcomingTests(): Promise<any[]> {
    const now = new Date();
    const nextMonth = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));

    return await db
      .select({
        id: tests.id,
        patientId: tests.patientId,
        name: tests.name,
        type: tests.type,
        testDate: tests.testDate,
        location: tests.location,
        results: tests.results,
        status: tests.status,
        createdAt: tests.createdAt,
        patientName: users.name
      })
      .from(tests)
      .innerJoin(users, eq(tests.patientId, users.id))
      .where(
        and(
          gte(tests.testDate, now),
          lte(tests.testDate, nextMonth),
          eq(tests.status, 'scheduled'),
          eq(users.profileType, 'patient')
        )
      )
      .orderBy(tests.testDate);
  }

  async getMedicationSchedulesToday(): Promise<any[]> {
    // Gerar horários automáticos baseados na frequência dos medicamentos
    const medications = await this.getAllActiveMedications();
    const schedules: any[] = [];

    for (const medication of medications) {
      const today = new Date();
      const medicationSchedules = await this.getSchedulesByMedication(medication.id); // Buscar schedules do medicamento

      for (const schedule of medicationSchedules) {
        if (!schedule.is_active) continue; // Ignorar schedules inativos

        const scheduledDateTime = new Date(today);
        const [hours, minutes] = schedule.scheduled_time.split(':').map(Number);
        scheduledDateTime.setHours(hours, minutes, 0, 0);

        // Verificar se o horário já passou hoje, se sim, adicionar ao dia seguinte
        if (scheduledDateTime < today) {
          scheduledDateTime.setDate(scheduledDateTime.getDate() + 1);
        }

        schedules.push({
          id: schedule.id, // Usar o ID do schedule
          medicationId: medication.id,
          patientId: medication.patientId,
          scheduledDateTime: scheduledDateTime,
          medicationName: medication.name,
          dosage: medication.dosage,
          status: 'pending'
        });
      }
    }

    return schedules;
  }

  // Método para verificar se medicamento já foi tomado hoje para um horário específico (manter compatibilidade)
  async hasMedicationLogForToday(medicationId: number, hour: number): Promise<boolean> {
    try {
      const today = startOfDay(new Date());
      const tomorrow = addDays(today, 1);

      const result = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM medication_logs
        WHERE medication_id = ${medicationId}
        AND status = 'taken'
        AND scheduled_date_time >= ${today}
        AND scheduled_date_time < ${tomorrow}
        AND EXTRACT(HOUR FROM scheduled_date_time) = ${hour}
      `);

      const count = result.rows[0]?.count || 0;
      console.log(`🔍 Medicamento ${medicationId} hora ${hour}: ${count} logs encontrados hoje`);
      return count > 0;
    } catch (error) {
      console.error('❌ Erro ao verificar log de medicamento:', error);
      return false;
    }
  }

  // Método para verificar se medicamento já foi tomado hoje para um schedule específico
  async hasMedicationLogForScheduleToday(medicationId: number, scheduleId: number): Promise<boolean> {
    try {
      const today = startOfDay(new Date());
      const tomorrow = addDays(today, 1);

      const result = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM medication_logs
        WHERE medication_id = ${medicationId}
        AND schedule_id = ${scheduleId}
        AND status = 'taken'
        AND scheduled_date_time >= ${today}
        AND scheduled_date_time < ${tomorrow}
      `);

      const count = result.rows[0]?.count || 0;
      console.log(`🔍 Medicamento ${medicationId} schedule ${scheduleId}: ${count} logs encontrados hoje`);
      return count > 0;
    } catch (error) {
      console.error('❌ Erro ao verificar log de medicamento por schedule:', error);
      return false;
    }
  }


  async getMedicationLogForSchedule(medicationId: number, scheduleDate?: Date): Promise<any> {
    try {
      // Se não temos uma data específica, usar hoje
      const targetDate = scheduleDate || new Date();
      const dateStr = targetDate.toISOString().split('T')[0];

      // Buscar log de medicamento para data específica usando Drizzle ORM
      const result = await db
        .select()
        .from(medicationLogs)
        .where(
          and(
            eq(medicationLogs.medicationId, medicationId),
            sql`DATE(${medicationLogs.actualDateTime}) = DATE(${dateStr})`
          )
        )
        .limit(1);

      return result[0] || null;
    } catch (error) {
      console.error('Erro ao buscar medication log:', error);
      return null;
    }
  }
}

// SINGLETON EXPORT
export const enterpriseStorage = new EnterpriseStorage();