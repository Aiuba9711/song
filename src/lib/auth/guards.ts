import "server-only";
import { notFound, redirect } from "next/navigation";
import { can, type Permission } from "@/lib/auth/roles";
import { getCurrentUser, type SessionUser } from "@/lib/auth/session";

/** Garante sessão válida; caso contrário envia para /entrar e volta depois. */
export async function requireUser(nextPath?: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    const next = nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/meu-espaco";
    redirect(`/entrar?next=${encodeURIComponent(next)}`);
  }
  return user;
}

/** Garante permissão; utilizadores sem acesso recebem 404 (não revelamos a área admin). */
export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireUser("/admin");
  if (!can(user.role, permission)) notFound();
  return user;
}

export class AuthError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403,
  ) {
    super(message);
  }
}

/** Variante para Server Actions/rotas: lança erro em vez de redirecionar. */
export async function assertPermission(permission: Permission): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Sessão expirada. Entre novamente.", 401);
  if (!can(user.role, permission)) throw new AuthError("Não tem permissão para esta ação.", 403);
  return user;
}

export async function assertUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Sessão expirada. Entre novamente.", 401);
  return user;
}

/** Apenas caminhos internos (evita open redirect). */
export function safeNextPath(next: unknown, fallback = "/meu-espaco"): string {
  if (typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
