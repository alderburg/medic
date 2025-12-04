
import { enterpriseStorage as storage } from "./storage-enterprise";
import { startNotificationScheduler, stopNotificationScheduler } from "./notification-scheduler";

async function testNotificationGeneration() {
  console.log('🧪 INICIANDO TESTE DE GERAÇÃO DE NOTIFICAÇÕES');
  
  try {
    // 1. Verificar medicamentos ativos
    const medications = await storage.getAllActiveMedications();
    console.log(`📊 Medicamentos ativos encontrados: ${medications.length}`);
    
    for (const med of medications) {
      console.log(`  - ${med.name} (ID: ${med.id}, Paciente: ${med.patient_id})`);
      
      const schedules = await storage.getSchedulesByMedication(med.id);
      console.log(`    Horários: ${schedules.map(s => s.scheduled_time).join(', ')}`);
    }
    
    // 2. Verificar notificações existentes
    const existingNotifications = await storage.countGlobalNotificationsInPeriod(
      new Date(Date.now() - 24 * 60 * 60 * 1000),
      new Date()
    );
    console.log(`📬 Notificações existentes (últimas 24h): ${existingNotifications}`);
    
    // 3. Executar verificação manual
    console.log('🔄 Executando verificação manual de medicamentos...');
    
    // Importar função de verificação
    const { checkMedicationNotifications } = await import('./notification-scheduler');
    await checkMedicationNotifications();
    
    // 4. Verificar se novas notificações foram criadas
    const newNotifications = await storage.countGlobalNotificationsInPeriod(
      new Date(Date.now() - 5 * 60 * 1000), // últimos 5 minutos
      new Date()
    );
    console.log(`📬 Novas notificações criadas: ${newNotifications}`);
    
    // 5. Mostrar detalhes das notificações mais recentes
    const recentNotifications = await storage.getUserNotificationsByUserId(8, 10, 0);
    console.log(`📋 Notificações recentes do usuário 8:`);
    recentNotifications.forEach((notif, index) => {
      console.log(`  ${index + 1}. ${notif.title} - ${notif.message} (${notif.type})`);
    });
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

// Executar teste
testNotificationGeneration();
