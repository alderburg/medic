
import { db } from "./db";
import { sql } from "drizzle-orm";

async function debugNotificationCreation() {
  try {
    console.log('🔍 Verificando notificações na tabela global_notifications...');
    
    // Verificar últimas notificações criadas
    const globalNotifications = await db.execute(sql`
      SELECT 
        id, patient_id, patient_name, type, title, message,
        related_id, related_type, priority, created_at,
        processed_at, distributed_at, is_active
      FROM global_notifications 
      WHERE created_at >= NOW() - INTERVAL '2 hours'
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    console.log(`📊 Encontradas ${globalNotifications.rows.length} notificações globais nas últimas 2 horas:`);
    
    for (const notif of globalNotifications.rows) {
      const n = notif as any;
      console.log(`\n--- Global ID: ${n.id} ---`);
      console.log(`Patient: ${n.patient_name} (ID: ${n.patient_id})`);
      console.log(`Tipo: ${n.type}`);
      console.log(`Título: ${n.title}`);
      console.log(`Criado: ${n.created_at}`);
      console.log(`Ativo: ${n.is_active}`);
    }
    
    // Verificar user_notifications correspondentes
    console.log('\n🔍 Verificando user_notifications...');
    const userNotifications = await db.execute(sql`
      SELECT 
        un.id, un.user_id, un.global_notification_id, un.is_read,
        un.delivery_status, un.created_at,
        gn.title, gn.message, gn.type
      FROM user_notifications un
      LEFT JOIN global_notifications gn ON un.global_notification_id = gn.id
      WHERE un.created_at >= NOW() - INTERVAL '2 hours'
      ORDER BY un.created_at DESC 
      LIMIT 10
    `);
    
    console.log(`📊 Encontradas ${userNotifications.rows.length} user_notifications nas últimas 2 horas:`);
    
    for (const notif of userNotifications.rows) {
      const n = notif as any;
      console.log(`\n--- User Notif ID: ${n.id} ---`);
      console.log(`User ID: ${n.user_id}`);
      console.log(`Global ID: ${n.global_notification_id}`);
      console.log(`Tipo: ${n.type}`);
      console.log(`Título: ${n.title}`);
      console.log(`Status: ${n.delivery_status}`);
      console.log(`Lida: ${n.is_read}`);
    }
    
    // Verificar se há problema na API
    console.log('\n🔍 Testando API de notificações...');
    const apiTest = await db.execute(sql`
      SELECT 
        un.id,
        un.global_notification_id,
        un.user_id,
        un.is_read,
        un.delivery_status,
        un.created_at as user_created_at,
        gn.type,
        gn.title,
        gn.message,
        gn.patient_name,
        gn.related_id,
        gn.priority
      FROM user_notifications un
      INNER JOIN global_notifications gn ON un.global_notification_id = gn.id
      WHERE un.user_id = 8 AND gn.is_active = true
      ORDER BY un.created_at DESC
      LIMIT 5
    `);
    
    console.log(`📊 API Test - Notificações para usuário 8: ${apiTest.rows.length}`);
    
    for (const notif of apiTest.rows) {
      const n = notif as any;
      console.log(`\n--- API Test ID: ${n.id} ---`);
      console.log(`Global ID: ${n.global_notification_id}`);
      console.log(`Tipo: ${n.type}`);
      console.log(`Título: ${n.title}`);
      console.log(`Lida: ${n.is_read}`);
      console.log(`Status: ${n.delivery_status}`);
    }
    
  } catch (error) {
    console.error('❌ Erro no debug:', error);
  } finally {
    process.exit(0);
  }
}

debugNotificationCreation();
