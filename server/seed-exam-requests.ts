import { pool } from './db.js';

async function seedExamRequests() {
  const client = await pool.connect();
  
  try {
    console.log('🌱 Criando dados de exemplo para requisições de exames...');
    
    // Verificar se já existem dados
    const existingData = await client.query('SELECT COUNT(*) FROM exam_requests');
    if (parseInt(existingData.rows[0].count) > 0) {
      console.log('✅ Dados de requisições já existem');
      return;
    }
    
    // Buscar paciente e médico para os dados de exemplo
    const patients = await client.query('SELECT id, name FROM users WHERE profile_type = $1 LIMIT 2', ['patient']);
    const doctors = await client.query('SELECT id, name FROM users WHERE profile_type = $1 LIMIT 2', ['doctor']);
    
    if (patients.rows.length === 0 || doctors.rows.length === 0) {
      console.log('⚠️ Não há pacientes ou médicos suficientes para criar dados de exemplo');
      return;
    }
    
    const patient = patients.rows[0];
    const doctor = doctors.rows[0];
    
    // Inserir requisições de exame de exemplo
    const examRequests = [
      {
        patientId: patient.id,
        doctorId: doctor.id,
        doctorName: doctor.name,
        doctorCrm: '12345-SP',
        examName: 'Hemograma Completo',
        examCategory: 'Laboratorial',
        clinicalIndication: 'Investigação de anemia e avaliação do estado hematológico geral',
        urgency: 'normal',
        specialInstructions: 'Jejum de 12 horas',
        medicalNotes: 'Paciente relata fadiga e palidez',
        validityDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
        status: 'pending'
      },
      {
        patientId: patient.id,
        doctorId: doctor.id,
        doctorName: doctor.name,
        doctorCrm: '12345-SP',
        examName: 'Radiografia de Tórax',
        examCategory: 'Imagem',
        clinicalIndication: 'Investigação de tosse persistente há 3 semanas',
        urgency: 'urgent',
        specialInstructions: 'Incidências PA e perfil',
        medicalNotes: 'Suspeita de processo inflamatório pulmonar',
        validityDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 dias
        status: 'pending'
      },
      {
        patientId: patient.id,
        doctorId: doctor.id,
        doctorName: doctor.name,
        doctorCrm: '12345-SP',
        examName: 'Eletrocardiograma',
        examCategory: 'Cardiológico',
        clinicalIndication: 'Palpitações e dor precordial esporádica',
        urgency: 'normal',
        specialInstructions: 'Repouso de 10 minutos antes do exame',
        medicalNotes: 'Avaliar ritmo cardíaco e possíveis alterações do ST',
        validityDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 dias
        status: 'pending'
      },
      {
        patientId: patient.id,
        doctorId: doctor.id,
        doctorName: doctor.name,
        doctorCrm: '12345-SP',
        examName: 'Ultrassom Abdominal',
        examCategory: 'Imagem',
        clinicalIndication: 'Dor abdominal em hipocôndrio direito',
        urgency: 'very_urgent',
        specialInstructions: 'Jejum de 8 horas e bexiga cheia',
        medicalNotes: 'Suspeita de colelitíase',
        validityDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
        status: 'pending'
      }
    ];
    
    for (const request of examRequests) {
      await client.query(`
        INSERT INTO exam_requests (
          patient_id, doctor_id, doctor_name, doctor_crm,
          exam_name, exam_category, clinical_indication, urgency,
          special_instructions, medical_notes, validity_date, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        request.patientId, request.doctorId, request.doctorName, request.doctorCrm,
        request.examName, request.examCategory, request.clinicalIndication, request.urgency,
        request.specialInstructions, request.medicalNotes, request.validityDate, request.status
      ]);
    }
    
    console.log(`✅ Criadas ${examRequests.length} requisições de exame de exemplo`);
    console.log(`📋 Requisições criadas para paciente: ${patient.name} (ID: ${patient.id})`);
    console.log(`👨‍⚕️ Médico responsável: Dr. ${doctor.name} (ID: ${doctor.id})`);
    
  } catch (error) {
    console.error('❌ Erro ao criar dados de exemplo:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Executar se foi chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  seedExamRequests()
    .then(() => {
      console.log('✅ Script de dados de exemplo finalizado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro no script:', error);
      process.exit(1);
    });
}

export { seedExamRequests };