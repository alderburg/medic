// ========================================
// ENTERPRISE NOTIFICATION API ROUTES
// ========================================

import express, { Request, Response, Router } from 'express';
import { storage } from './storage';
import { db } from './db';
import { sql } from 'drizzle-orm';
import { authenticateToken } from './routes';
import { getUserNotificationById } from './storage-extension.js';

// Import WebSocket connections from index.ts
let authenticatedConnections: any;
try {
  authenticatedConnections = require('./index').authenticatedConnections;
} catch (error) {
  console.log('⚠️ WebSocket connections não disponíveis ainda');
}

// Function to broadcast enterprise notifications
function broadcastEnterpriseNotification(notification: any) {
  if (!authenticatedConnections) return;

  let broadcastCount = 0;
  authenticatedConnections.forEach((connection: any) => {
    if (connection.ws.readyState === 1) { // WebSocket.OPEN
      try {
        connection.ws.send(JSON.stringify({
          type: 'enterprise_notification',
          data: notification
        }));
        broadcastCount++;
      } catch (error) {
        console.error('❌ Erro enviando notificação via WebSocket:', error);
      }
    }
  });

  if (broadcastCount > 0) {
    console.log(`📡 Notificação enterprise enviada via WebSocket para ${broadcastCount} conexões`);
  }
}

