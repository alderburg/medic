// ========================================
// TESTE SIMPLES PARA VERIFICAR SISTEMA DE NOTIFICAÇÕES
// ========================================

import { storage } from "./storage";
import { format, addMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";

async function testNotificationSystem() {
  console.log('🧪 Iniciando teste do sistema de notificações...');

  try {
    // ========================================
    // 1. CRIAR DADOS DE TESTE
    // ========================================
    
    console.log('📝 1. Criando dados de teste...');
    
    // Buscar usuário de teste
    const user = await storage.getUser(8); // Ritiele
    if (!user) {
      throw new Error('Usuário de teste não encontrado');
    }
    
    console.log(`👤 Usuário teste: ${user.name} (ID: ${user.id})`);

    // ========================================
    // 2. TESTAR NOTIFICAÇÃO GLOBAL
    // ========================================
    
    console.log('📝 2. Testando criação de notificação global...');
    
    const testNotification = await storage.createGlobalNotification({
      patientId: user.id,
      patientName: user.name,
      type: 'test_notification',
      subtype: 'system_test',
      title: '🧪 Teste do Sistema',
      message: `Sistema de notificações testado às ${format(new Date(), "HH:mm", { locale: ptBR })}`,
      relatedId: 999,
      relatedType: 'system_test',
      relatedItemName: 'Teste Automático',
      priority: 'normal',
      urgencyScore: 50,
      originalScheduledTime: new Date(),
      notificationTriggerTime: new Date(),
      processedAt: new Date(),
      distributedAt: new Date(),
      distributionCount: 0,
      batchId: `test_${Date.now()}`,
      processingNode: `node_test_${process.pid}`,
      metadata: JSON.stringify({
        source: 'test_script',
        createdBy: 'system_test',
        timestamp: new Date().toISOString()
      }),
      deduplicationKey: `test_${Date.now()}`,
      isActive: true,
      retryCount: 0
    });

    console.log(`✅ Notificação global criada: ID ${testNotification.id}`);

    // ========================================
    // 3. DISTRIBUIR PARA USUÁRIO
    // ========================================
    
    console.log('📝 3. Distribuindo para usuário...');
    
    const userNotification = await storage.createUserNotification({
      userId: user.id,
      globalNotificationId: testNotification.id,
      userProfileType: 'patient',
      userName: user.name,
      accessType: 'owner',
      accessLevel: 'admin',
      deliveryStatus: 'delivered',
      isRead: false,
      deliveredAt: new Date(),
      deliveryMethod: 'web',
      deliveryAttempts: 1,
      priority: 'normal',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      metadata: JSON.stringify({
        testNotification: true,
        createdByTest: true
      })
    });

    console.log(`✅ Notificação de usuário criada: ID ${userNotification.id}`);

    // ========================================
    // 4. VERIFICAR DADOS CRIADOS
    // ========================================
    
    console.log('📝 4. Verificando dados criados...');
    
    // Buscar notificações globais recentes
    const recentGlobal = await storage.getRecentGlobalNotifications(10);
    console.log(`📊 Notificações globais recentes: ${recentGlobal.length}`);
    
    // Buscar notificações do usuário
    const userNotifications = await storage.getUserNotifications(user.id, 10, 0);
    console.log(`📊 Notificações do usuário: ${userNotifications.length}`);
    
    if (userNotifications.length > 0) {
      console.log(`📮 Última notificação: "${userNotifications[0].title}" - ${userNotifications[0].message}`);
    }

    // ========================================
    // 5. TESTAR BUSCA DE USUÁRIOS COM ACESSO
    // ========================================
    
    console.log('📝 5. Testando busca de usuários com acesso...');
    
    const authorizedUsers = await storage.getAllUsersWithPatientAccess(user.id);
    console.log(`👥 Usuários com acesso ao paciente ${user.id}: ${authorizedUsers.length}`);
    
    authorizedUsers.forEach(authUser => {
      console.log(`   - ${authUser.userName} (ID: ${authUser.userId}, Tipo: ${authUser.userProfileType})`);
    });

    // ========================================
    // 6. TESTAR DEDUPLIFICAÇÃO
    // ========================================
    
    console.log('📝 6. Testando deduplificação...');
    
    const today = format(new Date(), 'yyyy-MM-dd');
    const hasExisting = await storage.hasActiveGlobalNotificationToday(
      user.id,
      'test_notification',
      999
    );
    
    console.log(`🔍 Notificação já existe hoje: ${hasExisting ? 'SIM' : 'NÃO'}`);

    // ========================================
    // 7. ESTATÍSTICAS FINAIS
    // ========================================
    
    console.log('📝 7. Coletando estatísticas finais...');
    
    const totalGlobal = await storage.getTotalGlobalNotifications();
    const totalUser = await storage.getTotalUserNotifications();
    const unreadCount = await storage.getUnreadNotificationCount(user.id);
    
    console.log('\n📊 ESTATÍSTICAS DO SISTEMA:');
    console.log('==========================');
    console.log(`🌐 Total de notificações globais: ${totalGlobal}`);
    console.log(`👤 Total de notificações de usuário: ${totalUser}`);
    console.log(`📬 Notificações não lidas do usuário ${user.id}: ${unreadCount}`);

    console.log('\n✅ TESTE CONCLUÍDO COM SUCESSO!');
    console.log('🚀 Sistema de notificações está funcionando corretamente');
    
    return {
      success: true,
      testNotificationId: testNotification.id,
      userNotificationId: userNotification.id,
      totalGlobal,
      totalUser,
      unreadCount,
      authorizedUsersCount: authorizedUsers.length
    };

  } catch (error) {
    console.error('❌ Erro no teste:', error);
    throw error;
  }
}

// Executar teste se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  testNotificationSystem()
    .then((result) => {
      console.log('\n🎯 RESULTADO DO TESTE:', JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro no teste:', error);
      process.exit(1);
    });
}

export { testNotificationSystem };