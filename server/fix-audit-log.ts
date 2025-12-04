// Script para corrigir a tabela notification_audit_log
import { db } from "./db.js";
import { sql } from "drizzle-orm";

export async function fixAuditLogTable() {
  console.log('🔧 Corrigindo tabela notification_audit_log...');
  
  try {
    // Adicionar as colunas faltantes
    await db.execute(sql.raw(`
      ALTER TABLE notification_audit_log 
      ADD COLUMN IF NOT EXISTS before_state TEXT,
      ADD COLUMN IF NOT EXISTS after_state TEXT,
      ADD COLUMN IF NOT EXISTS correlation_id TEXT,
      ADD COLUMN IF NOT EXISTS processing_time_ms INTEGER;
    `));
    
    // Criar índices para as novas colunas
    await db.execute(sql.raw(`
      CREATE INDEX IF NOT EXISTS idx_notification_audit_correlation_id 
      ON notification_audit_log(correlation_id);
    `));
    
    console.log('✅ Tabela notification_audit_log corrigida com sucesso!');
    
    // Verificar a estrutura da tabela
    const columns = await db.execute(sql.raw(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'notification_audit_log' 
      ORDER BY ordinal_position;
    `));
    
    console.log('📋 Colunas da tabela notification_audit_log:');
    columns.rows.forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao corrigir tabela:', error);
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  fixAuditLogTable()
    .then(() => {
      console.log('🏁 Correção concluída');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Erro fatal:', error);
      process.exit(1);
    });
}