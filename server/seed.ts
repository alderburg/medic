import { db } from "./db";
import { users, medications, medicationSchedules, medicationLogs, appointments, prescriptions, notifications, careRelationships, tests } from "@shared/schema";
import bcrypt from "bcryptjs";

async function seed() {
  try {
    // Limpar dados existentes
    await db.delete(medicationLogs);
    await db.delete(medicationSchedules);
    await db.delete(medications);
    await db.delete(appointments);
    await db.delete(prescriptions);
    await db.delete(tests);
    await db.delete(notifications);
    await db.delete(careRelationships);
    await db.delete(users);

    

    // Criar usuários de teste
    const hashedPassword = await bcrypt.hash("123456", 10);
    
    const testUsers = await db.insert(users).values([
      {
        email: "ritialdeburg@gmail.com",
        password: hashedPassword,
        name: "Rita Lopes",
        age: 58,
        profileType: "patient",
        photo: null
      },
      {
        email: "cuidador@teste.com",
        password: hashedPassword,
        name: "Maria Santos",
        age: 45,
        profileType: "caregiver",
        photo: null
      }
    ]).returning();

    

    // Criar medicamentos
    const testMedications = await db.insert(medications).values([
      {
        patientId: testUsers[0].id,
        name: "Losartana 50mg",
        dosage: "50mg",
        frequency: "daily",
        startDate: new Date("2024-01-01"),
        endDate: null,
        instructions: "Tomar 1 comprimido pela manhã",
        isActive: true
      },
      {
        patientId: testUsers[0].id,
        name: "Metformina 500mg",
        dosage: "500mg",
        frequency: "twice_daily",
        startDate: new Date("2024-01-01"),
        endDate: null,
        instructions: "Tomar 1 comprimido de manhã e à noite",
        isActive: true
      },
      {
        patientId: testUsers[0].id,
        name: "Omeprazol 20mg",
        dosage: "20mg",
        frequency: "daily",
        startDate: new Date("2024-01-01"),
        endDate: null,
        instructions: "Tomar 1 comprimido em jejum",
        isActive: true
      },
      {
        patientId: testUsers[0].id,
        name: "Atorvastatina 40mg",
        dosage: "40mg",
        frequency: "daily",
        startDate: new Date("2024-01-01"),
        endDate: null,
        instructions: "Tomar 1 comprimido à noite",
        isActive: true
      },
      {
        patientId: testUsers[0].id,
        name: "Vitamina D3 2000UI",
        dosage: "2000UI",
        frequency: "daily",
        startDate: new Date("2024-01-01"),
        endDate: null,
        instructions: "Tomar 1 comprimido pela manhã",
        isActive: true
      }
    ]).returning();

    

    // Criar horários dos medicamentos
    const schedules = await db.insert(medicationSchedules).values([
      // Losartana - 08:00
      {
        medicationId: testMedications[0].id,
        scheduledTime: "08:00",
        isActive: true
      },
      // Metformina - 08:00 e 20:00
      {
        medicationId: testMedications[1].id,
        scheduledTime: "08:00",
        isActive: true
      },
      {
        medicationId: testMedications[1].id,
        scheduledTime: "20:00",
        isActive: true
      },
      // Omeprazol - 07:00 (jejum)
      {
        medicationId: testMedications[2].id,
        scheduledTime: "07:00",
        isActive: true
      },
      // Atorvastatina - 22:00
      {
        medicationId: testMedications[3].id,
        scheduledTime: "22:00",
        isActive: true
      },
      // Vitamina D3 - 09:00
      {
        medicationId: testMedications[4].id,
        scheduledTime: "09:00",
        isActive: true
      }
    ]).returning();

    

    // Criar logs de medicação para hoje
    const today = new Date();
    const todayLogs = [];

    // Gerar logs para os últimos 7 dias para mostrar gráfico de aderência
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      for (const schedule of schedules) {
        const scheduledDateTime = new Date(date);
        const [hours, minutes] = schedule.scheduledTime.split(':');
        scheduledDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        // Simular aderência: 85% dos medicamentos são tomados
        const isTaken = Math.random() > 0.15;
        
        const logEntry = {
          medicationId: schedule.medicationId,
          scheduleId: schedule.id,
          patientId: testUsers[0].id,
          scheduledDateTime,
          actualDateTime: isTaken ? new Date(scheduledDateTime.getTime() + Math.random() * 30 * 60000) : null, // até 30min de atraso
          status: i === 0 && !isTaken ? "pending" : (isTaken ? "taken" : "missed"), // hoje pode ter pendentes
          delayMinutes: isTaken ? Math.floor(Math.random() * 30) : 0,
          confirmedBy: isTaken ? testUsers[0].id : null,
          notes: null
        };
        
        todayLogs.push(logEntry);
      }
    }

    await db.insert(medicationLogs).values(todayLogs);
    

    // Criar algumas consultas
    await db.insert(appointments).values([
      {
        patientId: testUsers[0].id,
        title: "Consulta Cardiologista",
        doctorName: "Dr. Pedro Costa",
        location: "Hospital São Lucas",
        appointmentDate: new Date("2025-01-15T10:00:00"),
        notes: "Consulta de rotina para acompanhamento da hipertensão",
        status: "scheduled"
      },
      {
        patientId: testUsers[0].id,
        title: "Consulta Endocrinologista",
        doctorName: "Dra. Ana Silva",
        location: "Clínica Endocrino",
        appointmentDate: new Date("2025-01-22T14:30:00"),
        notes: "Revisão do tratamento de diabetes",
        status: "scheduled"
      }
    ]);

    

    // Criar exames
    await db.insert(tests).values([
      {
        patientId: testUsers[0].id,
        name: "Hemograma Completo",
        type: "laboratorial",
        location: "Laboratório Central",
        testDate: new Date("2025-01-10T08:00:00"),
        results: null,
        filePath: null,
        status: "scheduled"
      },
      {
        patientId: testUsers[0].id,
        name: "Glicemia de Jejum",
        type: "laboratorial",
        location: "Laboratório Central",
        testDate: new Date("2025-01-10T08:00:00"),
        results: null,
        filePath: null,
        status: "scheduled"
      }
    ]);

    

    // Criar receitas
    await db.insert(prescriptions).values([
      {
        patientId: testUsers[0].id,
        doctorName: "Dr. Pedro Costa",
        title: "Receita - Medicamentos Cardiovasculares",
        description: "Prescrição de Losartana e Atorvastatina para controle da hipertensão e colesterol",
        filePath: null,
        prescriptionDate: new Date("2024-12-01")
      },
      {
        patientId: testUsers[0].id,
        doctorName: "Dra. Ana Silva",
        title: "Receita - Medicamentos Diabetes",
        description: "Prescrição de Metformina para controle glicêmico",
        filePath: null,
        prescriptionDate: new Date("2024-12-01")
      }
    ]);

    

    // Notificações agora são criadas automaticamente pelo sistema de verificação em tempo real

    

    
    
  } catch (error) {
    
    throw error;
  }
}

// Executar seed se chamado diretamente
seed()
  .then(() => {
    
    process.exit(0);
  })
  .catch((error) => {
    
    process.exit(1);
  });

export { seed };