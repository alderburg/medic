// Script para criar todas as associações de notificações para o usuário 8
import { db } from "./db.js";
import { sql } from "drizzle-orm";

async function createAllAssociationsForUser8() {
  try {
    console.log("🔍 Buscando todas as notificações globais...");
    
    // Buscar todas as notificações globais (não apenas ativas)
    const allGlobalQuery = sql`
      SELECT id, type, title, message, patient_id, created_at, is_active
      FROM global_notifications 
      ORDER BY created_at DESC
    `;
    
    const globalResult = await db.execute(allGlobalQuery);
    console.log(`📊 Encontradas ${globalResult.rows.length} notificações globais totais`);
    
    // Contar quantas são ativas
    const activeCount = globalResult.rows.filter((row: any) => row.is_active).length;
    console.log(`📊 Notificações ativas: ${activeCount} de ${globalResult.rows.length}`);
    
    // Criar associações para TODAS as notificações (ativas e inativas) para o usuário 8
    let created = 0;
    let skipped = 0;
    
    for (const notif of globalResult.rows) {
      try {
        const insertQuery = sql`
          INSERT INTO user_notifications (
            global_notification_id, user_id, user_profile_type, user_name,
            access_type, access_level, delivery_status, is_read,
            delivery_method, priority, created_at, updated_at
          ) VALUES (
            ${notif.id}, 8, 'patient', 'Ritiele Aldeburg', 'direct', 'full',
            'delivered', false, 'web_push', 'normal', NOW(), NOW()
          )
        `;
        
        await db.execute(insertQuery);
        console.log(`✅ Associação criada para notificação ${notif.id}: ${notif.title} (ativa: ${notif.is_active})`);
        created++;
        
      } catch (error: any) {
        if (error.code === '23505') { // Unique constraint violation
          console.log(`⚠️ Associação já existe para notificação ${notif.id}: ${notif.title}`);
          skipped++;
        } else {
          console.log(`❌ Erro ao criar associação para notificação ${notif.id}:`, error.message);
        }
      }
    }
    
    console.log(`\n📊 Resultado:`);
    console.log(`  - Novas associações criadas: ${created}`);
    console.log(`  - Associações já existentes: ${skipped}`);
    console.log(`  - Total de notificações processadas: ${globalResult.rows.length}`);
    
    // Verificar total final de associações para o usuário 8
    const finalQuery = sql`SELECT COUNT(*) as count FROM user_notifications WHERE user_id = 8`;
    const finalResult = await db.execute(finalQuery);
    console.log(`\n📊 RESULTADO FINAL: Usuário 8 agora tem ${finalResult.rows[0]?.count || 0} notificações associadas`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro durante a criação das associações:", error);
    process.exit(1);
  }
}

createAllAssociationsForUser8();