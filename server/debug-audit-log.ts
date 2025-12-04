// Debug para audit log inconsistente
import { db } from "./db";
import { sql } from "drizzle-orm";
import { EnterpriseStorage } from "./storage-enterprise";

async function debugAuditLog() {
  try {
    console.log("🔍 INVESTIGANDO PROBLEMAS DO AUDIT LOG...");
    
    // 1. Verificar se a tabela existe
    console.log("\n1️⃣ Verificando se tabela notification_audit_log existe:");
    const tableExists = await db.execute(sql.raw(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'notification_audit_log'
      );
    `));
    
    console.log("Tabela existe:", (tableExists.rows[0] as any).exists);
    
    // 2. Verificar estrutura da tabela
    console.log("\n2️⃣ Estrutura da tabela notification_audit_log:");
    const columns = await db.execute(sql.raw(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'notification_audit_log' 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `));
    
    for (const col of columns.rows) {
      const column = col as any;
      console.log(`  ${column.column_name}: ${column.data_type} (nullable: ${column.is_nullable})`);
    }
    
    // 3. Contar registros existentes
    console.log("\n3️⃣ Contando registros na tabela:");
    const count = await db.execute(sql.raw(`
      SELECT COUNT(*) as total FROM notification_audit_log;
    `));
    
    const totalRecords = (count.rows[0] as any).total;
    console.log(`Total de registros: ${totalRecords}`);
    
    // 4. Verificar últimos registros
    if (totalRecords > 0) {
      console.log("\n4️⃣ Últimos 5 registros de audit:");
      const recent = await db.execute(sql.raw(`
        SELECT id, entity_type, entity_id, action, user_id, success, created_at, error_message
        FROM notification_audit_log 
        ORDER BY id DESC 
        LIMIT 5;
      `));
      
      for (const record of recent.rows) {
        const r = record as any;
        console.log(`  ID ${r.id}: ${r.action} on ${r.entity_type} ${r.entity_id} by user ${r.user_id} - Success: ${r.success} - ${r.created_at}`);
        if (r.error_message) {
          console.log(`    Erro: ${r.error_message}`);
        }
      }
    }
    
    // 5. Teste de inserção direta
    console.log("\n5️⃣ Teste de inserção direta na tabela audit:");
    try {
      const directInsert = await db.execute(sql.raw(`
        INSERT INTO notification_audit_log 
        (entity_type, entity_id, action, user_id, success, details, created_at)
        VALUES 
        ('test', 999, 'debug_test', 8, true, '{"test": "direct insert"}', NOW())
        RETURNING id, created_at;
      `));
      
      if (directInsert.rows[0]) {
        const inserted = directInsert.rows[0] as any;
        console.log(`✅ Inserção direta bem-sucedida - ID: ${inserted.id}, Created: ${inserted.created_at}`);
      }
    } catch (directError) {
      console.error("❌ Erro na inserção direta:", directError);
    }
    
    // 6. Teste usando EnterpriseStorage.createAuditLog
    console.log("\n6️⃣ Teste usando EnterpriseStorage.createAuditLog:");
    const storage = new EnterpriseStorage();
    
    try {
      await storage.createAuditLog({
        entityType: 'test',
        entityId: 888,
        action: 'debug_simple',
        userId: 8,
        success: true,
        details: JSON.stringify({ test: 'simple audit log' })
      });
      console.log("✅ createAuditLog simples executado sem erro");
    } catch (simpleError) {
      console.error("❌ Erro em createAuditLog simples:", simpleError);
    }
    
    // 7. Teste usando EnterpriseStorage.createAuditLogWithContext
    console.log("\n7️⃣ Teste usando EnterpriseStorage.createAuditLogWithContext:");
    
    const mockReq = {
      ip: '127.0.0.1',
      get: (header: string) => header === 'User-Agent' ? 'Debug-Agent' : null,
      headers: { 'user-agent': 'Debug-Agent' },
      session: { id: 'debug-session' }
    };
    
    try {
      await storage.createAuditLogWithContext({
        entityType: 'test',
        entityId: 777,
        action: 'debug_context',
        userId: 8,
        success: true,
        details: JSON.stringify({ test: 'context audit log' })
      }, {
        req: mockReq as any,
        userId: 8,
        processingStartTime: Date.now() - 100,
        correlationId: 'debug-correlation-123'
      });
      console.log("✅ createAuditLogWithContext executado sem erro");
    } catch (contextError) {
      console.error("❌ Erro em createAuditLogWithContext:", contextError);
    }
    
    // 8. Verificar se os testes foram salvos
    console.log("\n8️⃣ Verificando se os testes foram salvos:");
    const testRecords = await db.execute(sql.raw(`
      SELECT id, entity_type, entity_id, action, user_id, success, created_at 
      FROM notification_audit_log 
      WHERE entity_type = 'test' 
      ORDER BY id DESC 
      LIMIT 10;
    `));
    
    console.log(`Encontrados ${testRecords.rows.length} registros de teste:`);
    for (const record of testRecords.rows) {
      const r = record as any;
      console.log(`  ID ${r.id}: ${r.action} on entity ${r.entity_id} - ${r.created_at}`);
    }
    
    // 9. Simular uma notificação real como no sistema
    console.log("\n9️⃣ Simulando criação de notificação real:");
    const mockHttpContext = {
      req: mockReq as any,
      userId: 8,
      processingStartTime: Date.now()
    };
    
    try {
      const globalNotification = await storage.createGlobalNotification({
        patientId: 8,
        patientName: 'Debug Patient',
        type: 'audit_debug',
        title: 'Debug Audit',
        message: 'Testando audit log consistency',
        relatedType: 'test',
        priority: 'normal',
        notificationTriggerTime: new Date(),
        metadata: JSON.stringify({
          source: 'audit_debug',
          timestamp: new Date().toISOString()
        })
      }, mockHttpContext);
      
      console.log(`✅ Notificação global criada com ID: ${globalNotification.id}`);
    } catch (globalError) {
      console.error("❌ Erro ao criar notificação global:", globalError);
    }
    
  } catch (error) {
    console.error("❌ Erro geral no debug:", error);
  }
}

debugAuditLog();