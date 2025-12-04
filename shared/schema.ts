import { pgTable, text, serial, integer, boolean, timestamp, real, varchar, uuid, index, unique, decimal } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  age: integer("age"),
  weight: real("weight"), // Peso em kg
  whatsapp: varchar("whatsapp", { length: 20 }), // Campo WhatsApp
  gender: varchar("gender", { length: 10 }), // 'masculino', 'feminino'
  profileType: varchar("profile_type", { length: 20 }).notNull(), // 'patient', 'caregiver', 'doctor', 'family', 'nurse'
  crm: varchar("crm", { length: 50 }), // CRM para médicos (ex: 12345-SP)
  photo: text("photo"),
  shareCode: text("share_code"), // Código de compartilhamento de dados médicos
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const careRelationships = pgTable("care_relationships", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => users.id).notNull(),
  caregiverId: integer("caregiver_id").references(() => users.id).notNull(),
  status: varchar("status", { length: 20 }).default("active").notNull(), // 'active', 'inactive'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const medications = pgTable("medications", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  dosage: text("dosage").notNull(),
  frequency: text("frequency").notNull(), // 'daily', 'twice_daily', 'every_8h', etc.
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  instructions: text("instructions"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const medicationSchedules = pgTable("medication_schedules", {
  id: serial("id").primaryKey(),
  medicationId: integer("medication_id").references(() => medications.id).notNull(),
  scheduledTime: text("scheduled_time").notNull(), // Format: "HH:MM"
  isActive: boolean("is_active").default(true).notNull(),
});

export const medicationLogs = pgTable("medication_logs", {
  id: serial("id").primaryKey(),
  medicationId: integer("medication_id").references(() => medications.id).notNull(),
  scheduleId: integer("schedule_id").references(() => medicationSchedules.id),
  patientId: integer("patient_id").references(() => users.id).notNull(),
  scheduledDateTime: timestamp("scheduled_date_time").notNull(),
  actualDateTime: timestamp("actual_date_time"),
  status: varchar("status", { length: 20 }).notNull(), // 'taken', 'missed', 'pending'
  delayMinutes: integer("delay_minutes").default(0),
  confirmedBy: integer("confirmed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const medicationHistory = pgTable("medication_history", {
  id: serial("id").primaryKey(),
  medicationLogId: integer("medication_log_id").references(() => medicationLogs.id).notNull(),
  medicationId: integer("medication_id").references(() => medications.id).notNull(),
  patientId: integer("patient_id").references(() => users.id).notNull(),
  scheduledDateTime: timestamp("scheduled_date_time").notNull(),
  actualDateTime: timestamp("actual_date_time"),
  notes: text("notes"),
  sideEffects: text("side_effects"),
  effectiveness: varchar("effectiveness", { length: 20 }), // 'very_effective', 'effective', 'somewhat_effective', 'not_effective'
  symptoms: text("symptoms"),
  additionalInfo: text("additional_info"),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  doctorName: text("doctor_name").notNull(),
  location: text("location").notNull(),
  appointmentDate: timestamp("appointment_date").notNull(),
  notes: text("notes"),
  status: varchar("status", { length: 20 }).default("scheduled").notNull(), // 'scheduled', 'in_progress', 'completed', 'cancelled'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Nova tabela: medicalEncounters (Ficha de Atendimento)
export const medicalEncounters = pgTable("medical_encounters", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => users.id).notNull(),
  doctorId: integer("doctor_id").references(() => users.id).notNull(),
  appointmentId: integer("appointment_id").references(() => appointments.id), // Pode ser null para atendimentos avulsos
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"), // Opcional
  summary: text("summary"), // Resumo geral do atendimento
  status: varchar("status", { length: 20 }).default("in_progress").notNull(), // 'in_progress', 'completed'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  patientIdIdx: index("medical_encounters_patient_id_idx").on(table.patientId),
  doctorIdIdx: index("medical_encounters_doctor_id_idx").on(table.doctorId),
  appointmentIdIdx: index("medical_encounters_appointment_id_idx").on(table.appointmentId),
  statusIdx: index("medical_encounters_status_idx").on(table.status),
  startTimeIdx: index("medical_encounters_start_time_idx").on(table.startTime),
}));

// Nova tabela para requisições médicas de exames
export const examRequests = pgTable("exam_requests", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => users.id).notNull(),
  doctorId: integer("doctor_id").references(() => users.id).notNull(),
  doctorName: text("doctor_name").notNull(),
  doctorCrm: text("doctor_crm"),
  doctorGender: varchar("doctor_gender", { length: 10 }), // 'male', 'female'

  // Vinculações aos atendimentos e evoluções
  encounterId: integer("encounter_id").references(() => medicalEncounters.id), // Vinculação ao atendimento (opcional)
  medicalEvolutionId: integer("medical_evolution_id").references(() => medicalEvolutions.id), // Vinculação à evolução médica (obrigatório quando há evolução)

  // Detalhes da requisição médica
  examName: text("exam_name").notNull(),
  examCategory: text("exam_category").notNull(), // Laboratorial, Imagem, Cardiológico, etc.
  clinicalIndication: text("clinical_indication").notNull(),
  urgency: varchar("urgency", { length: 20 }).default("normal").notNull(), // normal, urgent, very_urgent

  // Instruções médicas
  specialInstructions: text("special_instructions"), // Jejum, medicação, etc.
  medicalNotes: text("medical_notes"),
  validityDate: timestamp("validity_date"), // Validade da requisição

  // Controle da requisição
  status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, scheduled, completed, cancelled
  scheduledTestId: integer("scheduled_test_id"), // Referência ao teste agendado

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  patientIdIdx: index("exam_requests_patient_id_idx").on(table.patientId),
  doctorIdIdx: index("exam_requests_doctor_id_idx").on(table.doctorId),
  statusIdx: index("exam_requests_status_idx").on(table.status),
  encounterIdIdx: index("exam_requests_encounter_id_idx").on(table.encounterId),
  medicalEvolutionIdIdx: index("exam_requests_medical_evolution_id_idx").on(table.medicalEvolutionId),
}));

export const tests = pgTable("tests", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => users.id).notNull(),
  examRequestId: integer("exam_request_id").references(() => examRequests.id), // Link para requisição médica
  encounterId: integer("encounter_id").references(() => medicalEncounters.id), // Vinculação ao atendimento
  name: text("name").notNull(),
  type: text("type").notNull(),
  location: text("location").notNull(),
  testDate: timestamp("test_date").notNull(),
  results: text("results"),
  filePath: text("file_path"),
  preparationNotes: text("preparation_notes"), // Instruções específicas de preparo
  status: varchar("status", { length: 20 }).default("scheduled").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  examRequestIdIdx: index("tests_exam_request_id_idx").on(table.examRequestId),
  encounterIdIdx: index("tests_encounter_id_idx").on(table.encounterId),
}));

