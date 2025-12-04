-- Adicionar campo CRM à tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS crm VARCHAR(50);

-- Adicionar campo doctorGender à tabela exam_requests
ALTER TABLE exam_requests ADD COLUMN IF NOT EXISTS doctor_gender VARCHAR(10);

-- Comentários
COMMENT ON COLUMN users.crm IS 'CRM para médicos (ex: 12345-SP)';
COMMENT ON COLUMN exam_requests.doctor_gender IS 'Gênero do médico - male, female';