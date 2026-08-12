import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL tidak ditemukan");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });
const db = drizzle(sql);

console.log("Menjalankan migrasi database...");
await migrate(db, { migrationsFolder: "./drizzle" });
console.log("Migrasi selesai ✅");
await sql.end();
