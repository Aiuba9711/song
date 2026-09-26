import "server-only";
import { headers } from "next/headers";
import { hmac } from "@/lib/auth/tokens";

/** IP do cliente atrás do proxy do fornecedor de hosting. */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "0.0.0.0";
}

/** IP pseudonimizado (HMAC) para logs — não guardamos IPs em claro. */
export async function getIpHash(): Promise<string> {
  return hmac(`ip:${await getClientIp()}`).slice(0, 32);
}

export async function getUserAgent(): Promise<string | null> {
  const h = await headers();
  return h.get("user-agent")?.slice(0, 300) ?? null;
}

/**
 * Proteção CSRF para Route Handlers que alteram estado (POST/PUT/DELETE).
 * As Server Actions já comparam Origin e Host automaticamente.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
