import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { createSession, destroyCurrentSession, getCurrentUser, sessionCookieName } from "@/lib/auth/session";
import { sha256 } from "@/lib/auth/tokens";
import { authenticate, changePassword, createPasswordReset, deleteAccount, DomainError, registerUser, resetPassword } from "@/server/users";
import { createUser, resetDatabase } from "../support/db";
import { cookieJar, resetCookies } from "../support/next-mocks";

beforeEach(async () => {
  await resetDatabase();
  resetCookies();
});

describe("registo e login", () => {
  it("regista com senha em hash e perfil criado", async () => {
    const user = await registerUser({ name: "Ana", email: "ana@teste.co.mz", password: "Senha1234", marketingConsent: false });
    const row = await db.user.findUniqueOrThrow({ where: { id: user.id }, include: { profile: true } });
    expect(row.passwordHash).not.toContain("Senha1234");
    expect(row.role).toBe("USER");
    expect(row.profile).not.toBeNull();
    expect(row.termsAcceptedAt).toBeInstanceOf(Date);
  });

  it("não permite emails duplicados", async () => {
    await registerUser({ name: "Ana", email: "ana@teste.co.mz", password: "Senha1234", marketingConsent: false });
    await expect(registerUser({ name: "Outra", email: "ana@teste.co.mz", password: "Senha1234", marketingConsent: false })).rejects.toMatchObject({ code: "EMAIL_TAKEN" });
  });

  it("autentica com a senha correta e rejeita a errada / conta inativa / inexistente", async () => {
    const u = await createUser({ email: "joao@teste.co.mz", password: "Correta123" });
    expect(await authenticate("joao@teste.co.mz", "Correta123")).toMatchObject({ id: u.id });
    expect(await authenticate("joao@teste.co.mz", "Errada123")).toBeNull();
    expect(await authenticate("ninguem@teste.co.mz", "Correta123")).toBeNull();
    await db.user.update({ where: { id: u.id }, data: { isActive: false } });
    expect(await authenticate("joao@teste.co.mz", "Correta123")).toBeNull();
  });
});

describe("sessões", () => {
  it("cria sessão com token só em hash na BD e cookie httpOnly", async () => {
    const u = await createUser();
    await createSession(u.id, { userAgent: "teste" });
    const token = cookieJar.get(sessionCookieName())!;
    expect(token).toBeTruthy();
    const session = await db.session.findFirstOrThrow({ where: { userId: u.id } });
    expect(session.tokenHash).toBe(sha256(token));
    expect(session.tokenHash).not.toBe(token);
    expect((await getCurrentUser())?.id).toBe(u.id);
  });

  it("rejeita tokens inválidos, sessões expiradas e contas desativadas", async () => {
    const u = await createUser();
    cookieJar.set(sessionCookieName(), "token-falso");
    expect(await getCurrentUser()).toBeNull();

    await createSession(u.id);
    await db.session.updateMany({ where: { userId: u.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await getCurrentUser()).toBeNull();

    await createSession(u.id);
    await db.user.update({ where: { id: u.id }, data: { isActive: false } });
    expect(await getCurrentUser()).toBeNull();
  });

  it("logout apaga a sessão", async () => {
    const u = await createUser();
    await createSession(u.id);
    await destroyCurrentSession();
    expect(await db.session.count({ where: { userId: u.id } })).toBe(0);
    expect(cookieJar.has(sessionCookieName())).toBe(false);
  });
});

describe("recuperação de senha", () => {
  it("fluxo completo: token de uso único que termina as sessões", async () => {
    const u = await createUser({ email: "rita@teste.co.mz", password: "Antiga123" });
    await createSession(u.id);
    const reset = await createPasswordReset("rita@teste.co.mz");
    expect(reset).not.toBeNull();
    const stored = await db.passwordResetToken.findFirstOrThrow({ where: { userId: u.id } });
    expect(stored.tokenHash).not.toBe(reset!.token);

    await resetPassword(reset!.token, "Nova12345");
    expect(await authenticate("rita@teste.co.mz", "Nova12345")).not.toBeNull();
    expect(await authenticate("rita@teste.co.mz", "Antiga123")).toBeNull();
    expect(await db.session.count({ where: { userId: u.id } })).toBe(0);
    await expect(resetPassword(reset!.token, "Outra12345")).rejects.toBeInstanceOf(DomainError);
  });

  it("não revela se o email existe e rejeita tokens expirados", async () => {
    expect(await createPasswordReset("nao-existe@teste.co.mz")).toBeNull();
    const u = await createUser({ email: "exp@teste.co.mz" });
    const reset = await createPasswordReset("exp@teste.co.mz");
    await db.passwordResetToken.updateMany({ where: { userId: u.id }, data: { expiresAt: new Date(Date.now() - 1) } });
    await expect(resetPassword(reset!.token, "Nova12345")).rejects.toMatchObject({ code: "TOKEN_INVALID" });
  });

  it("um novo pedido invalida o anterior", async () => {
    await createUser({ email: "dup@teste.co.mz" });
    const first = await createPasswordReset("dup@teste.co.mz");
    await createPasswordReset("dup@teste.co.mz");
    await expect(resetPassword(first!.token, "Nova12345")).rejects.toMatchObject({ code: "TOKEN_INVALID" });
  });
});

describe("gestão da conta", () => {
  it("alterar senha exige a senha atual e termina outras sessões", async () => {
    const u = await createUser({ password: "Atual1234" });
    await createSession(u.id);
    const keep = (await getCurrentUser())!.sessionId;
    await createSession(u.id); // outra sessão (outro dispositivo)
    await expect(changePassword(u.id, "Errada123", "Nova12345", keep)).rejects.toMatchObject({ code: "WRONG_PASSWORD" });
    await changePassword(u.id, "Atual1234", "Nova12345", keep);
    const sessions = await db.session.findMany({ where: { userId: u.id } });
    expect(sessions.map((s) => s.id)).toEqual([keep]);
  });

  it("eliminar conta apaga CVs e sessões, mantém pedidos pagos desligados da conta", async () => {
    const u = await createUser({ password: "Senha1234" });
    await db.cV.create({ data: { userId: u.id, title: "CV" } });
    await createSession(u.id);
    const order = await db.order.create({
      data: { number: "EF-TESTE-0001", userId: u.id, customerName: u.name, customerEmail: u.email, status: "PAID", subtotalMinor: 0, totalMinor: 0 },
    });
    await expect(deleteAccount(u.id, "Errada")).rejects.toMatchObject({ code: "WRONG_PASSWORD" });
    await deleteAccount(u.id, "Senha1234");
    expect(await db.user.findUnique({ where: { id: u.id } })).toBeNull();
    expect(await db.cV.count({ where: { userId: u.id } })).toBe(0);
    expect(await db.session.count({ where: { userId: u.id } })).toBe(0);
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).userId).toBeNull();
  });

  it("não permite eliminar o último administrador", async () => {
    const admin = await createUser({ role: "ADMIN", password: "Senha1234" });
    await expect(deleteAccount(admin.id, "Senha1234")).rejects.toMatchObject({ code: "LAST_ADMIN" });
  });
});
