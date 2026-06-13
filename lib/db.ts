import { Pool } from "pg";

const globalForPg = globalThis as unknown as { pgPool?: Pool };

function databaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) return url;
  try {
    const parsed = new URL(url);
    if (!parsed.password) {
      throw new Error("Password di DATABASE_URL kosong. Isi password database Supabase setelah username, contoh: postgresql://postgres.project:password@host:6543/postgres?sslmode=require");
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("Password di DATABASE_URL kosong")) throw error;
    throw new Error("DATABASE_URL tidak valid. Gunakan format PostgreSQL, contoh: postgresql://user:password@host:6543/postgres?sslmode=require");
  }
  return url;
}

const connectionString = databaseUrl();

function needsSsl(url?: string) {
  if (!url) return false;
  return url.includes("sslmode=require") || url.includes("supabase.com") || url.includes("pooler.supabase.com");
}

export const pool =
  globalForPg.pgPool ??
  new Pool({
    connectionString,
    ssl: needsSsl(connectionString) ? { rejectUnauthorized: false } : undefined,
    max: Number(process.env.DB_POOL_MAX ?? 2),
    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS ?? 30000),
    connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS ?? 10000),
    statement_timeout: Number(process.env.DB_STATEMENT_TIMEOUT_MS ?? 15000)
  });

if (process.env.NODE_ENV !== "production") globalForPg.pgPool = pool;
