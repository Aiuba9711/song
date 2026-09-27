"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { templateSchema } from "@/lib/admin-schemas";
import { audit } from "@/lib/audit";
import { assertPermission } from "@/lib/auth/guards";
import { detectFileType, IMAGE_TYPES } from "@/lib/storage/files";
import { fieldErrorsOf, formDataToObject, type ActionState } from "@/lib/validation";
import {
  createTemplate,
  duplicateTemplate,
  MAX_PREVIEW_BYTES,
  moveTemplate,
  parseDesignForm,
  removeTemplatePreviewImage,
  setTemplatePreviewImage,
  toggleTemplate,
  updateTemplate,
  type TemplateInput,
} from "@/server/templates-admin";
import { DomainError } from "@/server/users";

const idSchema = z.string().min(1).max(40);

function revalidateTemplates() {
  revalidatePath("/cv-modelos", "layout");
  revalidatePath("/admin/modelos", "layout");
  revalidatePath("/");
}

function parseForm(formData: FormData): { data: TemplateInput } | { state: ActionState } {
  const parsed = templateSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return { state: { fieldErrors: fieldErrorsOf(parsed.error) } };
  const design = parseDesignForm(formData, parsed.data.accentColor);
  if (!design.success) return { state: { fieldErrors: { design: ["Há opções de design inválidas."] } } };
  return { data: { ...parsed.data, design: design.data } };
}

export async function createTemplateAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await assertPermission("templates.manage");
  const form = parseForm(formData);
  if ("state" in form) return form.state;
  let id: string;
  try {
    id = (await createTemplate(form.data)).id;
  } catch (error) {
    if (error instanceof DomainError && error.code === "SLUG_TAKEN") return { fieldErrors: { slug: [error.message] } };
    throw error;
  }
  await audit({ actorId: user.id, action: "template.create", entityType: "CVTemplate", entityId: id });
  revalidateTemplates();
  redirect(`/admin/modelos/${id}?criado=1`);
}

export async function updateTemplateAction(templateId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await assertPermission("templates.manage");
  const form = parseForm(formData);
  if ("state" in form) return form.state;
  try {
    await updateTemplate(templateId, form.data);
  } catch (error) {
    if (error instanceof DomainError && error.code === "SLUG_TAKEN") return { fieldErrors: { slug: [error.message] } };
    throw error;
  }
  await audit({
    actorId: user.id,
    action: "template.update",
    entityType: "CVTemplate",
    entityId: templateId,
    metadata: { priceMinor: form.data.price, isActive: form.data.isActive, category: form.data.category },
  });
  revalidateTemplates();
  return { ok: true, message: "Modelo guardado." };
}

export async function toggleTemplateAction(formData: FormData): Promise<void> {
  const user = await assertPermission("templates.manage");
  const id = idSchema.parse(formData.get("templateId"));
  const active = await toggleTemplate(id);
  await audit({ actorId: user.id, action: active ? "template.activate" : "template.deactivate", entityType: "CVTemplate", entityId: id });
  revalidateTemplates();
}

export async function duplicateTemplateAction(formData: FormData): Promise<void> {
  const user = await assertPermission("templates.manage");
  const id = idSchema.parse(formData.get("templateId"));
  const copy = await duplicateTemplate(id);
  await audit({ actorId: user.id, action: "template.duplicate", entityType: "CVTemplate", entityId: copy.id, metadata: { from: id } });
  revalidateTemplates();
  redirect(`/admin/modelos/${copy.id}?duplicado=1`);
}

export async function moveTemplateAction(formData: FormData): Promise<void> {
  const user = await assertPermission("templates.manage");
  const id = idSchema.parse(formData.get("templateId"));
  const direction = z.enum(["up", "down"]).parse(formData.get("direction"));
  await moveTemplate(id, direction);
  await audit({ actorId: user.id, action: "template.reorder", entityType: "CVTemplate", entityId: id, metadata: { direction } });
  revalidateTemplates();
}

export async function uploadTemplatePreviewAction(templateId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await assertPermission("templates.manage");
  const id = idSchema.parse(templateId);
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return { fieldErrors: { image: ["Escolha uma imagem."] } };
  if (file.size > MAX_PREVIEW_BYTES) return { fieldErrors: { image: ["A imagem deve ter no máximo 3 MB."] } };
  const data = Buffer.from(await file.arrayBuffer());
  const type = detectFileType(data);
  if (!type || !IMAGE_TYPES.includes(type.mime)) return { fieldErrors: { image: ["Formato não suportado. Use JPG, PNG ou WEBP."] } };
  try {
    await setTemplatePreviewImage(id, data);
  } catch (error) {
    if (error instanceof DomainError) return { fieldErrors: { image: [error.message] } };
    throw error;
  }
  await audit({ actorId: user.id, action: "template.preview_upload", entityType: "CVTemplate", entityId: id });
  revalidateTemplates();
  return { ok: true, message: "Imagem de pré-visualização atualizada." };
}

export async function removeTemplatePreviewAction(formData: FormData): Promise<void> {
  const user = await assertPermission("templates.manage");
  const id = idSchema.parse(formData.get("templateId"));
  await removeTemplatePreviewImage(id);
  await audit({ actorId: user.id, action: "template.preview_remove", entityType: "CVTemplate", entityId: id });
  revalidateTemplates();
}
