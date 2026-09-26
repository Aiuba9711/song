"use server";

import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { safeNextPath } from "@/lib/auth/guards";
import { createSession, destroyCurrentSession, getCurrentUser } from "@/lib/auth/session";
import { sendEmail } from "@/lib/email";
import { passwordResetEmail, welcomeEmail } from "@/lib/email/templates";
import { appUrl } from "@/lib/env";
import { t } from "@/lib/i18n/messages";
import { LIMITS, rateLimit } from "@/lib/security/rate-limit";
import { getClientIp, getIpHash, getUserAgent } from "@/lib/security/request";
import {
  fieldErrorsOf,
  forgotPasswordSchema,
  formDataToObject,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  type ActionState,
} from "@/lib/validation";
import { authenticate, createPasswordReset, DomainError, registerUser, resetPassword } from "@/server/users";

export type AuthState = ActionState & { values?: Record<string, string> };

function keepValues(raw: Record<string, string>, ...fields: string[]) {
  return Object.fromEntries(fields.map((f) => [f, raw[f] ?? ""]));
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const raw = formDataToObject(formData);
  const values = keepValues(raw, "email");
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };

  const ip = await getClientIp();
  const [byIp, byEmail] = await Promise.all([
    rateLimit(`login:ip:${ip}`, LIMITS.login.limit * 3, LIMITS.login.window),
    rateLimit(`login:email:${parsed.data.email}`, LIMITS.login.limit, LIMITS.login.window),
  ]);
  if (!byIp.ok || !byEmail.ok) return { error: t("error.rateLimited"), values };

  const user = await authenticate(parsed.data.email, parsed.data.password);
  const ipHash = await getIpHash();
  if (!user) {
    await audit({ action: "auth.login_failed", metadata: { email: parsed.data.email }, ipHash });
    return { error: "Email ou senha incorretos.", values };
  }

  await createSession(user.id, { userAgent: await getUserAgent(), ipHash });
  await audit({ actorId: user.id, action: "auth.login", ipHash });
  redirect(safeNextPath(raw.next, user.role === "USER" ? "/meu-espaco" : "/admin"));
}

export async function registerAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const raw = formDataToObject(formData);
  const values = keepValues(raw, "name", "email", "phone");
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };

  const limit = await rateLimit(`register:ip:${await getClientIp()}`, LIMITS.register.limit, LIMITS.register.window);
  if (!limit.ok) return { error: t("error.rateLimited"), values };

  try {
    const user = await registerUser({
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      password: parsed.data.password,
      marketingConsent: parsed.data.marketingConsent === "on",
    });
    const ipHash = await getIpHash();
    await createSession(user.id, { userAgent: await getUserAgent(), ipHash });
    await audit({ actorId: user.id, action: "auth.register", ipHash });
    await sendEmail(welcomeEmail(user.email, user.name, appUrl("/meu-espaco/cvs/novo")));
  } catch (error) {
    if (error instanceof DomainError && error.code === "EMAIL_TAKEN") {
      return { fieldErrors: { email: ["Já existe uma conta com este email. Tente entrar."] }, values };
    }
    throw error;
  }
  redirect(safeNextPath(raw.next, "/meu-espaco?bem-vindo=1"));
}

export async function logoutAction(): Promise<void> {
  const user = await getCurrentUser();
  await destroyCurrentSession();
  if (user) await audit({ actorId: user.id, action: "auth.logout" });
  redirect("/");
}

const FORGOT_MESSAGE =
  "Se existir uma conta com este email, receberá dentro de minutos um link para definir uma nova senha. Verifique também a pasta de spam.";

export async function forgotPasswordAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const raw = formDataToObject(formData);
  const parsed = forgotPasswordSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values: keepValues(raw, "email") };

  const ip = await getClientIp();
  const [byIp, byEmail] = await Promise.all([
    rateLimit(`reset:ip:${ip}`, LIMITS.passwordReset.limit * 2, LIMITS.passwordReset.window),
    rateLimit(`reset:email:${parsed.data.email}`, 3, LIMITS.passwordReset.window),
  ]);
  if (!byIp.ok) return { error: t("error.rateLimited") };

  // Mesma resposta exista ou não a conta (não revela emails registados).
  if (byEmail.ok) {
    const reset = await createPasswordReset(parsed.data.email);
    if (reset) {
      const url = appUrl(`/redefinir-senha?token=${encodeURIComponent(reset.token)}`);
      await sendEmail(passwordResetEmail(parsed.data.email, reset.name, url));
      await audit({ action: "auth.password_reset_requested", metadata: { email: parsed.data.email }, ipHash: await getIpHash() });
    }
  }
  return { ok: true, message: FORGOT_MESSAGE };
}

export async function resetPasswordAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const raw = formDataToObject(formData);
  const parsed = resetPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    const fe = fieldErrorsOf(parsed.error);
    if (fe.token) return { error: "O link é inválido. Peça um novo link de recuperação." };
    return { fieldErrors: fe };
  }
  try {
    const userId = await resetPassword(parsed.data.token, parsed.data.password);
    await audit({ actorId: userId, action: "auth.password_reset", ipHash: await getIpHash() });
  } catch (error) {
    if (error instanceof DomainError) return { error: error.message };
    throw error;
  }
  redirect("/entrar?senha-redefinida=1");
}
