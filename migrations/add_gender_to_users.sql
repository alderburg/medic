-- Adicionar campo de gênero à tabela users
ALTER TABLE users ADD COLUMN gender VARCHAR(10);

-- Comentário sobre o campo
COMMENT ON COLUMN users.gender IS 'Gênero do usuário: masculino ou feminino';