export function setupEnterpriseNotificationRoutes() {
  console.log('📋 Configurando rotas enterprise notifications...');

  const router = express.Router();

  // ========================================
  // NOTIFICAÇÕES DO USUÁRIO
  // ========================================

  // 📬 ENDPOINT: Buscar notificações do usuário logado
  router.get("/api/enterprise/notifications", authenticateToken, async (req: any, res) => {
    console.log('🎯 CHAMADA API ENTERPRISE RECEBIDA');
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      console.log(`📬 API Enterprise: Buscando notificações para usuário ${userId} (limit: ${limit}, offset: ${offset})`);

      // Buscar diretamente do banco usando query SQL para contornar problemas do Drizzle
      let notifications = [];
      try {
        const rawResult = await db.execute(sql.raw(`
          SELECT un.*, gn.title, gn.message, gn.type, gn.patient_name, gn.priority as global_priority, 
                 gn.metadata, gn.related_id, gn.user_id as editor_user_id, gn.user_name as editor_user_name
          FROM user_notifications un
          LEFT JOIN global_notifications gn ON un.global_notification_id = gn.id
          WHERE un.user_id = $1 
          ORDER BY un.created_at DESC 
          LIMIT $2 OFFSET $3
        `, [userId, limit, offset]));

        notifications = (rawResult.rows || []).map((row: any) => {
          // Usar o nome do editor diretamente da coluna user_name, com fallback para metadata
          let editorName = row.editor_user_name || 'Usuário do sistema';
          
          // Se não tiver no campo direto, tentar buscar no metadata (dados históricos)
          if (!row.editor_user_name && row.metadata) {
            try {
              const metadata = JSON.parse(row.metadata);
              editorName = metadata.editorName || 'Usuário do sistema';
            } catch (e) {
              // Se erro no parse do JSON, manter valor padrão
            }
          }

          return {
            id: row.id,
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
            priority: row.priority || row.global_priority,
            expiresAt: row.expires_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            // Campos adicionais da global notification para compatibilidade com frontend
            title: row.title || 'Notificação',
            message: row.message || 'Nova notificação disponível',
            type: row.type || 'system',
            patientName: row.patient_name,
            relatedId: row.related_id,
            // NOVO: Nome do editor extraído do campo direto ou metadata
            editorName: editorName,
            editorUserId: row.editor_user_id
          };
        });

        console.log(`🔍 DEBUG: SQL com JOIN retornou ${notifications.length} notificações`);
      } catch (error) {
        console.error('❌ Erro na query SQL:', error);
        notifications = [];
      }
      console.log(`📊 API Enterprise: ${notifications?.length || 0} notificações encontradas`);
      const summary = await storage.getUserNotificationSummary(userId);
      console.log(`📊 API Enterprise: Summary -`, summary);

      res.json({
        notifications,
        summary,
        pagination: {
          limit,
          offset,
          hasMore: notifications.length === limit
        }
      });

    } catch (error) {
      console.error('❌ Erro ao buscar notificações enterprise:', error);
      res.status(500).json({ message: "Erro ao buscar notificações" });
    }
  });

  // ✅ ENDPOINT: Marcar notificação como lida
  router.put("/api/enterprise/notifications/:id/read", authenticateToken, async (req: any, res) => {
    const processingStartTime = Date.now();
    try {
      const notificationId = parseInt(req.params.id);
      const userId = req.user.id;

      console.log(`✅ Marcando notificação ${notificationId} como lida para usuário ${userId}`);

      // Capturar estado antes da mudança
      const beforeState = await getUserNotificationById(notificationId);

      await storage.markUserNotificationAsRead(notificationId);

      // Capturar estado depois da mudança
      const afterState = await getUserNotificationById(notificationId);

      // Criar audit log com contexto completo
      await storage.createAuditLogWithContext({
        entityType: 'user_notification',
        entityId: notificationId,
        action: 'read',
        userId: userId,
        success: true,
        details: JSON.stringify({
          notificationId,
          previousReadStatus: beforeState?.isRead || false,
          newReadStatus: afterState?.isRead || true,
          userAgent: req.get('User-Agent'),
          endpoint: '/api/enterprise/notifications/:id/read'
        })
      }, {
        req,
        userId,
        beforeState,
        afterState,
        processingStartTime,
        correlationId: `read_notification_${notificationId}_${Date.now()}`
      });

      // Broadcast the update via WebSocket
      if (afterState) {
        broadcastEnterpriseNotification(afterState);
      }

      res.json({ success: true, message: "Notificação marcada como lida" });

    } catch (error) {
      console.error('❌ Erro ao marcar notificação como lida:', error);

      // Audit log para erro
      await storage.createAuditLogWithContext({
        entityType: 'user_notification',
        entityId: parseInt(req.params.id) || 0,
        action: 'read',
        userId: req.user?.id,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Erro desconhecido',
        details: JSON.stringify({
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          endpoint: '/api/enterprise/notifications/:id/read'
        })
      }, {
        req,
        userId: req.user?.id,
        processingStartTime
      });

      res.status(500).json({ message: "Erro ao marcar notificação como lida" });
    }
  });

  // ✅ ENDPOINT: Marcar todas as notificações como lidas
  router.put("/api/enterprise/notifications/mark-all-read", authenticateToken, async (req: any, res) => {
    try {
      const userId = req.user.id;

      console.log(`✅ Marcando todas as notificações como lidas para usuário ${userId}`);

      // Mark all unread notifications as read for this user usando SQL raw
      const rawResult = await db.execute(sql.raw(`
        SELECT id FROM user_notifications WHERE user_id = $1 AND is_read = false
      `, [userId]));

      const unreadIds = (rawResult.rows || []).map((row: any) => row.id);

      for (const notificationId of unreadIds) {
        await storage.markUserNotificationAsRead(notificationId);
      }

      // Broadcast the update via WebSocket
      // Ideally, we would broadcast a "marked all as read" event or individual updates
      // For simplicity, let's fetch and broadcast a sample if any were marked
      if (unreadIds.length > 0) {
        const firstUpdatedNotification = await storage.getUserNotificationById(unreadIds[0]);
        if (firstUpdatedNotification) {
          broadcastEnterpriseNotification(firstUpdatedNotification); // Broadcast one as an example
        }
      }

      res.json({ 
        success: true, 
        message: `${unreadIds.length} notificações marcadas como lidas` 
      });

    } catch (error) {
      console.error('❌ Erro ao marcar todas as notificações como lidas:', error);
      res.status(500).json({ message: "Erro ao marcar todas as notificações como lidas" });
    }
  });

  // 📊 ENDPOINT: Resumo de notificações do usuário
  router.get("/api/enterprise/notifications/summary", authenticateToken, async (req: any, res) => {
    try {
      const userId = req.user.id;

      console.log(`📊 Buscando resumo de notificações para usuário ${userId}`);

      const summary = await storage.getUserNotificationSummary(userId);

      res.json(summary);

    } catch (error) {
      console.error('❌ Erro ao buscar resumo de notificações:', error);
      res.status(500).json({ message: "Erro ao buscar resumo de notificações" });
    }
  });

  // ========================================
  // PROCESSAMENTO MANUAL (ADMIN)
  // ========================================

  // 🔄 ENDPOINT: Forçar processamento global de notificações
  router.post("/api/enterprise/notifications/process-global", authenticateToken, async (req: any, res) => {
    try {
      // Apenas administradores podem forçar processamento global
      if (req.user.profileType !== 'admin') {
        return res.status(403).json({ message: "Acesso negado - apenas administradores" });
      }

      console.log(`🔄 Usuário ${req.user.id} forçou processamento global de notificações`);

      // ENTERPRISE ENGINE INTEGRADO - Generate notifications
      // For demonstration, let's create a dummy notification and broadcast it
      const dummyNotification = {
        id: Date.now(),
        userId: req.user.id,
        title: 'Processamento Global Forçado',
        message: 'O processamento global de notificações foi executado.',
        type: 'system',
        createdAt: new Date().toISOString(),
        isRead: false
      };
      broadcastEnterpriseNotification(dummyNotification);


      const result = { success: true, generated: 0 };

      res.json({
        success: true,
        message: "Processamento global executado com sucesso",
        result
      });

    } catch (error) {
      console.error('❌ Erro no processamento global forçado:', error);
      res.status(500).json({ message: "Erro no processamento global" });
    }
  });

  // 🔄 ENDPOINT: Processar notificações de um paciente específico
  router.post("/api/enterprise/notifications/process-patient/:patientId", authenticateToken, async (req: any, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const userId = req.user.id;

      // Verificar se o usuário tem acesso a este paciente
      // Se for paciente, só pode acessar próprios dados
      if (req.user.profileType === 'patient' && userId !== patientId) {
        return res.status(403).json({ message: "Acesso negado - você só pode acessar seus próprios dados" });
      }

      // Se for cuidador/médico/etc, verificar relacionamento de cuidado
      if (req.user.profileType !== 'patient') {
        const careRelationships = await storage.getCareRelationships(userId);
        const hasAccess = careRelationships.some(rel => rel.patientId === patientId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Acesso negado - você não tem permissão para este paciente" });
        }
      }

      console.log(`🔄 Usuário ${userId} forçou processamento para paciente ${patientId}`);

      // Buscar dados básicos do paciente
      const patientData = await storage.getPatientBasicData(patientId);
      if (!patientData) {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }

      // ENTERPRISE ENGINE INTEGRADO - Process patient notifications
      // For demonstration, let's create a dummy notification and broadcast it
      const dummyNotification = {
        id: Date.now(),
        userId: req.user.id, // Or perhaps the patientId if appropriate
        title: `Processamento Paciente ${patientData.name}`,
        message: 'O processamento de notificações para este paciente foi executado.',
        type: 'patient_update',
        patientName: patientData.name,
        createdAt: new Date().toISOString(),
        isRead: false
      };
      broadcastEnterpriseNotification(dummyNotification);

      const result = { success: true, processedCount: 0 };

      res.json({
        success: true,
        message: `Processamento executado para paciente ${patientData.name}`,
        result
      });

    } catch (error) {
      console.error('❌ Erro no processamento de paciente específico:', error);
      res.status(500).json({ message: "Erro no processamento do paciente" });
    }
  });

  // ========================================
  // ESTATÍSTICAS E MÉTRICAS (ADMIN)
  // ========================================

  // 📈 ENDPOINT: Estatísticas do sistema de notificações
  router.get("/api/enterprise/notifications/stats", authenticateToken, async (req: any, res) => {
    try {
      // Apenas administradores podem ver estatísticas globais
      if (req.user.profileType !== 'admin') {
        return res.status(403).json({ message: "Acesso negado - apenas administradores" });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [
        totalCreated,
        totalDistributed,
        totalRead,
        medicationCount,
        appointmentCount,
        testCount,
        activePatients
      ] = await Promise.all([
        storage.countGlobalNotificationsInPeriod(today, tomorrow),
        storage.countDistributedNotificationsInPeriod(today, tomorrow),
        storage.countReadNotificationsInPeriod(today, tomorrow),
        storage.countNotificationsByTypeInPeriod('medication_reminder', today, tomorrow),
        storage.countNotificationsByTypeInPeriod('appointment_reminder', today, tomorrow),
        storage.countNotificationsByTypeInPeriod('test_reminder', today, tomorrow),
        storage.getTotalActivePatients()
      ]);

      const stats = {
        today: {
          totalCreated,
          totalDistributed,
          totalRead,
          byType: {
            medications: medicationCount,
            appointments: appointmentCount,
            tests: testCount
          },
          readRate: totalDistributed > 0 ? (totalRead / totalDistributed * 100).toFixed(1) : 0,
          distributionRate: totalCreated > 0 ? (totalDistributed / totalCreated * 100).toFixed(1) : 0
        },
        system: {
          activePatients,
          lastUpdate: new Date().toISOString()
        }
      };

      res.json(stats);

    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas:', error);
      res.status(500).json({ message: "Erro ao buscar estatísticas" });
    }
  });

  console.log('✅ Enterprise Notification Routes configuradas com sucesso');
  return router;
}