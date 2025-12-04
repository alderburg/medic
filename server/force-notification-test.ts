// Script para forçar criação de notificação e testar o horário
import { db } from "./db";
import { globalNotifications } from "@shared/schema";
import { desc } from "drizzle-orm";

async function forceCreateNotification() {
  try {
    console.log("🧪 Criando notificação de teste...");
    
    // Criar notificação diretamente no banco para testar
    const now = new Date();
    const testNotification = {
      patientId: 1,
      patientName: "Teste",
      type: "test_notification",
      title: "Teste Timezone",
      message: "Testando correção de fuso horário",
      relatedId: 999,
      relatedType: "test",
      priority: "normal",
      isActive: true,
      createdAt: now,
      updatedAt: now,
      processedAt: now, // Este campo deve aparecer correto agora
      metadata: JSON.stringify({
        test: true,
        timestamp: now.toISOString() // Este campo também deve estar correto
      })
    };

    const [newNotif] = await db
      .insert(globalNotifications)
      .values(testNotification)
      .returning();

    console.log("✅ Notificação de teste criada:", newNotif.id);

    // Verificar imediatamente
    const verification = await db
      .select({
        id: globalNotifications.id,
        processedAt: globalNotifications.processedAt,
        metadata: globalNotifications.metadata,
        createdAt: globalNotifications.createdAt
      })
      .from(globalNotifications)
      .where(eq(globalNotifications.id, newNotif.id));

    console.log("\n🔍 VERIFICAÇÃO IMEDIATA:");
    if (verification[0]) {
      const notif = verification[0];
      console.log(`Created At: ${notif.createdAt}`);
      console.log(`Processed At: ${notif.processedAt}`);
      
      try {
        const meta = JSON.parse(notif.metadata || '{}');
        console.log(`Metadata Timestamp: ${meta.timestamp || 'N/A'}`);
      } catch (e) {
        console.log(`Metadata: ${notif.metadata}`);
      }
    }

    console.log("\n⏰ COMPARAÇÃO:");
    console.log(`Horário de criação: ${now.toISOString()}`);
    console.log(`Processed At esperado: ${now.toISOString()}`);
    
  } catch (error) {
    console.error("❌ Erro:", error);
  }
}

// Import necessário que faltou
import { eq } from "drizzle-orm";

forceCreateNotification();