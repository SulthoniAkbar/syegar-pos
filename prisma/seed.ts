import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

async function main() {
  const { db } = await import("../lib/database");
  const { pool } = await import("../lib/db");
  try {
    await db();
    console.log("Database PostgreSQL siap dan seed awal sudah dipastikan.");
  } finally {
    await pool.end();
  }
}

main();
