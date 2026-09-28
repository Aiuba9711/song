/**
 * Valores que dependem do alojamento (Vercel e integrações de base de dados do Vercel Marketplace).
 * Sem dependências: usado pela aplicação, pelo prisma.config.ts e pelos scripts de build.
 */
type Env = Record<string, string | undefined>;

const clean = (v: string | undefined) => (v ?? "").trim();

/** URL pública: APP_URL; no Vercel, o domínio de produção ou o do próprio deploy (pré-visualização). */
export function resolveAppUrl(env: Env = process.env): string {
  const explicit = clean(env.APP_URL);
  if (explicit) return explicit.replace(/\/$/, "");
  const production = clean(env.VERCEL_PROJECT_PRODUCTION_URL);
  if (clean(env.VERCEL_ENV) === "production" && production) return `https://${production}`;
  const deployment = clean(env.VERCEL_URL);
  if (deployment) return `https://${deployment}`;
  return "http://localhost:3000";
}

/**
 * Ligação da aplicação. Aceita DATABASE_URL ou as variáveis criadas pelas integrações de
 * PostgreSQL do Vercel (POSTGRES_PRISMA_URL / POSTGRES_URL).
 */
export function resolveDatabaseUrl(env: Env = process.env): string {
  return clean(env.DATABASE_URL) || clean(env.POSTGRES_PRISMA_URL) || clean(env.POSTGRES_URL);
}

/** Ligação para migrações: de preferência direta (sem pooler), se o fornecedor a disponibilizar. */
export function resolveMigrationUrl(env: Env = process.env): string {
  return clean(env.DATABASE_URL_UNPOOLED) || clean(env.POSTGRES_URL_NON_POOLING) || resolveDatabaseUrl(env);
}

/**
 * Pasta do armazenamento local. No Vercel só /tmp pode ser escrito — e é TEMPORÁRIO (serve para
 * testar; em produção usar STORAGE_DRIVER=s3).
 */
export function resolveLocalStorageDir(env: Env = process.env): string {
  const explicit = clean(env.STORAGE_LOCAL_DIR);
  if (explicit) return explicit;
  return clean(env.VERCEL) ? "/tmp/efmz-storage" : "./storage";
}
