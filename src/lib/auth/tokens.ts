import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/** Token aleatório seguro para URLs/cookies (256 bits). */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** SHA-256 em hex — usado para guardar tokens de sessão e de recuperação. */
export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function secret(): string {
  const s = process.env.APP_SECRET;
  if (!s || s.length < 32) throw new Error("APP_SECRET em falta ou demasiado curto");
  return s;
}

export function hmac(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/**
 * Links assinados e temporários (ex.: downloads enviados por email).
 * signPayload("file:abc", 3600) → { exp, sig }
 */
export function signPayload(payload: string, ttlSeconds: number, now = Date.now()) {
  const exp = Math.floor(now / 1000) + ttlSeconds;
  return { exp, sig: hmac(`${payload}.${exp}`) };
}

export function verifySignedPayload(payload: string, exp: number, sig: string, now = Date.now()): boolean {
  if (!Number.isFinite(exp) || exp < Math.floor(now / 1000)) return false;
  return safeEqual(hmac(`${payload}.${exp}`), sig);
}
