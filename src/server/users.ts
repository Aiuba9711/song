import "server-only";
import { db } from "@/lib/db";
import { getDummyHash, hashPassword, verifyPassword } from "@/lib/auth/password";
import { generateToken, sha256 } from "@/lib/auth/tokens";
import { storage } from "@/lib/storage";

export class DomainError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
  }
}

const RESET_TTL_MS = 60 * 60 * 1000;

export async function registerUser(input: {
  name: string;
  email: string;
  phone?: string;
  password: string;
  marketingConsent: boolean;
}) {
  const existing = await db.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) throw new DomainError("Já existe uma conta com este email.", "EMAIL_TAKEN");

  return db.user.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      passwordHash: await hashPassword(input.password),
      termsAcceptedAt: new Date(),
      marketingConsent: input.marketingConsent,
      profile: { create: {} },
    },
    select: { id: true, email: true, name: true, role: true },
  });
}

/** Verifica credenciais em tempo aproximadamente constante (existindo ou não o utilizador). */
export async function authenticate(email: string, password: string) {
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, role: true, passwordHash: true, isActive: true },
  });
  if (!user) {
    await verifyPassword(password, await getDummyHash());
    return null;
  }
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid || !user.isActive) return null;
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

/**
 * Cria um token de recuperação. Devolve o token em claro (para o link do email) ou null
 * se o email não existir — o chamador deve responder da mesma forma nos dois casos.
 */
export async function createPasswordReset(email: string): Promise<{ token: string; name: string } | null> {
  const user = await db.user.findUnique({ where: { email }, select: { id: true, name: true, isActive: true } });
  if (!user || !user.isActive) return null;
  // Invalida pedidos anteriores ainda não usados.
  await db.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
  const token = generateToken();
  await db.passwordResetToken.create({
    data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + RESET_TTL_MS) },
  });
  return { token, name: user.name };
}

export async function resetPassword(token: string, newPassword: string): Promise<string> {
  const record = await db.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new DomainError("O link expirou ou já foi usado. Peça um novo link.", "TOKEN_INVALID");
  }
  const passwordHash = await hashPassword(newPassword);
  await db.$transaction([
    db.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    // Termina sessões antigas: quem tinha a senha comprometida perde o acesso.
    db.session.deleteMany({ where: { userId: record.userId } }),
  ]);
  return record.userId;
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string, keepSessionId: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { passwordHash: true } });
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new DomainError("A senha atual está incorreta.", "WRONG_PASSWORD");
  }
  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(newPassword) } }),
    db.session.deleteMany({ where: { userId, id: { not: keepSessionId } } }),
  ]);
}

export async function updateProfile(
  userId: string,
  input: { name: string; phone?: string; headline?: string; location?: string; marketingConsent: boolean },
) {
  await db.user.update({
    where: { id: userId },
    data: {
      name: input.name,
      phone: input.phone ?? null,
      marketingConsent: input.marketingConsent,
      profile: {
        upsert: {
          create: { headline: input.headline || null, location: input.location || null },
          update: { headline: input.headline || null, location: input.location || null },
        },
      },
    },
  });
}

/**
 * Elimina a conta e todos os dados pessoais (CVs, fotos, cartas, sessões, downloads).
 * Os pedidos são mantidos para fins contabilísticos, mas desligados da conta e anonimizados
 * quando não foram pagos.
 */
export async function deleteAccount(userId: string, password: string) {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { passwordHash: true, role: true },
  });
  if (!(await verifyPassword(password, user.passwordHash))) {
    throw new DomainError("Senha incorreta.", "WRONG_PASSWORD");
  }
  if (user.role === "ADMIN") {
    const admins = await db.user.count({ where: { role: "ADMIN", isActive: true } });
    if (admins <= 1) throw new DomainError("Não é possível eliminar o último administrador.", "LAST_ADMIN");
  }

  const photos = await db.cV.findMany({ where: { userId, photoKey: { not: null } }, select: { photoKey: true } });

  await db.$transaction([
    db.order.updateMany({
      where: { userId, status: { not: "PAID" } },
      data: { customerName: "Conta eliminada", customerEmail: "eliminado@invalid", customerPhone: null },
    }),
    db.user.delete({ where: { id: userId } }),
  ]);

  await Promise.all(photos.map((p) => storage().delete(p.photoKey!).catch(() => undefined)));
}
