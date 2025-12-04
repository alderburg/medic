// Script para corrigir o campo processed_at para usar timezone
import { db } from "./db";
import { sql } from "drizzle-orm";

async function fixProcessedAtTimezone() {
  try {
    console.log("🔧 Corrigindo campo processed_at para usar timezone...");
    
    // Alterar a coluna para timestamp with time zone
    await db.execute(sql.raw(`
      ALTER TABLE global_notifications 
      ALTER COLUMN processed_at TYPE timestamp with time zone 
      USING processed_at AT TIME ZONE 'UTC'
    `));
    
    console.log("✅ Campo processed_at alterado para timestamp with time zone");
    
    // Verificar o resultado
    const result = await db.execute(sql.raw(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'global_notifications'
      AND column_name = 'processed_at'
    `));
    
    console.log("\n📋 NOVA DEFINIÇÃO:");
    if (result.rows[0]) {
      const row = result.rows[0] as any;
      console.log(`${row.column_name}: ${row.data_type} | Nullable: ${row.is_nullable} | Default: ${row.column_default || 'N/A'}`);
    }
    
    // Testar uma inserção
    console.log("\n🧪 Testando nova inserção...");
    const testInsert = await db.execute(sql.raw(`
      INSERT INTO global_notifications 
      (patient_id, patient_name, type, title, message, related_type, priority, notification_trigger_time, created_at, updated_at, processed_at, metadata)
      VALUES 
      (1, 'Teste Corrigido', 'timezone_test', 'Teste Fixed', 'Testando timezone corrigido', 'test', 'normal', NOW(), NOW(), NOW(), NOW(), '${JSON.stringify({timestamp: new Date().toISOString(), test: "fixed"})}')
      RETURNING id, created_at, updated_at, processed_at, metadata
    `));
    
    console.log("\n📊 RESULTADO DO TESTE:");
    if (testInsert.rows[0]) {
      const row = testInsert.rows[0] as any;
      console.log(`ID: ${row.id}`);
      console.log(`Created At: ${row.created_at}`);
      console.log(`Updated At: ${row.updated_at}`);
      console.log(`Processed At: ${row.processed_at} ← DEVE ESTAR CORRETO AGORA`);
      console.log(`Metadata: ${row.metadata}`);
    }
    
  } catch (error) {
    console.error("❌ Erro:", error);
  }
}

fixProcessedAtTimezone();