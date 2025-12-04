import { db } from './db';
import { sql } from 'drizzle-orm';

async function createTestData() {
  try {
    console.log('=== CRIANDO DADOS DE TESTE PARA O SCHEDULER ===\n');
    
    // 1. Criar uma consulta para daqui a 30 minutos (teste de reminder)
    const now = new Date();
    const in30Min = new Date(now.getTime() + 30 * 60 * 1000);
    
    console.log('1. CRIANDO CONSULTA PARA TESTE (30 minutos)');
    const appointmentResult = await db.execute(sql`
      INSERT INTO appointments (patient_id, title, doctor_name, appointment_date, status, location, notes)
      VALUES (
        8, 
        'Consulta Teste Scheduler', 
        'Dr. Teste', 
        ${in30Min.toISOString()},
        'scheduled',
        'Clínica Teste',
        'Consulta criada para testar notificações automáticas'
      )
      RETURNING id, appointment_date
    `);
    console.log(`✅ Consulta criada: ID ${appointmentResult.rows[0]?.id} para ${appointmentResult.rows[0]?.appointment_date}`);
    
    // 2. Criar um exame para daqui a 1 hora (teste de reminder)
    const in1Hour = new Date(now.getTime() + 60 * 60 * 1000);
    
    console.log('\n2. CRIANDO EXAME PARA TESTE (1 hora)');
    const testResult = await db.execute(sql`
      INSERT INTO tests (patient_id, name, type, test_date, status, location)
      VALUES (
        8,
        'Exame Teste Scheduler',
        'Laboratorial',
        ${in1Hour.toISOString()},
        'scheduled',
        'Lab Teste'
      )
      RETURNING id, test_date
    `);
    console.log(`✅ Exame criado: ID ${testResult.rows[0]?.id} para ${testResult.rows[0]?.test_date}`);
    
    // 3. Criar um medicamento com horário para daqui a 15 minutos
    const in15Min = new Date(now.getTime() + 15 * 60 * 1000);
    const timeIn15Min = in15Min.toTimeString().substring(0, 5); // HH:MM
    
    console.log('\n3. CRIANDO MEDICAMENTO PARA TESTE (15 minutos)');
    const medicationResult = await db.execute(sql`
      INSERT INTO medications (patient_id, name, dosage, frequency, is_active, instructions, start_date, end_date)
      VALUES (
        8,
        'TESTE SCHEDULER 15MIN',
        '1 comprimido',
        'Uma vez',
        true,
        'Medicamento criado para testar notificações automáticas',
        ${now.toISOString()},
        ${new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()}
      )
      RETURNING id
    `);
    
    const medicationId = medicationResult.rows[0]?.id;
    console.log(`✅ Medicamento criado: ID ${medicationId}`);
    
    // 4. Criar horário para o medicamento
    console.log('\n4. CRIANDO HORÁRIO PARA O MEDICAMENTO');
    await db.execute(sql`
      INSERT INTO medication_schedules (medication_id, scheduled_time, is_active)
      VALUES (${medicationId}, ${timeIn15Min}, true)
    `);
    console.log(`✅ Horário criado: ${timeIn15Min} para medicamento ${medicationId}`);
    
    // 5. Criar consulta para 24 horas (teste de reminder longo)
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    console.log('\n5. CRIANDO CONSULTA PARA 24H (teste reminder longo)');
    const appointment24hResult = await db.execute(sql`
      INSERT INTO appointments (patient_id, title, doctor_name, appointment_date, status, location, notes)
      VALUES (
        8, 
        'Consulta 24h Teste', 
        'Dr. Scheduler', 
        ${in24Hours.toISOString()},
        'scheduled',
        'Clínica 24h',
        'Consulta criada para testar notificação de 24 horas'
      )
      RETURNING id, appointment_date
    `);
    console.log(`✅ Consulta 24h criada: ID ${appointment24hResult.rows[0]?.id} para ${appointment24hResult.rows[0]?.appointment_date}`);
    
    console.log('\n=== DADOS DE TESTE CRIADOS COM SUCESSO ===');
    console.log('🕐 Agora aguarde os próximos minutos e observe os logs do servidor:');
    console.log('- Em ~15 min: Notificações de medicamento');
    console.log('- Em ~30 min: Notificações de consulta');
    console.log('- Em ~60 min: Notificações de exame');
    console.log('- Em ~24h: Notificações de consulta 24h antes');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erro ao criar dados de teste:', error);
    process.exit(1);
  }
}

createTestData();