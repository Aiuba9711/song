"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { assertUser } from "@/lib/auth/guards";
import { sessionCookieName } from "@/lib/auth/session";
import { LIMITS, rateLimit } from "@/lib/security/rate-limit";
import { changePasswordSchema, fieldErrorsOf, formDataToObject, profileSchema, type ActionState } from "@/lib/validation";
import { changePassword, deleteAccount, DomainError, updateProfile } from "@/server/users";

export async function updateProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await assertUser();
  const parsed = profileSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  await updateProfile(user.id, { ...parsed.data, marketingConsent: parsed.data.marketingConsent === "on" });
  await audit({ actorId: user.id, action: "user.profile_update" });
  revalidatePath("/meu-espaco", "layout");
  return { ok: true, message: "Perfil atualizado." };
}

export async function changePasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await assertUser();
  const parsed = changePasswordSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const limit = await rateLimit(`pwchange:${user.id}`, LIMITS.login.limit, LIMITS.login.window);
  if (!limit.ok) return { error: "Demasiadas tentativas. Tente mais tarde." };
  try {
    await changePassword(user.id, parsed.data.currentPassword, parsed.data.password, user.sessionId);
  } catch (error) {
    if (error instanceof DomainError) return { fieldErrors: { currentPassword: [error.message] } };
    throw error;
  }
  await audit({ actorId: user.id, action: "auth.password_change" });
  return { ok: true, message: "Senha alterada. As outras sessões foram terminadas." };
}

const deleteSchema = z.object({
  password: z.string().min(1, "Indique a senha.").max(128),
  confirm: z.literal("ELIMINAR", { error: "Escreva ELIMINAR para confirmar." }),
});

export async function deleteAccountAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await assertUser();
  const parsed = deleteSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const limit = await rateLimit(`delete:${user.id}`, 5, 3600);
  if (!limit.ok) return { error: "Demasiadas tentativas. Tente mais tarde." };
  try {
    await deleteAccount(user.id, parsed.data.password);
  } catch (error) {
    if (error instanceof DomainError) return error.code === "WRONG_PASSWORD" ? { fieldErrors: { password: [error.message] } } : { error: error.message };
    throw error;
  }
  await audit({ action: "user.account_deleted", entityType: "User", entityId: user.id });
  (await cookies()).delete(sessionCookieName());
  redirect("/?conta-eliminada=1");
}
