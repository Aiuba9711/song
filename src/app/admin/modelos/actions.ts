"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { templateSchema } from "@/lib/admin-schemas";
import { audit } from "@/lib/audit";
import { assertPermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { fieldErrorsOf, formDataToObject, type ActionState } from "@/lib/validation";

function revalidateTemplates() {
  revalidatePath("/cv-modelos");
  revalidatePath("/admin/modelos");
}

export async function createTemplateAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await assertPermission("templates.manage");
  const parsed = templateSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  let id: string;
  try {
    id = (await db.cVTemplate.create({ data: parsed.data, select: { id: true } })).id;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { fieldErrors: { slug: ["Já existe um modelo com este slug."] } };
    throw error;
  }
  await audit({ actorId: user.id, action: "template.create", entityType: "CVTemplate", entityId: id });
  revalidateTemplates();
  redirect("/admin/modelos?criado=1");
}

export async function updateTemplateAction(templateId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await assertPermission("templates.manage");
  const parsed = templateSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  try {
    await db.cVTemplate.update({ where: { id: templateId }, data: parsed.data });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { fieldErrors: { slug: ["Já existe um modelo com este slug."] } };
    throw error;
  }
  await audit({ actorId: user.id, action: "template.update", entityType: "CVTemplate", entityId: templateId });
  revalidateTemplates();
  return { ok: true, message: "Modelo guardado." };
}

export async function toggleTemplateAction(formData: FormData): Promise<void> {
  const user = await assertPermission("templates.manage");
  const id = z.string().min(1).parse(formData.get("templateId"));
  const t = await db.cVTemplate.findUnique({ where: { id }, select: { isActive: true } });
  if (!t) return;
  await db.cVTemplate.update({ where: { id }, data: { isActive: !t.isActive } });
  await audit({ actorId: user.id, action: t.isActive ? "template.deactivate" : "template.activate", entityType: "CVTemplate", entityId: id });
  revalidateTemplates();
}
