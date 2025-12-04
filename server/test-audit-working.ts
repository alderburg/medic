// Teste para verificar se o audit log está funcionando nas operações normais
import { db } from "./db.js";
import { sql } from "drizzle-orm";

async function testAuditLogWorking() {
  console.log('🔍 Verificando se o audit log está funcionando...');
  
  try {
    // Buscar registros criados recentemente (últimos 5 minutos)
    const results = await db.execute(sql.raw(`
      SELECT 
        id,
        entity_type,
        entity_id,
        action,
        user_id,
        patient_id,
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
      WHERE created_at >= NOW() - INTERVAL '5 minutes'
      ORDER BY created_at DESC 
      LIMIT 10
    `));
    
    console.log(`📋 Encontrados ${results.rows.length} registros dos últimos 5 minutos:`);
    console.log('═══════════════════════════════════════════════════');
    
    if (results.rows.length === 0) {
      console.log('❌ NENHUM REGISTRO ENCONTRADO nos últimos 5 minutos');
      console.log('   Isso indica que o audit log NÃO está sendo preenchido');
      
      // Verificar se existem registros mais antigos
      const oldResults = await db.execute(sql.raw(`
        SELECT COUNT(*) as total FROM notification_audit_log
      `));
      
      const total = (oldResults.rows[0] as any).total;
      console.log(`📊 Total de registros na tabela: ${total}`);
      
    } else {
      results.rows.forEach((row: any, index) => {
        console.log(`\n📄 Registro ${index + 1} (ID: ${row.id}):`);
        console.log(`   Entidade: ${row.entity_type}#${row.entity_id}`);
        console.log(`   Ação: ${row.action}`);
        console.log(`   Usuário: ${row.user_id || 'N/A'}`);
        console.log(`   Paciente: ${row.patient_id || 'N/A'}`);
        console.log(`   Sucesso: ${row.success}`);
        
        // Verificar novos campos
        const newFieldsStatus = {
          before_state: row.before_state !== null,
          after_state: row.after_state !== null,
          correlation_id: row.correlation_id !== null,
          processing_time_ms: row.processing_time_ms !== null,
          ip_address: row.ip_address !== null,
          user_agent: row.user_agent !== null
        };
        
        console.log(`   📊 Novos campos:`);
        Object.entries(newFieldsStatus).forEach(([field, filled]) => {
          console.log(`     - ${field}: ${filled ? '✅' : '❌'}`);
        });
        
        console.log(`   🕐 Criado: ${row.created_at}`);
      });
      
      // Estatísticas gerais
      const withHttpContext = results.rows.filter((row: any) => 
        row.ip_address && row.user_agent
      ).length;
      
      console.log(`\n📊 ESTATÍSTICAS:`);
      console.log(`   - Registros com contexto HTTP: ${withHttpContext}/${results.rows.length}`);
      console.log(`   - Taxa de preenchimento: ${((withHttpContext/results.rows.length)*100).toFixed(1)}%`);
      
      if (withHttpContext === 0) {
        console.log(`\n❌ PROBLEMA: Nenhum registro tem contexto HTTP preenchido`);
        console.log(`   Isso significa que o contexto da requisição não está sendo passado`);
      } else {
        console.log(`\n✅ SUCESSO: Audit log está funcionando com contexto HTTP!`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro na verificação:', error);
  }
}

// Executar
testAuditLogWorking()
  .then(() => {
    console.log('\n🏁 Verificação concluída');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Erro fatal:', error);
    process.exit(1);
  });