/**
 * Prepara a base de dados de TESTE para os testes e2e:
 * migrações → limpeza → seed → administrador de teste.
 */
import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import { config } from "dotenv";
import { Client } from "pg";

config({ path: ".env.test", override: false, quiet: true });
const url = process.env.DATABASE_URL ?? "";
if (!url.includes("test")) throw new Error("Recusado: DATABASE_URL não parece ser uma base de dados de teste.");

const run = (cmd: string, extra: Record<string, string> = {}) => execSync(cmd, { stdio: "inherit", env: { ...process.env, ...extra } });

async function main() {
  run("npx prisma migrate deploy");
  const client = new Client({ connectionString: url });
  await client.connect();
  const { rows } = await client.query<{ tablename: string }>("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations'");
  if (rows.length) await client.query(`TRUNCATE TABLE ${rows.map((r) => `"${r.tablename}"`).join(", ")} CASCADE`);
  await client.end();
  rmSync(process.env.STORAGE_LOCAL_DIR ?? "./storage-test", { recursive: true, force: true });
  // Números FICTÍCIOS de teste (os reais só existem na configuração de produção).
  run("npx tsx prisma/seed.ts", { SEED_MPESA_NUMBER: "840000001", SEED_EMOLA_NUMBER: "860000002", SEED_MKESH_NUMBER: "820000003" });
  run("npx tsx scripts/create-admin.ts", { ADMIN_EMAIL: "admin@e2e.test", ADMIN_PASSWORD: "Admin-e2e-2026", ADMIN_NAME: "Admin E2E" });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
