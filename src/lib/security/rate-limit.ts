import "server-only";
import { db } from "@/lib/db";

export type RateLimitResult = { ok: boolean; remaining: number; retryAfterSeconds: number };

/**
 * Rate limiting de janela fixa guardado no PostgreSQL (uma única query atómica),
 * para funcionar corretamente com várias instâncias serverless sem Redis.
 * Se o tráfego crescer, pode ser substituído por Redis/Upstash mantendo esta assinatura.
 */
export async function rateLimit(key: string, baseLimit: number, windowSeconds: number): Promise<RateLimitResult> {
  // RATE_LIMIT_SCALE permite aumentar os limites em testes automatizados (nunca reduzir a segurança em produção por omissão).
  const scale = Math.max(1, Number(process.env.RATE_LIMIT_SCALE) || 1);
  const limit = baseLimit * scale;
  const rows = await db.$queryRaw<Array<{ count: number; resetAt: Date }>>`
    INSERT INTO "RateLimitBucket" ("key", "count", "resetAt")
    VALUES (${key}, 1, now() + make_interval(secs => ${windowSeconds}))
    ON CONFLICT ("key") DO UPDATE SET
      "count"   = CASE WHEN "RateLimitBucket"."resetAt" < now() THEN 1 ELSE "RateLimitBucket"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimitBucket"."resetAt" < now() THEN now() + make_interval(secs => ${windowSeconds}) ELSE "RateLimitBucket"."resetAt" END
    RETURNING "count", "resetAt"`;

  // Limpeza ocasional de janelas expiradas.
  if (Math.random() < 0.01) {
    await db.rateLimitBucket.deleteMany({ where: { resetAt: { lt: new Date() } } }).catch(() => undefined);
  }

  const row = rows[0]!;
  const retryAfterSeconds = Math.max(0, Math.ceil((row.resetAt.getTime() - Date.now()) / 1000));
  return { ok: row.count <= limit, remaining: Math.max(0, limit - row.count), retryAfterSeconds };
}

/** Limites usados na aplicação (tentativas / janela em segundos). */
export const LIMITS = {
  login: { limit: 10, window: 15 * 60 },
  register: { limit: 5, window: 60 * 60 },
  passwordReset: { limit: 5, window: 60 * 60 },
  export: { limit: 60, window: 60 * 60 },
  upload: { limit: 30, window: 60 * 60 },
  claimFree: { limit: 10, window: 60 * 60 },
  ai: { limit: 40, window: 60 * 60 },
} as const;
