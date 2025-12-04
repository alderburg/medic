// Script para testar o preenchimento dos campos do audit log
import { db } from "./db.js";
import { sql } from "drizzle-orm";
import { storage } from "./storage.js";

export async function testAuditLog() {
  console.log('🧪 Testando preenchimento dos campos do audit log...');
  
  try {
    // Simular requisição HTTP para teste
    const mockRequest = {
      ip: '127.0.0.1',
      get: (header: string) => {
        if (header === 'User-Agent') return 'TestBot/1.0 (Testing Audit Log)';
        return undefined;
      },
      sessionID: 'test_session_123'
    };

    const userId = 1;
    const processingStartTime = Date.now();
    
    // Simular um estado antes e depois
    const beforeState = {
      id: 999,
      status: 'unread',
      isRead: false
    };
    
    const afterState = {
      id: 999,
      status: 'read',
      isRead: true
    };
    
    const correlationId = `test_audit_${Date.now()}`;
    
    console.log('📝 Criando entrada de audit log...');
    
    await storage.createAuditLogWithContext({
      entityType: 'user_notification',
      entityId: 999,
      action: 'read',
      userId: userId,
      success: true,
      details: JSON.stringify({
        testCase: 'Demonstração de preenchimento completo dos campos',
        endpoint: '/test/audit-log',
        notificationId: 999,
        previousStatus: 'unread',
        newStatus: 'read'
      })
    }, {
      req: mockRequest as any,
      userId: userId,
      beforeState: beforeState,
      afterState: afterState,
      processingStartTime: processingStartTime,
      correlationId: correlationId
    });
    
    // Buscar a entrada criada
    console.log('🔍 Verificando entrada criada...');
    const auditEntries = await db.execute(sql.raw(`
      SELECT 
        id,
        entity_type,
        entity_id,
        action,
        user_id,
        success,
        error_message,
        details,
        ip_address,
        user_agent,
        session_id,
        correlation_id,
        before_state,
        after_state,
        processing_time_ms,
        processing_node,
        request_id,
        created_at
      FROM notification_audit_log 
      WHERE correlation_id = $1
      ORDER BY created_at DESC 
      LIMIT 1
    `, [correlationId]));
    
    if (auditEntries.rows.length > 0) {
      const entry = auditEntries.rows[0] as any;
      console.log('✅ Entrada de audit log criada com sucesso!');
      console.log('📋 Dados capturados:');
      console.log(`  - ID: ${entry.id}`);
      console.log(`  - Entity: ${entry.entity_type}#${entry.entity_id}`);
      console.log(`  - Action: ${entry.action}`);
      console.log(`  - User ID: ${entry.user_id}`);
      console.log(`  - Success: ${entry.success}`);
      console.log(`  - IP Address: ${entry.ip_address}`);
      console.log(`  - User Agent: ${entry.user_agent}`);
      console.log(`  - Session ID: ${entry.session_id}`);
      console.log(`  - Correlation ID: ${entry.correlation_id}`);
      console.log(`  - Processing Time: ${entry.processing_time_ms}ms`);
      console.log(`  - Processing Node: ${entry.processing_node}`);
      console.log(`  - Request ID: ${entry.request_id}`);
      console.log(`  - Before State: ${entry.before_state ? 'PREENCHIDO ✅' : 'VAZIO ❌'}`);
      console.log(`  - After State: ${entry.after_state ? 'PREENCHIDO ✅' : 'VAZIO ❌'}`);
      console.log(`  - Details: ${entry.details}`);
      console.log(`  - Created At: ${entry.created_at}`);
      
      // Verificar se todos os novos campos foram preenchidos
      const newFieldsStatus = {
        before_state: entry.before_state !== null,
        after_state: entry.after_state !== null,
        correlation_id: entry.correlation_id !== null,
        processing_time_ms: entry.processing_time_ms !== null
      };
      
      console.log('\n🎯 Status dos novos campos:');
      Object.entries(newFieldsStatus).forEach(([field, filled]) => {
        console.log(`  - ${field}: ${filled ? '✅ PREENCHIDO' : '❌ VAZIO'}`);
      });
      
      const allFieldsFilled = Object.values(newFieldsStatus).every(filled => filled);
      console.log(`\n📊 Resultado: ${allFieldsFilled ? '✅ TODOS OS CAMPOS PREENCHIDOS!' : '❌ ALGUNS CAMPOS VAZIOS'}`);
      
    } else {
      console.log('❌ Nenhuma entrada encontrada!');
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  testAuditLog()
    .then(() => {
      console.log('🏁 Teste concluído');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Erro fatal:', error);
      process.exit(1);
    });
}