export const prescriptions = pgTable("prescriptions", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => users.id).notNull(),
  encounterId: integer("encounter_id").references(() => medicalEncounters.id), // Vinculação ao atendimento (opcional)
  medicalEvolutionId: integer("medical_evolution_id").references(() => medicalEvolutions.id), // Vinculação à evolução médica (obrigatório quando há evolução)
  doctorName: text("doctor_name").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  filePath: text("file_path"),
  prescriptionDate: timestamp("prescription_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  patientIdIdx: index("prescriptions_patient_id_idx").on(table.patientId),
  encounterIdIdx: index("prescriptions_encounter_id_idx").on(table.encounterId),
  medicalEvolutionIdIdx: index("prescriptions_medical_evolution_id_idx").on(table.medicalEvolutionId),
}));

export const medicalEvolutions = pgTable("medical_evolutions", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => users.id).notNull(),
  doctorId: integer("doctor_id").references(() => users.id).notNull(),
  doctorName: text("doctor_name").notNull(),
  doctorCrm: text("doctor_crm"), // CRM do médico
  appointmentId: integer("appointment_id").references(() => appointments.id), // Evolução vinculada a uma consulta específica (opcional)
  encounterId: integer("encounter_id").references(() => medicalEncounters.id), // Vinculação ao atendimento

  // Estrutura essencial para Evolução Médica
  chiefComplaint: text("chief_complaint").notNull(), // Queixa principal
  currentIllnessHistory: text("current_illness_history"), // História da doença atual (HDA)
  physicalExam: text("physical_exam"), // Exame físico e observações clínicas
  vitalSigns: text("vital_signs"), // Sinais vitais (JSON ou texto estruturado)
  diagnosticHypotheses: text("diagnostic_hypotheses"), // Hipóteses diagnósticas
  therapeuticPlan: text("therapeutic_plan"), // Conduta/Plano terapêutico
  prescribedMedications: text("prescribed_medications"), // Medicamentos prescritos
  requestedExams: text("requested_exams"), // Exames solicitados
  generalRecommendations: text("general_recommendations"), // Recomendações gerais
  additionalObservations: text("additional_observations"), // Observações adicionais

  // Controle e assinatura
  isConfirmed: boolean("is_confirmed").default(false), // Se foi confirmada pelo médico
  digitalSignature: text("digital_signature"), // Assinatura digital automática
  followUpDate: timestamp("follow_up_date"), // Data de retorno sugerido

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => ({
  // Índices para performance
  patientIdIdx: index("medical_evolutions_patient_id_idx").on(table.patientId),
  doctorIdIdx: index("medical_evolutions_doctor_id_idx").on(table.doctorId),
  appointmentIdIdx: index("medical_evolutions_appointment_id_idx").on(table.appointmentId),
  encounterIdIdx: index("medical_evolutions_encounter_id_idx").on(table.encounterId),
  createdAtIdx: index("medical_evolutions_created_at_idx").on(table.createdAt),
}));

// ========================================
// SISTEMA DE NOTIFICAÇÕES ENTERPRISE-GRADE
// ========================================

// TABELA MESTRE DE NOTIFICAÇÕES GLOBAIS
export const globalNotifications = pgTable("global_notifications", {
  id: serial("id").primaryKey(),

  // DADOS DO USUÁRIO QUE EXECUTOU A AÇÃO
  userId: integer("user_id").references(() => users.id), // Quem executou a ação
  userName: text("user_name"), // Cache do nome para performance

  // DADOS DO PACIENTE
  patientId: integer("patient_id").references(() => users.id),
  patientName: text("patient_name").notNull(), // Cache para performance

  // DADOS DA NOTIFICAÇÃO
  type: varchar("type", { length: 50 }).notNull(), // medication_reminder, appointment_reminder, test_reminder
  subtype: varchar("subtype", { length: 50 }), // before_time, on_time, overdue, missed
  title: text("title").notNull(),
  message: text("message").notNull(),

  // DADOS DO ITEM RELACIONADO
  relatedId: integer("related_id"), // ID do medicamento/consulta/exame
  relatedType: varchar("related_type", { length: 30 }), // medication, appointment, test
  relatedItemName: text("related_item_name"), // Nome para busca rápida

  // DADOS DE PRIORIDADE E TIMING
  priority: varchar("priority", { length: 20 }).default("normal").notNull(), // low, normal, high, critical
  urgencyScore: integer("urgency_score").default(0), // 0-100 para ordenação
  originalScheduledTime: timestamp("original_scheduled_time"), // Horário original do item
  notificationTriggerTime: timestamp("notification_trigger_time").notNull(), // Quando deve disparar

  // DADOS DE PROCESSAMENTO
  processedAt: timestamp("processed_at", { withTimezone: true }),
  distributedAt: timestamp("distributed_at", { withTimezone: true }),
  distributionCount: integer("distribution_count").default(0), // Quantos usuários receberam

  // DADOS DE LOTE PARA PERFORMANCE
  batchId: text("batch_id"), // UUID do lote de processamento
  processingNode: varchar("processing_node", { length: 50 }), // ID do servidor que processou

  // METADADOS
  metadata: text("metadata"), // JSON com dados extras
  deduplicationKey: text("deduplication_key"), // Evitar duplicatas

  // CONTROLE
  isActive: boolean("is_active").default(true).notNull(),
  retryCount: integer("retry_count").default(0),
  lastError: text("last_error"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  // ÍNDICES PARA PERFORMANCE EM PRODUÇÃO
  userIdIdx: index("global_notifications_user_id_idx").on(table.userId),
  patientIdIdx: index("global_notifications_patient_id_idx").on(table.patientId),
  triggerTimeIdx: index("global_notifications_trigger_time_idx").on(table.notificationTriggerTime),
  batchIdIdx: index("global_notifications_batch_id_idx").on(table.batchId),
  deduplicationIdx: index("global_notifications_deduplication_idx").on(table.deduplicationKey),
  typePatientIdx: index("global_notifications_type_patient_idx").on(table.type, table.patientId),
  priorityUrgencyIdx: index("global_notifications_priority_urgency_idx").on(table.priority, table.urgencyScore),
  activeCreatedIdx: index("global_notifications_active_created_idx").on(table.isActive, table.createdAt),
}));

