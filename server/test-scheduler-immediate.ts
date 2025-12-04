import { startNotificationScheduler, stopNotificationScheduler } from './notification-scheduler';
import { storage } from './storage';

async function testSchedulerImmediate() {
  try {
    console.log('=== TESTE IMEDIATO DO SCHEDULER ===\n');
    
    // 1. Testar busca de medicamentos
    console.log('1. TESTANDO BUSCA DE MEDICAMENTOS:');
    const medications = await storage.getAllActiveMedications();
    console.log(`✅ Encontrados ${medications.length} medicamentos ativos`);
    
    for (const med of medications) {
      console.log(`  - ${med.name} (ID: ${med.id}, Paciente: ${med.patient_name})`);
      
      const schedules = await storage.getMedicationSchedulesToday(med.id);
      console.log(`    Horários: ${schedules.length} encontrados`);
      for (const schedule of schedules) {
        console.log(`      - ${schedule.scheduled_time} (ID: ${schedule.id})`);
      }
    }
    
    // 2. Testar busca de consultas
    console.log('\n2. TESTANDO BUSCA DE CONSULTAS:');
    const appointments = await storage.getUpcomingAppointments();
    console.log(`✅ Encontradas ${appointments.length} consultas futuras`);
    
    for (const appt of appointments) {
      console.log(`  - ${appt.title} (ID: ${appt.id}) em ${appt.appointment_date}`);
    }
    
    // 3. Testar busca de exames
    console.log('\n3. TESTANDO BUSCA DE EXAMES:');
    const tests = await storage.getUpcomingTests();
    console.log(`✅ Encontrados ${tests.length} exames futuros`);
    
    for (const test of tests) {
      console.log(`  - ${test.name} (ID: ${test.id}) em ${test.test_date}`);
    }
    
    // 4. Verificar horário atual vs dados criados
    console.log('\n4. VERIFICANDO HORÁRIOS:');
    const now = new Date();
    console.log(`  Horário atual: ${now.toTimeString().substring(0, 8)}`);
    
    // Verificar medicamentos próximos
    for (const med of medications) {
      const schedules = await storage.getMedicationSchedulesToday(med.id);
      for (const schedule of schedules) {
        const scheduledTime = new Date(`${now.toISOString().split('T')[0]}T${schedule.scheduled_time}:00`);
        const diffMinutes = Math.round((scheduledTime.getTime() - now.getTime()) / (1000 * 60));
        console.log(`    - ${med.name} em ${schedule.scheduled_time}: ${diffMinutes} minutos`);
        
        if (Math.abs(diffMinutes) <= 30) {
          console.log(`      ⏰ DENTRO DA JANELA DE NOTIFICAÇÃO!`);
        }
      }
    }
    
    // Verificar consultas próximas
    for (const appt of appointments) {
      const apptTime = new Date(appt.appointment_date);
      const diffMinutes = Math.round((apptTime.getTime() - now.getTime()) / (1000 * 60));
      console.log(`    - ${appt.title}: ${diffMinutes} minutos`);
      
      if (Math.abs(diffMinutes) <= 60) {
        console.log(`      ⏰ DENTRO DA JANELA DE NOTIFICAÇÃO!`);
      }
    }
    
    // 5. Verificar se foram criadas notificações
    console.log('\n5. VERIFICANDO NOTIFICAÇÕES CRIADAS:');
    const recentNotifications = await storage.getAllRecentNotifications();
    console.log(`✅ Encontradas ${recentNotifications.length} notificações recentes`);
    
    const today = new Date().toISOString().split('T')[0];
    const todayNotifications = recentNotifications.filter(n => 
      n.created_at?.startsWith(today) && 
      (n.type?.includes('reminder') || n.type?.includes('overdue'))
    );
    
    console.log(`📊 Notificações automáticas de hoje: ${todayNotifications.length}`);
    for (const notif of todayNotifications.slice(0, 5)) {
      console.log(`  - ${notif.title}: ${notif.message}`);
    }
    
    console.log('\n=== TESTE CONCLUÍDO ===');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
    process.exit(1);
  }
}

testSchedulerImmediate();