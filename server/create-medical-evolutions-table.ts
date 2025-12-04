import { pool } from './db';

async function createMedicalEvolutionsTable() {
  const client = await pool.connect();
  
  try {
    console.log('🏥 Criando tabela medical_evolutions...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS "medical_evolutions" (
        "id" serial PRIMARY KEY NOT NULL,
        "patient_id" integer NOT NULL,
        "doctor_id" integer NOT NULL,
        "doctor_name" text NOT NULL,
        "doctor_crm" text,
        "appointment_id" integer,
        "chief_complaint" text NOT NULL,
        "current_illness_history" text,
        "physical_exam" text,
        "vital_signs" text,
        "diagnostic_hypotheses" text,
        "therapeutic_plan" text,
        "prescribed_medications" text,
        "requested_exams" text,
        "general_recommendations" text,
        "additional_observations" text,
        "is_confirmed" boolean DEFAULT false,
        "digital_signature" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "medical_evolutions_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action,
        CONSTRAINT "medical_evolutions_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action,
        CONSTRAINT "medical_evolutions_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE no action ON UPDATE no action
      );
    `);
    
    console.log('📝 Criando índices para performance...');
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS "medical_evolutions_patient_id_idx" ON "medical_evolutions" ("patient_id");
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS "medical_evolutions_doctor_id_idx" ON "medical_evolutions" ("doctor_id");
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS "medical_evolutions_appointment_id_idx" ON "medical_evolutions" ("appointment_id");
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS "medical_evolutions_created_at_idx" ON "medical_evolutions" ("created_at");
    `);
    
    console.log('✅ Tabela medical_evolutions criada com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao criar tabela medical_evolutions:', error);
  } finally {
    client.release();
  }
}

// Executar se chamado diretamente
if (import.meta.url === new URL(process.argv[1], 'file://').href) {
  createMedicalEvolutionsTable().then(() => {
    console.log('🏁 Processo concluído');
    process.exit(0);
  }).catch((error) => {
    console.error('💥 Erro fatal:', error);
    process.exit(1);
  });
}

export { createMedicalEvolutionsTable };