// TABELA DE DISTRIBUIÇÃO DE NOTIFICAÇÕES PARA USUÁRIOS
export const userNotifications = pgTable("user_notifications", {
  id: serial("id").primaryKey(),

  // RELACIONAMENTOS
  userId: integer("user_id").references(() => users.id).notNull(), // Quem recebe
  globalNotificationId: integer("global_notification_id").references(() => globalNotifications.id).notNull(),

  // DADOS DO USUÁRIO (cache para performance)
  userProfileType: varchar("user_profile_type", { length: 20 }).notNull(), // patient, caregiver, doctor, family, nurse
  userName: text("user_name").notNull(),

  // DADOS DE ACESSO AO PACIENTE
  accessType: varchar("access_type", { length: 20 }).notNull(), // owner, caregiver, medical, family
  accessLevel: varchar("access_level", { length: 20 }).default("read").notNull(), // read, write, admin

  // STATUS DA NOTIFICAÇÃO
  deliveryStatus: varchar("delivery_status", { length: 20 }).default("pending").notNull(), // pending, delivered, failed, expired
  isRead: boolean("is_read").default(false).notNull(),

  // TIMESTAMPS
  deliveredAt: timestamp("delivered_at"),
  readAt: timestamp("read_at"),
  acknowledgedAt: timestamp("acknowledged_at"), // Quando usuário confirmou ciência

  // DADOS DE ENTREGA
  deliveryMethod: varchar("delivery_method", { length: 20 }).default("web").notNull(), // web, push, email, sms
  deliveryAttempts: integer("delivery_attempts").default(0),
  lastDeliveryError: text("last_delivery_error"),

  // CONTROLE
  priority: varchar("priority", { length: 20 }).default("normal").notNull(),
  expiresAt: timestamp("expires_at"), // Notificações podem expirar

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  // ÍNDICES PARA QUERIES RÁPIDAS EM PRODUÇÃO
  userIdIdx: index("user_notifications_user_id_idx").on(table.userId),
  globalNotificationIdIdx: index("user_notifications_global_id_idx").on(table.globalNotificationId),
  userReadStatusIdx: index("user_notifications_user_read_idx").on(table.userId, table.isRead),
  deliveryStatusIdx: index("user_notifications_delivery_status_idx").on(table.deliveryStatus),
  userProfileTypeIdx: index("user_notifications_profile_type_idx").on(table.userProfileType),
  accessTypeIdx: index("user_notifications_access_type_idx").on(table.accessType),
  priorityIdx: index("user_notifications_priority_idx").on(table.priority),
  // CONSTRAINT: Único por usuário e notificação global
  userGlobalUnique: unique("user_notifications_user_global_unique").on(table.userId, table.globalNotificationId),
}));

// SISTEMA DE JOBS ENTERPRISE PARA PROCESSAMENTO EM LOTE
export const notificationJobs = pgTable("notification_jobs", {
  id: serial("id").primaryKey(),

  // IDENTIFICAÇÃO DO JOB
  jobId: text("job_id").notNull(), // UUID único
  type: varchar("type", { length: 50 }).notNull(), // global_scan, patient_batch, distribution_batch, cleanup
  subtype: varchar("subtype", { length: 50 }), // medication_check, appointment_check, test_check

  // STATUS E CONTROLE
  status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, running, completed, failed, cancelled
  priority: integer("priority").default(5), // 1-10 (1 = alta prioridade)

  // ESCOPO DO PROCESSAMENTO
  scope: varchar("scope", { length: 20 }).notNull(), // global, patient_batch, single_patient
  patientId: integer("patient_id").references(() => users.id), // NULL para jobs globais
  patientBatchStart: integer("patient_batch_start"), // Para processamento em lotes
  patientBatchEnd: integer("patient_batch_end"),

  // PARÂMETROS DE EXECUÇÃO
  batchSize: integer("batch_size").default(100),
  maxRetries: integer("max_retries").default(3),
  timeoutSeconds: integer("timeout_seconds").default(300),

  // PROGRESS TRACKING
  totalItems: integer("total_items").default(0),
  processedItems: integer("processed_items").default(0),
  successCount: integer("success_count").default(0),
  errorCount: integer("error_count").default(0),
  skippedCount: integer("skipped_count").default(0),

  // DADOS DE EXECUÇÃO
  processingNode: varchar("processing_node", { length: 50 }), // Qual servidor está processando
  resourceUsage: text("resource_usage"), // JSON com CPU, memória, etc.

  // CONFIGURAÇÃO E RESULTADO
  config: text("config"), // JSON com configurações específicas
  result: text("result"), // JSON com resultado do processamento
  errorMessage: text("error_message"),
  errorStack: text("error_stack"),

  // TIMING
  scheduledFor: timestamp("scheduled_for").notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  lastHeartbeat: timestamp("last_heartbeat"), // Para detectar jobs travados

  // DEPENDÊNCIAS
  dependsOn: text("depends_on"), // JSON array com IDs de jobs dependentes

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  // ÍNDICES PARA SISTEMA DE QUEUE ENTERPRISE
  jobIdIdx: index("notification_jobs_job_id_idx").on(table.jobId),
  statusPriorityIdx: index("notification_jobs_status_priority_idx").on(table.status, table.priority),
  typeSubtypeIdx: index("notification_jobs_type_subtype_idx").on(table.type, table.subtype),
  scheduledForIdx: index("notification_jobs_scheduled_for_idx").on(table.scheduledFor),
  processingNodeIdx: index("notification_jobs_processing_node_idx").on(table.processingNode),
  patientBatchIdx: index("notification_jobs_patient_batch_idx").on(table.patientBatchStart, table.patientBatchEnd),
  heartbeatIdx: index("notification_jobs_heartbeat_idx").on(table.lastHeartbeat),
}));

