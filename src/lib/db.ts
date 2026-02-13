import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool | null {
  if (pool) return pool;
  if (!process.env.DATABASE_URL) return null;
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return pool;
}

export async function listTables() {
  const p = getPool();
  if (!p) return null;

  const result = await p.query(
    "SELECT relname AS name, n_live_tup::int AS rows FROM pg_stat_user_tables WHERE schemaname = 'public' ORDER BY relname",
  );

  return result.rows as { name: string; rows: number }[];
}

export async function runQuery(sql: string) {
  const p = getPool();
  if (!p) return null;

  const result = await p.query(sql);
  const columns = result.fields.map((f) => f.name);
  const rows = result.rows.slice(0, 500).map((row) => columns.map((col) => row[col]));

  return { columns, rows };
}
