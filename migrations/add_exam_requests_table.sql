-- Criar tabela exam_requests
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
);

-- Adicionar coluna exam_request_id à tabela tests
ALTER TABLE tests ADD COLUMN exam_request_id INTEGER REFERENCES exam_requests(id);
ALTER TABLE tests ADD COLUMN preparation_notes TEXT;

-- Criar índices para performance
CREATE INDEX exam_requests_patient_id_idx ON exam_requests(patient_id);
CREATE INDEX exam_requests_doctor_id_idx ON exam_requests(doctor_id);
CREATE INDEX exam_requests_status_idx ON exam_requests(status);
CREATE INDEX tests_exam_request_id_idx ON tests(exam_request_id);

-- Adicionar constraint para scheduled_test_id
ALTER TABLE exam_requests ADD CONSTRAINT fk_exam_requests_scheduled_test 
  FOREIGN KEY (scheduled_test_id) REFERENCES tests(id);