// TABELA DE MÉTRICAS E MONITORAMENTO
export const notificationMetrics = pgTable("notification_metrics", {
  id: serial("id").primaryKey(),

  // IDENTIFICAÇÃO
  metricType: varchar("metric_type", { length: 50 }).notNull(), // daily_summary, job_performance, error_summary
  date: timestamp("date").notNull(),

  // MÉTRICAS PRINCIPAIS
  totalNotificationsCreated: integer("total_notifications_created").default(0),
  totalNotificationsDistributed: integer("total_notifications_distributed").default(0),
  totalNotificationsRead: integer("total_notifications_read").default(0),
  medicationNotifications: integer("medication_notifications").default(0),
  appointmentNotifications: integer("appointment_notifications").default(0),
  testNotifications: integer("test_notifications").default(0),

  // MÉTRICAS DE USUÁRIOS E PACIENTES
  activePatients: integer("active_patients").default(0),
  activeUsers: integer("active_users").default(0),

  // MÉTRICAS DE PERFORMANCE
  avgProcessingTimeMs: integer("avg_processing_time_ms").default(0),
  maxProcessingTimeMs: integer("max_processing_time_ms").default(0),
  minProcessingTimeMs: integer("min_processing_time_ms").default(0),
  errorRate: decimal("error_rate", { precision: 5, scale: 2 }).default("0.00"),

  // DADOS ADICIONAIS
  additionalData: text("additional_data"), // JSON com dados extras

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  dateTypeIdx: index("notification_metrics_date_type_idx").on(table.date, table.metricType),
  metricTypeIdx: index("notification_metrics_type_idx").on(table.metricType),
}));

// ========================================
// TABELAS DE SUPORTE E CONFIGURAÇÃO
// ========================================

// CONFIGURAÇÕES GLOBAIS DO SISTEMA DE NOTIFICAÇÕES
export const notificationConfig = pgTable("notification_config", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 50 }).notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  category: varchar("category", { length: 30 }).notNull(), // timing, performance, alerts, limits
  dataType: varchar("data_type", { length: 20 }).notNull(), // string, number, boolean, json
  isActive: boolean("is_active").default(true).notNull(),
  updatedBy: integer("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// LOG DE AUDITORIA PARA COMPLIANCE E DEBUG
export const notificationAuditLog = pgTable("notification_audit_log", {
  id: serial("id").primaryKey(),

  // IDENTIFICAÇÃO
  entityType: varchar("entity_type", { length: 30 }).notNull(), // global_notification, user_notification, job
  entityId: integer("entity_id").notNull(),

  // AÇÃO
  action: varchar("action", { length: 30 }).notNull(), // created, updated, deleted, read, delivered, failed
  details: text("details"), // JSON com detalhes da ação

  // CONTEXTO
  userId: integer("user_id").references(() => users.id), // Quem executou a ação
  patientId: integer("patient_id").references(() => users.id), // Paciente relacionado
  sessionId: text("session_id"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),

  // ESTADO ANTES E DEPOIS DA AÇÃO
  beforeState: text("before_state"), // JSON com estado anterior
  afterState: text("after_state"), // JSON com estado posterior

  // DADOS TÉCNICOS
  processingNode: varchar("processing_node", { length: 50 }),
  requestId: text("request_id"),
  correlationId: text("correlation_id"), // Para rastrear transações relacionadas
  processingTimeMs: integer("processing_time_ms"), // Tempo de processamento em milissegundos

  // RESULTADO
  success: boolean("success").notNull(),
  errorMessage: text("error_message"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  entityIdx: index("notification_audit_entity_idx").on(table.entityType, table.entityId),
  userIdIdx: index("notification_audit_user_idx").on(table.userId),
  patientIdIdx: index("notification_audit_patient_idx").on(table.patientId),
  actionIdx: index("notification_audit_action_idx").on(table.action),
  correlationIdIdx: index("notification_audit_correlation_idx").on(table.correlationId),
  createdAtIdx: index("notification_audit_created_at_idx").on(table.createdAt),
}));

// TABELA PARA RATE LIMITING E THROTTLING
export const notificationRateLimit = pgTable("notification_rate_limit", {
  id: serial("id").primaryKey(),

  // IDENTIFICAÇÃO DO LIMITE
  limitType: varchar("limit_type", { length: 30 }).notNull(), // user_hourly, patient_daily, global_minute
  entityId: integer("entity_id"), // userId ou patientId

  // CONTADORES
  requestCount: integer("request_count").default(0),
  windowStart: timestamp("window_start").notNull(),
  windowEnd: timestamp("window_end").notNull(),

  // CONFIGURAÇÃO
  maxRequests: integer("max_requests").notNull(),

  // STATUS
  isBlocked: boolean("is_blocked").default(false),
  blockedUntil: timestamp("blocked_until"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  limitTypeEntityIdx: index("notification_rate_limit_type_entity_idx").on(table.limitType, table.entityId),
  windowIdx: index("notification_rate_limit_window_idx").on(table.windowStart, table.windowEnd),
}));

// ========================================
// MANTER TABELA ANTIGA PARA COMPATIBILIDADE (transição gradual)
// ========================================
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  relatedId: integer("related_id"),
  scheduledFor: timestamp("scheduled_for"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Vital Signs Tables
export const bloodPressureReadings = pgTable("blood_pressure_readings", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => users.id).notNull(),
  encounterId: integer("encounter_id").references(() => medicalEncounters.id), // Vinculação ao atendimento (opcional)
  medicalEvolutionId: integer("medical_evolution_id").references(() => medicalEvolutions.id), // Vinculação à evolução médica (opcional)
  doctorId: integer("doctor_id").references(() => users.id), // Médico que registrou
  systolic: integer("systolic").notNull(), // Pressão sistólica (máxima)
  diastolic: integer("diastolic").notNull(), // Pressão diastólica (mínima)
  heartRate: integer("heart_rate"), // Batimentos por minuto
  notes: text("notes"),
  measuredAt: timestamp("measured_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  patientIdIdx: index("blood_pressure_readings_patient_id_idx").on(table.patientId),
  encounterIdIdx: index("blood_pressure_readings_encounter_id_idx").on(table.encounterId),
  medicalEvolutionIdIdx: index("blood_pressure_readings_medical_evolution_id_idx").on(table.medicalEvolutionId),
}));

export const glucoseReadings = pgTable("glucose_readings", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => users.id).notNull(),
  encounterId: integer("encounter_id").references(() => medicalEncounters.id), // Vinculação ao atendimento (opcional)
  medicalEvolutionId: integer("medical_evolution_id").references(() => medicalEvolutions.id), // Vinculação à evolução médica (opcional)
  doctorId: integer("doctor_id").references(() => users.id), // Médico que registrou
  glucoseLevel: real("glucose_level").notNull(), // mg/dL
  measurementType: varchar("measurement_type", { length: 20 }).notNull(), // 'fasting', 'post_meal', 'random', 'bedtime'
  notes: text("notes"),
  measuredAt: timestamp("measured_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  patientIdIdx: index("glucose_readings_patient_id_idx").on(table.patientId),
  encounterIdIdx: index("glucose_readings_encounter_id_idx").on(table.encounterId),
  medicalEvolutionIdIdx: index("glucose_readings_medical_evolution_id_idx").on(table.medicalEvolutionId),
}));

