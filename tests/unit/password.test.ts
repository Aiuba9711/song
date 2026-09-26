import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("hash de senhas (scrypt)", () => {
  it("nunca guarda a senha em texto simples", async () => {
    const hash = await hashPassword("MinhaSenha123");
    expect(hash).not.toContain("MinhaSenha123");
    expect(hash.startsWith("scrypt$")).toBe(true);
  });
  it("verifica a senha correta e rejeita a errada", async () => {
    const hash = await hashPassword("MinhaSenha123");
    expect(await verifyPassword("MinhaSenha123", hash)).toBe(true);
    expect(await verifyPassword("minhasenha123", hash)).toBe(false);
  });
  it("usa sal aleatório (hashes diferentes para a mesma senha)", async () => {
    expect(await hashPassword("igual123")).not.toBe(await hashPassword("igual123"));
  });
  it("rejeita formatos inválidos", async () => {
    expect(await verifyPassword("x", "bcrypt$abc")).toBe(false);
    expect(await verifyPassword("x", "")).toBe(false);
  });
  it("normaliza Unicode (acentos compostos/decompostos)", async () => {
    const hash = await hashPassword("Açúcar2026");
    expect(await verifyPassword("Açúcar2026", hash)).toBe(true);
  });
});
