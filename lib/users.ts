import { ensureUsersTable, getPool } from './db';

export type UserRecord = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

type PostgresUserRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

function mapUser(row: PostgresUserRow): UserRecord {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
  };
}

export async function listUsers() {
  await ensureUsersTable();

  const result = await getPool().query<PostgresUserRow>(`
    SELECT id::text, name, email, phone
    FROM users
    ORDER BY created_at DESC, id DESC
  `);

  return result.rows.map(mapUser);
}

export async function createUser(user: Omit<UserRecord, 'id'>) {
  await ensureUsersTable();

  const result = await getPool().query<PostgresUserRow>(
    `
      INSERT INTO users (name, email, phone)
      VALUES ($1, $2, $3)
      RETURNING id::text, name, email, phone
    `,
    [user.name, user.email, user.phone],
  );

  return mapUser(result.rows[0]);
}

export async function updateUser(
  id: string,
  user: Omit<UserRecord, 'id' | 'phone'>,
) {
  await ensureUsersTable();

  const result = await getPool().query<PostgresUserRow>(
    `
      UPDATE users
      SET name = $1, email = $2
      WHERE id = $3
      RETURNING id::text, name, email, phone
    `,
    [user.name, user.email, id],
  );

  return result.rows[0] ? mapUser(result.rows[0]) : null;
}

export async function deleteUser(id: string) {
  await ensureUsersTable();

  const result = await getPool().query(
    'DELETE FROM users WHERE id = $1 RETURNING id',
    [id],
  );

  return (result.rowCount ?? 0) > 0;
}
