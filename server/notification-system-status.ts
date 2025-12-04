// ========================================
// VERIFICADOR DE STATUS DO SISTEMA DE NOTIFICAÇÕES ENTERPRISE
// ========================================

import { db } from "./db";
import { sql } from "drizzle-orm";

export async function checkNotificationSystemStatus() {
  console.log('🔍 Verificando status do sistema de notificações...');

  try {
    // ========================================
    // 1. VERIFICAR TABELAS ESSENCIAIS
    // ========================================
    
    const tables = await db.execute(sql`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%notification%'
      ORDER BY table_name;
    `);

    console.log('📋 Tabelas de notificação encontradas:');
    tables.forEach(table => {
      console.log(`   ✓ ${table.table_name}`);
    });

    // ========================================
    // 2. VERIFICAR SCHEMA DE GLOBAL_NOTIFICATIONS
    // ========================================
    
    const globalSchema = await db.execute(sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'global_notifications'
      ORDER BY ordinal_position;
    `);

    console.log('\n📋 Schema da tabela global_notifications:');
    globalSchema.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // ========================================
    // 3. VERIFICAR DADOS ATUAIS
    // ========================================

    const globalCount = await db.execute(sql`SELECT COUNT(*) as count FROM global_notifications`);
    const userCount = await db.execute(sql`SELECT COUNT(*) as count FROM user_notifications`);
    
    // Verificar se existem as tabelas enterprise
    const jobsExists = tables.some(t => t.table_name === 'notification_jobs');
    const metricsExists = tables.some(t => t.table_name === 'notification_metrics');
    const rateLimitExists = tables.some(t => t.table_name === 'notification_rate_limit');

    let jobsCount = 0, metricsCount = 0, rateLimitCount = 0;
    
    if (jobsExists) {
      const jobs = await db.execute(sql`SELECT COUNT(*) as count FROM notification_jobs`);
      jobsCount = jobs[0]?.count || 0;
    }
    
    if (metricsExists) {
      const metrics = await db.execute(sql`SELECT COUNT(*) as count FROM notification_metrics`);
      metricsCount = metrics[0]?.count || 0;
    }
    
    if (rateLimitExists) {
      const rateLimit = await db.execute(sql`SELECT COUNT(*) as count FROM notification_rate_limit`);
      rateLimitCount = rateLimit[0]?.count || 0;
    }

    // ========================================
    // 4. RELATÓRIO DE STATUS
    // ========================================
    
    console.log('\n📊 RELATÓRIO DE STATUS DO SISTEMA:');
    console.log('=====================================');
    
    console.log('\n🔢 CONTADORES:');
    console.log(`   - Notificações globais: ${globalCount[0]?.count || 0}`);
    console.log(`   - Notificações de usuário: ${userCount[0]?.count || 0}`);
    console.log(`   - Jobs: ${jobsCount} ${jobsExists ? '✓' : '❌ TABELA MISSING'}`);
    console.log(`   - Métricas: ${metricsCount} ${metricsExists ? '✓' : '❌ TABELA MISSING'}`);
    console.log(`   - Rate limits: ${rateLimitCount} ${rateLimitExists ? '✓' : '❌ TABELA MISSING'}`);

    // ========================================
    // 5. VERIFICAR NOTIFICAÇÕES RECENTES
    // ========================================
    
    const recentGlobal = await db.execute(sql`
      SELECT type, COUNT(*) as count
      FROM global_notifications 
      WHERE created_at >= NOW() - INTERVAL '1 hour'
      GROUP BY type
      ORDER BY count DESC;
    `);

    console.log('\n🕐 NOTIFICAÇÕES DA ÚLTIMA HORA:');
    if (recentGlobal.length > 0) {
      recentGlobal.forEach(row => {
        console.log(`   - ${row.type}: ${row.count}`);
      });
    } else {
      console.log('   Nenhuma notificação criada na última hora');
    }

    // ========================================
    // 6. VERIFICAR INTEGRIDADE DOS DADOS
    // ========================================
    
    const orphanedNotifications = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM global_notifications 
      WHERE patient_id IS NULL 
      AND patient_name IS NULL;
    `);

    const invalidPatientIds = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM global_notifications gn
      LEFT JOIN users u ON gn.patient_id = u.id
      WHERE gn.patient_id IS NOT NULL 
      AND u.id IS NULL;
    `);

    console.log('\n🔍 INTEGRIDADE DOS DADOS:');
    console.log(`   - Notificações órfãs: ${orphanedNotifications[0]?.count || 0}`);
    console.log(`   - PatientIds inválidos: ${invalidPatientIds[0]?.count || 0}`);

    // ========================================
    // 7. VERIFICAR PERFORMANCE
    // ========================================
    
    const oldestUnread = await db.execute(sql`
      SELECT MIN(created_at) as oldest 
      FROM user_notifications 
      WHERE is_read = false;
    `);

    console.log('\n⚡ PERFORMANCE:');
    if (oldestUnread[0]?.oldest) {
      const oldestDate = new Date(oldestUnread[0].oldest);
      const hoursOld = Math.floor((Date.now() - oldestDate.getTime()) / (1000 * 60 * 60));
      console.log(`   - Notificação não lida mais antiga: ${hoursOld}h atrás`);
    } else {
      console.log('   - Todas as notificações foram lidas');
    }

    // ========================================
    // 8. RECOMENDAÇÕES
    // ========================================
    
    console.log('\n💡 RECOMENDAÇÕES:');
    
    if (!jobsExists || !metricsExists || !rateLimitExists) {
      console.log('   ❌ CRÍTICO: Tabelas enterprise faltando - execute a migração');
    }
    
    if (orphanedNotifications[0]?.count > 0) {
      console.log('   ⚠️ ATENÇÃO: Limpar notificações órfãs');
    }
    
    if (invalidPatientIds[0]?.count > 0) {
      console.log('   ⚠️ ATENÇÃO: Corrigir PatientIds inválidos');
    }

    const totalNotifications = (globalCount[0]?.count || 0) + (userCount[0]?.count || 0);
    
    if (totalNotifications > 10000) {
      console.log('   ⚡ PERFORMANCE: Considerar limpeza de notificações antigas');
    }

    console.log('\n✅ Verificação de status concluída');
    return {
      tablesFound: tables.length,
      globalNotifications: globalCount[0]?.count || 0,
      userNotifications: userCount[0]?.count || 0,
      jobsTableExists: jobsExists,
      metricsTableExists: metricsExists,
      rateLimitTableExists: rateLimitExists,
      orphanedCount: orphanedNotifications[0]?.count || 0,
      invalidPatientIds: invalidPatientIds[0]?.count || 0
    };

  } catch (error) {
    console.error('❌ Erro ao verificar status:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  checkNotificationSystemStatus()
    .then((status) => {
      console.log('\n📊 Status final:', JSON.stringify(status, null, 2));
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro na verificação:', error);
      process.exit(1);
    });
}