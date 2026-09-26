"use server";

import { revalidatePath, updateTag } from "next/cache";
import { settingsSchema } from "@/lib/admin-schemas";
import { audit } from "@/lib/audit";
import { assertPermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { fieldErrorsOf, formDataToObject, type ActionState } from "@/lib/validation";
import { SETTINGS_TAG } from "@/server/settings";

export async function updateSettingsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await assertPermission("settings.manage");
  const parsed = settingsSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  await db.siteSettings.upsert({ where: { id: "default" }, create: { id: "default", ...parsed.data }, update: parsed.data });
  await audit({ actorId: user.id, action: "settings.update", entityType: "SiteSettings", entityId: "default" });
  updateTag(SETTINGS_TAG);
  revalidatePath("/", "layout");
  return { ok: true, message: "Definições guardadas. As páginas públicas foram atualizadas." };
}
