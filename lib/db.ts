import { Pool, type QueryResultRow } from "pg";

let pool: Pool | undefined;
let schemaReady: Promise<void> | undefined;

type PostgresError = Error & {
  code?: string;
  syscall?: string;
};

function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

  pool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  return pool;
}

export async function query<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
) {
  const client = getPool();
  return client.query<T>(text, params);
}

export async function ensureSchema() {
  schemaReady ??= query(`
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
