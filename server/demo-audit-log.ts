// Demonstração do preenchimento completo dos campos do audit log
import { db } from "./db.js";
import { sql } from "drizzle-orm";
import { enterpriseStorage } from "./storage-enterprise-methods.js";

export async function demoAuditLogFields() {
  console.log('🚀 DEMONSTRAÇÃO: Campos completos do audit log');
  console.log('================================');
  
  try {
    // Simular contexto da requisição
    const mockContext = {
      req: {
        ip: '192.168.1.100',
        get: (header: string) => {
          if (header === 'User-Agent') return 'Mozilla/5.0 (Test Browser)';
          return undefined;
        },
        sessionID: `session_${Date.now()}`
      },
      userId: 8,
      beforeState: { status: 'unread', isRead: false, priority: 'low' },
      afterState: { status: 'read', isRead: true, priority: 'high' },
      processingStartTime: Date.now() - 150, // Simula 150ms de processamento
      correlationId: `demo_${Date.now()}`
    };

    console.log('📝 Criando entrada com todos os campos preenchidos...');
    
    // Usar diretamente o método do enterprise storage
    await enterpriseStorage.createAuditLogWithContext({
      entityType: 'user_notification',
      entityId: 123,
      action: 'status_change',
      userId: 8,
      success: true,
      details: JSON.stringify({
        demo: true,
        description: 'Demonstração de preenchimento completo',
        changes: ['status: unread -> read', 'priority: low -> high']
      })
    }, mockContext);
    
    // Buscar a entrada criada
    const results = await db.execute(sql.raw(`
      SELECT 
        entity_type,
        entity_id,
        action,
        user_id,
        success,
        before_state,
        after_state,
        correlation_id,
        processing_time_ms,
        ip_address,
        user_agent,
        session_id,
        request_id,
        processing_node,
        details,
        created_at
      FROM notification_audit_log 
      WHERE correlation_id = $1
    `, [mockContext.correlationId]));
    
    if (results.rows.length > 0) {
      const entry = results.rows[0] as any;
      console.log('✅ SUCESSO! Entrada criada com todos os campos:');
      console.log('───────────────────────────────────────────────');
      console.log(`📋 Entidade: ${entry.entity_type}#${entry.entity_id}`);
      console.log(`🎯 Ação: ${entry.action}`);  
      console.log(`👤 Usuário: ${entry.user_id}`);
      console.log(`✅ Sucesso: ${entry.success}`);
      console.log(`📍 IP: ${entry.ip_address}`);
      console.log(`🌐 User Agent: ${entry.user_agent}`);
      console.log(`🔒 Sessão: ${entry.session_id}`);
      console.log(`🔗 Request ID: ${entry.request_id}`);
      console.log(`🖥️ Processing Node: ${entry.processing_node}`);
      console.log(`🔗 Correlation ID: ${entry.correlation_id}`);
      console.log(`⏱️ Tempo Processamento: ${entry.processing_time_ms}ms`);
      
      console.log('\n🔄 Estados capturados:');
      console.log(`📥 Estado Anterior: ${entry.before_state || 'null'}`);
      console.log(`📤 Estado Posterior: ${entry.after_state || 'null'}`);
      
      console.log(`\n📄 Detalhes: ${entry.details}`);
      console.log(`🕐 Criado em: ${entry.created_at}`);
      
      // Verificar se todos os novos campos foram preenchidos
      const newFields = ['before_state', 'after_state', 'correlation_id', 'processing_time_ms'];
      const filledFields = newFields.filter(field => entry[field] !== null);
      
      console.log('\n📊 RESULTADO DOS NOVOS CAMPOS:');
      console.log('═════════════════════════════════');
      newFields.forEach(field => {
        const filled = entry[field] !== null;
        console.log(`${filled ? '✅' : '❌'} ${field}: ${filled ? 'PREENCHIDO' : 'VAZIO'}`);
      });
      
      const success = filledFields.length === newFields.length;
      console.log(`\n🎯 RESULTADO FINAL: ${success ? '✅ TODOS OS CAMPOS FORAM PREENCHIDOS!' : `❌ ${filledFields.length}/${newFields.length} campos preenchidos`}`);
      
      if (success) {
        console.log('\n🏆 AUDIT LOG ENTERPRISE FUNCIONANDO PERFEITAMENTE!');
        console.log('     Todos os campos solicitados estão sendo capturados.');
      }
    } else {
      console.log('❌ Entrada não encontrada no banco');
    }
    
  } catch (error) {
    console.error('❌ Erro na demonstração:', error);
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  demoAuditLogFields()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('💥 Erro fatal:', error);
      process.exit(1);
    });
}