// ============================================================================
//  Aplica o schema + seed no banco do Supabase usando a DATABASE_URL.
//  Uso:  npm run db:push
//  Requer DATABASE_URL no .env.local (Supabase > Settings > Database > URI).
// ============================================================================
import { readFileSync } from "node:fs";
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

const schema = readFileSync(join(root, "supabase/migrations/0001_schema.sql"), "utf8");
const seed = readFileSync(join(root, "supabase/seed.sql"), "utf8");

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log("→ Aplicando schema (0001_schema.sql)...");
  await client.query(schema);
  console.log("→ Aplicando seed (seed.sql)...");
  await client.query(seed);
  console.log("\n✅ Banco pronto! Tabelas criadas e dados de exemplo inseridos.\n");
} catch (err) {
  console.error("\n❌ Falha ao aplicar migrations:\n", err.message, "\n");
  process.exitCode = 1;
} finally {
  await client.end();
}
