
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Usar variável de ambiente DATABASE_URL (compatível com Railway, Heroku, Neon, etc.)
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL não configurada. Configure a variável de ambiente DATABASE_URL.');
  process.exit(1);
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
