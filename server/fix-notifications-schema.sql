-- Adicionar colunas faltantes na tabela global_notifications
ALTER TABLE global_notifications 
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS distributed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS distribution_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_error TEXT;

-- Criar índices se não existirem
CREATE INDEX IF NOT EXISTS global_notifications_patient_id_idx ON global_notifications(patient_id);
CREATE INDEX IF NOT EXISTS global_notifications_trigger_time_idx ON global_notifications(notification_trigger_time);
CREATE INDEX IF NOT EXISTS global_notifications_batch_id_idx ON global_notifications(batch_id);
CREATE INDEX IF NOT EXISTS global_notifications_deduplication_idx ON global_notifications(deduplication_key);
CREATE INDEX IF NOT EXISTS global_notifications_type_patient_idx ON global_notifications(type, patient_id);
CREATE INDEX IF NOT EXISTS global_notifications_priority_urgency_idx ON global_notifications(priority, urgency_score);
CREATE INDEX IF NOT EXISTS global_notifications_active_created_idx ON global_notifications(is_active, created_at);