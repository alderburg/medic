// Teste direto para forçar criação de audit log
import { EnterpriseStorage } from "./storage-enterprise.js";

async function forceAuditTest() {
  const storage = new EnterpriseStorage();
  
  console.log('🧪 TESTE DIRETO: Criando audit log...');
  
  try {
    // Simular dados de requisição HTTP
    const mockReq = {
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'Force-Audit-Test/1.0',
        'x-request-id': 'force-test-123'
      },
      sessionID: 'force-session-123',
      get: (header: string) => {
        if (header === 'User-Agent') return 'Force-Audit-Test/1.0';
        return undefined;
      }
    };
    
    // Testar createAuditLogWithContext diretamente
    await storage.createAuditLogWithContext({
      entityType: 'prescription',
      entityId: 999,
      action: 'force_test',
      userId: 8,
      patientId: 8,
      success: true,
      details: JSON.stringify({ test: 'force audit log creation' })
    }, {
      req: mockReq as any,
      userId: 8,
      patientId: 8,
      correlationId: 'force-test-correlation-123',
      processingStartTime: Date.now() - 500,
      afterState: { test: 'after state' },
      beforeState: { test: 'before state' }
    });
    
    console.log('✅ TESTE DIRETO: Audit log criado com sucesso');
    
    // Verificar se foi inserido
    const { db } = await import("./db.js");
    const { sql } = await import("drizzle-orm");
    
    const results = await db.execute(sql.raw(`
      SELECT * FROM notification_audit_log 
      WHERE entity_id = 999 
      ORDER BY created_at DESC 
      LIMIT 1
    `));
    
    if (results.rows.length > 0) {
      const record = results.rows[0] as any;
      console.log('✅ SUCESSO: Registro encontrado na tabela!');
      console.log('📄 Dados:', {
        id: record.id,
        entity_type: record.entity_type,
        entity_id: record.entity_id,
        action: record.action,
        user_id: record.user_id,
        patient_id: record.patient_id,
        ip_address: record.ip_address,
        user_agent: record.user_agent,
        correlation_id: record.correlation_id,
        processing_time_ms: record.processing_time_ms,
        before_state: record.before_state,
        after_state: record.after_state,
        created_at: record.created_at
      });
    } else {
      console.log('❌ FALHA: Registro não foi encontrado na tabela');
    }
    
  } catch (error) {
    console.error('❌ ERRO no teste direto:', error);
  }
}

// Executar
forceAuditTest()
  .then(() => {
    console.log('\n🏁 Teste direto concluído');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Erro fatal no teste direto:', error);
    process.exit(1);
  });