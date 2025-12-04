
import { db } from './db';
import { sql } from 'drizzle-orm';

async function verifyTrigger() {
  try {
    console.log('🔍 Verificando se o trigger foi criado...');
    
    // Verificar se o trigger existe
    const triggerCheck = await db.execute(sql`
      SELECT trigger_name, event_manipulation, event_object_table 
      FROM information_schema.triggers 
      WHERE trigger_name = 'update_medical_evolutions_updated_at'
    `);
    
    if (triggerCheck.rows.length > 0) {
      console.log('✅ Trigger criado com sucesso!');
      console.log('📋 Detalhes:', triggerCheck.rows[0]);
    } else {
      console.log('❌ Trigger não encontrado');
    }
    
    // Verificar se a função existe
    const functionCheck = await db.execute(sql`
      SELECT routine_name, routine_type 
      FROM information_schema.routines 
      WHERE routine_name = 'update_updated_at_column'
    `);
    
    if (functionCheck.rows.length > 0) {
      console.log('✅ Função do trigger encontrada!');
    } else {
      console.log('❌ Função do trigger não encontrada');
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar trigger:', error);
  }
}

verifyTrigger();
