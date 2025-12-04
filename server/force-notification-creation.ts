
import { enterpriseStorage as storage } from "./storage-enterprise";
import { format } from "date-fns";

async function forceCreateNotifications() {
  console.log('🚀 FORÇANDO CRIAÇÃO DE NOTIFICAÇÕES PARA TESTE');
  
  try {
    // Buscar medicamentos ativos
    const medications = await storage.getAllActiveMedications();
    console.log(`📊 Encontrados ${medications.length} medicamentos`);
    
    for (const medication of medications) {
      const patientId = medication.patient_id || medication.patientId;
      
      if (!patientId) {
        console.log(`⚠️ Pulando medicamento ${medication.name} - sem patientId`);
        continue;
      }
      
      // Buscar schedules
      const schedules = await storage.getSchedulesByMedication(medication.id);
      console.log(`📅 ${medication.name} tem ${schedules.length} horários`);
      
      for (const schedule of schedules) {
        const today = format(new Date(), 'yyyy-MM-dd');
        const timingKey = `test_notification_${patientId}_${schedule.id}_${today}`;
        
        // Verificar se já existe
        const exists = await storage.hasSpecificNotificationToday(
          patientId,
          'medication_reminder',
          schedule.id,
          timingKey
        );
        
        if (!exists) {
          // Criar notificação de teste
          const scheduledTime = new Date();
          const [hours, minutes] = schedule.scheduled_time.split(':');
          scheduledTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          
          await storage.createGlobalNotification({
            patientId: patientId,
            patientName: 'Teste Paciente',
            type: 'medication_reminder',
            subtype: 'test',
            title: 'Teste de Medicamento',
            message: `Teste: ${medication.name} às ${schedule.scheduled_time}`,
            relatedId: schedule.id,
            relatedType: 'medication',
            relatedItemName: medication.name,
            priority: 'normal',
            urgencyScore: 50,
            originalScheduledTime: scheduledTime,
            notificationTriggerTime: new Date(),
            processedAt: new Date(),
            distributedAt: new Date(),
            distributionCount: 0,
            batchId: `test_${Date.now()}`,
            processingNode: 'test_node',
            metadata: JSON.stringify({
              source: 'forced_test',
              medicationId: medication.id,
              scheduleId: schedule.id,
              timestamp: new Date().toISOString()
            }),
            deduplicationKey: timingKey,
            isActive: true,
            retryCount: 0
          });
          
          console.log(`✅ Notificação criada: ${medication.name} às ${schedule.scheduled_time}`);
          
          // Distribuir para usuários
          const authorizedUsers = await storage.getAllUsersWithPatientAccess(patientId);
          
          for (const user of authorizedUsers) {
            await storage.createUserNotification({
              userId: user.userId,
              globalNotificationId: 0, // Será atualizado
              userProfileType: user.profileType || 'patient',
              userName: user.name || 'Usuário',
              accessType: user.accessType || 'owner',
              accessLevel: user.accessLevel || 'admin',
              deliveryStatus: 'delivered',
              isRead: false,
              deliveredAt: new Date(),
              deliveryMethod: 'web',
              deliveryAttempts: 1,
              priority: 'normal',
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
            });
          }
          
        } else {
          console.log(`⏭️ Notificação já existe: ${medication.name} às ${schedule.scheduled_time}`);
        }
      }
    }
    
    console.log('✅ Teste de criação concluído');
    
  } catch (error) {
    console.error('❌ Erro ao forçar criação:', error);
  }
}

// Executar
forceCreateNotifications();
