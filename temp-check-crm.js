import { db } from './server/db.ts';
import { examRequests } from './shared/schema.ts';
import { desc } from 'drizzle-orm';

async function checkCRM() {
  try {
    const result = await db.select().from(examRequests).orderBy(desc(examRequests.createdAt)).limit(5);
    console.log('📋 Últimas 5 requisições de exame:');
    result.forEach(req => {
      console.log(`ID: ${req.id}, Exame: ${req.examName}, Médico: ${req.doctorName}, CRM: ${req.doctorCrm}, Gênero: ${req.doctorGender}`);
    });
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    process.exit(0);
  }
}

checkCRM();