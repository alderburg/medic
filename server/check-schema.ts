// Script para verificar o schema atual da tabela
import { db } from "./db";
import { sql } from "drizzle-orm";

async function checkSchema() {
  try {
    console.log("🔍 Verificando schema da tabela global_notifications...");
    
    // Query para obter informações das colunas
    const result = await db.execute(sql.raw(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'global_notifications'
        AND column_name IN ('created_at', 'updated_at', 'processed_at', 'distributed_at')
        ORDER BY ordinal_position
    `));

    console.log("\n📋 SCHEMA DAS COLUNAS DE TIMESTAMP:");
    result.rows.forEach((row: any) => {
      console.log(`${row.column_name}: ${row.data_type} | Nullable: ${row.is_nullable} | Default: ${row.column_default || 'N/A'}`);
    });

    // Criar um teste mais específico
    console.log("\n🧪 Testando inserção manual com timezone específico...");
    
    const testInsert = await db.execute(sql.raw(`
        INSERT INTO global_notifications 
        (patient_id, patient_name, type, title, message, related_type, priority, notification_trigger_time, created_at, updated_at, processed_at, metadata)
        VALUES 
        (1, 'Teste Manual', 'manual_test', 'Teste Schema', 'Testando timestamp', 'test', 'normal', NOW(), NOW(), NOW(), NOW(), '${JSON.stringify({timestamp: new Date().toISOString(), test: "manual"})}')
        RETURNING id, created_at, updated_at, processed_at, metadata
    `));

    console.log("\n📊 RESULTADO DA INSERÇÃO MANUAL:");
    if (testInsert.rows[0]) {
      const row = testInsert.rows[0] as any;
      console.log(`ID: ${row.id}`);
      console.log(`Created At: ${row.created_at}`);
      console.log(`Updated At: ${row.updated_at}`);
      console.log(`Processed At: ${row.processed_at}`);
      console.log(`Metadata: ${row.metadata}`);
    }

  } catch (error) {
    console.error("❌ Erro:", error);
  }
}

checkSchema();