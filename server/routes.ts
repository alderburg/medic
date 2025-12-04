import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { db } from "./db";
import { globalNotifications, userNotifications } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { setupEnterpriseNotificationRoutes } from './routes-enterprise-notifications';
import {
  insertUserSchema,
  insertMedicationSchema,
  insertMedicationScheduleSchema,
  insertMedicationLogSchema,
  insertMedicationHistorySchema,
  insertAppointmentSchema,
  insertTestSchema,
  insertExamRequestSchema,
  insertPrescriptionSchema,
  insertBloodPressureReadingSchema,
  insertGlucoseReadingSchema,
  insertHeartRateReadingSchema,
  insertTemperatureReadingSchema,
  insertWeightReadingSchema,
  insertMedicalEvolutionSchema
} from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Broadcast function to send updates to all connected clients
export function broadcastUpdate(patientId: number, type: string, data: any) {
  const authenticatedConnections = global.authenticatedConnections;
  if (!authenticatedConnections) return;

  const connection = authenticatedConnections.get(patientId);
  if (connection && connection.readyState === WebSocket.OPEN) {
    const message = JSON.stringify({ type, data });
    try {
      connection.send(message);
      console.log(`📡 Broadcast enviado para usuário ${patientId}: ${type}`);
    } catch (error) {
      console.error('❌ Erro enviando broadcast:', error);
    }
  }
}

// Broadcast function for enterprise notifications to single user connection
export function broadcastNotificationToUser(userId: number, notification: any) {
  const authenticatedConnections = global.authenticatedConnections;

  console.log(`📡 Tentando broadcast para usuário ${userId}`);
  console.log(`📡 Conexões autenticadas disponíveis:`, authenticatedConnections ? 'SIM' : 'NÃO');

  if (!authenticatedConnections) {
    console.log('❌ Nenhuma conexão WebSocket disponível');
    return;
  }

  // Conexão única por usuário (Map<userId, WebSocket>)
  const connection = authenticatedConnections.get(userId);
  console.log(`📡 Conexão para usuário ${userId}:`, connection ? 'ATIVA' : 'NENHUMA');

  if (connection && connection.readyState === WebSocket.OPEN) {
    const message = JSON.stringify({
      type: 'enterprise_notification',
      data: notification
    });

    console.log(`📨 Enviando mensagem:`, message);

    try {
      connection.send(message);
      console.log(`✅ Mensagem enviada via WebSocket para usuário ${userId}`);
    } catch (error) {
      console.error('❌ Erro enviando notificação:', error);
    }
  } else {
    console.log(`⚠️ Nenhuma conexão ativa para usuário ${userId}`);
  }
}

// 🧠 FUNÇÃO CENTRAL: Determina qual ID de paciente usar para queries de dados médicos
const getEffectivePatientId = (req: any): number => {
  // REGRA 1: Se usuário é paciente, sempre usar seu próprio ID
  if (req.user.profileType === 'patient') {
    return req.user.id;
  }

  // REGRA 2: Se usuário é cuidador e tem paciente selecionado, usar esse ID
  if (req.user.profileType === 'caregiver' || req.user.profileType === 'doctor' ||
      req.user.profileType === 'family' || req.user.profileType === 'nurse') {

    // Prioridade 1: Contexto da requisição atual (recém definido)
    if (req.selectedPatientId) {
      console.log(`🎯 Usando contexto da requisição: paciente ${req.selectedPatientId} (cuidador ${req.user.id})`);
      return req.selectedPatientId;
    }

    // Prioridade 2: Contexto da sessão (persistente entre requisições)
    if (req.session?.selectedPatientId) {
      console.log(`🎯 Usando contexto da sessão: paciente ${req.session.selectedPatientId} (cuidador ${req.user.id})`);
      return req.session.selectedPatientId;
    }

    // Prioridade 3: Cuidadores podem ter seus próprios dados médicos (fallback)
    console.log(`🎯 Usando dados próprios do cuidador: ${req.user.id}`);
    return req.user.id;
  }

  // FALLBACK: Para outros roles, usar próprio ID
  return req.user.id;
};

// 🔔 FUNÇÃO HELPER: Criar notificação enterprise de forma simplificada
const createEnterpriseNotification = async (data: {
  userId: number;
  type: string;
  title: string;
  message: string;
  patientId: number;
  relatedId?: number;
}, req?: any, auditContext?: {
  beforeState?: any;
  afterState?: any;
  sessionId?: string;
}) => {
  try {
    console.log(`🔔 Criando notificação enterprise:`, {
      userId: data.userId,
      type: data.type,
      title: data.title,
      patientId: data.patientId
    });

    // Buscar nome do paciente
    const patient = await storage.getUser(data.patientId);
    const patientName = patient ? patient.name : 'Paciente';

    // Buscar dados do usuário que está realizando a ação (editor)
    let userId = null;
    let userName = 'Usuário do sistema';
    if (req?.user) {
      userId = req.user.id;
      userName = req.user.name || req.user.email || 'Usuário do sistema';
      console.log(`👤 Editor identificado: ${userName} (ID: ${userId})`);
    }

    // Criar notificação global com todos os campos do schema EXATAMENTE como prescrições
    const processingStartTime = Date.now();
    const httpContext = req ? {
      req: {
        ...req,
        // Garantir que todas as propriedades de IP estejam disponíveis
        ip: req.ip,
        connection: req.connection,
        socket: req.socket,
        headers: req.headers,
        get: req.get?.bind(req) || ((header: string) => req.headers[header.toLowerCase()])
      },
      userId: data.userId,
      processingStartTime: processingStartTime,
      // Adicionar dados de auditoria
      beforeState: auditContext?.beforeState,
      afterState: auditContext?.afterState,
      sessionId: auditContext?.sessionId || req.session?.id || req.sessionID
    } : undefined;

    const globalNotification = await storage.createGlobalNotification({
      // DADOS DO USUÁRIO QUE EXECUTOU A AÇÃO
      userId: userId,
      userName: userName,

      // DADOS DO PACIENTE
      patientId: data.patientId,
      patientName: patientName,

      // DADOS DA NOTIFICAÇÃO
      type: data.type,
      subtype: data.type.includes('_') ? data.type.split('_')[1] : 'general',
      title: data.title,
      message: data.message,

      // DADOS DO ITEM RELACIONADO (campos corretos do schema)
      relatedId: data.relatedId || null,
      relatedType: data.type.split('_')[0], // medication, appointment, test etc
      relatedItemName: data.title,

      // DADOS DE PRIORIDADE E TIMING
      priority: 'normal',
      urgencyScore: 50, // score médio
      originalScheduledTime: new Date(),
      notificationTriggerTime: new Date(),

      // DADOS DE PROCESSAMENTO
      processedAt: new Date(),
      distributedAt: new Date(),
      distributionCount: 0, // será incrementado depois

      // DADOS DE LOTE PARA PERFORMANCE
      batchId: `batch_${Date.now()}_${data.patientId}`,
      processingNode: 'node_primary',

      // METADADOS
      metadata: JSON.stringify({
        createdBy: 'system',
        source: 'user_action',
        relatedId: data.relatedId,
        patientId: data.patientId,
        editorName: userName, // Nome do usuário que realizou a ação
        editorId: userId, // ID do usuário que realizou a ação
        timestamp: new Date(Date.now() - (3 * 60 * 60 * 1000)).toISOString()
      }),
      deduplicationKey: `${data.type}_${data.patientId}_${data.relatedId || 'general'}_${Date.now()}`,

      // CONTROLE
      isActive: true,
      retryCount: 0,
      lastError: null,

      // Remover expiresAt pois não está no schema global_notifications
    }, httpContext);

    console.log(`✅ Notificação global criada com ID: ${globalNotification.id}`);

    // Buscar usuários com acesso ao paciente
    const authorizedUsers = await storage.getAllUsersWithPatientAccess(data.patientId);
    console.log(`👥 Usuários autorizados encontrados: ${authorizedUsers.length}`);

    // Distribuir para usuários autorizados
    for (const user of authorizedUsers) {
      const userNotification = await storage.createUserNotification({
        // RELACIONAMENTOS
        userId: user.userId,
        globalNotificationId: globalNotification.id,

        // DADOS DO USUÁRIO (cache para performance)
        userProfileType: user.userProfileType || 'patient',
        userName: user.userName || 'Usuário',

        // DADOS DE ACESSO AO PACIENTE
        accessType: user.accessType || 'owner',
        accessLevel: user.accessLevel || 'admin',

        // STATUS DA NOTIFICAÇÃO
        deliveryStatus: 'delivered',
        isRead: false,

        // TIMESTAMPS
        deliveredAt: new Date(),
        readAt: null,
        acknowledgedAt: null,

        // DADOS DE ENTREGA
        deliveryMethod: 'web', // mudado de push para web
        deliveryAttempts: 1,
        lastDeliveryError: null,

        // CONTROLE
        priority: 'normal',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas

        // METADADOS - adicionar campo que pode estar faltando
        metadata: JSON.stringify({
          relatedType: data.type.split('_')[0],
          relatedId: data.relatedId,
          patientId: data.patientId,
          createdBySystem: true
        })
      });
      console.log(`📨 Notificação de usuário criada para userId: ${user.userId} com ID: ${userNotification.id}`);
    }

    // Atualizar contador de distribuição E timestamp de distribuição
    const distributedAt = new Date();
    await storage.updateGlobalNotification(globalNotification.id, {
      distributionCount: authorizedUsers.length,
      distributedAt: distributedAt
    });

    console.log(`📊 Notificação distribuída para ${authorizedUsers.length} usuários`);
    console.log(`⏰ DISTRIBUTED_AT definido como: ${distributedAt.toISOString()}`);

    return globalNotification;
  } catch (error) {
    console.error('❌ Erro ao criar notificação enterprise:', error);
    console.error('Stack trace:', error.stack);
    return null;
  }
};

// Esta rota será adicionada dentro da função registerRoutes

// Middleware para autenticação
export const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token de acesso necessário' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await storage.getUser(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'Usuário não encontrado' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Token inválido' });
  }
};

// MIDDLEWARE: Recupera contexto do paciente da sessão
const restorePatientContext = (req: any, res: any, next: any) => {
  // Para cuidadores, recuperar contexto da sessão se existir
  if (req.user?.profileType === 'caregiver' && req.session?.selectedPatientId) {
    req.selectedPatientId = req.session.selectedPatientId;
    req.caregiverId = req.session.caregiverId || req.user.id;
    console.log(`🔄 Contexto restaurado da sessão: cuidador ${req.caregiverId} visualizando paciente ${req.selectedPatientId}`);
  }
  next();
};

