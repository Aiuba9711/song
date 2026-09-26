import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema, resetPasswordSchema } from "@/lib/validation";
import { safeNextPath } from "@/lib/auth/guards";

const valid = { name: "Ana Machava", email: " Ana@Exemplo.CO.MZ ", password: "Senha1234", acceptTerms: "on" };

describe("registo", () => {
  it("normaliza o email", () => {
    const r = registerSchema.parse(valid);
    expect(r.email).toBe("ana@exemplo.co.mz");
  });
  it("exige aceitação dos termos", () => {
    const r = registerSchema.safeParse({ ...valid, acceptTerms: undefined });
    expect(r.success).toBe(false);
  });
  it("exige senha com letras e números", () => {
    expect(registerSchema.safeParse({ ...valid, password: "somenteletras" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...valid, password: "12345678" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...valid, password: "curta1" }).success).toBe(false);
  });
  it("normaliza números moçambicanos", () => {
    expect(registerSchema.parse({ ...valid, phone: "84 123 4567" }).phone).toBe("258841234567");
    expect(registerSchema.parse({ ...valid, phone: "+258 84 123 4567" }).phone).toBe("258841234567");
    expect(registerSchema.parse({ ...valid, phone: "" }).phone).toBeUndefined();
    expect(registerSchema.safeParse({ ...valid, phone: "12" }).success).toBe(false);
  });
});

describe("login e redefinição", () => {
  it("rejeita email inválido", () => {
    expect(loginSchema.safeParse({ email: "nao-e-email", password: "x" }).success).toBe(false);
  });
  it("exige confirmação igual", () => {
    const r = resetPasswordSchema.safeParse({ token: "t".repeat(40), password: "Senha1234", confirmPassword: "Senha12345" });
    expect(r.success).toBe(false);
  });
});

describe("safeNextPath (sem open redirect)", () => {
  it.each([
    ["/meu-espaco/cvs", "/meu-espaco/cvs"],
    ["//evil.com", "/meu-espaco"],
    ["https://evil.com", "/meu-espaco"],
    ["/\\evil.com", "/meu-espaco"],
    [undefined, "/meu-espaco"],
  ])("%s → %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });
});
