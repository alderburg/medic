// Verificar audit logs após a correção
import { db } from "./db";
import { sql } from "drizzle-orm";

async function checkAuditAfterFix() {
  try {
    console.log("🔍 VERIFICANDO AUDIT LOGS APÓS CORREÇÃO...");
    
    // Contar total de registros de audit
    const totalCount = await db.execute(sql.raw(`
      SELECT COUNT(*) as total FROM notification_audit_log
    `));
    
    const total = (totalCount.rows[0] as any).total;
    console.log(`📊 Total de audit logs: ${total}`);
    
    if (total > 0) {
      // Buscar os últimos 10 registros
      const recent = await db.execute(sql.raw(`
        SELECT 
          id,
          entity_type,
          entity_id,
          action,
          user_id,
          success,
          details,
          ip_address,
          user_agent,
          created_at,
          correlation_id
        FROM notification_audit_log 
        ORDER BY id DESC 
        LIMIT 10
      `));
      
      console.log(`\n📋 ÚLTIMOS ${recent.rows.length} AUDIT LOGS:`);
      for (const record of recent.rows) {
        const r = record as any;
        console.log(`\n🔹 ID ${r.id}:`);
        console.log(`  📋 Tipo: ${r.entity_type} | Entidade: ${r.entity_id} | Ação: ${r.action}`);
        console.log(`  👤 Usuário: ${r.user_id} | Sucesso: ${r.success}`);
        console.log(`  🕐 Criado em: ${r.created_at}`);
        console.log(`  🌐 IP: ${r.ip_address} | User-Agent: ${r.user_agent ? r.user_agent.substring(0, 30) + '...' : 'N/A'}`);
        console.log(`  🔗 Correlation ID: ${r.correlation_id}`);
        
        if (r.details) {
          try {
            const details = JSON.parse(r.details);
            console.log(`  📝 Detalhes: ${JSON.stringify(details, null, 2).substring(0, 200)}...`);
          } catch (e) {
            console.log(`  📝 Detalhes: ${r.details}`);
          }
        }
      }
      
      // Verificar audit logs por tipo de entidade
      console.log(`\n📊 AUDIT LOGS POR TIPO DE ENTIDADE:`);
      const byEntityType = await db.execute(sql.raw(`
        SELECT 
          entity_type,
          COUNT(*) as count,
          MAX(created_at) as last_created
        FROM notification_audit_log 
        GROUP BY entity_type 
        ORDER BY count DESC
      `));
      
      for (const type of byEntityType.rows) {
        const t = type as any;
        console.log(`  ${t.entity_type}: ${t.count} registros (último: ${t.last_created})`);
      }
      
      // Verificar audit logs por ação
      console.log(`\n📊 AUDIT LOGS POR AÇÃO:`);
      const byAction = await db.execute(sql.raw(`
        SELECT 
          action,
          COUNT(*) as count,
          MAX(created_at) as last_created
        FROM notification_audit_log 
        GROUP BY action 
        ORDER BY count DESC
      `));
      
      for (const action of byAction.rows) {
        const a = action as any;
        console.log(`  ${a.action}: ${a.count} registros (último: ${a.last_created})`);
      }
      
    } else {
      console.log("⚠️ Nenhum audit log encontrado ainda");
    }
    
  } catch (error) {
    console.error("❌ Erro:", error);
  }
}

checkAuditAfterFix();