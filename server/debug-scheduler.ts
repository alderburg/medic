import { db } from './db';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    console.log('=== ANÁLISE DO SCHEDULER DE NOTIFICAÇÕES ===\n');
    
    // 1. Verificar estrutura das tabelas primeiro
    console.log('1. VERIFICANDO ESTRUTURA DAS TABELAS:');
    const tablesInfo = await db.execute(sql`
      SELECT 
        table_name,
        column_name,
        data_type
      FROM information_schema.columns 
      WHERE table_name IN ('medications', 'appointments', 'tests', 'medication_schedules')
      ORDER BY table_name, ordinal_position
    `);
    console.log('Colunas disponíveis:', tablesInfo.rows);
    
    // 2. Verificar dados básicos com nomes corretos
    console.log('\n2. VERIFICANDO DADOS BÁSICOS:');
    const basicData = await db.execute(sql`
      SELECT 
        'medications' as table_name,
        COUNT(*) as total_count,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_count
      FROM medications
    `);
    console.log(basicData.rows);
    
    // 3. Verificar medicamentos ativos
    console.log('\n3. MEDICAMENTOS ATIVOS:');
    const meds = await db.execute(sql`
      SELECT m.id, m.name, m.frequency, m.patient_id, u.name as patient_name
      FROM medications m 
      JOIN users u ON m.patient_id = u.id 
      WHERE m.is_active = true 
      LIMIT 5
    `);
    console.log(meds.rows);
    
    // 4. Verificar horários dos medicamentos
    console.log('\n4. HORÁRIOS DOS MEDICAMENTOS:');
    const schedules = await db.execute(sql`
      SELECT ms.id, ms.medication_id, ms.scheduled_time, ms.is_active, m.name as medication_name
      FROM medication_schedules ms
      JOIN medications m ON ms.medication_id = m.id
      WHERE ms.is_active = true
      LIMIT 5
    `);
    console.log(schedules.rows);
    
    // 5. Verificar consultas futuras
    console.log('\n5. CONSULTAS FUTURAS:');
    const appts = await db.execute(sql`
      SELECT a.id, a.title, a.doctor_name, a.appointment_date, a.patient_id, u.name as patient_name, a.status
      FROM appointments a
      JOIN users u ON a.patient_id = u.id
      WHERE a.appointment_date >= CURRENT_TIMESTAMP
      ORDER BY a.appointment_date
      LIMIT 5
    `);
    console.log(appts.rows);
    
    // 6. Verificar exames futuros
    console.log('\n6. EXAMES FUTUROS:');
    const tests = await db.execute(sql`
      SELECT t.id, t.name, t.test_date, t.patient_id, u.name as patient_name, t.status
      FROM tests t
      JOIN users u ON t.patient_id = u.id
      WHERE t.test_date >= CURRENT_TIMESTAMP
      ORDER BY t.test_date
      LIMIT 5
    `);
    console.log(tests.rows);
    
    // 7. Verificar notificações automáticas criadas hoje
    console.log('\n7. NOTIFICAÇÕES AUTOMÁTICAS CRIADAS HOJE:');
    const autoNotifs = await db.execute(sql`
      SELECT type, COUNT(*) as count, 
             MIN(created_at) as first_created,
             MAX(created_at) as last_created
      FROM global_notifications 
      WHERE DATE(created_at) = CURRENT_DATE
      AND (
        metadata::text LIKE '%scheduler%' OR 
        metadata::text LIKE '%automatic%' OR
        type LIKE '%reminder%' OR
        type LIKE '%overdue%'
      )
      GROUP BY type
      ORDER BY count DESC
    `);
    console.log(autoNotifs.rows);
    
    // 8. Verificar se o scheduler está iniciado
    console.log('\n8. VERIFICANDO SE O SCHEDULER ESTÁ INICIADO:');
    console.log('✅ Este script está sendo executado, indicando que o banco está acessível');
    console.log('ℹ️ Para verificar se o scheduler automático está rodando, verifique os logs do servidor');
    console.log('ℹ️ Deve aparecer: "🚀 Iniciando scheduler automático de notificações..." e "✅ Scheduler automático ativo"');
    
    // 9. Verificar estrutura da tabela medication_schedules
    console.log('\n9. VERIFICANDO TABELA MEDICATION_SCHEDULES:');
    const scheduleTable = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'medication_schedules'
      ORDER BY ordinal_position
    `);
    console.log(scheduleTable.rows);
    
    console.log('\n=== ANÁLISE CONCLUÍDA ===');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erro na análise:', error);
    process.exit(1);
  }
}

main();