export function registerRoutes() {
  const router = express.Router();

  // ROTA ENTERPRISE: GET /notifications - API enterprise direta
  router.get("/notifications", authenticateToken, async (req: any, res) => {
    try {
      console.log('🎯 API ENTERPRISE: Rota /notifications usando sistema enterprise diretamente');
      const userId = req.user.id;
      const userName = req.user.name;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      console.log(`📬 ENTERPRISE: Usuário ${userId} (${userName}) solicitando notificações (limit: ${limit}, offset: ${offset})`);

      // Verificar se há notificações na tabela user_notifications para este usuário
      const debugQuery = sql`SELECT COUNT(*) as count FROM user_notifications WHERE user_id = ${userId}`;
      const debugResult = await db.execute(debugQuery);
      const totalUserNotifications = debugResult.rows[0]?.count || 0;
      console.log(`🔍 DEBUG ENTERPRISE: Usuário ${userId} tem ${totalUserNotifications} notificações na tabela user_notifications`);

      // Buscar notificações do usuário
      const notifications = await storage.getUserNotificationsByUserId(userId, limit, offset);
      console.log(`📊 ENTERPRISE: Encontradas ${notifications?.length || 0} notificações para retornar`);

      if (notifications && notifications.length > 0) {
        console.log(`📊 ENTERPRISE: Primeiras 3 notificações:`, notifications.slice(0, 3).map(n => ({
          id: n.id,
          type: n.type,
          title: n.title,
          isRead: n.isRead,
          createdAt: n.createdAt
        })));
      }

      // Buscar summary
      const summary = await storage.getUserNotificationSummary(userId);
      console.log(`📊 ENTERPRISE Summary:`, summary);

      // Retornar no formato enterprise
      const response = {
        notifications: notifications || [],
        summary: summary || { total: 0, unread: 0 },
        pagination: {
          limit,
          offset,
          hasMore: (notifications?.length || 0) === limit
        }
      };

      res.json(response);

    } catch (error) {
      console.error('❌ Erro ao buscar notificações enterprise:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });

  // 🚀 ROTAS ENTERPRISE DE NOTIFICAÇÕES (INLINE)
  router.get("/api/enterprise/notifications", authenticateToken, async (req: any, res) => {
    try {
      console.log('🎯 API ENTERPRISE: Buscando notificações');
      const userId = req.user.id;
      const userName = req.user.name;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      console.log(`📬 Usuário ${userId} (${userName}) solicitando notificações (limit: ${limit}, offset: ${offset})`);

      // Verificar se há notificações na tabela user_notifications para este usuário
      const debugQuery = sql`SELECT COUNT(*) as count FROM user_notifications WHERE user_id = ${userId}`;
      const debugResult = await db.execute(debugQuery);
      const totalUserNotifications = debugResult.rows[0]?.count || 0;
      console.log(`🔍 DEBUG: Usuário ${userId} tem ${totalUserNotifications} notificações na tabela user_notifications`);

      // Verificar se há notificações globais ativas
      const globalQuery = sql`SELECT COUNT(*) as count FROM global_notifications WHERE is_active = true`;
      const globalResult = await db.execute(globalQuery);
      const totalGlobalNotifications = globalResult.rows[0]?.count || 0;
      console.log(`🔍 DEBUG: Existem ${totalGlobalNotifications} notificações globais ativas`);

      // Buscar notificações do usuário
      const notifications = await storage.getUserNotificationsByUserId(userId, limit, offset);
      console.log(`📊 Encontradas ${notifications?.length || 0} notificações para retornar`);

      if (notifications && notifications.length > 0) {
        console.log(`📊 Primeiras 3 notificações:`, notifications.slice(0, 3).map(n => ({
          id: n.id,
          type: n.type,
          title: n.title,
          isRead: n.isRead,
          createdAt: n.createdAt
        })));
      }

      // Buscar summary
      const summary = await storage.getUserNotificationSummary(userId);
      console.log(`📊 Summary:`, summary);

      const response = {
        notifications: notifications || [],
        summary: summary || { total: 0, unread: 0 },
        pagination: {
          limit,
          offset,
          hasMore: (notifications?.length || 0) === limit
        }
      };

      console.log(`📤 Enviando resposta:`, {
        notificationsCount: response.notifications.length,
        summary: response.summary
      });

      res.json(response);

    } catch (error) {
      console.error('❌ Erro ao buscar notificações enterprise:', error);
      res.status(500).json({ message: "Erro ao buscar notificações" });
    }
  });

  // Marcar notificação como lida
  // ROTA ENTERPRISE: Marcar notificação como lida
  router.put("/api/notifications/:id/read", authenticateToken, async (req: any, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const userId = req.user.id;

      console.log(`✅ ENTERPRISE: Marcando notificação ${notificationId} como lida para usuário ${userId}`);

      await storage.markUserNotificationAsRead(notificationId);

      res.json({ success: true, message: "Notificação marcada como lida" });

    } catch (error) {
      console.error('❌ ENTERPRISE: Erro ao marcar notificação como lida:', error);
      res.status(500).json({ message: "Erro ao marcar notificação como lida" });
    }
  });

  router.put("/api/enterprise/notifications/:id/read", authenticateToken, async (req: any, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const userId = req.user.id;

      console.log(`✅ Marcando notificação ${notificationId} como lida para usuário ${userId}`);

      await storage.markUserNotificationAsRead(notificationId);

      res.json({ success: true, message: "Notificação marcada como lida" });

    } catch (error) {
      console.error('❌ Erro ao marcar notificação como lida:', error);
      res.status(500).json({ message: "Erro ao marcar notificação como lida" });
    }
  });

  // ROTA ENTERPRISE: Marcar todas as notificações como lidas
  router.put("/api/notifications/mark-all-read", authenticateToken, async (req: any, res) => {
    try {
      const userId = req.user.id;

      console.log(`✅ ENTERPRISE: Marcando todas as notificações como lidas para usuário ${userId}`);

      // Buscar todas as notificações não lidas do usuário usando getUserNotificationsByUserId
      const allNotifications = await storage.getUserNotificationsByUserId(userId, 1000, 0);
      const unreadNotifications = allNotifications.filter(n => !n.isRead);

      console.log(`🔍 ENTERPRISE: Encontradas ${unreadNotifications.length} notificações não lidas para usuário ${userId}`);

      if (unreadNotifications && unreadNotifications.length > 0) {
        // Marcar cada notificação como lida
        for (const notification of unreadNotifications) {
          await storage.markUserNotificationAsRead(notification.id);
          console.log(`✅ ENTERPRISE: Notificação ${notification.id} marcada como lida`);
        }

        console.log(`✅ ENTERPRISE: ${unreadNotifications.length} notificações marcadas como lidas para usuário ${userId}`);
      }

      res.json({
        success: true,
        message: "Todas as notificações foram marcadas como lidas",
        markedCount: unreadNotifications?.length || 0
      });

    } catch (error) {
      console.error('❌ ENTERPRISE: Erro ao marcar todas as notificações como lidas:', error);
      res.status(500).json({ message: "Erro ao marcar todas as notificações como lidas" });
    }
  });

  // Rota temporária para executar migração de gênero
  router.get("/admin/migrate-gender", async (req, res) => {
    try {
      await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(10)`);
      res.json({ success: true, message: "Campo gender adicionado com sucesso" });
    } catch (error) {
      console.error('Erro na migração:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Auth routes
  router.post("/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);

      // Verificar se o usuário já existe
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email já está em uso" });
      }

      // Hash da senha
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      // Gerar token JWT
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

      res.json({
        user: { ...user, password: undefined },
        token,
      });
    } catch (error) {
      res.status(400).json({ message: "Erro no registro do usuário" });
    }
  });

  router.post("/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await storage.getUserByEmail(email);
      if (!user) {
        console.log(`🔐 Tentativa de login com email não encontrado: ${email}`);
        return res.status(401).json({ message: "Email ou senha inválidos" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        console.log(`🔐 Tentativa de login com senha incorreta para: ${email}`);
        return res.status(401).json({ message: "Email ou senha inválidos" });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      console.log(`✅ Login bem-sucedido para: ${email} (ID: ${user.id})`);

      res.json({
        user: { ...user, password: undefined },
        token,
      });
    } catch (error) {
      console.error('❌ Erro interno no login:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  router.get("/auth/me", authenticateToken, async (req: any, res) => {
    res.json({ user: { ...req.user, password: undefined } });
  });

  // User update route
  router.put("/users/:id", authenticateToken, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.id);

      // Verificar se o usuário pode atualizar este perfil
      if (req.user.id !== userId) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const updateData = req.body;

      // Remover campos que não devem ser atualizados
      const { id, password, email, profileType, ...allowedUpdates } = updateData;

      const updatedUser = await storage.updateUser(userId, allowedUpdates);

      if (!updatedUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      res.json({ user: { ...updatedUser, password: undefined } });
    } catch (error) {
      res.status(500).json({ message: "Erro ao atualizar usuário" });
    }
  });

  // Change password route
  router.put("/users/:id/change-password", authenticateToken, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.id);

      // Verificar se o usuário pode atualizar este perfil
      if (req.user.id !== userId) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Senha atual e nova senha são obrigatórias" });
      }

      // Verificar senha atual
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ message: "Senha atual incorreta" });
      }

      // Hash da nova senha
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      // Atualizar senha no banco
      const updatedUser = await storage.updateUser(userId, { password: hashedNewPassword });

      if (!updatedUser) {
        return res.status(500).json({ message: "Erro ao atualizar senha" });
      }

      res.json({ message: "Senha alterada com sucesso" });
    } catch (error) {

      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Medication routes
  router.get("/medications", authenticateToken, restorePatientContext, async (req: any, res) => {
    try {
      const patientId = getEffectivePatientId(req);
      const medications = await storage.getMedicationsByPatient(patientId);

      // Buscar horários para cada medicamento
      const medicationsWithSchedules = await Promise.all(
        medications.map(async (medication) => {
          const schedules = await storage.getSchedulesByMedication(medication.id);
          // Mapear scheduledTime para time para compatibilidade com frontend
          const mappedSchedules = schedules.map(schedule => ({
            ...schedule,
            time: schedule.scheduledTime
          }));
          return { ...medication, schedules: mappedSchedules };
        })
      );

      res.json(medicationsWithSchedules);
    } catch (error) {

      res.status(500).json({ message: "Erro ao buscar medicamentos" });
    }
  });

  router.post("/medications", authenticateToken, async (req: any, res) => {
    try {
      const { schedules, ...medicationInfo } = req.body;

      // Converter strings de data para objetos Date
      const processedData = {
        ...medicationInfo,
        patientId: req.user.id,
        startDate: medicationInfo.startDate ? new Date(medicationInfo.startDate) : undefined,
        endDate: medicationInfo.endDate ? new Date(medicationInfo.endDate) : undefined,
      };

      const medicationData = insertMedicationSchema.parse(processedData);
      const medication = await storage.createMedication(medicationData);

      // Criar horários se fornecidos e válidos
      if (schedules && Array.isArray(schedules)) {
        for (const schedule of schedules) {
          // O frontend envia 'time' em vez de 'scheduledTime'
          const timeValue = schedule.time || schedule.scheduledTime;
          if (schedule && timeValue && typeof timeValue === 'string' && timeValue.trim() !== '') {
            await storage.createMedicationSchedule({
              medicationId: medication.id,
              scheduledTime: timeValue.trim(),
            });
          }
        }
      }

      // Se o medicamento tem data de início hoje, criar logs para hoje automaticamente
      // Usar horário brasileiro (UTC-3)
      const nowUTC = new Date();
      const nowBrasil = new Date(nowUTC.getTime() - (3 * 60 * 60 * 1000)); // UTC-3
      const todayStart = new Date(nowBrasil);
      todayStart.setHours(0, 0, 0, 0);
      const startDate = medication.startDate ? new Date(medication.startDate) : new Date();

      // Verificar se a data de início é hoje ou antes de hoje
      const startDateOnly = new Date(startDate);
      startDateOnly.setHours(0, 0, 0, 0);

      if (startDateOnly <= todayStart && medication.isActive) {
        // Buscar os horários criados para este medicamento
        const createdSchedules = await storage.getSchedulesByMedication(medication.id);

        for (const schedule of createdSchedules) {
          // Criar log para hoje - usar horário brasileiro
          const [hours, minutes] = schedule.scheduledTime.split(':');
          const scheduledDateTime = new Date(nowBrasil.getFullYear(), nowBrasil.getMonth(), nowBrasil.getDate(), parseInt(hours), parseInt(minutes), 0, 0);

          // Verificar se já passou do horário usando horário brasileiro
          const timeDiffMs = nowBrasil.getTime() - scheduledDateTime.getTime();
          const timeDiffMinutes = Math.floor(timeDiffMs / (1000 * 60));

          let status = "pending";
          let delayMinutes = 0;

          // Se passou mais de 15 minutos do horário, marcar como atrasado
          if (timeDiffMinutes > 15) {
            status = "overdue";
            delayMinutes = timeDiffMinutes;
          }

          const logData = {
            medicationId: medication.id,
            scheduleId: schedule.id,
            patientId: req.user.id,
            scheduledDateTime,
            actualDateTime: null,
            status,
            delayMinutes,
            confirmedBy: null,
          };

          await storage.createMedicationLogSafe(logData);
        }
      }

      // Criar notificação de novo medicamento cadastrado
      const schedulesText = schedules && schedules.length > 0
        ? `com ${schedules.length} horário${schedules.length > 1 ? 's' : ''} (${schedules.map((s: any) => s.time || s.scheduledTime).join(', ')})`
        : 'sem horários definidos';

      const notification = await createEnterpriseNotification({
        userId: req.user.id,
        type: 'medication_created',
        title: 'Novo Medicamento Cadastrado',
        message: `${medication.name} (${medication.dosage}) foi adicionado ${schedulesText}`,
        patientId: req.user.id,
        relatedId: medication.id
      }, req, {
        afterState: medication,
        sessionId: req.session?.id || req.sessionID
      });

      // Broadcast notificação em tempo real
      broadcastUpdate(req.user.id, 'notification_created', { notification });

      // Broadcast update to connected clients
      broadcastUpdate(req.user.id, 'medication_created', { medication });

      res.json(medication);
    } catch (error) {

      res.status(400).json({ message: "Erro ao criar medicamento" });
    }
  });

  // Buscar medicamentos já tomados para um medicamento específico
  router.get("/medications/:id/taken-today", authenticateToken, restorePatientContext, async (req: any, res) => {
    try {
      const medicationId = parseInt(req.params.id);

      if (isNaN(medicationId)) {
        return res.status(400).json({ message: "ID do medicamento inválido" });
      }

      // Usar horário brasileiro (UTC-3) para definir o "dia"
      const nowUTC = new Date();
      const nowBrasil = new Date(nowUTC.getTime() - (3 * 60 * 60 * 1000));
      const startOfDay = new Date(nowBrasil.getFullYear(), nowBrasil.getMonth(), nowBrasil.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(nowBrasil.getFullYear(), nowBrasil.getMonth(), nowBrasil.getDate(), 23, 59, 59, 999);

      const patientId = getEffectivePatientId(req);
      const takenLogs = await storage.getMedicationLogsByDateRange(patientId, startOfDay, endOfDay);

      if (!takenLogs || !Array.isArray(takenLogs)) {
        return res.json([]);
      }

      const filteredLogs = takenLogs.filter(log =>
        log.medicationId === medicationId &&
        log.status === 'taken'
      );

      // Ordenar por horário programado (00:00 a 23:59) e adicionar informações de horário
      const sortedLogs = filteredLogs.sort((a, b) => {
        const timeA = new Date(a.scheduledDateTime).getHours() * 60 + new Date(a.scheduledDateTime).getMinutes();
        const timeB = new Date(b.scheduledDateTime).getHours() * 60 + new Date(b.scheduledDateTime).getMinutes();
        return timeA - timeB;
      });

      const logsWithTime = sortedLogs.map(log => ({
        ...log,
        scheduledTime: new Date(log.scheduledDateTime).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'America/Sao_Paulo'
        })
      }));

      res.json(logsWithTime);
    } catch (error) {
      console.error('Erro ao buscar medicamentos tomados:', error);
      res.status(500).json({ message: "Erro ao buscar medicamentos tomados" });
    }
  });

  router.put("/medications/:id", authenticateToken, async (req: any, res) => {
    try {
      const medicationId = parseInt(req.params.id);

      if (isNaN(medicationId)) {
        return res.status(400).json({ message: "ID do medicamento inválido" });
      }

      const { schedules, keepTakenStatus, selectedTakenMedications, ...medicationInfo } = req.body;

      // Usar horário brasileiro (UTC-3) para definir o "dia"
      const nowUTC = new Date();
      const nowBrasil = new Date(nowUTC.getTime() - (3 * 60 * 60 * 1000));
      const startOfDay = new Date(nowBrasil.getFullYear(), nowBrasil.getMonth(), nowBrasil.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(nowBrasil.getFullYear(), nowBrasil.getMonth(), nowBrasil.getDate(), 23, 59, 59, 999);

      // Converter strings de data para objetos Date
      const processedData = {
        ...medicationInfo,
        startDate: medicationInfo.startDate ? new Date(medicationInfo.startDate) : undefined,
        endDate: medicationInfo.endDate ? new Date(medicationInfo.endDate) : undefined,
      };

      const medication = await storage.updateMedication(medicationId, processedData);

      if (!medication) {
        return res.status(404).json({ message: "Medicamento não encontrado" });
      }

      const existingLogs = await storage.getMedicationLogsByDateRange(req.user.id, startOfDay, endOfDay);
      const medicationLogs = existingLogs.filter(log => log.medicationId === medicationId);

      // Separar logs tomados que devem ser mantidos dos que podem ser removidos
      const logsToKeep = medicationLogs.filter(log =>
        log.status === 'taken' &&
        keepTakenStatus &&
        selectedTakenMedications &&
        selectedTakenMedications.includes(log.id)
      );

      // Remover apenas logs que não são tomados OU são tomados mas não foram selecionados para manter
      const logsToRemove = medicationLogs.filter(log =>
        !logsToKeep.some(keepLog => keepLog.id === log.id)
      );

      for (const log of logsToRemove) {
        try {
          // Primeiro, excluir históricos associados a este log
          await storage.deleteMedicationHistoryByLogId(log.id);
          // Depois, excluir o log
          await storage.deleteMedicationLog(log.id);
        } catch (error) {
          // Se falhar por constraint de chave estrangeira, apenas continue
          // Log com histórico associado não pode ser deletado
        }
      }

      // Desativar horários existentes
      await storage.deleteSchedulesByMedication(medicationId);

      // Criar novos horários válidos
      const newSchedules = [];
      for (const schedule of schedules) {
        const timeValue = schedule.time || schedule.scheduledTime;
        if (schedule && timeValue && typeof timeValue === 'string' && timeValue.trim() !== '') {
          const newSchedule = await storage.createMedicationSchedule({
            medicationId: medication.id,
            scheduledTime: timeValue.trim(),
          });
          newSchedules.push(newSchedule);
        }
      }

      // Criar logs apenas para horários que não têm logs mantidos
      for (const schedule of newSchedules) {
        const [hours, minutes] = schedule.scheduledTime.split(':').map(Number);
        const scheduledDateTime = new Date(nowBrasil.getFullYear(), nowBrasil.getMonth(), nowBrasil.getDate(), hours, minutes);

        // Verificar se já existe um log mantido para este horário
        const existingKeptLog = logsToKeep.find(log =>
          log.scheduledDateTime.getHours() === hours &&
          log.scheduledDateTime.getMinutes() === minutes
        );

        // Se não existe log mantido para este horário, criar um novo log pending
        if (!existingKeptLog) {
          const logData = {
            medicationId: medication.id,
            scheduleId: schedule.id,
            patientId: req.user.id,
            scheduledDateTime,
            actualDateTime: null,
            status: 'pending',
            delayMinutes: null,
            confirmedBy: null
          };

          await storage.createMedicationLogSafe(logData);
        } else {
          // Se existe log mantido, apenas atualizar o scheduleId para o novo schedule
          await storage.updateMedicationLog(existingKeptLog.id, {
            scheduleId: schedule.id
          });
        }
      }


      // Obter medicamento original para comparar mudanças
      const existingMedication = await storage.getMedicationById(medicationId);

      // Determinar o que foi editado
      const changes = [];
      if (existingMedication && processedData.name && existingMedication.name !== processedData.name) {
        changes.push(`nome alterado de "${existingMedication.name}" para "${processedData.name}"`);
      }
      if (existingMedication && processedData.dosage && existingMedication.dosage !== processedData.dosage) {
        changes.push(`dosagem alterada de "${existingMedication.dosage}" para "${processedData.dosage}"`);
      }
      if (existingMedication && processedData.frequency && existingMedication.frequency !== processedData.frequency) {
        changes.push(`frequência alterada`);
      }
      if (existingMedication && processedData.startDate && existingMedication.startDate !== processedData.startDate) {
        changes.push(`data de início alterada`);
      }
      if (existingMedication && typeof processedData.isActive === 'boolean' && existingMedication.isActive !== processedData.isActive) {
        changes.push(processedData.isActive ? 'medicamento reativado' : 'medicamento inativado');
      }
      if (schedules && schedules.length > 0) {
        changes.push(`horários atualizados (${schedules.map((s: any) => s.time || s.scheduledTime).filter((t: any) => t).join(', ')})`);
      }

      // Criar notificação de edição se houve mudanças
      if (changes.length > 0) {
        const changeMessage = changes.join(', ');
        const notification = await createEnterpriseNotification({
          userId: req.user.id,
          type: 'medication_edited',
          title: 'Medicamento Editado',
          message: `${medication.name}: ${changeMessage}`,
          patientId: req.user.id,
          relatedId: medication.id
        }, req, {
          beforeState: existingMedication,
          afterState: medication,
          sessionId: req.session?.id || req.sessionID
        });

        // Broadcast notificação em tempo real
        broadcastUpdate(req.user.id, 'notification_created', { notification });
      }

      // Broadcast update to connected clients
      broadcastUpdate(req.user.id, 'medication_updated', { medication });

      res.json(medication);
    } catch (error) {
      console.error('Erro ao atualizar medicamento:', error);

      // Verificar se é erro de validação do Zod
      if (error instanceof Error && error.name === 'ZodError') {
        return res.status(400).json({
          message: "Dados inválidos",
          details: error.message
        });
      }

      // Erro genérico
      res.status(500).json({
        message: "Erro interno do servidor ao atualizar medicamento",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  // Verificar se medicamento já foi tomado
  router.get("/medications/:id/has-taken-logs", authenticateToken, async (req: any, res) => {
    try {
      const medicationId = parseInt(req.params.id);
      const hasTakenLogs = await storage.checkMedicationHasTakenLogs(medicationId);
      res.json({ hasTakenLogs });
    } catch (error) {

      res.status(500).json({ message: "Erro ao verificar logs tomados" });
    }
  });

  // Inativar medicamento
  router.post("/medications/:id/inactivate", authenticateToken, async (req: any, res) => {
    try {
      const medicationId = parseInt(req.params.id);
      const success = await storage.inactivateMedication(medicationId);

      if (!success) {
        return res.status(404).json({ message: "Medicamento não encontrado" });
      }

      res.json({ message: "Medicamento inativado com sucesso" });
    } catch (error) {

      res.status(500).json({ message: "Erro ao inativar medicamento" });
    }
  });

  // Reativar medicamento
  router.post("/medications/:id/reactivate", authenticateToken, async (req: any, res) => {
    try {
      const medicationId = parseInt(req.params.id);
      const success = await storage.reactivateMedication(medicationId);

      if (!success) {
        return res.status(404).json({ message: "Medicamento não encontrado" });
      }

      res.json({ message: "Medicamento reativado com sucesso" });
    } catch (error) {

      res.status(500).json({ message: "Erro ao reativar medicamento" });
    }
  });

  router.delete("/medications/:id", authenticateToken, async (req: any, res) => {
    try {
      const medicationId = parseInt(req.params.id);

      // Verificar se medicamento já foi tomado
      const hasTakenLogs = await storage.checkMedicationHasTakenLogs(medicationId);

      if (hasTakenLogs) {
        return res.status(400).json({
          message: "Este medicamento já foi tomado e não pode ser excluído. Use a opção 'Inativar' para parar de tomar.",
          canDelete: false,
          shouldInactivate: true
        });
      }

      // Se não há logs tomados, excluir completamente o medicamento
      const success = await storage.deleteMedication(medicationId);

      if (!success) {
        return res.status(404).json({ message: "Medicamento não encontrado" });
      }

      // Broadcast update to connected clients
      broadcastUpdate(req.user.id, 'medication_deleted', { medicationId });

      res.json({ message: "Medicamento excluído com sucesso" });
    } catch (error) {

      res.status(500).json({ message: "Erro ao excluir medicamento" });
    }
  });

  // Medication logs routes
  router.get("/medication-logs", authenticateToken, restorePatientContext, async (req: any, res) => {
    try {
      const { startDate, endDate } = req.query;

      let processedStartDate: Date | null;
      let processedEndDate: Date | undefined;

      if (startDate) {
        // Corrigir timezone - usar horário brasileiro (UTC-3)
        const startDateStr = startDate + 'T03:00:00.000Z'; // Ajuste para UTC-3
        processedStartDate = new Date(startDateStr);
      } else {
        // Se não especificar data, não aplicar filtro (buscar TODOS os logs)
        processedStartDate = null;
      }

      if (endDate) {
        // Para data final, pegar até o final do dia selecionado no timezone brasileiro
        const endDateStr = endDate + 'T02:59:59.999Z'; // Final do dia UTC-3
        processedEndDate = new Date(endDateStr);
        // Adicionar 1 dia para pegar até o final do dia selecionado
        processedEndDate.setDate(processedEndDate.getDate() + 1);
      }

      const patientId = getEffectivePatientId(req);
      const logs = await storage.getMedicationLogs(
        patientId,
        processedStartDate,
        processedEndDate
      );

      res.json(logs);
    } catch (error) {

      res.status(500).json({ message: "Erro ao buscar logs de medicamento" });
    }
  });

  router.get("/medication-logs/today", authenticateToken, restorePatientContext, async (req: any, res) => {
    try {
      // Usar horário brasileiro corretamente
      const nowUTC = new Date();
      const nowBrasil = new Date(nowUTC.getTime() - (3 * 60 * 60 * 1000)); // UTC-3

      // Buscar todos os medicamentos do usuário
      const patientId = getEffectivePatientId(req);
      const allMedications = await storage.getMedicationsByPatient(patientId);
      const todayStart = new Date(nowBrasil.getFullYear(), nowBrasil.getMonth(), nowBrasil.getDate(), 0, 0, 0, 0);

      const activeMedications = allMedications.filter(med => {
        if (!med.isActive) return false;

        const startDate = med.startDate ? new Date(med.startDate) : new Date('1900-01-01');
        const endDate = med.endDate ? new Date(med.endDate) : new Date('2099-12-31');

        const startDateOnly = new Date(startDate);
        startDateOnly.setHours(0, 0, 0, 0);
        const endDateOnly = new Date(endDate);
        endDateOnly.setHours(23, 59, 59, 999);

        // Verificar se o medicamento deve ser tomado hoje
        return startDateOnly <= todayStart && todayStart <= endDateOnly;
      });

      // Buscar logs existentes de hoje
      const existingLogs = await storage.getTodayMedicationLogs(patientId);

      // Para cada medicamento ativo, verificar se precisa criar logs
      for (const medication of activeMedications) {
        const schedules = await storage.getSchedulesByMedication(medication.id);

        for (const schedule of schedules) {
          // Verificar se já existe log para este schedule hoje
          const hasLogToday = existingLogs.some(log => {
            return log.scheduleId === schedule.id;
          });

          if (!hasLogToday) {
            // Usar horário brasileiro para criar o log
            const [hours, minutes] = schedule.scheduledTime.split(':');
            const scheduledDateTime = new Date(nowBrasil.getFullYear(), nowBrasil.getMonth(), nowBrasil.getDate(), parseInt(hours), parseInt(minutes), 0, 0);

            // Calcular status baseado no horário atual brasileiro
            const timeDiffMs = nowBrasil.getTime() - scheduledDateTime.getTime();
            const timeDiffMinutes = Math.floor(timeDiffMs / (1000 * 60));

            let status = "pending";
            let delayMinutes = 0;

            // Se passou mais de 15 minutos do horário, marcar como atrasado
            if (timeDiffMinutes > 15) {
              status = "overdue";
              delayMinutes = timeDiffMinutes;
            }

            const logData = {
              medicationId: medication.id,
              scheduleId: schedule.id,
              patientId: patientId,
              scheduledDateTime,
              actualDateTime: null,
              status,
              delayMinutes,
              confirmedBy: null,
            };

            // Usar método seguro que previne duplicações
            await storage.createMedicationLogSafe(logData);
          }
        }
      }

      // Buscar todos os logs de hoje após verificação/criação
      const logs = await storage.getTodayMedicationLogs(patientId);

      res.json(logs);
    } catch (error) {

      res.status(500).json({ message: "Erro ao buscar logs de hoje" });
    }
  });

  router.post("/medication-logs", authenticateToken, async (req: any, res) => {
    try {
      const logData = insertMedicationLogSchema.parse({
        ...req.body,
        patientId: req.user.id,
        confirmedBy: req.user.id,
      });

      const log = await storage.createMedicationLog(logData);
      res.json(log);
    } catch (error) {

      res.status(400).json({ message: "Erro ao criar log de medicamento" });
    }
  });

  router.put("/medication-logs/:id", authenticateToken, async (req: any, res) => {
    try {
      const logId = parseInt(req.params.id);
      const logData = req.body;

      // Converter actualDateTime para Date se fornecido, ajustando para timezone brasileiro
      if (logData.actualDateTime) {
        const actualTimeUTC = new Date(logData.actualDateTime);
        // Converter UTC para horário brasileiro (UTC-3)
        const actualTimeBrasil = new Date(actualTimeUTC.getTime() - (3 * 60 * 60 * 1000));
        logData.actualDateTime = actualTimeBrasil;
      }

      // Se está marcando como tomado, calcular o atraso/adiantamento
      if (logData.status === 'taken' && logData.actualDateTime) {
        // Garantir que confirmedBy seja preenchido
        if (!logData.confirmedBy) {
          logData.confirmedBy = req.user.id;
        }

        // Buscar o log atual para pegar o horário programado
        const currentLog = await storage.getMedicationLogById(logId);
        if (currentLog && currentLog.scheduledDateTime) {
          const scheduledTime = new Date(currentLog.scheduledDateTime);
          const actualTime = new Date(logData.actualDateTime);

          // Calcular diferença em minutos (já vem ajustado do frontend)
          const timeDiffMs = actualTime.getTime() - scheduledTime.getTime();
          const timeDiffMinutes = Math.floor(timeDiffMs / (1000 * 60));

          // Guardar a diferença real (pode ser negativo para adiantamento)
          logData.delayMinutes = timeDiffMinutes;
        }
      }

      const log = await storage.updateMedicationLog(logId, logData);

      if (!log) {
        return res.status(404).json({ message: "Log não encontrado" });
      }

      // Criar notificação de medicamento tomado apenas se o status for 'taken'
      if (log.status === 'taken' && log.actualDateTime) {
        // Buscar informações do medicamento
        const medication = await storage.getMedicationById(log.medicationId);

        if (medication) {
          // Calcular se foi tomado no horário, atrasado ou antecipado
          const scheduledTime = new Date(log.scheduledDateTime);
          const actualTime = new Date(log.actualDateTime);
          const timeDiffMs = actualTime.getTime() - scheduledTime.getTime();
          const timeDiffMinutes = Math.floor(timeDiffMs / (1000 * 60));

          let statusMessage = '';
          let notificationType = 'medication_taken';

          if (Math.abs(timeDiffMinutes) <= 5) {
            statusMessage = 'no horário correto';
          } else if (timeDiffMinutes > 5) {
            const hours = Math.floor(timeDiffMinutes / 60);
            const minutes = timeDiffMinutes % 60;
            const delayText = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
            statusMessage = `com ${delayText} de atraso`;
          } else if (timeDiffMinutes < -5) {
            const hours = Math.floor(Math.abs(timeDiffMinutes) / 60);
            const minutes = Math.abs(timeDiffMinutes) % 60;
            const earlyText = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
            statusMessage = `${earlyText} adiantado`;
          }

          // Criar notificação
          const notification = await createEnterpriseNotification({
            userId: log.patientId,
            type: notificationType,
            title: 'Medicamento Tomado',
            message: `${medication.name} foi tomado ${statusMessage}`,
            patientId: log.patientId,
            relatedId: log.id
          });

          // Broadcast notificação em tempo real
          broadcastUpdate(log.patientId, 'notification_created', { notification });
        }
      }

      // Broadcast update to connected clients
      broadcastUpdate(req.user.id, 'medication_log_updated', { log });

      res.json(log);
    } catch (error) {

      res.status(400).json({ message: "Erro ao atualizar log" });
    }
  });

  // Medication History routes
  router.get("/medication-history", authenticateToken, restorePatientContext, async (req: any, res) => {
    try {
      const { medicationId } = req.query;
      const patientId = getEffectivePatientId(req);

      if (medicationId) {
        // Buscar histórico de um medicamento específico
        const history = await storage.getMedicationHistoryByMedication(parseInt(medicationId), patientId);
        res.json(history);
      } else {
        // Buscar todo o histórico do paciente selecionado
        const history = await storage.getMedicationHistoryByPatient(patientId);
        res.json(history);
      }
    } catch (error) {
      console.error('❌ Erro ao buscar histórico:', error);
      res.status(500).json({ message: "Erro ao buscar histórico de medicamentos" });
    }
  });

  router.post("/medication-history", authenticateToken, restorePatientContext, async (req: any, res) => {
    try {
      const patientId = getEffectivePatientId(req);
      const processedData = {
        ...req.body,
        patientId: patientId,
        createdBy: req.user.id,
      };

      // Converter scheduledDateTime para objeto Date se for string
      if (processedData.scheduledDateTime && typeof processedData.scheduledDateTime === 'string') {
        processedData.scheduledDateTime = new Date(processedData.scheduledDateTime);
      }

      // Ajustar timezone para actualDateTime se fornecido
      if (processedData.actualDateTime) {
        if (typeof processedData.actualDateTime === 'string') {
          const actualTimeUTC = new Date(processedData.actualDateTime);
          // Converter UTC para horário brasileiro (UTC-3)
          const actualTimeBrasil = new Date(actualTimeUTC.getTime() - (3 * 60 * 60 * 1000));
          processedData.actualDateTime = actualTimeBrasil;
        }
      }

      // Validar dados antes de processar
      const historyData = insertMedicationHistorySchema.parse(processedData);

      // Se tem medicationLogId, atualizar o log como "taken" também
      let updatedLog = null;
      if (historyData.medicationLogId) {
        // Primeiro, criar o histórico
        const history = await storage.createMedicationHistory(historyData);

        // Depois, marcar o log como tomado
        updatedLog = await storage.updateMedicationLog(historyData.medicationLogId, {
          status: 'taken',
          actualDateTime: historyData.actualDateTime || null,
          confirmedBy: req.user.id
        });

        // Criar notificação de medicamento tomado
        if (updatedLog) {
          // Buscar informações do medicamento para a notificação
          const medication = await storage.getMedicationById(updatedLog.medicationId);

          if (medication) {
            // Calcular se foi tomado no horário, atrasado ou antecipado
            const scheduledTime = new Date(updatedLog.scheduledDateTime);
            const actualTime = updatedLog.actualDateTime ? new Date(updatedLog.actualDateTime) : new Date();
            const timeDiffMs = actualTime.getTime() - scheduledTime.getTime();
            const timeDiffMinutes = Math.floor(timeDiffMs / (1000 * 60));

            let statusMessage = '';
            if (Math.abs(timeDiffMinutes) <= 5) {
              statusMessage = 'no horário correto';
            } else if (timeDiffMinutes > 5) {
              const hours = Math.floor(timeDiffMinutes / 60);
              const minutes = timeDiffMinutes % 60;
              const delayText = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
              statusMessage = `com ${delayText} de atraso`;
            } else if (timeDiffMinutes < -5) {
              const hours = Math.floor(Math.abs(timeDiffMinutes) / 60);
              const minutes = Math.abs(timeDiffMinutes) % 60;
              const earlyText = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
              statusMessage = `${earlyText} adiantado`;
            }

            // Criar notificação
            const notification = await createEnterpriseNotification({
              userId: patientId,
              type: 'medication_taken',
              title: 'Medicamento Tomado',
              message: `${medication.name} foi tomado ${statusMessage}`,
              patientId: patientId,
              relatedId: updatedLog.id
            });

            // Broadcast notificação em tempo real
            broadcastUpdate(patientId, 'notification_created', { notification });
          }
        }

        // Broadcast updates to connected clients
        broadcastUpdate(patientId, 'medication_history_created', { history });
        broadcastUpdate(patientId, 'medication_log_updated', { log: updatedLog });

        res.json({ history, log: updatedLog });
      } else {
        // Apenas criar histórico sem atualizar log
        const history = await storage.createMedicationHistory(historyData);
        broadcastUpdate(patientId, 'medication_history_created', { history });
        res.json({ history });
      }

    } catch (error) {
      console.error('❌ Erro ao criar histórico de medicamento:', error);
      res.status(400).json({
        message: "Erro ao criar histórico de medicamento",
        details: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  router.put("/medication-history/:id", authenticateToken, restorePatientContext, async (req: any, res) => {
    try {
      const historyId = parseInt(req.params.id);
      const historyData = req.body;
      const patientId = getEffectivePatientId(req);

      // Ajustar timezone para actualDateTime se fornecido
      if (historyData.actualDateTime) {
        const actualTimeUTC = new Date(historyData.actualDateTime);
        // Converter UTC para horário brasileiro (UTC-3)
        const actualTimeBrasil = new Date(actualTimeUTC.getTime() - (3 * 60 * 60 * 1000));
        historyData.actualDateTime = actualTimeBrasil;
      }

      const history = await storage.updateMedicationHistory(historyId, historyData);

      if (!history) {
        return res.status(404).json({ message: "Histórico não encontrado" });
      }

      // Broadcast update to connected clients - usar patientId correto
      broadcastUpdate(patientId, 'medication_history_updated', { history });

      res.json(history);
    } catch (error) {

      res.status(400).json({ message: "Erro ao atualizar histórico" });
    }
  });

  router.delete("/medication-history/:id", authenticateToken, restorePatientContext, async (req: any, res) => {
    try {
      const historyId = parseInt(req.params.id);
      const patientId = getEffectivePatientId(req);
      const success = await storage.deleteMedicationHistory(historyId);

      if (!success) {
        return res.status(404).json({ message: "Histórico não encontrado" });
      }

      // Broadcast update to connected clients - usar patientId correto
      broadcastUpdate(patientId, 'medication_history_deleted', { historyId });

      res.json({ message: "Histórico removido com sucesso" });
    } catch (error) {

      res.status(500).json({ message: "Erro ao remover histórico" });
    }
  });

  // Health Insurance Routes (Convênios) - Only for doctors
  router.get("/health-insurances", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.profileType !== 'doctor') {
        return res.status(403).json({ message: "Acesso negado - apenas médicos podem acessar convênios" });
      }

      const healthInsurances = await storage.getHealthInsurancesByDoctor(req.user.id);
      res.json(healthInsurances);
    } catch (error) {
      console.error('Erro ao buscar convênios:', error);
      res.status(500).json({ message: "Erro ao buscar convênios" });
    }
  });

  router.post("/health-insurances", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.profileType !== 'doctor') {
        return res.status(403).json({ message: "Acesso negado - apenas médicos podem criar convênios" });
      }

      const healthInsuranceData = {
        ...req.body,
        doctorId: req.user.id
      };

      const healthInsurance = await storage.createHealthInsurance(healthInsuranceData);
      res.json(healthInsurance);
    } catch (error) {
      console.error('Erro ao criar convênio:', error);
      res.status(500).json({ message: "Erro ao criar convênio" });
    }
  });

  router.put("/health-insurances/:id", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.profileType !== 'doctor') {
        return res.status(403).json({ message: "Acesso negado - apenas médicos podem editar convênios" });
      }

      const healthInsuranceId = parseInt(req.params.id);

      // Verificar se o convênio pertence ao médico
      const existingInsurance = await storage.getHealthInsuranceById(healthInsuranceId);
      if (!existingInsurance || existingInsurance.doctorId !== req.user.id) {
        return res.status(404).json({ message: "Convênio não encontrado ou não pertence a você" });
      }

      const updatedInsurance = await storage.updateHealthInsurance(healthInsuranceId, req.body);
      res.json(updatedInsurance);
    } catch (error) {
      console.error('Erro ao atualizar convênio:', error);
      res.status(500).json({ message: "Erro ao atualizar convênio" });
    }
  });

  router.delete("/health-insurances/:id", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.profileType !== 'doctor') {
        return res.status(403).json({ message: "Acesso negado - apenas médicos podem excluir convênios" });
      }

      const healthInsuranceId = parseInt(req.params.id);

      // Verificar se o convênio pertence ao médico
      const existingInsurance = await storage.getHealthInsuranceById(healthInsuranceId);
      if (!existingInsurance || existingInsurance.doctorId !== req.user.id) {
        return res.status(404).json({ message: "Convênio não encontrado ou não pertence a você" });
      }

      await storage.deleteHealthInsurance(healthInsuranceId);
      res.json({ message: "Convênio excluído com sucesso" });
    } catch (error) {
      console.error('Erro ao excluir convênio:', error);
      res.status(500).json({ message: "Erro ao excluir convênio" });
    }
  });

  // ========================================
  // PAYMENT METHODS ROUTES
  // ========================================

  router.get("/payment-methods", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.profileType !== 'doctor') {
        return res.status(403).json({ message: "Acesso negado - apenas médicos podem visualizar formas de pagamento" });
      }

      const paymentMethods = await storage.getPaymentMethodsByDoctorId(req.user.id);
      res.json(paymentMethods);
    } catch (error) {
      console.error('Erro ao buscar formas de pagamento:', error);
      res.status(500).json({ message: "Erro ao buscar formas de pagamento" });
    }
  });

  router.post("/payment-methods", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.profileType !== 'doctor') {
        return res.status(403).json({ message: "Acesso negado - apenas médicos podem criar formas de pagamento" });
      }

      const paymentMethodData = {
        ...req.body,
        doctorId: req.user.id,
        installmentRates: req.body.installmentRates ? JSON.stringify(req.body.installmentRates) : null
      };

      const newPaymentMethod = await storage.createPaymentMethod(paymentMethodData);
      res.status(201).json(newPaymentMethod);
    } catch (error) {
      console.error('Erro ao criar forma de pagamento:', error);
      res.status(500).json({ message: "Erro ao criar forma de pagamento" });
    }
  });

  router.put("/payment-methods/:id", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.profileType !== 'doctor') {
        return res.status(403).json({ message: "Acesso negado - apenas médicos podem editar formas de pagamento" });
      }

      const paymentMethodId = parseInt(req.params.id);

      // Verificar se a forma de pagamento pertence ao médico
      const existingPaymentMethod = await storage.getPaymentMethodById(paymentMethodId);
      if (!existingPaymentMethod || existingPaymentMethod.doctorId !== req.user.id) {
        return res.status(404).json({ message: "Forma de pagamento não encontrada ou não pertence a você" });
      }

      const updateData = {
        ...req.body,
        installmentRates: req.body.installmentRates ? JSON.stringify(req.body.installmentRates) : null
      };

      const updatedPaymentMethod = await storage.updatePaymentMethod(paymentMethodId, updateData);
      res.json(updatedPaymentMethod);
    } catch (error) {
      console.error('Erro ao atualizar forma de pagamento:', error);
      res.status(500).json({ message: "Erro ao atualizar forma de pagamento" });
    }
  });

  router.delete("/payment-methods/:id", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.profileType !== 'doctor') {
        return res.status(403).json({ message: "Acesso negado - apenas médicos podem excluir formas de pagamento" });
      }

      const paymentMethodId = parseInt(req.params.id);

      // Verificar se a forma de pagamento pertence ao médico
      const existingPaymentMethod = await storage.getPaymentMethodById(paymentMethodId);
      if (!existingPaymentMethod || existingPaymentMethod.doctorId !== req.user.id) {
        return res.status(404).json({ message: "Forma de pagamento não encontrada ou não pertence a você" });
      }

      await storage.deletePaymentMethod(paymentMethodId);
      res.json({ message: "Forma de pagamento excluída com sucesso" });
    } catch (error) {
      console.error('Erro ao excluir forma de pagamento:', error);
      res.status(500).json({ message: "Erro ao excluir forma de pagamento" });
    }
  });

  // Appointments routes
  router.get("/appointments", authenticateToken, restorePatientContext, async (req: any, res) => {
    try {
      const { user } = req;

      // Se for médico, mostrar todos os appointments (não filtrar por paciente)
      if (user?.profileType === 'doctor') {
        const appointments = await storage.getAllAppointments();
        res.json(appointments || []);
      } else {
        const patientId = getEffectivePatientId(req);
        const appointments = await storage.getAppointmentsByPatient(patientId);
        res.json(appointments);
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
      res.status(500).json({ message: "Erro ao buscar consultas" });
    }
  });

  router.post("/appointments", authenticateToken, async (req: any, res) => {
    try {
      // Converter strings de data para objetos Date
      const processedData = {
        ...req.body,
        patientId: req.user.id,
        appointmentDate: req.body.appointmentDate ? new Date(req.body.appointmentDate) : undefined,
      };

      const appointmentData = insertAppointmentSchema.parse(processedData);
      const appointment = await storage.createAppointment(appointmentData);

      // Criar notificação de nova consulta cadastrada
      const appointmentDateTime = format(new Date(appointment.appointmentDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
      const notification = await createEnterpriseNotification({
        userId: req.user.id,
        type: 'appointment_created',
        title: 'Nova Consulta Agendada',
        message: `Consulta com ${appointment.doctorName} agendada para ${appointmentDateTime} - ${appointment.title}`,
        patientId: req.user.id,
        relatedId: appointment.id
      }, req, {
        afterState: appointment,
        sessionId: req.session?.id || req.sessionID
      });

      // Broadcast notificação em tempo real
      broadcastUpdate(req.user.id, 'notification_created', { notification });

      // Broadcast update to connected clients
      broadcastUpdate(req.user.id, 'appointment_created', { appointment });

      res.json(appointment);
    } catch (error) {

      res.status(400).json({ message: "Erro ao criar consulta" });
    }
  });

  router.put("/appointments/:id", authenticateToken, async (req: any, res) => {
    try {
      const appointmentId = parseInt(req.params.id);
      // Converter strings de data para objetos Date
      const processedData = {
        ...req.body,
        appointmentDate: req.body.appointmentDate ? new Date(req.body.appointmentDate) : undefined,
      };

      // Obter consulta original para comparar mudanças
      const existingAppointment = await storage.getAppointmentById(appointmentId);
      const appointment = await storage.updateAppointment(appointmentId, processedData);

      if (!appointment) {
        return res.status(404).json({ message: "Consulta não encontrada" });
      }

      // Determinar o que foi editado
      const changes = [];
      if (existingAppointment && processedData.title && existingAppointment.title !== processedData.title) {
        changes.push(`título alterado de "${existingAppointment.title}" para "${processedData.title}"`);
      }
      if (existingAppointment && processedData.doctorName && existingAppointment.doctorName !== processedData.doctorName) {
        changes.push(`médico alterado de "${existingAppointment.doctorName}" para "${processedData.doctorName}"`);
      }
      if (existingAppointment && processedData.appointmentDate) {
        const oldDate = format(new Date(existingAppointment.appointmentDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
        const newDate = format(new Date(processedData.appointmentDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
        if (oldDate !== newDate) {
          changes.push(`data/horário alterado de ${oldDate} para ${newDate}`);
        }
      }
      if (existingAppointment && processedData.location && existingAppointment.location !== processedData.location) {
        changes.push(`local alterado`);
      }
      if (existingAppointment && processedData.status && existingAppointment.status !== processedData.status) {
        changes.push(`status alterado para "${processedData.status}"`);
      }

      // Criar notificação de edição se houve mudanças
      if (changes.length > 0) {
        const changeMessage = changes.join(', ');
        const notification = await createEnterpriseNotification({
          userId: req.user.id,
          type: 'appointment_edited',
          title: 'Consulta Editada',
          message: `Consulta "${appointment.title}": ${changeMessage}`,
          patientId: req.user.id,
          relatedId: appointment.id
        }, req, {
          beforeState: existingAppointment,
          afterState: appointment,
          sessionId: req.session?.id || req.sessionID
        });

        // Broadcast notificação em tempo real
        broadcastUpdate(req.user.id, 'notification_created', { notification });
      }

      // Broadcast update to connected clients
      broadcastUpdate(req.user.id, 'appointment_updated', { appointment });

      res.json(appointment);
    } catch (error) {

      res.status(400).json({ message: "Erro ao atualizar consulta" });
    }
  });

  router.delete("/appointments/:id", authenticateToken, async (req: any, res) => {
    try {
      const appointmentId = parseInt(req.params.id);
      const success = await storage.deleteAppointment(appointmentId);

      if (!success) {
        return res.status(404).json({ message: "Consulta não encontrada" });
      }

      // Broadcast update to connected clients
      broadcastUpdate(req.user.id, 'appointment_deleted', { appointmentId });

      res.json({ message: "Consulta removida com sucesso" });
    } catch (error) {

      res.status(500).json({ message: "Erro ao remover consulta" });
    }
  });

  // Tests routes
  router.get("/tests", authenticateToken, restorePatientContext, async (req: any, res) => {
    try {
      const { user } = req;

      // Se for médico, mostrar todos os exames (não filtrar por paciente)
      if (user?.profileType === 'doctor') {
        const tests = await storage.getAllTests();
        res.json(tests || []);
      } else {
        const patientId = getEffectivePatientId(req);
        const tests = await storage.getTestsListByPatient(patientId);
        res.json(tests);
      }
    } catch (error) {
      console.error("Error fetching tests:", error);
      res.status(500).json({ message: "Erro ao buscar exames" });
    }
  });

  router.post("/tests", authenticateToken, async (req: any, res) => {
    try {
      // Converter strings de data para objetos Date
      const processedData = {
        ...req.body,
        patientId: req.user.id,
        testDate: req.body.testDate ? new Date(req.body.testDate) : undefined,
      };

      const testData = insertTestSchema.parse(processedData);
      const test = await storage.createTest(testData);

      // Se o exame foi criado a partir de uma requisição, atualizar a requisição
      if (test.examRequestId) {
        await storage.updateExamRequest(test.examRequestId, {
          status: 'scheduled',
          scheduledTestId: test.id
        });

        console.log(`✅ Requisição ${test.examRequestId} atualizada: status=scheduled, scheduledTestId=${test.id}`);
      }

      // Criar notificação de novo exame cadastrado
      const testDateTime = format(new Date(test.testDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
      const notification = await createEnterpriseNotification({
        userId: req.user.id,
        type: 'test_created',
        title: 'Novo Exame Agendado',
        message: `Exame "${test.name}" (${test.type}) agendado para ${testDateTime}`,
        patientId: req.user.id,
        relatedId: test.id
      }, req, {
        afterState: test,
        sessionId: req.session?.id || req.sessionID
      });

      // Broadcast notificação em tempo real
      broadcastUpdate(req.user.id, 'notification_created', { notification });

      // Broadcast update to connected clients
      broadcastUpdate(req.user.id, 'test_created', { test });

      res.json(test);
    } catch (error) {

      res.status(400).json({ message: "Erro ao criar exame" });
    }
  });

  router.put("/tests/:id", authenticateToken, async (req: any, res) => {
    try {
      const testId = parseInt(req.params.id);
      // Filtrar dados antes de processar
      const processedData: any = {};

      // Só incluir campos que estão sendo atualizados
      if (req.body.name !== undefined) processedData.name = req.body.name;
      if (req.body.type !== undefined) processedData.type = req.body.type;
      if (req.body.location !== undefined) processedData.location = req.body.location;
      if (req.body.results !== undefined) processedData.results = req.body.results;
      if (req.body.status !== undefined) processedData.status = req.body.status;
      if (req.body.filePath !== undefined) processedData.filePath = req.body.filePath;
      if (req.body.updatedAt !== undefined) processedData.updatedAt = req.body.updatedAt;

      // Processar testDate apenas se presente e válido
      if (req.body.testDate && req.body.testDate.trim() !== '') {
        processedData.testDate = new Date(req.body.testDate);
      }

      // Obter exame original para comparar mudanças
      const existingTest = await storage.getTestById(testId);
      const test = await storage.updateTest(testId, processedData);

      if (!test) {
        return res.status(404).json({ message: "Exame não encontrado" });
      }

      // Determinar o que foi editado
      const changes = [];
      if (existingTest && processedData.name && existingTest.name !== processedData.name) {
        changes.push(`nome alterado de "${existingTest.name}" para "${processedData.name}"`);
      }
      if (existingTest && processedData.type && existingTest.type !== processedData.type) {
        changes.push(`tipo alterado de "${existingTest.type}" para "${processedData.type}"`);
      }
      if (existingTest && processedData.testDate) {
        const oldDate = format(new Date(existingTest.testDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
        const newDate = format(new Date(processedData.testDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
        if (oldDate !== newDate) {
          changes.push(`data/horário alterado de ${oldDate} para ${newDate}`);
        }
      }
      if (existingTest && processedData.location && existingTest.location !== processedData.location) {
        changes.push(`local alterado`);
      }
      if (existingTest && processedData.status && existingTest.status !== processedData.status) {
        changes.push(`status alterado para "${processedData.status}"`);
      }
      if (existingTest && processedData.results && existingTest.results !== processedData.results) {
        changes.push(`resultados atualizados`);
      }

      // Criar notificação de edição se houve mudanças
      if (changes.length > 0) {
        const changeMessage = changes.join(', ');
        const notification = await createEnterpriseNotification({
          userId: req.user.id,
          type: 'test_edited',
          title: 'Exame Editado',
          message: `Exame "${test.name}": ${changeMessage}`,
          patientId: req.user.id,
          relatedId: test.id
        }, req, {
          beforeState: existingTest,
          afterState: test,
          sessionId: req.session?.id || req.sessionID
        });

        // Broadcast notificação em tempo real
        broadcastUpdate(req.user.id, 'notification_created', { notification });
      }

      // Broadcast update to connected clients
      broadcastUpdate(req.user.id, 'test_updated', { test });

      res.json(test);
    } catch (error) {
      console.error('❌ Erro ao atualizar exame:', error);
      res.status(400).json({ message: "Erro ao atualizar exame" });
    }
  });

  router.delete("/tests/:id", authenticateToken, async (req: any, res) => {
    try {
      const testId = parseInt(req.params.id);
      const success = await storage.deleteTest(testId);

      if (!success) {
        return res.status(404).json({ message: "Exame não encontrado" });
      }

      // Broadcast update to connected clients
      broadcastUpdate(req.user.id, 'test_deleted', { testId });

      res.json({ message: "Exame removido com sucesso" });
    } catch (error) {

      res.status(500).json({ message: "Erro ao remover exame" });
    }
  });

  // Rota para carregar documento de exame
  router.get("/tests/:id/document", authenticateToken, async (req: any, res) => {
    try {
      const testId = parseInt(req.params.id);
      const test = await storage.getTestById(testId);

      if (!test) {
        return res.status(404).json({ message: "Exame não encontrado" });
      }

      if (!test.filePath) {
        return res.status(404).json({ message: "Documento não encontrado" });
      }

      let filePath = test.filePath;
      let fileType = 'file';
      let originalName = null;

      // Verificar se é o novo formato JSON
      try {
        const fileData = JSON.parse(test.filePath);
        if (fileData.data && fileData.originalName) {
          filePath = fileData.data;
          fileType = fileData.type || 'file';
          originalName = fileData.originalName;
        }
      } catch (e) {
        // Se não for JSON, tratar como formato antigo
        if (test.filePath.startsWith('data:')) {
          const mimeMatch = test.filePath.match(/data:([^;]+);/);
          if (mimeMatch) {
            fileType = mimeMatch[1];
          }
        }
      }

      res.json({
        filePath: filePath,
        fileType: fileType,
        originalName: originalName
      });
    } catch (error) {

      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ==================== EXAM REQUESTS ROUTES ====================
  // Requisições médicas de exames

  // Buscar requisições de exames
  router.get("/exam-requests", authenticateToken, restorePatientContext, async (req: any, res) => {
    try {
      const patientId = getEffectivePatientId(req);
      const examRequests = await storage.getExamRequestsByPatient(patientId);
      res.json(examRequests || []);
    } catch (error) {
      console.error("Error fetching exam requests:", error);
      res.status(500).json({ message: "Erro ao buscar requisições de exames" });
    }
  });

  // Criar nova requisição de exame (médicos)
  router.post("/exam-requests", authenticateToken, async (req: any, res) => {
    try {
      const examRequestData = {
        ...req.body,
        doctorId: req.user.id,
        doctorName: req.user.name || 'Médico',
        doctorCrm: req.user.crm || null,
        doctorGender: req.user.gender || null,
        validityDate: req.body.validityDate ? new Date(req.body.validityDate) : null,
      };

      const examRequest = await storage.createExamRequest(examRequestData);

      // Criar notificação de nova requisição
      const notification = await createEnterpriseNotification({
        userId: examRequest.patientId,
        type: 'exam_request_created',
        title: 'Nova Requisição de Exame',
        message: `Dr. ${examRequest.doctorName} requisitou: ${examRequest.examName}`,
        patientId: examRequest.patientId,
        relatedId: examRequest.id
      }, req, {
        afterState: examRequest,
        sessionId: req.session?.id || req.sessionID
      });

      // Broadcast para o paciente
      broadcastUpdate(examRequest.patientId, 'exam_request_created', { examRequest });

      res.json(examRequest);
    } catch (error) {
      console.error("Error creating exam request:", error);
      res.status(400).json({ message: "Erro ao criar requisição de exame" });
    }
  });

  // Agendar exame baseado em requisição
  router.post("/exam-requests/:id/schedule", authenticateToken, async (req: any, res) => {
    try {
      const examRequestId = parseInt(req.params.id);
      const examRequest = await storage.getExamRequestById(examRequestId);

      if (!examRequest) {
        return res.status(404).json({ message: "Requisição não encontrada" });
      }

      // Criar exame agendado baseado na requisição
      const testData = {
        patientId: examRequest.patientId,
        examRequestId: examRequest.id,
        name: examRequest.examName,
        type: examRequest.examCategory,
        location: req.body.location,
        testDate: new Date(req.body.testDate),
        preparationNotes: examRequest.specialInstructions,
        status: 'scheduled'
      };

      const test = await storage.createTest(testData);

      // Atualizar status da requisição
      await storage.updateExamRequest(examRequestId, {
        status: 'scheduled',
        scheduledTestId: test.id
      });

      // Criar notificação de agendamento
      const testDateTime = format(new Date(test.testDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
      const notification = await createEnterpriseNotification({
        userId: req.user.id,
        type: 'exam_scheduled',
        title: 'Exame Agendado',
        message: `${test.name} agendado para ${testDateTime} em ${test.location}`,
        patientId: req.user.id,
        relatedId: test.id
      }, req, {
        afterState: test,
        sessionId: req.session?.id || req.sessionID
      });

      // Broadcast update
      broadcastUpdate(req.user.id, 'exam_scheduled', { test, examRequest });

      res.json({ test, examRequest });
    } catch (error) {
      console.error("Error scheduling exam:", error);
      res.status(400).json({ message: "Erro ao agendar exame" });
    }
  });

  // Atualizar requisição de exame
  router.put("/exam-requests/:id", authenticateToken, async (req: any, res) => {
    try {
      const examRequestId = parseInt(req.params.id);
      const updateData = {
        ...req.body,
        validityDate: req.body.validityDate ? new Date(req.body.validityDate) : null,
        updatedAt: new Date()
      };

      const examRequest = await storage.updateExamRequest(examRequestId, updateData);

      if (!examRequest) {
        return res.status(404).json({ message: "Requisição não encontrada" });
      }

      // Broadcast update
      broadcastUpdate(examRequest.patientId, 'exam_request_updated', { examRequest });

      res.json(examRequest);
    } catch (error) {
      console.error("Error updating exam request:", error);
      res.status(400).json({ message: "Erro ao atualizar requisição" });
    }
  });

  // Cancelar requisição de exame
  router.delete("/exam-requests/:id", authenticateToken, async (req: any, res) => {
    try {
      const examRequestId = parseInt(req.params.id);

      // Primeiro, verificar se a requisição existe e pegar seus dados
      const examRequest = await storage.getExamRequestById(examRequestId);
      if (!examRequest) {
        return res.status(404).json({ message: "Requisição não encontrada" });
      }

      // Se há um exame agendado, precisa quebrar a referência circular primeiro
      if (examRequest.scheduledTestId) {
        console.log(`🔗 Removendo referência do exame agendado ID ${examRequest.scheduledTestId} da requisição`);

        // Primeiro, remover a referência scheduled_test_id da requisição
        await storage.updateExamRequest(examRequestId, {
          scheduledTestId: null,
          status: 'pending',
          updatedAt: new Date()
        });

        // Agora deletar o exame
        console.log(`🗑️ Deletando exame agendado ID ${examRequest.scheduledTestId}`);
        const testDeleted = await storage.deleteTest(examRequest.scheduledTestId);
        if (!testDeleted) {
          console.log(`⚠️ Não foi possível deletar o exame ID ${examRequest.scheduledTestId}`);
        } else {
          console.log(`✅ Exame ID ${examRequest.scheduledTestId} deletado com sucesso`);
        }
      }

      // Agora deletar a requisição
      const success = await storage.deleteExamRequest(examRequestId);

      if (!success) {
        return res.status(404).json({ message: "Requisição não encontrada" });
      }

      // Broadcast update
      broadcastUpdate(req.user.id, 'exam_request_deleted', { examRequestId, scheduledTestDeleted: !!examRequest.scheduledTestId });

      const message = examRequest.scheduledTestId
        ? "Requisição e exame agendado foram excluídos com sucesso"
        : "Requisição cancelada com sucesso";

      res.json({ message });
    } catch (error) {
      console.error("Error deleting exam request:", error);
      res.status(500).json({ message: "Erro ao cancelar requisição" });
    }
  });

  // Rota para carregar documento de prescrição apenas quando solicitado
  router.get("/prescriptions/:id/document", authenticateToken, async (req: any, res) => {
    try {
      const prescriptionId = parseInt(req.params.id);
      const prescription = await storage.getPrescriptionById(prescriptionId);

      if (!prescription || prescription.patientId !== req.user.id) {
        return res.status(404).json({ message: "Prescrição não encontrada" });
      }

      if (!prescription.filePath) {
        return res.status(404).json({ message: "Documento não encontrado" });
      }

      let filePath = prescription.filePath;
      let fileType = 'file';
      let originalName = null;

      // Verificar se é o novo formato JSON
      try {
        const fileData = JSON.parse(prescription.filePath);
        if (fileData.data && fileData.originalName) {
          filePath = fileData.data;
          fileType = fileData.type || 'file';
          originalName = fileData.originalName;
        }
      } catch (e) {
        // Se não for JSON, tratar como formato antigo
        if (prescription.filePath.startsWith('data:')) {
          const mimeMatch = prescription.filePath.match(/data:([^;]+);/);
          if (mimeMatch) {
            fileType = mimeMatch[1];
          }
        }
      }

      res.json({
        filePath: filePath,
        fileType: fileType,
        originalName: originalName
      });
    } catch (error) {

      res.status(500).json({ message: "Erro ao carregar documento" });
    }
  });

  // Prescriptions routes - versão otimizada que não carrega arquivos
  router.get("/prescriptions", authenticateToken, restorePatientContext, async (req: any, res) => {
    try {
      const patientId = getEffectivePatientId(req);
      const prescriptions = await storage.getPrescriptionsListByPatient(patientId);

      res.json(prescriptions);
    } catch (error) {

      res.status(500).json({ message: "Erro ao buscar receitas" });
    }
  });

  router.post("/prescriptions", authenticateToken, async (req: any, res) => {
    try {
      // Converter strings de data para objetos Date com timezone correto
      const processedData = {
        ...req.body,
        patientId: req.user.id,
        prescriptionDate: req.body.prescriptionDate ? new Date(req.body.prescriptionDate) : undefined,
      };

      const prescriptionData = insertPrescriptionSchema.parse(processedData);
      const prescription = await storage.createPrescription(prescriptionData);

      // Criar notificação de nova receita cadastrada
      const prescriptionDateTime = format(new Date(prescription.prescriptionDate), "dd/MM/yyyy", { locale: ptBR });
      const notification = await createEnterpriseNotification({
        userId: req.user.id,
        type: 'prescription_created',
        title: 'Nova Receita Cadastrada',
        message: `Receita "${prescription.title}" do médico ${prescription.doctorName} cadastrada (${prescriptionDateTime})`,
        patientId: req.user.id,
        relatedId: prescription.id
      }, req, {
        afterState: prescription,
        sessionId: req.session?.id || req.sessionID
      });

      // Broadcast notificação em tempo real
      broadcastUpdate(req.user.id, 'notification_created', { notification });

      // Broadcast update to connected clients
      broadcastUpdate(req.user.id, 'prescription_created', { prescription });

      res.json(prescription);
    } catch (error) {

      res.status(400).json({ message: "Erro ao criar receita" });
    }
  });

  router.put("/prescriptions/:id", authenticateToken, async (req: any, res) => {
    try {
      const prescriptionId = parseInt(req.params.id);
      // Converter strings de data para objetos Date com timezone correto
      const processedData = {
        ...req.body,
        prescriptionDate: req.body.prescriptionDate ? new Date(req.body.prescriptionDate) : undefined,
      };

      // Obter receita original para comparar mudanças
      const existingPrescription = await storage.getPrescriptionById(prescriptionId);
      const prescription = await storage.updatePrescription(prescriptionId, processedData);

      if (!prescription) {
        return res.status(404).json({ message: "Receita não encontrada" });
      }

      // Determinar o que foi editado
      const changes = [];
      if (existingPrescription && processedData.title && existingPrescription.title !== processedData.title) {
        changes.push(`título alterado de "${existingPrescription.title}" para "${processedData.title}"`);
      }
      if (existingPrescription && processedData.doctorName && existingPrescription.doctorName !== processedData.doctorName) {
        changes.push(`médico alterado de "${existingPrescription.doctorName}" para "${processedData.doctorName}"`);
      }
      if (existingPrescription && processedData.prescriptionDate) {
        const oldDate = format(new Date(existingPrescription.prescriptionDate), "dd/MM/yyyy", { locale: ptBR });
        const newDate = format(new Date(processedData.prescriptionDate), "dd/MM/yyyy", { locale: ptBR });
        if (oldDate !== newDate) {
          changes.push(`data alterada de ${oldDate} para ${newDate}`);
        }
      }
      if (existingPrescription && processedData.description && existingPrescription.description !== processedData.description) {
        changes.push(`descrição atualizada`);
      }

      // Criar notificação de edição se houve mudanças
      if (changes.length > 0) {
        const changeMessage = changes.join(', ');
        console.log('🔍 DEBUG - Criando notificação para prescrição editada, req disponível:', !!req);
        const notification = await createEnterpriseNotification({
          userId: req.user.id,
          type: 'prescription_edited',
          title: 'Receita Editada',
          message: `Receita "${prescription.title}": ${changeMessage}`,
          patientId: req.user.id,
          relatedId: prescription.id
        }, req, {
          beforeState: existingPrescription,
          afterState: prescription,
          sessionId: req.session?.id || req.sessionID
        });

        // Broadcast notificação em tempo real
        broadcastUpdate(req.user.id, 'notification_created', { notification });
      }

      // Broadcast update to connected clients
      broadcastUpdate(req.user.id, 'prescription_updated', { prescription });

      res.json(prescription);
    } catch (error) {

      res.status(400).json({ message: "Erro ao atualizar receita" });
    }
  });

  router.delete("/prescriptions/:id", authenticateToken, async (req: any, res) => {
    try {
      const prescriptionId = parseInt(req.params.id);
      const success = await storage.deletePrescription(prescriptionId);

      if (!success) {
        return res.status(404).json({ message: "Receita não encontrada" });
      }

      // Broadcast update to connected clients
      broadcastUpdate(req.user.id, 'prescription_deleted', { prescriptionId });

      res.json({ message: "Receita removida com sucesso" });
    } catch (error) {

      res.status(500).json({ message: "Erro ao remover receita" });
    }
  });



  // Rota de seed data (apenas para teste)
  router.post("/seed-data", async (req, res) => {
    try {
      // Verificar se o usuário já existe
      let user = await storage.getUserByEmail("ritialdeburg@gmail.com");

      if (!user) {
        // Criar usuário
        const hashedPassword = await bcrypt.hash("123456", 10);
        user = await storage.createUser({
          email: "ritialdeburg@gmail.com",
          password: hashedPassword,
          name: "Rita Lopes",
          age: 58,
          profileType: "patient",
          photo: null
        });

      }

      // Criar medicamentos se não existirem
      const existingMedications = await storage.getMedicationsByPatient(user.id);
      if (existingMedications.length === 0) {
        const medications = [
          {
            patientId: user.id,
            name: "Losartana 50mg",
            dosage: "50mg",
            frequency: "daily",
            startDate: new Date("2024-01-01"),
            endDate: null,
            instructions: "Tomar 1 comprimido pela manhã",
            isActive: true
          },
          {
            patientId: user.id,
            name: "Metformina 500mg",
            dosage: "500mg",
            frequency: "twice_daily",
            startDate: new Date("2024-01-01"),
            endDate: null,
            instructions: "Tomar 1 comprimido de manhã e à noite",
            isActive: true
          },
          {
            patientId: user.id,
            name: "Omeprazol 20mg",
            dosage: "20mg",
            frequency: "daily",
            startDate: new Date("2024-01-01"),
            endDate: null,
            instructions: "Tomar 1 comprimido em jejum",
            isActive: true
          },
          {
            patientId: user.id,
            name: "Atorvastatina 40mg",
            dosage: "40mg",
            frequency: "daily",
            startDate: new Date("2024-01-01"),
            endDate: null,
            instructions: "Tomar 1 comprimido à noite",
            isActive: true
          }
        ];

        for (const med of medications) {
          await storage.createMedication(med);
        }

      }

      // Criar consultas se não existirem
      const existingAppointments = await storage.getAppointmentsByPatient(user.id);
      if (existingAppointments.length === 0) {
        const appointments = [
          {
            patientId: user.id,
            title: "Consulta Cardiologista",
            doctorName: "Dr. Pedro Costa",
            location: "Hospital São Lucas",
            appointmentDate: new Date("2025-01-15T10:00:00"),
            notes: "Consulta de rotina para acompanhamento da hipertensão",
            status: "scheduled"
          },
          {
            patientId: user.id,
            title: "Consulta Endocrinologista",
            doctorName: "Dra. Ana Silva",
            location: "Clínica Endocrino",
            appointmentDate: new Date("2025-01-22T14:30:00"),
            notes: "Revisão do tratamento de diabetes",
            status: "scheduled"
          }
        ];

        for (const apt of appointments) {
          await storage.createAppointment(apt);
        }

      }

      res.json({
        success: true,
        message: "Dados de teste criados com sucesso para ritialdeburg@gmail.com",
        user: { id: user.id, email: user.email, name: user.name }
      });

    } catch (error) {

      res.status(500).json({
        success: false,
        message: "Erro ao criar dados de teste"
      });
    }
  });

  // ===== VITAL SIGNS ROUTES =====

  // Blood Pressure Routes
  router.get("/vital-signs/blood-pressure", authenticateToken, restorePatientContext, async (req, res) => {
    try {
      const patientId = getEffectivePatientId(req);
      const readings = await storage.getBloodPressureReadings(patientId);
      res.json(readings);
    } catch (error) {

      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  router.post("/vital-signs/blood-pressure", authenticateToken, async (req, res) => {
    try {
      // Converter strings de data para objetos Date
      const processedData = {
        ...req.body,
        patientId: req.user.id,
        measuredAt: req.body.measuredAt ? new Date(req.body.measuredAt) : new Date()
      };

      const readingData = insertBloodPressureReadingSchema.parse(processedData);
      const reading = await storage.createBloodPressureReading(readingData);

      // Criar notificação de nova medição de pressão arterial
      const measurementDateTime = format(new Date(reading.measuredAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
      const notification = await createEnterpriseNotification({
        userId: req.user.id,
        type: 'vital_sign_created',
        title: 'Pressão Arterial Registrada',
        message: `Pressão ${reading.systolic}/${reading.diastolic} mmHg${reading.heartRate ? ` (${reading.heartRate} bpm)` : ''} registrada em ${measurementDateTime}`,
        patientId: req.user.id,
        relatedId: reading.id
      }, req, {
        afterState: reading,
        sessionId: req.session?.id || req.sessionID
      });

      // Broadcast notificação em tempo real
      broadcastUpdate(req.user.id, 'notification_created', { notification });

      // Broadcast update to connected clients
      broadcastUpdate(req.user.id, 'blood_pressure_created', { reading });

      res.status(201).json(reading);
    } catch (error) {

      res.status(400).json({ message: "Dados inválidos" });
    }
  });

  router.put("/vital-signs/blood-pressure/:id", authenticateToken, async (req, res) => {
    try {
      const readingId = parseInt(req.params.id);
      // Processar dados sem forçar nova data quando não necessário
      const processedData = { ...req.body };

      // Só converter data se for enviada explicitamente
      if (req.body.measuredAt) {
        processedData.measuredAt = new Date(req.body.measuredAt);
      }

      // Obter leitura original para comparar mudanças
      const existingReading = await storage.getBloodPressureReadingById(readingId);
      const reading = await storage.updateBloodPressureReading(readingId, processedData);

      if (!reading) {
        return res.status(404).json({ message: "Leitura não encontrada" });
      }

      // Determinar o que foi editado
      const changes = [];
      if (existingReading && processedData.systolic && existingReading.systolic !== processedData.systolic) {
        changes.push(`pressão sistólica alterada de ${existingReading.systolic} para ${processedData.systolic}`);
      }
      if (existingReading && processedData.diastolic && existingReading.diastolic !== processedData.diastolic) {
        changes.push(`pressão diastólica alterada de ${existingReading.diastolic} para ${processedData.diastolic}`);
      }
      if (existingReading && processedData.heartRate && existingReading.heartRate !== processedData.heartRate) {
        changes.push(`batimentos alterados de ${existingReading.heartRate} para ${processedData.heartRate} bpm`);
      }
      if (existingReading && processedData.measuredAt) {
        const oldDate = format(new Date(existingReading.measuredAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
        const newDate = format(new Date(processedData.measuredAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
        if (oldDate !== newDate) {
          changes.push(`data/horário alterado para ${newDate}`);
        }
      }

      // Criar notificação de edição se houve mudanças
      if (changes.length > 0) {
        const changeMessage = changes.join(', ');
        const notification = await createEnterpriseNotification({
          userId: req.user.id,
          type: 'vital_sign_edited',
          title: 'Pressão Arterial Editada',
          message: `Medição de pressão arterial: ${changeMessage}`,
          patientId: req.user.id,
          relatedId: reading.id
        });

        // Broadcast notificação em tempo real
        broadcastUpdate(req.user.id, 'notification_created', { notification });
      }

      // Broadcast update to connected clients
      broadcastUpdate(req.user.id, 'blood_pressure_updated', { reading });

      res.json(reading);
    } catch (error) {

      res.status(400).json({ message: "Dados inválidos" });
    }
  });

  router.delete("/vital-signs/blood-pressure/:id", authenticateToken, async (req, res) => {
    try {
      const readingId = parseInt(req.params.id);
      const success = await storage.deleteBloodPressureReading(readingId);

      if (!success) {
        return res.status(404).json({ message: "Leitura não encontrada" });
      }

      // Broadcast update to connected clients
      broadcastUpdate(req.user.id, 'blood_pressure_deleted', { readingId });

      res.json({ message: "Leitura de pressão removida com sucesso" });
    } catch (error) {

      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Glucose Routes
  router.get("/vital-signs/glucose", authenticateToken, restorePatientContext, async (req, res) => {
    try {
      const patientId = getEffectivePatientId(req);
      const readings = await storage.getGlucoseReadings(patientId);
      res.json(readings);
    } catch (error) {

      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  router.post("/vital-signs/glucose", authenticateToken, async (req, res) => {
    try {
      // Converter strings de data para objetos Date
      const processedData = {
        ...req.body,
        patientId: req.user.id,
        measuredAt: req.body.measuredAt ? new Date(req.body.measuredAt) : new Date()
      };

      const readingData = insertGlucoseReadingSchema.parse(processedData);
      const reading = await storage.createGlucoseReading(readingData);

      // Criar notificação de nova medição de glicose
      const measurementDateTime = format(new Date(reading.measuredAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
      const typeLabels = {
        'fasting': 'em jejum',
        'post_meal': 'pós-refeição',
        'random': 'aleatória',
        'bedtime': 'antes de dormir'
      };
      const typeLabel = typeLabels[reading.measurementType as keyof typeof typeLabels] || reading.measurementType;
      const notification = await createEnterpriseNotification({
        userId: req.user.id,
        type: 'vital_sign_created',
        title: 'Glicose Registrada',
        message: `Glicose ${reading.glucoseLevel} mg/dL${typeLabel ? ` (${typeLabel})` : ''} registrada em ${measurementDateTime}`,
        patientId: req.user.id,
        relatedId: reading.id
      }, req);

      // Broadcast notificação em tempo real
      broadcastUpdate(req.user.id, 'notification_created', { notification });

      // Broadcast update to connected clients
      broadcastUpdate(req.user.id, 'glucose_created', { reading });

      res.status(201).json(reading);
    } catch (error) {

      res.status(400).json({ message: "Dados inválidos" });
    }
  });

  router.put("/vital-signs/glucose/:id", authenticateToken, async (req, res) => {
    try {
      const readingId = parseInt(req.params.id);
      // Converter strings de data para objetos Date sem ajuste de timezone
      const processedData = {
        ...req.body,
        measuredAt: req.body.measuredAt ? new Date(req.body.measuredAt) : new Date()
      };

      // Obter leitura original para comparar mudanças
      const existingReading = await storage.getGlucoseReadingById(readingId);
      const reading = await storage.updateGlucoseReading(readingId, processedData);

      if (!reading) {
        return res.status(404).json({ message: "Leitura não encontrada" });
      }

      // Determinar o que foi editado
      const changes = [];
      if (existingReading && processedData.glucoseLevel && existingReading.glucoseLevel !== processedData.glucoseLevel) {
        changes.push(`glicemia alterada de ${existingReading.glucoseLevel} para ${processedData.glucoseLevel} mg/dL`);
      }
      if (existingReading && processedData.measurementType && existingReading.measurementType !== processedData.measurementType) {
        const typeLabels = {
          'fasting': 'em jejum',
          'post_meal': 'pós-refeição',
          'random': 'aleatória',
          'bedtime': 'antes de dormir'
        };
        const oldType = typeLabels[existingReading.measurementType as keyof typeof typeLabels] || existingReading.measurementType;
        const newType = typeLabels[processedData.measurementType as keyof typeof typeLabels] || processedData.measurementType;
        changes.push(`tipo alterado de "${oldType}" para "${newType}"`);
      }
      if (existingReading && processedData.measuredAt) {
        const oldDate = format(new Date(existingReading.measuredAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
        const newDate = format(new Date(processedData.measuredAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
        if (oldDate !== newDate) {
          changes.push(`data/horário alterado para ${newDate}`);
        }
      }

      // Criar notificação de edição se houve mudanças
      if (changes.length > 0) {
        const changeMessage = changes.join(', ');
        const notification = await createEnterpriseNotification({
          userId: req.user.id,
          type: 'vital_sign_edited',
          title: 'Glicemia Editada',
          message: `Medição de glicemia: ${changeMessage}`,
          patientId: req.user.id,
          relatedId: reading.id
        }, req);

        // Broadcast notificação em tempo real
        broadcastUpdate(req.user.id, 'notification_created', { notification });
      }

      // Broadcast update to connected clients
      broadcastUpdate(req.user.id, 'glucose_updated', { reading });

      res.json(reading);
    } catch (error) {

      res.status(400).json({ message: "Dados inválidos" });
    }
  });

  router.delete("/vital-signs/glucose/:id", authenticateToken, async (req, res) => {
    try {
      const readingId = parseInt(req.params.id);
      const success = await storage.deleteGlucoseReading(readingId);

      if (!success) {
        return res.status(404).json({ message: "Leitura não encontrada" });
      }

      // Broadcast update to connected clients
      broadcastUpdate(req.user.id, 'glucose_deleted', { readingId });

      res.json({ message: "Leitura de glicose removida com sucesso" });
    } catch (error) {

      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Heart Rate Routes
  router.get("/vital-signs/heart-rate", authenticateToken, restorePatientContext, async (req, res) => {
    try {
      const patientId = getEffectivePatientId(req);
      const readings = await storage.getHeartRateReadings(patientId);
      res.json(readings);
    } catch (error) {

      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  router.post("/vital-signs/heart-rate", authenticateToken, async (req, res) => {
    try {
      // Converter strings de data para objetos Date
      const processedData = {
        ...req.body,
        patientId: req.user.id,
        measuredAt: req.body.measuredAt ? new Date(req.body.measuredAt) : new Date()
      };

      const readingData = insertHeartRateReadingSchema.parse(processedData);
      const reading = await storage.createHeartRateReading(readingData);

      // Criar notificação de nova medição de batimentos cardíacos
      const measurementDateTime = format(new Date(reading.measuredAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
      const typeLabels = {
        'resting': 'repouso',
        'exercise': 'exercício',
        'recovery': 'recuperação'
      };
      const typeLabel = typeLabels[reading.measurementType as keyof typeof typeLabels] || reading.measurementType;
      const notification = await createEnterpriseNotification({
        userId: req.user.id,
        type: 'vital_sign_created',
        title: 'Frequência Cardíaca Registrada',
        message: `Frequência cardíaca ${reading.heartRate} bpm${typeLabel ? ` (${typeLabel})` : ''} registrada em ${measurementDateTime}`,
        patientId: req.user.id,
        relatedId: reading.id
      }, req);

      // Broadcast notificação em tempo real
      broadcastUpdate(req.user.id, 'notification_created', { notification });

      // Broadcast update to connected clients
      broadcastUpdate(req.user.id, 'heart_rate_created', { reading });

      res.status(201).json(reading);
    } catch (error) {

      res.status(400).json({ message: "Dados inválidos" });
    }
  });

  router.put("/vital-signs/heart-rate/:id", authenticateToken, async (req, res) => {
    try {
      const readingId = parseInt(req.params.id);
      // Converter strings de data para objetos Date sem ajuste de timezone
      const processedData = {
        ...req.body,
        measuredAt: req.body.measuredAt ? new Date(req.body.measuredAt) : new Date()
      };

      // Obter leitura original para comparar mudanças
      const existingReading = await storage.getHeartRateReadingById(readingId);
      const reading = await storage.updateHeartRateReading(readingId, processedData);

      if (!reading) {
        return res.status(404).json({ message: "Leitura não encontrada" });
      }

      // Determinar o que foi editado
      const changes = [];
      if (existingReading && processedData.heartRate && existingReading.heartRate !== processedData.heartRate) {
        changes.push(`batimentos alterados de ${existingReading.heartRate} para ${processedData.heartRate} bpm`);
      }
      if (existingReading && processedData.measurementType && existingReading.measurementType !== processedData.measurementType) {
        const typeLabels = {
          'resting': 'repouso',
          'exercise': 'exercício',
          'recovery': 'recuperação'
        };
        const oldType = typeLabels[existingReading.measurementType as keyof typeof typeLabels] || existingReading.measurementType;
        const newType = typeLabels[processedData.measurementType as keyof typeof typeLabels] || processedData.measurementType;
        changes.push(`tipo alterado de "${oldType}" para "${newType}"`);
      }
      if (existingReading && processedData.measuredAt) {
        const oldDate = format(new Date(existingReading.measuredAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
        const newDate = format(new Date(processedData.measuredAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
        if (oldDate !== newDate) {
          changes.push(`data/horário alterado para ${newDate}`);
        }
      }

      // Criar notificação de edição se houve mudanças
      if (changes.length > 0) {
        const changeMessage = changes.join(', ');
        const notification = await createEnterpriseNotification({
          userId: req.user.id,
          type: 'vital_sign_edited',
          title: 'Frequência Cardíaca Editada',
          message: `Medição de frequência cardíaca: ${changeMessage}`,
          patientId: req.user.id,
          relatedId: reading.id
        }, req);

        // Broadcast notificação em tempo real
        broadcastUpdate(req.user.id, 'notification_created', { notification });
      }

      // Broadcast update to connected clients
      broadcastUpdate(req.user.id, 'heart_rate_updated', { reading });

      res.json(reading);
    } catch (error) {

      res.status(400).json({ message: "Dados inválidos" });
    }
  });

  router.delete("/vital-signs/heart-rate/:id", authenticateToken, async (req, res) => {
    try {
      const readingId = parseInt(req.params.id);
      const success = await storage.deleteHeartRateReading(readingId);

      if (!success) {
        return res.status(404).json({ message: "Leitura não encontrada" });
      }

      // Broadcast update to connected clients
      broadcastUpdate(req.user.id, 'heart_rate_deleted', { readingId });

      res.json({ message: "Leitura de batimentos removida com sucesso" });
    } catch (error) {

      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Temperature Routes
  router.get("/vital-signs/temperature", authenticateToken, restorePatientContext, async (req, res) => {
    try {
      const patientId = getEffectivePatientId(req);
      const readings = await storage.getTemperatureReadings(patientId);
      res.json(readings);
    } catch (error) {

      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  router.post("/vital-signs/temperature", authenticateToken, async (req, res) => {
    try {
      // Converter strings de data para objetos Date
      const processedData = {
        ...req.body,
        patientId: req.user.id,
        measuredAt: req.body.measuredAt ? new Date(req.body.measuredAt) : new Date()
      };

      const readingData = insertTemperatureReadingSchema.parse(processedData);
      const reading = await storage.createTemperatureReading(readingData);

      // Criar notificação de nova medição de temperatura
      const measurementDateTime = format(new Date(reading.measuredAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
      const methodLabels = {
        'oral': 'oral',
        'rectal': 'retal',
        'axillary': 'axilar',
        'tympanic': 'timpânica',
        'forehead': 'testa'
      };
      const methodLabel = methodLabels[reading.measurementMethod as keyof typeof methodLabels] || reading.measurementMethod;
      const notification = await createEnterpriseNotification({
        userId: req.user.id,
        type: 'vital_sign_created',
        title: 'Temperatura Registrada',
        message: `Temperatura ${reading.temperature}°C${methodLabel ? ` (${methodLabel})` : ''} registrada em ${measurementDateTime}`,
        patientId: req.user.id,
        relatedId: reading.id
      }, req);

      // Broadcast notificação em tempo real
      broadcastUpdate(req.user.id, 'notification_created', { notification });

      // Broadcast update to connected clients
      broadcastUpdate(req.user.id, 'temperature_created', { reading });

      res.status(201).json(reading);
    } catch (error) {

      res.status(400).json({ message: "Dados inválidos" });
    }
  });

  router.put("/vital-signs/temperature/:id", authenticateToken, async (req, res) => {
    try {
      const readingId = parseInt(req.params.id);
      // Converter strings de data para objetos Date sem ajuste de timezone
      const processedData = {
        ...req.body,
        measuredAt: req.body.measuredAt ? new Date(req.body.measuredAt) : new Date()
      };

      // Obter leitura original para comparar mudanças
      const existingReading = await storage.getTemperatureReadingById(readingId);
      const reading = await storage.updateTemperatureReading(readingId, processedData);

      if (!reading) {
        return res.status(404).json({ message: "Leitura não encontrada" });
      }

      // Determinar o que foi editado
      const changes = [];
      if (existingReading && processedData.temperature && existingReading.temperature !== processedData.temperature) {
        changes.push(`temperatura alterada de ${existingReading.temperature}°C para ${processedData.temperature}°C`);
      }
      if (existingReading && processedData.measurementMethod && existingReading.measurementMethod !== processedData.measurementMethod) {
        const methodLabels = {
          'oral': 'oral',
          'rectal': 'retal',
          'axillary': 'axilar',
          'tympanic': 'timpânica',
          'forehead': 'testa'
        };
        const oldMethod = methodLabels[existingReading.measurementMethod as keyof typeof methodLabels] || existingReading.measurementMethod;
        const newMethod = methodLabels[processedData.measurementMethod as keyof typeof methodLabels] || processedData.measurementMethod;
        changes.push(`método alterado de "${oldMethod}" para "${newMethod}"`);
      }
      if (existingReading && processedData.measuredAt) {
        const oldDate = format(new Date(existingReading.measuredAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
        const newDate = format(new Date(processedData.measuredAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
        if (oldDate !== newDate) {
          changes.push(`data/horário alterado para ${newDate}`);
        }
      }

      // Criar notificação de edição se houve mudanças
      if (changes.length > 0) {
        const changeMessage = changes.join(', ');
        const notification = await createEnterpriseNotification({
          userId: req.user.id,
          type: 'vital_sign_edited',
          title: 'Temperatura Editada',
          message: `Medição de temperatura: ${changeMessage}`,
          patientId: req.user.id,
          relatedId: reading.id
        }, req);

        // Broadcast notificação em tempo real
        broadcastUpdate(req.user.id, 'notification_created', { notification });
      }

      // Broadcast update to connected clients
      broadcastUpdate(req.user.id, 'temperature_updated', { reading });

      res.json(reading);
    } catch (error) {

      res.status(400).json({ message: "Dados inválidos" });
    }
  });

  router.delete("/vital-signs/temperature/:id", authenticateToken, async (req, res) => {
    try {
      const readingId = parseInt(req.params.id);
      const success = await storage.deleteTemperatureReading(readingId);

      if (!success) {
        return res.status(404).json({ message: "Leitura não encontrada" });
      }

      // Broadcast update to connected clients
      broadcastUpdate(req.user.id, 'temperature_deleted', { readingId });

      res.json({ message: "Leitura de temperatura removida com sucesso" });
    } catch (error) {

      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Weight Routes
  router.get("/vital-signs/weight", authenticateToken, restorePatientContext, async (req, res) => {
    try {
      const patientId = getEffectivePatientId(req);
      const readings = await storage.getWeightReadings(patientId);
      res.json(readings);
    } catch (error) {

      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  router.post("/vital-signs/weight", authenticateToken, async (req, res) => {
    try {


      // Validar e converter o peso
      const weightValue = req.body.weight;


      if (weightValue === undefined || weightValue === null || weightValue === "" || isNaN(parseFloat(weightValue))) {

        return res.status(400).json({ message: "Peso é obrigatório e deve ser um número válido" });
      }

      const parsedWeight = parseFloat(weightValue);
      if (parsedWeight <= 0) {
        return res.status(400).json({ message: "Peso deve ser maior que zero" });
      }

      // Converter strings de data para objetos Date
      const processedData = {
        ...req.body,
        weight: parsedWeight,
        patientId: req.user.id,
        measuredAt: req.body.measuredAt ? new Date(req.body.measuredAt) : new Date()
      };

      const readingData = insertWeightReadingSchema.parse(processedData);
      const reading = await storage.createWeightReading(readingData);

      // Criar notificação de nova medição de peso
      const measurementDateTime = format(new Date(reading.measuredAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
      const notification = await createEnterpriseNotification({
        userId: req.user.id,
        type: 'vital_sign_created',
        title: 'Peso Registrado',
        message: `Peso ${reading.weight} kg registrado em ${measurementDateTime}`,
        patientId: req.user.id,
        relatedId: reading.id
      }, req);

      // Broadcast notificação em tempo real
      broadcastUpdate(req.user.id, 'notification_created', { notification });

      // Broadcast update to connected clients
      broadcastUpdate(req.user.id, 'weight_created', { reading });

      res.status(201).json(reading);
    } catch (error) {

      res.status(400).json({ message: "Dados inválidos" });
    }
  });

  router.put("/vital-signs/weight/:id", authenticateToken, async (req, res) => {
    try {
      const readingId = parseInt(req.params.id);

      // Validar e converter o peso
      const weightValue = req.body.weight;
      if (!weightValue || weightValue === "" || isNaN(parseFloat(weightValue))) {
        return res.status(400).json({ message: "Peso é obrigatório e deve ser um número válido" });
      }

      // Converter strings de data para objetos Date sem ajuste de timezone
      const processedData = {
        ...req.body,
        weight: parseFloat(weightValue),
        measuredAt: req.body.measuredAt ? new Date(req.body.measuredAt) : new Date()
      };

      // Obter leitura original para comparar mudanças
      const existingReading = await storage.getWeightReadingById(readingId);
      const reading = await storage.updateWeightReading(readingId, processedData);

      if (!reading) {
        return res.status(404).json({ message: "Leitura não encontrada" });
      }

      // Determinar o que foi editado
      const changes = [];
      if (existingReading && processedData.weight && existingReading.weight !== processedData.weight) {
        changes.push(`peso alterado de ${existingReading.weight} kg para ${processedData.weight} kg`);
      }
      if (existingReading && processedData.measuredAt) {
        const oldDate = format(new Date(existingReading.measuredAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
        const newDate = format(new Date(processedData.measuredAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
        if (oldDate !== newDate) {
          changes.push(`data/horário alterado para ${newDate}`);
        }
      }

      // Criar notificação de edição se houve mudanças
      if (changes.length > 0) {
        const changeMessage = changes.join(', ');
        const notification = await createEnterpriseNotification({
          userId: req.user.id,
          type: 'vital_sign_edited',
          title: 'Peso Editado',
          message: `Medição de peso: ${changeMessage}`,
          patientId: req.user.id,
          relatedId: reading.id
        }, req);

        // Broadcast notificação em tempo real
        broadcastUpdate(req.user.id, 'notification_created', { notification });
      }

      // Broadcast update to connected clients
      broadcastUpdate(req.user.id, 'weight_updated', { reading });

      res.json(reading);
    } catch (error) {

      res.status(400).json({ message: "Dados inválidos" });
    }
  });

  router.delete("/vital-signs/weight/:id", authenticateToken, async (req, res) => {
    try {
      const readingId = parseInt(req.params.id);
      const success = await storage.deleteWeightReading(readingId);

      if (!success) {
        return res.status(404).json({ message: "Leitura não encontrada" });
      }

      // Broadcast update to connected clients
      broadcastUpdate(req.user.id, 'weight_deleted', { readingId });

      res.json({ message: "Leitura de peso removida com sucesso" });
    } catch (error) {

      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Rota de debug para verificar usuário
  router.get("/debug/user/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);

      if (user) {
        res.json({
          exists: true,
          user: {
            id: user.id,
            name: user.name,
            email: user.email
          }
        });
      } else {
        res.json({ exists: false, user: null });
      }
    } catch (error) {
      res.status(500).json({ error: "Erro ao verificar usuário" });
    }
  });

  // Rota de debug para verificar estado da sessão
  router.get("/debug/session", authenticateToken, async (req: any, res) => {
    try {
      res.json({
        user: {
          id: req.user.id,
          name: req.user.name,
          profileType: req.user.profileType
        },
        session: {
          selectedPatientId: req.session?.selectedPatientId || null,
          caregiverId: req.session?.caregiverId || null,
          userProfile: req.session?.userProfile || null
        },
        request: {
          selectedPatientId: req.selectedPatientId || null,
          caregiverId: req.caregiverId || null
        },
        effectivePatientId: getEffectivePatientId(req),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: "Erro ao verificar sessão" });
    }
  });

  // Nova rota de debug para verificar estado atual dos dados
  router.get("/debug/data-status", authenticateToken, async (req: any, res) => {
    try {
      const userId = req.user.id;

      // Verificar medicamentos
      const medications = await storage.getMedicationsByPatient(userId);

      // Verificar todos os logs (sem filtro de data)
      const allLogs = await storage.getMedicationLogs(userId);

      // Verificar logs de hoje
      const todayLogs = await storage.getTodayMedicationLogs(userId);

      res.json({
        userId,
        userName: req.user.name,
        medications: {
          total: medications.length,
          active: medications.filter(m => m.isActive).length,
          list: medications.map(m => ({ id: m.id, name: m.name, isActive: m.isActive }))
        },
        logs: {
          totalAllTime: allLogs.length,
          todayLogs: todayLogs.length,
          recentLogs: allLogs.slice(0, 5).map(log => ({
            id: log.id,
            scheduledDateTime: log.scheduledDateTime,
            status: log.status,
            medicationId: log.medicationId
          }))
        },
        currentTime: new Date().toISOString()
      });
    } catch (error) {

      res.status(500).json({ error: "Erro ao verificar dados" });
    }
  });

  // Rota para gerar logs de medicação para hoje
  router.post("/debug/generate-today-logs", authenticateToken, async (req: any, res) => {
    try {


      // Buscar medicamentos ativos do usuário
      const medications = await storage.getMedicationsByPatient(req.user.id);


      const activeMedications = medications.filter(med => {
        if (!med.isActive) return false;

        const today = new Date();
        const startDate = new Date(med.startDate);
        const endDate = med.endDate ? new Date(med.endDate) : null;

        // Verificar se o medicamento deve ser tomado hoje
        const isValidToday = startDate <= today && (!endDate || endDate >= today);

        return isValidToday;
      });



      let logsCreated = 0;

      // Para cada medicamento ativo, criar logs baseados nos horários
      for (const medication of activeMedications) {
        const schedules = await storage.getSchedulesByMedication(medication.id);


        for (const schedule of schedules) {
          if (schedule.isActive) {
            const today = new Date();
            const scheduledDateTime = new Date(today);
            const [hours, minutes] = schedule.scheduledTime.split(':');
            scheduledDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

            // Verificar se já existe log para este horário hoje
            const existingLogs = await storage.getTodayMedicationLogs(req.user.id);
            const existingLog = existingLogs.find(log =>
              log.medicationId === medication.id &&
              log.scheduleId === schedule.id
            );

            if (!existingLog) {
              // Criar log de medicação para hoje
              const logData = {
                medicationId: medication.id,
                scheduleId: schedule.id,
                patientId: req.user.id,
                scheduledDateTime,
                actualDateTime: null,
                status: "pending",
                delayMinutes: 0,
                confirmedBy: null,

              };

              const newLog = await storage.createMedicationLogSafe(logData);
              if (newLog) {
                logsCreated++;

              }
            }
          }
        }
      }

      res.json({
        success: true,
        message: `${logsCreated} logs de medicação criados para hoje`,
        medicationsFound: medications.length,
        activeMedications: activeMedications.length,
        logsCreated
      });
    } catch (error) {

      res.status(500).json({ success: false, message: "Erro ao gerar logs de medicação" });
    }
  });

  router.patch("/medication-logs/:id", authenticateToken, async (req: any, res) => {
    try {
      const logId = parseInt(req.params.id);
      const logData = req.body;

      // Converter actualDateTime para Date se fornecido, ajustando para timezone brasileiro
      if (logData.actualDateTime) {
        const actualTimeUTC = new Date(logData.actualDateTime);
        // Converter UTC para horário brasileiro (UTC-3)
        const actualTimeBrasil = new Date(actualTimeUTC.getTime() - (3 * 60 * 60 * 1000));
        logData.actualDateTime = actualTimeBrasil;
      }

      // Se está marcando como tomado, calcular o atraso/adiantamento
      if (logData.status === 'taken' && logData.actualDateTime) {
        // Garantir que confirmedBy seja preenchido
        if (!logData.confirmedBy) {
          logData.confirmedBy = req.user.id;
        }

        // Buscar o log atual para pegar o horário programado
        const currentLog = await storage.getMedicationLogById(logId);
        if (currentLog && currentLog.scheduledDateTime) {
          const scheduledTime = new Date(currentLog.scheduledDateTime);
          const actualTime = new Date(logData.actualDateTime);

          // Calcular diferença em minutos (já vem ajustado do frontend)
          const timeDiffMs = actualTime.getTime() - scheduledTime.getTime();
          const timeDiffMinutes = Math.floor(timeDiffMs / (1000 * 60));

          // Guardar a diferença real (pode ser negativo para adiantamento)
          logData.delayMinutes = timeDiffMinutes;
        }
      }

      const log = await storage.updateMedicationLog(logId, logData);

      if (!log) {
        return res.status(404).json({ message: "Log não encontrado" });
      }

      res.json(log);
    } catch (error) {

      res.status(400).json({ message: "Erro ao atualizar log" });
    }
  });

  router.post("/medication-logs/:id/mark-taken", authenticateToken, restorePatientContext, async (req: any, res) => {
    try {
      const logId = parseInt(req.params.id);
      const { notes, sideEffects, effectiveness, symptoms, additionalInfo } = req.body;

      // Buscar o log do medicamento
      const log = await storage.getMedicationLogById(logId);

      if (!log) {
        return res.status(404).json({ message: "Log não encontrado" });
      }

      // Atualizar o log como tomado
      const updatedLog = await storage.markMedicationLogAsTaken(logId, req.user.id);

      // Criar histórico se houver informações adicionais
      if (notes || sideEffects || effectiveness || symptoms || additionalInfo) {
        // Usar horário brasileiro para actualDateTime
        const nowUTC = new Date();
        const nowBrasil = new Date(nowUTC.getTime() - (3 * 60 * 60 * 1000)); // UTC-3

        const historyData = {
          medicationId: log.medicationId,
          medicationLogId: logId,
          patientId: log.patientId, // Usar patientId do log original (do paciente)
          scheduledDateTime: log.scheduledDateTime,
          actualDateTime: nowBrasil,
          notes,
          sideEffects,
          effectiveness,
          symptoms,
          additionalInfo,
          createdBy: req.user.id, // Manter quem criou (cuidadora)
        };

        await storage.createMedicationHistory(historyData);
      }

      // Criar notificação de medicamento tomado
      if (updatedLog) {
        // Buscar informações do medicamento para a notificação
        const medication = await storage.getMedicationById(updatedLog.medicationId);

        if (medication) {
          // Calcular se foi tomado no horário, atrasado ou antecipado
          const scheduledTime = new Date(updatedLog.scheduledDateTime);
          const actualTime = new Date(updatedLog.actualDateTime);
          const timeDiffMs = actualTime.getTime() - scheduledTime.getTime();
          const timeDiffMinutes = Math.floor(timeDiffMs / (1000 * 60));

          let statusMessage = '';
          if (Math.abs(timeDiffMinutes) <= 5) {
            statusMessage = 'no horário correto';
          } else if (timeDiffMinutes > 5) {
            const hours = Math.floor(timeDiffMinutes / 60);
            const minutes = timeDiffMinutes % 60;
            const delayText = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
            statusMessage = `com ${delayText} de atraso`;
          } else if (timeDiffMinutes < -5) {
            const hours = Math.floor(Math.abs(timeDiffMinutes) / 60);
            const minutes = Math.abs(timeDiffMinutes) % 60;
            const earlyText = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
            statusMessage = `${earlyText} adiantado`;
          }

          // Criar notificação para o paciente (não para quem confirmou)
          const notification = await createEnterpriseNotification({
            userId: log.patientId,
            type: 'medication_taken',
            title: 'Medicamento Tomado',
            message: `${medication.name} foi tomado ${statusMessage}`,
            patientId: log.patientId,
            relatedId: updatedLog.id
          });

          // Broadcast notificação em tempo real
          broadcastUpdate(log.patientId, 'notification_created', { notification });
        }
      }

      // Broadcast update to connected clients
      broadcastUpdate(req.user.id, 'medication_log_taken', { log: updatedLog });

      res.json(updatedLog);
    } catch (error) {

      res.status(500).json({ message: "Erro ao marcar como tomado" });
    }
  });

  // Patient Data Sharing Routes

  // Generate sharing code for patient
  router.post("/patient/generate-share-code", authenticateToken, async (req, res) => {
    try {
      if (req.user.profileType !== 'patient') {
        return res.status(403).json({ message: "Apenas pacientes podem gerar códigos de compartilhamento" });
      }

      // Generate a unique sharing code
      const shareCode = `share_${req.user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Store or update the sharing code for this patient
      await storage.updateUserShareCode(req.user.id, shareCode);

      res.json({ shareCode });
    } catch (error) {

      res.status(500).json({ message: "Erro ao gerar código de compartilhamento" });
    }
  });

  // 🗃️ ROTA OTIMIZADA: Get basic patient's data
  router.get("/patients/:id/basic", authenticateToken, async (req: any, res) => {
    try {
      const patientId = parseInt(req.params.id);

      // Verificar se cuidador tem acesso a este paciente
      if (req.user.profileType !== 'patient') {
        const hasAccess = await storage.checkCareRelationship(patientId, req.user.id);
        if (!hasAccess && req.user.id !== patientId) {
          return res.status(403).json({ message: "Acesso negado" });
        }
      }

      // Buscar APENAS dados básicos (sem dados médicos)
      const basicData = await storage.getPatientBasicData(patientId);

      if (!basicData) {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }

      res.json(basicData);
    } catch (error) {
      console.error('Error getting patient basic data:', error);
      res.status(500).json({ message: "Erro ao buscar dados básicos do paciente" });
    }
  });

  // Get patients accessible by caregiver
  router.get("/caregiver/patients", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.profileType === 'patient') {
        return res.status(403).json({ message: "Pacientes não podem acessar esta rota" });
      }

      const patients = await storage.getPatientsAccessibleByCaregiverId(req.user.id);

      res.json({ patients });
    } catch (error) {
      console.error('Error getting accessible patients:', error);
      res.status(500).json({ message: "Erro ao buscar pacientes acessíveis" });
    }
  });

  // ⚡ ROTA OTIMIZADA: Get basic caregiver's patients data
  router.get("/caregiver/patients/basic", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.profileType === 'patient') {
        return res.status(403).json({ message: "Pacientes não podem acessar esta rota" });
      }

      const patients = await storage.getPatientsAccessibleByCaregiverIdBasic(req.user.id);

      res.json({ patients });
    } catch (error) {
      console.error('Error getting basic accessible patients:', error);
      res.status(500).json({ message: "Erro ao buscar dados básicos dos pacientes" });
    }
  });

  // 🔍 Search patients accessible by caregiver (filtered search)
  router.get("/users/search-patients", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.profileType === 'patient') {
        return res.status(403).json({ message: "Pacientes não podem pesquisar outros pacientes" });
      }

      const searchQuery = req.query.q as string;

      if (!searchQuery || searchQuery.trim().length < 2) {
        return res.status(400).json({ message: "Query de busca deve ter pelo menos 2 caracteres" });
      }

      // Search only among patients that this caregiver has access to
      const patients = await storage.searchAccessiblePatients(req.user.id, searchQuery.trim());

      res.json({ patients });
    } catch (error) {
      console.error('Error searching accessible patients:', error);
      res.status(500).json({ message: "Erro ao buscar pacientes" });
    }
  });

  // 🔄 SISTEMA DE CONTEXTO PERSISTENTE: Switch context to a patient (for caregivers)
  router.post("/caregiver/switch-patient", authenticateToken, async (req: any, res) => {
    try {
      const { patientId } = req.body;

      if (req.user.profileType === 'patient') {
        return res.status(403).json({ message: "Pacientes não podem trocar contexto" });
      }

      if (!patientId) {
        return res.status(400).json({ message: "ID do paciente é obrigatório" });
      }

      // Verify caregiver has access to this patient
      const hasAccess = await storage.checkCareRelationship(patientId, req.user.id);

      if (!hasAccess) {
        return res.status(403).json({ message: "Você não tem acesso aos dados deste paciente" });
      }

      // Get patient data to confirm access
      const patient = await storage.getUser(patientId);

      if (!patient || patient.profileType !== 'patient') {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }

      // 🔧 SOLUÇÃO: Armazenar contexto na sessão para persistência entre requisições
      req.session.selectedPatientId = parseInt(patientId);
      req.session.caregiverId = req.user.id;
      req.session.userProfile = req.user.profileType;

      // Também definir na requisição atual para uso imediato
      req.selectedPatientId = parseInt(patientId);
      req.caregiverId = req.user.id;

      console.log(`✅ Contexto salvo na sessão: cuidador ${req.user.id} -> paciente ${patientId}`);

      res.json({
        message: "Contexto alterado com sucesso",
        patient: { id: patient.id, name: patient.name, email: patient.email },
        session: {
          selectedPatientId: req.session.selectedPatientId,
          caregiverId: req.session.caregiverId
        }
      });
    } catch (error) {
      console.error('Error switching patient context:', error);
      res.status(500).json({ message: "Erro ao trocar contexto do paciente" });
    }
  });

  // Clear patient context (return to caregiver's own data)
  router.delete("/caregiver/clear-patient-context", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.profileType === 'patient') {
        return res.status(403).json({ message: "Pacientes não podem limpar contexto" });
      }

      // 🔧 SOLUÇÃO: Limpar contexto da sessão
      if (req.session) {
        delete req.session.selectedPatientId;
        delete req.session.caregiverId;
        console.log(`🧹 Contexto limpo da sessão para cuidador ${req.user.id}`);
      }

      // Clear patient context from current request
      delete req.selectedPatientId;
      delete req.caregiverId;

      res.json({
        message: "Contexto limpo com sucesso",
        caregiver: { id: req.user.id, name: req.user.name, email: req.user.email }
      });
    } catch (error) {
      console.error('Error clearing patient context:', error);
      res.status(500).json({ message: "Erro ao limpar contexto do paciente" });
    }
  });

  // Get shared access list for patient
  router.get("/patient/shared-access", authenticateToken, async (req, res) => {
    try {
      if (req.user.profileType !== 'patient') {
        return res.status(403).json({ message: "Apenas pacientes podem ver acessos compartilhados" });
      }

      const sharedAccess = await storage.getPatientSharedAccess(req.user.id);
      res.json(sharedAccess);
    } catch (error) {

      res.status(500).json({ message: "Erro ao buscar acessos compartilhados" });
    }
  });

  // Remove shared access
  router.delete("/patient/shared-access/:accessId", authenticateToken, async (req, res) => {
    try {
      if (req.user.profileType !== 'patient') {
        return res.status(403).json({ message: "Apenas pacientes podem remover acessos" });
      }

      const accessId = parseInt(req.params.accessId);
      await storage.removeSharedAccess(accessId, req.user.id);

      res.json({ message: "Acesso removido com sucesso" });
    } catch (error) {

      res.status(500).json({ message: "Erro ao remover acesso" });
    }
  });

  // Use sharing code to gain access (for all non-patient profiles)
  router.post("/caregiver/use-share-code", authenticateToken, async (req, res) => {
    try {
      if (req.user.profileType === 'patient') {
        return res.status(403).json({ message: "Pacientes não podem usar códigos de compartilhamento" });
      }

      const { shareCode } = req.body;
      if (!shareCode) {
        return res.status(400).json({ message: "Código de compartilhamento é obrigatório" });
      }

      const result = await storage.useShareCode(shareCode, req.user.id);

      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }

      res.json({ message: "Acesso concedido com sucesso", patient: result.patient });
    } catch (error) {

      res.status(500).json({ message: "Erro ao usar código de compartilhamento" });
    }
  });

  // ===== MEDICAL EVOLUTIONS ROUTES =====

  // Get medical evolutions by patient
  router.get("/medical-evolutions", authenticateToken, restorePatientContext, async (req, res) => {
    try {
      const { user } = req;

      // Se for médico, mostrar todas as evoluções
      if (user?.profileType === 'doctor') {
        const evolutions = await storage.getAllMedicalEvolutions();
        res.json(evolutions || []);
      } else {
        const patientId = getEffectivePatientId(req);
        const evolutions = await storage.getMedicalEvolutionsByPatient(patientId);
        res.json(evolutions);
      }
    } catch (error) {
      console.error("Error fetching medical evolutions:", error);
      res.status(500).json({ message: "Erro ao buscar evoluções médicas" });
    }
  });

  // Routes for vital signs in medical evolutions
  router.post("/medical-evolutions/:id/vital-signs/pressure", authenticateToken, async (req, res) => {
    try {
      const evolutionId = parseInt(req.params.id);
      const readingData = {
        ...req.body,
        medicalEvolutionId: evolutionId,
        patientId: req.body.patientId,
        doctorId: req.user.id,
        measuredAt: new Date(req.body.measuredAt)
      };
      const reading = await storage.createBloodPressureReading(readingData);
      res.status(201).json(reading);
    } catch (error) {
      console.error("Error creating blood pressure reading:", error);
      res.status(500).json({ message: "Erro ao salvar pressão arterial" });
    }
  });

  router.post("/medical-evolutions/:id/vital-signs/glucose", authenticateToken, async (req, res) => {
    try {
      const evolutionId = parseInt(req.params.id);
      const readingData = {
        ...req.body,
        medicalEvolutionId: evolutionId,
        patientId: req.body.patientId,
        doctorId: req.user.id,
        measuredAt: new Date(req.body.measuredAt)
      };
      const reading = await storage.createGlucoseReading(readingData);
      res.status(201).json(reading);
    } catch (error) {
      console.error("Error creating glucose reading:", error);
      res.status(500).json({ message: "Erro ao salvar glicemia" });
    }
  });

  router.post("/medical-evolutions/:id/vital-signs/heart-rate", authenticateToken, async (req, res) => {
    try {
      const evolutionId = parseInt(req.params.id);
      const readingData = {
        ...req.body,
        medicalEvolutionId: evolutionId,
        patientId: req.body.patientId,
        doctorId: req.user.id,
        measuredAt: new Date(req.body.measuredAt)
      };
      const reading = await storage.createHeartRateReading(readingData);
      res.status(201).json(reading);
    } catch (error) {
      console.error("Error creating heart rate reading:", error);
      res.status(500).json({ message: "Erro ao salvar batimentos cardíacos" });
    }
  });

  router.post("/medical-evolutions/:id/vital-signs/temperature", authenticateToken, async (req, res) => {
    try {
      const evolutionId = parseInt(req.params.id);
      const readingData = {
        ...req.body,
        medicalEvolutionId: evolutionId,
        patientId: req.body.patientId,
        doctorId: req.user.id,
        measuredAt: new Date(req.body.measuredAt)
      };
      const reading = await storage.createTemperatureReading(readingData);
      res.status(201).json(reading);
    } catch (error) {
      console.error("Error creating temperature reading:", error);
      res.status(500).json({ message: "Erro ao salvar temperatura" });
    }
  });

  router.post("/medical-evolutions/:id/vital-signs/weight", authenticateToken, async (req, res) => {
    try {
      const evolutionId = parseInt(req.params.id);
      const readingData = {
        ...req.body,
        medicalEvolutionId: evolutionId,
        patientId: req.body.patientId,
        doctorId: req.user.id,
        measuredAt: new Date(req.body.measuredAt)
      };
      const reading = await storage.createWeightReading(readingData);
      res.status(201).json(reading);
    } catch (error) {
      console.error("Error creating weight reading:", error);
      res.status(500).json({ message: "Erro ao salvar peso" });
    }
  });

  router.delete("/vital-signs/pressure/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteBloodPressureReading(id);
      if (deleted) {
        res.json({ message: "Pressão arterial removida com sucesso" });
      } else {
        res.status(404).json({ message: "Pressão arterial não encontrada" });
      }
    } catch (error) {
      console.error("Error deleting blood pressure reading:", error);
      res.status(500).json({ message: "Erro ao remover pressão arterial" });
    }
  });

  router.delete("/vital-signs/glucose/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteGlucoseReading(id);
      if (deleted) {
        res.json({ message: "Glicemia removida com sucesso" });
      } else {
        res.status(404).json({ message: "Glicemia não encontrada" });
      }
    } catch (error) {
      console.error("Error deleting glucose reading:", error);
      res.status(500).json({ message: "Erro ao remover glicemia" });
    }
  });

  router.delete("/vital-signs/heart-rate/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteHeartRateReading(id);
      if (deleted) {
        res.json({ message: "Batimentos cardíacos removidos com sucesso" });
      } else {
        res.status(404).json({ message: "Batimentos cardíacos não encontrados" });
      }
    } catch (error) {
      console.error("Error deleting heart rate reading:", error);
      res.status(500).json({ message: "Erro ao remover batimentos cardíacos" });
    }
  });

  router.delete("/vital-signs/temperature/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteTemperatureReading(id);
      if (deleted) {
        res.json({ message: "Temperatura removida com sucesso" });
      } else {
        res.status(404).json({ message: "Temperatura não encontrada" });
      }
    } catch (error) {
      console.error("Error deleting temperature reading:", error);
      res.status(500).json({ message: "Erro ao remover temperatura" });
    }
  });

  router.delete("/vital-signs/weight/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteWeightReading(id);
      if (deleted) {
        res.json({ message: "Peso removido com sucesso" });
      } else {
        res.status(404).json({ message: "Peso não encontrado" });
      }
    } catch (error) {
      console.error("Error deleting weight reading:", error);
      res.status(500).json({ message: "Erro ao remover peso" });
    }
  });

  // Get medical evolution by ID
  router.get("/medical-evolutions/:id", authenticateToken, async (req, res) => {
    try {
      const evolutionId = parseInt(req.params.id);
      const evolution = await storage.getMedicalEvolutionById(evolutionId);

      if (!evolution) {
        return res.status(404).json({ message: "Evolução médica não encontrada" });
      }

      // Buscar prescrições relacionadas à evolução
      const prescriptions = await storage.getPrescriptionsByEvolution(evolutionId);

      // Buscar requisições de exame relacionadas à evolução
      const examRequests = await storage.getExamRequestsByEvolution(evolutionId);

      // Buscar sinais vitais relacionados à evolução
      const bloodPressureReadings = await storage.getBloodPressureByEvolution(evolutionId);
      const glucoseReadings = await storage.getGlucoseByEvolution(evolutionId);
      const heartRateReadings = await storage.getHeartRateByEvolution(evolutionId);
      const temperatureReadings = await storage.getTemperatureByEvolution(evolutionId);
      const weightReadings = await storage.getWeightByEvolution(evolutionId);

      // Organizar sinais vitais no formato esperado pelo frontend
      const vitalSigns = {
        bloodPressure: bloodPressureReadings,
        glucose: glucoseReadings,
        heartRate: heartRateReadings,
        temperature: temperatureReadings,
        weight: weightReadings
      };

      // Retornar evolução com prescrições, requisições e sinais vitais
      const evolutionWithRelated = {
        ...evolution,
        prescriptions,
        examRequests,
        vitalSigns
      };

      res.json(evolutionWithRelated);
    } catch (error) {
      console.error('❌ Erro ao buscar evolução médica:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Get medical evolutions by appointment
  router.get("/appointments/:appointmentId/evolutions", authenticateToken, async (req, res) => {
    try {
      const appointmentId = parseInt(req.params.appointmentId);
      const evolutions = await storage.getMedicalEvolutionsByAppointment(appointmentId);
      res.json(evolutions);
    } catch (error) {
      console.error("Error fetching evolutions by appointment:", error);
      res.status(500).json({ message: "Erro ao buscar evoluções da consulta" });
    }
  });

  // Create medical evolution
  router.post("/medical-evolutions", authenticateToken, async (req, res) => {
    try {
      const { vitalSignsData, prescriptionsData, examRequisitionsData, ...evolutionData } = req.body;

      // Apenas médicos podem criar evoluções médicas
      if (req.user.profileType !== 'doctor') {
        return res.status(403).json({ message: "Apenas médicos podem criar evoluções médicas" });
      }

      // Converter dates
      if (evolutionData.followUpDate) {
        evolutionData.followUpDate = new Date(evolutionData.followUpDate);
      }

      // Adicionar dados do médico
      const processedData = {
        ...evolutionData,
        doctorId: req.user.id,
        doctorName: req.user.name,
        doctorCrm: req.user.crm || null
        // createdAt e updatedAt serão definidos automaticamente pelo banco
      };

      console.log('🏥 Dados da evolução processados:', processedData);

      const evolutionDataParsed = insertMedicalEvolutionSchema.parse(processedData);
      const evolution = await storage.createMedicalEvolution(evolutionDataParsed);
      console.log('✅ Evolução médica criada com ID:', evolution.id);

      let prescriptionsCreated = 0;
      let examRequestsCreated = 0;

      // Processar prescrições
      if (prescriptionsData && Array.isArray(prescriptionsData) && prescriptionsData.length > 0) {
        console.log('📝 Processando', prescriptionsData.length, 'prescrições...');
        for (const prescription of prescriptionsData) {
          try {
            const prescriptionToCreate = {
              patientId: evolution.patientId,
              encounterId: evolution.encounterId || null,
              medicalEvolutionId: evolution.id,
              doctorName: prescription.doctorName || req.user.name,
              title: prescription.title,
              description: prescription.description,
              prescriptionDate: new Date(prescription.date),
              createdAt: new Date()
            };

            console.log('📋 Criando prescrição:', prescriptionToCreate.title);
            await storage.createPrescription(prescriptionToCreate);
            prescriptionsCreated++;
            console.log('✅ Prescrição criada:', prescription.title);
          } catch (prescriptionError) {
            console.error('❌ Erro ao salvar prescrição:', prescriptionError);
          }
        }
      }

      // Processar requisições de exames
      if (examRequisitionsData && Array.isArray(examRequisitionsData) && examRequisitionsData.length > 0) {
        console.log('🔬 Processando', examRequisitionsData.length, 'requisições de exames...');
        for (const exam of examRequisitionsData) {
          try {
            const examRequestToCreate = {
              patientId: evolution.patientId,
              doctorId: req.user.id,
              doctorName: req.user.name,
              doctorCrm: req.user.crm || null,
              encounterId: evolution.encounterId || null,
              medicalEvolutionId: evolution.id,
              examName: exam.examName,
              examCategory: exam.category,
              clinicalIndication: exam.clinicalIndication,
              urgency: exam.urgency || 'normal',
              validityDate: exam.validityDate ? new Date(exam.validityDate) : null,
              specialInstructions: exam.specialInstructions,
              medicalNotes: exam.medicalObservations,
              status: 'pending',
              createdAt: new Date()
            };

            console.log('🧪 Criando requisição:', examRequestToCreate.examName);
            await storage.createExamRequest(examRequestToCreate);
            examRequestsCreated++;
            console.log('✅ Requisição criada:', exam.examName);
          } catch (examError) {
            console.error('❌ Erro ao salvar requisição de exame:', examError);
          }
        }
      }

      // Processar sinais vitais
      if (vitalSignsData && Array.isArray(vitalSignsData) && vitalSignsData.length > 0) {
        for (const vitalSign of vitalSignsData) {
          try {
            const baseData = {
              patientId: evolution.patientId,
              medicalEvolutionId: evolution.id,
              doctorId: req.user.id,
              measuredAt: new Date(vitalSign.measuredAt),
              notes: vitalSign.notes,
              createdAt: new Date()
            };

            switch (vitalSign.type) {
              case 'pressure':
                if (vitalSign.systolic && vitalSign.diastolic) {
                  await storage.createBloodPressureReading({
                    ...baseData,
                    systolic: parseInt(vitalSign.systolic),
                    diastolic: parseInt(vitalSign.diastolic),
                    heartRate: vitalSign.heartRate ? parseInt(vitalSign.heartRate) : null
                  });
                }
                break;
              case 'glucose':
                if (vitalSign.glucoseLevel) {
                  await storage.createGlucoseReading({
                    ...baseData,
                    glucoseLevel: parseFloat(vitalSign.glucoseLevel),
                    measurementType: vitalSign.measurementType || 'random'
                  });
                }
                break;
              case 'heart-rate':
                if (vitalSign.heartRate) {
                  await storage.createHeartRateReading({
                    ...baseData,
                    heartRate: parseInt(vitalSign.heartRate),
                    measurementType: vitalSign.measurementType || 'resting'
                  });
                }
                break;
              case 'temperature':
                if (vitalSign.temperature) {
                  await storage.createTemperatureReading({
                    ...baseData,
                    temperature: parseFloat(vitalSign.temperature),
                    measurementMethod: vitalSign.method || 'oral'
                  });
                }
                break;
              case 'weight':
                if (vitalSign.weight) {
                  await storage.createWeightReading({
                    ...baseData,
                    weight: parseFloat(vitalSign.weight),
                    height: vitalSign.height ? parseFloat(vitalSign.height) : null
                  });
                }
                break;
            }
          } catch (vitalSignError) {
            console.error('Erro ao salvar sinal vital:', vitalSignError);
          }
        }
      }

      console.log('📊 Resumo da criação:', {
        evolutionId: evolution.id,
        prescriptionsCreated,
        examRequestsCreated,
        vitalSignsProcessed: vitalSignsData?.length || 0
      });

      // Criar notificação de nova evolução médica
      const notification = await createEnterpriseNotification({
        userId: evolutionData.patientId,
        type: 'medical_evolution_created',
        title: 'Nova Evolução Médica',
        message: `Dr(a). ${req.user.name} criou uma nova evolução médica${prescriptionsCreated > 0 ? ` com ${prescriptionsCreated} prescrição(ões)` : ''}${examRequestsCreated > 0 ? ` e ${examRequestsCreated} requisição(ões) de exame` : ''}`,
        patientId: evolutionData.patientId,
        relatedId: evolution.id
      }, req, {
        afterState: evolution,
        sessionId: req.session?.id || req.sessionID
      });

      // Broadcast notificação em tempo real
      broadcastUpdate(evolutionData.patientId, 'notification_created', { notification });
      broadcastUpdate(evolutionData.patientId, 'medical_evolution_created', { evolution });

      res.status(201).json({
        evolution,
        prescriptionsCreated,
        examRequestsCreated,
        message: `Evolução médica criada com sucesso${prescriptionsCreated > 0 ? ` com ${prescriptionsCreated} prescrição(ões)` : ''}${examRequestsCreated > 0 ? ` e ${examRequestsCreated} requisição(ões) de exame` : ''}`
      });
    } catch (error) {
      console.error("Error creating medical evolution:", error);
      res.status(400).json({ message: "Erro ao criar evolução médica" });
    }
  });

  // Update medical evolution
  router.put("/medical-evolutions/:id", authenticateToken, async (req, res) => {
    try {
      // Apenas médicos podem editar evoluções médicas
      if (req.user.profileType !== 'doctor') {
        return res.status(403).json({ message: "Apenas médicos podem editar evoluções médicas" });
      }

      const evolutionId = parseInt(req.params.id);
      const existingEvolution = await storage.getMedicalEvolutionById(evolutionId);

      if (!existingEvolution) {
        return res.status(404).json({ message: "Evolução médica não encontrada" });
      }

      const { vitalSignsData, prescriptionsData, examRequisitionsData, ...mainEvolutionData } = req.body;

      // Remover updatedAt dos evolutionFields para permitir que o banco use NOW() automaticamente
      const { updatedAt: _, ...cleanEvolutionFields } = mainEvolutionData;

      const evolutionDataToUpdate = {
        ...cleanEvolutionFields,
        updatedAt: new Date() // Definir explicitamente updatedAt
      };

      const evolution = await storage.updateMedicalEvolution(evolutionId, evolutionDataToUpdate);

      if (!evolution) {
        return res.status(404).json({ message: "Evolução médica não encontrada" });
      }

      let prescriptionsUpdated = 0;
      let examRequestsUpdated = 0;

      // Processar prescrições (quando há dados para atualizar)
      if (prescriptionsData && Array.isArray(prescriptionsData)) {
        console.log('📝 Atualizando', prescriptionsData.length, 'prescrições...');

        // Remover prescrições existentes da evolução
        try {
          await storage.deletePrescriptionsByEvolution(evolutionId);
          console.log('🗑️ Prescrições antigas removidas');
        } catch (error) {
          console.warn('Erro ao remover prescrições antigas:', error);
        }

        // Adicionar novas prescrições
        for (const prescription of prescriptionsData) {
          try {
            const prescriptionToCreate = {
              patientId: evolution.patientId,
              encounterId: evolution.encounterId || null,
              medicalEvolutionId: evolution.id,
              doctorName: prescription.doctorName || req.user.name,
              title: prescription.title,
              description: prescription.description,
              prescriptionDate: new Date(prescription.date),
              createdAt: new Date()
            };

            console.log('📋 Atualizando prescrição:', prescriptionToCreate.title);
            await storage.createPrescription(prescriptionToCreate);
            prescriptionsUpdated++;
            console.log('✅ Prescrição atualizada:', prescription.title);
          } catch (prescriptionError) {
            console.error('❌ Erro ao salvar prescrição:', prescriptionError);
          }
        }
      }

      // Processar requisições de exames (quando há dados para atualizar)
      if (examRequisitionsData && Array.isArray(examRequisitionsData)) {
        console.log('🔬 Atualizando', examRequisitionsData.length, 'requisições de exames...');

        // Remover requisições antigas da evolução
        try {
          await storage.deleteExamRequestsByEvolution(evolutionId);
          console.log('🗑️ Requisições antigas removidas');
        } catch (error) {
          console.warn('Erro ao remover requisições antigas:', error);
        }

        // Adicionar novas requisições
        for (const exam of examRequisitionsData) {
          try {
            const examRequestToCreate = {
              patientId: evolution.patientId,
              doctorId: req.user.id,
              doctorName: req.user.name,
              doctorCrm: req.user.crm || null,
              doctorGender: req.user.gender || null,
              medicalEvolutionId: evolution.id,
              examName: exam.examName,
              examCategory: exam.category,
              clinicalIndication: exam.clinicalIndication,
              urgency: exam.urgency || 'normal',
              specialInstructions: exam.specialInstructions,
              medicalNotes: exam.medicalObservations,
              validityDate: exam.validityDate ? new Date(exam.validityDate) : null,
              status: 'pending',
              createdAt: new Date()
            };

            console.log('🧪 Atualizando requisição:', examRequestToCreate.examName);
            await storage.createExamRequest(examRequestToCreate);
            examRequestsUpdated++;
            console.log('✅ Requisição atualizada:', exam.examName);
          } catch (examError) {
            console.error('❌ Erro ao salvar requisição de exame:', examError);
          }
        }
      }

      // Processar sinais vitais
      if (vitalSignsData && Array.isArray(vitalSignsData)) {
        console.log('💗 Processando sinais vitais de forma inteligente:', vitalSignsData.length);

        // Buscar sinais vitais existentes da evolução
        const existingEvolution = await storage.getMedicalEvolutionById(evolutionId);
        const existingVitalSigns = existingEvolution?.vitalSigns || {};

        // Mapear IDs existentes por tipo
        const existingIds = {
          pressure: (existingVitalSigns.bloodPressure || []).map((vs: any) => `db-pressure-${vs.id}`),
          glucose: (existingVitalSigns.glucose || []).map((vs: any) => `db-glucose-${vs.id}`),
          'heart-rate': (existingVitalSigns.heartRate || []).map((vs: any) => `db-heartrate-${vs.id}`),
          temperature: (existingVitalSigns.temperature || []).map((vs: any) => `db-temperature-${vs.id}`),
          weight: (existingVitalSigns.weight || []).map((vs: any) => `db-weight-${vs.id}`)
        };

        console.log('🔍 IDs existentes por tipo:', existingIds);

        // Coletar IDs dos sinais vitais que devem ser mantidos
        const vitalSignsToKeep = {
          bloodPressure: new Set<number>(),
          glucose: new Set<number>(),
          heartRate: new Set<number>(),
          temperature: new Set<number>(),
          weight: new Set<number>()
        };

        // Processar sinais vitais atuais
        for (const vitalSign of vitalSignsData) {
          if (vitalSign.id.startsWith('db-')) {
            // Sinal vital existente - marcar para manter
            const idParts = vitalSign.id.split('-');
            const type = idParts[1] as keyof typeof vitalSignsToKeep;
            const id = parseInt(idParts[2]);

            console.log(`🔄 Mantendo sinal vital existente: ${type} ID ${id}`);

            if (type === 'heart-rate') {
              vitalSignsToKeep['heart-rate'].add(id);
            } else if (vitalSignsToKeep[type]) {
              vitalSignsToKeep[type].add(id);
            }
          } else {
            // Sinal vital novo - será criado
            const vitalSignData = {
              patientId: evolution.patientId,
              medicalEvolutionId: evolutionId,
              doctorId: req.user.id,
              measuredAt: new Date(vitalSign.measuredAt),
              notes: vitalSign.notes || ''
            };

            console.log('➕ Criando sinal vital:', vitalSign.type, vitalSign.id);

            switch (vitalSign.type) {
              case 'pressure':
                await storage.createBloodPressureReading({
                  ...vitalSignData,
                  systolic: parseInt(vitalSign.systolic),
                  diastolic: parseInt(vitalSign.diastolic),
                  heartRate: vitalSign.heartRate ? parseInt(vitalSign.heartRate) : null
                });
                break;

              case 'glucose':
                await storage.createGlucoseReading({
                  ...vitalSignData,
                  glucoseLevel: parseFloat(vitalSign.glucoseLevel),
                  measurementType: vitalSign.measurementType || 'random'
                });
                break;

              case 'heart-rate':
                await storage.createHeartRateReading({
                  ...vitalSignData,
                  heartRate: parseInt(vitalSign.heartRate),
                  measurementType: vitalSign.measurementType || 'resting'
                });
                break;

              case 'temperature':
                await storage.createTemperatureReading({
                  ...vitalSignData,
                  temperature: parseFloat(vitalSign.temperature),
                  measurementMethod: vitalSign.method || 'oral'
                });
                break;

              case 'weight':
                await storage.createWeightReading({
                  ...vitalSignData,
                  weight: parseFloat(vitalSign.weight)
                });
                break;
            }
          }
        }

        console.log('🔍 Sinais vitais a manter:', {
          pressure: Array.from(vitalSignsToKeep.bloodPressure),
          glucose: Array.from(vitalSignsToKeep.glucose),
          heartRate: Array.from(vitalSignsToKeep.heartRate),
          temperature: Array.from(vitalSignsToKeep.temperature),
          weight: Array.from(vitalSignsToKeep.weight)
        });

        // Buscar sinais vitais existentes para deletar os removidos
        console.log('🗑️ Deletando sinais vitais removidos...');

        const existingBloodPressure = existingVitalSigns.bloodPressure || [];
        const existingGlucose = existingVitalSigns.glucose || [];
        const existingHeartRate = existingVitalSigns.heartRate || [];
        const existingTemperature = existingVitalSigns.temperature || [];
        const existingWeight = existingVitalSigns.weight || [];

        // Deletar pressões arteriais removidas
        for (const bp of existingBloodPressure) {
          if (!vitalSignsToKeep.bloodPressure.has(bp.id)) {
            console.log(`🗑️ Deletando pressão arterial ID ${bp.id}`);
            await storage.deleteBloodPressureReading(bp.id);
          }
        }

        // Deletar glicemias removidas
        for (const glucose of existingGlucose) {
          if (!vitalSignsToKeep.glucose.has(glucose.id)) {
            console.log(`🗑️ Deletando glicemia ID ${glucose.id}`);
            await storage.deleteGlucoseReading(glucose.id);
          }
        }

        // Deletar batimentos cardíacos removidos
        for (const hr of existingHeartRate) {
          if (!vitalSignsToKeep.heartRate.has(hr.id)) {
            console.log(`🗑️ Deletando batimento cardíaco ID ${hr.id}`);
            await storage.deleteHeartRateReading(hr.id);
          }
        }

        // Deletar temperaturas removidas
        for (const temp of existingTemperature) {
          if (!vitalSignsToKeep.temperature.has(temp.id)) {
            console.log(`🗑️ Deletando temperatura ID ${temp.id}`);
            await storage.deleteTemperatureReading(temp.id);
          }
        }

        // Deletar pesos removidos
        for (const weight of existingWeight) {
          if (!vitalSignsToKeep.weight.has(weight.id)) {
            console.log(`🗑️ Deletando peso ID ${weight.id}`);
            await storage.deleteWeightReading(weight.id);
          }
        }
      }

      // Determinar o que foi editado para notificação
      const changes = [];
      if (existingEvolution && mainEvolutionData.chiefComplaint && existingEvolution.chiefComplaint !== mainEvolutionData.chiefComplaint) {
        changes.push('queixa principal atualizada');
      }
      if (existingEvolution && mainEvolutionData.physicalExam && existingEvolution.physicalExam !== mainEvolutionData.physicalExam) {
        changes.push('exame físico atualizado');
      }
      if (existingEvolution && mainEvolutionData.diagnosticHypotheses && existingEvolution.diagnosticHypotheses !== mainEvolutionData.diagnosticHypotheses) {
        changes.push('hipóteses diagnósticas atualizadas');
      }

      // Adicionar informações sobre prescrições e requisições na mensagem
      let prescriptionInfo = '';
      let examInfo = '';

      if (prescriptionsData && prescriptionsData.length > 0) {
        prescriptionInfo = ` com ${prescriptionsData.length} prescrição(ões)`;
      }

      if (examRequisitionsData && examRequisitionsData.length > 0) {
        examInfo = ` e ${examRequisitionsData.length} requisição(ões) de exame`;
      }

      // Criar notificação de edição
      const notification = await createEnterpriseNotification({
        userId: req.user.id,
        type: 'medical_evolution_edited',
        title: 'Evolução Médica Atualizada',
        message: `Dr(a). ${req.user.name} atualizou uma evolução médica${prescriptionInfo}${examInfo}`,
        patientId: evolution.patientId,
        relatedId: evolution.id
      }, req, {
        beforeState: existingEvolution,
        afterState: evolution,
        sessionId: req.session?.id || req.sessionID
      });

      // Broadcast notificação em tempo real
      broadcastUpdate(evolution.patientId, 'notification_created', { notification });

      // Broadcast update to connected clients
      broadcastUpdate(evolution.patientId, 'medical_evolution_updated', { evolution });

      console.log('✅ Evolução médica atualizada com sucesso');
      res.json(evolution);
    } catch (error) {
      console.error('❌ Erro ao atualizar evolução médica:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Delete medical evolution
  router.delete("/medical-evolutions/:id", authenticateToken, async (req, res) => {
    try {
      // Apenas médicos podem deletar evoluções médicas
      if (req.user.profileType !== 'doctor') {
        return res.status(403).json({ message: "Apenas médicos podem deletar evoluções médicas" });
      }

      const evolutionId = parseInt(req.params.id);
      const success = await storage.deleteMedicalEvolution(evolutionId);

      if (!success) {
        return res.status(404).json({ message: "Evolução médica não encontrada" });
      }

      // Broadcast update to connected clients
      broadcastUpdate(req.user.id, 'medical_evolution_deleted', { evolutionId });

      res.json({ message: "Evolução médica removida com sucesso" });
    } catch (error) {
      console.error("Error deleting medical evolution:", error);
      res.status(500).json({ message: "Erro ao remover evolução médica" });
    }
  });

  // WebSocket será configurado no index.ts
  return router;
}