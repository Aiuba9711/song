import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/security/rate-limit";
import { resetDatabase } from "../support/db";

beforeEach(resetDatabase);

describe("rate limiting (PostgreSQL)", () => {
  it("bloqueia após o limite e informa quando tentar de novo", async () => {
    for (let i = 0; i < 3; i++) expect((await rateLimit("t:login", 3, 60)).ok).toBe(true);
    const blocked = await rateLimit("t:login", 3, 60);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("a janela reinicia depois de expirar", async () => {
    await rateLimit("t:x", 1, 60);
    expect((await rateLimit("t:x", 1, 60)).ok).toBe(false);
    await db.rateLimitBucket.update({ where: { key: "t:x" }, data: { resetAt: new Date(Date.now() - 1000) } });
    expect((await rateLimit("t:x", 1, 60)).ok).toBe(true);
  });

  it("é seguro com pedidos concorrentes", async () => {
    const results = await Promise.all(Array.from({ length: 10 }, () => rateLimit("t:conc", 5, 60)));
    expect(results.filter((r) => r.ok)).toHaveLength(5);
  });
});
