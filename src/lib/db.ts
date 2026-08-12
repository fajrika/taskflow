import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

export const db = drizzle(pool);

export async function pingDb() {
  const res = await pool.query("SELECT 1");
  return res.rows.length === 1;
}
