"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { assertPermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { fieldErrorsOf, formDataToObject, type ActionState } from "@/lib/validation";
import { PAYMENT_SETTINGS_TAG } from "@/server/payments/settings";
import {
  backgroundSchema,
  createBackground,
  createOutfit,
  deleteBackground,
  deleteOutfit,
  outfitFormObject,
  outfitSchema,
  photoPriceData,
  photoPricesSchema,
  toggleBackground,
  toggleOutfit,
  updateBackground,
  updateOutfit,
} from "@/server/photos-admin";
import { DomainError } from "@/server/users";

const idSchema = z.string().min(1).max(40);

function revalidatePhotoAdmin() {
  revalidatePath("/admin/foto", "layout");
  revalidatePath("/meu-espaco/fotos", "layout");
}

async function imageOf(formData: FormData): Promise<Buffer | null> {
  const f = formData.get("image");
  return f instanceof File && f.size > 0 ? Buffer.from(await f.arrayBuffer()) : null;
}

export async function saveBackgroundAction(backgroundId: string | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await assertPermission("photos.manage");
  const parsed = backgroundSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  try {
    const image = await imageOf(formData);
    if (backgroundId) {
      await updateBackground(idSchema.parse(backgroundId), parsed.data, image);
      await audit({ actorId: user.id, action: "photo_background.update", entityType: "PhotoBackground", entityId: backgroundId });
    } else {
      const created = await createBackground(parsed.data, image);
      await audit({ actorId: user.id, action: "photo_background.create", entityType: "PhotoBackground", entityId: created.id });
    }
  } catch (error) {
    if (error instanceof DomainError) return { fieldErrors: { image: [error.message] } };
    throw error;
  }
  revalidatePhotoAdmin();
  return { ok: true, message: backgroundId ? "Fundo atualizado." : "Fundo adicionado." };
}

export async function toggleBackgroundAction(formData: FormData): Promise<void> {
  const user = await assertPermission("photos.manage");
  const id = idSchema.parse(formData.get("id"));
  const active = await toggleBackground(id);
  await audit({ actorId: user.id, action: active ? "photo_background.activate" : "photo_background.deactivate", entityType: "PhotoBackground", entityId: id });
  revalidatePhotoAdmin();
}

export async function deleteBackgroundAction(formData: FormData): Promise<void> {
  const user = await assertPermission("photos.manage");
  const id = idSchema.parse(formData.get("id"));
  await deleteBackground(id);
  await audit({ actorId: user.id, action: "photo_background.delete", entityType: "PhotoBackground", entityId: id });
  revalidatePhotoAdmin();
}

export async function saveOutfitAction(outfitId: string | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await assertPermission("photos.manage");
  const parsed = outfitSchema.safeParse(outfitFormObject(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  if (outfitId) {
    await updateOutfit(idSchema.parse(outfitId), parsed.data);
    await audit({ actorId: user.id, action: "photo_outfit.update", entityType: "PhotoOutfit", entityId: outfitId });
  } else {
    const created = await createOutfit(parsed.data);
    await audit({ actorId: user.id, action: "photo_outfit.create", entityType: "PhotoOutfit", entityId: created.id });
  }
  revalidatePhotoAdmin();
  return { ok: true, message: outfitId ? "Roupa atualizada." : "Roupa adicionada." };
}

export async function toggleOutfitAction(formData: FormData): Promise<void> {
  const user = await assertPermission("photos.manage");
  const id = idSchema.parse(formData.get("id"));
  const active = await toggleOutfit(id);
  await audit({ actorId: user.id, action: active ? "photo_outfit.activate" : "photo_outfit.deactivate", entityType: "PhotoOutfit", entityId: id });
  revalidatePhotoAdmin();
}

export async function deleteOutfitAction(formData: FormData): Promise<void> {
  const user = await assertPermission("photos.manage");
  const id = idSchema.parse(formData.get("id"));
  await deleteOutfit(id);
  await audit({ actorId: user.id, action: "photo_outfit.delete", entityType: "PhotoOutfit", entityId: id });
  revalidatePhotoAdmin();
}

/** Preços da foto profissional (mesma configuração central de pagamentos — só administradores). */
export async function updatePhotoPricesAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await assertPermission("settings.manage");
  const parsed = photoPricesSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const data = photoPriceData(parsed.data);
  const before = await db.paymentSettings.findUnique({ where: { id: "default" }, select: { photoPriceMinor: true, photoPromoPriceMinor: true, photoPromoEndsAt: true, photoBundlePriceMinor: true } });
  await db.paymentSettings.upsert({ where: { id: "default" }, create: { id: "default", ...data }, update: data });
  await audit({
    actorId: user.id,
    action: "settings.photo_prices_update",
    entityType: "PaymentSettings",
    entityId: "default",
    metadata: JSON.parse(JSON.stringify({ from: before, to: data })),
  });
  updateTag(PAYMENT_SETTINGS_TAG);
  revalidatePath("/", "layout");
  return { ok: true, message: "Preços da foto profissional guardados." };
}
