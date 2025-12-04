-- ========================================
-- ADIÇÃO DE CAMPOS user_id e user_name NA TABELA global_notifications
-- Para resolver inconsistência com notification_audit_log
-- ========================================

-- 1. Adicionar coluna user_id (ID do usuário que executou a ação)
ALTER TABLE global_notifications 
ADD COLUMN user_id INTEGER REFERENCES users(id);

-- 2. Adicionar coluna user_name (cache do nome para performance)
ALTER TABLE global_notifications 
ADD COLUMN user_name TEXT;

-- 3. Criar índice para performance em consultas por user_id
CREATE INDEX IF NOT EXISTS global_notifications_user_id_idx 
ON global_notifications(user_id);

-- 4. Comentários para documentação
COMMENT ON COLUMN global_notifications.user_id IS 'ID do usuário que executou a ação que gerou a notificação';
COMMENT ON COLUMN global_notifications.user_name IS 'Cache do nome do usuário para performance';

-- 5. Atualizar registros existentes (opcional - se quiser manter os dados históricos)
-- Por enquanto, deixar NULL para registros antigos, pois não temos essa informação
-- Novos registros terão essa informação preenchida automaticamente