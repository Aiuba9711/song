import { describe, expect, it } from "vitest";
import { resolveAppUrl, resolveDatabaseUrl, resolveLocalStorageDir, resolveMigrationUrl } from "@/lib/deploy-env";
import { checkProductionEnv } from "@/lib/production-check";

describe("configuração no Vercel", () => {
  it("URL do site: APP_URL; senão domínio de produção; senão o do deploy", () => {
    expect(resolveAppUrl({ APP_URL: "https://site.example/" })).toBe("https://site.example");
    expect(resolveAppUrl({ VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "song.vercel.app", VERCEL_URL: "song-x1.vercel.app" })).toBe("https://song.vercel.app");
    expect(resolveAppUrl({ VERCEL_ENV: "preview", VERCEL_PROJECT_PRODUCTION_URL: "song.vercel.app", VERCEL_URL: "song-x1.vercel.app" })).toBe("https://song-x1.vercel.app");
    expect(resolveAppUrl({})).toBe("http://localhost:3000");
  });

  it("base de dados: DATABASE_URL ou variáveis das integrações PostgreSQL do Vercel", () => {
    expect(resolveDatabaseUrl({ DATABASE_URL: "postgres://a", POSTGRES_URL: "postgres://b" })).toBe("postgres://a");
    expect(resolveDatabaseUrl({ POSTGRES_PRISMA_URL: "postgres://p", POSTGRES_URL: "postgres://b" })).toBe("postgres://p");
    expect(resolveDatabaseUrl({ POSTGRES_URL: "postgres://b" })).toBe("postgres://b");
    expect(resolveMigrationUrl({ DATABASE_URL: "postgres://pool", DATABASE_URL_UNPOOLED: "postgres://direct" })).toBe("postgres://direct");
    expect(resolveMigrationUrl({ POSTGRES_URL: "postgres://b" })).toBe("postgres://b");
  });

  it("armazenamento local: /tmp no Vercel (temporário), ./storage fora dele", () => {
    expect(resolveLocalStorageDir({ VERCEL: "1" })).toBe("/tmp/efmz-storage");
    expect(resolveLocalStorageDir({})).toBe("./storage");
    expect(resolveLocalStorageDir({ VERCEL: "1", STORAGE_LOCAL_DIR: "/data" })).toBe("/data");
  });

  it("check:prod aceita as variáveis do Vercel", () => {
    const r = checkProductionEnv({ VERCEL_URL: "song.vercel.app", POSTGRES_URL: "postgres://u:p@h/db?sslmode=require", APP_SECRET: "k3Jv9x0QpL2mN8rT5wY7zA1bC4dE6fG8hI0jK2l" });
    expect(r.find((x) => x.key === "APP_URL")?.level).toBe("OK");
    expect(r.find((x) => x.key === "DATABASE_URL")?.level).toBe("OK");
  });
});
