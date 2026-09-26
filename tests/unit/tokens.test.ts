import { describe, expect, it } from "vitest";
import { generateToken, sha256, signPayload, verifySignedPayload } from "@/lib/auth/tokens";

describe("tokens", () => {
  it("gera tokens aleatórios longos", () => {
    const a = generateToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(generateToken()).not.toBe(a);
  });
  it("sha256 é determinístico", () => {
    expect(sha256("abc")).toBe(sha256("abc"));
    expect(sha256("abc")).toHaveLength(64);
  });
});

describe("links assinados temporários", () => {
  it("aceita assinatura válida dentro do prazo", () => {
    const now = Date.now();
    const { exp, sig } = signPayload("file:123", 300, now);
    expect(verifySignedPayload("file:123", exp, sig, now + 1000)).toBe(true);
  });
  it("rejeita após expirar", () => {
    const now = Date.now();
    const { exp, sig } = signPayload("file:123", 60, now);
    expect(verifySignedPayload("file:123", exp, sig, now + 61_000)).toBe(false);
  });
  it("rejeita payload ou assinatura adulterados", () => {
    const { exp, sig } = signPayload("file:123", 60);
    expect(verifySignedPayload("file:999", exp, sig)).toBe(false);
    expect(verifySignedPayload("file:123", exp + 1000, sig)).toBe(false);
    expect(verifySignedPayload("file:123", exp, `${sig}x`)).toBe(false);
  });
});