export const heartRateReadings = pgTable("heart_rate_readings", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => users.id).notNull(),
  encounterId: integer("encounter_id").references(() => medicalEncounters.id), // Vinculação ao atendimento (opcional)
  medicalEvolutionId: integer("medical_evolution_id").references(() => medicalEvolutions.id), // Vinculação à evolução médica (opcional)
  doctorId: integer("doctor_id").references(() => users.id), // Médico que registrou
  heartRate: integer("heart_rate").notNull(), // Batimentos por minuto
  measurementType: varchar("measurement_type", { length: 20 }).notNull(), // 'resting', 'exercise', 'recovery'
  notes: text("notes"),
  measuredAt: timestamp("measured_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  patientIdIdx: index("heart_rate_readings_patient_id_idx").on(table.patientId),
  encounterIdIdx: index("heart_rate_readings_encounter_id_idx").on(table.encounterId),
  medicalEvolutionIdIdx: index("heart_rate_readings_medical_evolution_id_idx").on(table.medicalEvolutionId),
}));

export const temperatureReadings = pgTable("temperature_readings", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => users.id).notNull(),
  encounterId: integer("encounter_id").references(() => medicalEncounters.id), // Vinculação ao atendimento (opcional)
  medicalEvolutionId: integer("medical_evolution_id").references(() => medicalEvolutions.id), // Vinculação à evolução médica (opcional)
  doctorId: integer("doctor_id").references(() => users.id), // Médico que registrou
  temperature: real("temperature").notNull(), // Celsius
  measurementMethod: varchar("measurement_method", { length: 20 }).notNull(), // 'oral', 'armpit', 'forehead', 'ear'
  notes: text("notes"),
  measuredAt: timestamp("measured_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  patientIdIdx: index("temperature_readings_patient_id_idx").on(table.patientId),
  encounterIdIdx: index("temperature_readings_encounter_id_idx").on(table.encounterId),
  medicalEvolutionIdIdx: index("temperature_readings_medical_evolution_id_idx").on(table.medicalEvolutionId),
}));

export const weightReadings = pgTable("weight_readings", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => users.id).notNull(),
  encounterId: integer("encounter_id").references(() => medicalEncounters.id), // Vinculação ao atendimento (opcional)
  medicalEvolutionId: integer("medical_evolution_id").references(() => medicalEvolutions.id), // Vinculação à evolução médica (opcional)
  doctorId: integer("doctor_id").references(() => users.id), // Médico que registrou
  weight: real("weight").notNull(), // kg
  height: real("height"), // Altura em metros (opcional)
  notes: text("notes"),
  measuredAt: timestamp("measured_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  patientIdIdx: index("weight_readings_patient_id_idx").on(table.patientId),
  encounterIdIdx: index("weight_readings_encounter_id_idx").on(table.encounterId),
  medicalEvolutionIdIdx: index("weight_readings_medical_evolution_id_idx").on(table.medicalEvolutionId),
}));

// Health Insurances / Convênios
export const healthInsurances = pgTable("health_insurances", {
  id: serial("id").primaryKey(),
  doctorId: integer("doctor_id").references(() => users.id).notNull(),

  // Informações básicas do convênio
  name: text("name").notNull(), // Nome do convênio
  registrationNumber: text("registration_number"), // Número de registro/credenciamento
  contractNumber: text("contract_number"), // Número do contrato

  // Contato e informações gerais
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  website: text("website"),

  // Endereço da operadora
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),

  // Valores financeiros para consultas (uso futuro)
  consultationValue: real("consultation_value"), // Valor da consulta
  returnConsultationValue: real("return_consultation_value"), // Valor da consulta de retorno
  urgentConsultationValue: real("urgent_consultation_value"), // Valor da consulta urgente
  homeVisitValue: real("home_visit_value"), // Valor da visita domiciliar

  // Configurações de cobrança e pagamento
  paymentTermDays: integer("payment_term_days").default(30), // Prazo de pagamento em dias
  discountPercentage: real("discount_percentage").default(0), // Desconto percentual

  // Status e controle
  isActive: boolean("is_active").default(true).notNull(),
  acceptsNewPatients: boolean("accepts_new_patients").default(true).notNull(),

  // Observações e notas
  notes: text("notes"), // Observações gerais sobre o convênio

  // Metadados
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  doctorIdIdx: index("health_insurances_doctor_id_idx").on(table.doctorId),
  nameIdx: index("health_insurances_name_idx").on(table.name),
  isActiveIdx: index("health_insurances_is_active_idx").on(table.isActive),
}));

// Payment Methods
export const paymentMethods = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  doctorId: integer("doctor_id").references(() => users.id).notNull(),

  // Informações básicas da forma de pagamento
  name: text("name").notNull(), // Nome da forma de pagamento
  paymentType: text("payment_type").notNull(), // 'cash', 'installment', 'recurring', 'prepaid', 'postpaid'
  brand: text("brand"), // 'visa', 'mastercard', 'elo', 'amex', 'hipercard', 'diners', 'discover', 'outros'

  // Configurações financeiras
  fixedFee: real("fixed_fee").default(0).notNull(), // Taxa fixa em R$
  percentageFee: real("percentage_fee").default(0).notNull(), // Taxa percentual
  receivingDays: integer("receiving_days").default(0).notNull(), // Prazo de recebimento em dias

  // Configurações de parcelamento
  acceptsInstallment: boolean("accepts_installment").default(false).notNull(),
  maxInstallments: integer("max_installments"), // Quantidade máxima de parcelas
  installmentRates: text("installment_rates"), // JSON string com juros por parcela [{installment: 1, rate: 0}, {installment: 2, rate: 2.5}]

  // Observações e controle
  notes: text("notes"), // Observações gerais sobre a forma de pagamento
  isActive: boolean("is_active").default(true).notNull(),

  // Metadados
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  doctorIdIdx: index("payment_methods_doctor_id_idx").on(table.doctorId),
  nameIdx: index("payment_methods_name_idx").on(table.name),
  isActiveIdx: index("payment_methods_is_active_idx").on(table.isActive),
  paymentTypeIdx: index("payment_methods_payment_type_idx").on(table.paymentType),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  patientRelationships: many(careRelationships, { relationName: "patient" }),
  caregiverRelationships: many(careRelationships, { relationName: "caregiver" }),
  medications: many(medications),
  medicationLogs: many(medicationLogs),
  appointments: many(appointments),
  medicalEncounters: many(medicalEncounters),
  tests: many(tests),
  prescriptions: many(prescriptions),
  medicalEvolutions: many(medicalEvolutions),
  notifications: many(notifications),
  bloodPressureReadings: many(bloodPressureReadings),
  glucoseReadings: many(glucoseReadings),
  heartRateReadings: many(heartRateReadings),
  temperatureReadings: many(temperatureReadings),
  weightReadings: many(weightReadings),
  healthInsurances: many(healthInsurances),
}));

