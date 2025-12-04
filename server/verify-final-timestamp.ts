// Verificação final dos timestamps
import { db } from "./db";
import { sql } from "drizzle-orm";

async function verifyFinalTimestamp() {
  try {
    console.log("🔍 VERIFICAÇÃO FINAL: Timestamps corretos...");
    
    // Buscar as notificações mais recentes usando Drizzle
    const { globalNotifications } = await import("../shared/schema");
    
    const notifications = await db
      .select()
      .from(globalNotifications)
      .orderBy(sql`id DESC`)
      .limit(3);
    
    console.log("\n📊 NOTIFICAÇÕES RECENTES:");
    
    for (const notification of notifications) {
      console.log(`\n--- NOTIFICAÇÃO ID: ${notification.id} ---`);
      console.log(`Created At: ${notification.createdAt}`);
      console.log(`Processed At: ${notification.processedAt}`);
      
      // O metadata agora é um objeto JavaScript (conversão automática do Drizzle)
      if (notification.metadata && typeof notification.metadata === 'object') {
        const metadata = notification.metadata as any;
        console.log(`Metadata:`);
        console.log(`  - Source: ${metadata.source}`);
        console.log(`  - CreatedBy: ${metadata.createdBy}`);
        console.log(`  - PatientId: ${metadata.patientId}`);
        console.log(`  - RelatedId: ${metadata.relatedId}`);
        console.log(`  - Timestamp: ${metadata.timestamp}`);
        
        // Análise temporal
        if (metadata.timestamp) {
          const createdAt = new Date(notification.createdAt!);
          const metadataTimestamp = new Date(metadata.timestamp);
          const diffMinutes = (createdAt.getTime() - metadataTimestamp.getTime()) / (1000 * 60);
          
          console.log(`\n🕐 ANÁLISE TEMPORAL:`);
          console.log(`  Created At: ${notification.createdAt} (banco)`);
          console.log(`  Metadata Timestamp: ${metadata.timestamp} (metadata)`);
          console.log(`  Diferença: ${diffMinutes.toFixed(1)} minutos`);
          
          // Verificar se ambos estão próximos (mesmo horário)
          if (Math.abs(diffMinutes) < 1) {
            console.log(`  Status: ✅ CORRETO - Timestamps sincronizados`);
          } else {
            console.log(`  Status: ❌ INCORRETO - ${Math.abs(diffMinutes).toFixed(1)} min de diferença`);
          }
        }
      }
    }
    
    // Teste final: criar uma nova notificação usando a função helper
    console.log("\n🧪 TESTE FINAL: Nova notificação com timestamp brasileiro...");
    
    const newMetadata = {
      source: "final_test",
      createdBy: "system",
      patientId: 8,
      relatedId: 999,
      timestamp: new Date(Date.now() - (3 * 60 * 60 * 1000)).toISOString()
    };
    
    console.log(`JSON metadata: ${JSON.stringify(newMetadata)}`);
    console.log(`Timestamp enviado: ${newMetadata.timestamp}`);
    
    const [finalTest] = await db
      .insert(globalNotifications)
      .values({
        patientId: 8,
        patientName: "Teste Final",
        type: "final_test",
        title: "Verificação Final",
        message: "Teste final dos timestamps",
        relatedType: "test",
        priority: "normal",
        notificationTriggerTime: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        processedAt: new Date(),
        metadata: JSON.stringify(newMetadata)
      })
      .returning();
    
    console.log(`\n✅ NOTIFICAÇÃO FINAL CRIADA:`);
    console.log(`ID: ${finalTest.id}`);
    console.log(`Created At: ${finalTest.createdAt}`);
    console.log(`Processed At: ${finalTest.processedAt}`);
    
    if (finalTest.metadata && typeof finalTest.metadata === 'object') {
      const metadata = finalTest.metadata as any;
      console.log(`Metadata Timestamp: ${metadata.timestamp}`);
      
      const createdAt = new Date(finalTest.createdAt!);
      const metadataTimestamp = new Date(metadata.timestamp);
      const diffMinutes = (createdAt.getTime() - metadataTimestamp.getTime()) / (1000 * 60);
      
      console.log(`\n🎯 RESULTADO FINAL:`);
      console.log(`  ✅ Created At (banco): ${finalTest.createdAt}`);
      console.log(`  ✅ Processed At (banco): ${finalTest.processedAt}`);  
      console.log(`  ✅ Metadata Timestamp: ${metadata.timestamp}`);
      console.log(`  📊 Diferença: ${diffMinutes.toFixed(1)} minutos`);
      
      if (Math.abs(diffMinutes) < 1) {
        console.log(`\n🎉 SUCESSO! Todos os timestamps estão sincronizados em horário brasileiro!`);
      } else {
        console.log(`\n⚠️ Ainda há diferença de ${Math.abs(diffMinutes).toFixed(1)} minutos`);
      }
    }
    
  } catch (error) {
    console.error("❌ Erro:", error);
  }
}

verifyFinalTimestamp();