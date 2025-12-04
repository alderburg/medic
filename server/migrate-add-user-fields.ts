import { db } from './db';
import { sql } from 'drizzle-orm';

async function addUserFieldsToGlobalNotifications() {
  console.log('🔄 Adicionando campos user_id e user_name na tabela global_notifications...');
  
  try {
    // 1. Adicionar coluna user_id
    await db.execute(sql.raw(`
      ALTER TABLE global_notifications 
      ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);
    `));
    
    // 2. Adicionar coluna user_name
    await db.execute(sql.raw(`
      ALTER TABLE global_notifications 
      ADD COLUMN IF NOT EXISTS user_name TEXT;
    `));
    
    // 3. Criar índice
    await db.execute(sql.raw(`
      CREATE INDEX IF NOT EXISTS global_notifications_user_id_idx 
      ON global_notifications(user_id);
    `));
    
    // 4. Adicionar comentários
    await db.execute(sql.raw(`
      COMMENT ON COLUMN global_notifications.user_id IS 'ID do usuário que executou a ação que gerou a notificação';
    `));
    
    await db.execute(sql.raw(`
      COMMENT ON COLUMN global_notifications.user_name IS 'Cache do nome do usuário para performance';
    `));
    
    console.log('✅ Migração concluída com sucesso!');
    console.log('✅ Campos user_id e user_name adicionados');
    console.log('✅ Índice criado para performance');
    
    // Verificar se foi criado corretamente
    const result = await db.execute(sql.raw(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'global_notifications' 
      AND column_name IN ('user_id', 'user_name')
      ORDER BY column_name;
    `));
    
    console.log('🔍 Verificação dos campos criados:', result.rows);
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    throw error;
  }
}

// Executar diretamente
addUserFieldsToGlobalNotifications()
  .then(() => {
    console.log('🎉 Migração executada com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Falha na migração:', error);
    process.exit(1);
  });

export { addUserFieldsToGlobalNotifications };