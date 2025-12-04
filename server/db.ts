
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Use only Locaweb database configuration
const DATABASE_URL = "postgresql://agendamedic:Dr19122010%40%40@agendamedic.postgresql.dbaas.com.br:5432/agendamedic";

export const pool = new Pool({ 
  connectionString: DATABASE_URL,
  ssl: false,
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
