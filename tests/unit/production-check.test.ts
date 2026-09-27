import { describe, expect, it } from "vitest";
import { checkProductionEnv } from "@/lib/production-check";

const GOOD = {
  APP_URL: "https://empregofacil.example",
  APP_SECRET: "k3Jv9x0QpL2mN8rT5wY7zA1bC4dE6fG8hI0jK2lM4nO6",
  DATABASE_URL: "postgresql://u:p@db.example:5432/app?sslmode=require",
  STORAGE_DRIVER: "s3",
  S3_BUCKET: "privado",
  S3_ACCESS_KEY_ID: "id",
  S3_SECRET_ACCESS_KEY: "segredo",
  EMAIL_DRIVER: "resend",
  RESEND_API_KEY: "re_x",
  EMAIL_FROM: "Emprego <nao-responder@example>",
  RATE_LIMIT_SCALE: "1",
};
const errors = (env: Record<string, string>) => checkProductionEnv(env).filter((r) => r.level === "ERRO").map((r) => r.key);

describe("verificação de produção", () => {
  it("configuração completa: sem erros; IA desligada é válida", () => {
    expect(errors(GOOD)).toEqual([]);
  });

  it("deteta configurações perigosas", () => {
    expect(errors({ ...GOOD, APP_URL: "http://site.example" })).toContain("APP_URL");
    expect(errors({ ...GOOD, APP_SECRET: "dev-only-secret-change-me-0123456789abcdef" })).toContain("APP_SECRET");
    expect(errors({ ...GOOD, STORAGE_DRIVER: "local" })).toContain("STORAGE_DRIVER");
    expect(errors({ ...GOOD, EMAIL_DRIVER: "console" })).toContain("EMAIL_DRIVER");
    expect(errors({ ...GOOD, RATE_LIMIT_SCALE: "50" })).toContain("RATE_LIMIT_SCALE");
    expect(errors({ ...GOOD, AI_PROVIDER: "anthropic" })).toContain("AI_PROVIDER");
    expect(errors({ ...GOOD, IMAGE_BG_PROVIDER: "qualquer" })).toContain("IMAGE_BG_PROVIDER");
    expect(errors({ ...GOOD, AI_MOCK_EXTERNAL: "1" })).toContain("AI_MOCK_EXTERNAL");
  });

  it("avisos: base sem SSL e IA de demonstração", () => {
    const r = checkProductionEnv({ ...GOOD, DATABASE_URL: "postgresql://u:p@db.example/app", AI_PROVIDER: "mock" });
    expect(r.filter((x) => x.level === "AVISO").map((x) => x.key)).toEqual(expect.arrayContaining(["DATABASE_URL", "AI_PROVIDER"]));
  });
});
