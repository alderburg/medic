// ========================================
// MÉTODOS ADICIONAIS PARA ENTERPRISE STORAGE
// ========================================

import { db } from "./db";
import { eq, and, gte, lte, desc, asc, ne, sql, isNotNull, or, inArray, count, avg, max } from "drizzle-orm";
import { 
  globalNotifications,
  userNotifications,
  notificationJobs,
  notificationMetrics,
  notificationAuditLog,
  users,
  careRelationships
} from "@shared/schema";

// MÉTODOS ADICIONAIS QUE ESTÃO FALTANDO
export const additionalMethods = {
  
  // Método para buscar notificações por tipo em período
  async countNotificationsByTypeInPeriod(type: string, startDate: Date, endDate: Date): Promise<number> {
    try {
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
    } catch (error) {
      console.error('❌ Erro contando notificações por tipo:', error);
      return 0;
    }
  },

  // Método para contar pacientes ativos em período
  async countActivePatientsInPeriod(startDate: Date, endDate: Date): Promise<number> {
    try {
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
    } catch (error) {
      console.error('❌ Erro contando pacientes ativos:', error);
      return 0;
    }
  },

  // Método para contar usuários ativos em período
  async countActiveUsersInPeriod(startDate: Date, endDate: Date): Promise<number> {
    try {
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
    } catch (error) {
      console.error('❌ Erro contando usuários ativos:', error);
      return 0;
    }
  },

  // Método para tempo médio de processamento
  async getAverageJobProcessingTimeInPeriod(startDate: Date, endDate: Date): Promise<number> {
    try {
      const [result] = await db
        .select({ avgTime: avg(notificationJobs.completedAt) })
        .from(notificationJobs)
        .where(
          and(
            gte(notificationJobs.createdAt, startDate),
            lte(notificationJobs.createdAt, endDate),
            eq(notificationJobs.status, 'completed')
          )
        );
      
      return result.avgTime ? Number(result.avgTime) : 0;
    } catch (error) {
      console.error('❌ Erro calculando tempo médio:', error);
      return 0;
    }
  },

  // Método para buscar notificações falhadas
  async getFailedNotificationsSince(cutoffTime: Date): Promise<any[]> {
    try {
      return await db
        .select()
        .from(userNotifications)
        .where(
          and(
            eq(userNotifications.deliveryStatus, 'failed'),
            gte(userNotifications.createdAt, cutoffTime)
          )
        )
        .limit(100);
    } catch (error) {
      console.error('❌ Erro buscando notificações falhadas:', error);
      return [];
    }
  }
};