"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { assertPermission } from "@/lib/auth/guards";
import { AdminError, changeUserRole, setUserActive } from "@/server/admin";

export type UserActionState = { error?: string; ok?: boolean };

export async function changeRoleAction(_prev: UserActionState, formData: FormData): Promise<UserActionState> {
  const actor = await assertPermission("users.manage");
  const parsed = z.object({ userId: z.string().min(1), role: z.enum(["USER", "EDITOR", "ADMIN"]) }).safeParse({ userId: formData.get("userId"), role: formData.get("role") });
  if (!parsed.success) return { error: "Pedido inválido." };
  try {
    await changeUserRole(actor.id, parsed.data.userId, parsed.data.role);
  } catch (error) {
    if (error instanceof AdminError) return { error: error.message };
    throw error;
  }
  await audit({ actorId: actor.id, action: "user.role_change", entityType: "User", entityId: parsed.data.userId, metadata: { role: parsed.data.role } });
  revalidatePath("/admin/utilizadores");
  return { ok: true };
}

export async function toggleActiveAction(_prev: UserActionState, formData: FormData): Promise<UserActionState> {
  const actor = await assertPermission("users.manage");
  const parsed = z.object({ userId: z.string().min(1), active: z.enum(["true", "false"]) }).safeParse({ userId: formData.get("userId"), active: formData.get("active") });
  if (!parsed.success) return { error: "Pedido inválido." };
  const active = parsed.data.active === "true";
  try {
    await setUserActive(actor.id, parsed.data.userId, active);
  } catch (error) {
    if (error instanceof AdminError) return { error: error.message };
    throw error;
  }
  await audit({ actorId: actor.id, action: active ? "user.activate" : "user.deactivate", entityType: "User", entityId: parsed.data.userId });
  revalidatePath("/admin/utilizadores");
  return { ok: true };
}
