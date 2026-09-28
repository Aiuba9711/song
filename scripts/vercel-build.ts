/**
 * Build no Vercel (executado automaticamente através do script npm «vercel-build»):
 *   1. verifica a configuração mínima (base de dados e APP_SECRET) com mensagens claras;
 *   2. aplica as migrações (prisma migrate deploy — só migrações aditivas);
 *   3. carrega os dados iniciais (seed idempotente: modelos, kits, fundos e roupas);
 *   4. cria/atualiza o administrador se ADMIN_EMAIL e ADMIN_PASSWORD estiverem definidos;
 *   5. next build.
 */
import { execSync } from "node:child_process";
import { resolveAppUrl, resolveDatabaseUrl, resolveMigrationUrl, resolveStorageDriver } from "../src/lib/deploy-env";

const env = process.env;
const problems: string[] = [];

if (!resolveDatabaseUrl(env)) {
  problems.push(
    "Falta a base de dados PostgreSQL. No Vercel: Project → Storage → Create Database (ou Marketplace → Neon/Postgres) → Connect ao projeto; isso cria a variável automaticamente. Em alternativa, defina DATABASE_URL em Settings → Environment Variables.",
  );
}
const secret = (env.APP_SECRET ?? "").trim();
if (secret.length < 32) {
  problems.push("Falta APP_SECRET (mínimo 32 caracteres aleatórios). No Vercel: Settings → Environment Variables → APP_SECRET.");
} else if (secret.startsWith("dev-only")) {
  problems.push("APP_SECRET é o valor de exemplo do desenvolvimento — gere um segredo novo.");
}

if (problems.length) {
  console.error("\n✖ Configuração do Vercel incompleta:\n");
  for (const p of problems) console.error(`  • ${p}\n`);
  console.error("Depois de corrigir, faça «Redeploy» no Vercel. Guia completo: DEPLOY_VERCEL.md\n");
  process.exit(1);
}

const run = (label: string, cmd: string, extra: Record<string, string> = {}) => {
  console.info(`\n▶ ${label}`);
  execSync(cmd, { stdio: "inherit", env: { ...env, ...extra } });
};

console.info(`URL do site: ${resolveAppUrl(env)}`);
const driver = resolveStorageDriver(env);
if (driver === "database") console.info("(i) Ficheiros (fotografias, comprovativos) guardados na base de dados PostgreSQL. Para grandes volumes: STORAGE_DRIVER=s3.");
if (driver === "local") console.warn("! STORAGE_DRIVER=local: no Vercel os ficheiros ficam em /tmp, TEMPORÁRIOS e não partilhados entre funções — as fotografias não funcionam. Use «database» ou «s3».");
if ((env.EMAIL_DRIVER ?? "console") !== "resend") {
  console.warn("! EMAIL_DRIVER não é «resend»: os emails (recuperação de senha, avisos de pagamento) não são enviados.");
}

run("Migrações da base de dados", "npx prisma migrate deploy", { DATABASE_URL: resolveMigrationUrl(env) });
run("Dados iniciais (modelos, kits, fundos, roupas)", "npx tsx prisma/seed.ts", { DATABASE_URL: resolveDatabaseUrl(env) });
if (env.ADMIN_EMAIL && env.ADMIN_PASSWORD) {
  run("Administrador", "npx tsx scripts/create-admin.ts", { DATABASE_URL: resolveDatabaseUrl(env) });
} else {
  console.info("\n(i) ADMIN_EMAIL/ADMIN_PASSWORD não definidos — o administrador não foi criado neste build.");
}
run("Build da aplicação", "npx next build");
