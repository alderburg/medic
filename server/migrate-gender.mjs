import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function migrateGender() {
  try {
    console.log('🔄 Executando migração para adicionar campo gender...');
    
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS gender VARCHAR(10)
    `);
    
    console.log('✅ Campo gender adicionado à tabela users com sucesso!');
    
    // Verificar se o campo foi adicionado
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'gender'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Confirmado: Campo gender existe na tabela users');
      console.log(`   Tipo: ${result.rows[0].data_type}`);
    } else {
      console.log('❌ Erro: Campo gender não foi criado');
    }
    
  } catch (error) {
    console.error('❌ Erro na migração:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

migrateGender();