import { Pool } from 'pg';

const globalForPostgres = globalThis as typeof globalThis & {
  userManagementPool?: Pool;
};

export function getPool() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured.');
  }

  globalForPostgres.userManagementPool ??= new Pool({
    connectionString,
    ssl: connectionString.includes('sslmode=require')
      ? { rejectUnauthorized: false }
      : undefined,
  });

  return globalForPostgres.userManagementPool;
}

let schemaReady: Promise<void> | null = null;

export function ensureUsersTable() {
  schemaReady ??= getPool().query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `).then(() => undefined);

  return schemaReady;
}
