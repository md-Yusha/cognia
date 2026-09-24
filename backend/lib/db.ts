import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : undefined,
  max: 3,
});

let ready: Promise<void> | null = null;

export function dbReady() {
  if (!process.env.DATABASE_URL) return Promise.resolve();
  if (!ready) {
    ready = pool.query(`
      CREATE TABLE IF NOT EXISTS care_messages (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        sender TEXT NOT NULL,
        body TEXT NOT NULL,
        created_at BIGINT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS stress_alerts (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        level TEXT NOT NULL,
        reasons TEXT NOT NULL,
        latitude DOUBLE PRECISION,
        longitude DOUBLE PRECISION,
        created_at BIGINT NOT NULL
      );
    `).then(() => undefined);
  }
  return ready;
}

export async function dbQuery<T = Record<string, unknown>>(text: string, params: unknown[] = []) {
  if (!process.env.DATABASE_URL) return { rows: [] as T[] };
  await dbReady();
  const result = await pool.query(text, params);
  return { rows: result.rows as T[] };
}
