// Script para verificar timestamp no metadata das notificações
import { db } from "./db";
import { sql } from "drizzle-orm";

async function checkMetadataTimestamp() {
  try {
    console.log("🔍 Verificando timestamp no metadata das notificações recentes...");
    
    // Buscar as 3 últimas notificações
    const result = await db.execute(sql.raw(`
      SELECT id, created_at, processed_at, metadata 
      FROM global_notifications 
      ORDER BY id DESC 
      LIMIT 3
    `));
    
    console.log("\n📊 ÚLTIMAS NOTIFICAÇÕES:");
    for (const row of result.rows) {
      const notification = row as any;
      console.log(`\n--- NOTIFICAÇÃO ID: ${notification.id} ---`);
      console.log(`Created At: ${notification.created_at}`);
      console.log(`Processed At: ${notification.processed_at}`);
      
      // Parsear e exibir metadata
      try {
        const metadata = JSON.parse(notification.metadata);
        console.log(`Metadata:`);
        console.log(`  - Source: ${metadata.source}`);
        console.log(`  - CreatedBy: ${metadata.createdBy}`);
        console.log(`  - PatientId: ${metadata.patientId}`);
        console.log(`  - RelatedId: ${metadata.relatedId}`);
        console.log(`  - Timestamp: ${metadata.timestamp} ${metadata.timestamp ? '← DEVE ESTAR COM HORÁRIO BRASILEIRO' : ''}`);
      } catch (e) {
        console.log(`Metadata: ${notification.metadata} (não é JSON válido)`);
      }
    }
    
    // Verificar se há diferença entre created_at e timestamp do metadata
    console.log("\n🕐 ANÁLISE DOS HORÁRIOS:");
    for (const row of result.rows) {
      const notification = row as any;
      try {
        const metadata = JSON.parse(notification.metadata);
        if (metadata.timestamp) {
          const createdAt = new Date(notification.created_at);
          const metadataTimestamp = new Date(metadata.timestamp);
          const diffHours = (createdAt.getTime() - metadataTimestamp.getTime()) / (1000 * 60 * 60);
          
          console.log(`\nID ${notification.id}:`);
          console.log(`  Created At: ${notification.created_at}`);
          console.log(`  Metadata Timestamp: ${metadata.timestamp}`);
          console.log(`  Diferença: ${diffHours.toFixed(1)} horas`);
          console.log(`  Status: ${Math.abs(diffHours) < 0.1 ? '✅ CORRETO' : '❌ INCORRETO'}`);
        }
      } catch (e) {
        console.log(`ID ${notification.id}: Erro ao analisar metadata`);
      }
    }
    
  } catch (error) {
    console.error("❌ Erro:", error);
  }
}

checkMetadataTimestamp();