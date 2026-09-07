import { existsSync, readFileSync } from "node:fs";
import { Pool } from "pg";

function readDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  if (!existsSync(".env.local")) {
    return undefined;
  }

  const env = readFileSync(".env.local", "utf8");
  const match = env.match(/^DATABASE_URL=(.*)$/m);
  return match?.[1]?.trim().replace(/^['"]|['"]$/g, "");
}

function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

const databaseUrl = readDatabaseUrl();

if (!databaseUrl) {
  console.error("DATABASE_URL is not configured. Create .env.local from .env.example.");
  process.exit(1);
}

const appUrl = new URL(databaseUrl);
const databaseName = appUrl.pathname.slice(1);

if (!databaseName) {
  console.error("DATABASE_URL must include a database name.");
  process.exit(1);
}

const maintenanceUrl = new URL(databaseUrl);
maintenanceUrl.pathname = "/postgres";

const maintenancePool = new Pool({
  connectionString: maintenanceUrl.toString(),
});

try {
  const existsResult = await maintenancePool.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [databaseName],
  );

  if (existsResult.rowCount === 0) {
    await maintenancePool.query(`CREATE DATABASE ${quoteIdentifier(databaseName)}`);
    console.log(`Created database ${databaseName}.`);
  } else {
    console.log(`Database ${databaseName} already exists.`);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("password authentication failed")) {
    console.error(
      [
        "PostgreSQL rejected the username or password in DATABASE_URL.",
        "Update .env.local with the password for your local PostgreSQL user, then run this command again.",
      ].join("\n"),
    );
  } else {
    console.error(`Could not create/check database: ${message}`);
  }

  process.exit(1);
} finally {
  await maintenancePool.end();
}

const appPool = new Pool({
  connectionString: databaseUrl,
});

try {
  await appPool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT '';
  `);
  console.log("Users table is ready.");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Could not create/check users table: ${message}`);
  process.exit(1);
} finally {
  await appPool.end();
}
