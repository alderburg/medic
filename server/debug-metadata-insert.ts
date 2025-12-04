// Debug para entender o que está acontecendo com metadata
import { db } from "./db";
import { sql } from "drizzle-orm";

async function debugMetadataInsert() {
  try {
    console.log("🔍 DEBUGGING: Inserção direta de metadata...");
    
    // Teste 1: Inserção direta via SQL
    const metadataJson = JSON.stringify({
      source: "test_direct",
      createdBy: "debug",
      timestamp: new Date(Date.now() - (3 * 60 * 60 * 1000)).toISOString(),
      patientId: 8,
      relatedId: 999
    });
    
    console.log("\n📝 JSON que será inserido:", metadataJson);
    
    const directInsert = await db.execute(sql.raw(`
      INSERT INTO global_notifications 
      (patient_id, patient_name, type, title, message, related_type, priority, notification_trigger_time, created_at, updated_at, processed_at, metadata)
      VALUES 
      (8, 'Debug Test', 'debug_test', 'Debug Metadata', 'Testando metadata diretamente', 'test', 'normal', NOW(), NOW(), NOW(), NOW(), '${metadataJson}')
      RETURNING id, created_at, processed_at, metadata
    `));
    
    console.log("\n✅ INSERÇÃO DIRETA - RESULTADO:");
    if (directInsert.rows[0]) {
      const row = directInsert.rows[0] as any;
      console.log(`ID: ${row.id}`);
      console.log(`Metadata bruto: ${row.metadata}`);
      
      try {
        const parsedMetadata = JSON.parse(row.metadata);
        console.log("Metadata parseado:", parsedMetadata);
        console.log(`Timestamp: ${parsedMetadata.timestamp}`);
      } catch (e) {
        console.log("❌ Erro ao parsear metadata");
      }
    }
    
    // Teste 2: Via Drizzle ORM (como o sistema faz)
    console.log("\n🔧 TESTE VIA DRIZZLE ORM:");
    
    // Simular o que o EnterpriseStorage faz
    const insertData = {
      patientId: 8,
      patientName: "Debug ORM Test",
      type: "debug_orm",
      title: "Debug ORM",
      message: "Testando via ORM",
      relatedType: "test",
      priority: "normal",
      notificationTriggerTime: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      processedAt: new Date(),
      metadata: metadataJson  // String JSON já pronta
    };
    
    console.log("insertData.metadata:", insertData.metadata);
    console.log("typeof insertData.metadata:", typeof insertData.metadata);
    
    // Import dinâmico do schema
    const { globalNotifications } = await import("../shared/schema");
    
    const [ormInsert] = await db
      .insert(globalNotifications)
      .values(insertData)
      .returning();
    
    console.log("\n✅ INSERÇÃO VIA ORM - RESULTADO:");
    console.log(`ID: ${ormInsert.id}`);
    console.log(`Metadata bruto: ${ormInsert.metadata}`);
    
    if (ormInsert.metadata) {
      try {
        const parsedMetadata = JSON.parse(ormInsert.metadata as string);
        console.log("Metadata parseado:", parsedMetadata);
        console.log(`Timestamp: ${parsedMetadata.timestamp}`);
      } catch (e) {
        console.log("❌ Erro ao parsear metadata do ORM");
        console.log("Metadata type:", typeof ormInsert.metadata);
        console.log("Metadata content:", ormInsert.metadata);
      }
    }
    
  } catch (error) {
    console.error("❌ Erro:", error);
  }
}

debugMetadataInsert();