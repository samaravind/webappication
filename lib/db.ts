import { Pool } from 'pg';

type PostgresError = Error & {
  code?: string;
  syscall?: string;
};

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

export async function query<T extends Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
) {
  return getPool().query<T>(text, params);
}

export function ensureUsersTable() {
  schemaReady ??= getPool().query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT '';
  `).then(() => undefined);

  return schemaReady;
}

export const ensureSchema = ensureUsersTable;

export function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

export function getDatabaseErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "The database request failed.";
  }

  const pgError = error as PostgresError;

  if (pgError.message.includes("password authentication failed")) {
    return "PostgreSQL rejected the username or password in DATABASE_URL. Update .env.local with the password for your local PostgreSQL 17 install, run pnpm setup:db, then restart the Next.js dev server.";
  }

  if (pgError.code === "3D000") {
    return "The configured PostgreSQL database does not exist. Run pnpm setup:db or update DATABASE_URL in .env.local.";
  }

  if (pgError.code === "ECONNREFUSED" || pgError.syscall === "connect") {
    return "PostgreSQL is not reachable at the configured DATABASE_URL. Start the database or update .env.local, then restart the Next.js dev server.";
  }

  return error.message;
}
