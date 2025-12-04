
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import * as fs from 'fs';

// Prioridade: RAILWAY_DATABASE_URL > DATABASE_URL (que não seja antiga)
// Isso permite que o secret do Replit tenha prioridade sobre qualquer valor do workflow
let DATABASE_URL = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;

// Se a DATABASE_URL contém o host antigo, ignorá-la
if (DATABASE_URL && DATABASE_URL.includes('agendamedic.postgresql.dbaas.com.br')) {
  console.log('⚠️ DATABASE_URL antiga detectada no workflow, ignorando...');
  DATABASE_URL = process.env.RAILWAY_DATABASE_URL;
}

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL não configurada ou inválida.');
  console.error('💡 Configure RAILWAY_DATABASE_URL nos Secrets do Replit com a URL do seu banco PostgreSQL Railway.');
  process.exit(1);
}

// Log da conexão (sem expor a senha)
const urlParts = DATABASE_URL.match(/postgresql:\/\/([^:]+):.*@([^:\/]+)/);
if (urlParts) {
  console.log(`🔌 Conectando ao banco: ${urlParts[2]} (usuário: ${urlParts[1]})`);
}

// Detectar se é Railway/ambiente de produção para configurar SSL
const isProduction = process.env.NODE_ENV === 'production' || 
                     process.env.RAILWAY_ENVIRONMENT !== undefined ||
                     DATABASE_URL.includes('railway.app');

export const pool = new Pool({ 
  connectionString: DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000, // 10 segundos
  idleTimeoutMillis: 30000, // 30 segundos
  max: 10, // máximo 10 conexões
  keepAlive: true,
  keepAliveInitialDelayMillis: 0
});

// Adicionar handler de erro para o pool
pool.on('error', (err) => {
  console.error('❌ Erro no pool de conexões PostgreSQL:', err);
});

pool.on('connect', () => {
  console.log('✅ Conexão PostgreSQL estabelecida');
});

export const db = drizzle(pool, { schema });
