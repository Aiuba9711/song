"use server";

import { revalidatePath, updateTag } from "next/cache";
import { paymentSettingsSchema } from "@/lib/admin-schemas";
import { audit } from "@/lib/audit";
import { assertPermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { fieldErrorsOf, formDataToObject, type ActionState } from "@/lib/validation";
import { PAYMENT_SETTINGS_TAG } from "@/server/payments/settings";

export async function updatePaymentSettingsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await assertPermission("settings.manage");
  const parsed = paymentSettingsSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const { defaultPrice, letterPrice, ...rest } = parsed.data;
  const data = { ...rest, defaultPriceMinor: defaultPrice!, letterPriceMinor: letterPrice ?? 0 };

  const before = await db.paymentSettings.findUnique({ where: { id: "default" } });
  await db.paymentSettings.upsert({ where: { id: "default" }, create: { id: "default", ...data }, update: data });

  // Regista o que mudou (números incluídos — são dados de configuração, não segredos).
  const changed = Object.fromEntries(
    Object.entries(data)
      .filter(([k, v]) => (before as Record<string, unknown> | null)?.[k] !== v)
      .map(([k, v]) => [k, { from: (before as Record<string, unknown> | null)?.[k] ?? null, to: v }]),
  );
  await audit({ actorId: user.id, action: "settings.payments_update", entityType: "PaymentSettings", entityId: "default", metadata: JSON.parse(JSON.stringify(changed)) });

  updateTag(PAYMENT_SETTINGS_TAG);
  revalidatePath("/", "layout");
  return { ok: true, message: "Definições de pagamento guardadas." };
}