export const careRelationshipsRelations = relations(careRelationships, ({ one }) => ({
  patient: one(users, {
    fields: [careRelationships.patientId],
    references: [users.id],
    relationName: "patient",
  }),
  caregiver: one(users, {
    fields: [careRelationships.caregiverId],
    references: [users.id],
    relationName: "caregiver",
  }),
}));

export const medicationsRelations = relations(medications, ({ one, many }) => ({
  patient: one(users, {
    fields: [medications.patientId],
    references: [users.id],
  }),
  schedules: many(medicationSchedules),
  logs: many(medicationLogs),
}));

export const medicationSchedulesRelations = relations(medicationSchedules, ({ one, many }) => ({
  medication: one(medications, {
    fields: [medicationSchedules.medicationId],
    references: [medications.id],
  }),
  logs: many(medicationLogs),
}));

export const medicationLogsRelations = relations(medicationLogs, ({ one, many }) => ({
  medication: one(medications, {
    fields: [medicationLogs.medicationId],
    references: [medications.id],
  }),
  schedule: one(medicationSchedules, {
    fields: [medicationLogs.scheduleId],
    references: [medicationSchedules.id],
  }),
  patient: one(users, {
    fields: [medicationLogs.patientId],
    references: [users.id],
  }),
  confirmedBy: one(users, {
    fields: [medicationLogs.confirmedBy],
    references: [users.id],
  }),
  history: many(medicationHistory),
}));

export const medicationHistoryRelations = relations(medicationHistory, ({ one }) => ({
  medicationLog: one(medicationLogs, {
    fields: [medicationHistory.medicationLogId],
    references: [medicationLogs.id],
  }),
  medication: one(medications, {
    fields: [medicationHistory.medicationId],
    references: [medications.id],
  }),
  patient: one(users, {
    fields: [medicationHistory.patientId],
    references: [users.id],
  }),
  createdBy: one(users, {
    fields: [medicationHistory.createdBy],
    references: [users.id],
  }),
}));

export const appointmentsRelations = relations(appointments, ({ one, many }) => ({
  patient: one(users, {
    fields: [appointments.patientId],
    references: [users.id],
  }),
  medicalEvolutions: many(medicalEvolutions),
  medicalEncounters: many(medicalEncounters),
}));

// Nova relação para medicalEncounters
export const medicalEncountersRelations = relations(medicalEncounters, ({ one, many }) => ({
  patient: one(users, {
    fields: [medicalEncounters.patientId],
    references: [users.id],
  }),
  doctor: one(users, {
    fields: [medicalEncounters.doctorId],
    references: [users.id],
  }),
  appointment: one(appointments, {
    fields: [medicalEncounters.appointmentId],
    references: [appointments.id],
  }),
  medicalEvolutions: many(medicalEvolutions),
  tests: many(tests),
  prescriptions: many(prescriptions),
  bloodPressureReadings: many(bloodPressureReadings),
  glucoseReadings: many(glucoseReadings),
  heartRateReadings: many(heartRateReadings),
  temperatureReadings: many(temperatureReadings),
  weightReadings: many(weightReadings),
}));

export const testsRelations = relations(tests, ({ one }) => ({
  patient: one(users, {
    fields: [tests.patientId],
    references: [users.id],
  }),
  medicalEncounter: one(medicalEncounters, {
    fields: [tests.encounterId],
    references: [medicalEncounters.id],
  }),
}));

// Relation para exam_requests
export const examRequestsRelations = relations(examRequests, ({ one }) => ({
  patient: one(users, {
    fields: [examRequests.patientId],
    references: [users.id],
  }),
  doctor: one(users, {
    fields: [examRequests.doctorId],
    references: [users.id],
  }),
  medicalEncounter: one(medicalEncounters, {
    fields: [examRequests.encounterId],
    references: [medicalEncounters.id],
  }),
  medicalEvolution: one(medicalEvolutions, {
    fields: [examRequests.medicalEvolutionId],
    references: [medicalEvolutions.id],
  }),
}));

