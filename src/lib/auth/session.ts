import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import type { Role } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { generateToken, sha256 } from "@/lib/auth/tokens";

const SESSION_DAYS = 30;
const TOUCH_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** Em produção (HTTPS) usamos o prefixo __Host- (cookie só do próprio domínio, Secure, path=/). */
export function sessionCookieName(): string {
  return process.env.NODE_ENV === "production" ? "__Host-efmz_session" : "efmz_session";
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  sessionId: string;
};

export async function createSession(
  userId: string,
  meta: { userAgent?: string | null; ipHash?: string | null } = {},
): Promise<void> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.session.create({
    data: { tokenHash: sha256(token), userId, expiresAt, userAgent: meta.userAgent, ipHash: meta.ipHash },
  });
  const jar = await cookies();
  jar.set(sessionCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Utilizador da sessão atual (memorizado por pedido). */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(sessionCookieName())?.value;
  if (!token || token.length > 200) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: { select: { id: true, email: true, name: true, role: true, isActive: true } } },
  });
  if (!session || session.expiresAt < new Date() || !session.user.isActive) return null;

  if (Date.now() - session.lastUsedAt.getTime() > TOUCH_INTERVAL_MS) {
    await db.session.update({ where: { id: session.id }, data: { lastUsedAt: new Date() } }).catch(() => undefined);
  }

  const { user } = session;
  return { id: user.id, email: user.email, name: user.name, role: user.role, sessionId: session.id };
});

export async function destroyCurrentSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(sessionCookieName())?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(sessionCookieName());
}

/** Termina todas as sessões de um utilizador (ex.: após redefinir a senha). */
export async function destroyAllSessions(userId: string, exceptSessionId?: string): Promise<void> {
  await db.session.deleteMany({ where: { userId, ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}) } });
}
