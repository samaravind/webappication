import { ensureSchema, query } from "@/lib/db";
import type { UserInput } from "@/lib/validation";

export type User = {
  id: number;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
};

type UserRow = {
  id: number;
  name: string;
  email: string;
  phone: string;
  created_at: Date;
};

function toUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    createdAt: row.created_at.toISOString(),
  };
}

export async function listUsers() {
  await ensureSchema();

  const result = await query<UserRow>(`
    SELECT id, name, email, phone, created_at
    FROM users
    ORDER BY created_at DESC, id DESC;
  `);

  return result.rows.map(toUser);
}

export async function createUser(input: UserInput) {
  await ensureSchema();

  const result = await query<UserRow>(
    `
      INSERT INTO users (name, email, phone)
      VALUES ($1, $2, $3)
      RETURNING id, name, email, phone, created_at;
    `,
    [input.name, input.email, input.phone],
  );

  return toUser(result.rows[0]);
}

export async function updateUser(id: number, input: UserInput) {
  await ensureSchema();

  const result = await query<UserRow>(
    `
      UPDATE users
      SET name = $1, email = $2, phone = $3
      WHERE id = $4
      RETURNING id, name, email, phone, created_at;
    `,
    [input.name, input.email, input.phone, id],
  );

  return result.rows[0] ? toUser(result.rows[0]) : null;
}

export async function deleteUser(id: number) {
  await ensureSchema();

  const result = await query<UserRow>(
    `
      DELETE FROM users
      WHERE id = $1
      RETURNING id, name, email, phone, created_at;
    `,
    [id],
  );

  return result.rows[0] ? toUser(result.rows[0]) : null;
}
