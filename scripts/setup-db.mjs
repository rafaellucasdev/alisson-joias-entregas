// ============================================================================
//  Aplica o schema + seed no banco do Supabase usando a DATABASE_URL.
//  Uso:  npm run db:push
//  Requer DATABASE_URL no .env.local (Supabase > Settings > Database > URI).
// ============================================================================
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local" });
config({ path: ".env" });

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("\n[erro] DATABASE_URL não definida no .env.local\n");
  process.exit(1);
}

const migrationsDir = join(root, "supabase/migrations");
const migrations = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();
const seed = readFileSync(join(root, "supabase/seed.sql"), "utf8");

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  for (const file of migrations) {
    console.log(`→ Aplicando migration (${file})...`);
    await client.query(readFileSync(join(migrationsDir, file), "utf8"));
  }
  console.log("→ Aplicando seed (seed.sql)...");
  await client.query(seed);
  console.log("\n✅ Banco pronto! Tabelas criadas e dados de exemplo inseridos.\n");
} catch (err) {
  console.error("\n❌ Falha ao aplicar migrations:\n", err.message, "\n");
  process.exitCode = 1;
} finally {
  await client.end();
}
