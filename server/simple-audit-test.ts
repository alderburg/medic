// Teste simples do audit log usando query direta
import { db } from "./db.js";
import { sql } from "drizzle-orm";

async function testAuditLogDirect() {
  console.log('🧪 Teste direto do audit log');
  console.log('=============================');
  
  try {
    // Inserir um registro diretamente na tabela para testar
    const correlationId = `test_correlation_${Date.now()}`;
    const beforeState = JSON.stringify({ status: 'old', value: 'before' });
    const afterState = JSON.stringify({ status: 'new', value: 'after' });
    const details = JSON.stringify({ test: true, description: 'Teste direto dos novos campos' });

    await db.execute(sql.raw(`
      INSERT INTO notification_audit_log (
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
      ) VALUES (
        'test_entity',
        999,
        'test_action',
        8,
        true,
        '${beforeState}',
        '${afterState}',
        '${correlationId}',
        150,
        '127.0.0.1',
        'Test-Agent/1.0',
        'test_session_123',
        'req_test_123',
        'test_node',
        '${details}',
        NOW()
      )
    `));
    
    console.log('✅ Registro inserido com sucesso!');
    
    // Buscar registros recentes
    const results = await db.execute(sql.raw(`
      SELECT 
        id,
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
      WHERE created_at >= NOW() - INTERVAL '1 hour'
      ORDER BY created_at DESC 
      LIMIT 3
    `));
    
    console.log(`\n📋 Encontrados ${results.rows.length} registros recentes:`);
    console.log('═══════════════════════════════════════════════════');
    
    results.rows.forEach((row: any, index) => {
      console.log(`\n📄 Registro ${index + 1}:`);
      console.log(`   ID: ${row.id}`);
      console.log(`   Entidade: ${row.entity_type}#${row.entity_id}`);
      console.log(`   Ação: ${row.action}`);
      console.log(`   Usuário: ${row.user_id || 'N/A'}`);
      console.log(`   Sucesso: ${row.success}`);
      console.log(`   IP: ${row.ip_address || 'N/A'}`);
      console.log(`   User Agent: ${row.user_agent || 'N/A'}`);
      console.log(`   Sessão: ${row.session_id || 'N/A'}`);
      console.log(`   Request ID: ${row.request_id || 'N/A'}`);
      console.log(`   Processing Node: ${row.processing_node || 'N/A'}`);
      console.log(`   Correlation ID: ${row.correlation_id || 'N/A'}`);
      console.log(`   Processing Time: ${row.processing_time_ms || 'N/A'}ms`);
      console.log(`   Estado Anterior: ${row.before_state ? '✅ PREENCHIDO' : '❌ VAZIO'}`);
      console.log(`   Estado Posterior: ${row.after_state ? '✅ PREENCHIDO' : '❌ VAZIO'}`);
      console.log(`   Detalhes: ${row.details || 'N/A'}`);
      console.log(`   Criado em: ${row.created_at}`);
    });
    
    // Verificar se os novos campos estão funcionando
    const newFieldsTest = results.rows.map((row: any) => {
      const newFields = ['before_state', 'after_state', 'correlation_id', 'processing_time_ms'];
      const filledCount = newFields.filter(field => row[field] !== null).length;
      return {
        id: row.id,
        filledFields: filledCount,
        totalFields: newFields.length,
        success: filledCount === newFields.length
      };
    });
    
    const allWorking = newFieldsTest.every(test => test.success);
    
    console.log('\n🎯 RESULTADO DOS NOVOS CAMPOS:');
    console.log('═════════════════════════════════');
    newFieldsTest.forEach(test => {
      console.log(`  Registro ${test.id}: ${test.filledFields}/${test.totalFields} campos ${test.success ? '✅' : '❌'}`);
    });
    
    console.log(`\n📊 RESULTADO GERAL: ${allWorking ? '✅ TODOS OS CAMPOS FUNCIONANDO!' : '❌ ALGUNS PROBLEMAS ENCONTRADOS'}`);
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

// Executar
testAuditLogDirect()
  .then(() => {
    console.log('\n🏁 Teste concluído');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Erro fatal:', error);
    process.exit(1);
  });