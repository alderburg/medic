import { db } from './db';

async function migrateCrmAndDoctorGender() {
  try {
    console.log('🔄 Iniciando migração para CRM e gênero do médico...');
    
    // Adicionar campo CRM à tabela users
    await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS crm VARCHAR(50)`);
    console.log('✅ Campo CRM adicionado à tabela users');
    
    // Adicionar campo doctor_gender à tabela exam_requests
    await db.execute(`ALTER TABLE exam_requests ADD COLUMN IF NOT EXISTS doctor_gender VARCHAR(10)`);
    console.log('✅ Campo doctor_gender adicionado à tabela exam_requests');
    
    console.log('🎉 Migração concluída com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    process.exit(1);
  }
}

migrateCrmAndDoctorGender();