export const prescriptionsRelations = relations(prescriptions, ({ one }) => ({
  patient: one(users, {
    fields: [prescriptions.patientId],
    references: [users.id],
  }),
  medicalEncounter: one(medicalEncounters, {
    fields: [prescriptions.encounterId],
    references: [medicalEncounters.id],
  }),
  medicalEvolution: one(medicalEvolutions, {
    fields: [prescriptions.medicalEvolutionId],
    references: [medicalEvolutions.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// Vital Signs Relations
export const bloodPressureReadingsRelations = relations(bloodPressureReadings, ({ one }) => ({
  patient: one(users, {
    fields: [bloodPressureReadings.patientId],
    references: [users.id],
  }),
  doctor: one(users, {
    fields: [bloodPressureReadings.doctorId],
    references: [users.id],
  }),
  medicalEncounter: one(medicalEncounters, {
    fields: [bloodPressureReadings.encounterId],
    references: [medicalEncounters.id],
  }),
  medicalEvolution: one(medicalEvolutions, {
    fields: [bloodPressureReadings.medicalEvolutionId],
    references: [medicalEvolutions.id],
  }),
}));

export const glucoseReadingsRelations = relations(glucoseReadings, ({ one }) => ({
  patient: one(users, {
    fields: [glucoseReadings.patientId],
    references: [users.id],
  }),
  doctor: one(users, {
    fields: [glucoseReadings.doctorId],
    references: [users.id],
  }),
  medicalEncounter: one(medicalEncounters, {
    fields: [glucoseReadings.encounterId],
    references: [medicalEncounters.id],
  }),
  medicalEvolution: one(medicalEvolutions, {
    fields: [glucoseReadings.medicalEvolutionId],
    references: [medicalEvolutions.id],
  }),
}));

export const heartRateReadingsRelations = relations(heartRateReadings, ({ one }) => ({
  patient: one(users, {
    fields: [heartRateReadings.patientId],
    references: [users.id],
  }),
  doctor: one(users, {
    fields: [heartRateReadings.doctorId],
    references: [users.id],
  }),
  medicalEncounter: one(medicalEncounters, {
    fields: [heartRateReadings.encounterId],
    references: [medicalEncounters.id],
  }),
  medicalEvolution: one(medicalEvolutions, {
    fields: [heartRateReadings.medicalEvolutionId],
    references: [medicalEvolutions.id],
  }),
}));

export const temperatureReadingsRelations = relations(temperatureReadings, ({ one }) => ({
  patient: one(users, {
    fields: [temperatureReadings.patientId],
    references: [users.id],
  }),
  doctor: one(users, {
    fields: [temperatureReadings.doctorId],
    references: [users.id],
  }),
  medicalEncounter: one(medicalEncounters, {
    fields: [temperatureReadings.encounterId],
    references: [medicalEncounters.id],
  }),
  medicalEvolution: one(medicalEvolutions, {
    fields: [temperatureReadings.medicalEvolutionId],
    references: [medicalEvolutions.id],
  }),
}));

export const weightReadingsRelations = relations(weightReadings, ({ one }) => ({
  patient: one(users, {
    fields: [weightReadings.patientId],
    references: [users.id],
  }),
  doctor: one(users, {
    fields: [weightReadings.doctorId],
    references: [users.id],
  }),
  medicalEncounter: one(medicalEncounters, {
    fields: [weightReadings.encounterId],
    references: [medicalEncounters.id],
  }),
  medicalEvolution: one(medicalEvolutions, {
    fields: [weightReadings.medicalEvolutionId],
    references: [medicalEvolutions.id],
  }),
}));

export const healthInsurancesRelations = relations(healthInsurances, ({ one }) => ({
  doctor: one(users, {
    fields: [healthInsurances.doctorId],
    references: [users.id],
  }),
}));

export const paymentMethodsRelations = relations(paymentMethods, ({ one }) => ({
  doctor: one(users, {
    fields: [paymentMethods.doctorId],
    references: [users.id],
  }),
}));

export const medicalEvolutionsRelations = relations(medicalEvolutions, ({ one, many }) => ({
  patient: one(users, {
    fields: [medicalEvolutions.patientId],
    references: [users.id],
  }),
  doctor: one(users, {
    fields: [medicalEvolutions.doctorId],
    references: [users.id],
  }),
  appointment: one(appointments, {
    fields: [medicalEvolutions.appointmentId],
    references: [appointments.id],
  }),
  medicalEncounter: one(medicalEncounters, {
    fields: [medicalEvolutions.encounterId],
    references: [medicalEncounters.id],
  }),
  prescriptions: many(prescriptions),
  examRequests: many(examRequests),
  bloodPressureReadings: many(bloodPressureReadings),
  glucoseReadings: many(glucoseReadings),
  heartRateReadings: many(heartRateReadings),
  temperatureReadings: many(temperatureReadings),
  weightReadings: many(weightReadings),
}));

// Zod schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertMedicationSchema = createInsertSchema(medications).omit({
  id: true,
  createdAt: true,
});

export const insertMedicationScheduleSchema = createInsertSchema(medicationSchedules).omit({
  id: true,
});

export const insertMedicationLogSchema = createInsertSchema(medicationLogs).omit({
  id: true,
  createdAt: true,
});

export const insertMedicationHistorySchema = createInsertSchema(medicationHistory).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  scheduledDateTime: z.union([z.date(), z.string().datetime()]),
  actualDateTime: z.union([z.date(), z.string().datetime()]).optional(),
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
});

export const insertTestSchema = createInsertSchema(tests).omit({
  id: true,
  createdAt: true,
});

export const insertPrescriptionSchema = createInsertSchema(prescriptions).omit({
  id: true,
  createdAt: true,
});

// LEGACY - manter para compatibilidade
export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

// Vital Signs Schemas
export const insertBloodPressureReadingSchema = createInsertSchema(bloodPressureReadings).omit({
  id: true,
  createdAt: true,
});

export const insertGlucoseReadingSchema = createInsertSchema(glucoseReadings).omit({
  id: true,
  createdAt: true,
});

export const insertHeartRateReadingSchema = createInsertSchema(heartRateReadings).omit({
  id: true,
  createdAt: true,
});

export const insertTemperatureReadingSchema = createInsertSchema(temperatureReadings).omit({
  id: true,
  createdAt: true,
});

export const insertWeightReadingSchema = createInsertSchema(weightReadings).omit({
  id: true,
  createdAt: true,
});

export const insertMedicalEvolutionSchema = createInsertSchema(medicalEvolutions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertExamRequestSchema = createInsertSchema(examRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertHealthInsuranceSchema = createInsertSchema(healthInsurances).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaymentMethodSchema = createInsertSchema(paymentMethods).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Novo schema para medicalEncounters
export const insertMedicalEncounterSchema = createInsertSchema(medicalEncounters).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Medication = typeof medications.$inferSelect;
export type InsertMedication = z.infer<typeof insertMedicationSchema>;
export type MedicationSchedule = typeof medicationSchedules.$inferSelect;
export type InsertMedicationSchedule = z.infer<typeof insertMedicationScheduleSchema>;
export type MedicationLog = typeof medicationLogs.$inferSelect;
export type InsertMedicationLog = z.infer<typeof insertMedicationLogSchema>;
export type MedicationHistory = typeof medicationHistory.$inferSelect;
export type InsertMedicationHistory = z.infer<typeof insertMedicationHistorySchema>;
export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type MedicalEncounter = typeof medicalEncounters.$inferSelect;
export type InsertMedicalEncounter = z.infer<typeof insertMedicalEncounterSchema>;
export type Test = typeof tests.$inferSelect;
export type InsertTest = z.infer<typeof insertTestSchema>;
export type ExamRequest = typeof examRequests.$inferSelect;
export type InsertExamRequest = z.infer<typeof insertExamRequestSchema>;
export type Prescription = typeof prescriptions.$inferSelect;
export type InsertPrescription = z.infer<typeof insertPrescriptionSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type CareRelationship = typeof careRelationships.$inferSelect;

// Vital Signs Types
export type BloodPressureReading = typeof bloodPressureReadings.$inferSelect;
export type InsertBloodPressureReading = z.infer<typeof insertBloodPressureReadingSchema>;
export type GlucoseReading = typeof glucoseReadings.$inferSelect;
export type InsertGlucoseReading = z.infer<typeof insertGlucoseReadingSchema>;
export type HeartRateReading = typeof heartRateReadings.$inferSelect;
export type InsertHeartRateReading = z.infer<typeof insertHeartRateReadingSchema>;
export type TemperatureReading = typeof temperatureReadings.$inferSelect;
export type InsertTemperatureReading = z.infer<typeof insertTemperatureReadingSchema>;
export type WeightReading = typeof weightReadings.$inferSelect;
export type InsertWeightReading = z.infer<typeof insertWeightReadingSchema>;

// Medical Evolution Types
export type MedicalEvolution = typeof medicalEvolutions.$inferSelect;
export type InsertMedicalEvolution = z.infer<typeof insertMedicalEvolutionSchema>;

// Health Insurance and Payment Types
export type HealthInsurance = typeof healthInsurances.$inferSelect;
export type InsertHealthInsurance = z.infer<typeof insertHealthInsuranceSchema>;
export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;

// ========================================
// SCHEMAS PARA SISTEMA DE NOTIFICAÇÕES ENTERPRISE
// ========================================

export const insertGlobalNotificationSchema = createInsertSchema(globalNotifications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserNotificationSchema = createInsertSchema(userNotifications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationJobSchema = createInsertSchema(notificationJobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationMetricsSchema = createInsertSchema(notificationMetrics).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationConfigSchema = createInsertSchema(notificationConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationAuditLogSchema = createInsertSchema(notificationAuditLog).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationRateLimitSchema = createInsertSchema(notificationRateLimit).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// TIPOS DERIVADOS PARA TYPESCRIPT
export type GlobalNotification = typeof globalNotifications.$inferSelect;
export type InsertGlobalNotification = z.infer<typeof insertGlobalNotificationSchema>;
export type UserNotification = typeof userNotifications.$inferSelect;
export type InsertUserNotification = z.infer<typeof insertUserNotificationSchema>;
export type NotificationJob = typeof notificationJobs.$inferSelect;
export type InsertNotificationJob = z.infer<typeof insertNotificationJobSchema>;
export type NotificationMetrics = typeof notificationMetrics.$inferSelect;
export type InsertNotificationMetrics = z.infer<typeof insertNotificationMetricsSchema>;
export type NotificationConfig = typeof notificationConfig.$inferSelect;
export type InsertNotificationConfig = z.infer<typeof insertNotificationConfigSchema>;
export type NotificationAuditLog = typeof notificationAuditLog.$inferSelect;
export type InsertNotificationAuditLog = z.infer<typeof insertNotificationAuditLogSchema>;
export type NotificationRateLimit = typeof notificationRateLimit.$inferSelect;
export type InsertNotificationRateLimit = z.infer<typeof insertNotificationRateLimitSchema>;

// ENUMS E CONSTANTES PARA CONSISTÊNCIA E TYPE SAFETY
export const NOTIFICATION_TYPES = {
  MEDICATION_REMINDER: 'medication_reminder',
  APPOINTMENT_REMINDER: 'appointment_reminder',
  TEST_REMINDER: 'test_reminder',
  VITAL_SIGN_ALERT: 'vital_sign_alert',
  PRESCRIPTION_EXPIRING: 'prescription_expiring',
  SYSTEM_ALERT: 'system_alert'
} as const;

export const NOTIFICATION_SUBTYPES = {
  BEFORE_TIME: 'before_time', // 15min antes, 1h antes
  ON_TIME: 'on_time', // Na hora exata
  OVERDUE: 'overdue', // 5min, 15min, 30min atrasado
  MISSED: 'missed', // Perdido completamente
  URGENT: 'urgent', // Situação urgente
  FOLLOWUP: 'followup', // Acompanhamento
  CATCH_UP: 'catch_up' // Recuperação de notificações perdidas
} as const;

export const NOTIFICATION_PRIORITIES = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  CRITICAL: 'critical'
} as const;

export const USER_ACCESS_TYPES = {
  OWNER: 'owner', // O próprio paciente
  CAREGIVER: 'caregiver', // Cuidador oficial
  MEDICAL: 'medical', // Médico/enfermeiro
  FAMILY: 'family', // Familiar
  EMERGENCY: 'emergency' // Contato de emergência
} as const;

export const JOB_TYPES = {
  GLOBAL_SCAN: 'global_scan', // Varredura global de todos os pacientes
  PATIENT_BATCH: 'patient_batch', // Lote de pacientes específicos
  DISTRIBUTION_BATCH: 'distribution_batch', // Distribuição de notificações
  CLEANUP: 'cleanup', // Limpeza de dados antigos
  METRICS_COLLECTION: 'metrics_collection' // Coleta de métricas
} as const;

export const JOB_SUBTYPES = {
  MEDICATION_CHECK: 'medication_check',
  APPOINTMENT_CHECK: 'appointment_check',
  TEST_CHECK: 'test_check',
  VITAL_SIGN_CHECK: 'vital_sign_check',
  PRESCRIPTION_CHECK: 'prescription_check'
} as const;

export const DELIVERY_METHODS = {
  WEB: 'web',
  PUSH: 'push',
  EMAIL: 'email',
  SMS: 'sms',
  WEBHOOK: 'webhook'
} as const;

// TIPOS PARA TYPESCRIPT COM VALUES DOS ENUMS
export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];
export type NotificationSubtype = typeof NOTIFICATION_SUBTYPES[keyof typeof NOTIFICATION_SUBTYPES];
export type NotificationPriority = typeof NOTIFICATION_PRIORITIES[keyof typeof NOTIFICATION_PRIORITIES];
export type UserAccessType = typeof USER_ACCESS_TYPES[keyof typeof USER_ACCESS_TYPES];
export type JobType = typeof JOB_TYPES[keyof typeof JOB_TYPES];
export type JobSubtype = typeof JOB_SUBTYPES[keyof typeof JOB_SUBTYPES];
export type DeliveryMethod = typeof DELIVERY_METHODS[keyof typeof DELIVERY_METHODS];

// INTERFACES PARA OBJETOS COMPLEXOS
export interface NotificationMetadata {
  originalScheduledTime?: string;
  delayMinutes?: number;
  retryCount?: number;
  itemName?: string;
  doctorName?: string;
  location?: string;
  dosage?: string;
  urgencyScore?: number;
  [key: string]: any;
}

export interface JobConfig {
  batchSize?: number;
  maxRetries?: number;
  timeoutSeconds?: number;
  priority?: number;
  enableMetrics?: boolean;
  filterCriteria?: {
    patientIds?: number[];
    types?: NotificationType[];
    priorities?: NotificationPriority[];
  };
  [key: string]: any;
}

export interface NotificationSummary {
  totalNotifications: number;
  unreadCount: number;
  highPriorityCount: number;
  criticalCount: number;
  byType: Record<NotificationType, number>;
  oldestUnread?: Date;
  newestNotification?: Date;
}