import { pool } from './db.js';

async function migrateExamRequests() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Iniciando migração de requisições de exames...');
    
    // Verificar se a tabela já existe
    const checkTable = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'exam_requests'
    `);
    
    if (checkTable.rows.length > 0) {
      console.log('✅ Tabela exam_requests já existe');
      return;
    }
    
    // Criar tabela exam_requests
    await client.query(`
      CREATE TABLE exam_requests (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER NOT NULL REFERENCES users(id),
        doctor_id INTEGER NOT NULL REFERENCES users(id),
        doctor_name TEXT NOT NULL,
        doctor_crm TEXT,
        
        -- Detalhes da requisição médica
        exam_name TEXT NOT NULL,
        exam_category TEXT NOT NULL,
        clinical_indication TEXT NOT NULL,
        urgency VARCHAR(20) DEFAULT 'normal' NOT NULL,
        
        -- Instruções médicas
        special_instructions TEXT,
        medical_notes TEXT,
        validity_date TIMESTAMP,
        
        -- Controle da requisição
        status VARCHAR(20) DEFAULT 'pending' NOT NULL,
        scheduled_test_id INTEGER,
        
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    
    // Verificar se colunas já existem em tests
    const checkColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tests' AND column_name IN ('exam_request_id', 'preparation_notes')
    `);
    
    const existingColumns = checkColumns.rows.map(row => row.column_name);
    
    // Adicionar colunas se não existirem
    if (!existingColumns.includes('exam_request_id')) {
      await client.query('ALTER TABLE tests ADD COLUMN exam_request_id INTEGER REFERENCES exam_requests(id)');
    }
    
    if (!existingColumns.includes('preparation_notes')) {
      await client.query('ALTER TABLE tests ADD COLUMN preparation_notes TEXT');
    }
    
    // Criar índices
    await client.query('CREATE INDEX IF NOT EXISTS exam_requests_patient_id_idx ON exam_requests(patient_id)');
    await client.query('CREATE INDEX IF NOT EXISTS exam_requests_doctor_id_idx ON exam_requests(doctor_id)');
    await client.query('CREATE INDEX IF NOT EXISTS exam_requests_status_idx ON exam_requests(status)');
    await client.query('CREATE INDEX IF NOT EXISTS tests_exam_request_id_idx ON tests(exam_request_id)');
    
    // Adicionar constraint para scheduled_test_id (pode falhar se já existir)
    try {
      await client.query(`
        ALTER TABLE exam_requests ADD CONSTRAINT fk_exam_requests_scheduled_test 
        FOREIGN KEY (scheduled_test_id) REFERENCES tests(id)
      `);
    } catch (e) {
      console.log('⚠️ Constraint já existe ou erro na criação:', e.message);
    }
    
    console.log('✅ Migração de requisições de exames concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Executar se foi chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateExamRequests()
    .then(() => {
      console.log('✅ Script de migração finalizado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro no script:', error);
      process.exit(1);
    });
}

export { migrateExamRequests };