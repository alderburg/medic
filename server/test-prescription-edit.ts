// Teste de edição de receita para verificar audit log
import { storage } from "./storage";
import { EnterpriseStorage } from "./storage-enterprise";

async function testPrescriptionEdit() {
  try {
    console.log('🧪 TESTANDO EDIÇÃO DE RECEITA E AUDIT LOG...');
    
    const enterpriseStorage = new EnterpriseStorage();
    
    // Simular uma requisição HTTP como a que vem do frontend
    const mockReq = {
      ip: '192.168.1.100',
      get: (header: string) => {
        if (header === 'User-Agent') return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
        return null;
      },
      headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      session: { id: 'test-session-123' },
      user: { id: 8, name: 'Ritiele Aldeburg' }
    };
    
    // Simular a função createEnterpriseNotification como ela é chamada nos routes
    const createEnterpriseNotificationTest = async (data: any, req?: any) => {
      console.log('🔔 Criando notificação enterprise (TEST):', {
        userId: data.userId,
        type: data.type,
        title: data.title,
        patientId: data.patientId
      });
      
      const processingStartTime = Date.now();
      const httpContext = req ? {
        req: req,
        userId: data.userId,
        processingStartTime: processingStartTime
      } : undefined;
      
      console.log('🔍 TEST - httpContext criado:', {
        hasReq: !!httpContext?.req,
        userId: httpContext?.userId,
        hasProcessingStartTime: !!httpContext?.processingStartTime
      });
      
      const globalNotification = await enterpriseStorage.createGlobalNotification({
        patientId: data.patientId,
        patientName: 'Ritiele Aldeburg',
        type: data.type,
        title: data.title,
        message: data.message,
        relatedType: 'prescription',
        relatedId: data.relatedId,
        priority: data.priority || 'normal',
        notificationTriggerTime: new Date(),
        metadata: JSON.stringify({
          source: 'prescription_edit_test',
          timestamp: new Date().toISOString()
        })
      }, httpContext);
      
      console.log('✅ TEST - Notificação global criada com ID:', globalNotification.id);
      return globalNotification;
    };
    
    // Simular edição de receita
    console.log('📝 Simulando edição de receita...');
    
    await createEnterpriseNotificationTest({
      userId: 8,
      type: 'prescription_edited',
      title: 'Receita Editada (TESTE)',
      message: 'Receita "Dipirona 500mg": título alterado para teste de audit log',
      patientId: 8,
      relatedId: 20,
      priority: 'normal'
    }, mockReq);
    
    console.log('✅ Teste de edição completado');
    
    // Verificar se o audit log foi criado
    console.log('\n🔍 Verificando audit logs criados...');
    
    // Aguardar um pouco para garantir que foi salvo
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const { db } = await import("./db");
    const { sql } = await import("drizzle-orm");
    
    const recentAudits = await db.execute(sql.raw(`
      SELECT 
        id, entity_type, entity_id, action, user_id, success, 
        ip_address, user_agent, created_at, correlation_id
      FROM notification_audit_log 
      WHERE created_at > NOW() - INTERVAL '1 minute'
      ORDER BY id DESC 
      LIMIT 5
    `));
    
    if (recentAudits.rows.length > 0) {
      console.log(`\n✅ SUCESSO! Encontrados ${recentAudits.rows.length} audit logs recentes:`);
      for (const audit of recentAudits.rows) {
        const a = audit as any;
        console.log(`  ID ${a.id}: ${a.action} on ${a.entity_type} ${a.entity_id} by user ${a.user_id} - ${a.created_at}`);
        console.log(`    IP: ${a.ip_address} | Correlation: ${a.correlation_id}`);
      }
    } else {
      console.log('❌ PROBLEMA: Nenhum audit log recente encontrado');
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

testPrescriptionEdit();