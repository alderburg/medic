// Script para testar fuso horário nos campos processed_at e metadata
import { db } from "./db";
import { globalNotifications } from "@shared/schema";
import { desc } from "drizzle-orm";

async function testTimezone() {
  try {
    console.log("🔍 Verificando últimas notificações criadas...");
    
    // Buscar as 5 últimas notificações
    const notifications = await db
      .select({
        id: globalNotifications.id,
        processedAt: globalNotifications.processedAt,
        metadata: globalNotifications.metadata,
        createdAt: globalNotifications.createdAt,
        updatedAt: globalNotifications.updatedAt
      })
      .from(globalNotifications)
      .orderBy(desc(globalNotifications.id))
      .limit(5);

    console.log("\n📊 DADOS ENCONTRADOS:");
    notifications.forEach(notif => {
      console.log(`\n--- Notificação ID: ${notif.id} ---`);
      console.log(`Created At: ${notif.createdAt}`);
      console.log(`Updated At: ${notif.updatedAt}`);
      console.log(`Processed At: ${notif.processedAt}`);
      
      if (notif.metadata) {
        try {
          const metadata = JSON.parse(notif.metadata);
          console.log(`Metadata Timestamp: ${metadata.timestamp || 'N/A'}`);
        } catch (e) {
          console.log(`Metadata: ${notif.metadata}`);
        }
      }
    });

    console.log("\n⏰ COMPARAÇÃO COM HORÁRIO ATUAL:");
    const now = new Date();
    const brasilTime = new Date(Date.now() - (3 * 60 * 60 * 1000));
    
    console.log(`UTC Time: ${now.toISOString()}`);
    console.log(`Brasil Time (UTC-3): ${brasilTime.toISOString()}`);
    
  } catch (error) {
    console.error("❌ Erro ao testar timezone:", error);
  }
}

testTimezone();