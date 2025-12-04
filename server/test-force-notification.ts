
import { db } from "./db";
import { globalNotifications, userNotifications } from "../shared/schema";
import { storage } from "./storage";
import { sql } from "drizzle-orm";

async function testForceNotification() {
  try {
    console.log('🧪 Teste: Forçando criação de notificação...');

    // 1. Criar notificação global diretamente
    console.log('📝 1. Criando notificação global...');
    
    const testData = {
      patientId: 8,
      patientName: "Ritiele Aldeburg Fera",
      type: "test_notification",
      subtype: "forced_test",
      title: "🧪 Teste Forçado",
      message: "Esta é uma notificação de teste forçada para debug",
      relatedId: 999,
      relatedType: "test",
      relatedItemName: "Teste Debug",
      priority: "high",
      urgencyScore: 80,
      originalScheduledTime: new Date(),
      notificationTriggerTime: new Date(),
      processedAt: new Date(),
      distributedAt: new Date(),
      distributionCount: 0,
      batchId: `test_force_${Date.now()}`,
      processingNode: 'test_node',
      metadata: JSON.stringify({
        createdBy: 'test_script',
        source: 'manual_test',
        timestamp: new Date().toISOString()
      }),
      deduplicationKey: `test_force_${Date.now()}`,
      isActive: true,
      retryCount: 0,
      lastError: null
    };

    console.log('📊 Dados do teste:', {
      patientId: testData.patientId,
      type: testData.type,
      title: testData.title
    });

    // Inserir usando método direto do storage
    const globalNotif = await storage.createGlobalNotification(testData);
    
    if (globalNotif) {
      console.log('✅ Notificação global criada:', {
        id: globalNotif.id,
        patientId: globalNotif.patientId,
        type: globalNotif.type,
        title: globalNotif.title
      });

      // 2. Criar user_notification correspondente
      console.log('📝 2. Criando user_notification...');
      
      const userNotif = await storage.createUserNotification({
        userId: 8,
        globalNotificationId: globalNotif.id,
        userProfileType: 'patient',
        userName: 'Ritiele Aldeburg Fera',
        accessType: 'owner',
        accessLevel: 'admin',
        deliveryStatus: 'delivered',
        isRead: false,
        deliveredAt: new Date(),
        deliveryMethod: 'web',
        deliveryAttempts: 1,
        priority: 'high',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });

      console.log('✅ User notification criada:', {
        id: userNotif.id,
        userId: userNotif.userId,
        globalId: userNotif.globalNotificationId
      });

      // 3. Verificar se apareceu no banco
      console.log('🔍 3. Verificando no banco...');
      
      const dbCheck = await db.execute(sql`
        SELECT 
          gn.id as global_id, gn.title, gn.type, gn.patient_id, gn.is_active,
          un.id as user_id, un.user_id as recipient_id, un.is_read
        FROM global_notifications gn
        LEFT JOIN user_notifications un ON gn.id = un.global_notification_id
        WHERE gn.id = ${globalNotif.id}
      `);

      console.log('📊 Resultado da verificação:', dbCheck.rows);

      // 4. Testar API
      console.log('🔍 4. Testando API...');
      
      const apiTest = await storage.getUserNotificationsByUserId(8, 5, 0);
      console.log('📊 API Response (primeiras 5):', apiTest.map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        isRead: n.isRead
      })));

    } else {
      console.error('❌ Falha ao criar notificação global');
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error);
  } finally {
    process.exit(0);
  }
}

testForceNotification();
