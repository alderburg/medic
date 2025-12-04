// ========================================
// MIGRAÇÃO AUTOMÁTICA PARA TABELAS ENTERPRISE
// ========================================

import { db } from "./db";
import { sql } from "drizzle-orm";

export async function runEnterpriseMigration() {
  console.log('🔄 Executando migração enterprise...');

  try {
    // 1. GLOBAL NOTIFICATIONS
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS global_notifications (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER NOT NULL,
        patient_name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        subtype VARCHAR(50),
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        related_id INTEGER,
        related_type VARCHAR(50),
        related_item_name VARCHAR(255),
        priority VARCHAR(20) DEFAULT 'normal',
        urgency_score INTEGER DEFAULT 0,
        original_scheduled_time TIMESTAMPTZ,
        notification_trigger_time TIMESTAMPTZ,
        status VARCHAR(20) DEFAULT 'pending',
        processed_at TIMESTAMPTZ,
        distributed_at TIMESTAMPTZ,
        distribution_count INTEGER DEFAULT 0,
        processing_node VARCHAR(50),
        metadata TEXT,
        deduplication_key TEXT,
        is_active BOOLEAN DEFAULT true,
        retry_count INTEGER DEFAULT 0,
        last_error TEXT,
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 2. USER NOTIFICATIONS
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        global_notification_id INTEGER NOT NULL,
        user_profile_type VARCHAR(50),
        user_name VARCHAR(255),
        access_type VARCHAR(50),
        access_level VARCHAR(50),
        delivery_status VARCHAR(20) DEFAULT 'pending',
        is_read BOOLEAN DEFAULT false,
        delivered_at TIMESTAMPTZ,
        read_at TIMESTAMPTZ,
        acknowledged_at TIMESTAMPTZ,
        delivery_method VARCHAR(50) DEFAULT 'web',
        delivery_attempts INTEGER DEFAULT 0,
        last_delivery_error TEXT,
        priority VARCHAR(20) DEFAULT 'normal',
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),

        FOREIGN KEY (global_notification_id) REFERENCES global_notifications(id) ON DELETE CASCADE
      );
    `);

    // 3. NOTIFICATION JOBS
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS notification_jobs (
        id SERIAL PRIMARY KEY,
        job_id VARCHAR(255) UNIQUE NOT NULL,
        type VARCHAR(50) NOT NULL,
        subtype VARCHAR(50),
        status VARCHAR(20) DEFAULT 'pending',
        priority INTEGER DEFAULT 5,
        scope VARCHAR(50) DEFAULT 'global',
        batch_size INTEGER DEFAULT 100,
        max_retries INTEGER DEFAULT 3,
        timeout_seconds INTEGER DEFAULT 3600,
        processing_node VARCHAR(50),
        scheduled_for TIMESTAMPTZ NOT NULL,
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        last_heartbeat TIMESTAMPTZ,
        total_items INTEGER DEFAULT 0,
        processed_items INTEGER DEFAULT 0,
        success_count INTEGER DEFAULT 0,
        error_count INTEGER DEFAULT 0,
        error_message TEXT,
        config TEXT,
        result TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 4. NOTIFICATION METRICS
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS notification_metrics (
        id SERIAL PRIMARY KEY,
        metric_type VARCHAR(50) NOT NULL,
        date TIMESTAMPTZ NOT NULL,
        total_notifications_created INTEGER DEFAULT 0,
        total_notifications_distributed INTEGER DEFAULT 0,
        total_notifications_read INTEGER DEFAULT 0,
        medication_notifications INTEGER DEFAULT 0,
        appointment_notifications INTEGER DEFAULT 0,
        test_notifications INTEGER DEFAULT 0,
        active_patients INTEGER DEFAULT 0,
        active_users INTEGER DEFAULT 0,
        avg_processing_time_ms INTEGER DEFAULT 0,
        max_processing_time_ms INTEGER DEFAULT 0,
        min_processing_time_ms INTEGER DEFAULT 0,
        error_rate DECIMAL(5,2) DEFAULT 0.00,
        additional_data TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 5. NOTIFICATION AUDIT LOG
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS notification_audit_log (
        id SERIAL PRIMARY KEY,
        entity_type VARCHAR(30) NOT NULL,
        entity_id INTEGER NOT NULL,
        action VARCHAR(30) NOT NULL,
        details TEXT,
        user_id INTEGER,
        patient_id INTEGER,
        session_id TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        before_state TEXT,
        after_state TEXT,
        processing_node VARCHAR(50),
        request_id TEXT,
        correlation_id TEXT,
        processing_time_ms INTEGER,
        success BOOLEAN NOT NULL,
        error_message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Adicionar as novas colunas se a tabela já existir
    await db.execute(sql`
      ALTER TABLE notification_audit_log 
      ADD COLUMN IF NOT EXISTS before_state TEXT,
      ADD COLUMN IF NOT EXISTS after_state TEXT,
      ADD COLUMN IF NOT EXISTS correlation_id TEXT,
      ADD COLUMN IF NOT EXISTS processing_time_ms INTEGER;
    `);

    // 6. NOTIFICATION RATE LIMIT
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS notification_rate_limit (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER NOT NULL,
        notification_type VARCHAR(50) NOT NULL,
        related_id INTEGER,
        last_notification_sent TIMESTAMPTZ,
        notification_count INTEGER DEFAULT 0,
        reset_time TIMESTAMPTZ,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ÍNDICES PARA PERFORMANCE
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_global_notifications_patient_type ON global_notifications(patient_id, type);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_global_notifications_active_created ON global_notifications(is_active, created_at);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_global_notifications_trigger_time ON global_notifications(notification_trigger_time);`);

    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_user_notifications_user_delivered ON user_notifications(user_id, delivery_status, created_at);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_user_notifications_unread ON user_notifications(user_id, is_read) WHERE is_read = false;`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_user_notifications_global_id ON user_notifications(global_notification_id);`);

    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_notification_jobs_status ON notification_jobs(status, created_at);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_notification_jobs_job_id ON notification_jobs(job_id);`);

    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_notification_metrics_date_type ON notification_metrics(date, metric_type);`);

    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_notification_audit_entity ON notification_audit_log(entity_type, entity_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_notification_audit_user ON notification_audit_log(user_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_notification_audit_patient ON notification_audit_log(patient_id);`);

    // Índice para rate limit - verificar se colunas existem antes de criar
    await db.execute(sql`
      DO $$ 
      BEGIN 
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_rate_limit' AND column_name = 'patient_id') THEN
          CREATE INDEX IF NOT EXISTS idx_notification_rate_limit_patient_type ON notification_rate_limit(patient_id, notification_type);
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_rate_limit' AND column_name = 'entity_id') THEN
          CREATE INDEX IF NOT EXISTS idx_notification_rate_limit_entity_type ON notification_rate_limit(entity_id, limit_type);
        END IF;
      EXCEPTION WHEN OTHERS THEN
        NULL; -- Ignorar erros de índice
      END $$;
    `);

    // CONSTRAINT para rate limit único - verificar estrutura da tabela
    await db.execute(sql`
      DO $$ 
      BEGIN 
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_rate_limit' AND column_name = 'patient_id') THEN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_rate_limit_patient_type_related') THEN
            ALTER TABLE notification_rate_limit 
            ADD CONSTRAINT unique_rate_limit_patient_type_related 
            UNIQUE(patient_id, notification_type, related_id);
          END IF;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        NULL; -- Ignorar erros de constraint
      END $$;
    `);

    // CONSTRAINT para user notifications único
    await db.execute(sql`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'unique_user_global_notification'
        ) THEN
          ALTER TABLE user_notifications 
          ADD CONSTRAINT unique_user_global_notification 
          UNIQUE(user_id, global_notification_id);
        END IF;
      END $$;
    `);

    console.log('✅ Migração enterprise concluída com sucesso');
    console.log('🗃️ Tabelas criadas: global_notifications, user_notifications, notification_jobs, notification_metrics, notification_audit_log, notification_rate_limit');
    console.log('⚡ Índices criados para otimização de performance');

  } catch (error) {
    console.error('❌ Erro na migração enterprise:', error);
    throw error;
  }
}