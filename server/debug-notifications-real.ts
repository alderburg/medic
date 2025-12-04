
// Debug para verificar notificações reais vs notificações de teste
import { db } from "./db";
import { sql } from "drizzle-orm";

async function debugNotificationsReal() {
  try {
    console.log('🔍 Verificando notificações reais vs testes...');
    
    // Buscar notificações recentes
    const notifications = await db.execute(sql`
      SELECT 
        id, title, message, type, 
        related_id, related_type, related_item_name,
        notification_trigger_time, created_at,
        metadata
      FROM global_notifications 
      WHERE created_at >= NOW() - INTERVAL '24 hours'
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    console.log(`📊 Encontradas ${notifications.rows.length} notificações nas últimas 24h:`);
    
    for (const notif of notifications.rows) {
      const n = notif as any;
      console.log(`\n--- ID: ${n.id} ---`);
      console.log(`Título: ${n.title}`);
      console.log(`Tipo: ${n.type}`);
      console.log(`Related Type: ${n.related_type}`);
      console.log(`Related Item: ${n.related_item_name}`);
      console.log(`Trigger Time: ${n.notification_trigger_time}`);
      console.log(`Created: ${n.created_at}`);
      
      // Verificar se é notificação de teste
      if (n.title.includes('Sistema Funcionando') || n.message.includes('Teste concluído')) {
        console.log('🧪 NOTIFICAÇÃO DE TESTE');
      } else {
        console.log('💊 NOTIFICAÇÃO REAL DE MEDICAMENTO');
      }
    }
    
    // Verificar medicamentos que deveriam gerar notificações
    console.log('\n📋 Verificando medicamentos programados para hoje...');
    const medications = await db.execute(sql`
      SELECT 
        m.id, m.name, m.dosage, m.frequency,
        ml.id as log_id, ml.scheduled_time, ml.taken_at, ml.status
      FROM medications m
      JOIN medication_logs ml ON m.id = ml.medication_id
      WHERE ml.scheduled_time::date = CURRENT_DATE
      AND m.is_active = true
      ORDER BY ml.scheduled_time ASC
    `);
    
    console.log(`💊 Encontrados ${medications.rows.length} logs de medicamentos para hoje:`);
    
    for (const med of medications.rows) {
      const m = med as any;
      console.log(`\n--- Medicamento: ${m.name} ---`);
      console.log(`Log ID: ${m.log_id}`);
      console.log(`Horário: ${m.scheduled_time}`);
      console.log(`Status: ${m.status}`);
      console.log(`Tomado em: ${m.taken_at || 'Não tomado'}`);
    }
    
  } catch (error) {
    console.error('❌ Erro no debug:', error);
  } finally {
    process.exit(0);
  }
}

debugNotificationsReal();
