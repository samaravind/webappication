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

const databaseUrl = readDatabaseUrl();

if (!databaseUrl) {
  console.error("DATABASE_URL is not configured. Create .env.local from .env.example.");
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });

try {
  await pool.query("SELECT 1");
  console.log("Database connection OK.");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("password authentication failed")) {
    console.error(
      [
        "PostgreSQL rejected the username or password in DATABASE_URL.",
        "This project currently uses the default Docker-style URL:",
        `  ${databaseUrl.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:<password>@")}`,
        "Your machine has a native PostgreSQL server on port 5432, so update .env.local with the password you chose during PostgreSQL setup.",
        "Then run: pnpm setup:db",
      ].join("\n"),
    );
  } else {
    console.error(`Database connection failed: ${message}`);
  }

  process.exitCode = 1;
} finally {
  await pool.end();
}
