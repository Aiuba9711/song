import { z } from "zod";
import { resolveAppUrl, resolveDatabaseUrl, resolveLocalStorageDir, resolveStorageDriver } from "@/lib/deploy-env";

/**
 * Variáveis de ambiente do servidor, validadas uma única vez.
 * Nunca importar este módulo em componentes cliente.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatório"),
  APP_SECRET: z.string().min(32, "APP_SECRET deve ter pelo menos 32 caracteres"),

  STORAGE_DRIVER: z.enum(["local", "s3", "database"]).default("local"),
  STORAGE_LOCAL_DIR: z.string().default("./storage"),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().default("auto"),
  S3_ENDPOINT: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_FORCE_PATH_STYLE: z
    .string()
    .optional()
    .transform((v) => v === "true"),

  EMAIL_DRIVER: z.enum(["console", "resend"]).default("console"),
  EMAIL_FROM: z.string().default("Emprego Fácil MZ <nao-responder@empregofacilmz.com>"),
  RESEND_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse({
    ...process.env,
    // Valores automáticos no Vercel (URL do deploy, variáveis das integrações de PostgreSQL, /tmp).
    APP_URL: resolveAppUrl(),
    DATABASE_URL: resolveDatabaseUrl() || undefined,
    STORAGE_LOCAL_DIR: resolveLocalStorageDir(),
    STORAGE_DRIVER: resolveStorageDriver(),
  });
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Configuração inválida: ${issues}`);
  }
  // Proteção contra o uso acidental do segredo de exemplo num domínio público.
  if (parsed.data.NODE_ENV === "production" && parsed.data.APP_URL.startsWith("https://") && parsed.data.APP_SECRET.startsWith("dev-only")) {
    throw new Error("APP_SECRET de desenvolvimento não pode ser usado em produção");
  }
  cached = parsed.data;
  return cached;
}

export function appUrl(path = ""): string {
  const base = resolveAppUrl();
  return `${base}${path}`;
}
