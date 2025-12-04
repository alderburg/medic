// Script para verificar e corrigir associações de notificações
import { db } from "./db.js";
import { sql } from "drizzle-orm";

async function fixNotificationAssociations() {
  try {
    console.log("🔍 Verificando notificações globais...");
    
    // Verificar notificações globais existentes
    const globalQuery = `
      SELECT 
        id, 
        type, 
        title, 
        message, 
        patient_id, 
        created_at,
        is_active
      FROM global_notifications 
      WHERE is_active = true
      ORDER BY created_at DESC 
      LIMIT 10
    `;
    
    const globalResult = await db.execute(sql.raw(globalQuery));
    console.log(`📊 Encontradas ${globalResult.rows.length} notificações globais ativas:`);
    
    if (globalResult.rows.length > 0) {
      globalResult.rows.forEach((row: any, index: number) => {
        console.log(`  ${index + 1}. ID: ${row.id} | Tipo: ${row.type} | Paciente: ${row.patient_id} | Título: ${row.title}`);
      });
    }
    
    // Verificar notificações de usuário para o usuário 8
    console.log("\n🔍 Verificando notificações de usuário para usuário 8...");
    const userQuery = `
      SELECT 
        un.id,
        un.global_notification_id,
        un.user_id,
        un.is_read,
        gn.title,
        gn.type
      FROM user_notifications un
      JOIN global_notifications gn ON un.global_notification_id = gn.id
      WHERE un.user_id = 8
      ORDER BY un.created_at DESC
      LIMIT 5
    `;
    
    const userResult = await db.execute(sql.raw(userQuery));
    console.log(`📊 Usuário 8 tem ${userResult.rows.length} notificações associadas:`);
    
    if (userResult.rows.length > 0) {
      userResult.rows.forEach((row: any, index: number) => {
        console.log(`  ${index + 1}. ID: ${row.id} | Global ID: ${row.global_notification_id} | Lida: ${row.is_read} | Título: ${row.title}`);
      });
    }
    
    // Criar associações para TODAS as notificações globais, não apenas as que faltam
    console.log("\n🔧 Criando associações para TODAS as notificações globais...");
    let totalCreated = 0;
    
    for (const globalNotif of globalResult.rows) {
      const insertQuery = `
        INSERT INTO user_notifications (
          global_notification_id,
          user_id,
          user_profile_type,
          user_name,
          access_type,
          access_level,
          delivery_status,
          is_read,
          delivery_method,
          priority,
          created_at,
          updated_at
        ) VALUES (
          $1, 8, 'patient', 'Ritiele Aldeburg', 'direct', 'full',
          'delivered', false, 'web_push', 'normal', NOW(), NOW()
        )
        ON CONFLICT (global_notification_id, user_id) DO NOTHING
        RETURNING id
      `;
      
      try {
        const insertResult = await db.execute(sql.raw(insertQuery, [globalNotif.id]));
        if (insertResult.rows.length > 0) {
          console.log(`✅ Nova associação criada para notificação global ${globalNotif.id}: ${globalNotif.title}`);
          totalCreated++;
        } else {
          console.log(`⚠️ Associação já existe para notificação ${globalNotif.id}: ${globalNotif.title}`);
        }
      } catch (error) {
        console.log(`❌ Erro ao criar associação para notificação ${globalNotif.id}:`, error);
      }
    }
    
    console.log(`\n📊 Total de novas associações criadas: ${totalCreated}`);
    
    // Verificar novamente após criar todas as associações
    console.log("\n🔍 Verificação final das notificações...");
    const finalResult = await db.execute(sql.raw(userQuery));
    console.log(`📊 Usuário 8 agora tem ${finalResult.rows.length} notificações associadas:`);
    
    if (finalResult.rows.length > 0) {
      finalResult.rows.forEach((row: any, index: number) => {
        console.log(`  ${index + 1}. ID: ${row.id} | Global ID: ${row.global_notification_id} | Lida: ${row.is_read} | Título: ${row.title}`);
      });
    }
    
    console.log("\n✅ Verificação concluída!");
    
  } catch (error) {
    console.error("❌ Erro durante verificação:", error);
  }
}

// Executar o script
fixNotificationAssociations().then(() => {
  console.log("Script concluído");
  process.exit(0);
}).catch((error) => {
  console.error("Erro no script:", error);
  process.exit(1);
});